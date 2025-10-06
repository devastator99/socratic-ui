import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Medal, Star, Filter, Grid3x3 as Grid3X3, List } from 'lucide-react-native';
import { NFTCard } from '@/components/NFTCard';
import { SoulboundProgressBar } from '@/components/SoulboundProgressBar';

const sampleNFTs = [
  {
    id: '1',
    title: 'Neural Network Insight',
    description: 'Deep understanding of backpropagation algorithms',
    mintDate: '2024-01-15',
    category: 'AI',
    rarity: 'rare',
    tokenId: 'MCH001',
  },
  {
    id: '2',
    title: 'Blockchain Expert',
    description: 'Comprehensive knowledge of consensus mechanisms',
    mintDate: '2024-01-14',
    category: 'Blockchain',
    rarity: 'epic',
    tokenId: 'MCH002',
  },
  {
    id: '3',
    title: 'Top Contributor',
    description: 'Weekly study room champion',
    mintDate: '2024-01-13',
    category: 'Community',
    rarity: 'legendary',
    tokenId: 'MCH003',
  },
  {
    id: '4',
    title: 'First Upload',
    description: 'Successfully uploaded and processed first document',
    mintDate: '2024-01-10',
    category: 'Milestone',
    rarity: 'common',
    tokenId: 'MCH004',
  },
];

const categories = ['All', 'AI', 'Blockchain', 'Community', 'Milestone'];

export default function AchievementsScreen() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredNFTs = sampleNFTs.filter(nft => 
    selectedCategory === 'All' || nft.category === selectedCategory
  );

  const progressData = {
    totalTokensSpent: 2450,
    documentsUploaded: 12,
    communityContributions: 34,
    nftsMinted: 18,
    level: 7,
    xp: 2450,
    xpToNext: 550,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Achievements</Text>
          <Text style={styles.subtitle}>Your learning journey as NFTs</Text>
        </View>
        <TouchableOpacity
          style={styles.viewToggle}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          {viewMode === 'grid' ? (
            <List size={20} color="#FFFFFF" strokeWidth={1.5} />
          ) : (
            <Grid3X3 size={20} color="#FFFFFF" strokeWidth={1.5} />
          )}
        </TouchableOpacity>
      </View>

      <SoulboundProgressBar progress={progressData} />

      <View style={styles.categoryFilter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.nftGrid}>
          {filteredNFTs.map((nft) => (
            <NFTCard
              key={nft.id}
              nft={nft}
              viewMode={viewMode}
              onPress={() => console.log('View NFT:', nft.title)}
            />
          ))}
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Learning Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Medal size={24} color="#FFFFFF" strokeWidth={1.5} />
              <Text style={styles.statValue}>18</Text>
              <Text style={styles.statLabel}>NFTs Minted</Text>
            </View>
            <View style={styles.statCard}>
              <Star size={24} color="#FFFFFF" strokeWidth={1.5} />
              <Text style={styles.statValue}>34</Text>
              <Text style={styles.statLabel}>Contributions</Text>
            </View>
            <View style={styles.statCard}>
              <Trophy size={24} color="#FFFFFF" strokeWidth={1.5} />
              <Text style={styles.statValue}>Level 7</Text>
              <Text style={styles.statLabel}>Current Level</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#888888',
    marginTop: 2,
  },
  viewToggle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryFilter: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
  },
  categoryButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
  categoryTextActive: {
    color: '#000000',
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  nftGrid: {
    gap: 16,
    paddingBottom: 24,
  },
  statsSection: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222222',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 8,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
    marginTop: 4,
    textAlign: 'center',
  },
});