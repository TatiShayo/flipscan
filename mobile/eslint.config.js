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
    rules: {
      // Provider-interface pattern intentionally uses `any` at Deno/Node env boundaries
      // in the shared edge-function code; app code stays strict.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
