// THE signature interaction (PLAYBOOK art direction): the verdict "stamps down like a
// rubber stamp — slight rotation, scale-settle, heavy haptic thunk." Mounts already
// rotated + oversized + transparent, then springs to its resting rotation/scale/opacity
// with a heavy impact haptic fired at the moment it lands. FLIP verdicts >= $50 get one
// brief confetti burst (Skia) — the only confetti in the app, per the playbook.
import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import type { Verdict } from '@/types/scan';
import { ConfettiBurst } from '@/components/ConfettiBurst';

const VERDICT_META: Record<Verdict, { label: string; fg: string; bg: string; border: string; rotate: string }> = {
  flip: { label: 'FLIP', fg: Colors.flip, bg: Colors.flipSoft, border: Colors.flip, rotate: '-6deg' },
  maybe: { label: 'MAYBE', fg: Colors.maybe, bg: Colors.maybeSoft, border: Colors.maybe, rotate: '4deg' },
  skip: { label: 'SKIP', fg: Colors.skip, bg: Colors.skipSoft, border: Colors.skip, rotate: '-4deg' },
};

interface VerdictStampProps {
  verdict: Verdict;
  showConfetti?: boolean;
  delayMs?: number;
}

export function VerdictStamp({ verdict, showConfetti = false, delayMs = 0 }: VerdictStampProps) {
  const meta = VERDICT_META[verdict];
  const scale = useSharedValue(2.4);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    const targetRotate = parseFloat(meta.rotate);
    opacity.value = withDelay(delayMs, withTiming(1, { duration: 80 }));
    rotate.value = withDelay(
      delayMs,
      withSequence(
        withTiming(targetRotate * 1.4, { duration: 140, easing: Easing.out(Easing.ease) }),
        withTiming(targetRotate, { duration: 180, easing: Easing.out(Easing.back(1.8)) }),
      ),
    );
    scale.value = withDelay(
      delayMs,
      withSequence(
        withTiming(0.85, { duration: 160, easing: Easing.out(Easing.ease) }),
        withTiming(1.08, { duration: 120, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 120, easing: Easing.out(Easing.ease) }, (finished) => {
          if (finished) runOnJS(fireHaptic)();
        }),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verdict]);

  const stampStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View
        style={[styles.stamp, { backgroundColor: meta.bg, borderColor: meta.border }, stampStyle]}
      >
        <Text style={[styles.label, { color: meta.fg }]}>{meta.label}</Text>
      </Animated.View>
      {showConfetti && verdict === 'flip' && <ConfettiBurst delayMs={delayMs + 300} />}
    </View>
  );
}

function fireHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  stamp: {
    borderWidth: 3,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
  },
  label: {
    fontFamily: Fonts.displayBold,
    fontSize: 32,
    letterSpacing: 3,
  },
});
