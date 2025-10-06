import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User, Sparkles } from 'lucide-react-native';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  canMint: boolean;
}

interface ChatMessageProps {
  message: Message;
  onLongPress: () => void;
  isSelected: boolean;
}

export function ChatMessage({ message, onLongPress, isSelected }: ChatMessageProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <TouchableOpacity
      style={[
        styles.messageContainer,
        message.isUser ? styles.userMessage : styles.aiMessage,
        isSelected && styles.selectedMessage,
      ]}
      onLongPress={message.canMint ? onLongPress : undefined}
      disabled={!message.canMint}
    >
      <View style={styles.messageHeader}>
        <View style={styles.messageAvatar}>
          {message.isUser ? (
            <User size={16} color={message.isUser ? "#000000" : "#FFFFFF"} strokeWidth={1.5} />
          ) : (
            <Sparkles size={16} color="#FFFFFF" strokeWidth={1.5} />
          )}
        </View>
        <Text style={[
          styles.messageTime,
          { color: message.isUser ? "#666666" : "#888888" }
        ]}>
          {formatTime(message.timestamp)}
        </Text>
        {message.canMint && (
          <View style={styles.mintableIndicator}>
            <Sparkles size={12} color="#888888" strokeWidth={1.5} />
          </View>
        )}
      </View>
      
      <Text style={[
        styles.messageContent,
        { color: message.isUser ? "#000000" : "#FFFFFF" }
      ]}>
        {message.content}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    maxWidth: '85%',
  },
  userMessage: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    backgroundColor: '#222222',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#333333',
  },
  selectedMessage: {
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  messageAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  mintableIndicator: {
    marginLeft: 'auto',
  },
  messageContent: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
});