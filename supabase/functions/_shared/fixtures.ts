// Deterministic fixtures for mock providers and jest. Kept realistic (PLAYBOOK: real
// content in dev, never lorem ipsum) so demos and tests look like real usage.
import type { Comps, Identified } from './schema.ts';

export const FIXTURE_IDENTIFIED: Identified = {
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
};

// A deliberately low-confidence fixture to exercise the "snap the tag" path.
export const FIXTURE_IDENTIFIED_LOW_CONF: Identified = {
  name: 'Vintage wool sweater (brand unclear)',
  brand: null,
  model_or_era: 'possibly 1990s',
  category: 'clothing',
  condition_notes: 'Cannot read the maker tag from this angle.',
  confidence: 0.34,
  ebay_search_keywords: ['vintage wool sweater', 'wool pullover sweater'],
  needs_better_photo: true,
  photo_tip: 'Snap the neck tag so the brand and size are readable.',
};

export const FIXTURE_COMPS: Comps = {
  median: 58,
  low: 32,
  high: 95,
  count: 214,
  estimated_sold: 43.5, // 0.75 * 58
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
};

// Barcode-path fixture (a book by GTIN).
export const FIXTURE_IDENTIFIED_BARCODE: Identified = {
  name: 'The Pragmatic Programmer, 20th Anniversary Edition',
  brand: 'Addison-Wesley',
  model_or_era: '2nd Edition, 2019',
  category: 'books_media',
  condition_notes: 'Identified by barcode (GTIN); condition from photo.',
  confidence: 0.95,
  ebay_search_keywords: ['Pragmatic Programmer 20th anniversary', '9780135957059'],
  needs_better_photo: false,
  photo_tip: null,
};
