// Shared chrome for the 4 onboarding screens: step dots + safe-area padding + CTA slot.
// Each screen supplies its own hero content; this keeps pacing/dots consistent and the
// "get to first scan <30s" budget honest (BUILD_PROMPT §7) by never adding chrome weight.
import type { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Type } from '@/constants/theme';

interface OnboardingShellProps {
  step: number; // 1-based
  totalSteps: number;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  footer: ReactNode;
}

export function OnboardingShell({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  footer,
}: OnboardingShellProps) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.dots}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i + 1 === step ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>
      <View style={styles.body}>
        <Text style={Type.title}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, Type.body]}>{subtitle}</Text> : null}
        <View style={styles.content}>{children}</View>
      </View>
      <View style={styles.footer}>{footer}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, paddingHorizontal: Spacing.xl },
  dots: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.xl },
  dot: { height: 6, width: 6, borderRadius: 3 },
  dotActive: { backgroundColor: Colors.flip, width: 20 },
  dotInactive: { backgroundColor: Colors.paperEdge },
  body: { flex: 1 },
  subtitle: { color: Colors.inkSoft, marginTop: Spacing.sm, fontFamily: Fonts.body },
  content: { flex: 1, marginTop: Spacing.xl },
  footer: { paddingBottom: Spacing.lg },
});
