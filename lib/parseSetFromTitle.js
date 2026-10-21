// lib/parseSetFromTitle.js
//
// Parse an eBay listing title to identify which set + parallel it is.
//
// Returns { setKey, parallelKey, run } or null if we can't identify it.
//   parallelKey  the named parallel, or null when the title names none
//   run          the serial print run read from the title, or null
//
// This is intentionally narrow. False negatives ("we don't know this set")
// are fine and trigger the graceful fallback in the modal. False positives
// ("we said this was Topps Chrome but it's a Bowman card") would be
// misinformation, so every step below rejects rather than guesses:
//   1. Brand: a distinctive product name, minus sibling products whose
//      rainbows differ (Chrome Update, Prizm Draft Picks, YG Canvas...).
//   2. Year: must match a set we hold. Season sets (2023-24) also accept
//      the second year, since sellers write either.
//   3. Parallel: the longest parallel name found in the title, which must
//      agree with the serial number. "Gold /50" matches; "Gold /99" doesn't.
//   4. If more than one set still fits (a bare "2024 Prizm" could be
//      football or 2024-25 basketball), the answer has to be unique.
//
// Autographs and inserts carry their own rainbows, so they're skipped.
//
// Known limitation: the title alone can't always tell the sport. A
// "2025 Topps Chrome VJ Edgecombe Aqua RayWave /199" is Topps Chrome
// Basketball but matches the baseball rainbow, because nothing in the title
// says basketball. Fixing that needs a player-to-sport list.

import { PARALLEL_DATA } from './parallelData';

const BRANDS = {
  'topps-chrome': {
    include: /\btopps\s+(?:20\d{2}\s+)?chrome\b/i,
    exclude: /\bbowman\b|\bchrome\s+(update|sapphire|black|platinum|formula|cosmic|ufc|f1|soccer|uefa|star\s+wars|basketball|football|logofractor)\b|\bupdate\s+series\b/i,
  },
  'bowman-chrome': {
    include: /\bbowman\s+chrome\b/i,
    exclude: /\b(draft|sapphire|university|mega|mojo|bdc|cda)\b/i,
    // Only the prospect (BCP) rainbow is stored.
    require: /\bbcp\b|\bprospects?\b|\b1st\b/i,
  },
  'panini-prizm': {
    include: /\bprizm\b/i,
    exclude: /\b(draft\s+picks|monopoly|deca|select|optic|mosaic|wnba|ufc|f1|world\s+cup|euro|premier|epl|la\s+liga|instant|flawless|obsidian)\b/i,
  },
  'ud-young-guns': {
    include: /\byoung\s+guns?\b|\byg\b/i,
    exclude: /\b(canvas|renewed|retro|oversized|tim\s+hortons|artifacts|ice|ultimate|premier)\b/i,
    require: /\bupper\s+deck\b|\bud\b/i,
  },
};

const SPORT_HINTS = [
  { sport: 'football', re: /\b(football|nfl)\b/i },
  { sport: 'basketball', re: /\b(basketball|nba)\b/i },
];

const AUTO_OR_INSERT = /\b(auto|autos|autograph|autographs|signed|signatures?|on[-\s]?card|patch|relic|jersey|memorabilia|fireworks|kaleidoscopic|fractal|prizmania|manga|color\s+blast|aurora|downtown|variation|ssp)\b/i;

// Sealed packs, boxes and repacks aren't a single card.
const SEALED_PRODUCT = /\bsealed\s+(?:\w+\s+){0,2}(?:pack|packs|box|boxes|case|blaster|hanger|mega)\b|\b(?:mystery|repack|re-pack)\b|\bhobby\s+box\b/i;

// "Panini Prizm Black" is its own high-end product, unless the title is just
// a Black Prizm 1/1.
const PRIZM_BLACK_PRODUCT = /\bpanini\s+prizm\s+black\b/i;

// Finish and family words. If the title carries one the matched parallel
// doesn't, it's a parallel we don't hold ("Green Geo /99" is not Green /99),
// so we reject instead of claiming the plain colour.
const FINISH_WORDS = new Set([
  'wave', 'raywave', 'lava', 'sonar', 'geo', 'geometric', 'speckle', 'shimmer',
  'reptilian', 'mini', 'diamond', 'galactic', 'sapphire', 'cracked', 'sparkle',
  'pulsar', 'seismic', 'lazer', 'scope', 'disco', 'checker', 'camo', 'mojo',
  'hyper', 'snakeskin', 'vinyl', 'finite', 'nebula', 'tiger', 'stripe', 'glitter',
  'pandora', 'choice', 'fast', 'break', 'huddle', 'fotl', 'prism', 'negative',
  'sepia', 'logofractor', 'frozenfractor', 'superfractor', 'outburst', 'gloss',
]);

// Words that sit around parallel names without distinguishing them.
const FILLER = new Set(['prizm', 'prizms', 'refractor', 'refractors', 'parallel', 'parallels', 'and']);

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/super\s*fractor/g, 'superfractor')
    .replace(/ray\s*wave/g, 'raywave')
    .replace(/frozen\s*fractor/g, 'frozenfractor')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w && !FILLER.has(w));
}

function parallelTokens(p) {
  const t = normalize(p.name);
  // Bare "Refractor" normalizes to nothing; match on the word itself.
  return t.length ? t : p.name.toLowerCase().split(/\s+/);
}

function containsPhrase(words, phrase) {
  outer: for (let i = 0; i <= words.length - phrase.length; i++) {
    for (let j = 0; j < phrase.length; j++) if (words[i + j] !== phrase[j]) continue outer;
    return true;
  }
  return false;
}

/** Years named in the title: "2024", "2023-24", "23-24". */
function extractYears(title) {
  const years = new Set();
  // Remove each season range once read, so "2024-25" isn't also a bare 2024.
  const rest = title.replace(/\b(?:20)?(\d{2})[-/](\d{2})\b/g, (all, a, b) => {
    const start = 2000 + parseInt(a, 10);
    if (parseInt(b, 10) !== (start + 1) % 100) return all;
    years.add(`${start}-season`);
    return ' ';
  });
  for (const m of rest.matchAll(/\b(20\d{2})\b/g)) years.add(parseInt(m[1], 10));
  return years;
}

function yearFits(set, years) {
  if (set.season) {
    if (years.has(`${set.year}-season`)) return true;
    // A bare 4-digit year can be either half of the season.
    return years.has(set.year) || years.has(set.year + 1);
  }
  return years.has(set.year);
}

/** Serial print runs written in the title: "/25", "#/25", "12/25", "1/1". */
function extractRuns(title) {
  const runs = new Set();
  for (const m of title.matchAll(/(?:^|[\s#(])(\d{1,4})?\/(\d{1,4})\b/g)) {
    const before = m[1];
    // Skip season years like 2023/24.
    if (before && before.length === 4 && /^20/.test(before)) continue;
    const run = parseInt(m[2], 10);
    // "1/1 possible", "chance at a 1/1": a chase, not this card's run.
    if (run === 1) {
      const near = title.slice(Math.max(0, m.index - 14), m.index + 22);
      if (/\b(possible|chance|chances|look\s+for|odds)\b/i.test(near.slice(0, 16))
          || /1\s*\/\s*1\W*(possible|chance|chances|hits?|odds)\b/i.test(near)) continue;
    }
    runs.add(run);
  }
  if (/\bone\s+of\s+one\b/i.test(title)) runs.add(1);
  return runs;
}

/** Best parallel in one set for this title, honoring the serial number. */
function matchInSet(set, words, runs) {
  const all = [...set.parallels.numbered, ...set.parallels.unnumbered];
  let best = null;
  for (const p of all) {
    if (p.key === set.baseKey) continue;
    const tokens = parallelTokens(p);
    const exact = containsPhrase(words, tokens);
    const loose = !exact && tokens.length > 1 && tokens.every((t) => words.includes(t));
    if (!exact && !loose) continue;
    // Serial must agree: numbered parallels need their run in the title,
    // unnumbered ones need the title to carry no serial at all.
    if (p.run ? !runs.has(p.run) : runs.size > 0) continue;
    // "Cracked Ice" is the retail name for Ice Prizm; treat it as the same finish.
    const stray = words.find((w) => FINISH_WORDS.has(w) && !tokens.includes(w) && !(w === 'cracked' && tokens.includes('ice')));
    if (stray) continue;
    const score = tokens.length + (exact ? 0.5 : 0);
    if (!best || score > best.score) best = { p, score };
  }
  return best?.p || null;
}

/**
 * Main parser. Takes an eBay listing title and returns the best matching
 * set + parallel, or null if we can't confidently identify it.
 */
export function parseSetFromTitle(title) {
  if (!title || typeof title !== 'string') return null;
  if (AUTO_OR_INSERT.test(title) || SEALED_PRODUCT.test(title)) return null;
  if (PRIZM_BLACK_PRODUCT.test(title) && !/\b1\/1\b/.test(title)) return null;

  const years = extractYears(title);
  if (!years.size) return null;
  const sport = SPORT_HINTS.find((h) => h.re.test(title))?.sport;
  const words = normalize(title);
  const runs = extractRuns(title);

  const candidates = Object.entries(PARALLEL_DATA).filter(([, set]) => {
    const b = BRANDS[set.brand];
    if (!b || !b.include.test(title) || b.exclude?.test(title)) return false;
    if (b.require && !b.require.test(title)) return false;
    if (sport && set.sport !== sport) return false;
    return yearFits(set, years);
  });
  if (!candidates.length) return null;

  // 1. A named parallel that agrees with the serial.
  const named = candidates
    .map(([setKey, set]) => ({ setKey, p: matchInSet(set, words, runs) }))
    .filter((r) => r.p);
  if (named.length === 1) return { setKey: named[0].setKey, parallelKey: named[0].p.key, run: named[0].p.run };
  if (named.length > 1) return null;

  // Past here the title names no parallel we know, so a single set has to fit,
  // and a finish word we couldn't match means it's a parallel we don't hold.
  if (candidates.length !== 1) return null;
  if (words.some((w) => FINISH_WORDS.has(w))) return null;
  const [setKey, set] = candidates[0];

  // 2. A serial that lands on one of this set's rungs: we can place the card
  //    on the ladder even without knowing which colour it is.
  if (runs.size) {
    const run = [...runs].find((r) => set.parallels.numbered.some((p) => p.run === r));
    return run ? { setKey, parallelKey: null, run } : null;
  }

  // 3. No serial and no parallel: the base card (Young Guns has a base parallel).
  return { setKey, parallelKey: set.baseKey || null, run: null };
}
