// The hard paywall (BUILD_PROMPT §6 + PLAYBOOK 4.1): shown after the 3 free scans are
// exhausted. Personalizes the pitch with the user's OWN found-profit total (their real
// scan history), not generic promises. RevenueCat is behind CONFIGURED.revenueCat — runs
// on a mock entitlement flow until EXPO_PUBLIC_RC_IOS_KEY/_ANDROID_KEY land (NEEDS HUMAN).
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PriceText } from '@/components/PriceText';
import { useScanStore } from '@/store/scanStore';
import { CONFIGURED } from '@/config/env';
import { track } from '@/lib/analytics';
import { purchaseTopup, purchaseWeekly, purchaseAnnual, restorePurchases } from '@/lib/purchases';

type Plan = 'weekly' | 'annual';

export default function Paywall() {
  const potentialProfitFound = useScanStore((s) => s.potentialProfitFound);
  const historyCount = useScanStore((s) => s.history.length);
  const grantTopup = useScanStore((s) => s.grantTopup);
  const [plan, setPlan] = useState<Plan>('weekly');
  const [busy, setBusy] = useState(false);

  const found = potentialProfitFound();

  // Fire once per mount (BUILD_PROMPT cross-cutting analytics requirement: "paywall view").
  // Deliberately excludes `found`/`historyCount` from deps -- this should log the pitch
  // shown at open, not re-fire if the underlying scan history changes while it's open.
  useEffect(() => {
    track('paywall_viewed', { potential_profit_found: found, history_count: historyCount });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubscribe = async () => {
    setBusy(true);
    track('trial_started', { plan });
    const result = plan === 'weekly' ? await purchaseWeekly() : await purchaseAnnual();
    setBusy(false);
    if (result.ok) {
      track('purchase_completed', { plan });
      router.back();
    }
  };

  const handleTopup = async () => {
    setBusy(true);
    const result = await purchaseTopup();
    setBusy(false);
    if (result.ok) {
      grantTopup(result.scans);
      track('topup_purchased', { scans: result.scans });
      router.back();
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    const result = await restorePurchases();
    setBusy(false);
    if (result.ok) {
      track('restore_completed');
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} accessibilityLabel="Close">
          <Icon name="x" size={20} color={Colors.ink} />
        </Pressable>

        <View style={styles.hero}>
          {historyCount > 0 ? (
            <>
              <Text style={styles.heroLabel}>Your {historyCount} free scans found</Text>
              <PriceText value={found} style={styles.heroValue} />
              <Text style={styles.heroCaption}>in potential profit. Keep scanning to find more.</Text>
            </>
          ) : (
            <>
              <Text style={styles.heroLabel}>Unlock unlimited scans</Text>
              <Text style={styles.heroCaption}>Never walk past an underpriced find again.</Text>
            </>
          )}
        </View>

        <View style={styles.plans}>
          <PlanCard
            title="Weekly"
            price="$7.99/wk"
            detail="3-day free trial"
            active={plan === 'weekly'}
            onPress={() => setPlan('weekly')}
          />
          <PlanCard
            title="Annual"
            price="$49.99/yr"
            detail="Save 88% · best value"
            active={plan === 'annual'}
            onPress={() => setPlan('annual')}
            badge="Includes CSV export"
          />
        </View>

        <Button title={busy ? 'Please wait…' : 'Start free trial'} onPress={handleSubscribe} disabled={busy} />
        <Pressable onPress={handleTopup} disabled={busy} style={styles.topupLink}>
          <Text style={styles.topupText}>Not ready to subscribe? Get 20 scans for $4.99</Text>
        </Pressable>

        <View style={styles.testimonials}>
          <Text style={styles.testimonialsLabel}>What resellers say (placeholder — pending real reviews)</Text>
          <TestimonialCard quote="Paid for itself on the first thrift run." name="— placeholder testimonial" />
          <TestimonialCard quote="I stopped guessing and started flipping." name="— placeholder testimonial" />
        </View>

        <View style={styles.footer}>
          <Pressable onPress={handleRestore} disabled={busy}>
            <Text style={styles.footerLink}>Restore purchases</Text>
          </Pressable>
          {!CONFIGURED.revenueCat && <Text style={styles.mockNotice}>Running on a mock entitlement (dev only)</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({
  title,
  price,
  detail,
  active,
  onPress,
  badge,
}: {
  title: string;
  price: string;
  detail: string;
  active: boolean;
  onPress: () => void;
  badge?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.planCard, active && styles.planCardActive]}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
    >
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Text style={[styles.planTitle, active && styles.planTitleActive]}>{title}</Text>
      <Text style={styles.planPrice}>{price}</Text>
      <Text style={styles.planDetail}>{detail}</Text>
    </Pressable>
  );
}

function TestimonialCard({ quote, name }: { quote: string; name: string }) {
  return (
    <View style={styles.testimonialCard}>
      <Text style={styles.testimonialQuote}>&ldquo;{quote}&rdquo;</Text>
      <Text style={styles.testimonialName}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  scroll: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.xxxl },
  closeButton: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', gap: Spacing.xs },
  heroLabel: { ...Type.body, color: Colors.inkSoft, textAlign: 'center' },
  heroValue: { fontSize: 44, color: Colors.flip },
  heroCaption: { ...Type.bodySm, color: Colors.inkFaint, textAlign: 'center' },
  plans: { flexDirection: 'row', gap: Spacing.md },
  planCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.paperEdge,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.paper,
    gap: Spacing.xs,
  },
  planCardActive: { borderColor: Colors.flip, backgroundColor: Colors.flipSoft },
  planTitle: { fontFamily: Fonts.bodySemibold, fontSize: 14, color: Colors.ink },
  planTitleActive: { color: Colors.flip },
  planPrice: { fontFamily: Fonts.monoBold, fontSize: 20, color: Colors.ink },
  planDetail: { fontFamily: Fonts.body, fontSize: 11, color: Colors.inkFaint },
  badge: {
    position: 'absolute',
    top: -10,
    right: Spacing.md,
    backgroundColor: Colors.brass,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  badgeText: { fontFamily: Fonts.bodySemibold, fontSize: 9, color: Colors.white },
  topupLink: { alignItems: 'center', paddingVertical: Spacing.sm },
  topupText: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.inkSoft, textDecorationLine: 'underline' },
  testimonials: { gap: Spacing.sm },
  testimonialsLabel: { fontFamily: Fonts.bodyMedium, fontSize: 11, color: Colors.inkFaint },
  testimonialCard: {
    backgroundColor: Colors.paper,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  testimonialQuote: { fontFamily: Fonts.body, fontSize: 13, color: Colors.ink, fontStyle: 'italic' },
  testimonialName: { fontFamily: Fonts.bodyMedium, fontSize: 11, color: Colors.inkFaint },
  footer: { alignItems: 'center', gap: Spacing.xs },
  footerLink: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.inkSoft },
  mockNotice: { fontFamily: Fonts.bodyMedium, fontSize: 10, color: Colors.inkFaint },
});
