import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Coins, Zap } from 'lucide-react-native';

interface TokenTrackerBarProps {
  balance: number;
  questionsLeft: number;
}

export function TokenTrackerBar({ balance, questionsLeft }: TokenTrackerBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.item}>
        <Coins size={16} color="#FFFFFF" strokeWidth={1.5} />
        <Text style={styles.label}>Balance</Text>
        <Text style={styles.value}>{balance} SOL</Text>
      </View>
      
      <View style={styles.separator} />
      
      <View style={styles.item}>
        <Zap size={16} color="#888888" strokeWidth={1.5} />
        <Text style={styles.label}>Questions Left</Text>
        <Text style={styles.value}>{questionsLeft}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  separator: {
    width: 1,
    height: 20,
    backgroundColor: '#333333',
    marginHorizontal: 16,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
  value: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 'auto',
  },
});