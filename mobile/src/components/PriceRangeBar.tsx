// Price-range bar: low -> median -> high, fills left-to-right on mount (PLAYBOOK verdict-
// reveal spec: "the price-range bar fills left-to-right"). The condition adjuster
// (result screen) re-triggers this fill live as the user taps segments.
import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

interface PriceRangeBarProps {
  low: number;
  median: number;
  high: number;
  durationMs?: number;
}

export function PriceRangeBar({ low, median, high, durationMs = 900 }: PriceRangeBarProps) {
  const fill = useSharedValue(0);
  const range = Math.max(1, high - low);
  const medianPct = Math.min(100, Math.max(0, ((median - low) / range) * 100));

  useEffect(() => {
    fill.value = 0;
    fill.value = withTiming(medianPct, { duration: durationMs, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [low, median, high]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));

  return (
    <View style={styles.wrap}>
      <View style={styles.labelsRow}>
        <Text style={styles.label}>${low.toFixed(0)}</Text>
        <Text style={[styles.label, styles.labelMedian]}>${median.toFixed(0)} median</Text>
        <Text style={styles.label}>${high.toFixed(0)}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
        <View style={[styles.medianTick, { left: `${medianPct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.inkFaint },
  labelMedian: { color: Colors.ink, fontFamily: Fonts.monoBold },
  track: {
    height: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.paperEdge,
    overflow: 'visible',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: Radius.pill,
    backgroundColor: Colors.flip,
  },
  medianTick: {
    position: 'absolute',
    top: -3,
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: Colors.ink,
    marginLeft: -1.5,
  },
});
