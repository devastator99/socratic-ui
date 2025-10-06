"""
WebSocket Authentication Middleware
Provides JWT token verification for WebSocket connections
"""

import json
import logging
from typing import Optional, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect
from urllib.parse import parse_qs
from wallet_auth import WalletAuthService

logger = logging.getLogger(__name__)

class WebSocketAuthManager:
    """Manages WebSocket authentication and connections"""
    
    def __init__(self):
        self.authenticated_connections: Dict[str, Dict[str, Any]] = {}
    
    async def authenticate_websocket(self, websocket: WebSocket) -> Optional[Dict[str, Any]]:
        """
        Authenticate WebSocket connection using JWT token
        Token can be provided via:
        1. Query parameter: ?token=jwt_token
        2. First message with auth payload: {"type": "auth", "token": "jwt_token"}
        """
        # Try to get token from query parameters first
        query_params = parse_qs(websocket.url.query)
        token = None
        
        if "token" in query_params:
            token = query_params["token"][0]
        
        if token:
            try:
                user_payload = WalletAuthService.verify_token(token)
                logger.info(f"WebSocket authenticated via query param for wallet: {user_payload['wallet_address']}")
                return user_payload
            except Exception as e:
                logger.warning(f"WebSocket auth failed via query param: {str(e)}")
        
        # If no token in query params, wait for auth message
        try:
            await websocket.accept()
            
            # Wait for authentication message (with timeout)
            auth_message = await websocket.receive_text()
            auth_data = json.loads(auth_message)
            
            if auth_data.get("type") != "auth" or "token" not in auth_data:
                await websocket.send_text(json.dumps({
                    "type": "auth_error",
                    "message": "Authentication required. Send {type: 'auth', token: 'your_jwt_token'}"
                }))
                await websocket.close(code=4001)
                return None
            
            token = auth_data["token"]
            user_payload = WalletAuthService.verify_token(token)
            
            # Send auth success
            await websocket.send_text(json.dumps({
                "type": "auth_success",
                "wallet_address": user_payload["wallet_address"],
                "message": "Authentication successful"
            }))
            
            logger.info(f"WebSocket authenticated via message for wallet: {user_payload['wallet_address']}")
            return user_payload
            
        except json.JSONDecodeError:
            await websocket.send_text(json.dumps({
                "type": "auth_error", 
                "message": "Invalid JSON in auth message"
            }))
            await websocket.close(code=4002)
            return None
        except Exception as e:
            logger.error(f"WebSocket authentication failed: {str(e)}")
            await websocket.send_text(json.dumps({
                "type": "auth_error",
                "message": "Invalid or expired token"
            }))
            await websocket.close(code=4003)
            return None
    
    def add_connection(self, connection_id: str, websocket: WebSocket, user_data: Dict[str, Any]):
        """Add authenticated connection to manager"""
        self.authenticated_connections[connection_id] = {
            "websocket": websocket,
            "user_data": user_data,
            "wallet_address": user_data["wallet_address"]
        }
        logger.info(f"Added WebSocket connection {connection_id} for wallet {user_data['wallet_address']}")
    
    def remove_connection(self, connection_id: str):
        """Remove connection from manager"""
        if connection_id in self.authenticated_connections:
            wallet_address = self.authenticated_connections[connection_id]["wallet_address"]
            del self.authenticated_connections[connection_id]
            logger.info(f"Removed WebSocket connection {connection_id} for wallet {wallet_address}")
    
    def get_connection(self, connection_id: str) -> Optional[Dict[str, Any]]:
        """Get connection data by ID"""
        return self.authenticated_connections.get(connection_id)
    
    def get_connections_by_wallet(self, wallet_address: str) -> list:
        """Get all connections for a specific wallet"""
        return [
            conn_data for conn_data in self.authenticated_connections.values()
            if conn_data["wallet_address"] == wallet_address
        ]
    
    async def broadcast_to_wallet(self, wallet_address: str, message: dict):
        """Send message to all connections for a specific wallet"""
        connections = self.get_connections_by_wallet(wallet_address)
        
        for conn_data in connections:
            try:
                await conn_data["websocket"].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to send message to wallet {wallet_address}: {str(e)}")
    
    async def broadcast_to_nft_holders(self, required_nfts: list, message: dict):
        """Send message to all connections that hold specific NFTs"""
        for conn_data in self.authenticated_connections.values():
            user_nfts = conn_data["user_data"].get("nft_holdings", [])
            has_required_nft = any(nft in user_nfts for nft in required_nfts)
            
            if has_required_nft:
                try:
                    await conn_data["websocket"].send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to send NFT-gated message: {str(e)}")
    
    async def broadcast_to_all(self, message: dict):
        """Send message to all authenticated connections"""
        for conn_data in self.authenticated_connections.values():
            try:
                await conn_data["websocket"].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to broadcast message: {str(e)}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        unique_wallets = set(
            conn_data["wallet_address"] 
            for conn_data in self.authenticated_connections.values()
        )
        
        return {
            "total_connections": len(self.authenticated_connections),
            "unique_wallets": len(unique_wallets),
            "active_wallets": list(unique_wallets)
        }

# Global WebSocket auth manager instance
websocket_auth_manager = WebSocketAuthManager()

async def authenticate_websocket_connection(websocket: WebSocket) -> Optional[Dict[str, Any]]:
    """
    Helper function to authenticate WebSocket connections
    Returns user data if authentication successful, None otherwise
    """
    return await websocket_auth_manager.authenticate_websocket(websocket)
