#!/usr/bin/env node
// Security gate — bundle secret scan (BUILD_PROMPT security §: "the app binary contains
// zero secrets (verify by inspecting the built bundle)"). Anthropic/eBay/service-role keys
// must live ONLY in edge-function secrets and never be referenced from app code, so an
// `expo export` bundle should never contain their names or values. Run via `npm run
// secret-scan` (chains `expo export` first, see package.json) or directly against an
// already-exported `dist/` when iterating.
//
// This scans for the SECRET NAMES (env var identifiers), not just example key values,
// because the more dangerous leak is `process.env.ANTHROPIC_API_KEY` accidentally being
// referenced from app code — Expo's bundler would have inlined the literal value into the
// bundle at build time, which this pattern also happens to catch downstream.
const fs = require('node:fs');
const path = require('node:path');

const DIST_DIR = path.join(__dirname, '..', 'dist');

// Secret identifiers that must NEVER appear in the client bundle. Every EXPO_PUBLIC_* value
// is fine (that's the point of the prefix); everything below is an edge-function-only
// secret per PROJECT_STATE.md's NEEDS HUMAN list.
const BANNED_PATTERNS = [
  'ANTHROPIC_API_KEY',
  'EBAY_CLIENT_ID',
  'EBAY_CLIENT_SECRET',
  'EBAY_CLIENT', // punch-list literal (covers both EBAY_CLIENT_ID/SECRET as a prefix match)
  'SUPABASE_SERVICE_ROLE_KEY',
  'EPN_CAMPAIGN_ID', // not secret-sensitive, but also never meant to ship in the bundle
];

// Extensions the bundler actually produces text for; skip binaries/maps/fonts to keep this
// fast and avoid false "found" hits inside opaque binary data.
const SCAN_EXTENSIONS = new Set(['.js', '.html', '.json', '.css', '.txt']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(
      `secret-scan: ${DIST_DIR} does not exist. Run "npx expo export" first (or "npm run secret-scan", which does both).`,
    );
    process.exit(1);
  }

  const files = walk(DIST_DIR);
  if (files.length === 0) {
    console.error(`secret-scan: no scannable files found under ${DIST_DIR}. Did the export produce output?`);
    process.exit(1);
  }

  /** @type {{ file: string, pattern: string, line: number }[]} */
  const hits = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of BANNED_PATTERNS) {
      if (!content.includes(pattern)) continue;
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes(pattern)) {
          hits.push({ file: path.relative(DIST_DIR, file), pattern, line: i + 1 });
        }
      });
    }
  }

  if (hits.length > 0) {
    console.error(`secret-scan: FOUND ${hits.length} match(es) of banned secret identifiers in the bundle:\n`);
    for (const hit of hits) {
      console.error(`  ${hit.file}:${hit.line} — "${hit.pattern}"`);
    }
    console.error('\nThis means a secret name (and possibly its value) leaked into the client bundle. Fix before shipping.');
    process.exit(1);
  }

  console.log(`secret-scan: clean. Scanned ${files.length} file(s) under dist/ for ${BANNED_PATTERNS.length} banned identifiers — zero matches.`);
  process.exit(0);
}

main();
