/**
 * ChatRoomScreen Component for Real-Time Messaging
 * Complete chat room interface with WebSocket integration
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Send,
  Users,
  Settings,
  Wifi,
  WifiOff,
  AlertCircle,
  Hash,
  Lock,
  Crown,
} from 'lucide-react-native';
import { useWebSocket } from '@/hooks/useWebSocket';
import { MessageBubble, MessageData } from './MessageBubble';

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  room_type: 'public' | 'nft_gated' | 'private';
  required_nfts?: string[];
  member_count?: number;
  is_member?: boolean;
}

interface ChatRoomScreenProps {
  room: ChatRoom;
  userWallet: string;
  authToken: string;
  onLeaveRoom?: () => void;
  webSocketUrl?: string;
}

export const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({
  room,
  userWallet,
  authToken,
  onLeaveRoom,
  webSocketUrl = 'ws://localhost:8000/ws/chat',
}) => {
  // State management
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [inputText, setInputText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [typing, setTyping] = useState<string[]>([]);

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection
  const {
    isConnected,
    isConnecting,
    error: wsError,
    sendMessage,
    onMessage,
    connect,
    disconnect,
  } = useWebSocket({
    url: webSocketUrl,
    token: authToken,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
  });

  // Join room when connected
  useEffect(() => {
    if (isConnected && !isJoined) {
      sendMessage({
        type: 'join_room',
        room_id: room.id,
      });
    }
  }, [isConnected, isJoined, room.id, sendMessage]);

  // Message handlers
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Handle room joined
    unsubscribers.push(
      onMessage('room_joined', (data) => {
        console.log('Joined room:', data);
        setIsJoined(true);
        setIsLoading(false);
        
        // Load recent messages
        if (data.recent_messages) {
          setMessages(data.recent_messages.map((msg: any) => ({
            ...msg,
            isOwn: msg.wallet_address === userWallet,
          })));
        }
      })
    );

    // Handle new room messages
    unsubscribers.push(
      onMessage('room_message', (data) => {
        const newMessage: MessageData = {
          ...data,
          isOwn: data.wallet_address === userWallet,
        };
        
        setMessages(prev => [...prev, newMessage]);
        
        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      })
    );

    // Handle online users
    unsubscribers.push(
      onMessage('online_users', (data) => {
        setOnlineUsers(data.users || []);
      })
    );

    // Handle typing indicators
    unsubscribers.push(
      onMessage('user_typing', (data) => {
        if (data.wallet_address !== userWallet) {
          setTyping(prev => {
            if (!prev.includes(data.wallet_address)) {
              return [...prev, data.wallet_address];
            }
            return prev;
          });

          // Clear typing after 3 seconds
          setTimeout(() => {
            setTyping(prev => prev.filter(user => user !== data.wallet_address));
          }, 3000);
        }
      })
    );

    // Handle errors
    unsubscribers.push(
      onMessage('error', (data) => {
        console.error('WebSocket error:', data);
        Alert.alert('Error', data.message || 'An error occurred');
      })
    );

    // Handle welcome message
    unsubscribers.push(
      onMessage('welcome', (data) => {
        console.log('Welcome:', data);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [onMessage, userWallet, room.id]);

  // Connection status effect
  useEffect(() => {
    if (wsError) {
      setIsLoading(false);
      Alert.alert('Connection Error', wsError);
    }
  }, [wsError]);

  // Send message
  const handleSendMessage = useCallback(() => {
    if (!inputText.trim() || !isConnected || !isJoined) return;

    const success = sendMessage({
      type: 'room_message',
      room_id: room.id,
      message: inputText.trim(),
    });

    if (success) {
      setInputText('');
    } else {
      Alert.alert('Error', 'Failed to send message');
    }
  }, [inputText, isConnected, isJoined, sendMessage, room.id]);

  // Handle typing
  const handleTyping = useCallback(() => {
    if (!isConnected || !isJoined) return;

    sendMessage({
      type: 'user_typing',
      room_id: room.id,
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      sendMessage({
        type: 'user_stopped_typing',
        room_id: room.id,
      });
    }, 1000);
  }, [isConnected, isJoined, sendMessage, room.id]);

  // Message reactions
  const handleReaction = useCallback((messageId: string, reactionType: string) => {
    if (!isConnected || !isJoined) return;

    sendMessage({
      type: 'message_reaction',
      message_id: messageId,
      reaction_type: reactionType,
    });
  }, [isConnected, isJoined, sendMessage]);

  // Copy message
  const handleCopyMessage = useCallback((content: string) => {
    Clipboard.setString(content);
    Alert.alert('Copied', 'Message copied to clipboard');
  }, []);

  // Report message
  const handleReportMessage = useCallback((messageId: string) => {
    Alert.alert(
      'Report Message',
      'Are you sure you want to report this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            sendMessage({
              type: 'report_message',
              message_id: messageId,
            });
          },
        },
      ]
    );
  }, [sendMessage]);

  // Get room icon
  const getRoomIcon = () => {
    switch (room.room_type) {
      case 'nft_gated':
        return <Lock size={20} color="#FFD700" />;
      case 'private':
        return <Crown size={20} color="#8B7CF6" />;
      default:
        return <Hash size={20} color="#6B7280" />;
    }
  };

  // Render connection status
  const renderConnectionStatus = () => {
    if (isConnecting) {
      return (
        <View style={styles.connectionStatus}>
          <ActivityIndicator size="small" color="#8B7CF6" />
          <Text style={styles.connectionText}>Connecting...</Text>
        </View>
      );
    }

    if (!isConnected) {
      return (
        <View style={[styles.connectionStatus, styles.disconnected]}>
          <WifiOff size={16} color="#EF4444" />
          <Text style={[styles.connectionText, styles.disconnectedText]}>
            Disconnected
          </Text>
          <TouchableOpacity
            style={styles.reconnectButton}
            onPress={connect}
          >
            <Text style={styles.reconnectText}>Reconnect</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.connectionStatus}>
        <Wifi size={16} color="#10B981" />
        <Text style={[styles.connectionText, styles.connectedText]}>
          Connected
        </Text>
      </View>
    );
  };

  // Render typing indicator
  const renderTypingIndicator = () => {
    if (typing.length === 0) return null;

    const typingText = typing.length === 1
      ? `${typing[0].slice(0, 8)}... is typing`
      : `${typing.length} users are typing`;

    return (
      <View style={styles.typingIndicator}>
        <Text style={styles.typingText}>{typingText}</Text>
        <View style={styles.typingDots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    );
  };

  // Render message item
  const renderMessage = ({ item }: { item: MessageData }) => (
    <MessageBubble
      message={item}
      onReact={handleReaction}
      onCopy={handleCopyMessage}
      onReport={handleReportMessage}
      showAvatar={!item.isOwn}
      showTimestamp={true}
    />
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B7CF6" />
          <Text style={styles.loadingText}>Joining room...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.roomInfo}>
          {getRoomIcon()}
          <View style={styles.roomDetails}>
            <Text style={styles.roomName}>{room.name}</Text>
            <View style={styles.roomMeta}>
              <Users size={14} color="#9CA3AF" />
              <Text style={styles.memberCount}>
                {onlineUsers.length} online
              </Text>
            </View>
          </View>
        </View>
        {renderConnectionStatus()}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
      />

      {/* Typing indicator */}
      {renderTypingIndicator()}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              handleTyping();
            }}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            editable={isConnected && isJoined}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || !isConnected || !isJoined) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || !isConnected || !isJoined}
          >
            <Send size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#F3F4F6',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  roomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roomDetails: {
    marginLeft: 12,
    flex: 1,
  },
  roomName: {
    color: '#F3F4F6',
    fontSize: 18,
    fontWeight: '600',
  },
  roomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  memberCount: {
    color: '#9CA3AF',
    fontSize: 14,
    marginLeft: 6,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionText: {
    fontSize: 12,
    marginLeft: 6,
  },
  connectedText: {
    color: '#10B981',
  },
  disconnected: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  disconnectedText: {
    color: '#EF4444',
  },
  reconnectButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#8B7CF6',
    borderRadius: 8,
  },
  reconnectText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
    paddingVertical: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 1,
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    backgroundColor: '#111827',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    color: '#F3F4F6',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#8B7CF6',
    borderRadius: 20,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#4B5563',
    opacity: 0.6,
  },
});
