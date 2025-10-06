"""
Advanced Content Filtering and Moderation System
Implements multiple content filtering strategies with AI-powered detection
"""

import asyncio
import json
import logging
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple, Any
from enum import Enum
import redis.asyncio as redis
from openai import AsyncOpenAI
import os
from dataclasses import dataclass
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

Base = declarative_base()

class ModerationAction(Enum):
    """Types of moderation actions"""
    ALLOW = "allow"
    WARN = "warn"
    FILTER = "filter"
    BLOCK = "block"
    ESCALATE = "escalate"

class FilterReason(Enum):
    """Reasons for content filtering"""
    PROFANITY = "profanity"
    SPAM = "spam"
    HARASSMENT = "harassment"
    HATE_SPEECH = "hate_speech"
    INAPPROPRIATE_CONTENT = "inappropriate_content"
    PHISHING = "phishing"
    MALWARE = "malware"
    COPYRIGHT = "copyright"
    AI_GENERATED_SPAM = "ai_generated_spam"
    RATE_LIMIT_VIOLATION = "rate_limit_violation"

@dataclass
class FilterResult:
    """Result of content filtering"""
    action: ModerationAction
    confidence: float
    reasons: List[FilterReason]
    filtered_content: Optional[str] = None
    metadata: Dict[str, Any] = None

class ModerationLog(Base):
    """Database model for moderation logs"""
    __tablename__ = "moderation_logs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String, nullable=False)
    content_hash = Column(String, nullable=False)
    original_content = Column(Text, nullable=False)
    filtered_content = Column(Text)
    action = Column(String, nullable=False)
    reasons = Column(Text)  # JSON string
    confidence = Column(Float, nullable=False)
    metadata = Column(Text)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed = Column(Boolean, default=False)
    reviewer_id = Column(String)
    review_notes = Column(Text)

class ContentFilter:
    """Advanced content filtering system"""
    
    def __init__(self, redis_url: str = None, openai_api_key: str = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self.openai_client = AsyncOpenAI(api_key=openai_api_key or os.getenv("OPENAI_API_KEY"))
        self.redis_client: Optional[redis.Redis] = None
        
        # Initialize database
        database_url = os.getenv("DATABASE_URL")
        self.engine = create_engine(database_url, pool_pre_ping=True)
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
        # Load filter configurations
        self.profanity_words = self._load_profanity_list()
        self.spam_patterns = self._load_spam_patterns()
        self.phishing_domains = self._load_phishing_domains()
        
        # AI moderation cache
        self.ai_cache_ttl = 3600  # 1 hour
        
    async def initialize(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Content filter Redis connection established")
        except Exception as e:
            logger.error(f"Failed to connect to Redis for content filtering: {str(e)}")
            raise
    
    def _load_profanity_list(self) -> Set[str]:
        """Load profanity word list"""
        # Basic profanity list - in production, use a comprehensive database
        return {
            "spam", "scam", "fake", "fraud", "phishing",
            "hate", "nazi", "terrorist", "violence", "threat",
            # Add more words as needed
        }
    
    def _load_spam_patterns(self) -> List[re.Pattern]:
        """Load spam detection patterns"""
        patterns = [
            re.compile(r'\b(?:click|visit|check)\s*(?:here|link|url)\b', re.IGNORECASE),
            re.compile(r'\b(?:free|win|winner|prize|lottery|casino)\b', re.IGNORECASE),
            re.compile(r'\b(?:buy|sell|discount|offer|deal)\s*(?:now|today)\b', re.IGNORECASE),
            re.compile(r'(?:https?://)?(?:bit\.ly|tinyurl|t\.co)/\w+', re.IGNORECASE),
            re.compile(r'\b(?:crypto|bitcoin|nft|token)\s*(?:giveaway|airdrop)\b', re.IGNORECASE),
        ]
        return patterns
    
    def _load_phishing_domains(self) -> Set[str]:
        """Load known phishing domains"""
        # Basic list - in production, use threat intelligence feeds
        return {
            "phishing-site.com",
            "fake-wallet.net",
            "scam-nft.org",
            # Add more domains as needed
        }
    
    async def filter_content(
        self, 
        content: str, 
        user_id: str,
        content_type: str = "message",
        context: Dict[str, Any] = None
    ) -> FilterResult:
        """
        Filter content through multiple moderation layers
        """
        if not self.redis_client:
            await self.initialize()
        
        # Generate content hash for caching
        content_hash = str(hash(content))
        cache_key = f"content_filter:{content_hash}"
        
        # Check cache first
        cached_result = await self._get_cached_result(cache_key)
        if cached_result:
            return cached_result
        
        # Apply multiple filtering layers
        results = []
        
        # 1. Basic profanity filter
        profanity_result = await self._check_profanity(content)
        results.append(profanity_result)
        
        # 2. Spam detection
        spam_result = await self._check_spam(content, user_id, context)
        results.append(spam_result)
        
        # 3. Harassment detection
        harassment_result = await self._check_harassment(content, user_id, context)
        results.append(harassment_result)
        
        # 4. Phishing/malware detection
        security_result = await self._check_security_threats(content)
        results.append(security_result)
        
        # 5. AI-powered moderation (for complex cases)
        if any(r.action in [ModerationAction.WARN, ModerationAction.FILTER] for r in results):
            ai_result = await self._ai_moderation(content, content_type, context)
            results.append(ai_result)
        
        # Combine results and determine final action
        final_result = self._combine_filter_results(results, content)
        
        # Cache result
        await self._cache_result(cache_key, final_result)
        
        # Log moderation action
        await self._log_moderation(user_id, content, final_result)
        
        return final_result
    
    async def _check_profanity(self, content: str) -> FilterResult:
        """Check for profanity and inappropriate language"""
        content_lower = content.lower()
        detected_words = []
        
        for word in self.profanity_words:
            if word in content_lower:
                detected_words.append(word)
        
        if detected_words:
            # Filter out profanity
            filtered_content = content
            for word in detected_words:
                filtered_content = re.sub(
                    re.escape(word), 
                    '*' * len(word), 
                    filtered_content, 
                    flags=re.IGNORECASE
                )
            
            return FilterResult(
                action=ModerationAction.FILTER,
                confidence=0.9,
                reasons=[FilterReason.PROFANITY],
                filtered_content=filtered_content,
                metadata={"detected_words": detected_words}
            )
        
        return FilterResult(
            action=ModerationAction.ALLOW,
            confidence=1.0,
            reasons=[]
        )
    
    async def _check_spam(
        self, 
        content: str, 
        user_id: str, 
        context: Dict[str, Any] = None
    ) -> FilterResult:
        """Check for spam patterns and behavior"""
        spam_score = 0.0
        detected_patterns = []
        
        # Check against spam patterns
        for pattern in self.spam_patterns:
            if pattern.search(content):
                spam_score += 0.3
                detected_patterns.append(pattern.pattern)
        
        # Check for repetitive content
        if await self._is_repetitive_content(user_id, content):
            spam_score += 0.4
            detected_patterns.append("repetitive_content")
        
        # Check for excessive links
        link_count = len(re.findall(r'https?://\S+', content))
        if link_count > 2:
            spam_score += 0.2 * link_count
            detected_patterns.append("excessive_links")
        
        # Check posting frequency
        if await self._is_rapid_posting(user_id):
            spam_score += 0.3
            detected_patterns.append("rapid_posting")
        
        if spam_score >= 0.7:
            action = ModerationAction.BLOCK
        elif spam_score >= 0.5:
            action = ModerationAction.FILTER
        elif spam_score >= 0.3:
            action = ModerationAction.WARN
        else:
            action = ModerationAction.ALLOW
        
        return FilterResult(
            action=action,
            confidence=min(spam_score, 1.0),
            reasons=[FilterReason.SPAM] if spam_score > 0.3 else [],
            metadata={"spam_score": spam_score, "patterns": detected_patterns}
        )
    
    async def _check_harassment(
        self, 
        content: str, 
        user_id: str, 
        context: Dict[str, Any] = None
    ) -> FilterResult:
        """Check for harassment patterns"""
        harassment_indicators = [
            r'\b(?:kill|die|suicide|harm)\s+(?:yourself|urself)\b',
            r'\b(?:stupid|idiot|moron|retard)\b',
            r'@\w+\s+(?:you\s+)?(?:suck|terrible|awful)',
            r'\b(?:shut\s+up|stfu)\b',
        ]
        
        harassment_score = 0.0
        detected_patterns = []
        
        for pattern in harassment_indicators:
            if re.search(pattern, content, re.IGNORECASE):
                harassment_score += 0.4
                detected_patterns.append(pattern)
        
        # Check for targeted harassment (repeated mentions)
        mentions = re.findall(r'@(\w+)', content)
        if len(mentions) > len(set(mentions)):  # Repeated mentions
            harassment_score += 0.3
            detected_patterns.append("repeated_mentions")
        
        if harassment_score >= 0.7:
            action = ModerationAction.BLOCK
        elif harassment_score >= 0.4:
            action = ModerationAction.FILTER
        else:
            action = ModerationAction.ALLOW
        
        return FilterResult(
            action=action,
            confidence=min(harassment_score, 1.0),
            reasons=[FilterReason.HARASSMENT] if harassment_score > 0.4 else [],
            metadata={"harassment_score": harassment_score, "patterns": detected_patterns}
        )
    
    async def _check_security_threats(self, content: str) -> FilterResult:
        """Check for phishing, malware, and security threats"""
        threat_score = 0.0
        detected_threats = []
        
        # Extract URLs
        urls = re.findall(r'https?://([^/\s]+)', content)
        
        for url in urls:
            domain = url.lower()
            
            # Check against known phishing domains
            if domain in self.phishing_domains:
                threat_score += 0.8
                detected_threats.append(f"phishing_domain:{domain}")
            
            # Check for suspicious domain patterns
            if re.match(r'.*-(?:wallet|metamask|phantom|solana).*\.com', domain):
                threat_score += 0.6
                detected_threats.append(f"suspicious_domain:{domain}")
            
            # Check for URL shorteners (potential hiding)
            if domain in ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl']:
                threat_score += 0.3
                detected_threats.append(f"url_shortener:{domain}")
        
        # Check for social engineering patterns
        social_engineering_patterns = [
            r'\b(?:urgent|immediate|limited\s+time)\b',
            r'\b(?:verify|confirm|update)\s+(?:account|wallet|credentials)\b',
            r'\b(?:suspended|locked|compromised)\s+(?:account|wallet)\b',
            r'\b(?:click|visit)\s+(?:here|link|now)\s+(?:to|for)\b',
        ]
        
        for pattern in social_engineering_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                threat_score += 0.2
                detected_threats.append(f"social_engineering:{pattern}")
        
        if threat_score >= 0.7:
            action = ModerationAction.BLOCK
        elif threat_score >= 0.4:
            action = ModerationAction.FILTER
        else:
            action = ModerationAction.ALLOW
        
        return FilterResult(
            action=action,
            confidence=min(threat_score, 1.0),
            reasons=[FilterReason.PHISHING] if threat_score > 0.4 else [],
            metadata={"threat_score": threat_score, "threats": detected_threats}
        )
    
    async def _ai_moderation(
        self, 
        content: str, 
        content_type: str,
        context: Dict[str, Any] = None
    ) -> FilterResult:
        """AI-powered content moderation using OpenAI"""
        try:
            # Prepare context for AI
            context_info = ""
            if context:
                context_info = f"Context: {json.dumps(context, indent=2)}\n"
            
            prompt = f"""
            You are a content moderation AI for a Web3 educational platform. 
            Analyze the following {content_type} for:
            1. Harassment or personal attacks
            2. Hate speech or discrimination
            3. Inappropriate sexual content
            4. Scams or phishing attempts
            5. Spam or off-topic content
            
            {context_info}
            Content to analyze:
            "{content}"
            
            Respond with JSON in this format:
            {{
                "is_appropriate": true/false,
                "confidence": 0.0-1.0,
                "primary_concern": "harassment|hate_speech|inappropriate_content|phishing|spam|none",
                "explanation": "brief explanation",
                "suggested_action": "allow|warn|filter|block"
            }}
            """
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=200
            )
            
            ai_result = json.loads(response.choices[0].message.content)
            
            # Map AI response to our system
            action_mapping = {
                "allow": ModerationAction.ALLOW,
                "warn": ModerationAction.WARN,
                "filter": ModerationAction.FILTER,
                "block": ModerationAction.BLOCK
            }
            
            reason_mapping = {
                "harassment": FilterReason.HARASSMENT,
                "hate_speech": FilterReason.HATE_SPEECH,
                "inappropriate_content": FilterReason.INAPPROPRIATE_CONTENT,
                "phishing": FilterReason.PHISHING,
                "spam": FilterReason.SPAM
            }
            
            action = action_mapping.get(ai_result["suggested_action"], ModerationAction.ALLOW)
            reasons = []
            if not ai_result["is_appropriate"] and ai_result["primary_concern"] != "none":
                reasons.append(reason_mapping.get(ai_result["primary_concern"], FilterReason.INAPPROPRIATE_CONTENT))
            
            return FilterResult(
                action=action,
                confidence=ai_result["confidence"],
                reasons=reasons,
                metadata={
                    "ai_explanation": ai_result["explanation"],
                    "ai_primary_concern": ai_result["primary_concern"]
                }
            )
            
        except Exception as e:
            logger.error(f"AI moderation failed: {str(e)}")
            # Fallback to conservative approach
            return FilterResult(
                action=ModerationAction.WARN,
                confidence=0.5,
                reasons=[FilterReason.INAPPROPRIATE_CONTENT],
                metadata={"ai_error": str(e)}
            )
    
    def _combine_filter_results(
        self, 
        results: List[FilterResult], 
        original_content: str
    ) -> FilterResult:
        """Combine multiple filter results into final decision"""
        # Find the most restrictive action
        action_priority = {
            ModerationAction.ALLOW: 0,
            ModerationAction.WARN: 1,
            ModerationAction.FILTER: 2,
            ModerationAction.BLOCK: 3,
            ModerationAction.ESCALATE: 4
        }
        
        final_action = ModerationAction.ALLOW
        max_confidence = 0.0
        all_reasons = []
        filtered_content = original_content
        combined_metadata = {}
        
        for result in results:
            if action_priority[result.action] > action_priority[final_action]:
                final_action = result.action
            
            max_confidence = max(max_confidence, result.confidence)
            all_reasons.extend(result.reasons)
            
            if result.filtered_content:
                filtered_content = result.filtered_content
                
            if result.metadata:
                combined_metadata.update(result.metadata)
        
        # Remove duplicate reasons
        unique_reasons = list(set(all_reasons))
        
        return FilterResult(
            action=final_action,
            confidence=max_confidence,
            reasons=unique_reasons,
            filtered_content=filtered_content if filtered_content != original_content else None,
            metadata=combined_metadata
        )
    
    async def _is_repetitive_content(self, user_id: str, content: str) -> bool:
        """Check if user is posting repetitive content"""
        key = f"user_content:{user_id}"
        content_hash = str(hash(content))
        
        # Get recent content hashes
        recent_hashes = await self.redis_client.lrange(key, 0, 4)  # Last 5 messages
        
        # Check for repetition
        if recent_hashes.count(content_hash) >= 2:
            return True
        
        # Store current content hash
        await self.redis_client.lpush(key, content_hash)
        await self.redis_client.ltrim(key, 0, 9)  # Keep last 10
        await self.redis_client.expire(key, 3600)  # 1 hour
        
        return False
    
    async def _is_rapid_posting(self, user_id: str) -> bool:
        """Check if user is posting too rapidly"""
        key = f"posting_rate:{user_id}"
        now = datetime.utcnow().timestamp()
        
        # Add current timestamp
        await self.redis_client.zadd(key, {str(now): now})
        
        # Remove old timestamps (older than 1 minute)
        minute_ago = now - 60
        await self.redis_client.zremrangebyscore(key, 0, minute_ago)
        
        # Count recent posts
        recent_count = await self.redis_client.zcard(key)
        
        # Set expiration
        await self.redis_client.expire(key, 300)  # 5 minutes
        
        return recent_count > 10  # More than 10 posts per minute
    
    async def _get_cached_result(self, cache_key: str) -> Optional[FilterResult]:
        """Get cached filter result"""
        try:
            cached_data = await self.redis_client.get(cache_key)
            if cached_data:
                data = json.loads(cached_data)
                return FilterResult(
                    action=ModerationAction(data["action"]),
                    confidence=data["confidence"],
                    reasons=[FilterReason(r) for r in data["reasons"]],
                    filtered_content=data.get("filtered_content"),
                    metadata=data.get("metadata")
                )
        except Exception as e:
            logger.error(f"Failed to get cached result: {str(e)}")
        
        return None
    
    async def _cache_result(self, cache_key: str, result: FilterResult):
        """Cache filter result"""
        try:
            data = {
                "action": result.action.value,
                "confidence": result.confidence,
                "reasons": [r.value for r in result.reasons],
                "filtered_content": result.filtered_content,
                "metadata": result.metadata
            }
            
            await self.redis_client.setex(
                cache_key,
                self.ai_cache_ttl,
                json.dumps(data)
            )
        except Exception as e:
            logger.error(f"Failed to cache result: {str(e)}")
    
    async def _log_moderation(self, user_id: str, content: str, result: FilterResult):
        """Log moderation action to database"""
        try:
            db = self.SessionLocal()
            try:
                log_entry = ModerationLog(
                    user_id=user_id,
                    content_hash=str(hash(content)),
                    original_content=content,
                    filtered_content=result.filtered_content,
                    action=result.action.value,
                    reasons=json.dumps([r.value for r in result.reasons]),
                    confidence=result.confidence,
                    metadata=json.dumps(result.metadata) if result.metadata else None
                )
                
                db.add(log_entry)
                db.commit()
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to log moderation action: {str(e)}")
    
    async def get_user_moderation_stats(self, user_id: str) -> Dict[str, Any]:
        """Get moderation statistics for a user"""
        try:
            db = self.SessionLocal()
            try:
                from sqlalchemy import func
                
                # Get total actions
                total_actions = db.query(ModerationLog).filter(
                    ModerationLog.user_id == user_id
                ).count()
                
                # Get actions by type
                action_counts = db.query(
                    ModerationLog.action,
                    func.count(ModerationLog.id)
                ).filter(
                    ModerationLog.user_id == user_id
                ).group_by(ModerationLog.action).all()
                
                # Get recent violations (last 7 days)
                week_ago = datetime.utcnow() - timedelta(days=7)
                recent_violations = db.query(ModerationLog).filter(
                    ModerationLog.user_id == user_id,
                    ModerationLog.created_at >= week_ago,
                    ModerationLog.action.in_(['filter', 'block'])
                ).count()
                
                return {
                    "total_actions": total_actions,
                    "action_counts": dict(action_counts),
                    "recent_violations": recent_violations,
                    "user_id": user_id
                }
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to get user moderation stats: {str(e)}")
            return {}

# Global content filter instance
global_content_filter = ContentFilter()

# Decorator for easy content filtering
def content_filter(content_type: str = "message"):
    """Decorator for applying content filtering to endpoints"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # This would be implemented based on your specific endpoint structure
            # For now, returning the original function
            return await func(*args, **kwargs)
        return wrapper
    return decorator
