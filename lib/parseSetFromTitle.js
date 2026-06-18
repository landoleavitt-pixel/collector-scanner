// lib/parseSetFromTitle.js
//
// Parse an eBay listing title to identify which set + parallel it is.
//
// Returns { setKey, parallelKey } or null if we can't identify it.
//
// This is intentionally narrow — we only return a positive match when
// we're confident. False negatives ("we don't know this set") are fine
// and trigger the graceful fallback in the modal. False positives
// ("we said this was Topps Chrome but actually it's a Bowman card")
// would be misinformation and we want to avoid them.
//
// Pattern strategy:
//   1. Year detection — look for 2-digit or 4-digit year tokens
//   2. Brand detection — look for distinctive brand strings
//   3. Parallel detection — look for the parallel name + print run
//   4. Cross-check the run number against the expected run for that
//      parallel. If they don't match, return null (something's off).

import { PARALLEL_DATA } from './parallelData';

/**
 * Try to extract a year from a title. Returns 4-digit year or null.
 * Handles "2024", "23-24", "2023-24", and bare "24" near a brand name.
 */
function extractYear(title) {
  // 4-digit year
  const fourDigit = title.match(/\b(20\d{2})\b/);
  if (fourDigit) return parseInt(fourDigit[1], 10);
  // 2023-24, 23-24, 2023/24, etc.
  const range = title.match(/\b(20)?(\d{2})[-/](\d{2})\b/);
  if (range) {
    const start = parseInt('20' + range[2], 10);
    // Sanity check: the second half should be start+1
    if (parseInt(range[3], 10) === ((start + 1) % 100)) return start;
  }
  return null;
}

/**
 * Pattern definitions for each set. Each pattern attempts to match a
 * specific parallel inside a specific set. Patterns must include a
 * print-run check where applicable to defend against false positives.
 *
 * Each detector returns { setKey, parallelKey } on match.
 */
const DETECTORS = [
  // ── Topps Chrome Baseball (any year) ───────────────────────────────
  // The 2024 Topps Chrome rainbow uses color names + the standard /run
  // notation. Topps has kept that ladder largely consistent year-to-year,
  // so we use our 2024 reference data as an approximation for any year's
  // Topps Chrome flagship. The print-run cross-check below still rejects
  // titles whose stated run doesn't match the expected parallel — so we
  // don't accidentally mis-identify cards from years with different runs.
  (title) => {
    if (!/topps\s+chrome/i.test(title)) return null;
    // Exclude Bowman Chrome, Topps Chrome Update, Topps Chrome Sapphire,
    // and Topps Chrome Black — these are different product lines with
    // different rainbows and shouldn't be claimed as flagship Chrome.
    if (/bowman\s+chrome/i.test(title)) return null;
    if (/chrome\s+(update|sapphire|black|platinum|formula)/i.test(title)) return null;

    const setKey = '2024-topps-chrome-baseball';
    const parallels = PARALLEL_DATA[setKey].parallels.numbered;

    // Color names sorted most-specific-first because "Blue /150" and
    // "Aqua Wave /199" share words.
    const colorMatchers = [
      { pattern: /purple\s+speckle/i,   parallelKey: 'purple-speckle' },
      { pattern: /aqua\s+wave/i,        parallelKey: 'aqua-wave' },
      { pattern: /green\s+wave/i,       parallelKey: 'green-wave' },
      { pattern: /super[-\s]?fractor/i, parallelKey: 'superfractor' },
      { pattern: /\borange\b/i,         parallelKey: 'orange' },
      { pattern: /\bpurple\b/i,         parallelKey: 'purple' },
      { pattern: /\bgold\b/i,           parallelKey: 'gold' },
      { pattern: /\bblue\b/i,           parallelKey: 'blue' },
      { pattern: /\bblack\b/i,          parallelKey: 'black' },
      { pattern: /\bred\b/i,            parallelKey: 'red' },
      { pattern: /\brefractor\b/i,      parallelKey: 'refractor' },
    ];
    for (const { pattern, parallelKey } of colorMatchers) {
      if (pattern.test(title)) {
        const expected = parallels.find((p) => p.key === parallelKey);
        if (!expected) continue;
        const runMatch = new RegExp(`/${expected.run}\\b`).test(title) ||
                         (expected.run === 1 && /\b1\/1\b/.test(title));
        if (runMatch) return { setKey, parallelKey };
        // Plain "Refractor" without /run is the base /499 — likely correct
        if (parallelKey === 'refractor') return { setKey, parallelKey };
        return null;
      }
    }
    return null;
  },

  // ── Upper Deck Young Guns Hockey (any year) ────────────────────────
  // UD has run the Young Guns subset with the same core parallel ladder
  // every year. Like Chrome above, we approximate with 2023-24 reference
  // data and lean on the print-run check for correctness.
  (title) => {
    if (!/\byoung\s+guns\b/i.test(title) && !/\byg\b/i.test(title)) return null;
    if (!/upper\s+deck|\bud\b/i.test(title)) return null;

    const setKey = '2023-24-ud-young-guns-hockey';
    const matchers = [
      { pattern: /outburst\s+gold/i,   parallelKey: 'outburst-gold',   expectedRun: 1 },
      { pattern: /high\s+gloss/i,      parallelKey: 'high-gloss',      expectedRun: 10 },
      { pattern: /outburst\s+red/i,    parallelKey: 'outburst-red',    expectedRun: 25 },
      { pattern: /\bexclusives\b/i,    parallelKey: 'exclusives',      expectedRun: 100 },
      { pattern: /\bdeluxe\b/i,        parallelKey: 'deluxe',          expectedRun: 250 },
      { pattern: /clear\s+cut/i,       parallelKey: 'clear-cut',       expectedRun: null },
      { pattern: /outburst\s+silver/i, parallelKey: 'outburst-silver', expectedRun: null },
    ];
    for (const { pattern, parallelKey, expectedRun } of matchers) {
      if (pattern.test(title)) {
        if (expectedRun === null) return { setKey, parallelKey };
        const runMatch = new RegExp(`/${expectedRun}\\b`).test(title) ||
                         (expectedRun === 1 && /\b1\/1\b/.test(title));
        if (runMatch) return { setKey, parallelKey };
        return null;
      }
    }
    // Plain "Young Guns" with no parallel keyword = base Young Gun
    return { setKey, parallelKey: 'base-yg' };
  },

  // ── Panini Prizm Basketball (any year) ─────────────────────────────
  // Prizm has kept its rainbow very consistent year-to-year as well.
  // We exclude sibling products (Optic, Select, Mosaic, Donruss) which
  // have different parallel structures.
  (title) => {
    if (!/panini\s+prizm|^prizm\b/i.test(title)) return null;
    if (/\b(optic|select|mosaic|donruss|contenders|immaculate)\b/i.test(title)) return null;

    const setKey = '2023-24-panini-prizm-basketball';
    const matchers = [
      { pattern: /hyper\s+prizm/i,        parallelKey: 'hyper-prizm',   expectedRun: null },
      { pattern: /silver\s+prizm/i,       parallelKey: 'base-prizm',    expectedRun: null },
      { pattern: /\bblack(\s+prizm)?\b/i, parallelKey: 'black-prizm',   expectedRun: 1 },
      { pattern: /gold\s+vinyl/i,         parallelKey: 'gold-vinyl',    expectedRun: 5 },
      { pattern: /\bgold(\s+prizm)?\b/i,  parallelKey: 'gold-prizm',    expectedRun: 10 },
      { pattern: /\bsnakeskin\b/i,        parallelKey: 'snakeskin',     expectedRun: 15 },
      { pattern: /\bmojo\b/i,             parallelKey: 'mojo',          expectedRun: 25 },
      { pattern: /\bblue(\s+prizm)?\b/i,  parallelKey: 'blue-prizm',    expectedRun: 199 },
      { pattern: /teal\s+ice/i,           parallelKey: 'teal-ice',      expectedRun: 225 },
      { pattern: /\bred(\s+prizm)?\b/i,   parallelKey: 'red-prizm',     expectedRun: 299 },
    ];
    for (const { pattern, parallelKey, expectedRun } of matchers) {
      if (pattern.test(title)) {
        if (expectedRun === null) return { setKey, parallelKey };
        const runMatch = new RegExp(`/${expectedRun}\\b`).test(title) ||
                         (expectedRun === 1 && /\b1\/1\b/.test(title));
        if (runMatch) return { setKey, parallelKey };
        return null;
      }
    }
    return null;
  },
];

/**
 * Main parser. Takes an eBay listing title and returns the best matching
 * set + parallel, or null if we can't confidently identify it.
 *
 * On null return, the modal will show the universal rarity ladder fallback.
 */
export function parseSetFromTitle(title) {
  if (!title || typeof title !== 'string') return null;
  const year = extractYear(title);
  for (const detector of DETECTORS) {
    const result = detector(title, year);
    if (result) return result;
  }
  return null;
}
