import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Plus, Crown, Lock, Clock as Unlock, Clock } from 'lucide-react-native';
import { StudyRoomCard } from '@/components/StudyRoomCard';
import { RoomHeader } from '@/components/RoomHeader';
import { RoomChatInterface } from '@/components/RoomChatInterface';

const sampleRooms = [
  {
    id: '1',
    title: 'Machine Learning Study Group',
    topic: 'Deep Learning & Neural Networks',
    members: 12,
    lastActivity: '2 min ago',
    tokensEarned: 150,
    isPrivate: false,
    isJoined: true,
  },
  {
    id: '2',
    title: 'Blockchain Fundamentals',
    topic: 'Consensus Mechanisms & DeFi',
    members: 8,
    lastActivity: '15 min ago',
    tokensEarned: 89,
    isPrivate: true,
    isJoined: false,
  },
  {
    id: '3',
    title: 'AI Ethics Discussion',
    topic: 'Responsible AI Development',
    members: 25,
    lastActivity: '1 hour ago',
    tokensEarned: 245,
    isPrivate: false,
    isJoined: true,
  },
];

export default function CollabScreen() {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'joined' | 'public'>('all');

  const filteredRooms = sampleRooms.filter(room => {
    if (filter === 'joined') return room.isJoined;
    if (filter === 'public') return !room.isPrivate;
    return true;
  });

  if (selectedRoom) {
    const room = sampleRooms.find(r => r.id === selectedRoom);
    if (room) {
      return (
        <SafeAreaView style={styles.container}>
          <RoomHeader 
            room={room}
            onBack={() => setSelectedRoom(null)}
          />
          <RoomChatInterface roomId={selectedRoom} />
        </SafeAreaView>
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Collab Space</Text>
          <Text style={styles.subtitle}>Study together, earn together</Text>
        </View>
        <TouchableOpacity style={styles.createButton}>
          <Plus size={20} color="#000000" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'joined', 'public'] as const).map((filterOption) => (
          <TouchableOpacity
            key={filterOption}
            style={[
              styles.filterButton,
              filter === filterOption && styles.filterButtonActive
            ]}
            onPress={() => setFilter(filterOption)}
          >
            <Text style={[
              styles.filterText,
              filter === filterOption && styles.filterTextActive
            ]}>
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.roomsGrid}>
          {filteredRooms.map((room) => (
            <StudyRoomCard
              key={room.id}
              room={room}
              onJoin={() => setSelectedRoom(room.id)}
            />
          ))}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How Collaboration Works</Text>
          <View style={styles.infoItem}>
            <Crown size={16} color="#FFFFFF" strokeWidth={1.5} />
            <Text style={styles.infoText}>Answer questions to earn tokens</Text>
          </View>
          <View style={styles.infoItem}>
            <Users size={16} color="#FFFFFF" strokeWidth={1.5} />
            <Text style={styles.infoText}>Vote on the best answers</Text>
          </View>
          <View style={styles.infoItem}>
            <Clock size={16} color="#FFFFFF" strokeWidth={1.5} />
            <Text style={styles.infoText}>Weekly highlights get minted as NFTs</Text>
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
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
  },
  filterButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
  filterTextActive: {
    color: '#000000',
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  roomsGrid: {
    gap: 16,
    paddingBottom: 24,
  },
  infoSection: {
    padding: 20,
    backgroundColor: '#111111',
    borderRadius: 12,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 12,
    fontWeight: '600',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#CCCCCC',
  },
});