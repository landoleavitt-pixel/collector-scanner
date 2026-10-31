// lib/tcg/parseTitle.js
//
// Reads a card-game listing title. Title parsing is the main method; eBay's
// item specifics are only a backup (research/non-sports-filters.md section 4:
// the Rarity, Set and Grader fields are too coarse or too often wrong, and
// search results don't include them anyway).
//
//   parseTitle(title, { game, aspects }) →
//     { game, rarity, serial: {n, of} | null, grade: {grader, grade} | null,
//       language, firstEdition, shadowless, printing, printingLabel,
//       proxy, lot }
//
// opts.game     the game we searched for, used when the title doesn't say
// opts.aspects  item specifics if we have them: { Rarity, Language, Features,
//               'Professional Grader', Grade }

import { GAMES } from './games';
import { LADDERS } from './ladders';

// Lowercase, accents off ("Pokémon" → "pokemon"), curly quotes straightened.
export function normalize(s) {
  return String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’ʼ]/g, "'")
    .toLowerCase();
}

// ── Game ────────────────────────────────────────────────────────────────────
export function detectGame(title, hint = null) {
  const raw = String(title || '');
  const named = GAMES.filter((g) => g.title.test(raw));
  if (named.length === 1) return named[0].key;
  if (named.length > 1) return hint && named.some((g) => g.key === hint) ? hint : named[0].key;
  const coded = GAMES.filter((g) => g.codes && g.codes.test(raw));
  if (coded.length === 1) return coded[0].key;
  return hint || null;
}

// ── Rarity ──────────────────────────────────────────────────────────────────
function rungFor(game, text) {
  for (const rung of LADDERS[game] || []) {
    if (rung.match.some((re) => re.test(text))) return rung;
  }
  return null;
}

// Pokémon secret rare by number: the card number is above the set total
// ("105/102"). Only used when the title names no rarity.
function pokemonSecretByNumber(t) {
  for (const m of t.matchAll(/(?:^|[^\d/])#?(\d{1,3})\s*\/\s*(\d{2,3})(?![\d/])/g)) {
    const n = Number(m[1]);
    const of = Number(m[2]);
    if (of >= 30 && n > of && n - of <= 120) return true;
  }
  return false;
}

// ── Serial number ───────────────────────────────────────────────────────────
// Card games print a collector number on every card ("025/165"), so a bare
// fraction is NOT a serial number here. We only read one when the title
// says it is stamped: "serialized", "serial numbered", "numbered", "#'d".
const SERIAL_WORD = /\bseriali[sz]ed\b|\bserial\b|\bnumbered\b|#'?d\b|\bone of one\b/g;
const FRACTION = /(?:^|[^\d])#?\s*(\d{1,4})\s*\/\s*(\d{1,4})(?!\d)|(?:^|[^\d\w])\/\s*(\d{1,4})(?!\d)|\b(\d{1,4})\s+of\s+(\d{1,4})\b/g;

export function parseSerial(t) {
  const words = [...t.matchAll(SERIAL_WORD)].map((m) => m.index);
  if (!words.length) return null;
  if (/\bone of one\b/.test(t)) return { n: 1, of: 1 };
  let best = null;
  for (const m of t.matchAll(FRACTION)) {
    let n;
    let of;
    if (m[2] != null) { n = Number(m[1]); of = Number(m[2]); }
    else if (m[3] != null) { n = null; of = Number(m[3]); }
    else { n = Number(m[4]); of = Number(m[5]); }
    if (!(of >= 1 && of <= 9999)) continue;
    if (n != null && (n < 1 || n > of)) continue;
    // Years ("2023/24") aren't serials.
    if (n != null && n >= 1990 && n <= 2099) continue;
    const dist = Math.min(...words.map((w) => Math.abs(w - m.index)));
    if (dist > 40) continue;
    if (!best || dist < best.dist) best = { n, of, dist };
  }
  return best ? { n: best.n, of: best.of } : null;
}

// ── Grade ───────────────────────────────────────────────────────────────────
// PSA, CGC, BGS (Beckett), TAG and SGC, as in the research.
const GRADERS = { psa: 'PSA', cgc: 'CGC', bgs: 'BGS', beckett: 'BGS', tag: 'TAG', sgc: 'SGC' };
const GRADE_RE = /\b(psa|cgc|bgs|beckett|tag|sgc)\s*-?\s*(?:(?:gem\s*mint|gem\s*mt|gem|mint|pristine|perfect|black\s*label|nm-?mt|nm)\s*)?(10|[1-9](?:\.5)?)(?![\d.]*\/)(?!\d)/i;
const GRADER_ONLY_RE = /\b(psa|cgc|bgs|beckett|tag|sgc)\s*(?:graded|slab|gem|authentic)\b/i;

export function parseGrade(t, aspects) {
  const m = t.match(GRADE_RE);
  if (m) return { grader: GRADERS[m[1].toLowerCase()], grade: Number(m[2]) };
  const g = t.match(GRADER_ONLY_RE);
  if (g) return { grader: GRADERS[g[1].toLowerCase()], grade: null };
  // Backup: item specifics. Skip graders that aren't on our list (sellers
  // pick "Rare Edition (Rare)" by mistake for Yu-Gi-Oh!).
  const ag = normalize(aspects?.['Professional Grader']);
  const key = Object.keys(GRADERS).find((k) => new RegExp(`\\b${k}\\b`).test(ag));
  if (key) {
    const n = Number(String(aspects?.Grade || '').match(/\d+(?:\.5)?/)?.[0]);
    return { grader: GRADERS[key], grade: Number.isFinite(n) && n > 0 ? n : null };
  }
  return null;
}

// ── Language ────────────────────────────────────────────────────────────────
// 'en' | 'ja' | 'other'. English unless the title (or the Language field)
// says otherwise.
const JA_RE = /\bjapanese\b|\bjpn?\b|\bjapan\b|日本|-jp\d{3}\b/;
const OTHER_RE = /\bchinese\b|\bs-chinese\b|\bt-chinese\b|\bkorean\b|\bkor\b|\bgerman\b|\bdeutsch\b|\bfrench\b|\bfrancais\b|\bitalian\b|\bitaliano\b|\bspanish\b|\bespanol\b|\bportuguese\b|\brussian\b|\bthai\b|\bindonesian\b|-(?:de|fr|it|sp|pt|kr|ae)\d{3}\b/;

export function parseLanguage(t, aspects) {
  if (JA_RE.test(t)) return 'ja';
  if (OTHER_RE.test(t)) return 'other';
  const a = normalize(aspects?.Language);
  if (a) {
    if (/japanese/.test(a)) return 'ja';
    if (!/english/.test(a)) return 'other';
  }
  return 'en';
}

// ── Flags ───────────────────────────────────────────────────────────────────
const FIRST_ED = /\b1st[\s.-]*ed(?:ition|\.|t)?\b|\bfirst\s+edition\b|\b1st\b(?!\s*(?:place|prize|anniversary|day|print|run|run\b|gen|series|movie|appearance))/;

// Fakes, customs and novelty items. The card-family test
// (research/card-family-test.md, group 1) found "Play Test" proxies, altered
// art sold for Commander, DIY and themed customs, metal cards and Black Lotus
// novelties (COA replicas, "currency" cards, puzzle promos).
const PROXY = /\bprox(?:y|ies)\b|\bcustoms?\b|\borica\b|\bfan[\s-]*(?:art|made)\b|\breplica\b|\bnot\s+real\b|\bunofficial\b|\bnovelty\b|\bdoujin\b|\bdiy\b|\bwaifu\b|\bbox\s+art\b|\bcurrency\b|\bpuzzle\b|\bmetal\s+cards?\b|\b(?:gold|silver|black)\s+metal\b|\baltered\s+(?:full\s+)?art\b|\bhand[\s-]*(?:painted|altered)\b|\baltered\b.*\b(?:commander|edh)\b|\b(?:commander|edh)\b.*\baltered\b/;
// "Play Test" cards are proxies, except Wizards' own Mystery Booster playtest cards.
const PLAYTEST = /\bplay[\s-]*tests?\b/;
const REAL_PLAYTEST = /\bmystery\s+booster\b|\bcmb[12]\b/;
// Magic customs dressed in other franchises (Naruto, Kirby, Nintendo).
const MTG_THEMED = /\bnaruto\b|\bkirby\b|\bnintendo\b|\bsuper\s+mario\b|\bzelda\b|\bdragon\s*ball\b/;
// Metal Pokémon cards; skips trainer cards with "Metal" in the name.
const POKEMON_METAL = /\bmetal\b(?!\s+(?:energy|type|goggles|saucer|core|frying|maker|links))/;

export function isProxy(t, game) {
  if (PROXY.test(t)) return true;
  if (PLAYTEST.test(t) && !REAL_PLAYTEST.test(t)) return true;
  if (game === 'mtg' && MTG_THEMED.test(t)) return true;
  if (game === 'pokemon' && POKEMON_METAL.test(t)) return true;
  return false;
}

// Special printings: reprints and promos that look like the set card but
// aren't (card-family test, group 2). They get their own label and never the
// normal card's. First match wins; "Promo" alone is the "not confirmed" case.
export const PRINTINGS = [
  { key: 'wcd', label: 'World Championship Deck', games: ['mtg'], re: /\bworld\s+champ(?:ionship)?s?\b(?!.*\bprize\b)|\bwcd\b|\bgold\s+border(?:ed)?\b/ },
  { key: 'wcd', label: 'World Championship Deck', games: ['pokemon'], re: /\bworld\s+champ(?:ionship)?s?\s+decks?\b|\bwcd\b/ },
  { key: 'list', label: 'The List', games: ['mtg'], re: /\bthe\s+list\b|\bplst\b|^list\b|\(list\)|\blist\s+(?:reprint|version|\d)/ },
  { key: 'mystery', label: 'Mystery Booster', games: ['mtg'], re: /\bmystery\s+booster\b|\bcmb[12]\b/ },
  { key: 'judge', label: 'Promo · Judge', re: /\bjudge\s+(?:promos?|foils?|gift|rewards?|program|academy|exclusive)\b|\bdci\s+judge\b/ },
  { key: 'prerelease', label: 'Promo · Prerelease', re: /\bpre-?release\b/ },
  { key: 'prize-pack', label: 'Promo · Prize Pack', games: ['pokemon'], re: /\bprize\s+pack\b|\bplay!?\s*pokemon\s+(?:stamp|prize)/ },
  { key: 'box-topper', label: 'Promo · Box topper', re: /\bbox\s*toppers?\b/ },
  { key: 'stamped', label: 'Promo · Stamped', re: /\bpromo\s*packs?\b|\bstamp(?:ed)?\b|\bp-stamp(?:ed)?\b|\bsurprise\s+box\b/ },
  { key: 'book', label: 'Promo · Book', games: ['mtg'], re: /\bbook\s+promo\b/ },
  { key: 'promo', label: 'Promo', re: /\bpromos?\b/ },
];

export function parsePrinting(t, game) {
  return PRINTINGS.find((p) => (!p.games || p.games.includes(game)) && p.re.test(t)) || null;
}

// Lots, bundles and sealed product. Singles that mention a pack, box or
// collection ("pack fresh", "box topper", "Prize Pack", "Ultra Premium
// Collection promo", "sealed promo") are cleared first.
const SINGLE_PHRASES = /\bpack[\s-]*fresh\b|\b(?:fresh\s+)?(?:from|out\s+of|of)\s+(?:a\s+|the\s+)?(?:booster\s+)?(?:pack|box)\b|\bpulled\b[^,]{0,20}\b(?:pack|box)\b|\bbox\s+toppers?\b|\b(?:etb|box|blister|tin|collection|premium)\s+(?:exclusive\s+)?promo\b|\bprize\s+pack\b|\bpromo\s*packs?\b|\bsurprise\s+box\b|\bpremium\s+(?:collection|deck)\b|\bsealed\s+(?:single|promo|card)\b|\bpromo\s+(?:still\s+)?sealed\b|\bmystery\s+booster\b/g;
// Always a lot.
const LOT = /\blots?\b|\bbundle\b|\bbulk\b|\bplayset\b|\b[2-9]\s*x\b|\bx\s*[2-9]\b|(?<![/#\d])(?:[2-9]|[1-9]\d{1,3})(?!\d)\s*-?\s*(?:card|cards|ct|count|pcs?|pieces?)\b|\brepacks?\b|\bmystery\b|\bbooster\s+(?:box|case|bundle)\b|\betb\b|\belite\s+trainer\b|\bcomplete\s+set\b|\bset\s+of\s+(?:[2-9]|two|three)\b|\b(?:sar|sr|ar|chr|csr|ur|sir|ir)\s+set\b/;
// A lot only when the title has no card number or promo code.
const LOT_WEAK = /\bsealed\b|\bboxe?s?\b|\bpacks?\b/;
const CARD_NO = /(?<![\d/])\d{1,3}\s*\/\s*\d{2,3}(?![\d/])|\b(?:swsh|svp|smp?|xy|bw|mep)\s*-?\s*(?:en\s*)?\d{2,3}\b|\b[a-z0-9]{2,4}-(?:en|jp|de|fr|it|sp|pt|kr)\d{3}\b|\b(?:op|st|eb|prb)\d{2}-\d{3}\b|#\s*\d{1,4}\b/;
// Two different collector numbers in one title is two cards ("Mewtwo ex
// 205/165 + Mew ex 204/165"). Pop reports ("pop 1/12") don't count.
const NUMBERS = /(?<![\d/]|pop\s?)(\d{1,3})\s*\/\s*(\d{2,3})(?![\d/])/g;

export function isLot(t, serial = null) {
  const s = t.replace(SINGLE_PHRASES, ' ');
  if (LOT.test(s)) return true;
  if (LOT_WEAK.test(s) && !CARD_NO.test(t)) return true;
  const nums = new Set();
  for (const m of t.matchAll(NUMBERS)) {
    const n = Number(m[1]);
    const of = Number(m[2]);
    if (serial && serial.of === of && (serial.n == null || serial.n === n)) continue;
    nums.add(`${n}/${of}`);
  }
  return nums.size >= 2;
}

// ── All together ────────────────────────────────────────────────────────────
export function parseTitle(title, opts = {}) {
  const t = normalize(title);
  const aspects = opts.aspects || null;
  const game = detectGame(title, opts.game || null);

  let rarity = game ? rungFor(game, t) : null;
  if (!rarity && game && aspects?.Rarity) rarity = rungFor(game, normalize(aspects.Rarity));
  if (!rarity && game === 'pokemon' && pokemonSecretByNumber(t)) {
    rarity = LADDERS.pokemon.find((g) => g.key === 'secret');
  }

  const serial = parseSerial(t);
  // A stamped Magic card is "Serialized" even when the title only says "numbered".
  if (serial && game === 'mtg') rarity = LADDERS.mtg[0];

  const features = normalize(aspects?.Features);
  const printing = parsePrinting(t, game);
  return {
    game,
    rarity: rarity ? rarity.key : null,
    serial,
    grade: parseGrade(t, aspects),
    language: parseLanguage(t, aspects),
    firstEdition: FIRST_ED.test(t) || /1st edition|first edition/.test(features),
    shadowless: (game === 'pokemon' || game == null) && (/\bshadowless\b/.test(t) || /shadowless/.test(features)),
    printing: printing ? printing.key : null,
    printingLabel: printing ? printing.label : null,
    proxy: isProxy(t, game),
    lot: isLot(t, serial),
  };
}
