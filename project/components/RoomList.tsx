/**
 * RoomList Component for Chat Room Selection
 * Displays available rooms with filtering and NFT-gated access info
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Hash,
  Lock,
  Crown,
  Users,
  Search,
  Plus,
  Award,
  Clock,
  ChevronRight,
} from 'lucide-react-native';

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  room_type: 'public' | 'nft_gated' | 'private';
  required_nfts?: string[];
  required_sol_balance?: number;
  member_count?: number;
  online_count?: number;
  last_activity?: string;
  is_member?: boolean;
  can_join?: boolean;
  created_by?: string;
}

interface RoomListProps {
  userWallet: string;
  userNFTs: string[];
  onRoomSelect: (room: ChatRoom) => void;
  onCreateRoom?: () => void;
  authToken: string;
  apiBaseUrl?: string;
}

export const RoomList: React.FC<RoomListProps> = ({
  userWallet,
  userNFTs,
  onRoomSelect,
  onCreateRoom,
  authToken,
  apiBaseUrl = 'http://localhost:8000',
}) => {
  // State management
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<ChatRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'public' | 'nft_gated' | 'private'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch rooms from API
  const fetchRooms = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setIsLoading(true);
      setError(null);

      const response = await fetch(`${apiBaseUrl}/chat/rooms`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }

      const data = await response.json();
      const roomsWithAccess = data.rooms.map((room: ChatRoom) => ({
        ...room,
        can_join: checkRoomAccess(room),
      }));

      setRooms(roomsWithAccess);
      setFilteredRooms(roomsWithAccess);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load rooms';
      setError(errorMessage);
      console.error('Error fetching rooms:', err);
    } finally {
      setIsLoading(false);
      if (isRefresh) setIsRefreshing(false);
    }
  }, [authToken, apiBaseUrl, userNFTs]);

  // Check if user can access a room
  const checkRoomAccess = useCallback((room: ChatRoom): boolean => {
    if (room.room_type === 'public') return true;
    if (room.room_type === 'private') return room.is_member || false;
    if (room.room_type === 'nft_gated' && room.required_nfts) {
      return room.required_nfts.some(nft => userNFTs.includes(nft));
    }
    return false;
  }, [userNFTs]);

  // Filter rooms based on search and filter type
  useEffect(() => {
    let filtered = rooms;

    // Apply type filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(room => room.room_type === selectedFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(room =>
        room.name.toLowerCase().includes(query) ||
        room.description?.toLowerCase().includes(query)
      );
    }

    setFilteredRooms(filtered);
  }, [rooms, searchQuery, selectedFilter]);

  // Initial fetch
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchRooms(true);
  }, [fetchRooms]);

  // Handle room selection
  const handleRoomSelect = useCallback((room: ChatRoom) => {
    if (!room.can_join) {
      Alert.alert(
        'Access Denied',
        room.room_type === 'nft_gated'
          ? `This room requires one of these NFTs: ${room.required_nfts?.join(', ')}`
          : 'You do not have access to this room'
      );
      return;
    }

    onRoomSelect(room);
  }, [onRoomSelect]);

  // Get room icon
  const getRoomIcon = (room: ChatRoom) => {
    const iconProps = { size: 20, style: styles.roomIcon };

    switch (room.room_type) {
      case 'nft_gated':
        return <Lock {...iconProps} color="#FFD700" />;
      case 'private':
        return <Crown {...iconProps} color="#8B7CF6" />;
      default:
        return <Hash {...iconProps} color="#6B7280" />;
    }
  };

  // Format last activity
  const formatLastActivity = (timestamp?: string) => {
    if (!timestamp) return 'No recent activity';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return 'Active now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Render filter buttons
  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {(['all', 'public', 'nft_gated', 'private'] as const).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterButton,
            selectedFilter === filter && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedFilter(filter)}
        >
          <Text
            style={[
              styles.filterButtonText,
              selectedFilter === filter && styles.filterButtonTextActive,
            ]}
          >
            {filter === 'all' ? 'All' : 
             filter === 'nft_gated' ? 'NFT Gated' :
             filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render room item
  const renderRoomItem = ({ item }: { item: ChatRoom }) => (
    <TouchableOpacity
      style={[
        styles.roomItem,
        !item.can_join && styles.roomItemDisabled,
      ]}
      onPress={() => handleRoomSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.roomHeader}>
        <View style={styles.roomTitleContainer}>
          {getRoomIcon(item)}
          <Text style={[
            styles.roomName,
            !item.can_join && styles.roomNameDisabled,
          ]}>
            {item.name}
          </Text>
          {item.required_nfts && item.required_nfts.length > 0 && (
            <View style={styles.nftBadgeContainer}>
              <Award size={14} color="#FFD700" />
              <Text style={styles.nftBadgeText}>{item.required_nfts.length}</Text>
            </View>
          )}
        </View>
        <ChevronRight 
          size={16} 
          color={item.can_join ? "#9CA3AF" : "#4B5563"} 
        />
      </View>

      {item.description && (
        <Text style={[
          styles.roomDescription,
          !item.can_join && styles.roomDescriptionDisabled,
        ]}>
          {item.description}
        </Text>
      )}

      <View style={styles.roomFooter}>
        <View style={styles.roomStats}>
          <Users size={14} color="#9CA3AF" />
          <Text style={styles.roomStatsText}>
            {item.member_count || 0} members
          </Text>
          {item.online_count !== undefined && (
            <>
              <View style={styles.onlineDot} />
              <Text style={styles.roomStatsText}>
                {item.online_count} online
              </Text>
            </>
          )}
        </View>
        
        <View style={styles.lastActivity}>
          <Clock size={12} color="#6B7280" />
          <Text style={styles.lastActivityText}>
            {formatLastActivity(item.last_activity)}
          </Text>
        </View>
      </View>

      {!item.can_join && (
        <View style={styles.accessDeniedOverlay}>
          <Lock size={16} color="#EF4444" />
          <Text style={styles.accessDeniedText}>
            {item.room_type === 'nft_gated' ? 'NFT Required' : 'No Access'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Hash size={48} color="#6B7280" />
      <Text style={styles.emptyStateTitle}>No rooms found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery ? 'Try adjusting your search' : 'No rooms available'}
      </Text>
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchRooms()}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B7CF6" />
        <Text style={styles.loadingText}>Loading rooms...</Text>
      </View>
    );
  }

  if (error && !rooms.length) {
    return renderErrorState();
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat Rooms</Text>
        {onCreateRoom && (
          <TouchableOpacity style={styles.createButton} onPress={onCreateRoom}>
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search rooms..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      {renderFilterButtons()}

      {/* Room List */}
      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item.id}
        renderItem={renderRoomItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#8B7CF6"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#F3F4F6',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: {
    color: '#F3F4F6',
    fontSize: 24,
    fontWeight: '700',
  },
  createButton: {
    backgroundColor: '#8B7CF6',
    borderRadius: 20,
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#F3F4F6',
    fontSize: 16,
    paddingVertical: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: '#374151',
    borderRadius: 20,
  },
  filterButtonActive: {
    backgroundColor: '#8B7CF6',
  },
  filterButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  roomItem: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
    position: 'relative',
  },
  roomItemDisabled: {
    opacity: 0.6,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roomIcon: {
    marginRight: 8,
  },
  roomName: {
    color: '#F3F4F6',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  roomNameDisabled: {
    color: '#9CA3AF',
  },
  nftBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  nftBadgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  roomDescription: {
    color: '#D1D5DB',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  roomDescriptionDisabled: {
    color: '#6B7280',
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomStatsText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginLeft: 6,
  },
  onlineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
    marginLeft: 12,
    marginRight: 6,
  },
  lastActivity: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastActivityText: {
    color: '#6B7280',
    fontSize: 12,
    marginLeft: 4,
  },
  accessDeniedOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accessDeniedText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    color: '#F3F4F6',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#8B7CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
