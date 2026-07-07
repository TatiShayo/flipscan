// The 3-stage animated progress screen — "Identifying… Checking N listings… Calculating
// your profit…" (PLAYBOOK signature interaction, stage 1 of 2; stage 2 is the result-card
// reveal in app/result/[scanId].tsx). Runs the real scan request (edge fn or local mock,
// same call site) while the staged copy plays, then hands off to the result screen.
import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useCapturedImageStore } from '@/store/captureStore';
import { requestScan } from '@/lib/scanApi';
import { deviceHash } from '@/lib/device';
import { useScanStore } from '@/store/scanStore';
import { computeProfit } from '@/constants/profit';
import { useSettingsStore } from '@/store/settingsStore';
import { track } from '@/lib/analytics';
import { captureError } from '@/lib/monitoring';
import type { ScanHistoryItem } from '@/types/scan';

const STAGES = ['Identifying…', 'Checking listings…', 'Calculating your profit…'] as const;

export default function ScanningScreen() {
  const [stageIndex, setStageIndex] = useState(0);
  const pending = useCapturedImageStore((s) => s.pending);
  const setResult = useCapturedImageStore((s) => s.setResult);
  const addHistoryItem = useScanStore((s) => s.addHistoryItem);
  const defaultPlatform = useSettingsStore((s) => s.defaultPlatform);
  const ran = useRef(false);

  const pulse = useSharedValue(0.4);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [pulse]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  useEffect(() => {
    if (!pending || ran.current) {
      if (!pending) router.replace('/(tabs)/scan');
      return;
    }
    ran.current = true;

    let cancelled = false;
    const stageTimers = [
      setTimeout(() => !cancelled && setStageIndex(1), 700),
      setTimeout(() => !cancelled && setStageIndex(2), 1600),
    ];

    (async () => {
      const hash = await deviceHash();
      const outcome = await requestScan({
        images: pending.images.map((i) => i.base64),
        deviceHash: hash,
        mode: pending.mode,
        barcode: pending.barcode,
        mockVariant: pending.mockVariant,
      });
      if (cancelled) return;

      if (!outcome.ok) {
        track('scan_failed', { error: outcome.error.error });
        if (outcome.error.error === 'paywall') {
          router.replace('/paywall');
        } else {
          captureError(new Error(outcome.error.error), { message: outcome.error.message });
          router.replace({
            pathname: '/(tabs)/scan',
          });
        }
        return;
      }

      const { result } = outcome;
      const imageUri = pending.images[0]?.uri ?? null;
      const breakdown = computeProfit({
        estimatedSold: result.comps.estimated_sold,
        category: result.identified.category,
        condition: 'good',
        buyPrice: null,
        platform: defaultPlatform,
      });
      const historyItem: ScanHistoryItem = {
        id: result.scan_id,
        createdAt: new Date().toISOString(),
        imageUri,
        identified: result.identified,
        comps: result.comps,
        verdict: result.verdict,
        condition: 'good',
        buyPrice: null,
        platform: defaultPlatform,
        netProfit: breakdown.netProfit,
        status: 'complete',
      };
      addHistoryItem(historyItem);
      setResult(result, imageUri, pending.images);
      track('scan_completed', {
        verdict: result.verdict,
        confidence: result.identified.confidence,
        category: result.identified.category,
      });
      track('verdict_shown', { verdict: result.verdict });

      // let the final stage read for a beat before the reveal
      setTimeout(() => {
        if (!cancelled) router.replace(`/result/${result.scan_id}`);
      }, 400);
    })().catch((e) => {
      captureError(e);
      if (!cancelled) router.replace('/(tabs)/scan');
    });

    return () => {
      cancelled = true;
      stageTimers.forEach(clearTimeout);
    };
  }, [pending, addHistoryItem, setResult, defaultPlatform]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Animated.View style={[styles.dot, dotStyle]} />
        <Animated.Text
          key={stageIndex}
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(150)}
          style={styles.stageText}
        >
          {STAGES[stageIndex]}
        </Animated.Text>
        <View style={styles.stepsRow}>
          {STAGES.map((_, i) => (
            <View key={i} style={[styles.stepDot, i <= stageIndex && styles.stepDotActive]} />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, paddingHorizontal: Spacing.xl },
  dot: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.flipSoft,
    borderWidth: 2,
    borderColor: Colors.flip,
  },
  stageText: { ...Type.heading, textAlign: 'center' },
  stepsRow: { flexDirection: 'row', gap: Spacing.sm },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.paperEdge },
  stepDotActive: { backgroundColor: Colors.flip },
});
