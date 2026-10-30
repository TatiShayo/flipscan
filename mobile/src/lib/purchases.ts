// RevenueCat provider interface + mock (BUILD_PROMPT: RevenueCat for subscriptions).
// Real RevenueCat SDK wiring needs EXPO_PUBLIC_RC_IOS_KEY/_ANDROID_KEY + Offerings
// configured in the RC dashboard (NEEDS HUMAN) — until then every call resolves through
// a mock that always "succeeds" so the paywall flow is fully demoable. The pipeline
// (paywall screen) is written against this interface only; swapping in the real
// `react-native-purchases` SDK later touches only this file.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIGURED } from '@/config/env';
import { TOPUP_SCANS_PER_PURCHASE } from '@/constants/limits';

export const ENTITLEMENT_STORAGE_KEY = 'flipscan.entitlement_active';

export interface PurchaseOutcome {
  ok: boolean;
  cancelled?: boolean;
}

export interface TopupOutcome extends PurchaseOutcome {
  scans: number;
}

export interface PurchaseProvider {
  readonly name: string;
  purchaseWeekly(): Promise<PurchaseOutcome>;
  purchaseAnnual(): Promise<PurchaseOutcome>;
  purchaseTopup(): Promise<TopupOutcome>;
  restore(): Promise<PurchaseOutcome>;
  hasActiveEntitlement(): Promise<boolean>;
  setEntitled(entitled: boolean): Promise<void>;
}

// ---- Mock provider (used until RevenueCat keys + Offerings are configured) ----
export class MockPurchaseProvider implements PurchaseProvider {
  readonly name = 'mock';
  private entitled: boolean | null = null;

  async purchaseWeekly(): Promise<PurchaseOutcome> {
    await this.setEntitled(true);
    return { ok: true };
  }
  async purchaseAnnual(): Promise<PurchaseOutcome> {
    await this.setEntitled(true);
    return { ok: true };
  }
  async purchaseTopup(): Promise<TopupOutcome> {
    return { ok: true, scans: TOPUP_SCANS_PER_PURCHASE };
  }
  async restore(): Promise<PurchaseOutcome> {
    const isEntitled = await this.hasActiveEntitlement();
    return { ok: isEntitled };
  }
  async hasActiveEntitlement(): Promise<boolean> {
    if (this.entitled !== null) return this.entitled;
    try {
      const stored = await AsyncStorage.getItem(ENTITLEMENT_STORAGE_KEY);
      this.entitled = stored === 'true';
    } catch {
      this.entitled = false;
    }
    return this.entitled;
  }
  async setEntitled(entitled: boolean): Promise<void> {
    this.entitled = entitled;
    try {
      await AsyncStorage.setItem(ENTITLEMENT_STORAGE_KEY, String(entitled));
    } catch {
      // Storage failure non-fatal for in-memory session
    }
  }
}

// ---- Real provider stub — constructed only when RC keys are present. Actual RevenueCat
// SDK integration (react-native-purchases) is NEEDS HUMAN: requires RC dashboard Offerings
// configured with product ids matching BUILD_PROMPT pricing before this can do anything
// beyond falling back to the mock behavior below.
export class RevenueCatPurchaseProvider implements PurchaseProvider {
  readonly name = 'revenuecat';
  private mock = new MockPurchaseProvider();

  async purchaseWeekly(): Promise<PurchaseOutcome> {
    // TODO(NEEDS HUMAN): call Purchases.purchasePackage() for the weekly Offering once
    // react-native-purchases is installed and configured with EXPO_PUBLIC_RC_*_KEY.
    return this.mock.purchaseWeekly();
  }
  async purchaseAnnual(): Promise<PurchaseOutcome> {
    return this.mock.purchaseAnnual();
  }
  async purchaseTopup(): Promise<TopupOutcome> {
    return this.mock.purchaseTopup();
  }
  async restore(): Promise<PurchaseOutcome> {
    return this.mock.restore();
  }
  async hasActiveEntitlement(): Promise<boolean> {
    return this.mock.hasActiveEntitlement();
  }
  async setEntitled(entitled: boolean): Promise<void> {
    return this.mock.setEntitled(entitled);
  }
}

const activeProvider: PurchaseProvider = CONFIGURED.revenueCat
  ? new RevenueCatPurchaseProvider()
  : new MockPurchaseProvider();

export function getPurchaseProvider(): PurchaseProvider {
  return activeProvider;
}

export function purchaseWeekly(): Promise<PurchaseOutcome> {
  return activeProvider.purchaseWeekly();
}
export function purchaseAnnual(): Promise<PurchaseOutcome> {
  return activeProvider.purchaseAnnual();
}
export function purchaseTopup(): Promise<TopupOutcome> {
  return activeProvider.purchaseTopup();
}
export function restorePurchases(): Promise<PurchaseOutcome> {
  return activeProvider.restore();
}
export function hasActiveEntitlement(): Promise<boolean> {
  return activeProvider.hasActiveEntitlement();
}
export function setEntitlementForTests(entitled: boolean): Promise<void> {
  return activeProvider.setEntitled(entitled);
}
