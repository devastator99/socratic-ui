"""
Redis Pub/Sub System for Real-Time Messaging
Handles message broadcasting, room subscriptions, and heartbeat monitoring
"""

import asyncio
import json
import logging
import redis.asyncio as redis
from typing import Dict, List, Optional, Callable
from datetime import datetime, timedelta
import os

logger = logging.getLogger(__name__)

class RedisPubSubManager:
    """Manages Redis pub/sub for real-time messaging"""
    
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis_client: Optional[redis.Redis] = None
        self.pubsub: Optional[redis.client.PubSub] = None
        self.subscriptions: Dict[str, List[Callable]] = {}
        self.heartbeat_task: Optional[asyncio.Task] = None
        self.is_connected = False
    
    async def connect(self):
        """Connect to Redis and initialize pub/sub"""
        try:
            self.redis_client = redis.from_url(
                self.redis_url, 
                encoding="utf-8", 
                decode_responses=True
            )
            
            # Test connection
            await self.redis_client.ping()
            
            self.pubsub = self.redis_client.pubsub()
            self.is_connected = True
            
            # Start heartbeat monitoring
            self.heartbeat_task = asyncio.create_task(self._heartbeat_monitor())
            
            logger.info("Redis pub/sub connected successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            self.is_connected = False
            raise
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.heartbeat_task:
            self.heartbeat_task.cancel()
        
        if self.pubsub:
            await self.pubsub.close()
        
        if self.redis_client:
            await self.redis_client.close()
        
        self.is_connected = False
        logger.info("Redis pub/sub disconnected")
    
    async def publish_message(self, channel: str, message: dict):
        """Publish message to Redis channel"""
        if not self.is_connected:
            logger.error("Redis not connected, cannot publish message")
            return False
        
        try:
            message_json = json.dumps(message)
            await self.redis_client.publish(channel, message_json)
            logger.debug(f"Published message to channel {channel}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish message: {str(e)}")
            return False
    
    async def subscribe_to_channel(self, channel: str, callback: Callable):
        """Subscribe to Redis channel with callback"""
        if not self.is_connected:
            await self.connect()
        
        try:
            await self.pubsub.subscribe(channel)
            
            if channel not in self.subscriptions:
                self.subscriptions[channel] = []
            
            self.subscriptions[channel].append(callback)
            logger.info(f"Subscribed to channel: {channel}")
            
        except Exception as e:
            logger.error(f"Failed to subscribe to channel {channel}: {str(e)}")
    
    async def unsubscribe_from_channel(self, channel: str):
        """Unsubscribe from Redis channel"""
        try:
            await self.pubsub.unsubscribe(channel)
            if channel in self.subscriptions:
                del self.subscriptions[channel]
            logger.info(f"Unsubscribed from channel: {channel}")
            
        except Exception as e:
            logger.error(f"Failed to unsubscribe from channel {channel}: {str(e)}")
    
    async def listen_for_messages(self):
        """Listen for messages and invoke callbacks"""
        if not self.pubsub:
            logger.error("PubSub not initialized")
            return
        
        try:
            async for message in self.pubsub.listen():
                if message['type'] == 'message':
                    channel = message['channel']
                    data = json.loads(message['data'])
                    
                    # Invoke callbacks for this channel
                    if channel in self.subscriptions:
                        for callback in self.subscriptions[channel]:
                            try:
                                await callback(channel, data)
                            except Exception as e:
                                logger.error(f"Error in message callback: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error listening for messages: {str(e)}")
    
    async def publish_chat_message(self, room_id: str, message_data: dict):
        """Publish chat message to room channel"""
        channel = f"room:{room_id}"
        await self.publish_message(channel, {
            "type": "chat_message",
            "data": message_data,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def publish_user_status(self, wallet_address: str, status_data: dict):
        """Publish user status update"""
        channel = "user_status"
        await self.publish_message(channel, {
            "type": "user_status",
            "wallet_address": wallet_address,
            "data": status_data,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def publish_nft_gated_message(self, required_nfts: List[str], message_data: dict):
        """Publish message to NFT-gated channel"""
        channel = f"nft_gated:{':'.join(required_nfts)}"
        await self.publish_message(channel, {
            "type": "nft_gated_message",
            "required_nfts": required_nfts,
            "data": message_data,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def set_user_heartbeat(self, wallet_address: str):
        """Set user heartbeat timestamp"""
        try:
            heartbeat_key = f"heartbeat:{wallet_address}"
            await self.redis_client.setex(
                heartbeat_key, 
                60,  # 60 second expiry
                datetime.utcnow().isoformat()
            )
        except Exception as e:
            logger.error(f"Failed to set heartbeat for {wallet_address}: {str(e)}")
    
    async def get_user_heartbeat(self, wallet_address: str) -> Optional[str]:
        """Get user's last heartbeat timestamp"""
        try:
            heartbeat_key = f"heartbeat:{wallet_address}"
            return await self.redis_client.get(heartbeat_key)
        except Exception as e:
            logger.error(f"Failed to get heartbeat for {wallet_address}: {str(e)}")
            return None
    
    async def get_online_users(self) -> List[str]:
        """Get list of online users based on heartbeats"""
        try:
            pattern = "heartbeat:*"
            keys = await self.redis_client.keys(pattern)
            return [key.replace("heartbeat:", "") for key in keys]
        except Exception as e:
            logger.error(f"Failed to get online users: {str(e)}")
            return []
    
    async def _heartbeat_monitor(self):
        """Monitor heartbeats and clean up expired connections"""
        while self.is_connected:
            try:
                # Clean up expired heartbeats every 30 seconds
                await asyncio.sleep(30)
                
                # Get all heartbeat keys
                pattern = "heartbeat:*"
                keys = await self.redis_client.keys(pattern)
                
                current_time = datetime.utcnow()
                expired_users = []
                
                for key in keys:
                    heartbeat_time_str = await self.redis_client.get(key)
                    if heartbeat_time_str:
                        try:
                            heartbeat_time = datetime.fromisoformat(heartbeat_time_str)
                            if current_time - heartbeat_time > timedelta(minutes=2):
                                # User is considered offline
                                wallet_address = key.replace("heartbeat:", "")
                                expired_users.append(wallet_address)
                                await self.redis_client.delete(key)
                        except ValueError:
                            # Invalid timestamp, delete key
                            await self.redis_client.delete(key)
                
                # Notify about offline users
                for wallet_address in expired_users:
                    await self.publish_user_status(wallet_address, {
                        "is_online": False,
                        "last_seen": current_time.isoformat()
                    })
                
                if expired_users:
                    logger.info(f"Marked {len(expired_users)} users as offline due to expired heartbeats")
                
            except Exception as e:
                logger.error(f"Error in heartbeat monitor: {str(e)}")
    
    async def store_message_cache(self, room_id: str, message: dict, ttl: int = 3600):
        """Store recent messages in Redis cache"""
        try:
            cache_key = f"recent_messages:{room_id}"
            message_json = json.dumps(message)
            
            # Use Redis list to store recent messages (max 100)
            await self.redis_client.lpush(cache_key, message_json)
            await self.redis_client.ltrim(cache_key, 0, 99)  # Keep only 100 recent messages
            await self.redis_client.expire(cache_key, ttl)
            
        except Exception as e:
            logger.error(f"Failed to cache message: {str(e)}")
    
    async def get_recent_messages(self, room_id: str, limit: int = 50) -> List[dict]:
        """Get recent messages from Redis cache"""
        try:
            cache_key = f"recent_messages:{room_id}"
            messages_json = await self.redis_client.lrange(cache_key, 0, limit - 1)
            
            messages = []
            for msg_json in messages_json:
                try:
                    messages.append(json.loads(msg_json))
                except json.JSONDecodeError:
                    continue
            
            return list(reversed(messages))  # Return in chronological order
            
        except Exception as e:
            logger.error(f"Failed to get recent messages: {str(e)}")
            return []

# Global Redis pub/sub manager instance
redis_pubsub_manager = RedisPubSubManager()

async def initialize_redis():
    """Initialize Redis connection"""
    await redis_pubsub_manager.connect()

async def cleanup_redis():
    """Cleanup Redis connection"""
    await redis_pubsub_manager.disconnect()
