// Onboarding 2/4 — pick your default resale platform (drives fee math on every result).
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { OnboardingShell } from '@/components/OnboardingShell';
import { Button } from '@/components/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { PLATFORM_FEES, PLATFORM_LABELS, type Platform } from '@/constants/profit';
import { useSettingsStore } from '@/store/settingsStore';
import { track } from '@/lib/analytics';

const PLATFORMS = Object.keys(PLATFORM_FEES) as Platform[];

export default function Platforms() {
  const setDefaultPlatform = useSettingsStore((s) => s.setDefaultPlatform);
  const [selected, setSelected] = useState<Platform>('ebay');

  return (
    <OnboardingShell
      step={2}
      totalSteps={4}
      title="Where do you usually sell?"
      subtitle="We'll estimate fees and profit for this platform by default — change it anytime."
      footer={
        <Button
          title="Continue"
          onPress={() => {
            setDefaultPlatform(selected);
            track('onboarding_step_viewed', { step: 2, platform: selected });
            router.push('/onboarding/frequency');
          }}
        />
      }
    >
      <View style={styles.list}>
        {PLATFORMS.map((p) => {
          const active = p === selected;
          return (
            <Pressable
              key={p}
              onPress={() => {
                setSelected(p);
              }}
              style={[styles.row, active && styles.rowActive]}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
            >
              <Text style={[styles.label, active && styles.labelActive]}>
                {PLATFORM_LABELS[p]}
              </Text>
              <Text style={styles.fee}>{Math.round(PLATFORM_FEES[p] * 100)}% fee</Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    backgroundColor: Colors.paper,
  },
  rowActive: {
    borderColor: Colors.flip,
    backgroundColor: Colors.flipSoft,
  },
  label: { fontFamily: Fonts.bodyMedium, fontSize: 16, color: Colors.ink },
  labelActive: { color: Colors.flip, fontFamily: Fonts.bodySemibold },
  fee: { fontFamily: Fonts.mono, fontSize: 13, color: Colors.inkFaint },
});
