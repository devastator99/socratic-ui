/**
 * TerminalMessageBubble
 * Brutalist terminal-inspired message bubble for chat
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Award, Clock } from 'lucide-react-native';
import { terminalTheme } from '../../../theme';
import { TerminalText } from '../Typography';

export interface TerminalMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  isOwn?: boolean;
  nfts?: string[];
}

interface MessageBubbleProps {
  message: TerminalMessage;
  onLongPress?: (id: string) => void;
}

export const MessageBubbleTerminal: React.FC<MessageBubbleProps> = ({
  message,
  onLongPress,
}) => {
  const isOwn = message.isOwn;
  const containerStyle = [
    styles.messageContainer,
    isOwn ? styles.ownContainer : styles.otherContainer,
  ];

  const bubbleStyle = [
    styles.bubble,
    isOwn ? styles.ownBubble : styles.otherBubble,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onLongPress={() => onLongPress?.(message.id)}
      activeOpacity={0.8}
    >
      <View style={bubbleStyle}>
        <TerminalText
          style={isOwn ? styles.ownText : styles.otherText}
        >
          {message.content}
        </TerminalText>

        <View style={styles.metaRow}>
          <TerminalText size="xs" color="secondary">
            {isOwn ? 'YOU' : message.sender}
          </TerminalText>
          <Clock size={10} color={terminalTheme.colors.text.secondary} style={styles.metaIcon} />
          <TerminalText size="xs" color="secondary">
            {new Date(message.timestamp).toLocaleTimeString()}
          </TerminalText>
          {message.nfts?.length ? (
            <>
              <Award size={10} color={terminalTheme.colors.text.warning} style={styles.metaIcon} />
              <TerminalText size="xs" color="warning">
                {message.nfts.length}
              </TerminalText>
            </>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: terminalTheme.spacing.xs,
    paddingHorizontal: terminalTheme.spacing.md,
  },
  ownContainer: {
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderWidth: terminalTheme.borderWidth.thick,
    padding: terminalTheme.spacing.sm,
  },
  ownBubble: {
    borderColor: terminalTheme.colors.border.accent,
  },
  otherBubble: {
    borderColor: terminalTheme.colors.border.primary,
  },
  ownText: {
    color: terminalTheme.colors.text.accent,
  },
  otherText: {
    color: terminalTheme.colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: terminalTheme.spacing.xs,
  },
  metaIcon: {
    marginHorizontal: 4,
  },
});
