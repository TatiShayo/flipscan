// Onboarding 4/4 — camera permission w/ explainer, then straight to camera (BUILD_PROMPT:
// "get to first scan <30s"). Denial doesn't dead-end the app: user lands on the scan tab,
// which shows its own inline permission prompt if still denied.
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import { OnboardingShell } from '@/components/OnboardingShell';
import { Button } from '@/components/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useSettingsStore } from '@/store/settingsStore';
import { track } from '@/lib/analytics';

export default function Permission() {
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const [, requestPermission] = useCameraPermissions();

  const finish = () => {
    completeOnboarding();
    track('onboarding_completed');
    router.replace('/(tabs)/scan');
  };

  return (
    <OnboardingShell
      step={4}
      totalSteps={4}
      title="One last thing"
      subtitle="FlipScan needs your camera to identify items. Photos are analyzed and kept for your scan history only — never sold, never shared."
      footer={
        <View style={styles.footerStack}>
          <Button
            title="Allow camera access"
            onPress={async () => {
              await requestPermission();
              finish();
            }}
          />
          <Button title="Not now" variant="ghost" onPress={finish} />
        </View>
      }
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Why we ask</Text>
        <Text style={styles.cardBody}>
          Every scan starts with a photo. We downscale it on your device before upload, and
          it&apos;s deleted from our servers after 90 days — sooner if you delete your data
          anytime in Settings.
        </Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.paper,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    padding: Spacing.lg,
  },
  cardTitle: { fontFamily: Fonts.displayBold, fontSize: 16, color: Colors.ink, marginBottom: Spacing.sm },
  cardBody: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 20, color: Colors.inkSoft },
  footerStack: { gap: Spacing.sm },
});
