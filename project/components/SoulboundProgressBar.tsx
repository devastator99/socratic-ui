import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Zap, BookOpen, Users, Award } from 'lucide-react-native';

interface ProgressData {
  totalTokensSpent: number;
  documentsUploaded: number;
  communityContributions: number;
  nftsMinted: number;
  level: number;
  xp: number;
  xpToNext: number;
}

interface SoulboundProgressBarProps {
  progress: ProgressData;
}

export function SoulboundProgressBar({ progress }: SoulboundProgressBarProps) {
  const progressPercentage = (progress.xp / (progress.xp + progress.xpToNext)) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.levelSection}>
        <View style={styles.levelInfo}>
          <Text style={styles.levelText}>Level {progress.level}</Text>
          <Text style={styles.xpText}>
            {progress.xp} / {progress.xp + progress.xpToNext} XP
          </Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progressPercentage}%` }
              ]} 
            />
          </View>
        </View>
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Zap size={16} color="#888888" strokeWidth={1.5} />
          <Text style={styles.statValue}>{progress.totalTokensSpent}</Text>
          <Text style={styles.statLabel}>Tokens</Text>
        </View>
        
        <View style={styles.statItem}>
          <BookOpen size={16} color="#888888" strokeWidth={1.5} />
          <Text style={styles.statValue}>{progress.documentsUploaded}</Text>
          <Text style={styles.statLabel}>Docs</Text>
        </View>
        
        <View style={styles.statItem}>
          <Users size={16} color="#888888" strokeWidth={1.5} />
          <Text style={styles.statValue}>{progress.communityContributions}</Text>
          <Text style={styles.statLabel}>Contributions</Text>
        </View>
        
        <View style={styles.statItem}>
          <Award size={16} color="#888888" strokeWidth={1.5} />
          <Text style={styles.statValue}>{progress.nftsMinted}</Text>
          <Text style={styles.statLabel}>NFTs</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222222',
  },
  levelSection: {
    marginBottom: 20,
  },
  levelInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    fontWeight: '700',
  },
  xpText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
  progressBarContainer: {
    width: '100%',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#222222',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
    marginTop: 4,
  },
});