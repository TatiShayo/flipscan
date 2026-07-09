// Jest configuration for FlipScan.
//
// Two projects:
//   1. "logic" — pure TypeScript in supabase/functions/_shared (profit math, zod schemas,
//      provider interfaces, url sanitizer) plus the schema-drift guard. These have no React
//      Native / Expo dependency, so they run in a plain node environment with a minimal
//      Babel transform (type-strip + ESM->CJS). We deliberately do NOT use the jest-expo
//      preset here: its setup requires expo-modules-core (a native module) which isn't
//      resolvable in a headless CI/node context, and these tests don't need any RN runtime.
//   2. "rn" — React Native component/hook tests via the jest-expo preset. No such tests
//      exist yet (the app screens are exercised by the logic layer + manual/on-device QA),
//      but the project is wired so a component test can be dropped into mobile/src/**/__tests__
//      without reconfiguring anything.
const path = require('path');

const babelTransform = [
  'babel-jest',
  {
    babelrc: false,
    configFile: false,
    presets: [['@babel/preset-typescript', { allExtensions: true }]],
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  },
];

module.exports = {
  projects: [
    {
      displayName: 'logic',
      testEnvironment: 'node',
      roots: [path.join(__dirname, '../supabase/functions/_shared')],
      testMatch: ['**/__tests__/**/*.test.ts'],
      transform: {
        '^.+\\.[tj]sx?$': babelTransform,
      },
      // The edge-function code lives outside mobile/, so jest's default resolver (which walks
      // up from each file's own directory) won't find `zod`. Point bare-specifier resolution
      // at mobile/node_modules, where the toolchain (and Node, for the shared zod version) live.
      modulePaths: [path.join(__dirname, 'node_modules')],
      moduleDirectories: ['node_modules', path.join(__dirname, 'node_modules')],
      // Allow ".ts" extensions in relative imports (Deno-style) to resolve in Node/jest.
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.ts$': '$1',
      },
    },
    {
      displayName: 'rn',
      preset: 'jest-expo',
      roots: [path.join(__dirname, 'src')],
      testMatch: ['**/__tests__/**/*.test.tsx'],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|posthog-react-native)',
      ],
      // npm installed expo-modules-core nested under node_modules/expo/node_modules rather
      // than hoisting it to the top level, so jest-expo's own setup.js (which does a plain
      // `require('expo-modules-core')`) can't resolve it via normal node_modules walk-up.
      // Point resolution straight at the nested copy rather than depend on hoisting.
      moduleNameMapper: {
        '^expo-modules-core(/.*)$': path.join(__dirname, 'node_modules/expo/node_modules/expo-modules-core') + '$1',
        '^expo-modules-core$': path.join(__dirname, 'node_modules/expo/node_modules/expo-modules-core'),
        // AsyncStorage's real implementation calls a native module that doesn't exist under
        // plain jest (no device/simulator bridge) -- swap in the package's own official
        // in-memory jest mock (subpath moved from "/jest-mock" to "/jest" in this version).
        '^@react-native-async-storage/async-storage$': '@react-native-async-storage/async-storage/jest',
      },
    },
  ],
};
