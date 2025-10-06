import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FileText, MessageCircle, CircleCheck as CheckCircle, Clock, Info } from 'lucide-react-native';

interface Document {
  id: string;
  title: string;
  uploadDate: string;
  status: 'synced' | 'processing' | 'error';
  type: string;
  pages: number;
}

export const DocumentCard = React.memo(
  DocumentCardInner,
  (prev, next) =>
    prev.viewMode === next.viewMode &&
    prev.document.id === next.document.id &&
    prev.document.title === next.document.title &&
    prev.document.status === next.document.status &&
    prev.document.uploadDate === next.document.uploadDate &&
    prev.document.pages === next.document.pages
);

interface DocumentCardProps {
  document: Document;
  viewMode: 'grid' | 'list';
  onOpenChat: () => void;
  onDelete?: () => void;
  onDetails?: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
}

function DocumentCardInner({ document, viewMode, onOpenChat, onDelete, onDetails, onPress, onLongPress }: DocumentCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const getStatusIcon = () => {
    switch (document.status) {
      case 'synced':
        return <CheckCircle size={16} color="#FFFFFF" strokeWidth={1.5} />;
      case 'processing':
        return <Clock size={16} color="#888888" strokeWidth={1.5} />;
      case 'error':
        return <Info size={16} color="#666666" strokeWidth={1.5} />;
    }
  };

  const getStatusText = () => {
    switch (document.status) {
      case 'synced':
        return 'Ready';
      case 'processing':
        return 'Processing';
      case 'error':
        return 'Error';
    }
  };

  if (viewMode === 'list') {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} onLongPress={onLongPress} style={styles.listCard}>
        <View style={styles.listHeader}>
          <View style={styles.listIcon}>
            <FileText size={20} color="#FFFFFF" strokeWidth={1.5} />
          </View>
          <View style={styles.listContent}>
            <Text style={styles.listTitle} numberOfLines={1}>{document.title}</Text>
            <View style={styles.listMeta}>
              <Text style={styles.listPages}>{document.pages} pages</Text>
              <Text style={styles.listDot}>•</Text>
              <Text style={styles.listDate}>{document.uploadDate}</Text>
            </View>
          </View>
          <View style={styles.listStatus}>
            {getStatusIcon()}
            <Text style={styles.listStatusText}>{getStatusText()}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {document.status === 'synced' && (
            <TouchableOpacity style={styles.listChatButton} onPress={onOpenChat}>
              <MessageCircle size={16} color="#000000" strokeWidth={1.5} />
              <Text style={styles.listChatText}>Open Chat</Text>
            </TouchableOpacity>
          )}
          {onDetails && (
            <TouchableOpacity style={[styles.listChatButton, { backgroundColor: '#eee' }]} onPress={onDetails}>
              <Text style={[styles.listChatText, { color: '#333' }]}>Details</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={[styles.listChatButton, { backgroundColor: '#ffdddd' }]} onPress={onDelete}>
              <Text style={[styles.listChatText, { color: '#c00' }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} onLongPress={onLongPress} style={styles.gridCard}>
      <View style={styles.gridHeader}>
        <View style={styles.gridIcon}>
          <FileText size={24} color="#FFFFFF" strokeWidth={1.5} />
        </View>
        <View style={styles.gridRight}>
          {document.status === 'processing' ? (
            <ActivityIndicator size="small" color="#888" />
          ) : (
            <TouchableOpacity accessibilityLabel="More options" onPress={() => setMenuOpen((v) => !v)}>
              <Text style={{ color: '#fff', fontSize: 18, lineHeight: 18 }}>⋮</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {/* Status badge */}
      <View style={[
        styles.statusBadge,
        document.status === 'synced' ? styles.statusReady : document.status === 'processing' ? styles.statusProcessing : styles.statusError,
      ]}
        accessibilityLabel={`Status ${getStatusText()}`}
        accessible
      >
        <Text style={styles.statusBadgeText}>{getStatusText()}</Text>
      </View>
      <Text style={styles.gridTitle} numberOfLines={2}>{document.title}</Text>
      <View style={styles.gridMeta}>
        <Text style={styles.gridPages}>{document.pages} pages</Text>
        <Text style={styles.gridDate}>{document.uploadDate}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
        <TouchableOpacity
          style={[styles.gridChatButton, document.status !== 'synced' && { opacity: 0.5 }]}
          onPress={onOpenChat}
          disabled={document.status !== 'synced'}
        >
          <MessageCircle size={16} color="#000000" strokeWidth={1.5} />
          <Text style={styles.gridChatText}>Chat</Text>
        </TouchableOpacity>
      </View>

      {menuOpen && (
        <View style={styles.menuContainer}>
          {onDetails && (
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); onDetails(); }}>
              <Text style={styles.menuItemText}>Details</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); onDelete(); }}>
              <Text style={[styles.menuItemText, { color: '#ff6b6b' }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Grid styles
  gridCard: {
    width: '48%',
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222222',
    position: 'relative',
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridStatus: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridRight: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 8,
  },
  gridMeta: {
    gap: 4,
    marginBottom: 12,
  },
  gridPages: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
  gridDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  gridChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  gridChatText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    fontWeight: '600',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    fontWeight: '600',
  },
  statusReady: { backgroundColor: '#b5f5b5' },
  statusProcessing: { backgroundColor: '#ffe9a8' },
  statusError: { backgroundColor: '#ffb3b3' },
  menuContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 14,
  },

  // List styles
  listCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222222',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listPages: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
  listDot: {
    fontSize: 12,
    color: '#666666',
  },
  listDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  listStatus: {
    alignItems: 'center',
    gap: 4,
  },
  listStatusText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
  listChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  listChatText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    fontWeight: '600',
  },
});