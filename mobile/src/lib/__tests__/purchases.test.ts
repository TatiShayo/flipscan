import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  purchaseWeekly,
  purchaseAnnual,
  purchaseTopup,
  restorePurchases,
  hasActiveEntitlement,
  setEntitlementForTests,
  MockPurchaseProvider,
  ENTITLEMENT_STORAGE_KEY,
} from '@/lib/purchases';
import { useScanStore } from '@/store/scanStore';
import { runMockScan } from '@/lib/mockBackend';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('RevenueCat Purchase Provider Interface & Mock', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await setEntitlementForTests(false);
    useScanStore.getState().resetMeteringForTests();
  });

  it('initially has no active entitlement on clean state', async () => {
    const entitled = await hasActiveEntitlement();
    expect(entitled).toBe(false);
  });

  it('grants active entitlement when weekly subscription is purchased', async () => {
    const outcome = await purchaseWeekly();
    expect(outcome.ok).toBe(true);

    const entitled = await hasActiveEntitlement();
    expect(entitled).toBe(true);

    // Assert persistence in AsyncStorage
    const stored = await AsyncStorage.getItem(ENTITLEMENT_STORAGE_KEY);
    expect(stored).toBe('true');
  });

  it('grants active entitlement when annual subscription is purchased', async () => {
    const outcome = await purchaseAnnual();
    expect(outcome.ok).toBe(true);

    const entitled = await hasActiveEntitlement();
    expect(entitled).toBe(true);
  });

  it('grants 20 extra scans on consumable topup purchase without setting subscription entitlement', async () => {
    const outcome = await purchaseTopup();
    expect(outcome.ok).toBe(true);
    expect(outcome.scans).toBe(20);

    const entitled = await hasActiveEntitlement();
    expect(entitled).toBe(false);
  });

  it('restores previous entitlement status correctly', async () => {
    // When not entitled
    const res1 = await restorePurchases();
    expect(res1.ok).toBe(false);

    // After purchase
    await purchaseWeekly();
    const res2 = await restorePurchases();
    expect(res2.ok).toBe(true);
  });

  it('survives provider re-instantiation by reading from AsyncStorage', async () => {
    await AsyncStorage.setItem(ENTITLEMENT_STORAGE_KEY, 'true');
    const freshProvider = new MockPurchaseProvider();
    expect(await freshProvider.hasActiveEntitlement()).toBe(true);
  });
});

describe('Scan Metering & Subscription Limit Enforcement', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await setEntitlementForTests(false);
    useScanStore.getState().resetMeteringForTests();
  });

  it('enforces 3 free scan limit for non-subscribed users', async () => {
    const store = useScanStore.getState();
    expect(store.freeScansUsed).toBe(0);

    // 1st scan
    const res1 = await runMockScan({ images: ['b64'], deviceHash: 'hash1', mode: 'photo' });
    expect(res1.ok).toBe(true);
    expect(useScanStore.getState().freeScansUsed).toBe(1);

    // 2nd scan
    const res2 = await runMockScan({ images: ['b64'], deviceHash: 'hash1', mode: 'photo' });
    expect(res2.ok).toBe(true);
    expect(useScanStore.getState().freeScansUsed).toBe(2);

    // 3rd scan
    const res3 = await runMockScan({ images: ['b64'], deviceHash: 'hash1', mode: 'photo' });
    expect(res3.ok).toBe(true);
    expect(useScanStore.getState().freeScansUsed).toBe(3);

    // 4th scan -> paywalled
    const res4 = await runMockScan({ images: ['b64'], deviceHash: 'hash1', mode: 'photo' });
    expect(res4.ok).toBe(false);
    if (!res4.ok) {
      expect(res4.error.error).toBe('paywall');
      expect(res4.error.free_scans_used).toBe(3);
    }
  });

  it('consumes top-up scans when free limit is reached', async () => {
    useScanStore.setState({ freeScansUsed: 3, topupRemaining: 2 });

    const res = await runMockScan({ images: ['b64'], deviceHash: 'hash1', mode: 'photo' });
    expect(res.ok).toBe(true);
    expect(useScanStore.getState().freeScansUsed).toBe(3);
    expect(useScanStore.getState().topupRemaining).toBe(1);
  });

  it('bypasses scan limit entirely when user has active subscription', async () => {
    useScanStore.setState({ freeScansUsed: 3, topupRemaining: 0, isSubscribed: true });
    await setEntitlementForTests(true);

    const res = await runMockScan({ images: ['b64'], deviceHash: 'hash1', mode: 'photo' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.result.free_scans_used).toBe(3);
    }
  });

  it('grantTopup adds scans to topupRemaining balance', () => {
    useScanStore.getState().grantTopup(20);
    expect(useScanStore.getState().topupRemaining).toBe(20);

    useScanStore.getState().grantTopup(20);
    expect(useScanStore.getState().topupRemaining).toBe(40);
  });

  it('resetMeteringForTests resets all counters and subscription state', () => {
    useScanStore.setState({ freeScansUsed: 3, topupRemaining: 15, isSubscribed: true });
    useScanStore.getState().resetMeteringForTests();

    expect(useScanStore.getState().freeScansUsed).toBe(0);
    expect(useScanStore.getState().topupRemaining).toBe(0);
    expect(useScanStore.getState().isSubscribed).toBe(false);
  });
});
