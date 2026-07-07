// Fully local mock scan pipeline — used when Supabase isn't configured (NEEDS HUMAN:
// EXPO_PUBLIC_SUPABASE_URL/ANON_KEY) so the app is demoable end-to-end offline on
// fixtures, mirroring the real edge function's shape (supabase/functions/scan/index.ts)
// including metering against local free-scan state. Never calls a network API.
import * as Crypto from 'expo-crypto';
import {
  CompsSchema,
  IdentifiedSchema,
  type Comps,
  type Identified,
  type ScanResult,
} from '@/types/scan';
import type { ScanArgs, ScanOutcome } from '@/lib/scanApi';
import { useScanStore } from '@/store/scanStore';
import { FREE_SCAN_LIMIT } from '@/constants/limits';

// Deterministic fixtures — kept in sync by hand with supabase/functions/_shared/fixtures.ts
// (real content, not lorem ipsum, per PLAYBOOK 1.5).
const FIXTURE_IDENTIFIED: Identified = IdentifiedSchema.parse({
  name: 'Patagonia Synchilla Snap-T Fleece Pullover',
  brand: 'Patagonia',
  model_or_era: 'Snap-T, deep pile fleece',
  category: 'clothing',
  condition_notes: 'Visible pilling on cuffs; no stains or holes seen in photo.',
  confidence: 0.82,
  ebay_search_keywords: [
    'Patagonia Synchilla Snap-T fleece',
    'Patagonia Snap-T pullover',
    'Patagonia fleece pullover',
  ],
  needs_better_photo: false,
  photo_tip: null,
});

const FIXTURE_IDENTIFIED_LOW_CONF: Identified = IdentifiedSchema.parse({
  name: 'Vintage wool sweater (brand unclear)',
  brand: null,
  model_or_era: 'possibly 1990s',
  category: 'clothing',
  condition_notes: 'Cannot read the maker tag from this angle.',
  confidence: 0.34,
  ebay_search_keywords: ['vintage wool sweater', 'wool pullover sweater'],
  needs_better_photo: true,
  photo_tip: 'Snap the neck tag so the brand and size are readable.',
});

const FIXTURE_IDENTIFIED_BARCODE: Identified = IdentifiedSchema.parse({
  name: 'The Pragmatic Programmer, 20th Anniversary Edition',
  brand: 'Addison-Wesley',
  model_or_era: '2nd Edition, 2019',
  category: 'books_media',
  condition_notes: 'Identified by barcode (GTIN); condition from photo.',
  confidence: 0.95,
  ebay_search_keywords: ['Pragmatic Programmer 20th anniversary', '9780135957059'],
  needs_better_photo: false,
  photo_tip: null,
});

const FIXTURE_COMPS: Comps = CompsSchema.parse({
  median: 58,
  low: 32,
  high: 95,
  count: 214,
  estimated_sold: 43.5,
  is_estimate: true,
  currency: 'USD',
  source: 'mock',
  sample_listings: [
    {
      title: 'Patagonia Synchilla Snap-T Fleece Pullover Mens Medium Blue',
      price: 54.99,
      url: 'https://www.ebay.com/itm/mock-1',
      img: 'https://i.ebayimg.com/images/g/mock1/s-l500.jpg',
    },
    {
      title: 'Patagonia Snap-T Deep Pile Fleece Vintage Womens Large',
      price: 72.0,
      url: 'https://www.ebay.com/itm/mock-2',
      img: 'https://i.ebayimg.com/images/g/mock2/s-l500.jpg',
    },
    {
      title: 'Patagonia Synchilla Pullover Fleece Grey Small EUC',
      price: 39.5,
      url: 'https://www.ebay.com/itm/mock-3',
      img: 'https://i.ebayimg.com/images/g/mock3/s-l500.jpg',
    },
    {
      title: 'Patagonia Snap T Fleece Jacket Retro X Mens XL',
      price: 89.99,
      url: 'https://www.ebay.com/itm/mock-4',
      img: null,
    },
  ],
});

const FIXTURE_COMPS_BOOK: Comps = CompsSchema.parse({
  median: 22,
  low: 14,
  high: 38,
  count: 61,
  estimated_sold: 16.5,
  is_estimate: true,
  currency: 'USD',
  source: 'mock',
  sample_listings: [
    {
      title: 'The Pragmatic Programmer 20th Anniversary Edition Paperback',
      price: 21.99,
      url: 'https://www.ebay.com/itm/mock-book-1',
      img: 'https://i.ebayimg.com/images/g/mockbook1/s-l500.jpg',
    },
    {
      title: 'Pragmatic Programmer Andrew Hunt David Thomas 2nd Ed',
      price: 24.5,
      url: 'https://www.ebay.com/itm/mock-book-2',
      img: null,
    },
  ],
});

function verdictForEstimate(estimate: number): 'flip' | 'maybe' | 'skip' {
  if (estimate >= 40) return 'flip';
  if (estimate >= 15) return 'maybe';
  return 'skip';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Simulates the pipeline's staged latency (identify -> comps -> verdict) so the 3-stage
// progress UI has something real to animate against even fully offline.
export async function runMockScan(args: ScanArgs): Promise<ScanOutcome> {
  const { freeScansUsed, topupRemaining, recordScanUsed } = useScanStore.getState();
  if (freeScansUsed >= FREE_SCAN_LIMIT && topupRemaining <= 0) {
    return {
      ok: false,
      error: {
        error: 'paywall',
        message: "You've used your 3 free scans.",
        free_scans_used: freeScansUsed,
        free_limit: FREE_SCAN_LIMIT,
      },
    };
  }

  await delay(700); // identifying

  const identified =
    args.mockVariant === 'low_conf'
      ? FIXTURE_IDENTIFIED_LOW_CONF
      : args.mode === 'barcode' || args.mockVariant === 'barcode'
        ? FIXTURE_IDENTIFIED_BARCODE
        : FIXTURE_IDENTIFIED;

  await delay(900); // checking listings

  const comps = identified.category === 'books_media' ? FIXTURE_COMPS_BOOK : FIXTURE_COMPS;

  await delay(500); // calculating profit

  const verdict = verdictForEstimate(comps.estimated_sold);
  const { freeUsed, topupRemaining: remaining } = recordScanUsed();

  const result: ScanResult = {
    scan_id: Crypto.randomUUID(),
    identified,
    comps,
    verdict,
    free_scans_used: freeUsed,
    free_limit: FREE_SCAN_LIMIT,
    topup_remaining: remaining,
  };
  return { ok: true, result };
}
