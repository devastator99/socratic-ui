"""
Advanced Rate Limiting System
Implements multiple rate limiting strategies with Redis backend
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, List
from enum import Enum
import redis.asyncio as redis
from fastapi import HTTPException, Request
from functools import wraps
import os

logger = logging.getLogger(__name__)

class RateLimitType(Enum):
    """Different types of rate limits"""
    PER_SECOND = "per_second"
    PER_MINUTE = "per_minute" 
    PER_HOUR = "per_hour"
    PER_DAY = "per_day"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"

class RateLimitRule:
    """Rate limit rule configuration"""
    def __init__(
        self,
        limit: int,
        window: int,  # seconds
        limit_type: RateLimitType = RateLimitType.SLIDING_WINDOW,
        burst_limit: Optional[int] = None,
        key_func: Optional[callable] = None
    ):
        self.limit = limit
        self.window = window
        self.limit_type = limit_type
        self.burst_limit = burst_limit or limit
        self.key_func = key_func or self._default_key_func
    
    def _default_key_func(self, request: Request) -> str:
        """Default key function using client IP"""
        return f"rate_limit:{request.client.host}"

class RateLimiter:
    """Advanced rate limiter with multiple strategies"""
    
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis_client: Optional[redis.Redis] = None
        self.rules: Dict[str, List[RateLimitRule]] = {}
        
    async def initialize(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Rate limiter Redis connection established")
        except Exception as e:
            logger.error(f"Failed to connect to Redis for rate limiting: {str(e)}")
            raise
    
    def add_rule(self, endpoint: str, rule: RateLimitRule):
        """Add a rate limiting rule for an endpoint"""
        if endpoint not in self.rules:
            self.rules[endpoint] = []
        self.rules[endpoint].append(rule)
        logger.info(f"Added rate limit rule for {endpoint}: {rule.limit} requests per {rule.window}s")
    
    async def check_rate_limit(self, request: Request, endpoint: str) -> Tuple[bool, Dict]:
        """
        Check if request is within rate limits
        Returns (is_allowed, rate_limit_info)
        """
        if not self.redis_client:
            await self.initialize()
            
        if endpoint not in self.rules:
            # No rules defined, allow request
            return True, {"allowed": True}
        
        rate_limit_info = {
            "allowed": True,
            "limit": 0,
            "remaining": 0,
            "reset_time": None,
            "retry_after": None
        }
        
        for rule in self.rules[endpoint]:
            key = rule.key_func(request)
            
            if rule.limit_type == RateLimitType.SLIDING_WINDOW:
                is_allowed, info = await self._check_sliding_window(key, rule)
            elif rule.limit_type == RateLimitType.TOKEN_BUCKET:
                is_allowed, info = await self._check_token_bucket(key, rule)
            else:
                is_allowed, info = await self._check_fixed_window(key, rule)
            
            if not is_allowed:
                rate_limit_info.update(info)
                rate_limit_info["allowed"] = False
                return False, rate_limit_info
            
            # Update with the most restrictive rule's info
            if info["remaining"] < rate_limit_info["remaining"] or rate_limit_info["remaining"] == 0:
                rate_limit_info.update(info)
        
        return True, rate_limit_info
    
    async def _check_sliding_window(self, key: str, rule: RateLimitRule) -> Tuple[bool, Dict]:
        """Sliding window rate limiting using sorted sets"""
        now = datetime.utcnow().timestamp()
        window_start = now - rule.window
        
        pipe = self.redis_client.pipeline()
        
        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)
        
        # Count current requests
        pipe.zcard(key)
        
        # Add current request
        pipe.zadd(key, {str(now): now})
        
        # Set expiration
        pipe.expire(key, rule.window)
        
        results = await pipe.execute()
        current_count = results[1]
        
        remaining = max(0, rule.limit - current_count - 1)
        reset_time = datetime.utcnow() + timedelta(seconds=rule.window)
        
        info = {
            "limit": rule.limit,
            "remaining": remaining,
            "reset_time": reset_time.isoformat(),
            "retry_after": None if current_count < rule.limit else rule.window
        }
        
        return current_count < rule.limit, info
    
    async def _check_token_bucket(self, key: str, rule: RateLimitRule) -> Tuple[bool, Dict]:
        """Token bucket rate limiting"""
        now = datetime.utcnow().timestamp()
        bucket_key = f"{key}:bucket"
        
        # Get current bucket state
        bucket_data = await self.redis_client.hgetall(bucket_key)
        
        if not bucket_data:
            # Initialize bucket
            tokens = rule.burst_limit - 1
            last_refill = now
        else:
            tokens = float(bucket_data.get("tokens", rule.burst_limit))
            last_refill = float(bucket_data.get("last_refill", now))
            
            # Calculate tokens to add based on time passed
            time_passed = now - last_refill
            tokens_to_add = time_passed * (rule.limit / rule.window)
            tokens = min(rule.burst_limit, tokens + tokens_to_add)
            
            # Consume one token
            tokens -= 1
        
        if tokens >= 0:
            # Update bucket state
            await self.redis_client.hset(bucket_key, mapping={
                "tokens": tokens,
                "last_refill": now
            })
            await self.redis_client.expire(bucket_key, rule.window * 2)
            
            info = {
                "limit": rule.limit,
                "remaining": int(tokens),
                "reset_time": None,
                "retry_after": None
            }
            return True, info
        else:
            # Rate limited
            retry_after = (1 - tokens) / (rule.limit / rule.window)
            info = {
                "limit": rule.limit,
                "remaining": 0,
                "reset_time": None,
                "retry_after": int(retry_after)
            }
            return False, info
    
    async def _check_fixed_window(self, key: str, rule: RateLimitRule) -> Tuple[bool, Dict]:
        """Fixed window rate limiting"""
        now = datetime.utcnow()
        
        if rule.limit_type == RateLimitType.PER_SECOND:
            window_key = f"{key}:{now.strftime('%Y%m%d%H%M%S')}"
            window_seconds = 1
        elif rule.limit_type == RateLimitType.PER_MINUTE:
            window_key = f"{key}:{now.strftime('%Y%m%d%H%M')}"
            window_seconds = 60
        elif rule.limit_type == RateLimitType.PER_HOUR:
            window_key = f"{key}:{now.strftime('%Y%m%d%H')}"
            window_seconds = 3600
        elif rule.limit_type == RateLimitType.PER_DAY:
            window_key = f"{key}:{now.strftime('%Y%m%d')}"
            window_seconds = 86400
        else:
            window_key = f"{key}:{int(now.timestamp() // rule.window)}"
            window_seconds = rule.window
        
        pipe = self.redis_client.pipeline()
        pipe.incr(window_key)
        pipe.expire(window_key, window_seconds)
        results = await pipe.execute()
        
        current_count = results[0]
        remaining = max(0, rule.limit - current_count)
        
        # Calculate reset time
        if rule.limit_type == RateLimitType.PER_SECOND:
            reset_time = now.replace(microsecond=0) + timedelta(seconds=1)
        elif rule.limit_type == RateLimitType.PER_MINUTE:
            reset_time = now.replace(second=0, microsecond=0) + timedelta(minutes=1)
        elif rule.limit_type == RateLimitType.PER_HOUR:
            reset_time = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        elif rule.limit_type == RateLimitType.PER_DAY:
            reset_time = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        else:
            reset_time = datetime.fromtimestamp((int(now.timestamp() // rule.window) + 1) * rule.window)
        
        info = {
            "limit": rule.limit,
            "remaining": remaining,
            "reset_time": reset_time.isoformat(),
            "retry_after": window_seconds if current_count > rule.limit else None
        }
        
        return current_count <= rule.limit, info
    
    async def get_user_stats(self, user_key: str) -> Dict:
        """Get rate limiting statistics for a user"""
        stats = {}
        
        for endpoint, rules in self.rules.items():
            endpoint_stats = []
            for i, rule in enumerate(rules):
                key = f"rate_limit:{user_key}"
                
                if rule.limit_type == RateLimitType.SLIDING_WINDOW:
                    now = datetime.utcnow().timestamp()
                    window_start = now - rule.window
                    count = await self.redis_client.zcount(key, window_start, now)
                    remaining = max(0, rule.limit - count)
                elif rule.limit_type == RateLimitType.TOKEN_BUCKET:
                    bucket_key = f"{key}:bucket"
                    bucket_data = await self.redis_client.hgetall(bucket_key)
                    remaining = int(float(bucket_data.get("tokens", rule.burst_limit)))
                else:
                    # For fixed windows, we'd need to check current window
                    remaining = rule.limit  # Simplified
                
                endpoint_stats.append({
                    "rule_index": i,
                    "limit": rule.limit,
                    "remaining": remaining,
                    "window": rule.window,
                    "type": rule.limit_type.value
                })
            
            stats[endpoint] = endpoint_stats
        
        return stats

# Decorator for easy rate limiting
def rate_limit(
    limit: int,
    window: int,
    limit_type: RateLimitType = RateLimitType.SLIDING_WINDOW,
    key_func: Optional[callable] = None,
    burst_limit: Optional[int] = None
):
    """Decorator for applying rate limits to endpoints"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find the request object
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                # If no request found, proceed without rate limiting
                return await func(*args, **kwargs)
            
            # Get or create rate limiter
            if not hasattr(func, '_rate_limiter'):
                func._rate_limiter = RateLimiter()
                await func._rate_limiter.initialize()
                
                rule = RateLimitRule(
                    limit=limit,
                    window=window,
                    limit_type=limit_type,
                    burst_limit=burst_limit,
                    key_func=key_func
                )
                func._rate_limiter.add_rule(func.__name__, rule)
            
            # Check rate limit
            is_allowed, rate_info = await func._rate_limiter.check_rate_limit(
                request, func.__name__
            )
            
            if not is_allowed:
                headers = {
                    "X-RateLimit-Limit": str(rate_info["limit"]),
                    "X-RateLimit-Remaining": str(rate_info["remaining"]),
                }
                
                if rate_info["reset_time"]:
                    headers["X-RateLimit-Reset"] = rate_info["reset_time"]
                if rate_info["retry_after"]:
                    headers["Retry-After"] = str(rate_info["retry_after"])
                
                raise HTTPException(
                    status_code=429,
                    detail="Rate limit exceeded",
                    headers=headers
                )
            
            # Add rate limit headers to response
            response = await func(*args, **kwargs)
            if hasattr(response, 'headers'):
                response.headers["X-RateLimit-Limit"] = str(rate_info["limit"])
                response.headers["X-RateLimit-Remaining"] = str(rate_info["remaining"])
                if rate_info["reset_time"]:
                    response.headers["X-RateLimit-Reset"] = rate_info["reset_time"]
            
            return response
        
        return wrapper
    return decorator

# Global rate limiter instance
global_rate_limiter = RateLimiter()

# Common rate limiting configurations
class CommonRateLimits:
    """Predefined rate limiting configurations"""
    
    # API endpoints
    API_GENERAL = RateLimitRule(100, 60, RateLimitType.SLIDING_WINDOW)  # 100/min
    API_STRICT = RateLimitRule(10, 60, RateLimitType.SLIDING_WINDOW)   # 10/min
    API_BURST = RateLimitRule(20, 60, RateLimitType.TOKEN_BUCKET, burst_limit=50)
    
    # Chat/messaging
    CHAT_MESSAGE = RateLimitRule(30, 60, RateLimitType.SLIDING_WINDOW)  # 30 messages/min
    CHAT_REACTION = RateLimitRule(100, 60, RateLimitType.SLIDING_WINDOW)  # 100 reactions/min
    
    # Document uploads
    UPLOAD_DOCUMENT = RateLimitRule(5, 300, RateLimitType.SLIDING_WINDOW)  # 5 uploads/5min
    
    # AI interactions
    AI_QUERY = RateLimitRule(20, 60, RateLimitType.SLIDING_WINDOW)  # 20 AI queries/min
    
    # Wallet operations
    WALLET_TRANSACTION = RateLimitRule(10, 60, RateLimitType.SLIDING_WINDOW)  # 10 tx/min
