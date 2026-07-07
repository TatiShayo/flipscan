// RevenueCat provider interface + mock (BUILD_PROMPT: RevenueCat for subscriptions).
// Real RevenueCat SDK wiring needs EXPO_PUBLIC_RC_IOS_KEY/_ANDROID_KEY + Offerings
// configured in the RC dashboard (NEEDS HUMAN) — until then every call resolves through
// a mock that always "succeeds" so the paywall flow is fully demoable. The pipeline
// (paywall screen) is written against this interface only; swapping in the real
// `react-native-purchases` SDK later touches only this file.
import { CONFIGURED } from '@/config/env';
import { TOPUP_SCANS_PER_PURCHASE } from '@/constants/limits';

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
}

// ---- Mock provider (used until RevenueCat keys + Offerings are configured) ----
class MockPurchaseProvider implements PurchaseProvider {
  readonly name = 'mock';
  private entitled = false;

  async purchaseWeekly(): Promise<PurchaseOutcome> {
    this.entitled = true;
    return { ok: true };
  }
  async purchaseAnnual(): Promise<PurchaseOutcome> {
    this.entitled = true;
    return { ok: true };
  }
  async purchaseTopup(): Promise<TopupOutcome> {
    return { ok: true, scans: TOPUP_SCANS_PER_PURCHASE };
  }
  async restore(): Promise<PurchaseOutcome> {
    return { ok: this.entitled };
  }
  async hasActiveEntitlement(): Promise<boolean> {
    return this.entitled;
  }
}

// ---- Real provider stub — constructed only when RC keys are present. Actual RevenueCat
// SDK integration (react-native-purchases) is NEEDS HUMAN: requires RC dashboard Offerings
// configured with product ids matching BUILD_PROMPT pricing before this can do anything
// beyond falling back to the mock behavior below.
class RevenueCatPurchaseProvider implements PurchaseProvider {
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
}

const provider: PurchaseProvider = CONFIGURED.revenueCat
  ? new RevenueCatPurchaseProvider()
  : new MockPurchaseProvider();

export function purchaseWeekly(): Promise<PurchaseOutcome> {
  return provider.purchaseWeekly();
}
export function purchaseAnnual(): Promise<PurchaseOutcome> {
  return provider.purchaseAnnual();
}
export function purchaseTopup(): Promise<TopupOutcome> {
  return provider.purchaseTopup();
}
export function restorePurchases(): Promise<PurchaseOutcome> {
  return provider.restore();
}
export function hasActiveEntitlement(): Promise<boolean> {
  return provider.hasActiveEntitlement();
}
