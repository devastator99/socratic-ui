/**
 * ChatRoomTerminal
 * Terminal-inspired brutalist chat room interface
 */

import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { terminalTheme } from '../../../theme';
import {
  TerminalScreen,
  TerminalWindow,
  PromptInput,
  PrimaryButton,
  ASCIILoader,
  BlinkingCursor,
} from '../index';
import { MessageBubbleTerminal, TerminalMessage } from './MessageBubbleTerminal';

interface ChatRoomTerminalProps {
  roomId: string;
  authToken: string;
  wallet: string;
  onLeave?: () => void;
  wsUrl?: string;
}

export const ChatRoomTerminal: React.FC<ChatRoomTerminalProps> = ({
  roomId,
  authToken,
  wallet,
  onLeave,
  wsUrl = 'ws://localhost:8000/ws/chat',
}) => {
  const [messages, setMessages] = useState<TerminalMessage[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const {
    isConnected,
    connect,
    sendMessage,
    onMessage,
    disconnect,
    isConnecting,
  } = useWebSocket({
    url: wsUrl,
    token: authToken,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });

  // Connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  // Join room after connect
  useEffect(() => {
    if (isConnected) {
      sendMessage({ type: 'join_room', room_id: roomId });
    }
  }, [isConnected]);

  // Handle incoming messages
  useEffect(() => {
    const unsubJoin = onMessage('room_joined', (data) => {
      if (data.recent_messages) {
        const recent: TerminalMessage[] = data.recent_messages.map((m: any) => ({
          id: m.id,
          content: m.content,
          sender: m.sender_wallet,
          timestamp: m.timestamp,
          isOwn: m.sender_wallet === wallet,
          nfts: m.sender_nfts,
        }));
        setMessages(recent);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      }
    });

    const unsubMsg = onMessage('room_message', (m) => {
      const newMsg: TerminalMessage = {
        id: m.id,
        content: m.content,
        sender: m.sender_wallet,
        timestamp: m.timestamp,
        isOwn: m.sender_wallet === wallet,
        nfts: m.sender_nfts,
      };
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    return () => {
      unsubJoin();
      unsubMsg();
    };
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage({ type: 'room_message', room_id: roomId, content: text });
    setInput('');
  };

  return (
    <TerminalScreen title={`ROOM ${roomId}`} showHeader={false}>
      {!isConnected && isConnecting && (
        <View style={styles.connectionBanner}>
          <ASCIILoader />
          <BlinkingCursor />
        </View>
      )}

      {/* Chat window */}
      <TerminalWindow title={`# ${roomId}`} style={styles.chatWindow}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubbleTerminal message={item} />
          )}
          contentContainerStyle={styles.listContent}
        />
      </TerminalWindow>

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputRow}>
          <PromptInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            style={{ flex: 1 }}
            onSubmitEditing={handleSend}
          />
          <PrimaryButton onPress={handleSend} disabled={!input.trim()} style={styles.sendBtn}>
            SEND
          </PrimaryButton>
        </View>
      </KeyboardAvoidingView>
    </TerminalScreen>
  );
};

const styles = StyleSheet.create({
  chatWindow: {
    flex: 1,
  },
  listContent: {
    paddingVertical: terminalTheme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: terminalTheme.spacing.md,
    borderTopWidth: terminalTheme.borderWidth.thick,
    borderTopColor: terminalTheme.colors.border.secondary,
  },
  sendBtn: {
    marginLeft: terminalTheme.spacing.sm,
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: terminalTheme.spacing.sm,
  },
});
