import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Copy, ExternalLink, ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react-native';

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'mint' | 'burn';
  amount: number;
  description: string;
  timestamp: Date;
  hash: string;
}

interface TokenWalletViewProps {
  onBack: () => void;
}

const sampleTransactions: Transaction[] = [
  {
    id: '1',
    type: 'burn',
    amount: 0.1,
    description: 'AI Question - Neural Networks',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    hash: '4k2j3h5g6f7d8s9a',
  },
  {
    id: '2',
    type: 'receive',
    amount: 2.5,
    description: 'Study Room Contribution Reward',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    hash: '8s9a4k2j3h5g6f7d',
  },
  {
    id: '3',
    type: 'mint',
    amount: 0.05,
    description: 'NFT Mint - Machine Learning Insight',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    hash: '3h5g6f7d8s9a4k2j',
  },
];

export function TokenWalletView({ onBack }: TokenWalletViewProps) {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 60) {
      return `${minutes}m ago`;
    } else {
      return `${hours}h ago`;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'send':
      case 'burn':
        return <ArrowUpRight size={16} color="#FF6B6B" strokeWidth={1.5} />;
      case 'receive':
        return <ArrowDownLeft size={16} color="#4ECDC4" strokeWidth={1.5} />;
      case 'mint':
        return <Wallet size={16} color="#888888" strokeWidth={1.5} />;
      default:
        return null;
    }
  };

  const copyToClipboard = (hash: string) => {
    // In a real app, implement clipboard functionality
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={styles.title}>Wallet</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>12.5 SOL</Text>
        <Text style={styles.balanceUSD}>≈ $1,875 USD</Text>
        
        <View style={styles.walletAddress}>
          <Text style={styles.addressLabel}>Wallet Address</Text>
          <TouchableOpacity 
            style={styles.addressContainer}
            onPress={() => copyToClipboard('4k2j...8s9a')}
          >
            <Text style={styles.addressText}>4k2j3h5g6f7d8s9a...4k2j3h5g</Text>
            <Copy size={16} color="#888888" strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.transactionsContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        
        {sampleTransactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <View style={styles.transactionIcon}>
                {getTransactionIcon(transaction.type)}
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDescription}>
                  {transaction.description}
                </Text>
                <Text style={styles.transactionTime}>
                  {formatTime(transaction.timestamp)}
                </Text>
              </View>
              <View style={styles.transactionAmount}>
                <Text style={[
                  styles.amountText,
                  { color: transaction.type === 'receive' ? '#4ECDC4' : '#FF6B6B' }
                ]}>
                  {transaction.type === 'receive' ? '+' : '-'}{transaction.amount} SOL
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.hashContainer}
              onPress={() => copyToClipboard(transaction.hash)}
            >
              <Text style={styles.hashText}>
                {copiedHash === transaction.hash ? 'Copied!' : transaction.hash}
              </Text>
              <ExternalLink size={12} color="#666666" strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  balanceCard: {
    backgroundColor: '#111111',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222222',
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#888888',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  balanceUSD: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#888888',
    marginBottom: 24,
  },
  walletAddress: {
    width: '100%',
    alignItems: 'center',
  },
  addressLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222222',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  addressText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#CCCCCC',
  },
  transactionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 16,
    fontWeight: '600',
  },
  transactionCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222222',
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  transactionTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  hashContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#222222',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hashText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
});