import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Users, Lock, Clock as Unlock, Clock, Coins, ChevronRight } from 'lucide-react-native';

interface StudyRoom {
  id: string;
  title: string;
  topic: string;
  members: number;
  lastActivity: string;
  tokensEarned: number;
  isPrivate: boolean;
  isJoined: boolean;
}

interface StudyRoomCardProps {
  room: StudyRoom;
  onJoin: () => void;
}

export function StudyRoomCard({ room, onJoin }: StudyRoomCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onJoin}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={styles.privacyIcon}>
            {room.isPrivate ? (
              <Lock size={16} color="#888888" strokeWidth={1.5} />
            ) : (
              <Unlock size={16} color="#FFFFFF" strokeWidth={1.5} />
            )}
          </View>
          <View style={styles.titleContent}>
            <Text style={styles.title} numberOfLines={1}>{room.title}</Text>
            <Text style={styles.topic} numberOfLines={1}>{room.topic}</Text>
          </View>
        </View>
        <ChevronRight size={20} color="#666666" strokeWidth={1.5} />
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Users size={14} color="#888888" strokeWidth={1.5} />
          <Text style={styles.statText}>{room.members} members</Text>
        </View>
        <View style={styles.statItem}>
          <Clock size={14} color="#888888" strokeWidth={1.5} />
          <Text style={styles.statText}>{room.lastActivity}</Text>
        </View>
        <View style={styles.statItem}>
          <Coins size={14} color="#888888" strokeWidth={1.5} />
          <Text style={styles.statText}>{room.tokensEarned} tokens</Text>
        </View>
      </View>

      {room.isJoined && (
        <View style={styles.joinedBadge}>
          <Text style={styles.joinedText}>Joined</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222222',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privacyIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontWeight: '600',
  },
  topic: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#888888',
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
  joinedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#333333',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  joinedText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
});