-- Migration script to add extended schema for token-gated study platform
-- This adds all the new tables and extends existing ones

-- Start transaction
BEGIN;

-- Create user levels table
CREATE TABLE IF NOT EXISTS user_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level INTEGER UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    min_xp INTEGER NOT NULL,
    max_xp INTEGER,
    badge_image_url TEXT,
    perks JSONB DEFAULT '[]'
);

-- Extend users table with new columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(44) UNIQUE,
ADD COLUMN IF NOT EXISTS wallet_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level_id UUID REFERENCES user_levels(id),
ADD COLUMN IF NOT EXISTS profile_nft_mint VARCHAR(44),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create study rooms table
CREATE TABLE IF NOT EXISTS study_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    room_type VARCHAR(20) CHECK (room_type IN ('public', 'token_gated', 'nft_gated', 'private')) NOT NULL,
    access_token_mint VARCHAR(44),
    access_nft_collection VARCHAR(44),
    min_token_amount BIGINT DEFAULT 0,
    max_participants INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    room_nft_mint VARCHAR(44),
    arweave_metadata_tx TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create room participants table
CREATE TABLE IF NOT EXISTS room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES study_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_banned BOOLEAN DEFAULT FALSE,
    UNIQUE(room_id, user_id)
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES study_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'document_share', 'highlight', 'system')),
    content TEXT NOT NULL,
    reply_to_id UUID REFERENCES chat_messages(id),
    document_id UUID REFERENCES pdf_uploads(id),
    highlight_data JSONB,
    nft_mint VARCHAR(44),
    arweave_tx TEXT,
    reactions JSONB DEFAULT '{}',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    xp_reward INTEGER DEFAULT 0,
    badge_image_url TEXT,
    nft_collection VARCHAR(44),
    requirements JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nft_mint VARCHAR(44),
    transaction_signature VARCHAR(88),
    UNIQUE(user_id, achievement_id)
);

-- Create NFT highlights table
CREATE TABLE IF NOT EXISTS nft_highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    document_id UUID REFERENCES pdf_uploads(id),
    highlight_text TEXT NOT NULL,
    context_before TEXT,
    context_after TEXT,
    page_number INTEGER,
    coordinates JSONB,
    nft_mint VARCHAR(44) UNIQUE NOT NULL,
    arweave_metadata_tx TEXT,
    ipfs_backup_hash VARCHAR(46),
    mint_transaction_signature VARCHAR(88),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create document permissions table
CREATE TABLE IF NOT EXISTS document_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES pdf_uploads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    room_id UUID REFERENCES study_rooms(id) ON DELETE CASCADE,
    permission_type VARCHAR(20) CHECK (permission_type IN ('read', 'write', 'admin')),
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE(document_id, user_id, room_id)
);

-- Create notification tokens table
CREATE TABLE IF NOT EXISTS notification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20) CHECK (platform IN ('web', 'ios', 'android')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, token)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50),
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extend pdf_uploads table with new columns
ALTER TABLE pdf_uploads
ADD COLUMN IF NOT EXISTS arweave_tx TEXT,
ADD COLUMN IF NOT EXISTS ipfs_hash VARCHAR(46),
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_study_rooms_type ON study_rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_study_rooms_creator ON study_rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_time ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_document ON chat_messages(document_id);
CREATE INDEX IF NOT EXISTS idx_nft_highlights_user ON nft_highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_nft_highlights_document ON nft_highlights(document_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- Insert default user levels
INSERT INTO user_levels (level, name, min_xp, max_xp, badge_image_url) VALUES
(1, 'Novice Scholar', 0, 99, '/badges/novice.png'),
(2, 'Apprentice Reader', 100, 299, '/badges/apprentice.png'),
(3, 'Dedicated Student', 300, 599, '/badges/student.png'),
(4, 'Knowledge Seeker', 600, 999, '/badges/seeker.png'),
(5, 'Scholarly Mind', 1000, 1999, '/badges/scholar.png'),
(6, 'Master Learner', 2000, 3999, '/badges/master.png'),
(7, 'Wisdom Keeper', 4000, 7999, '/badges/wisdom.png'),
(8, 'Enlightened One', 8000, 15999, '/badges/enlightened.png'),
(9, 'Grand Scholar', 16000, 31999, '/badges/grand.png'),
(10, 'Transcendent', 32000, NULL, '/badges/transcendent.png')
ON CONFLICT (level) DO NOTHING;

-- Insert default achievements
INSERT INTO achievements (name, description, category, xp_reward, badge_image_url, requirements) VALUES
('First Steps', 'Complete your first study session', 'getting_started', 50, '/achievements/first_steps.png', '{"sessions_completed": 1}'),
('Social Butterfly', 'Join your first study room', 'social', 25, '/achievements/social.png', '{"rooms_joined": 1}'),
('Document Explorer', 'Upload your first document', 'content', 30, '/achievements/explorer.png', '{"documents_uploaded": 1}'),
('Highlight Master', 'Create 10 highlights', 'engagement', 100, '/achievements/highlighter.png', '{"highlights_created": 10}'),
('Question Guru', 'Ask 25 questions to the AI', 'learning', 150, '/achievements/questions.png', '{"questions_asked": 25}'),
('Knowledge Sharer', 'Share a document in a study room', 'social', 75, '/achievements/sharing.png', '{"documents_shared": 1}'),
('Consistent Learner', 'Study for 7 consecutive days', 'dedication', 200, '/achievements/streak.png', '{"consecutive_days": 7}'),
('NFT Collector', 'Mint your first highlight NFT', 'blockchain', 100, '/achievements/nft.png', '{"nfts_minted": 1}'),
('Room Creator', 'Create your first study room', 'leadership', 150, '/achievements/creator.png', '{"rooms_created": 1}'),
('Helper', 'Help 5 other users in study rooms', 'social', 125, '/achievements/helper.png', '{"users_helped": 5}')
ON CONFLICT (name) DO NOTHING;

-- Create trigger for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_study_rooms_updated_at ON study_rooms;
CREATE TRIGGER update_study_rooms_updated_at BEFORE UPDATE ON study_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_tokens_updated_at ON notification_tokens;
CREATE TRIGGER update_notification_tokens_updated_at BEFORE UPDATE ON notification_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
