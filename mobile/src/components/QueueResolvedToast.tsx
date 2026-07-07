// In-app toast for the offline queue (BUILD_PROMPT §13 "notify when the result lands").
// No push infra exists yet (NEEDS HUMAN), so a queued scan that resolves on reconnect
// surfaces as this tasteful slide-down banner instead of a system notification.
//
// Driven by useOfflineQueueProcessor's monotonic `resolvedCount`. The inner Toast is
// remounted via `key` on each new batch, so every batch gets a fresh slide-in that
// auto-dismisses — this remount pattern (same as VerdictStamp) sidesteps the
// React-Compiler lint rules that forbid setState / shared-value writes inside an effect
// that also depends on them.
import { useEffect, useState } from 'react';
import { Text, StyleSheet, Pressable, AccessibilityInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

const VISIBLE_MS = 4200;
const HIDDEN_Y = -140;

// Presentational toast — always visible on mount, slides in, then slides out and calls
// onDone. Mounted/unmounted per batch by the wrapper below.
function Toast({ count, onDone }: { count: number; onDone: () => void }) {
  const translateY = useSharedValue(HIDDEN_Y);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
    AccessibilityInfo.announceForAccessibility?.(
      `${count} queued ${count === 1 ? 'scan' : 'scans'} finished.`,
    );
    // Auto-dismiss: hold, then slide back out and unmount via onDone.
    translateY.value = withDelay(
      VISIBLE_MS,
      withTiming(HIDDEN_Y, { duration: 220 }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
    // Fresh mount per batch; the shared value + callback are stable for this mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, animatedStyle]} pointerEvents="box-none">
      <SafeAreaView edges={['top']} pointerEvents="box-none">
        <Pressable
          onPress={() => {
            onDone();
            router.push('/(tabs)/history');
          }}
          style={styles.toast}
          accessibilityRole="button"
          accessibilityLabel={`${count} queued ${count === 1 ? 'scan' : 'scans'} finished. Open history.`}
        >
          <Icon name="check" size={18} color={Colors.flip} />
          <Text style={styles.text} numberOfLines={1}>
            {count === 1 ? 'Your queued scan is ready' : `${count} queued scans are ready`}
          </Text>
          <Text style={styles.cta}>View</Text>
        </Pressable>
      </SafeAreaView>
    </Animated.View>
  );
}

// Public wrapper: shows the toast whenever `resolvedCount` advances past the last batch we
// dismissed. `dismissedAt` is only ever set from the onDone event (a user tap or the
// animation-complete callback) — never inside an effect — so we stay clear of the
// setState-in-effect rule.
export function QueueResolvedToast({ resolvedCount }: { resolvedCount: number }) {
  const [dismissedAt, setDismissedAt] = useState(0);

  if (resolvedCount <= 0 || resolvedCount === dismissedAt) return null;

  return (
    <Toast
      key={resolvedCount}
      count={resolvedCount}
      onDone={() => setDismissedAt(resolvedCount)}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  toast: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.flipSoft,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  text: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.ink,
  },
  cta: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 14,
    color: Colors.flip,
  },
});
