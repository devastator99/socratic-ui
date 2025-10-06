import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft, Users, Settings, Crown } from 'lucide-react-native';

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

interface RoomHeaderProps {
  room: StudyRoom;
  onBack: () => void;
}

export function RoomHeader({ room, onBack }: RoomHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={1.5} />
        </TouchableOpacity>
        
        <View style={styles.roomInfo}>
          <Text style={styles.roomTitle} numberOfLines={1}>{room.title}</Text>
          <Text style={styles.roomTopic} numberOfLines={1}>{room.topic}</Text>
        </View>
        
        <TouchableOpacity style={styles.settingsButton}>
          <Settings size={20} color="#888888" strokeWidth={1.5} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.bottomRow}>
        <View style={styles.statItem}>
          <Users size={14} color="#888888" strokeWidth={1.5} />
          <Text style={styles.statText}>{room.members} active</Text>
        </View>
        <View style={styles.statItem}>
          <Crown size={14} color="#888888" strokeWidth={1.5} />
          <Text style={styles.statText}>{room.tokensEarned} tokens earned</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roomInfo: {
    flex: 1,
  },
  roomTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontWeight: '600',
  },
  roomTopic: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#888888',
    marginTop: 2,
  },
  settingsButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 16,
    paddingLeft: 44,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
});