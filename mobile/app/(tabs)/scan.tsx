// Scan tab landing — the home screen of the app. Big camera CTA (the whole product is
// this button), free-scans-remaining chip, and "your eye is worth $X" stored-value stat
// (PLAYBOOK 3.3). Tapping the shutter pushes the full-screen camera route.
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PriceText } from '@/components/PriceText';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { FREE_SCAN_LIMIT } from '@/constants/limits';
import { useScanStore } from '@/store/scanStore';
import { track } from '@/lib/analytics';

export default function ScanTab() {
  const freeScansUsed = useScanStore((s) => s.freeScansUsed);
  const topupRemaining = useScanStore((s) => s.topupRemaining);
  const potentialProfitFound = useScanStore((s) => s.potentialProfitFound);
  const historyCount = useScanStore((s) => s.history.length);

  const remainingFree = Math.max(0, FREE_SCAN_LIMIT - freeScansUsed);
  const scansLeft = remainingFree + topupRemaining;
  const found = potentialProfitFound();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={Type.title}>FlipScan</Text>
          <View style={styles.chip}>
            <Text style={styles.chipText}>
              {scansLeft} scan{scansLeft === 1 ? '' : 's'} left
            </Text>
          </View>
        </View>

        {historyCount > 0 && (
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Your eye is worth</Text>
            <PriceText value={found} style={styles.statValue} />
            <Text style={styles.statCaption}>
              found across {historyCount} scan{historyCount === 1 ? '' : 's'} so far
            </Text>
          </View>
        )}

        <View style={styles.heroCard}>
          <View style={styles.frameCorners}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <Icon name="camera" size={40} color={Colors.inkFaint} />
          </View>
          <Text style={styles.heroTitle}>Ready to scan</Text>
          <Text style={styles.heroSubtitle}>
            Center the item, snap a photo, and we'll check what it's worth in seconds.
          </Text>
          <Button
            title="Open camera"
            onPress={() => {
              track('scan_started', { mode: 'photo' });
              router.push('/camera');
            }}
            style={styles.cta}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  scroll: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.xxxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: {
    backgroundColor: Colors.paper,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  chipText: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.inkSoft },
  statCard: {
    backgroundColor: Colors.paper,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    padding: Spacing.lg,
  },
  statLabel: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.inkSoft },
  statValue: { fontSize: 32, color: Colors.flip, marginTop: Spacing.xs },
  statCaption: { fontFamily: Fonts.body, fontSize: 12, color: Colors.inkFaint, marginTop: Spacing.xs },
  heroCard: {
    backgroundColor: Colors.paper,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  frameCorners: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: Colors.brass },
  cornerTL: { top: 0, left: 0, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 6 },
  heroTitle: { ...Type.heading },
  heroSubtitle: { ...Type.bodySm, color: Colors.inkSoft, textAlign: 'center' },
  cta: { marginTop: Spacing.md, width: '100%' },
});
