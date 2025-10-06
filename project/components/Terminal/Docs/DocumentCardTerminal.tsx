/**
 * DocumentCardTerminal
 * Terminal/brutalist card for displaying a document row / grid item.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { FileText, Clock, CheckCircle, Info, MessageCircle } from 'lucide-react-native';
import { terminalTheme } from '../../../theme';
import { TerminalText } from '../Typography';

export interface TerminalDocument {
  id: string;
  title: string;
  uploadDate: string;
  pages: number;
  status: 'synced' | 'processing' | 'error';
}

interface DocumentCardProps {
  doc: TerminalDocument;
  layout?: 'list' | 'grid';
  onOpenChat?: () => void;
  onDetails?: () => void;
  onDelete?: () => void;
  onPress?: () => void;
}

export const DocumentCardTerminal: React.FC<DocumentCardProps> = ({
  doc,
  layout = 'list',
  onOpenChat,
  onDetails,
  onDelete,
  onPress,
}) => {
  const getStatusIcon = () => {
    switch (doc.status) {
      case 'synced':
        return <CheckCircle size={12} color={terminalTheme.colors.text.success} />;
      case 'processing':
        return <Clock size={12} color={terminalTheme.colors.text.secondary} />;
      case 'error':
        return <Info size={12} color={terminalTheme.colors.text.warning} />;
    }
  };

  const containerStyle = [
    styles.card,
    layout === 'grid' ? styles.gridCard : styles.listCard,
  ];

  return (
    <TouchableOpacity style={containerStyle} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.row}>
        <FileText size={16} color={terminalTheme.colors.text.accent} style={styles.icon} />
        <View style={{ flex: 1 }}>
          <TerminalText>{doc.title}</TerminalText>
          <TerminalText size="xs" color="secondary">
            {doc.pages} pages • {doc.uploadDate}
          </TerminalText>
        </View>
        {getStatusIcon()}
      </View>

      {doc.status === 'synced' && (
        <View style={[styles.row, { marginTop: terminalTheme.spacing.xs }]}>
          <TouchableOpacity onPress={onOpenChat} style={styles.actionBtn}>
            <MessageCircle size={10} color={terminalTheme.colors.text.primary} />
            <TerminalText size="xs" style={styles.actionText}>
              CHAT
            </TerminalText>
          </TouchableOpacity>
          {onDetails && (
            <TouchableOpacity onPress={onDetails} style={styles.actionBtn}>
              <TerminalText size="xs" style={styles.actionText}>
                DETAILS
              </TerminalText>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
              <TerminalText size="xs" color="warning" style={styles.actionText}>
                DELETE
              </TerminalText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: terminalTheme.borderWidth.thick,
    borderColor: terminalTheme.colors.border.primary,
    padding: terminalTheme.spacing.sm,
    marginBottom: terminalTheme.spacing.sm,
  },
  gridCard: {
    width: '48%',
  },
  listCard: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: terminalTheme.spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: terminalTheme.spacing.sm,
  },
  actionText: {
    marginLeft: 4,
  },
});
