// "The appraiser's field tool" — the tactile confidence of an auction house in your
// pocket. Warm cream canvas, deep-forest FLIP green, clay-red SKIP, ink text, monospace
// numerals for every price. This replaces the Expo template theme entirely.
//
// Fonts (loaded in app/_layout via @expo-google-fonts):
//   display -> Space Grotesk, body -> Inter, mono (all prices) -> JetBrains Mono.

export const Colors = {
  // canvas & paper
  cream: '#FBF7F0', // primary background (warm ivory, never pure white)
  paper: '#F3ECE0', // receipt-paper surface for lists/cards
  paperEdge: '#E7DCCB', // 1px low-contrast borders / perforations
  // ink text
  ink: '#211D18', // near-black warm ink
  inkSoft: '#5A5247', // secondary text
  inkFaint: '#8A8072', // captions / hints
  // semantic verdicts (reserved for meaning only)
  flip: '#1F6F4A', // deep forest — FLIP
  flipSoft: '#E4EFE7',
  maybe: '#B7791F', // amber — MAYBE
  maybeSoft: '#F6ECD8',
  skip: '#A6371F', // clay red — SKIP
  skipSoft: '#F3E1DB',
  // accent (used sparingly, ~5% of a screen)
  brass: '#8A6D3B',
  // utility
  white: '#FFFFFF',
  overlay: 'rgba(33,29,24,0.55)',
  shadow: 'rgba(33,29,24,0.12)',
} as const;

export const Verdict = {
  flip: { fg: Colors.flip, bg: Colors.flipSoft, label: 'FLIP', emoji: '🔥' },
  maybe: { fg: Colors.maybe, bg: Colors.maybeSoft, label: 'MAYBE', emoji: '' },
  skip: { fg: Colors.skip, bg: Colors.skipSoft, label: 'SKIP', emoji: '' },
} as const;

export const Fonts = {
  display: 'SpaceGrotesk_600SemiBold',
  displayBold: 'SpaceGrotesk_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_500Medium', // every price/stat/counter
  monoBold: 'JetBrainsMono_700Bold',
} as const;

// 8pt spacing grid.
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const Type = {
  hero: { fontFamily: Fonts.displayBold, fontSize: 40, letterSpacing: -1 },
  title: { fontFamily: Fonts.display, fontSize: 26, letterSpacing: -0.5 },
  heading: { fontFamily: Fonts.display, fontSize: 20, letterSpacing: -0.3 },
  body: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: Fonts.bodyMedium, fontSize: 12, lineHeight: 16 },
  price: { fontFamily: Fonts.monoBold, fontSize: 34, letterSpacing: -0.5 },
  priceSm: { fontFamily: Fonts.mono, fontSize: 16 },
} as const;

export type ThemeColor = keyof typeof Colors;
