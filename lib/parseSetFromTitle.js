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
// Autographs: a signed title only looks at autograph lists (kind 'auto'),
// and only when it names the line: "CPA", "1st", "Prospect Auto" for
// prospect autos; "Rookie Auto", "RC Auto", "RA-" for rookie autos; "Rated
// Rookie" for Optic. Every other autograph set (Future Stars, Chromographs,
// Sensational Signatures...) has its own colours, so naming one, or naming
// both lines, returns null. Patches, relics, inserts and variations always
// return null.
//
// Bowman: the spring Bowman release and the autumn Bowman Chrome box both
// have "Bowman Chrome Prospects" with different rainbows, and sellers name
// them the same way. Both are held, so a colour found in both returns null
// and only a colour unique to one of them is placed.
//
// Sport: from title words ("football", "NFL") or, failing that, the sport of
// the player the visitor searched for (opts.sport, from the spelling-help
// roster; 'college' for college players). If neither is known and two
// sports' sets both fit, we return null rather than guess.

import { PARALLEL_DATA } from './parallelData';

const BRANDS = {
  'topps-chrome': {
    include: /\btopps\s+(?:20\d{2}(?:-\d{2})?\s+)?chrome\b/i,
    // Football and basketball aren't excluded: sport hints (title words, or
    // the searched player's sport) pick between same-year Chrome sets, and a
    // title that fits more than one with no hint is left unidentified.
    exclude: /\bbowman\b|\bchrome\s+(update|sapphire|black|platinum|formula|cosmic|ufc|f1|soccer|uefa|star\s+wars|logofractor|overdrive|disney|wwe)\b|\bupdate\s+series\b|\bcosmic\b|\bsapphire\b|\b(tennis|golf|racing|nascar|indycar|soccer|mls|uefa|f1|formula\s+1|ufc|wwe|wrestling|pokemon|star\s+wars|disney|marvel)\b/i,
  },
  'topps-series-1': {
    include: /\btopps\b.*\bseries\s*(?:1|one|i)\b|\btopps\s+s1\b/i,
    exclude: /\bchrome\b|\bheritage\b|\bupdate\b|\bbowman\b|\bseries\s*(?:2|two|ii)\b|\bopening\s+day\b|\bstadium\s+club\b|\bfinest\b|\bgilded\b|\barchives\b|\bginter\b|\bbig\s+league\b|\btopps\s+now\b|\bmini\b|\bjapan\s+edition\b/i,
    needSport: true,
  },
  'topps-series-2': {
    include: /\btopps\b.*\bseries\s*(?:2|two|ii)\b|\btopps\s+s2\b/i,
    exclude: /\bchrome\b|\bheritage\b|\bupdate\b|\bbowman\b|\bseries\s*(?:1|one|i)\b|\bopening\s+day\b|\bstadium\s+club\b|\bfinest\b|\bgilded\b|\barchives\b|\bginter\b|\bbig\s+league\b|\btopps\s+now\b|\bmini\b|\bjapan\s+edition\b/i,
    needSport: true,
  },
  'ud-series-2': {
    // Upper Deck Series 2 hockey base and parallels (Young Guns is its own list).
    include: /\bupper\s+deck\b.*\bseries\s*2\b|\bud\s+series\s*2\b/i,
    exclude: /\byoung\s+guns?\b|\bcanvas\b|\bmvp\b|\bseries\s*1\b|\bextended\b|\bbasketball\b|\bbaseball\b|\bfootball\b|\bsp\s+authentic\b/i,
    needSport: true,
  },
  'topps-flagship': {
    // Plain Topps basketball. "Topps" is on every Topps product, so the
    // other product names are excluded and the sport has to be known.
    include: /\btopps\b/i,
    exclude: /\bchrome\b|\bfinest\b|\bcosmic\b|\bbowman\b|\btopps\s+now\b|\bmotif\b|\broyalty\b|\bmidnight\b|\bthree\b|\binception\b|\bdynasty\b|\bsapphire\b|\bstadium\s+club\b|\bgilded\b|\btribute\b|\bmuseum\b|\btranscendent\b|\bsterling\b|\bheritage\b|\barchives\b|\bupdate\b|\bseries\b|\bholiday\b|\bsignature\s+class\b|\bcomplete\s+set\b|\bf1\b|\bufc\b|\bwwe\b|\bsoccer\b|\bmerlin\b/i,
    needSport: true,
  },
  'bowman-chrome': {
    // Baseball prospects: the autumn Bowman Chrome box and the spring Bowman
    // release (both print "Bowman Chrome Prospects").
    include: /\bbowman\b/i,
    exclude: /\b(draft|sapphire|university|mega|mojo|bdc|cda|sterling|platinum|inception|transcendent|best|paper|football|basketball|nil|nfl|nba)\b|\bbowman\s+u\b|\bbp-?\d|\b(?:bppa|bpa|ppa|pa)-/i,
    require: /\bbcp\b|\bcpa\b|\bprospects?\b|\b1st\b/i,
  },
  'bowman-draft': {
    include: /\bbowman\s+draft\b|\bbdc\b/i,
    exclude: /\b(sapphire|mega|paper|super\s+jumbo|sterling|platinum|football|basketball)\b|\bbd-?\d/i,
    require: /\bchrome\b|\bbdc\b|\bcpa\b/i,
  },
  'bowman-college': {
    // 2026 Bowman Football / 2025-26 Bowman Basketball college prospects.
    include: /\bbowman\b/i,
    // Card codes: BCP/BCPA are the chrome prospects; BPP/BPPA/BPA paper,
    // BCRA/BCA the NFL rookie and veteran autographs, BFA Buzz Factor.
    exclude: /\b(draft|sterling|best|university|mega|paper|sapphire|platinum|inception)\b|\bbowman\s+u\b|\bbp-?\d|\b(?:bppa|bpps|bpp|bpa|bpra|ppa|pa|bcra|bca|bcv|brr|bcr|bfa|bs|bv)-/i,
    require: /\bchrome\b|\bprospects?\b|\b1st\b|\bcpa\b|\bnil\b|\bbcp\b/i,
    // "2026 Bowman Chrome Prospects" is also a baseball card: the sport has
    // to come from the title or the searched player.
    needSport: true,
  },
  'panini-prizm': {
    include: /\bprizm\b/i,
    exclude: /\b(draft\s+picks|monopoly|deca|select|optic|mosaic|wnba|ufc|f1|world\s+cup|euro|premier|epl|la\s+liga|instant|flawless|obsidian|chronicles|contenders|phoenix)\b/i,
  },
  'donruss-optic': {
    include: /\boptic\b/i,
    exclude: /\b(chronicles|contenders|phoenix|clearly|select|mosaic|wnba|fifa|soccer|road\s+to|preview)\b|\bprizm\b(?!s)/i,
  },
  'panini-mosaic': {
    include: /\bmosaic\b/i,
    exclude: /\b(prizm|select|optic|chronicles|contenders|fifa|soccer|uefa|wnba|ufc|f1|road\s+to)\b/i,
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
  { sport: 'baseball', re: /\b(baseball|mlb)\b/i },
  { sport: 'hockey', re: /\b(hockey|nhl)\b/i },
];

const AUTO = /\b(auto|autos|autograph|autographs|autographed|signed|signatures?|on[-\s]?card)\b/i;

// Inserts, memorabilia and variations: never a base or autograph ladder.
const INSERT = /\b(patch|patches|rpa|relic|relics|jersey|jerseys|memorabilia|swatch|swatches|dual|triple|quad|booklet|fireworks|kaleidoscopic|fractal|prizmania|manga|color\s+blast|aurora|downtown|variation|variations|ssp|image\s+var|redemption|cut|inscribed|inscriptions?|checklist|inserts?|oversized|stained\s+glass|recruits?|fearless)\b/i;

// Other autograph sets. Their colours differ from the main line's.
const OTHER_AUTO_LINES = /\b(chromographs?|future\s+stars|radiating|legends?|1989|1990|1991|all[-\s]?etch|all[-\s]?pro|hall\s+of\s+chrome|tecmo|buyback|cooperstown|numbers\s+live|world\s+series|perspectives|logoman|retail|adios|max\s+volume|melt\s+mashers|ascensions|gpk|spotlights?|prime\s+chrome|all[-\s]?america|aag|international|retrofractor|spring\s+breakout|across\s+the\s+seams|big\s+break|it\s+came|travel\s+tags|wbc|flag|gold\s+ink|packfractor|sterling|pairings|electric\s+sluggers|power\s+chords|under\s+the\s+radar|anime|paper|achromatic|draft\s+night|in\s+action|dream\s+draft|prized|sensational|flashback|retro|penmanship|fast\s+break|franchise|prizmatrix|signature\s+style|skywrite|next\s+stop|stratospheric|certified|timeless|opening\s+statement|buzz\s+factor|future\s+scripts?|showtime|dominators|opti-?graphs|elite|holiday|1955|gladiators|my\s+1st|afl|fall\s+stars|class\s+of|ring\s+of\s+honor|veterans?|on\s+the\s+spot|ultraviolet|choice\s+autos?|choice\s+autographs?|legacy|stars\s+signatures|signing\s+day|collegiate|new\s+applicants|real\s+one|mastery|canvas|future\s+watch|rra|rrpa)\b/i;

// Which autograph line the title names. A title that names more than one,
// or none, isn't placed.
const AUTO_LINES = {
  'prospect-auto': /\bcpa\b|\bbcpa\b|\bprospects?\b|\b1st\b/i,
  'rookie-auto': /\brookie\s+(?:auto|autos|autograph|autographs|signatures?)\b|\b(?:rc|rookie)\s+(?:on[-\s]?card\s+)?auto\b|\bauto\b.*\b(?:rc|rookie)\b|\b(?:c?ra)-[a-z]/i,
  'rated-rookie-auto': /\brated\s+rookies?\b|\brr\b/i,
};

// Lots and pick-your-own listings ("Complete Your Set", "You Pick", "Team
// Sets") aren't one card.
const LOT = /\b(complete\s+(?:your\s+)?(?:set|base\s+set)|you\s+pick|pick\s+(?:your|one|ones|a|from|any)|pick\s+from|team\s+sets?|full\s+team|base\s+card\s+set|finish\s+sets?|complete\s+base)\b/i;

// Sealed packs, boxes and repacks aren't a single card.
const SEALED_PRODUCT = /\bsealed\s+(?:\w+\s+){0,2}(?:pack|packs|box|boxes|case|blaster|hanger|mega)\b|\b(?:mystery|repack|re-pack)\b|\bhobby\s+box\b/i;

// "Panini Prizm Black" is its own high-end product, unless the title is just
// a Black Prizm 1/1.
const PRIZM_BLACK_PRODUCT = /\bpanini\s+prizm\s+black\b/i;

// Team names that contain a colour, removed before colours are read so a
// "Boston Red Sox" title isn't taken as a Red parallel.
const COLOUR_TEAMS = /\b(green\s+bay|red\s+sox|white\s+sox|blue\s+jays|blue\s+jackets|red\s+wings|golden\s+state|golden\s+knights|blue\s+devils|crimson\s+tide|orange(?:men)?\s+(?:crush|county)|(?:ohio\s+state\s+)?buckeyes|red\s+raiders|golden\s+(?:bears|gophers|eagles|hurricane|flashes)|green\s+wave|scarlet\s+knights|orange\s+bowl)\b/gi;

// Finish and family words. If the title carries one the matched parallel
// doesn't, it's a parallel we don't hold ("Green Geo /99" is not Green /99),
// so we reject instead of claiming the plain colour. Each set's own family
// words (from its parallel names) are added to these.
const FINISH_WORDS = new Set([
  'wave', 'raywave', 'lava', 'sonar', 'geo', 'geometric', 'speckle', 'shimmer',
  'reptilian', 'mini', 'diamond', 'galactic', 'sapphire', 'cracked', 'sparkle',
  'pulsar', 'seismic', 'lazer', 'scope', 'disco', 'checker', 'camo', 'mojo',
  'hyper', 'snakeskin', 'vinyl', 'finite', 'nebula', 'tiger', 'stripe', 'glitter',
  'pandora', 'choice', 'fast', 'break', 'huddle', 'fotl', 'prism', 'negative',
  'sepia', 'logofractor', 'frozenfractor', 'superfractor', 'outburst', 'gloss',
  'xfractor', 'holo', 'foil', 'rainbow', 'diamante', 'velocity', 'shock', 'lunar',
]);

// Colours and plain words that sit in parallel names without being a family:
// these never count as a stray finish.
const NOT_FAMILY = new Set([
  'red', 'orange', 'yellow', 'gold', 'green', 'blue', 'purple', 'pink', 'black',
  'white', 'silver', 'aqua', 'teal', 'magenta', 'fuchsia', 'bronze', 'platinum',
  'base', 'one', 'of', 'the', 'football', 'basketball', 'baseball', 'hockey',
  'bowman', 'topps', 'panini', 'rookie', 'rookies', 'auto', 'autograph', '1st',
  'card', 'cards', 'logo', 'team', 'day', 'first', 'issue', 'set', 'sets',
]);

const COLOURS = new Set(['red', 'orange', 'yellow', 'gold', 'green', 'blue', 'purple', 'pink', 'black', 'white', 'silver', 'aqua', 'teal', 'magenta', 'fuchsia', 'bronze', 'navy', 'burgundy', 'lime', 'neon']);

// "Topps Chrome Basketball", "Mosaic Football": the product name, not the
// Basketball Refractor or Football Leather parallels.
const PRODUCT_SPORT = /\b(chrome|topps|bowman|prizm|optic|mosaic|donruss|panini)\s+(football|basketball|baseball|hockey)\b/gi;

// Words that sit around parallel names without distinguishing them.
const FILLER = new Set(['prizm', 'prizms', 'refractor', 'refractors', 'parallel', 'parallels', 'and', 'mosaic']);

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/super\s*fractor/g, 'superfractor')
    .replace(/ray\s*wave/g, 'raywave')
    .replace(/frozen\s*fractor/g, 'frozenfractor')
    .replace(/x-?\s?fractor/g, 'xfractor')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w && !FILLER.has(w));
}

function parallelTokens(p) {
  // "Base Refractor", "Base Silver Prizms": sellers leave out "Base".
  const t = normalize(p.name).filter((w, i) => !(i === 0 && w === 'base'));
  // Bare "Refractor" normalizes to nothing; match on the word itself.
  return t.length ? t : p.name.toLowerCase().split(/\s+/).filter((w) => w !== 'base');
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
  // A year written as a print run ("Gold /2026") isn't the card's year.
  for (const m of rest.matchAll(/(?<!\/)\b(20\d{2})\b/g)) years.add(parseInt(m[1], 10));
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

const allOf = (set) => [...set.parallels.numbered, ...set.parallels.unnumbered];

/** Family words used in this set's parallel names ("lava", "mojo", "holo"...). */
const familyCache = new WeakMap();
function familyWords(set) {
  if (!familyCache.has(set)) {
    const w = new Set(FINISH_WORDS);
    // The base card's own name ("Young Guns") is not a family.
    for (const p of allOf(set)) if (p.key !== set.baseKey) for (const t of normalize(p.name)) if (!NOT_FAMILY.has(t) && !/^\d/.test(t)) w.add(t);
    familyCache.set(set, w);
  }
  return familyCache.get(set);
}

/** Best parallel in one set for this title, honoring the serial number. */
function matchInSet(set, words, runs, raw, lot) {
  const family = familyWords(set);
  let best = null;
  for (const p of allOf(set)) {
    if (p.key === set.baseKey) continue;
    // A lot listing names the base set, not one colour ("Base Mosaic" matched on "mosaic").
    if (lot && /^base/.test(p.key)) continue;
    const tokens = parallelTokens(p);
    if (!tokens.length) continue;
    // Bare "Refractor" is only filler words, so look for it in the raw title.
    const hay = tokens.every((t) => FILLER.has(t)) ? raw : words;
    const exact = containsPhrase(hay, tokens);
    const loose = !exact && tokens.length > 1 && tokens.every((t) => words.includes(t));
    if (!exact && !loose) continue;
    // Serial must agree: numbered parallels need their run in the title,
    // unnumbered ones need the title to carry no serial at all.
    if (p.run ? !runs.has(p.run) : runs.size > 0) continue;
    // "Cracked Ice" is the retail name for Ice Prizm; treat it as the same finish.
    const stray = words.find((w) => family.has(w) && !tokens.includes(w) && !(w === 'cracked' && tokens.includes('ice')));
    if (stray) continue;
    // A second colour ("Green Shimmer" read as plain "Shimmer") means the
    // title names a parallel we don't hold, or two cards.
    if (words.some((w) => COLOURS.has(w) && !tokens.includes(w))) continue;
    const score = tokens.length + (exact ? 0.5 : 0);
    if (!best || score > best.score) best = { p, score, tie: false };
    else if (score === best.score && p.run !== best.p.run) best.tie = true;
  }
  // Two different rungs fit equally well: don't pick one.
  return best && !best.tie ? best.p : null;
}

/** Any word from this set's parallel names, colours included. */
function namesAColour(set, words) {
  const family = familyWords(set);
  const colours = new Set();
  for (const p of allOf(set)) if (p.key !== set.baseKey) for (const t of normalize(p.name)) colours.add(t);
  return words.some((w) => family.has(w) || (colours.has(w) && !NOT_FAMILY.has(w)) || /^(red|orange|yellow|gold|green|blue|purple|pink|black|white|silver|aqua|teal)$/.test(w));
}

/** The autograph line a signed title names, or null (none, or more than one). */
function autoLine(title) {
  if (OTHER_AUTO_LINES.test(title)) return null;
  const hits = Object.entries(AUTO_LINES).filter(([, re]) => re.test(title)).map(([k]) => k);
  // "Rated Rookie Auto" also reads as a rookie auto; Optic's line wins.
  if (hits.includes('rated-rookie-auto')) return hits.includes('prospect-auto') ? null : 'rated-rookie-auto';
  return hits.length === 1 ? hits[0] : null;
}

/** The title names another set from the same product (an insert, another autograph line). */
const othersCache = new WeakMap();
function namesOtherSet(set, words) {
  if (!set.others) return false;
  if (!othersCache.has(set)) othersCache.set(set, set.others.map((o) => normalize(o)).filter((t) => t.length));
  return othersCache.get(set).some((phrase) => containsPhrase(words, phrase));
}

function sportFits(set, sport) {
  if (!sport) return true;
  if (sport === 'college') return !!set.college;
  return set.sport === sport;
}

/**
 * Main parser. Takes an eBay listing title and returns the best matching
 * set + parallel, or null if we can't confidently identify it.
 */
export function parseSetFromTitle(title, opts = {}) {
  if (!title || typeof title !== 'string') return null;
  if (INSERT.test(title) || SEALED_PRODUCT.test(title)) return null;
  if (PRIZM_BLACK_PRODUCT.test(title) && !/\b1\/1\b/.test(title)) return null;

  const signed = AUTO.test(title);
  const line = signed ? autoLine(title) : null;
  if (signed && !line) return null;

  const years = extractYears(title);
  if (!years.size) return null;
  const titleSport = SPORT_HINTS.find((h) => h.re.test(title))?.sport || null;
  const sport = titleSport || opts.sport || null;
  const words = normalize(title.replace(COLOUR_TEAMS, ' ').replace(PRODUCT_SPORT, '$1'));
  const raw = title.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const runs = extractRuns(title);

  const candidates = Object.entries(PARALLEL_DATA).filter(([, set]) => {
    if (signed ? set.kind !== 'auto' || set.line !== line : set.kind === 'auto') return false;
    const b = BRANDS[set.brand];
    if (!b || !b.include.test(title) || b.exclude?.test(title)) return false;
    if (b.require && !b.require.test(title)) return false;
    if (b.needSport && !sport) return false;
    if (!sportFits(set, sport)) return false;
    return yearFits(set, years);
  });
  if (!candidates.length) return null;
  // An insert or other autograph line named by any fitting set's checklist
  // ("Travel Tags", "Mosaic Bang") means it's not a card on these ladders.
  if (candidates.some(([, set]) => namesOtherSet(set, words))) return null;
  // Sets from two sports still fit and nothing says which: don't let a colour
  // that happens to exist in only one of them decide.
  if ((!sport || sport === 'college') && new Set(candidates.map(([, set]) => set.sport)).size > 1) return null;

  // 1. A named parallel that agrees with the serial.
  const named = candidates
    .map(([setKey, set]) => ({ setKey, p: matchInSet(set, words, runs, raw, LOT.test(title)) }))
    .filter((r) => r.p);
  if (named.length === 1) return { setKey: named[0].setKey, parallelKey: named[0].p.key, run: named[0].p.run };
  if (named.length > 1) return null;

  // Past here the title names no parallel we know, so a single set has to fit,
  // and a finish word we couldn't match means it's a parallel we don't hold.
  if (candidates.length !== 1) return null;
  const [setKey, set] = candidates[0];
  if (set.requireNamed || LOT.test(title)) return null;
  const family = familyWords(set);
  if (words.some((w) => family.has(w))) return null;

  // 2. A serial that lands on one of this set's rungs: we can place the card
  //    on the ladder even without knowing which colour it is.
  if (runs.size) {
    const run = [...runs].find((r) => set.parallels.numbered.some((p) => p.run === r));
    return run ? { setKey, parallelKey: null, run } : null;
  }

  // 3. No serial and no parallel: the base card (Young Guns has a base
  //    parallel; autograph lists have the plain signed card). A colour we
  //    couldn't place ("Gold Refractor" with no serial) isn't the base card.
  // "Refractor" with nothing else is a refractor, not the base card.
  if (namesAColour(set, words) || raw.some((w) => /^(refractors?|parallels?)$/.test(w))) return null;
  return { setKey, parallelKey: set.baseKey || null, run: null };
}
