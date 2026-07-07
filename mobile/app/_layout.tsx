// Root layout: loads the theme fonts, initializes analytics/monitoring facades (both
// no-op until their keys land — see NEEDS HUMAN in PROJECT_STATE.md), paints the cream
// canvas behind the whole app, and routes to onboarding vs the tab shell.
import { useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import {
  useFonts,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { Colors } from '@/constants/theme';
import { initAnalytics, track } from '@/lib/analytics';
import { initMonitoring } from '@/lib/monitoring';
import { ensureAnonSession } from '@/lib/supabase';
import { useOfflineQueueProcessor } from '@/lib/offlineQueue';
import { QueueResolvedToast } from '@/components/QueueResolvedToast';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    void initAnalytics();
    void initMonitoring();
    void ensureAnonSession();
    track('app_opened');
  }, []);

  const onLayout = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.cream }} onLayout={onLayout}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.cream } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="result/[scanId]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      </Stack>
    </View>
  );
}
