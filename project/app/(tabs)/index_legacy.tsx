import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Upload, Plus, Grid3x3 as Grid3X3, List, Info, MessageCircle, Clock } from 'lucide-react-native';
import { DocumentCard } from '@/components/DocumentCard';
import { UploadModal } from '@/components/UploadModal';
import Toast from 'react-native-root-toast';
import { Picker } from '@react-native-picker/picker';
import { Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { trackEvent, trackScreen } from '@/utils/analytics';
import { featureFlags } from '@/utils/featureFlags';

type DocStatus = 'synced' | 'processing' | 'error';
type Document = {
  id: string;
  title: string;
  uploadDate: string; // YYYY-MM-DD
  status: DocStatus;
  type: string;
  pages: number;
  lastOpenedAt?: string; // ISO timestamp
  fileUri?: string;
  filesize?: number; // bytes
  mimeType?: string;
  preview?: string; // optional base64/thumb
};

const STORAGE_KEY = 'library_documents_v2';
const LEGACY_STORAGE_KEY = 'library_documents_v1';

const seedDocuments: Document[] = [
  {
    id: '1',
    title: 'Machine Learning Fundamentals',
    uploadDate: '2024-01-15',
    status: 'synced',
    type: 'PDF',
    pages: 124,
    lastOpenedAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: '2',
    title: 'Blockchain Consensus Mechanisms',
    uploadDate: '2024-01-14',
    status: 'processing',
    type: 'PDF',
    pages: 89,
    lastOpenedAt: '2024-01-14T10:00:00.000Z',
  },
];

const LibraryScreen = () => {
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [uploadModalVisible, setUploadModalVisible] = React.useState(false);
  const [search, setSearch] = React.useState<string>('');
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'synced' | 'processing' | 'error'>('all');
  const [sortBy, setSortBy] = React.useState<'date' | 'title'>('date');
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = React.useState<Document | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Load from storage (with migration and seed if empty)
  React.useEffect(() => {
    trackScreen('Library');
    const load = async () => {
      try {
        setLoading(true);
        const rawV2 = await AsyncStorage.getItem(STORAGE_KEY);
        if (rawV2) {
          const parsed: Document[] = JSON.parse(rawV2);
          setDocuments(parsed);
        } else {
          // try legacy v1 and migrate
          const rawV1 = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
          if (rawV1) {
            const v1docs = JSON.parse(rawV1) as Omit<Document, 'fileUri' | 'filesize' | 'mimeType' | 'preview'>[];
            const migrated: Document[] = v1docs.map((d) => ({ ...d }));
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
            setDocuments(migrated);
          } else {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seedDocuments));
            setDocuments(seedDocuments);
            trackEvent('library_seeded', { count: seedDocuments.length });
          }
        }
      } catch (e) {
        console.error('Failed to load documents', e);
        showToast('Failed to load documents. Using defaults.', 'error');
        setDocuments(seedDocuments);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveDocuments = async (next: Document[]) => {
    setDocuments(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('Failed to save documents', e);
      showToast('Failed to save changes', 'error');
    }
  };

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    Toast.show(message, {
      duration: Toast.durations.SHORT,
      position: Toast.positions.BOTTOM,
      backgroundColor: type === 'success' ? '#222' : '#c00',
      textColor: '#fff',
      shadow: true,
      animation: true,
      hideOnPress: true,
    });
  };

  // Search, filter, sort logic
  const filteredDocs = documents
    .filter(doc =>
      (filterStatus === 'all' || doc.status === filterStatus) &&
      doc.title.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      } else {
        return a.title.localeCompare(b.title);
      }
    });

  const recentDocs = [...documents]
    .sort((a, b) => {
      const aTime = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : new Date(a.uploadDate).getTime();
      const bTime = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : new Date(b.uploadDate).getTime();
      return bTime - aTime;
    })
    .slice(0, 3);

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
            const next = documents.filter(doc => doc.id !== id);
            saveDocuments(next);
            showToast('Document deleted', 'success');
            trackEvent('document_deleted', { id });
          }
        },
      ]
    );
  };

  const handleDetails = (doc: Document) => {
    trackEvent('open_details', { id: doc.id });
    // Navigate to details screen with params
    router.push({
      pathname: '/(tabs)/details',
      params: {
        id: doc.id,
        title: doc.title,
        pages: String(doc.pages),
        uploadDate: doc.uploadDate,
        status: doc.status,
        type: doc.type,
        fileUri: doc.fileUri ?? '',
        filesize: doc.filesize ? String(doc.filesize) : '',
        mimeType: doc.mimeType ?? '',
      },
    });
  };

  // Upload handler from UploadModal -> add doc, simulate processing -> mark ready
  const handleUpload = (file: any) => {
    const name = file?.name || 'New Document';
    const size = typeof file?.size === 'number' ? file.size : undefined;
    const cid = file?.cid;

    // Duplicate detection (by name+size)
    const dup = documents.find((d) => d.title === name && (!!size ? d.filesize === size : true));
    if (dup) {
      Alert.alert(
        'Already uploaded',
        'This looks like a document you uploaded recently. Do you want to open the existing one?',
        [
          { text: 'Open existing', onPress: () => handleDetails(dup) },
          { text: 'Upload anyway', style: 'destructive', onPress: () => doUpload() },
        ]
      );
      return;
    }

    doUpload();

    function doUpload() {
      trackEvent('upload_started', { name, size: size ?? 0, cid: cid ?? '' });
      setLoading(true);
      const newDoc: Document = {
        id: (documents.length + 1).toString(),
        title: name,
        uploadDate: new Date().toISOString().slice(0, 10),
        status: 'processing',
        type: (file?.mimeType?.includes('pdf') ? 'PDF' : file?.mimeType?.includes('csv') ? 'CSV' : 'DOC'),
        pages: Math.floor(Math.random() * 100) + 1,
        lastOpenedAt: undefined,
        fileUri: file?.uri,
        filesize: size,
        mimeType: file?.mimeType,
      };
      const start = Date.now();
      const next = [newDoc, ...documents];
      saveDocuments(next);
      showToast('Uploading to IPFS…', 'success');

      // Simulate backend processing to mark ready
      const processingMs = 1000 + Math.floor(Math.random() * 1500);
      setTimeout(() => {
        const after = documents.map((d) => (d.id === newDoc.id ? { ...d, status: 'synced' as const } : d));
        saveDocuments(after);
        setLoading(false);
        showToast('Document ready. Open chat to start learning.', 'success');
        trackEvent('ai_processing_completed', { duration: Date.now() - start, id: newDoc.id, pages: newDoc.pages });
      }, processingMs);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: '100%' }}>
          <Text style={styles.title} accessibilityLabel="Library title">Library</Text>
          <Text style={styles.subtitle} accessibilityLabel="Library subtitle">Your uploaded documents and recent activity</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.viewToggle}
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            accessibilityLabel="Toggle grid/list view"
          >
            {viewMode === 'grid' ? (
              <List size={20} color="#FFFFFF" strokeWidth={1.5} />
            ) : (
              <Grid3X3 size={20} color="#FFFFFF" strokeWidth={1.5} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => setUploadModalVisible(true)}
            accessibilityLabel="Upload document"
          >
            <Plus size={20} color="#000000" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="More options"
            onPress={() => setMenuOpen(v => !v)}
            style={[styles.viewToggle, { width: 36, height: 36, borderRadius: 8, backgroundColor: '#111' }]}
          >
            <Text style={{ color: '#fff', fontSize: 18, lineHeight: 18 }}>⋮</Text>
          </TouchableOpacity>
          {menuOpen && (
            <View style={styles.menuContainer}>
              <TouchableOpacity
                accessibilityLabel="Reset Library"
                style={styles.menuItem}
                onPress={async () => {
                  try {
                    await AsyncStorage.removeItem(STORAGE_KEY);
                    setDocuments(seedDocuments);
                    showToast('Library reset');
                  } catch (e) {
                    showToast('Failed to reset library', 'error');
                  } finally {
                    setMenuOpen(false);
                  }
                }}
              >
                <Text style={styles.menuItemText}>Reset Library</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Search, Filter (chips), Sort Controls */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 8, marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#888', fontSize: 12 }}>Search</Text>
          <View style={{ backgroundColor: '#222', borderRadius: 8, paddingHorizontal: 8 }}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search documents..."
              placeholderTextColor="#666"
              style={{ color: '#fff', height: 32 }}
              accessibilityLabel="Search documents"
            />
          </View>
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Filter</Text>
          <View style={styles.chipsRow}>
            {([
              { label: 'All', value: 'all' },
              { label: 'Ready', value: 'synced' },
              { label: 'Processing', value: 'processing' },
              { label: 'Error', value: 'error' },
            ] as const).map((chip) => (
              <TouchableOpacity
                key={chip.value}
                onPress={() => setFilterStatus(chip.value)}
                style={[styles.chip, filterStatus === chip.value && styles.chipActive]}
                accessibilityLabel={`Filter ${chip.label}`}
              >
                <Text style={[styles.chipText, filterStatus === chip.value && styles.chipTextActive]}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View>
          <Text style={{ color: '#888', fontSize: 12 }}>Sort</Text>
          <Picker
            selectedValue={sortBy}
            style={{ color: '#fff', backgroundColor: '#222', borderRadius: 8, height: 32, width: 80 }}
            onValueChange={setSortBy}
            accessibilityLabel="Sort documents"
          >
            <Picker.Item label="Date" value="date" />
            <Picker.Item label="Title" value="title" />
          </Picker>
        </View>
      </View>

      <View style={styles.content}>
        {/* Recent strip */}
        <View style={styles.recentSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <TouchableOpacity accessibilityLabel="View all documents" onPress={() => {
              try {
                // Scroll the main documents list to the top and flash indicators
                listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
                // @ts-ignore - not always typed on FlatList
                listRef.current?.flashScrollIndicators?.();
              } catch (e) {
                // ignore
              }
            }}>
              <Text style={{ color: '#999', fontWeight: '600' }}>View all</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[0,1,2].map(i => (
                <View key={i} style={styles.recentSkeleton} />
              ))}
            </View>
          ) : recentDocs.length === 0 ? (
            <Text style={{ color: '#666' }}>No recent documents</Text>
          ) : (
            <FlatList
              data={recentDocs}
              keyExtractor={(doc) => `recent-${doc.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.recentPill}
                  onPress={() => {
                    const next = documents.map(d => d.id === item.id ? { ...d, lastOpenedAt: new Date().toISOString() } : d);
                    saveDocuments(next);
                    handleDetails(item);
                  }}
                  onLongPress={() => handleDelete(item.id)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <View style={styles.recentIconBox}>
                      <FileText size={16} color="#fff" strokeWidth={1.5} />
                    </View>
                    <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.recentMeta}>{item.pages} • {item.uploadDate}</Text>
                    <View style={[styles.badge, item.status === 'synced' ? styles.badgeReady : item.status === 'processing' ? styles.badgeProcessing : styles.badgeError]}>
                      <Text style={styles.badgeText}>{item.status === 'synced' ? 'Ready' : item.status === 'processing' ? 'Processing' : 'Error'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{documents.length}</Text>
            <Text style={styles.statLabel}>Documents</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>2.4k</Text>
            <Text style={styles.statLabel}>Tokens Spent</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>18</Text>
            <Text style={styles.statLabel}>NFTs Minted</Text>
          </View>
        </View>

        <View style={styles.documentsSection}>
          <Text style={styles.sectionTitle}>Recent Documents</Text>
          {loading ? (
            <View style={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}>
              {Array.from({ length: viewMode === 'grid' ? 6 : 4 }).map((_, idx) => (
                <View key={idx} style={viewMode === 'grid' ? styles.cardSkeletonGrid : styles.cardSkeletonList} />
              ))}
            </View>
          ) : filteredDocs.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 32 }}>
              <Text style={{ color: '#888', fontSize: 16 }}>No documents found.</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={filteredDocs}
              keyExtractor={doc => doc.id}
              numColumns={viewMode === 'grid' ? 2 : 1}
              key={viewMode}
              renderItem={({ item }) => (
                <DocumentCard
                  key={item.id}
                  document={item as any}
                  viewMode={viewMode}
                  onOpenChat={() => {
                    const next = documents.map(d => d.id === item.id ? { ...d, lastOpenedAt: new Date().toISOString() } : d);
                    saveDocuments(next);
                    router.push({ pathname: '/(tabs)/chat', params: { id: item.id, title: item.title } });
                  }}
                  onDelete={() => handleDelete(item.id)}
                  onDetails={() => handleDetails(item)}
                  onPress={() => {
                    const next = documents.map(d => d.id === item.id ? { ...d, lastOpenedAt: new Date().toISOString() } : d);
                    saveDocuments(next);
                    handleDetails(item);
                  }}
                  onLongPress={() => handleDelete(item.id)}
                />
              )}
              contentContainerStyle={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}
            />
          )}
        </View>
      </View>

      {featureFlags.newUploadFlow && (
        <UploadModal
          visible={uploadModalVisible}
          onClose={() => setUploadModalVisible(false)}
          onUpload={handleUpload}
        />
      )}

      {/* Details Modal */}
      <Modal visible={detailsModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#111', borderRadius: 16, padding: 24, width: '80%' }}>
            {selectedDoc && (
              <>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>{selectedDoc.title}</Text>
                <Text style={{ color: '#888', marginBottom: 4 }}>Pages: {selectedDoc.pages}</Text>
                <Text style={{ color: '#888', marginBottom: 4 }}>Uploaded: {selectedDoc.uploadDate}</Text>
                <Text style={{ color: '#888', marginBottom: 4 }}>Status: {selectedDoc.status}</Text>
                <TouchableOpacity style={{ marginTop: 16, backgroundColor: '#fff', borderRadius: 8, padding: 12 }} onPress={() => setDetailsModalVisible(false)} accessibilityLabel="Close details modal">
                  <Text style={{ color: '#000', fontWeight: 'bold' }}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const listRef: any = React.createRef();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'column', 
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    color: '#aaa',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewToggle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  recentSection: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#111',
  },
  chipActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  chipText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#000',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
    marginTop: 4,
  },
  documentsSection: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 16,
    fontWeight: '600',
  },
  recentPill: {
    maxWidth: 240,
    backgroundColor: '#111',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  recentSkeleton: {
    width: 220,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  recentIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  recentTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  recentMeta: {
    color: '#888',
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeReady: {
    backgroundColor: '#b0ffb4',
  },
  badgeProcessing: {
    backgroundColor: '#ffe4a3',
  },
  badgeError: {
    backgroundColor: '#ffb3b3',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    // spacing handled by item widths and margins
  },
  listContainer: {
    paddingVertical: 16,
  },
  cardSkeletonGrid: {
    width: '48%',
    height: 140,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 16,
  },
  cardSkeletonList: {
    width: '100%',
    height: 100,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 16,
  },
});

export default LibraryScreen;