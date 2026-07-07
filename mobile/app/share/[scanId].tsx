// Share card (BUILD_PROMPT §8): the TikTok growth loop artifact. Styled like a premium
// auction tag — kraft-paper texture (warm paper tones, dashed "ticket" edge), mono
// numerals, "Paid $4 -> Worth $85", FlipScan wordmark for attribution (PLAYBOOK 3.4:
// every delivered artifact carries tasteful attribution). IG-story sized (1080x1920,
// rendered at a 0.28 preview scale so it fits on screen; captured at full resolution).
import { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot, { captureRef, type ViewShotRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Radius, Spacing, Type, Verdict } from '@/constants/theme';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { useCapturedImageStore } from '@/store/captureStore';
import { useScanStore } from '@/store/scanStore';
import { track } from '@/lib/analytics';

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const PREVIEW_SCALE = 0.28;

export default function ShareCardScreen() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const lastResult = useCapturedImageStore((s) => s.lastResult);
  const lastImageUri = useCapturedImageStore((s) => s.lastImageUri);
  const history = useScanStore((s) => s.history);
  const shotRef = useRef<ViewShotRef>(null);
  const [busy, setBusy] = useState(false);

  const historyItem = useMemo(() => history.find((h) => h.id === scanId), [history, scanId]);
  const isFresh = lastResult?.scan_id === scanId;

  const identified = isFresh ? lastResult!.identified : historyItem?.identified;
  const comps = isFresh ? lastResult!.comps : historyItem?.comps;
  const imageUri = isFresh ? lastImageUri : historyItem?.imageUri ?? null;
  const buyPrice = historyItem?.buyPrice ?? null;
  const verdict = historyItem?.verdict ?? lastResult?.verdict ?? 'maybe';
  const v = Verdict[verdict];

  if (!identified || !comps) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={Type.heading}>Nothing to share yet</Text>
          <Button title="Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const worth = comps.estimated_sold;
  const headline =
    buyPrice != null ? `Paid $${buyPrice.toFixed(0)} → Worth $${worth.toFixed(0)}` : `Worth $${worth.toFixed(0)}`;

  const handleShare = async () => {
    if (!shotRef.current || busy) return;
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const uri = await captureRef(shotRef, {
        result: 'tmpfile',
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        quality: 0.92,
        format: 'png',
      });
      track('share_card_exported', { scan_id: scanId, verdict });

      if (Platform.OS === 'web') {
        setBusy(false);
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        // Copy to a stable cache path with a friendly filename before handing to the OS
        // share sheet — captureRef's tmpfile result is a throwaway view-shot cache path.
        const dest = new File(Paths.cache, `flipscan-${scanId}.png`);
        if (dest.exists) dest.delete();
        const src = new File(uri);
        src.copy(dest);
        await Sharing.shareAsync(dest.uri, { mimeType: 'image/png', dialogTitle: 'Share your flip' });
      }
    } catch {
      // Non-fatal: user stays on the preview and can retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} accessibilityLabel="Close">
          <Icon name="x" size={20} color={Colors.ink} />
        </Pressable>
        <Text style={Type.heading}>Share your flip</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.previewWrap}>
        <View style={styles.previewFrame}>
          <ViewShot ref={shotRef} style={styles.cardAtFullSize}>
            <View style={styles.card}>
              <View style={styles.ticketEdgeTop} />
              <Text style={styles.brandmark}>FLIPSCAN</Text>

              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]} />
              )}

              <View style={styles.body}>
                <Text style={styles.headline}>{headline}</Text>
                <Text style={styles.itemName} numberOfLines={2}>{identified.name}</Text>
                {identified.brand ? <Text style={styles.itemBrand}>{identified.brand}</Text> : null}

                <View style={[styles.verdictChip, { backgroundColor: v.bg, borderColor: v.fg }]}>
                  <Text style={[styles.verdictChipText, { color: v.fg }]}>{v.label}</Text>
                </View>

                <View style={styles.statsRow}>
                  <Stat label="Listings" value={String(comps.count)} />
                  <Stat label="Median ask" value={`$${comps.median.toFixed(0)}`} />
                </View>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Scanned with FlipScan</Text>
              </View>
              <View style={styles.ticketEdgeBottom} />
            </View>
          </ViewShot>
        </View>
      </View>

      <View style={styles.actions}>
        <Button title={busy ? 'Preparing…' : 'Share'} onPress={handleShare} disabled={busy} />
        <Button title="Done" variant="ghost" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  previewWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  previewFrame: {
    width: CARD_WIDTH * PREVIEW_SCALE,
    height: CARD_HEIGHT * PREVIEW_SCALE,
    overflow: 'hidden',
    borderRadius: Radius.lg,
    shadowColor: Colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  // Rendered at true 1080x1920, then visually scaled down for the on-screen preview so
  // captureRef still produces a full-resolution IG-story-sized PNG.
  cardAtFullSize: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    transform: [{ scale: PREVIEW_SCALE }],
    transformOrigin: 'top left',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#E8D9BC', // kraft-paper tone, distinct from in-app cream
    alignItems: 'center',
    paddingTop: 64,
  },
  ticketEdgeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    borderBottomWidth: 4,
    borderStyle: 'dashed',
    borderColor: 'rgba(33,29,24,0.18)',
  },
  ticketEdgeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 10,
    borderTopWidth: 4,
    borderStyle: 'dashed',
    borderColor: 'rgba(33,29,24,0.18)',
  },
  brandmark: {
    fontFamily: Fonts.monoBold,
    fontSize: 28,
    letterSpacing: 6,
    color: Colors.ink,
    marginBottom: 40,
  },
  photo: {
    width: CARD_WIDTH - 160,
    height: CARD_WIDTH - 160,
    borderRadius: 24,
    backgroundColor: Colors.paperEdge,
  },
  photoPlaceholder: {},
  body: { width: CARD_WIDTH - 160, alignItems: 'center', marginTop: 56, gap: 20 },
  headline: {
    fontFamily: Fonts.monoBold,
    fontSize: 64,
    color: Colors.flip,
    textAlign: 'center',
    letterSpacing: -1,
  },
  itemName: {
    fontFamily: Fonts.display,
    fontSize: 40,
    color: Colors.ink,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  itemBrand: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 28,
    color: Colors.inkSoft,
  },
  verdictChip: {
    borderWidth: 3,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginTop: 8,
  },
  verdictChipText: {
    fontFamily: Fonts.displayBold,
    fontSize: 36,
    letterSpacing: 3,
  },
  statsRow: { flexDirection: 'row', gap: 64, marginTop: 24 },
  stat: { alignItems: 'center' },
  statValue: { fontFamily: Fonts.monoBold, fontSize: 32, color: Colors.ink },
  statLabel: { fontFamily: Fonts.bodyMedium, fontSize: 18, color: Colors.inkFaint, marginTop: 4 },
  footer: { position: 'absolute', bottom: 64, alignItems: 'center' },
  footerText: { fontFamily: Fonts.bodyMedium, fontSize: 22, color: Colors.inkFaint, letterSpacing: 1 },
  actions: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, gap: Spacing.sm },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
});
