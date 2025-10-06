import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, Bell, User, ChartBar as BarChart3, ChevronRight, Copy, ExternalLink } from 'lucide-react-native';
import { TokenWalletView } from '@/components/TokenWalletView';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showWallet, setShowWallet] = useState(false);

  const settingsItems = [
    {
      icon: User,
      title: 'Profile Settings',
      subtitle: 'Update your profile information',
      onPress: () => console.log('Profile settings'),
    },
    {
      icon: Bell,
      title: 'Notifications',
      subtitle: 'Manage your notification preferences',
      onPress: () => console.log('Notification settings'),
      hasSwitch: true,
      switchValue: notificationsEnabled,
      onSwitchChange: setNotificationsEnabled,
    },
    {
      icon: BarChart3,
      title: 'Usage Analytics',
      subtitle: 'View your app usage statistics',
      onPress: () => console.log('Analytics'),
    },
  ];

  if (showWallet) {
    return (
      <SafeAreaView style={styles.container}>
        <TokenWalletView onBack={() => setShowWallet(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity 
          style={styles.walletCard}
          onPress={() => setShowWallet(true)}
        >
          <View style={styles.walletInfo}>
            <View style={styles.walletIcon}>
              <Wallet size={24} color="#000000" strokeWidth={1.5} />
            </View>
            <View style={styles.walletDetails}>
              <Text style={styles.walletTitle}>Solana Wallet</Text>
              <Text style={styles.walletBalance}>12.5 SOL • Connected</Text>
            </View>
          </View>
          <ChevronRight size={20} color="#888888" strokeWidth={1.5} />
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.settingsItem}
              onPress={item.onPress}
            >
              <View style={styles.settingsItemLeft}>
                <View style={styles.settingsIcon}>
                  <item.icon size={20} color="#FFFFFF" strokeWidth={1.5} />
                </View>
                <View style={styles.settingsDetails}>
                  <Text style={styles.settingsTitle}>{item.title}</Text>
                  <Text style={styles.settingsSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <View style={styles.settingsItemRight}>
                {item.hasSwitch ? (
                  <Switch
                    value={item.switchValue}
                    onValueChange={item.onSwitchChange}
                    trackColor={{ false: '#333333', true: '#666666' }}
                    thumbColor={item.switchValue ? '#FFFFFF' : '#888888'}
                  />
                ) : (
                  <ChevronRight size={20} color="#888888" strokeWidth={1.5} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>MindChain v1.0.0</Text>
            <Text style={styles.infoDescription}>
              AI-powered learning platform with blockchain integration. 
              Collaborate, learn, and mint your knowledge as NFTs.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.linkItem}>
            <Text style={styles.linkText}>Help Center</Text>
            <ExternalLink size={16} color="#888888" strokeWidth={1.5} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem}>
            <Text style={styles.linkText}>Privacy Policy</Text>
            <ExternalLink size={16} color="#888888" strokeWidth={1.5} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem}>
            <Text style={styles.linkText}>Terms of Service</Text>
            <ExternalLink size={16} color="#888888" strokeWidth={1.5} />
          </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  walletCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  walletDetails: {
    flex: 1,
  },
  walletTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    fontWeight: '600',
  },
  walletBalance: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 2,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 16,
    fontWeight: '600',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsDetails: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  settingsSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#888888',
    marginTop: 2,
  },
  settingsItemRight: {
    marginLeft: 12,
  },
  infoCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222222',
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#CCCCCC',
    marginTop: 8,
    lineHeight: 20,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  linkText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
});