// One brief, tasteful confetti burst — the ONLY confetti in the app (PLAYBOOK: reserved
// for FLIP verdicts >= $50). Implemented with plain Reanimated views rather than Skia's
// Canvas API: a dozen small rects is well within View perf budget, and it avoids pulling
// the Skia surface/paint API into a first-cut component for a decorative effect that
// fires once. Self-unmounts after the animation completes (no idle timer).
import { useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming, Easing } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

const PIECE_COLORS = [Colors.flip, Colors.brass, Colors.maybe, Colors.ink, Colors.flipSoft];
const PIECE_COUNT = 16;

interface ConfettiBurstProps {
  delayMs?: number;
}

export function ConfettiBurst({ delayMs = 0 }: ConfettiBurstProps) {
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), delayMs + 1400);
    return () => clearTimeout(t);
  }, [delayMs]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: PIECE_COUNT }).map((_, i) => (
        <ConfettiPiece key={i} index={i} totalWidth={width} delayMs={delayMs} />
      ))}
    </View>
  );
}

function ConfettiPiece({ index, totalWidth, delayMs }: { index: number; totalWidth: number; delayMs: number }) {
  const startX = (totalWidth / PIECE_COUNT) * index + (index % 2 === 0 ? 10 : -10);
  const fall = useSharedValue(0);
  const color = PIECE_COLORS[index % PIECE_COLORS.length];
  const drift = index % 2 === 0 ? 30 : -30;
  const rotateDeg = 180 + index * 23;

  useEffect(() => {
    fall.value = withDelay(
      delayMs + (index % 5) * 30,
      withTiming(1, { duration: 1000 + (index % 4) * 120, easing: Easing.in(Easing.quad) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - fall.value,
    transform: [
      { translateY: fall.value * 260 },
      { translateX: fall.value * drift },
      { rotate: `${fall.value * rotateDeg}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        { left: startX, backgroundColor: color, top: -20 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    width: 8,
    height: 12,
    borderRadius: 2,
  },
});
