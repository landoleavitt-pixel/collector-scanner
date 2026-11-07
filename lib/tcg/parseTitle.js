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
import { LADDERS, groupOf, pokemonTitleIsVintage } from './ladders';

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
  if (hint) return hint;
  const famous = GAMES.filter((g) => g.names && g.names.test(raw));
  return famous.length === 1 ? famous[0].key : null;
}

// ── Rarity ──────────────────────────────────────────────────────────────────
function rungFor(game, text) {
  return rungMatch(game, text)?.rung || null;
}

// The rung and, when the rung groups several rarities, the one the title named.
function rungMatch(game, text) {
  for (const rung of LADDERS[game] || []) {
    const i = rung.match.findIndex((re) => re.test(text));
    if (i >= 0) return { rung, name: rung.names?.[i] || rung.label };
  }
  return null;
}

// The ladder rung for a rarity name, e.g. a catalog's "Special illustration rare".
export function rungFromText(game, text) {
  return rungFor(game, normalize(text));
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
// "One of one" and a bare "1/1" are usually sales talk (pop 1, signed copy),
// so they only count next to one of these words (QA 2026-11-01).
const SERIAL_WORD = /\bseriali[sz]ed\b|\bserial\b|\bnumbered\b|#'?d\b/g;
const FRACTION = /(?:^|[^\d])#?\s*(\d{1,4})\s*\/\s*(\d{1,4})(?!\d)|(?:^|[^\d\w])\/\s*(\d{1,4})(?!\d)|\b(\d{1,4})\s+of\s+(\d{1,4})\b/g;

export function parseSerial(t) {
  const words = [...t.matchAll(SERIAL_WORD)].map((m) => m.index);
  if (!words.length) return null;
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
  if (!best && /\bone of one\b/.test(t)) return { n: 1, of: 1 };
  return best ? { n: best.n, of: best.of } : null;
}

// ── Grade ───────────────────────────────────────────────────────────────────
// PSA, CGC, BGS (Beckett), TAG and SGC, as in the research.
// ARS is a Japanese grader (QA 2026-11-01).
const GRADERS = { psa: 'PSA', cgc: 'CGC', bgs: 'BGS', beckett: 'BGS', tag: 'TAG', sgc: 'SGC', ars: 'ARS' };
// Up to two grading words may sit between grader and grade ("BGS Quad 9.5",
// "CGC GRADED MINT 9"). "9/9/9/8.5" is a row of subgrades, not the grade.
// A regex literal on purpose: built with new RegExp and a template, the production
// minifier turned its leading \b into a stray character, so no grade was ever
// read on the live site (QA 2026-11-06 #2). scripts/smoke.mjs checks this.
const GRADE_RE = /\b(psa|cgc|bgs|beckett|tag|sgc|ars)\s*-?\s*(?:(?:gem\s*mint|gem\s*mt|gem|mint|pristine|perfect|black\s*label|nm-?mt|nm|quad\+*|graded|slab)\s*){0,2}(10|[1-9](?:\.5)?)(?![\d.]*\/)(?!\d)/i;
const GRADER_ONLY_RE = /\b(psa|cgc|bgs|beckett|tag|sgc|ars)\s*(?:graded|slab|gem|authentic|\d+(?:\.5)?\/)/i;

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
const JA_RE = /\bjapanese\b|\bjpn?\b|\bjap\b|\bjapan\b|日本|-jp\d{3}\b/;
// Sets and codes only printed in Japanese: Black & White and Concept packs,
// Japanese set codes (S8b, SV8a, M2a), Jump Festa promos, Yu-Gi-Oh! "JP003".
const JA_ONLY = /\bbw\d(?:-[a-z])?\b|\bcp[1-6]\b|\bs\d{1,2}[a-z]\b|\bsv\d{1,2}[a-z]\b|\bm\d[a-z]\b|\bjump\s+festa\b|\bclash\s+of\s+the\s+blue\s+sky\b|\bjp\d{3}\b|\bjpd?\d{2}\b/;
const OTHER_RE = /\bindonesia\b|\bchinese\b|\bs-chinese\b|\bt-chinese\b|\bkorean\b|\bkor\b|\bgerman\b|\bdeutsch\b|\bfrench\b|\bfrancais\b|\bitalian\b|\bitaliano\b|\bspanish\b|\bespanol\b|\bportuguese\b|\brussian\b|\bthai\b|\bindonesian\b|-(?:de|fr|it|sp|pt|kr|ae)\d{3}\b/;

export function parseLanguage(t, aspects) {
  // Order: another language named; "Japanese"; "English" (beats JP / Japan,
  // which is often where the seller is); then Japanese-only sets and codes.
  // Mystical Archive "JP Alternate Art" cards are printed in English (War of
  // the Spark's Japanese alternate-art planeswalkers really are Japanese).
  if (/\bmystical\s+archives?\b|\bstrixhaven\b|\bsta\b|\bsoa\b/.test(t)) {
    t = t.replace(/\b(?:jp|japanese)\s+alt(?:ernate)?\.?\s*art\b|\bjapanese\s+art\b/g, ' ');
  }
  if (OTHER_RE.test(t)) return 'other';
  if (/\bjapanese\b|日本/.test(t)) return 'ja';
  if (/\benglish\b|\beng\b/.test(t)) return 'en';
  if (JA_RE.test(t) || JA_ONLY.test(t)) return 'ja';
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
const PROXY = /\bprox(?:y|ies)\b|\bcustoms?\b|\borica\b|\bfan[\s-]*(?:art|made|cards?)\b|\breplica\b|\bnot\s+real\b|\bnot\s+a\s+(?:game|real)\s+card\b|\bunofficial\b|\bnovelty\b|\bdoujin\b|\bdiy\b|\bwaifu\b|\bbox\s+art\b|\bcurrency\b|\bpuzzle\b|\bmetal\s+cards?\b|\b(?:gold|silver|black)\s+metal\b|\baltered\s+(?:full\s+)?art\b|\bhand[\s-]*(?:painted|altered)\b|\balter\b|\baltered\b(?!\s+ego\b)|\bpainted\b|\baltered\b.*\b(?:commander|edh)\b|\b(?:commander|edh)\b.*\baltered\b/;
// Not trading cards at all: stickers, playing cards, food promos, playmats,
// "for display" listings and unofficial "database" cards (QA 2026-11-01),
// plus the frames, plaques and mock-ups from the sports list (lib/listingFilter.js).
// "Reprint" and "poster" are left out: The List reprints and Magic's
// "Borderless Poster" printings are real cards.
const NON_CARD = /\bjumbo\b|\boversized\b|\bstickers?\b|\bsealdass\b|\bmarumiya\b|\bmarusho\b|\bmerlin\b|\bplaying\s+cards?\b|\bkaruta\b|\btelevi-?kun\b|\bdanone\b|\bplay\s*mats?\b|\bfor\s+display\b|\bdatabase\s+card\b|\buncut\s+sheets?\b|\bcard\s+skins?\b|\bcollector\s+inserts?\b|\btest\s+prints?\b|\bframed\b|\bshadow\s*box\b|\bacrylic\b|\bplaques?\b|\bmagnets?\b|\bbootlegs?\b|\bmock-?ups?\b|\bpre-?production\b|\bcollages?\b|\bart\s+prints?\b|\bsleeves?\b|\bdeck\s+box\b|\bbinder\b|\bplush\b|\bfigures?\b|\bkeychain\b/;
export const isNonCard = (t) => NON_CARD.test(t);

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
  { key: 'list', label: 'The List', games: ['mtg'], re: /\bthe\s+list\b|\bplst\b|^list\b|\(list\)|\blist\s+(?:reprints?|version|\d)/ },
  { key: 'mystery', label: 'Mystery Booster', games: ['mtg'], re: /\bmystery\s+booster\b|\bcmb[12]\b/ },
  { key: 'judge', label: 'Promo · Judge', re: /\bjudge\s+(?:promos?|foils?|gift|rewards?|program|academy|exclusive)\b|\bdci\s+judge\b|\bpromos?:?\s+judge\b/ },
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
const LOT = /\b[2-9]x(?=mtg|magic|pokemon|yugioh|lorcana)|\blots?\b|\bbundle\b|\bbulk\b|\bplayset\b|\b[2-9]\s*x\b|\bx\s*[2-9]\b|(?<![/#\d])(?!(?:19|20)\d\d(?!\d))(?:[2-9]|[1-9]\d{1,3})(?!\d)\s*-?\s*(?:card|cards|ct|count|pcs?|pieces?)\b|\brepacks?\b|\bmystery\b|\bbooster\s+(?:box|case|bundle)\b|\betb\b|\belite\s+trainer\b|\bcomplete\s+set\b|\bset\s+of\s+(?:[2-9]|two|three)\b|\b(?:sar|sr|ar|chr|csr|ur|sir|ir)\s+set\b/;
// Card sets and several slabs in one listing (QA 2026-11-01). "1st Anniversary
// Set" and "Duel Set" are product names for single cards, so they don't count.
const NAMED_SET = /\b(?:\d+(?:st|nd|rd|th)\s+anniversary|duel)\s+set\b/g;
const SET_WORD = /\bset\b/;
const SET_RANGE = /\b(?:[a-z0-9]{2,5}-)?[a-z]{0,3}\d{2,3}\s*-\s*(?:[a-z0-9]{2,5}-)?[a-z]{0,3}\d{2,3}\b|\b[a-z]{1,4}-\d{1,3}-\d{1,3}\b|\b\d{3}\s+\d{3}\b/;
const CODES = /\b(?:[a-z0-9]{2,5}-)?(?:en|jp|jpd)\d{2,3}\b/g;
const LOT_MORE = /\bsequential\b|\bconsecutive\b|\b\d+\s*x\s*\d+s\b|\bpower\s*(?:9|nine)\s+set\b|\bsealed\s+pack\b|\bunope(?:n(?:ed)?)?\b|\b(?:psa|cgc|bgs|sgc|tag)\s*\d+(?:\.5)?\s*,\s*\d+(?:\.5)?\b/;
const GRADES = /\b(?:psa|cgc|bgs|sgc|tag|ars)\s*-?\s*(10|[1-9](?:\.5)?)(?!\d)/g;

// Card codes ("SDK-001", "LOB-EN005", "OP05-119"), compared without the
// region letters so "LOB-005" and "LOB-EN005" are the same card.
const CARD_CODE = /\b([a-z0-9]{2,5})-(?:en|jp|jpd|de|fr|it|sp|pt|kr|ae)?(\d{3})\b/g;

function isCardSet(t) {
  if (LOT_MORE.test(t)) return true;
  // Two different card codes: two cards in one listing.
  if (new Set([...t.matchAll(CARD_CODE)].map((m) => `${m[1]}-${m[2]}`)).size >= 2) return true;
  const grades = new Set([...t.matchAll(GRADES)].map((m) => m[1]));
  if (grades.size >= 2) return true;
  const s = t.replace(NAMED_SET, ' ');
  if (!SET_WORD.test(s)) return false;
  if (SET_RANGE.test(s)) return true;
  if (new Set([...s.matchAll(CODES)].map((m) => m[0])).size >= 2) return true;
  // "Skyridge and Aquapolis … PSA 10 Set Charizard Lugia Ho-oh": a graded set.
  return /\bset\b/.test(s) && /\b(?:psa|cgc|bgs|sgc|tag)\b/.test(s) && !/\bbase\s+set\b/.test(s) && /\bset\s+[a-z]+\s+[a-z]+/.test(s) && /\band\b|&|,/.test(s);
}

// A lot only when the title has no card number or promo code.
const LOT_WEAK = /\bsealed\b|\bboxe?s?\b|\bpacks?\b/;
const CARD_NO = /(?<![\d/])\d{1,3}\s*\/\s*\d{2,3}(?![\d/])|\b(?:swsh|svp|smp?|xy|bw|mep)\s*-?\s*(?:en\s*)?\d{2,3}\b|\b[a-z0-9]{2,4}-(?:en|jp|de|fr|it|sp|pt|kr)\d{3}\b|\b(?:op|st|eb|prb)\d{2}-\d{3}\b|#\s*\d{1,4}\b/;
// Two different collector numbers in one title is two cards ("Mewtwo ex
// 205/165 + Mew ex 204/165"). Pop reports ("pop 1/12") don't count.
const NUMBERS = /(?<![\d/]|pop\s?)(\d{1,3})\s*\/\s*(\d{2,3})(?![\d/])/g;

// Japanese singles name the product they came from ("CSR … High Class Pack
// VMAX Climax", "Gem Pack Volume 2"). With a rarity code or card number, the
// pack name is where the card came from, not what's for sale.
const JP_PRODUCT = /\bhigh[\s-]*class\s+(?:pack|deck)\b|\bexpansion\s+pack\b|\bgem\s+pack\b/g;
const SINGLE_SIGNS = /\b(?:csr|chr|sar|ar|sr|ur|hr|rrr|rr|ssr|sir|mur)\b|(?<![\d/])\d{1,4}\s*\/\s*\d{2,3}(?![\d/])/;

// "+ Iono", "+ Charizard": a second card added on. Extras that come with
// one card (a free toploader, a case, shipping) don't count.
const PLUS_CARD = /(?:^|\s)\+\s*(?!free\b|bonus\b|cases?\b|toploaders?\b|top\s*loaders?\b|sleeves?\b|shipping\b|gifts?\b|extras?\b|slabs?\b|holders?\b|one[\s-]*touch\b|stands?\b|\d)[a-z]{3,}/;

export function isLot(t, serial = null) {
  if (SINGLE_SIGNS.test(t)) t = t.replace(JP_PRODUCT, ' ');
  if (PLUS_CARD.test(t)) return true;
  // A single promo still sealed in its plastic is one card.
  if (/\bpromo\b/.test(t) && !/\b(?:packs?|box(?:es)?|tins?|bundle|collection|blister|case)\b/.test(t)) t = t.replace(/\bsealed\b/g, ' ');
  const s = t.replace(SINGLE_PHRASES, ' ');
  if (LOT.test(s) || isCardSet(t)) return true;
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

// ── Finish and special art (research/fables-filters-2.md) ──────────────────
// Read from the title only, so a filter on these means "only listings that say
// so", never "hide listings that don't".
export function parseFinish(t, game) {
  const out = [];
  if (game === 'pokemon' || game == null) {
    if (/\breverse[\s-]*holo|\brev\.?\s*holo|\breverse\b/.test(t)) out.push('reverse');
    if (/(?<!reverse[\s-]*)(?<!non[\s-]*)\bholo(?:foil)?\b|\bcosmos\s+holo\b|\bcracked\s+ice\b/.test(t.replace(/\breverse[\s-]*holo(?:foil)?\b/g, ' '))) out.push('holo');
  }
  if (game === 'mtg' || game === 'lorcana' || game == null) {
    if (/\bcold[\s-]*foil\b/.test(t)) out.push('coldfoil');
    if (/\betched\b/.test(t)) out.push('etched');
    if (/(?<!non[\s-]*)(?<!cold[\s-]*)\bfoil\b/.test(t.replace(/\b(?:foil[\s-]*)?etched(?:[\s-]*foil)?\b/g, ' '))) out.push('foil');
    if (/\bnon[\s-]*foil\b|\bnonfoil\b/.test(t) || (game === 'mtg' && /\b(?:regular|normal)\b/.test(t) && !/\bfoil\b/.test(t.replace(/non[\s-]*foil/g, '')))) out.push('nonfoil');
  }
  return out;
}

export function parseArt(t, game) {
  const out = [];
  if (/\bfull[\s-]*art\b|\bfa\b/.test(t)) out.push('fullart');
  if (/\balt(?:ernate|ernative)?\.?[\s-]*art\b|\baa\b|\bparallel\b|\bspecial\s+art\b|\bspecial\s+illustration\b|\bsir\b/.test(t)) out.push('altart');
  if (/\bborderless\b/.test(t)) out.push('borderless');
  if (/\bshowcase\b/.test(t)) out.push('showcase');
  if (/\bextended[\s-]*art\b/.test(t)) out.push('extended');
  if (/\bretro[\s-]*(?:frame|border)\b|\bold[\s-]*(?:frame|border)\b/.test(t)) out.push('retro');
  if (game === 'onepiece' && /\bmanga\b/.test(t)) out.push('manga');
  return out;
}

// ── All together ────────────────────────────────────────────────────────────
// Set names that contain rarity words ("Shining Darkness", "Golden Sky,
// Silvery Ocean", "Crystal Guardians") are removed before rarity is read.
const RARITY_NOISE = /\bshining\s+(?:darkness|legends|fates|treasure|star\s+v)\b|\bgold(?:en)?\s+sky,?\s+silvery\s+ocean\b|\bcrystal\s+guardians\b|\bmiracle\s+crystal\b|\(shining\)/g;

function rarityText(t, game, language) {
  let r = t.replace(RARITY_NOISE, ' ');
  // "Quarter Century" next to another rarity ("UR Reprint … Quarter Century")
  // is the 25th-anniversary product name, not the Quarter Century Secret Rare.
  if (/\bur\b|\bultra\s+rare\b|\bsuper\s+rare\b/.test(r)) r = r.replace(/\bquarter\s+century\b(?!\s+secret)/g, ' ');
  // "UR" is the gold Hyper Rare only on modern Japanese cards; on English
  // EX-era and Trainer Gallery cards it means Ultra Rare.
  if (game === 'pokemon' && language === 'en') r = r.replace(/\bur\b/g, 'ultra rare');
  // Yu-Gi-Oh! "UR" is Ultra Rare.
  if (game === 'yugioh') r = r.replace(/\bur\b/g, 'ultra rare');
  return r;
}

export function parseTitle(title, opts = {}) {
  const t = normalize(title);
  const aspects = opts.aspects || null;
  const game = detectGame(title, opts.game || null);
  const language = parseLanguage(t, aspects);
  const nonCard = isNonCard(t);

  const found = game && !nonCard ? rungMatch(game, rarityText(t, game, language)) : null;
  let rarity = found?.rung || null;
  const rarityName = found?.name || null;
  if (!rarity && game && aspects?.Rarity) rarity = rungFor(game, normalize(aspects.Rarity));
  if (!rarity && game === 'pokemon' && pokemonSecretByNumber(t)) {
    rarity = LADDERS.pokemon.find((g) => g.key === 'secret');
  }

  const serial = parseSerial(t);
  // A stamped Magic card is "Serialized" even when the title only says "numbered".
  if (serial && game === 'mtg') rarity = LADDERS.mtg[0];

  const features = normalize(aspects?.Features);
  const printing = parsePrinting(t, game);
  const art = parseArt(t, game);
  return {
    game,
    rarity: rarity ? rarity.key : null,
    // The specific name for results ("Shining"), or the rung's label.
    rarityName: rarity ? (rarity === found?.rung ? rarityName : rarity.label) : null,
    serial,
    grade: parseGrade(t, aspects),
    language,
    firstEdition: FIRST_ED.test(t) || /1st edition|first edition/.test(features),
    shadowless: (game === 'pokemon' || game == null) && (/\bshadowless\b/.test(t) || /shadowless/.test(features)),
    printing: printing ? printing.key : null,
    printingLabel: printing ? printing.label : null,
    proxy: isProxy(t, game),
    nonCard,
    finish: parseFinish(t, game),
    art,
    rarityGroup: game ? groupOf(game, rarity?.key, {
      printing: printing?.key,
      treated: art.some((a) => a === 'borderless' || a === 'showcase' || a === 'extended'),
      mythic: /\bmythic\b/.test(t),
      vintage: game === 'pokemon' && pokemonTitleIsVintage(t),
    }) : null,
    lot: isLot(t, serial),
  };
}
