// Onboarding stack — 4 screens, no back-swipe-to-dismiss confusion, no headers (each
// screen owns its own progress dots + back affordance for full control over pacing).
import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.cream },
        animation: 'slide_from_right',
        gestureEnabled: false,
      }}
    />
  );
}
