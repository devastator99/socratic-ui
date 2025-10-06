"""
Socratic AI Agent - Intelligent Question Generation and Discussion Facilitation
Integrates with existing Celery, OpenAI, and Redis infrastructure to provide
thoughtful AI-driven conversations and questions.
"""

import asyncio
import json
import logging
import os
import re
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from celery_worker import celery_app
from redis_pubsub import redis_pubsub_manager
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from message_models import ChatMessage, ChatRoom
from models import Base

logger = logging.getLogger(__name__)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class SocraticAI:
    """
    Socratic AI Agent that generates thoughtful questions and facilitates discussions
    """
    
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_base = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
        self.model_name = os.getenv("OPENAI_MODEL", "gpt-4")
        
        # Initialize LangChain ChatOpenAI
        self.llm = ChatOpenAI(
            model=self.model_name,
            openai_api_key=self.openai_api_key,
            openai_api_base=self.openai_base,
            temperature=0.7,
            max_tokens=500
        )
        
        # Trigger patterns for Socratic AI activation
        self.trigger_patterns = [
            r'@socratic',  # Direct mention
            r'@ai',        # AI mention
            r'\?{2,}',     # Multiple question marks
            r'what do you think',
            r'any thoughts',
            r'help me understand',
            r'explain this',
            r'why is this',
            r'how does this'
        ]
        
        # Message hooks registry
        self.message_hooks: Dict[str, List[callable]] = {}
        
        logger.info("Socratic AI initialized successfully")
    
    def should_respond(self, message_content: str, room_id: int = None) -> bool:
        """
        Determine if the Socratic AI should respond to a message
        """
        message_lower = message_content.lower()
        
        # Check trigger patterns
        for pattern in self.trigger_patterns:
            if re.search(pattern, message_lower):
                return True
        
        # Additional context-based triggers
        if len(message_content) > 100 and '?' in message_content:
            return True
            
        return False
    
    async def generate_socratic_response(self, 
                                       message_content: str, 
                                       context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Generate a Socratic response with thoughtful questions
        """
        try:
            # Build context for the AI
            context_info = ""
            if context:
                room_name = context.get('room_name', 'Unknown Room')
                sender = context.get('sender_name', 'Someone')
                context_info = f"In room '{room_name}', {sender} said: "
            
            # Socratic AI system prompt
            system_prompt = """You are a Socratic AI assistant designed to facilitate deep thinking and learning through thoughtful questions. Your role is to:

1. Ask probing questions that help users think deeper about their statements
2. Encourage critical thinking and self-reflection
3. Guide conversations toward meaningful insights
4. Be curious, supportive, and non-judgmental
5. Keep responses concise but thought-provoking (2-3 sentences max)

Remember the Socratic method: instead of giving direct answers, ask questions that lead users to discover insights themselves."""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"{context_info}{message_content}")
            ]
            
            # Generate response using LangChain
            response = await asyncio.to_thread(self.llm.invoke, messages)
            
            return {
                "success": True,
                "response": response.content.strip(),
                "type": "socratic_question",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating Socratic response: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "fallback_response": "That's an interesting point. What led you to that conclusion?"
            }
    
    def register_message_hook(self, hook_name: str, callback: callable):
        """
        Register a message hook callback
        """
        if hook_name not in self.message_hooks:
            self.message_hooks[hook_name] = []
        
        self.message_hooks[hook_name].append(callback)
        logger.info(f"Registered message hook: {hook_name}")
    
    async def trigger_message_hooks(self, hook_name: str, data: Dict[str, Any]):
        """
        Trigger all registered hooks for a given event
        """
        if hook_name in self.message_hooks:
            for callback in self.message_hooks[hook_name]:
                try:
                    await callback(data)
                except Exception as e:
                    logger.error(f"Error in message hook {hook_name}: {str(e)}")

# Global Socratic AI instance
socratic_ai = SocraticAI()

# Message hook implementations
async def process_new_message_hook(data: Dict[str, Any]):
    """
    Hook triggered when a new message is received
    """
    message_content = data.get('content', '')
    room_id = data.get('room_id')
    sender_wallet = data.get('sender_wallet', '')
    
    # Check if Socratic AI should respond
    if socratic_ai.should_respond(message_content, room_id):
        logger.info(f"Socratic AI triggered for message in room {room_id}")
        
        # Queue Socratic response task
        generate_socratic_response_task.delay(
            message_content=message_content,
            room_id=room_id,
            sender_wallet=sender_wallet,
            context=data
        )

async def process_question_hook(data: Dict[str, Any]):
    """
    Hook triggered when a question is detected
    """
    message_content = data.get('content', '')
    
    # Count question marks
    question_count = message_content.count('?')
    
    if question_count >= 2:  # Multiple questions indicate confusion/deep inquiry
        logger.info("Multiple questions detected - triggering enhanced Socratic response")
        
        # Queue enhanced response task
        generate_socratic_response_task.delay(
            message_content=message_content,
            room_id=data.get('room_id'),
            sender_wallet=data.get('sender_wallet', ''),
            context=data,
            enhanced=True
        )

# Register message hooks
socratic_ai.register_message_hook('new_message', process_new_message_hook)
socratic_ai.register_message_hook('question_detected', process_question_hook)

# Celery task for generating Socratic responses
@celery_app.task(name="socratic_ai.generate_socratic_response")
def generate_socratic_response_task(message_content: str, 
                                  room_id: int, 
                                  sender_wallet: str, 
                                  context: Dict[str, Any] = None,
                                  enhanced: bool = False):
    """
    Celery task to generate and send Socratic AI responses
    """
    try:
        logger.info(f"🤖 Generating Socratic response for room {room_id}")
        
        # Create async event loop for this task
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Generate response
            response_data = loop.run_until_complete(
                socratic_ai.generate_socratic_response(message_content, context)
            )
            
            if response_data.get('success'):
                # Send response through Redis pub/sub
                loop.run_until_complete(
                    send_system_message(
                        room_id=room_id,
                        content=response_data['response'],
                        message_type='socratic_ai',
                        metadata={
                            'enhanced': enhanced,
                            'trigger_wallet': sender_wallet,
                            'timestamp': response_data['timestamp']
                        }
                    )
                )
                
                logger.info(f"✅ Socratic response sent to room {room_id}")
            else:
                # Send fallback response
                fallback = response_data.get('fallback_response', 
                                           "That's thought-provoking. Can you tell me more about what you're thinking?")
                
                loop.run_until_complete(
                    send_system_message(
                        room_id=room_id,
                        content=fallback,
                        message_type='socratic_ai',
                        metadata={'fallback': True, 'error': response_data.get('error')}
                    )
                )
        
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"❌ Error in Socratic response task: {str(e)}")

async def send_system_message(room_id: int, 
                            content: str, 
                            message_type: str = 'system',
                            metadata: Dict[str, Any] = None):
    """
    Send a system message through Redis pub/sub and store in database
    """
    try:
        # Store message in database
        db = SessionLocal()
        try:
            # Create system message record
            system_message = ChatMessage(
                room_id=room_id,
                message_type=message_type,
                content=content,
                sender_wallet='system_socratic_ai',
                sender_name='Socratic AI',
                metadata=metadata or {}
            )
            
            db.add(system_message)
            db.commit()
            db.refresh(system_message)
            
            # Prepare message for pub/sub
            pubsub_data = {
                'id': system_message.id,
                'room_id': room_id,
                'content': content,
                'message_type': message_type,
                'sender_wallet': 'system_socratic_ai',
                'sender_name': 'Socratic AI',
                'timestamp': system_message.created_at.isoformat(),
                'metadata': metadata or {}
            }
            
            # Send through Redis pub/sub
            await redis_pubsub_manager.publish(
                channel=f"room_{room_id}",
                message=json.dumps(pubsub_data)
            )
            
            logger.info(f"📤 System message sent to room {room_id}: {content[:50]}...")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error sending system message: {str(e)}")

# Utility function to trigger Socratic AI from external code
async def trigger_socratic_ai(message_data: Dict[str, Any]):
    """
    External trigger for Socratic AI processing
    """
    await socratic_ai.trigger_message_hooks('new_message', message_data)
    
    # Also check for questions
    if '?' in message_data.get('content', ''):
        await socratic_ai.trigger_message_hooks('question_detected', message_data)
