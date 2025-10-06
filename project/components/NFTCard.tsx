import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Award, Calendar, Tag } from 'lucide-react-native';

interface NFT {
  id: string;
  title: string;
  description: string;
  mintDate: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  tokenId: string;
}

interface NFTCardProps {
  nft: NFT;
  viewMode: 'grid' | 'list';
  onPress: () => void;
}

export function NFTCard({ nft, viewMode, onPress }: NFTCardProps) {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#666666';
      case 'rare': return '#AAAAAA';
      case 'epic': return '#DDDDDD';
      case 'legendary': return '#FFFFFF';
      default: return '#666666';
    }
  };

  const getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#333333';
      case 'rare': return '#555555';
      case 'epic': return '#777777';
      case 'legendary': return '#FFFFFF';
      default: return '#333333';
    }
  };

  if (viewMode === 'list') {
    return (
      <TouchableOpacity style={styles.listCard} onPress={onPress}>
        <View style={[styles.listIcon, { borderColor: getRarityBorder(nft.rarity) }]}>
          <Award size={24} color={getRarityColor(nft.rarity)} strokeWidth={1.5} />
        </View>
        
        <View style={styles.listContent}>
          <Text style={styles.listTitle} numberOfLines={1}>{nft.title}</Text>
          <Text style={styles.listDescription} numberOfLines={2}>{nft.description}</Text>
          
          <View style={styles.listMeta}>
            <View style={styles.metaItem}>
              <Tag size={12} color="#888888" strokeWidth={1.5} />
              <Text style={styles.metaText}>{nft.category}</Text>
            </View>
            <View style={styles.metaItem}>
              <Calendar size={12} color="#888888" strokeWidth={1.5} />
              <Text style={styles.metaText}>{nft.mintDate}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.listRarity}>
          <Text style={[styles.rarityText, { color: getRarityColor(nft.rarity) }]}>
            {nft.rarity.toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[
        styles.gridCard,
        { borderColor: getRarityBorder(nft.rarity) }
      ]} 
      onPress={onPress}
    >
      <View style={styles.gridHeader}>
        <View style={[styles.gridIcon, { borderColor: getRarityBorder(nft.rarity) }]}>
          <Award size={24} color={getRarityColor(nft.rarity)} strokeWidth={1.5} />
        </View>
        <Text style={[styles.gridRarity, { color: getRarityColor(nft.rarity) }]}>
          {nft.rarity.charAt(0).toUpperCase() + nft.rarity.slice(1)}
        </Text>
      </View>
      
      <Text style={styles.gridTitle} numberOfLines={2}>{nft.title}</Text>
      <Text style={styles.gridDescription} numberOfLines={3}>{nft.description}</Text>
      
      <View style={styles.gridFooter}>
        <Text style={styles.gridCategory}>{nft.category}</Text>
        <Text style={styles.gridDate}>{nft.mintDate}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Grid styles
  gridCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  gridRarity: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 8,
  },
  gridDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#CCCCCC',
    lineHeight: 18,
    marginBottom: 12,
  },
  gridFooter: {
    gap: 4,
  },
  gridCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
  gridDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },

  // List styles
  listCard: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222222',
    alignItems: 'center',
  },
  listIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 16,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  listDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#CCCCCC',
    lineHeight: 18,
    marginBottom: 8,
  },
  listMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
  listRarity: {
    alignItems: 'flex-end',
  },
  rarityText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});