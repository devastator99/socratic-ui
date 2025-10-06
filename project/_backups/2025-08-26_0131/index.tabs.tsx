import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';

/**
 * My Library – replacement page for the previous Document Library.
 * Keeps the Library tab/icon, but shows the new "My Library" screen.
 */
type LibItem = { id: string; name: string };

export default function LibraryScreen() {
  const [items, setItems] = useState<LibItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const API_BASE = (process as any)?.env?.EXPO_PUBLIC_API_URL || '';
  const LIST_PATH = (process as any)?.env?.EXPO_PUBLIC_LIST_PATH || '/documents/list';
  const buildUrl = (base: string, path: string) => {
    const b = base ? base.replace(/\/$/, '') : '';
    const p = path.startsWith('/') ? path : `/${path}`;
    return b ? `${b}${p}` : p;
  };
  const PRIMARY_URL = buildUrl(API_BASE, LIST_PATH);
  const ALT_URL = buildUrl(API_BASE, `/api${LIST_PATH.startsWith('/') ? LIST_PATH : `/${LIST_PATH}`}`);
  const [debugBody, setDebugBody] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const tryFetch = async (url: string) => {
          const res = await fetch(url, { headers: { Accept: 'application/json' } });
          const statusOk = res.ok;
          const ct = res.headers?.get?.('content-type') || '';
          const text = await res.text();
          if (!statusOk) throw new Error(`HTTP ${res.status}`);
          try {
            const parsed = JSON.parse(text);
            return { parsed, ct, text } as const;
          } catch {
            return { parsed: null as any, ct, text } as const;
          }
        };

        // First try primary URL
        let result = await tryFetch(PRIMARY_URL);
        // If HTML came back, try ALT_URL with '/api' prefix automatically
        if ((!result.parsed || /text\/html/i.test(result.ct)) && ALT_URL !== PRIMARY_URL) {
          const alt = await tryFetch(ALT_URL);
          // Use alt if it parsed JSON
          if (alt.parsed) result = alt;
          else {
            // keep original but record body for debugging
            setDebugBody((result.text || '').slice(0, 200));
          }
        }

        if (!result.parsed) {
          setDebugBody((result.text || '').slice(0, 200));
          throw new Error(`Expected JSON but received ${result.ct || 'unknown content-type'}`);
        }
        if (!cancelled) setItems(Array.isArray(result.parsed) ? result.parsed : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const renderItem = ({ item }: { item: LibItem }) => (
    <TouchableOpacity
      style={{
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
      }}
      onPress={() => { /* navigate/open item in future */ }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 16, flex: 1 }} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={() => { /* TODO: open item */ }}>
            <Text style={{ color: '#7fb3ff' }}>Open</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { /* TODO: delete item backend */ console.warn('Delete not wired'); }}>
            <Text style={{ color: '#ff8888' }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(it => String(it.name || '').toLowerCase().includes(q));
  }, [items, query]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(PRIMARY_URL, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setItems(Array.isArray(data) ? data : []);
        } catch {
          // try ALT once on refresh as well
          const res2 = await fetch(ALT_URL, { headers: { Accept: 'application/json' } });
          if (res2.ok) {
            const text2 = await res2.text();
            try {
              const data2 = JSON.parse(text2);
              setItems(Array.isArray(data2) ? data2 : []);
            } catch {
              setDebugBody((text2 || '').slice(0, 200));
              setError('Expected JSON but received non-JSON');
            }
          } else {
            setError(`HTTP ${res2.status}`);
          }
        }
      } else {
        setError(`HTTP ${res.status}`);
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000', padding: 16 }}>
      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '600', marginBottom: 12 }}>
        My Library
      </Text>

      {loading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#fff" />
          <Text style={{ color: '#aaa', marginTop: 8 }}>Loading…</Text>
        </View>
      )}

      {!loading && error && (
        <View style={{ padding: 12, borderWidth: 1, borderColor: '#442222', backgroundColor: '#1a0000' }}>
          <Text style={{ color: '#ff8888' }}>Error: {error}</Text>
          {!!API_BASE && (
            <Text style={{ color: '#cc9999', marginTop: 6 }}>Tried: {PRIMARY_URL}</Text>
          )}
          {!!API_BASE && PRIMARY_URL !== ALT_URL && (
            <Text style={{ color: '#cc9999' }}>Also tried: {ALT_URL}</Text>
          )}
          {!API_BASE && (
            <Text style={{ color: '#cc9999', marginTop: 6 }}>
              Tip: Set EXPO_PUBLIC_API_URL to your backend base URL.
            </Text>
          )}
          {!!debugBody && (
            <Text style={{ color: '#996666', marginTop: 6 }}>Body (first 200 chars): {debugBody}</Text>
          )}
        </View>
      )}

      {!loading && !error && items.length === 0 && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#aaa' }}>No items yet.</Text>
          <Text style={{ color: '#666', marginTop: 6 }}>Upload or import to get started.</Text>
        </View>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <View style={{ marginBottom: 8 }}>
            <TextInput
              placeholder="Search…"
              placeholderTextColor="#666"
              value={query}
              onChangeText={setQuery}
              style={{
                backgroundColor: '#0d0d0d',
                color: '#fff',
                borderWidth: 1,
                borderColor: '#222',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(it) => String(it.id)}
            renderItem={renderItem}
            contentContainerStyle={{ backgroundColor: '#000' }}
            refreshControl={<RefreshControl tintColor="#fff" refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={!loading && filtered.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>No results for “{query}”.</Text>
              </View>
            ) : null}
          />
        </>
      )}
    </View>
  );
}
