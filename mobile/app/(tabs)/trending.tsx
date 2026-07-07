// Trending tab — editorial v1 (BUILD_PROMPT §9): static, hand-authored "hot flip"
// categories with what to look for. Retention hook per PLAYBOOK 3.3 ("reason to open
// without shopping").
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { Icon } from '@/components/Icon';
import { TRENDING_CATEGORIES, type TrendingCategory } from '@/content/trending';
import { track } from '@/lib/analytics';

export default function TrendingTab() {
  useEffect(() => {
    track('trending_opened');
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={Type.title}>Trending</Text>
        <Text style={styles.subtitle}>This week&apos;s hottest thrift categories</Text>
      </View>
      <FlatList
        data={TRENDING_CATEGORIES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        renderItem={({ item, index }) => <TrendingRow item={item} rank={index + 1} />}
      />
    </SafeAreaView>
  );
}

function TrendingRow({ item, rank }: { item: TrendingCategory; rank: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.rank}>#{rank}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.trendChip}>
          <Icon name="trending" size={12} color={Colors.flip} />
          <Text style={styles.trendText}>+{item.trendPct}%</Text>
        </View>
      </View>
      <Text style={styles.priceRange}>
        ${item.lowPrice}&ndash;${item.highPrice} typical
      </Text>
      <Text style={styles.lookFor}>{item.lookFor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  subtitle: { fontFamily: Fonts.body, fontSize: 14, color: Colors.inkSoft, marginTop: Spacing.xs },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  card: {
    backgroundColor: Colors.paper,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rank: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.inkFaint, width: 24 },
  cardTitle: { flex: 1, fontFamily: Fonts.bodySemibold, fontSize: 15, color: Colors.ink },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.flipSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  trendText: { fontFamily: Fonts.monoBold, fontSize: 11, color: Colors.flip },
  priceRange: { fontFamily: Fonts.mono, fontSize: 13, color: Colors.inkSoft, marginLeft: 32 },
  lookFor: { fontFamily: Fonts.body, fontSize: 13, color: Colors.inkSoft, marginLeft: 32, lineHeight: 18 },
});
