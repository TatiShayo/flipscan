// Trending tab content (BUILD_PROMPT §9): a static, hand-authored list of 20 "hot flip"
// categories. Updated via app config/release, not backend — no server round-trip. Real
// content (specific brands/eras/price ranges), not filler, per PLAYBOOK 1.5.
export interface TrendingCategory {
  id: string;
  title: string;
  lowPrice: number;
  highPrice: number;
  lookFor: string;
  trendPct: number; // week-over-week movement, hand-updated at each content refresh
}

export const TRENDING_CATEGORIES: TrendingCategory[] = [
  { id: 'vintage-pyrex', title: 'Vintage Pyrex (patterned)', lowPrice: 25, highPrice: 150, lookFor: 'Butterprint, Gooseberry, Spring Blossom patterns; check for hairline cracks under bright light.', trendPct: 23 },
  { id: '90s-band-tees', title: '90s band tees', lowPrice: 40, highPrice: 300, lookFor: 'Single-stitch hems, tour dates on the back, Winterland/Brockum tags.', trendPct: 18 },
  { id: 'lego-sets', title: 'Retired LEGO sets (sealed or complete)', lowPrice: 60, highPrice: 500, lookFor: 'Complete instruction booklets, no missing minifigs, original box condition.', trendPct: 15 },
  { id: 'carhartt-workwear', title: 'Carhartt duck canvas workwear', lowPrice: 30, highPrice: 120, lookFor: 'Union-made tags, distressed-but-intact fabric, detroit jackets especially.', trendPct: 12 },
  { id: 'polaroid-cameras', title: 'Polaroid & instant cameras', lowPrice: 20, highPrice: 90, lookFor: 'SX-70 folding models test highest; check the bellows for light leaks.', trendPct: 9 },
  { id: 'nike-og-sneakers', title: 'OG-era Nike sneakers', lowPrice: 50, highPrice: 400, lookFor: 'Original boxes, low mileage soles, Air Max 90/95/97 and Jordan 1-6.', trendPct: 8 },
  { id: 'depression-glass', title: 'Depression glass', lowPrice: 15, highPrice: 80, lookFor: 'Pink and green pieces command the most; check maker marks on the base.', trendPct: 7 },
  { id: 'mechanical-keyboards', title: 'Mechanical keyboards (vintage)', lowPrice: 40, highPrice: 250, lookFor: 'IBM Model M buckling-spring boards, Cherry MX blue/brown switches.', trendPct: 6 },
  { id: 'levis-selvedge', title: "Levi's 501 selvedge denim", lowPrice: 35, highPrice: 200, lookFor: 'Red tab, redline selvedge, made-in-USA tags, distress on knees only.', trendPct: 6 },
  { id: 'film-cameras', title: '35mm film SLRs', lowPrice: 25, highPrice: 150, lookFor: 'Canon AE-1, Pentax K1000, Nikon FM — working shutter and clean lens glass.', trendPct: 5 },
  { id: 'ski-sweaters', title: 'Vintage ski sweaters', lowPrice: 20, highPrice: 90, lookFor: 'Bold Nordic patterns, wool blends, look for moth holes before buying.', trendPct: 5 },
  { id: 'thermos-lunchboxes', title: 'Character lunchboxes & thermoses', lowPrice: 15, highPrice: 100, lookFor: '80s cartoon/movie tie-ins; complete set (box + thermos) sells much higher.', trendPct: 5 },
  { id: 'coach-bags', title: 'Coach leather bags (vintage)', lowPrice: 30, highPrice: 150, lookFor: 'Turnlock hardware, creed patch with serial number, structured silhouettes.', trendPct: 4 },
  { id: 'trading-cards', title: 'Sports & TCG trading cards (sealed)', lowPrice: 20, highPrice: 500, lookFor: 'Sealed wax packs and boxes; check for corner/edge wear on graded singles.', trendPct: 4 },
  { id: 'vinyl-records', title: 'Vinyl records (rock/jazz first pressings)', lowPrice: 10, highPrice: 120, lookFor: 'Matrix numbers in the runout groove indicate pressing; check for warping.', trendPct: 4 },
  { id: 'cast-iron-cookware', title: 'Vintage cast iron cookware', lowPrice: 20, highPrice: 100, lookFor: 'Griswold and Wagner marks; smooth cooking surface, no cracks or heavy pitting.', trendPct: 3 },
  { id: 'north-face-fleece', title: 'North Face fleece & Denali jackets', lowPrice: 25, highPrice: 100, lookFor: '90s color-blocked designs, Denali tag intact, no pilling on the torso.', trendPct: 3 },
  { id: 'y2k-accessories', title: 'Y2K accessories', lowPrice: 10, highPrice: 60, lookFor: 'Butterfly clips, rhinestone logos, low-rise belts — condition matters most.', trendPct: 3 },
  { id: 'costume-jewelry', title: 'Signed costume jewelry', lowPrice: 15, highPrice: 90, lookFor: 'Look for maker signatures (Trifari, Weiss, Sherman) on the clasp.', trendPct: 2 },
  { id: 'boomboxes', title: 'Vintage boomboxes', lowPrice: 30, highPrice: 200, lookFor: 'Working dual cassette decks, intact antenna, brands like JVC and Sharp.', trendPct: 2 },
];
