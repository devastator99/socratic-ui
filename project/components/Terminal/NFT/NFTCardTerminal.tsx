/**
 * NFTCardTerminal
 * Brutalist terminal-inspired card for NFTs / achievements
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Award } from 'lucide-react-native';
import { terminalTheme } from '../../../theme';
import { TerminalText } from '../Typography';

export interface TerminalNFT {
  id: string;
  title: string;
  description: string;
  mintDate: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface NFTCardProps {
  nft: TerminalNFT;
  viewMode?: 'grid' | 'list';
  onPress?: () => void;
}

export const NFTCardTerminal: React.FC<NFTCardProps> = ({ nft, viewMode = 'grid', onPress }) => {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return terminalTheme.colors.text.secondary;
      case 'rare':
        return terminalTheme.colors.text.accent;
      case 'epic':
        return terminalTheme.colors.text.success;
      case 'legendary':
        return terminalTheme.colors.text.warning;
      default:
        return terminalTheme.colors.text.primary;
    }
  };

  const containerStyle = [
    styles.card,
    viewMode === 'grid' ? styles.gridCard : styles.listCard,
  ];

  return (
    <TouchableOpacity style={containerStyle} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.row}>
        <Award size={16} color={getRarityColor(nft.rarity)} style={styles.icon} />
        <View style={{ flex: 1 }}>
          <TerminalText>{nft.title}</TerminalText>
          <TerminalText size="xs" color="secondary">
            {nft.category} • {nft.mintDate}
          </TerminalText>
        </View>
        <TerminalText size="xs" color="secondary">
          {nft.rarity.toUpperCase()}
        </TerminalText>
      </View>
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
});
