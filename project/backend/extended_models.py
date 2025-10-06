"""
Extended database models for token-gated study platform
Includes rooms, achievements, NFTs, notifications, and blockchain integration
"""

import uuid as uuid_lib
import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import (
    CheckConstraint, DateTime, Double, Enum, ForeignKeyConstraint, 
    Index, Integer, JSON, PrimaryKeyConstraint, String, Text, 
    UniqueConstraint, Uuid, text, Boolean, BigInteger
)
from typing import Any, List, Optional
from enum import Enum as PyEnum

# Import base models
from models import Base, Users, PdfUploads


class RoomType(PyEnum):
    PUBLIC = "public"
    TOKEN_GATED = "token_gated"
    NFT_GATED = "nft_gated"
    PRIVATE = "private"


class ParticipantRole(PyEnum):
    OWNER = "owner"
    MODERATOR = "moderator"
    MEMBER = "member"


class MessageType(PyEnum):
    TEXT = "text"
    DOCUMENT_SHARE = "document_share"
    HIGHLIGHT = "highlight"
    SYSTEM = "system"


class NotificationPlatform(PyEnum):
    WEB = "web"
    IOS = "ios"
    ANDROID = "android"


class PermissionType(PyEnum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


# Extended Users model fields (alterations to existing table)
class ExtendedUsers(Base):
    """
    Extended user model with blockchain and reputation features
    Note: This extends the existing Users table with additional columns
    """
    __tablename__ = 'users_extended'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='users_extended_pkey'),
        UniqueConstraint('wallet_address', name='users_extended_wallet_address_key'),
        UniqueConstraint('username', name='users_extended_username_key'),
    )

    id: Mapped[uuid_lib.UUID] = mapped_column(Uuid, primary_key=True)
    username: Mapped[Optional[str]] = mapped_column(String(50))
    wallet_address: Mapped[Optional[str]] = mapped_column(String(44))  # Solana address length
    wallet_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    reputation_score: Mapped[int] = mapped_column(Integer, default=0)
    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    level_id: Mapped[Optional[uuid_lib.UUID]] = mapped_column(
        Uuid, ForeignKey('user_levels.id')
    )
    profile_nft_mint: Mapped[Optional[str]] = mapped_column(String(44))
    bio: Mapped[Optional[str]] = mapped_column(Text)
    last_seen_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=text('CURRENT_TIMESTAMP'),
        onupdate=text('CURRENT_TIMESTAMP')
    )

    # Relationships
    level: Mapped[Optional['UserLevels']] = relationship('UserLevels', back_populates='users')
    created_rooms: Mapped[List['StudyRooms']] = relationship(
        'StudyRooms', back_populates='creator'
    )
    room_participations: Mapped[List['RoomParticipants']] = relationship(
        'RoomParticipants', back_populates='user'
    )
    chat_messages: Mapped[List['ChatMessages']] = relationship(
        'ChatMessages', back_populates='user'
    )
    achievements: Mapped[List['UserAchievements']] = relationship(
        'UserAchievements', back_populates='user'
    )
    nft_highlights: Mapped[List['NFTHighlights']] = relationship(
        'NFTHighlights', back_populates='user'
    )
    notification_tokens: Mapped[List['NotificationTokens']] = relationship(
        'NotificationTokens', back_populates='user'
    )
    notifications: Mapped[List['Notifications']] = relationship(
        'Notifications', back_populates='user'
    )


class UserLevels(Base):
    """User level system for gamification"""
    __tablename__ = 'user_levels'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='user_levels_pkey'),
        UniqueConstraint('level', name='user_levels_level_key'),
    )

    id: Mapped[uuid_lib.UUID] = mapped_column(Uuid, primary_key=True, default=uuid_lib.uuid4)
    level: Mapped[int] = mapped_column(Integer, unique=True)
    name: Mapped[str] = mapped_column(String(100))
    min_xp: Mapped[int] = mapped_column(Integer)
    max_xp: Mapped[Optional[int]] = mapped_column(Integer)
    badge_image_url: Mapped[Optional[str]] = mapped_column(Text)
    perks: Mapped[dict] = mapped_column(JSONB, default=lambda: [])

    # Relationships
    users: Mapped[List['ExtendedUsers']] = relationship('ExtendedUsers', back_populates='level')


class StudyRooms(Base):
    """Study rooms with token/NFT gating capabilities"""
    __tablename__ = 'study_rooms'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='study_rooms_pkey'),
        ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='SET NULL'),
        Index('idx_study_rooms_type', 'room_type'),
        Index('idx_study_rooms_creator', 'creator_id'),
    )

    id: Mapped[uuid_lib.UUID] = mapped_column(Uuid, primary_key=True, default=uuid_lib.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    creator_id: Mapped[Optional[uuid_lib.UUID]] = mapped_column(Uuid)
    room_type: Mapped[str] = mapped_column(
        Enum(RoomType), 
        CheckConstraint("room_type IN ('public', 'token_gated', 'nft_gated', 'private')")
    )
    access_token_mint: Mapped[Optional[str]] = mapped_column(String(44))  # SPL token mint
    access_nft_collection: Mapped[Optional[str]] = mapped_column(String(44))  # NFT collection
    min_token_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    max_participants: Mapped[int] = mapped_column(Integer, default=50)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    room_nft_mint: Mapped[Optional[str]] = mapped_column(String(44))  # Room NFT
    arweave_metadata_tx: Mapped[Optional[str]] = mapped_column(Text)  # Arweave TX ID
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=text('CURRENT_TIMESTAMP')
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=text('CURRENT_TIMESTAMP'),
        onupdate=text('CURRENT_TIMESTAMP')
    )

    # Relationships
    creator: Mapped[Optional['ExtendedUsers']] = relationship(
        'ExtendedUsers', back_populates='created_rooms'
    )
    participants: Mapped[List['RoomParticipants']] = relationship(
        'RoomParticipants', back_populates='room', cascade='all, delete-orphan'
    )
    messages: Mapped[List['ChatMessages']] = relationship(
        'ChatMessages', back_populates='room', cascade='all, delete-orphan'
    )
    document_permissions: Mapped[List['DocumentPermissions']] = relationship(
        'DocumentPermissions', back_populates='room', cascade='all, delete-orphan'
    )


class RoomParticipants(Base):
    """Room membership and roles"""
    __tablename__ = 'room_participants'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='room_participants_pkey'),
        ForeignKeyConstraint(['room_id'], ['study_rooms.id'], ondelete='CASCADE'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        UniqueConstraint('room_id', 'user_id', name='room_participants_unique'),
        Index('idx_room_participants_room', 'room_id'),
        Index('idx_room_participants_user', 'user_id'),
    )

    id: Mapped[uuid_lib.UUID] = mapped_column(Uuid, primary_key=True, default=uuid_lib.uuid4)
    room_id: Mapped[uuid_lib.UUID] = mapped_column(Uuid)
    user_id: Mapped[uuid_lib.UUID] = mapped_column(Uuid)
    role: Mapped[str] = mapped_column(
        Enum(ParticipantRole), 
        default='member',
        CheckConstraint("role IN ('owner', 'moderator', 'member')")
    )
    joined_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=text('CURRENT_TIMESTAMP')
    )
    last_active_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=text('CURRENT_TIMESTAMP')
    )
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    room: Mapped['StudyRooms'] = relationship('StudyRooms', back_populates='participants')
    user: Mapped['ExtendedUsers'] = relationship('ExtendedUsers', back_populates='room_participations')


class ChatMessages(Base):
    """Chat messages with NFT minting capabilities"""
    __tablename__ = 'chat_messages'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='chat_messages_pkey'),
        ForeignKeyConstraint(['room_id'], ['study_rooms.id'], ondelete='CASCADE'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        ForeignKeyConstraint(['reply_to_id'], ['chat_messages.id']),
        ForeignKeyConstraint(['document_id'], ['pdf_uploads.id']),
        Index('idx_chat_messages_room_time', 'room_id', 'created_at'),
        Index('idx_chat_messages_user', 'user_id'),
        Index('idx_chat_messages_document', 'document_id'),
    )

    id: Mapped[uuid_lib.UUID] = mapped_column(Uuid, primary_key=True, default=uuid_lib.uuid4)
    room_id: Mapped[uuid_lib.UUID] = mapped_column(Uuid)
    user_id: Mapped[Optional[uuid_lib.UUID]] = mapped_column(Uuid)
    message_type: Mapped[str] = mapped_column(
        Enum(MessageType),
        default='text',
        CheckConstraint("message_type IN ('text', 'document_share', 'highlight', 'system')")
    )
    content: Mapped[str] = mapped_column(Text)
    reply_to_id: Mapped[Optional[uuid_lib.UUID]] = mapped_column(Uuid)
    document_id: Mapped[Optional[uuid_lib.UUID]] = mapped_column(Uuid)
    highlight_data: Mapped[Optional[dict]] = mapped_column(JSONB)
    nft_mint: Mapped[Optional[str]] = mapped_column(String(44))  # NFT mint address
    arweave_tx: Mapped[Optional[str]] = mapped_column(Text)  # Arweave transaction
    reactions: Mapped[dict] = mapped_column(JSONB, default=lambda: {})  # {user_id: emoji}
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=text('CURRENT_TIMESTAMP')
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=text('CURRENT_TIMESTAMP'),
        onupdate=text('CURRENT_TIMESTAMP')
    )

    # Relationships
    room: Mapped['StudyRooms'] = relationship('StudyRooms', back_populates='messages')
    user: Mapped[Optional['ExtendedUsers']] = relationship('ExtendedUsers', back_populates='chat_messages')
    document: Mapped[Optional['PdfUploads']] = relationship('PdfUploads')
    reply_to: Mapped[Optional['ChatMessages']] = relationship('ChatMessages', remote_side=[id])


class Achievements(Base):
    """Achievement definitions with NFT rewards"""
    __tablename__ = 'achievements'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='achievements_pkey'),
    )

    id: Mapped[uuid_lib.UUID] = mapped_column(Uuid, primary_key=True, default=uuid_lib.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[Optional[str]] = mapped_column(String(100))
    xp_reward: Mapped[int] = mapped_column(Integer, default=0)
    badge_image_url: Mapped[Optional[str]] = mapped_column(Text)
    nft_collection: Mapped[Optional[str]] = mapped_column(String(44))  # Soulbound NFT collection
    requirements: Mapped[Optional[dict]] = mapped_column(JSONB)  # Achievement conditions
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=text('CURRENT_TIMESTAMP')
    )

    # Relationships
    user_achievements: Mapped[List['UserAchievements']] = relationship(
        'UserAchievements', back_populates='achievement', cascade='all, delete-orphan'
    )


class UserAchievements(Base):
    """User earned achievements with soulbound NFTs"""
    __tablename__ = 'user_achievements'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='user_achievements_pkey'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        ForeignKeyConstraint(['achievement_id'], ['achievements.id'], ondelete='CASCADE'),
        UniqueConstraint('user_id', 'achievement_id', name='user_achievements_unique'),
    )

    id: Mapped[uuid_lib.UUID] = mapped_column(Uuid, primary_key=True, default=uuid_lib.uuid4)
    user_id: Mapped[uuid_lib.UUID] = mapped_column(Uuid)
    achievement_id: Mapped[uuid_lib.UUID] = mapped_column(Uuid)
    earned_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=text('CURRENT_TIMESTAMP')
    )
    nft_mint: Mapped[Optional[str]] = mapped_column(String(44))  # Soulbound NFT mint
    transaction_signature: Mapped[Optional[str]] = mapped_column(String(88))  # Solana tx signature

    # Relationships
    user: Mapped['ExtendedUsers'] = relationship('ExtendedUsers', back_populates='achievements')
    achievement: Mapped['Achievements'] = relationship('Achievements', back_populates='user_achievements')


class NFTHighlights(Base):
    """NFT-minted text highlights from documents"""
    __tablename__ = 'nft_highlights'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='nft_highlights_pkey'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        ForeignKeyConstraint(['message_id'], ['chat_messages.id'], ondelete='CASCADE'),
        ForeignKeyConstraint(['document_id'], ['pdf_uploads.id']),
        UniqueConstraint('nft_mint', name='nft_highlights_mint_unique'),
        Index('idx_nft_highlights_user', 'user_id'),
        Index('idx_nft_highlights_document', 'document_id'),
    )

    id: Mapped[uuid_lib.UUID] = mapped_column(Uuid, primary_key=True, default=uuid_lib.uuid4)
    user_id: Mapped[uuid_lib.UUID] = mapped_column(Uuid)
    message_id: Mapped[uuid_lib.UUID] = mapped_column(Uuid)
    document_id: Mapped[Optional[uuid_lib.UUID]] = mapped_column(Uuid)
    highlight_text: Mapped[str] = mapped_column(Text)
    context_before: Mapped[Optional[str]] = mapped_column(Text)
    context_after: Mapped[Optional[str]] = mapped_column(Text)
    page_number: Mapped[Optional[int]] = mapped_column(Integer)
    coordinates: Mapped[Optional[dict]] = mapped_column(JSONB)  # Position data
    nft_mint: Mapped[str] = mapped_column(String(44), unique=True)
    arweave_metadata_tx: Mapped[Optional[str]] = mapped_column(Text)
    ipfs_backup_hash: Mapped[Optional[str]] = mapped_column(String(46))  # IPFS hash
    mint_transaction_signature: Mapped[Optional[str]] = mapped_column(String(88))
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=text('CURRENT_TIMESTAMP')
    )

    # Relationships
    user: Mapped['ExtendedUsers'] = relationship('ExtendedUsers', back_populates='nft_highlights')
    message: Mapped['ChatMessages'] = relationship('ChatMessages')
    document: Mapped[Optional['PdfUploads']] = relationship('PdfUploads')


class DocumentPermissions(Base):
    """Document access permissions for rooms and users"""
    __tablename__ = 'document_permissions'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='document_permissions_pkey'),
        ForeignKeyConstraint(['document_id'], ['pdf_uploads.id'], ondelete='CASCADE'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        ForeignKeyConstraint(['room_id'], ['study_rooms.id'], ondelete='CASCADE'),
        ForeignKeyConstraint(['granted_by'], ['users.id']),
        UniqueConstraint('document_id', 'user_id', 'room_id', name='document_permissions_unique'),
    )

    id: Mapped[uuid_lib.UUID] = mapped_column(Uuid, primary_key=True, default=uuid_lib.uuid4)
    document_id: Mapped[uuid_lib.UUID] = mapped_column(Uuid)
    user_id: Mapped[uuid_lib.UUID] = mapped_column(Uuid)
    room_id: Mapped[uuid_lib.UUID] = mapped_column(Uuid)
    permission_type: Mapped[str] = mapped_column(
        Enum(PermissionType),
        CheckConstraint("permission_type IN ('read', 'write', 'admin')")
    )
    granted_by: Mapped[Optional[uuid_lib.UUID]] = mapped_column(Uuid)
    granted_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=text('CURRENT_TIMESTAMP')
    )
    expires_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    # Relationships
    document: Mapped['PdfUploads'] = relationship('PdfUploads')
    user: Mapped['ExtendedUsers'] = relationship('ExtendedUsers', foreign_keys=[user_id])
    room: Mapped['StudyRooms'] = relationship('StudyRooms', back_populates='document_permissions')
    granter: Mapped[Optional['ExtendedUsers']] = relationship('ExtendedUsers', foreign_keys=[granted_by])


class NotificationTokens(Base):
    """Push notification device tokens"""
    __tablename__ = 'notification_tokens'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='notification_tokens_pkey'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        UniqueConstraint('user_id', 'token', name='notification_tokens_unique'),
    )

    id: Mapped[uuid_lib.UUID] = mapped_column(Uuid, primary_key=True, default=uuid_lib.uuid4)
    user_id: Mapped[uuid_lib.UUID] = mapped_column(Uuid)
    token: Mapped[str] = mapped_column(Text)
    platform: Mapped[str] = mapped_column(
        Enum(NotificationPlatform),
        CheckConstraint("platform IN ('web', 'ios', 'android')")
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=text('CURRENT_TIMESTAMP')
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=text('CURRENT_TIMESTAMP'),
        onupdate=text('CURRENT_TIMESTAMP')
    )

    # Relationships
    user: Mapped['ExtendedUsers'] = relationship('ExtendedUsers', back_populates='notification_tokens')


class Notifications(Base):
    """User notifications"""
    __tablename__ = 'notifications'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='notifications_pkey'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        Index('idx_notifications_user_unread', 'user_id', 'is_read', 'created_at'),
    )

    id: Mapped[uuid_lib.UUID] = mapped_column(Uuid, primary_key=True, default=uuid_lib.uuid4)
    user_id: Mapped[uuid_lib.UUID] = mapped_column(Uuid)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    type: Mapped[Optional[str]] = mapped_column(String(50))
    data: Mapped[Optional[dict]] = mapped_column(JSONB)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=text('CURRENT_TIMESTAMP')
    )

    # Relationships
    user: Mapped['ExtendedUsers'] = relationship('ExtendedUsers', back_populates='notifications')


# Extensions to existing PdfUploads model
class ExtendedPdfUploads(Base):
    """Extended document model with decentralized storage"""
    __tablename__ = 'pdf_uploads_extended'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='pdf_uploads_extended_pkey'),
    )

    id: Mapped[uuid_lib.UUID] = mapped_column(Uuid, primary_key=True)
    arweave_tx: Mapped[Optional[str]] = mapped_column(Text)  # Arweave transaction ID
    ipfs_hash: Mapped[Optional[str]] = mapped_column(String(46))  # IPFS hash
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    tags: Mapped[list] = mapped_column(JSONB, default=lambda: [])
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100))
