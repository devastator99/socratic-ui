/**
 * MessageBubble Component for Real-Time Chat
 * Enhanced message display with avatars, timestamps, and reactions
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Heart, ThumbsUp, Award, Clock, Copy, Flag } from 'lucide-react-native';

export interface MessageData {
  id: string;
  content: string;
  sender_wallet: string;
  sender_name?: string;
  timestamp: string;
  message_type?: 'text' | 'image' | 'file' | 'system';
  sender_nfts?: string[];
  reactions?: MessageReaction[];
  isOwn?: boolean;
}

export interface MessageReaction {
  type: string;
  emoji: string;
  count: number;
  hasReacted?: boolean;
}

interface MessageBubbleProps {
  message: MessageData;
  onReact?: (messageId: string, reactionType: string) => void;
  onCopy?: (content: string) => void;
  onReport?: (messageId: string) => void;
  showAvatar?: boolean;
  showTimestamp?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onReact,
  onCopy,
  onReport,
  showAvatar = true,
  showTimestamp = true,
}) => {
  const [showActions, setShowActions] = useState(false);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getWalletDisplayName = (wallet: string) => {
    if (message.sender_name) return message.sender_name;
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  const getAvatarUri = (wallet: string) => {
    // Generate a deterministic avatar based on wallet address
    const seed = wallet.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const avatarIndex = seed % 8 + 1; // Assume we have 8 different avatar images
    return `https://api.dicebear.com/7.x/identicon/png?seed=${wallet}&size=40`;
  };

  const renderReactions = () => {
    if (!message.reactions?.length) return null;

    return (
      <View style={styles.reactionsContainer}>
        {message.reactions.map((reaction, index) => (
          <TouchableOpacity
            key={`${reaction.type}-${index}`}
            style={[
              styles.reactionButton,
              reaction.hasReacted && styles.reactionButtonActive,
            ]}
            onPress={() => onReact?.(message.id, reaction.type)}
          >
            <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
            <Text style={[
              styles.reactionCount,
              reaction.hasReacted && styles.reactionCountActive,
            ]}>
              {reaction.count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderNFTBadges = () => {
    if (!message.sender_nfts?.length) return null;

    return (
      <View style={styles.nftBadgesContainer}>
        {message.sender_nfts.slice(0, 3).map((nft, index) => (
          <View key={nft} style={styles.nftBadge}>
            <Award size={12} color="#FFD700" />
          </View>
        ))}
        {message.sender_nfts.length > 3 && (
          <Text style={styles.nftMoreCount}>+{message.sender_nfts.length - 3}</Text>
        )}
      </View>
    );
  };

  const renderMessageActions = () => {
    if (!showActions) return null;

    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onReact?.(message.id, 'like')}
        >
          <ThumbsUp size={16} color="#8B7CF6" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onReact?.(message.id, 'love')}
        >
          <Heart size={16} color="#EF4444" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onCopy?.(message.content)}
        >
          <Copy size={16} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onReport?.(message.id)}
        >
          <Flag size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>
    );
  };

  const isSystemMessage = message.message_type === 'system';
  const isOwnMessage = message.isOwn;

  if (isSystemMessage) {
    return (
      <View style={styles.systemMessageContainer}>
        <Text style={styles.systemMessageText}>{message.content}</Text>
        {showTimestamp && (
          <Text style={styles.systemTimestamp}>
            {formatTimestamp(message.timestamp)}
          </Text>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
      ]}
      onLongPress={() => setShowActions(!showActions)}
      activeOpacity={0.8}
    >
      <View style={[
        styles.messageBubble,
        isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
      ]}>
        {/* Avatar and sender info for other messages */}
        {!isOwnMessage && showAvatar && (
          <View style={styles.senderInfo}>
            <Image
              source={{ uri: getAvatarUri(message.sender_wallet) }}
              style={styles.avatar}
            />
            <View style={styles.senderDetails}>
              <Text style={styles.senderName}>
                {getWalletDisplayName(message.sender_wallet)}
              </Text>
              {renderNFTBadges()}
            </View>
          </View>
        )}

        {/* Message content */}
        <View style={styles.messageContent}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
          ]}>
            {message.content}
          </Text>
        </View>

        {/* Timestamp */}
        {showTimestamp && (
          <View style={styles.timestampContainer}>
            <Clock size={12} color="#6B7280" />
            <Text style={styles.timestamp}>
              {formatTimestamp(message.timestamp)}
            </Text>
          </View>
        )}

        {/* Reactions */}
        {renderReactions()}

        {/* Message actions */}
        {renderMessageActions()}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  ownMessageBubble: {
    backgroundColor: '#8B7CF6',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#374151',
    borderBottomLeftRadius: 4,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  senderDetails: {
    flex: 1,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 2,
  },
  nftBadgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nftBadge: {
    marginRight: 4,
  },
  nftMoreCount: {
    fontSize: 10,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  messageContent: {
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#F3F4F6',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  reactionButtonActive: {
    backgroundColor: '#3B82F6',
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  reactionCountActive: {
    color: '#FFFFFF',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#4B5563',
  },
  actionButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#1F2937',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  systemMessageText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  systemTimestamp: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
});
