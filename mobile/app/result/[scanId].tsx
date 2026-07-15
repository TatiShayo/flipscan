// THE result card — the TikTok moment. Reads the just-completed scan from captureStore
// (set by app/scanning.tsx) rather than re-fetching by id, since this screen is only ever
// reached immediately after a scan completes; reopening an OLD scan from history routes
// here too but falls back to the history item itself (see historyFallback below).
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { PriceText } from '@/components/PriceText';
import { PriceRangeBar } from '@/components/PriceRangeBar';
import { VerdictStamp } from '@/components/VerdictStamp';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useCapturedImageStore } from '@/store/captureStore';
import { useScanStore } from '@/store/scanStore';
import { useSettingsStore } from '@/store/settingsStore';
import { computeProfit, verdictFor, PLATFORM_LABELS, type Platform } from '@/constants/profit';
import type { ConditionGrade } from '@/types/scan';
import { track } from '@/lib/analytics';
import { sanitizeEbayUrl } from '@/lib/url';
import { maybePromptForReview } from '@/lib/reviewPrompt';
import * as WebBrowser from 'expo-web-browser';

const CONDITIONS: { key: ConditionGrade; label: string }[] = [
  { key: 'new_with_tags', label: 'New w/ tags' },
  { key: 'excellent', label: 'Excellent' },
  { key: 'good', label: 'Good' },
  { key: 'fair', label: 'Fair' },
];

export default function ResultScreen() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const lastResult = useCapturedImageStore((s) => s.lastResult);
  const lastImageUri = useCapturedImageStore((s) => s.lastImageUri);
  const history = useScanStore((s) => s.history);
  const updateHistoryItem = useScanStore((s) => s.updateHistoryItem);
  const toggleWatchlist = useScanStore((s) => s.toggleWatchlist);
  const isWatchlisted = useScanStore((s) => s.isWatchlisted(scanId ?? ''));
  const defaultPlatform = useSettingsStore((s) => s.defaultPlatform);

  // Prefer the freshly-completed result (verdict-reveal path); fall back to history for
  // reopened past scans.
  const historyItem = useMemo(() => history.find((h) => h.id === scanId), [history, scanId]);
  const isFresh = lastResult?.scan_id === scanId;

  const identified = isFresh ? lastResult!.identified : historyItem?.identified;
  const comps = isFresh ? lastResult!.comps : historyItem?.comps;
  const imageUri = isFresh ? lastImageUri : historyItem?.imageUri ?? null;

  const [condition, setCondition] = useState<ConditionGrade>(historyItem?.condition ?? 'good');
  const [buyPriceInput, setBuyPriceInput] = useState<string>(
    historyItem?.buyPrice != null ? String(historyItem.buyPrice) : '',
  );
  const [platform] = useState<Platform>(historyItem?.platform as Platform ?? defaultPlatform);
  const [revealStage, setRevealStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setRevealStage(1), 150);
    const t2 = setTimeout(() => setRevealStage(2), 950);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Computed even when identified/comps are missing (safe zero-value fallback) so every
  // hook below can stay above the not-found early return, per rules-of-hooks.
  const buyPrice = buyPriceInput.trim() === '' ? null : Math.max(0, Number(buyPriceInput) || 0);
  // Memoized so the two reveal-stage transitions (150ms/950ms timers) and the watchlist
  // toggle don't re-run profit math; only a real input change (condition/buyPrice/comps)
  // recomputes it.
  const breakdown = useMemo(
    () =>
      computeProfit({
        estimatedSold: comps?.estimated_sold ?? 0,
        category: identified?.category ?? 'other',
        condition,
        buyPrice,
        platform,
      }),
    [comps?.estimated_sold, identified?.category, condition, buyPrice, platform],
  );
  const verdict = useMemo(() => verdictFor(breakdown, buyPrice != null), [breakdown, buyPrice]);
  const showConfetti = verdict === 'flip' && breakdown.netProfit >= 50;

  // Peak-happiness moment: first FLIP >=$50 gets the one-time store review prompt, fired a
  // beat after the verdict stamp lands so it doesn't compete with the reveal animation.
  useEffect(() => {
    if (revealStage < 2 || !isFresh) return;
    const t = setTimeout(() => {
      maybePromptForReview(breakdown.netProfit, verdict).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [revealStage, isFresh, breakdown.netProfit, verdict]);

  if (!identified || !comps) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={Type.heading}>Scan not found</Text>
          <Button title="Back to scan" onPress={() => router.replace('/(tabs)/scan')} />
        </View>
      </SafeAreaView>
    );
  }

  const commitAdjustment = (nextCondition: ConditionGrade, nextBuyPriceRaw: string) => {
    if (!scanId) return;
    const nextBuyPrice = nextBuyPriceRaw.trim() === '' ? null : Math.max(0, Number(nextBuyPriceRaw) || 0);
    const nextBreakdown = computeProfit({
      estimatedSold: comps.estimated_sold,
      category: identified.category,
      condition: nextCondition,
      buyPrice: nextBuyPrice,
      platform,
    });
    updateHistoryItem(scanId, {
      condition: nextCondition,
      buyPrice: nextBuyPrice,
      netProfit: nextBreakdown.netProfit,
    });
  };

  const handleOpenListing = async (url: string) => {
    const clean = sanitizeEbayUrl(url);
    if (!clean) return;
    await WebBrowser.openBrowserAsync(clean);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.replace('/(tabs)/scan')} style={styles.iconButton}>
            <Icon name="x" size={20} color={Colors.ink} />
          </Pressable>
          <Pressable
            onPress={() => {
              if (!scanId) return;
              toggleWatchlist(scanId);
              track('watchlist_added', { scan_id: scanId });
            }}
            style={styles.iconButton}
            accessibilityLabel="Add to watchlist"
          >
            <Icon name="star" size={20} color={isWatchlisted ? Colors.brass : Colors.inkFaint} />
          </Pressable>
        </View>

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]} />
        )}

        <Animated.View entering={FadeInDown.duration(400).delay(50)} style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.itemName}>{identified.name}</Text>
            <Text style={styles.confidence}>{Math.round(identified.confidence * 100)}% match</Text>
          </View>
          {identified.brand ? <Text style={styles.brand}>{identified.brand}</Text> : null}

          {identified.needs_better_photo && identified.photo_tip ? (
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>{identified.photo_tip}</Text>
              <Pressable
                onPress={() => {
                  track('scan_started', { retake: 'tag_photo' });
                  router.push({ pathname: '/camera', params: { addTag: '1' } });
                }}
              >
                <Text style={styles.tipAction}>Snap the tag for a better match</Text>
              </Pressable>
            </View>
          ) : null}
        </Animated.View>

        {revealStage >= 1 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
            <Text style={styles.sectionLabel}>Estimated value ({comps.count} listings)</Text>
            <PriceRangeBar low={comps.low} median={comps.median} high={comps.high} />
            <Text style={styles.estimateNote}>
              Estimated sold price: ${comps.estimated_sold.toFixed(2)} (0.75x median ask — an estimate,
              not a guarantee)
            </Text>
          </Animated.View>
        )}

        {revealStage >= 1 && (
          <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.card}>
            <Text style={styles.sectionLabel}>Condition</Text>
            <View style={styles.segmented}>
              {CONDITIONS.map((c) => {
                const active = c.key === condition;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => {
                      setCondition(c.key);
                      commitAdjustment(c.key, buyPriceInput);
                    }}
                    style={[styles.segment, active && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, styles.buyPriceLabel]}>What&apos;d you pay?</Text>
            <View style={styles.buyPriceRow}>
              <Text style={styles.buyPricePrefix}>$</Text>
              <PriceInput
                value={buyPriceInput}
                onChange={(v) => {
                  setBuyPriceInput(v);
                  commitAdjustment(condition, v);
                }}
              />
            </View>

            <View style={styles.profitRow}>
              <View>
                <Text style={styles.profitLabel}>Net profit ({PLATFORM_LABELS[platform]})</Text>
                <PriceText
                  value={breakdown.netProfit}
                  style={[styles.profitValue, breakdown.netProfit < 0 && styles.profitNegative]}
                />
              </View>
              <View style={styles.feeBreakdown}>
                <Text style={styles.feeLine}>Fee: ${breakdown.platformFee.toFixed(2)}</Text>
                <Text style={styles.feeLine}>Shipping: ${breakdown.shipping.toFixed(2)}</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {revealStage >= 2 && (
          <View style={styles.verdictWrap}>
            <VerdictStamp verdict={verdict} showConfetti={showConfetti} />
          </View>
        )}

        {revealStage >= 2 && comps.sample_listings.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
            <Text style={styles.sectionLabel}>Sample listings</Text>
            {comps.sample_listings.slice(0, 4).map((l, i) => (
              <Pressable
                key={i}
                onPress={() => handleOpenListing(l.url)}
                style={styles.listingRow}
              >
                <Text style={styles.listingTitle} numberOfLines={1}>{l.title}</Text>
                <Text style={styles.listingPrice}>${l.price.toFixed(2)}</Text>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {revealStage >= 2 && (
          <View style={styles.actions}>
            <Button title="Scan another" onPress={() => router.replace('/camera')} />
            <Button
              title="Share result"
              variant="ghost"
              onPress={() => {
                track('share_card_exported', { scan_id: scanId });
                router.push({ pathname: '/share/[scanId]', params: { scanId: scanId ?? '' } });
              }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PriceInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={(t: string) => onChange(t.replace(/[^0-9.]/g, ''))}
      placeholder="0.00"
      keyboardType="decimal-pad"
      style={styles.buyPriceInput}
      placeholderTextColor={Colors.inkFaint}
      accessibilityLabel="What did you pay for this item"
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  scroll: { paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: 260, backgroundColor: Colors.paperEdge },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  card: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.paper,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm },
  itemName: { ...Type.heading, flex: 1 },
  confidence: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.inkFaint },
  brand: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.inkSoft },
  tipBox: {
    backgroundColor: Colors.maybeSoft,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  tipText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.ink },
  tipAction: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.maybe },
  sectionLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.inkSoft },
  estimateNote: { fontFamily: Fonts.body, fontSize: 12, color: Colors.inkFaint },
  segmented: { flexDirection: 'row', gap: Spacing.xs },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: Colors.flipSoft, borderColor: Colors.flip },
  segmentLabel: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.inkSoft },
  segmentLabelActive: { color: Colors.flip, fontFamily: Fonts.bodySemibold },
  buyPriceLabel: { marginTop: Spacing.sm },
  buyPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.cream,
  },
  buyPricePrefix: { fontFamily: Fonts.monoBold, fontSize: 18, color: Colors.inkSoft },
  buyPriceInput: { flex: 1, fontFamily: Fonts.monoBold, fontSize: 18, paddingVertical: Spacing.sm, color: Colors.ink },
  profitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: Spacing.sm },
  profitLabel: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.inkSoft, marginBottom: Spacing.xs },
  profitValue: { fontSize: 28, color: Colors.flip },
  profitNegative: { color: Colors.skip },
  feeBreakdown: { alignItems: 'flex-end' },
  feeLine: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.inkFaint },
  verdictWrap: { alignItems: 'center', paddingVertical: Spacing.lg },
  listingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.paperEdge,
  },
  listingTitle: { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.inkSoft },
  listingPrice: { fontFamily: Fonts.monoBold, fontSize: 13, color: Colors.ink },
  actions: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
});
