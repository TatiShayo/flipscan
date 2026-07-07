// Scan history — receipt-roll aesthetic (perforated-edge dividers), reverse-chron,
// filterable by verdict, tap to reopen. CSV export lives here (annual-plan perk).
import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Radius, Spacing, Type, Verdict } from '@/constants/theme';
import { Icon } from '@/components/Icon';
import { useScanStore } from '@/store/scanStore';
import { exportHistoryToCsv } from '@/lib/csvExport';
import { track } from '@/lib/analytics';
import type { ScanHistoryItem, Verdict as VerdictType } from '@/types/scan';

type Filter = 'all' | VerdictType;

export default function HistoryTab() {
  const history = useScanStore((s) => s.history);
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(
    () => (filter === 'all' ? history : history.filter((h) => h.verdict === filter)),
    [history, filter],
  );

  const handleExport = async () => {
    track('csv_exported', { count: history.length });
    await exportHistoryToCsv(history);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={Type.title}>History</Text>
        <Pressable onPress={handleExport} style={styles.exportButton} accessibilityLabel="Export CSV">
          <Icon name="download" size={18} color={Colors.inkSoft} />
        </Pressable>
      </View>

      <View style={styles.filters}>
        {(['all', 'flip', 'maybe', 'skip'] as Filter[]).map((f) => {
          const active = f === filter;
          return (
            <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filterChip, active && styles.filterChipActive]}>
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {f === 'all' ? 'All' : Verdict[f].label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="history" size={36} color={Colors.inkFaint} />
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptyBody}>Your scan history will show up here, receipt-style.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.brass} />}
          ItemSeparatorComponent={() => <View style={styles.perforation} />}
          renderItem={({ item }) => <HistoryRow item={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function HistoryRow({ item }: { item: ScanHistoryItem }) {
  const v = Verdict[item.verdict];
  return (
    <Pressable
      onPress={() => router.push(`/result/${item.id}`)}
      style={styles.row}
      accessibilityRole="button"
    >
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.identified.name}</Text>
        <Text style={styles.rowMeta}>
          {new Date(item.createdAt).toLocaleDateString()} · {item.status === 'queued' ? 'Queued' : `$${item.comps.estimated_sold.toFixed(2)} est.`}
        </Text>
      </View>
      <View style={[styles.verdictPill, { backgroundColor: v.bg }]}>
        <Text style={[styles.verdictPillText, { color: v.fg }]}>{v.label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  exportButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
  },
  filterChipActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  filterLabel: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.inkSoft },
  filterLabelActive: { color: Colors.white },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  perforation: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    marginVertical: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  thumb: { width: 52, height: 52, borderRadius: Radius.sm, backgroundColor: Colors.paperEdge },
  thumbPlaceholder: {},
  rowBody: { flex: 1 },
  rowTitle: { fontFamily: Fonts.bodySemibold, fontSize: 14, color: Colors.ink },
  rowMeta: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.inkFaint, marginTop: 2 },
  verdictPill: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.pill },
  verdictPillText: { fontFamily: Fonts.bodySemibold, fontSize: 10, letterSpacing: 0.5 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.xxl },
  emptyTitle: { ...Type.heading },
  emptyBody: { ...Type.bodySm, color: Colors.inkSoft, textAlign: 'center' },
});
