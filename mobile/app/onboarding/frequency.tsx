// Onboarding 3/4 — "How much do you thrift per month?" Personalization input only
// (BUILD_PROMPT §7); answer is stored for later copy (e.g. recap/paywall personalization)
// but never gates anything.
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { OnboardingShell } from '@/components/OnboardingShell';
import { Button } from '@/components/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useSettingsStore } from '@/store/settingsStore';
import { track } from '@/lib/analytics';

const OPTIONS = ['Just started', '1-3 trips', 'Weekly regular', 'Full-time flipper'];

export default function Frequency() {
  const setThriftFrequency = useSettingsStore((s) => s.setThriftFrequency);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <OnboardingShell
      step={3}
      totalSteps={4}
      title="How much do you thrift per month?"
      subtitle="We'll tailor tips and the trending tab to your pace."
      footer={
        <Button
          title="Continue"
          disabled={!selected}
          onPress={() => {
            track('onboarding_step_viewed', { step: 3, frequency: selected ?? undefined });
            router.push('/onboarding/permission');
          }}
        />
      }
    >
      <View style={styles.list}>
        {OPTIONS.map((opt) => {
          const active = opt === selected;
          return (
            <Pressable
              key={opt}
              onPress={() => {
                setSelected(opt);
                setThriftFrequency(opt);
              }}
              style={[styles.row, active && styles.rowActive]}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
            >
              <Text style={[styles.label, active && styles.labelActive]}>{opt}</Text>
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
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    backgroundColor: Colors.paper,
  },
  rowActive: { borderColor: Colors.flip, backgroundColor: Colors.flipSoft },
  label: { fontFamily: Fonts.bodyMedium, fontSize: 16, color: Colors.ink },
  labelActive: { color: Colors.flip, fontFamily: Fonts.bodySemibold },
});
