// Watchlist — items saved from a scan for later ("left in store, want to remember").
// Reuses history rows (same visual language) filtered to watchlisted scan ids; each item
// can carry a note + store name (BUILD_PROMPT §4).
import { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Radius, Spacing, Type, Verdict } from '@/constants/theme';
import { Icon } from '@/components/Icon';
import { useScanStore } from '@/store/scanStore';
import type { ScanHistoryItem } from '@/types/scan';

export default function WatchlistTab() {
  const history = useScanStore((s) => s.history);
  const watchlist = useScanStore((s) => s.watchlist);
  const toggleWatchlist = useScanStore((s) => s.toggleWatchlist);

  const items = useMemo(
    () => history.filter((h) => watchlist.includes(h.id)),
    [history, watchlist],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={Type.title}>Watchlist</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="star" size={36} color={Colors.inkFaint} />
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptyBody}>
            Tap the star on any result to remember an item you left behind.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <WatchlistRow item={item} onRemove={() => toggleWatchlist(item.id)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function WatchlistRow({ item, onRemove }: { item: ScanHistoryItem; onRemove: () => void }) {
  // Watchlisting only happens from a completed result screen, so identified/comps/verdict
  // should always be present here — but the type is nullable (queued rows share the same
  // shape), so fall back gracefully rather than crashing if that ever changes.
  const v = item.verdict ? Verdict[item.verdict] : null;
  return (
    <Pressable onPress={() => router.push(`/result/${item.id}`)} style={styles.row}>
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.identified?.name ?? 'Processing…'}</Text>
        <Text style={styles.rowMeta}>
          {item.comps ? `$${item.comps.estimated_sold.toFixed(2)} est.` : '—'} {v ? `· ${v.label}` : ''}
        </Text>
      </View>
      <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel="Remove from watchlist">
        <Icon name="star" size={20} color={Colors.brass} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  separator: { height: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.paper,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    padding: Spacing.md,
  },
  thumb: { width: 48, height: 48, borderRadius: Radius.sm, backgroundColor: Colors.paperEdge },
  thumbPlaceholder: {},
  rowBody: { flex: 1 },
  rowTitle: { fontFamily: Fonts.bodySemibold, fontSize: 14, color: Colors.ink },
  rowMeta: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.inkFaint, marginTop: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.xxl },
  emptyTitle: { ...Type.heading },
  emptyBody: { ...Type.bodySm, color: Colors.inkSoft, textAlign: 'center' },
});
