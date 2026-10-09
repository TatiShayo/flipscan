/* global jest */
// Jest setup file for FlipScan mobile test runner.
// Polyfills and mocks for React Native / Expo headless execution.

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  randomUUID: () => '11111111-2222-4333-8444-555555555555',
  digestStringAsync: jest.fn(async (_algo, str) => {
    const bytes = new TextEncoder().encode(str);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text, Image } = require('react-native');

  const createAnimatedComponent = (Comp) => {
    const Component = React.forwardRef((props, ref) => React.createElement(Comp, { ...props, ref }));
    Component.displayName = `Animated(${Comp.displayName || Comp.name || 'Component'})`;
    return Component;
  };

  const runOnJS = (fn) => (...args) => fn(...args);

  return {
    __esModule: true,
    default: {
      View: createAnimatedComponent(View),
      Text: createAnimatedComponent(Text),
      Image: createAnimatedComponent(Image),
      createAnimatedComponent,
    },
    runOnJS,
    useSharedValue: (val) => ({ value: val }),
    useAnimatedStyle: (styleFn) => {
      try {
        return typeof styleFn === 'function' ? styleFn() : styleFn;
      } catch {
        return {};
      }
    },
    withTiming: (toValue, _config, cb) => {
      cb?.(true);
      return toValue;
    },
    withSpring: (toValue, _config, cb) => {
      cb?.(true);
      return toValue;
    },
    withDelay: (_delayMs, animation) => animation,
    withRepeat: (anim) => anim,
    withSequence: (...anims) => anims[0],
    Easing: {
      inOut: (fn) => (typeof fn === 'function' ? fn : (t) => t),
      out: (fn) => (typeof fn === 'function' ? (t) => 1 - fn(1 - t) : (t) => t),
      in: (fn) => (typeof fn === 'function' ? fn : (t) => t),
      ease: (t) => t,
      linear: (t) => t,
      cubic: (t) => t * t * t,
      quad: (t) => t * t,
      back: (s = 1.70158) => (t) => t * t * ((s + 1) * t - s),
      bezier: () => (t) => t,
    },
    FadeIn: {
      duration: () => ({
        delay: () => ({}),
      }),
    },
    FadeOut: {
      duration: () => ({
        delay: () => ({}),
      }),
    },
    FadeInDown: {
      duration: () => ({
        delay: () => ({}),
      }),
    },
  };
});

// Mock react-native-worklets
jest.mock('react-native-worklets', () => ({
  __esModule: true,
  WorkletAPI: {},
  isWorkletFunction: () => false,
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
}));

// Mock expo-secure-store (in-memory). The real module needs native Keychain /
// Keystore; tests exercise the storage adapter logic in src/lib/supabase.ts.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    __esModule: true,
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
    isAvailableAsync: jest.fn(async () => true),
    WHEN_UNLOCKED: 0,
    __store: store,
  };
});
