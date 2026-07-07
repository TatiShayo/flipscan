// Entry gate: onboarding (first run) vs straight into the tab shell. Kept as a redirect
// rather than logic in _layout so expo-router's typed routes stay simple.
import { Redirect } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';

export default function Index() {
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);
  return <Redirect href={onboardingCompleted ? '/(tabs)/scan' : '/onboarding/welcome'} />;
}
