// Every price/stat/counter in the app renders through this component: JetBrains Mono
// numerals (PLAYBOOK 1.2 "tabular numerals" signal) with an optional count-up odometer
// animation (PLAYBOOK 1.4: "numbers never just appear"). Implemented with a non-editable
// Animated TextInput driving the `text` native prop directly on the UI thread — the
// standard Reanimated pattern for animating text content without JS-thread re-renders.
import { useEffect, type ComponentType } from 'react';
import { StyleSheet, TextInput, type StyleProp, type TextStyle, type TextInputProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';

// Reanimated's `text` native prop (used to drive TextInput content from the UI thread) is
// intentionally untyped on TextInputProps upstream; this narrow cast is the documented
// workaround (see Reanimated docs "Animations on TextInput") rather than a type escape hatch.
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput) as ComponentType<
  TextInputProps & { animatedProps?: Partial<{ text: string }> }
>;

interface PriceTextProps {
  value: number;
  prefix?: string;
  style?: StyleProp<TextStyle>;
  animate?: boolean;
  durationMs?: number;
  testID?: string;
}

export function PriceText({
  value,
  prefix = '$',
  style,
  animate = true,
  durationMs = 700,
  testID,
}: PriceTextProps) {
  const progress = useSharedValue(animate ? 0 : value);

  useEffect(() => {
    progress.value = animate
      ? withTiming(value, { duration: durationMs, easing: Easing.out(Easing.cubic) })
      : value;
  }, [value, animate, durationMs, progress]);

  const animatedProps = useAnimatedProps<{ text: string }>(() => ({
    text: `${prefix}${progress.value.toFixed(2)}`,
  }));

  return (
    <AnimatedTextInput
      testID={testID}
      editable={false}
      underlineColorAndroid="transparent"
      defaultValue={`${prefix}${value.toFixed(2)}`}
      animatedProps={animatedProps}
      style={StyleSheet.flatten([styles.base, style])}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: Fonts.monoBold,
    padding: 0,
    margin: 0,
  },
});
