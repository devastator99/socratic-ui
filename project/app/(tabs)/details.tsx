import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileText, CircleCheck as CheckCircle, Clock, Info, ArrowLeft } from 'lucide-react-native';
import { trackEvent, trackScreen } from '@/utils/analytics';

export default function DetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    pages?: string;
    uploadDate?: string;
    status?: 'synced' | 'processing' | 'error' | string;
    type?: string;
    fileUri?: string;
    filesize?: string;
    mimeType?: string;
  }>();

  const status = params.status === 'synced' || params.status === 'processing' || params.status === 'error' ? params.status : 'processing';
  React.useEffect(() => {
    trackScreen('Details');
  }, []);

  // Try to load WebView dynamically to avoid hard dependency
  const WebViewComp = React.useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('react-native-webview').WebView as React.ComponentType<any>;
    } catch {
      return null;
    }
  }, []);
  const [showViewer, setShowViewer] = React.useState(false);

  const renderStatus = () => {
    switch (status) {
      case 'synced':
        return (
          <View style={[styles.badge, styles.badgeReady]}>
            <CheckCircle size={14} color="#000" strokeWidth={2} />
            <Text style={styles.badgeText}>Ready</Text>
          </View>
        );
      case 'processing':
        return (
          <View style={[styles.badge, styles.badgeProcessing]}>
            <Clock size={14} color="#000" strokeWidth={2} />
            <Text style={styles.badgeText}>Processing</Text>
          </View>
        );
      case 'error':
      default:
        return (
          <View style={[styles.badge, styles.badgeError]}>
            <Info size={14} color="#000" strokeWidth={2} />
            <Text style={styles.badgeText}>Error</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Go back">
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{params.title || 'Document Details'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <FileText size={28} color="#FFFFFF" strokeWidth={1.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.docTitle}>{params.title || 'Untitled'}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{params.pages || '—'} pages</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.metaText}>{params.uploadDate || '—'}</Text>
            </View>
          </View>
          {renderStatus()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push({ pathname: '/(tabs)/chat', params: { id: params.id, title: params.title } })}
              onPressIn={() => trackEvent('open_chat', { id: params.id || '' })}
              accessibilityLabel="Open chat"
            >
              <Text style={styles.primaryBtnText}>Open Chat</Text>
            </TouchableOpacity>
            {!!params.fileUri && (params.fileUri.startsWith('http://') || params.fileUri.startsWith('https://')) && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#e5e5e5' }]}
                onPress={() => {
                  trackEvent('open_document', { id: params.id || '', uri: params.fileUri as string });
                  Linking.openURL(params.fileUri as string);
                }}
                accessibilityLabel="Open document in browser"
              >
                <Text style={[styles.primaryBtnText, { color: '#111' }]}>Open Document</Text>
              </TouchableOpacity>
            )}
            {!!WebViewComp && !!params.fileUri && (params.fileUri.startsWith('http://') || params.fileUri.startsWith('https://')) && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#d9f99d' }]}
                onPress={() => setShowViewer(true)}
                accessibilityLabel="View document in app"
              >
                <Text style={[styles.primaryBtnText, { color: '#111' }]}>View In-App</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metadata</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>Type</Text><Text style={styles.metaValue}>{params.type || '—'}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>MIME</Text><Text style={styles.metaValue}>{params.mimeType || '—'}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>Size</Text><Text style={styles.metaValue}>{params.filesize ? `${Number(params.filesize).toLocaleString()} bytes` : '—'}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>Source</Text><Text style={styles.metaValue} numberOfLines={1}>{params.fileUri || '—'}</Text></View>
          </View>
        </View>
        {showViewer && WebViewComp && !!params.fileUri && (
          <View style={[styles.section, { height: 420 }]}> 
            <Text style={styles.sectionTitle}>Viewer</Text>
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#222', borderRadius: 10, overflow: 'hidden' }}>
              <WebViewComp source={{ uri: params.fileUri as string }} />
            </View>
            <View style={{ marginTop: 8, flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#eee' }]} onPress={() => setShowViewer(false)}>
                <Text style={[styles.primaryBtnText, { color: '#111' }]}>Close Viewer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  metaText: {
    color: '#888',
    fontSize: 12,
  },
  dot: {
    color: '#666',
    fontSize: 12,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    color: '#000',
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeReady: { backgroundColor: '#b0ffb4' },
  badgeProcessing: { backgroundColor: '#ffe4a3' },
  badgeError: { backgroundColor: '#ffb3b3' },
  metaGrid: {
    gap: 8,
  },
  metaItem: {
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    padding: 12,
  },
  metaLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  metaValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
