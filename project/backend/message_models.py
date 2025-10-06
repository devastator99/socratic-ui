"""
Message Storage Models for Real-Time Chat
SQLAlchemy models for storing chat messages, rooms, and user interactions
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models import Base
from pydantic import BaseModel
from typing import Optional
from storage.arweave_ipfs_handler import ArweaveIPFSHandler

class ChatRoom(Base):
    """Chat room model for organizing conversations"""
    __tablename__ = "chat_rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    room_type = Column(String(50), nullable=False, default="public")  # public, nft_gated, private
    
    # NFT gating configuration
    required_nfts = Column(JSON)  # List of NFT mint addresses required for access
    required_sol_balance = Column(Integer, default=0)  # Minimum SOL balance in lamports
    
    # Room settings
    max_members = Column(Integer, default=100)
    is_active = Column(Boolean, default=True)
    created_by = Column(String(255), nullable=False)  # Wallet address of creator
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    messages = relationship("ChatMessage", back_populates="room", cascade="all, delete-orphan")
    members = relationship("RoomMember", back_populates="room", cascade="all, delete-orphan")

class ChatMessage(Base):
    """Chat message model for storing all messages"""
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("chat_rooms.id"), nullable=False, index=True)
    
    # Message content
    message_type = Column(String(50), nullable=False, default="text")  # text, image, file, system
    content = Column(Text, nullable=False)
    
    # Message metadata
    sender_wallet = Column(String(255), nullable=False, index=True)
    sender_name = Column(String(255))  # Optional display name
    
    # Message status
    is_deleted = Column(Boolean, default=False)
    is_edited = Column(Boolean, default=False)
    
    # NFT verification for gated messages
    sender_nfts = Column(JSON)  # NFTs held by sender at time of message
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    room = relationship("ChatRoom", back_populates="messages")
    reactions = relationship("MessageReaction", back_populates="message", cascade="all, delete-orphan")

class RoomMember(Base):
    """Room membership tracking"""
    __tablename__ = "room_members"
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("chat_rooms.id"), nullable=False)
    wallet_address = Column(String(255), nullable=False, index=True)
    
    # Member role and permissions
    role = Column(String(50), default="member")  # owner, admin, moderator, member
    can_send_messages = Column(Boolean, default=True)
    can_delete_messages = Column(Boolean, default=False)
    
    # Activity tracking
    last_seen = Column(DateTime(timezone=True))
    message_count = Column(Integer, default=0)
    
    # Timestamps
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    room = relationship("ChatRoom", back_populates="members")

class MessageReaction(Base):
    """Message reactions (likes, emojis, etc.)"""
    __tablename__ = "message_reactions"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("chat_messages.id"), nullable=False)
    wallet_address = Column(String(255), nullable=False)
    
    # Reaction details
    reaction_type = Column(String(50), nullable=False)  # like, love, laugh, etc.
    emoji = Column(String(10))  # Unicode emoji
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships  
    message = relationship("ChatMessage", back_populates="reactions")

class UserStatus(Base):
    """Track user online status and activity"""
    __tablename__ = "user_status"
    
    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String(255), unique=True, nullable=False, index=True)
    
    # Status information
    is_online = Column(Boolean, default=False)
    status_message = Column(String(255))  # Custom status
    current_room_id = Column(Integer, ForeignKey("chat_rooms.id"))
    
    # Activity tracking
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    total_messages = Column(Integer, default=0)
    
    # Connection tracking
    connection_count = Column(Integer, default=0)  # Number of active connections
    
    # Timestamps
    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class PrivateMessage(Base):
    """Direct messages between users"""
    __tablename__ = "private_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Participants
    sender_wallet = Column(String(255), nullable=False, index=True)
    recipient_wallet = Column(String(255), nullable=False, index=True)
    
    # Message content
    content = Column(Text, nullable=False)
    message_type = Column(String(50), default="text")
    
    # Message status
    is_read = Column(Boolean, default=False)
    is_deleted_by_sender = Column(Boolean, default=False)
    is_deleted_by_recipient = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True))

class HighlightNFT(BaseModel):
    message_id: str
    arweave_tx_id: Optional[str] = None
    ipfs_hash: Optional[str] = None

    def mint(self, message_content: str):
        """Mint NFT for a message highlight."""
        storage_handler = ArweaveIPFSHandler()
        # Convert message content to metadata
        metadata = {
            "message_content": message_content,
            "highlighted": True,
        }
        # Store metadata on Arweave and IPFS
        self.arweave_tx_id = storage_handler.upload_to_arweave(metadata)
        self.ipfs_hash = storage_handler.upload_to_ipfs(metadata)
