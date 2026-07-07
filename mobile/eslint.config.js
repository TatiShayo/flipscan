// Flat ESLint config (ESLint 9+). Extends the official Expo config; project-specific
// tweaks kept minimal. Ignores generated/native output so lint stays fast and relevant.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'dist/*',
      'web-build/*',
      '.expo/*',
      'node_modules/*',
      'ios/*',
      'android/*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Default (error) is fine for app code; kept as an explicit, easy-to-find override
      // point rather than silently inheriting whatever the upstream preset ships.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // react-hooks' React Compiler validation (`react-hooks/immutability`) flags
    // Reanimated's `sharedValue.value = x` as an illegal mutation — that assignment is
    // the documented, intentional Reanimated API (it's intercepted by the Reanimated
    // Babel plugin before the React Compiler ever sees it), not a compiler violation.
    // Scoped off rather than disabled project-wide.
    files: ['src/components/Button.tsx', 'src/components/PriceText.tsx', 'src/components/VerdictStamp.tsx', 'src/components/ConfettiBurst.tsx', 'app/camera.tsx', 'app/scanning.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
];
