// Settings — default platform picker, delete-my-data (self-serve deletion, PLAYBOOK 2.7),
// privacy policy link, restore purchases, and a dev-only "what's still mocked" banner so
// nobody mistakes fixture data for a real backend during development.
import { useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useSettingsStore } from '@/store/settingsStore';
import { useScanStore } from '@/store/scanStore';
import { PLATFORM_FEES, PLATFORM_LABELS, type Platform } from '@/constants/profit';
import { missingIntegrations } from '@/config/env';
import { supabase } from '@/lib/supabase';
import { restorePurchases } from '@/lib/purchases';
import { track } from '@/lib/analytics';

const PLATFORMS = Object.keys(PLATFORM_FEES) as Platform[];
const PRIVACY_URL = 'https://flipscan.app/privacy'; // NEEDS HUMAN: landing page not yet deployed

export default function SettingsTab() {
  const defaultPlatform = useSettingsStore((s) => s.defaultPlatform);
  const setDefaultPlatform = useSettingsStore((s) => s.setDefaultPlatform);
  const [deleting, setDeleting] = useState(false);
  const missing = missingIntegrations();

  const clearLocalState = useScanStore.persist.clearStorage;

  const handleDeleteData = () => {
    Alert.alert(
      'Delete all your data?',
      'This permanently deletes your scan history, watchlist, and usage records. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              if (supabase) {
                await supabase.rpc('delete_my_data');
              }
              clearLocalState?.();
              useScanStore.setState({ history: [], watchlist: [], freeScansUsed: 0, topupRemaining: 0 });
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleRestore = async () => {
    const result = await restorePurchases();
    track('restore_completed');
    Alert.alert(result.ok ? 'Purchases restored' : 'Nothing to restore', undefined);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={Type.title}>Settings</Text>

        {missing.length > 0 && (
          <View style={styles.devBanner}>
            <Text style={styles.devBannerText}>
              Dev mode: running on mocks for {missing.join(', ')}
            </Text>
          </View>
        )}

        <Section title="Default platform">
          <View style={styles.platformList}>
            {PLATFORMS.map((p) => {
              const active = p === defaultPlatform;
              return (
                <Pressable
                  key={p}
                  onPress={() => setDefaultPlatform(p)}
                  style={[styles.platformRow, active && styles.platformRowActive]}
                >
                  <Text style={[styles.platformLabel, active && styles.platformLabelActive]}>
                    {PLATFORM_LABELS[p]}
                  </Text>
                  <Text style={styles.platformFee}>{Math.round(PLATFORM_FEES[p] * 100)}% fee</Text>
                  {active && <Icon name="check" size={16} color={Colors.flip} />}
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Account">
          <Button title="Restore purchases" variant="ghost" onPress={handleRestore} />
        </Section>

        <Section title="Privacy">
          <Pressable
            style={styles.linkRow}
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
          >
            <Text style={styles.linkText}>Privacy policy</Text>
            <Icon name="chevron-right" size={16} color={Colors.inkFaint} />
          </Pressable>
          <Button
            title={deleting ? 'Deleting…' : 'Delete my data'}
            variant="destructive"
            disabled={deleting}
            onPress={handleDeleteData}
          />
          <Text style={styles.privacyNote}>
            Deletes your scans, watchlist, and usage records. Photos are also purged from
            storage within 24 hours.
          </Text>
        </Section>

        <Text style={styles.version}>FlipScan v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  scroll: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.xxxl },
  devBanner: {
    backgroundColor: Colors.maybeSoft,
    borderRadius: Radius.sm,
    padding: Spacing.md,
  },
  devBannerText: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.maybe },
  section: { gap: Spacing.sm },
  sectionTitle: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5 },
  platformList: { gap: Spacing.xs },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    backgroundColor: Colors.paper,
  },
  platformRowActive: { borderColor: Colors.flip, backgroundColor: Colors.flipSoft },
  platformLabel: { flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 15, color: Colors.ink },
  platformLabelActive: { color: Colors.flip, fontFamily: Fonts.bodySemibold },
  platformFee: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.inkFaint },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    backgroundColor: Colors.paper,
  },
  linkText: { fontFamily: Fonts.bodyMedium, fontSize: 15, color: Colors.ink },
  privacyNote: { fontFamily: Fonts.body, fontSize: 12, color: Colors.inkFaint, lineHeight: 16 },
  version: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.inkFaint, textAlign: 'center' },
});
