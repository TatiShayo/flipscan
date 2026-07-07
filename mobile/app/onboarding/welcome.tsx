// Onboarding 1/4 — "what it does". No demo GIF asset available yet (NEEDS HUMAN: brand
// assets); a static illustrative mock of the verdict-reveal stands in so the pitch is
// still concrete, not a wall of promise-copy (PLAYBOOK 1.1 bans generic hero sections).
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { OnboardingShell } from '@/components/OnboardingShell';
import { Button } from '@/components/Button';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { track } from '@/lib/analytics';

export default function Welcome() {
  return (
    <OnboardingShell
      step={1}
      totalSteps={4}
      title="Point. Scan. Know what it's worth."
      subtitle="FlipScan identifies thrift finds and checks live eBay prices before you buy."
      footer={
        <Button
          title="Show me"
          onPress={() => {
            track('onboarding_step_viewed', { step: 1 });
            router.push('/onboarding/platforms');
          }}
        />
      }
    >
      <View style={styles.mock}>
        <View style={styles.mockPhoto} />
        <View style={styles.mockRow}>
          <Text style={styles.mockLabel}>Patagonia Snap-T Fleece</Text>
          <Text style={styles.mockConfidence}>82% match</Text>
        </View>
        <View style={styles.mockVerdict}>
          <Text style={styles.mockVerdictText}>FLIP</Text>
        </View>
        <Text style={styles.mockPrice}>$58 median · 214 listings</Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  mock: {
    backgroundColor: Colors.paper,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  mockPhoto: {
    height: 160,
    borderRadius: Radius.md,
    backgroundColor: Colors.paperEdge,
  },
  mockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mockLabel: { ...Type.heading, flexShrink: 1 },
  mockConfidence: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.inkFaint },
  mockVerdict: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.flipSoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    transform: [{ rotate: '-3deg' }],
  },
  mockVerdictText: { color: Colors.flip, fontFamily: Fonts.displayBold, fontSize: 18, letterSpacing: 1 },
  mockPrice: { fontFamily: Fonts.mono, color: Colors.inkSoft, fontSize: 14 },
});
