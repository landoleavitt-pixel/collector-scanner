// lib/tcg/family.js
//
// Card-family matching: read one listing title against every version of one
// card (lib/tcg/catalog.js) and say which version(s) it is, with a plain
// "why it matched" label. Built from the 40-card test
// (research/card-family-test.md) and its fixes.
//
//   matchListing(game, card, title) →
//     { kind, versions: [version keys], why, language }
//
// kind:
//   exact     one printing (set + number); versions = its finishes the title allows
//   set       several printings fit (e.g. set named, number missing)
//   language  a non-English copy. We can't say which version, so the label
//             is only "Japanese printing" (or the language)
//   promo     a promo or stamped copy we can't pin to a catalog printing:
//             "promo — version not confirmed"
//   unknown   the right card, but the title doesn't say which version
//   reject    not this card: fake, lot, accessory, other card, wrong number

import { catalogData, getCard, versionsOf, MTG_TAG_LABELS } from './catalog';
import { parseTitle, normalize, isLot } from './parseTitle';
import jaCoverage from '../../data/tcg/ja-coverage.json';
import jaNames from '../../data/tcg/ja-names.json';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const flat = (s) => s.replace(/[:\-–—,()[\]!.]/g, ' ').replace(/\s+/g, ' ').trim();
const nz = (s) => String(s).replace(/^0+(?=\w)/, '').toLowerCase();

// Things that aren't cards: sleeves, coins, figures, art prints, the phone game.
// "Full Art Card" is a real card (the test's one filter bug).
// Several graded cards or a named trio in one listing.
const MULTI = /\btrio\b|\b(?:psa|cgc|bgs|sgc|tag)\s*\d+(?:\.5)?\s*[,+&]\s*[a-z].*\b(?:psa|cgc|bgs|sgc|tag)\s*\d/;
const ACCESSORY = /\bsleeves?\b|\bplay\s*mats?\b|\bartist\s+proofs?\b|\bcoins?\b|\bfigures?\b|\bfigurines?\b|\bplush\b|\bstickers?\b|\bbinder\b|\bart\s+print\b|\b(?<!(?:full|special|alt|alternate|illustration)\s)art\s+card\b|\bart\s+series\b|\bdeck\s+box\b|\btcg\s+pocket\b|\bpokemon\s+pocket\b|\bkeychain\b|\bpin\b|\bmouse\s*pad\b|\bmenko\b|\bcanvas\b|\b8[\s-]?bit\s+style\b/;
// Number-like text that is a grade, a count or a price, not a card number.
const GRADECTX = /(?:psa|cgc|bgs|beckett|sgc|tag|ace|grade|gem|mint|pop|hp|\bx)\s*$/;

// Non-English Pokémon beyond what the title parser reads: Chinese set codes
// ("CS4b"), Japanese set codes ("s8b", "sv4a", "m2a"), and the Japanese
// rarity codes CSR / CHR, as in the test's fixes.
const PK_FOREIGN = /\bpocket\s+monsters\b|\bcarddass\b|\bcs\d+(?:\.\d)?[a-z]{0,2}\b|\bcsv\d|\bkr\b|\b(?:s-)?chn\b|\bs\d+[a-z]\b|\bsv\d+[a-z]\b|\bm\d+[a-z]\b|\bcsr\b|\bchr\b|\bvmax\s+climax\b|\beevee\s+heroes\b|\bsimplified\b|\btraditional\s+chinese\b/;
// Language words first; set codes ("s8b", "CS4b") only when no word says.
const LANGUAGE_NAMES = [
  ['Korean', /\bkorean\b|\bkor\b|\bkr\b/],
  ['Chinese', /\bchinese\b|\b[st]-chinese\b|\b(?:s-)?chn\b|\bsimplified\b/],
  ['Japanese', /\bjapanese\b|\bjpn?\b|\bjap\b|\bjapan\b|-jp\d{3}\b/],
  ['Indonesian', /\bindonesian?\b/],
  ['Thai', /\bthai\b/],
  ['German', /\bgerman\b|\bdeutsch\b/],
  ['French', /\bfrench\b|\bfrancais\b/],
  ['Italian', /\bitalian\b|\bitaliano\b/],
  ['Spanish', /\bspanish\b|\bespanol\b/],
  ['Portuguese', /\bportuguese\b/],
  ['Russian', /\brussian\b/],
  ['Chinese', /\bcs\d+(?:\.\d)?[a-z]{0,2}\b|\bcsv\d/],
  ['Japanese', /\bs\d+[a-z]\b|\bsv\d+[a-z]\b|\bm\d+[a-z]\b|\bvmax\s+climax\b|\beevee\s+heroes\b|\bpocket\s+monsters\b|\bcarddass\b/],
];
// Japanese rarity and promo codes. They only decide the language when the
// card number isn't one of the English printings (English sellers write SAR too).
// English names sellers use for Japanese-only sets and products (only used
// when the card number isn't one of the English printings).
const JP_SET_NAMES = /\bvstar\s+universe\b|\bvmax\s+climax\b|\bshiny\s+star\s+v\b|\beevee\s+heroes\b|\blost\s+abyss\b|\bblue\s+sky\s+stream\b|\bshiny\s+treasure\b|\bterastal\s+fest(?:ival)?\b|\bclay\s+burst\b|\bsnow\s+hazard\b|\bruler\s+of\s+the\s+black\s+flame\b|\braging\s+surf\b|\bmega\s+dream\b|\bbattle\s+partners\b|\bparadigm\s+trigger\b|\bincandescent\s+arcana\b|\bdark\s+phantasma\b|\bspace\s+juggler\b|\btime\s+gazer\b|\bstar\s+birth\b|\bfusion\s+arts\b|\bjet-?black\s+spirit\b|\bskyscraping\s+perfection\b|\bmatchless\s+fighters?\b|\brebellion\s+crash\b|\binfinity\s+zone\b|\bamazing\s+volt\s+tackle\b|\blegendary\s+heartbeat\b|\bhigh[\s-]*class\s+(?:deck|pack)\b|\bspecial\s+deck\s+set\b|\bstarter\s+set\b|\bgolden\s+box\b|\bsgg\b|\bscl?\d?\b/;
const JP_CODES = /\b(?:rrr|sar|sa|csr|chr|ssr|mur|s-p|m-p|xy-p|sm-p|sv-p)\b|\bs\d{1,2}[a-z]?\b|\bsv\d{1,2}[a-z]?\b|\bm\d[a-z]?\b|\b\d{3}\/(?:s|m|xy|sm|sv)-p\b/;
function languageName(t) {
  return (LANGUAGE_NAMES.find(([, re]) => re.test(t)) || [])[0] || null;
}

// ── Pokémon ─────────────────────────────────────────────────────────────────
// "Charizard" must not match "Charizard ex", "Mega Charizard" or "Charizard's".
const PLAIN_SUFFIX = new RegExp('^(?:ex|gx|v|vmax|vstar|v-union|break|lv\\.?\\s*x|lv|prime|legend|star|☆|δ|delta|&|and|tag|-ex|-gx)$');
const PLAIN_PREFIX = /(?:mega|m|dark|light|radiant|kagayaku|shining|galarian|alolan|hisuian|paldean|gigantamax|'s|team\s+rocket'?s?|surfing|surf|flying|detective|shadow|ash's|ash|classic)\s*[-]?\s*$/;

// Pokémon names, from cards named "<name> ex / V / VMAX / VSTAR / GX / EX".
// Used to spot a second Pokémon in a title ("Charizard, Blastoise, Venusaur",
// "Charizard Mewtwo VSTAR").
let POKEMON_NAMES = null;
function pokemonNames() {
  if (!POKEMON_NAMES) {
    POKEMON_NAMES = new Set();
    for (const c of Object.values(catalogData('pokemon').cards)) {
      const m = normalize(c.n).match(/^([a-z][a-z'.-]{3,})\s+(?:ex|v|vmax|vstar|gx)$/);
      if (m) POKEMON_NAMES.add(m[1]);
    }
  }
  return POKEMON_NAMES;
}

// Another Pokémon named next to ours (joined by a comma, "&", "and", "vs"
// or nothing at all), or a numbered Battle Academy stamp ("Hau (#41
// Charizard Stamped)"): the listing is for other cards.
export function otherPokemonNamed(name, t) {
  const base = normalize(name).replace(/\s+(ex|v|vmax|vstar|gx)$/, '');
  if (new RegExp(`.\\(#?\\d*\\s*${esc(base)}\\s+stamped\\)`).test(t)) return true;
  const names = pokemonNames();
  const words = t.split(/[^a-z'.-]+/).filter(Boolean);
  const others = new Set(words.filter((w) => w !== base && names.has(w) && !base.split(' ').includes(w)));
  if (!others.size) return false;
  const join = '(?:\\s*(?:,|&|\\+|/|\\band\\b|\\bvs\\.?)?\\s*)';
  return [...others].some((o) => new RegExp(`\\b${esc(base)}\\b(?:\\s+(?:ex|v|vmax|vstar|gx))?${join}${esc(o)}\\b|\\b${esc(o)}\\b(?:\\s+(?:ex|v|vmax|vstar|gx))?${join}${esc(base)}\\b`).test(t));
}

export function pokemonNameHit(name, t) {
  const n = normalize(name);
  const base = n.replace(/\s+(ex|v|vmax|vstar|gx)$/, '');
  const suffix = n.slice(base.length).trim();
  // Run together: "Mewex SR SV2a".
  if (suffix && new RegExp(`(?:^|[^a-z'])${esc(base)}${suffix}\\b`).test(t)) return true;
  const re = new RegExp(`(^|[^a-z'])${esc(base)}(?!'s)\\b`, 'g');
  let m;
  while ((m = re.exec(t))) {
    const before = t.slice(0, m.index + m[1].length);
    const after = t.slice(m.index + m[0].length);
    if (PLAIN_PREFIX.test(before)) continue;
    const next = after.match(/^[\s-]*([a-z☆δ&.]+(?:\s*x\b)?)/i)?.[1] || '';
    // "Pikachu V-UNION" is its own card, not Pikachu V.
    if (/^[\s-]*v[\s-]*union\b/.test(after) && !/union$/.test(n)) continue;
    // "Charizard Spirit Link", "Venusaur Deck": a different card or product.
    if (/^(?:spirit|deck)$/.test(next)) continue;
    // Tag teams written without "&": "Venusaur Snivy GX".
    if (!/gx$/.test(n) && /^[\s&-]*(?:and\s+)?[a-z]+\s+gx\b/.test(after)) continue;
    if (!suffix) {
      if (PLAIN_SUFFIX.test(next.replace(/\s+/g, ' '))) continue;
      return true;
    }
    if (next === suffix) return true;
  }
  return false;
}

// "Rayquaza V Rayquaza VMAX": two of one Pokémon's cards in one listing.
function samePokemonTwice(name, t) {
  const base = normalize(name).replace(/\s+(ex|v|vmax|vstar|gx)$/, '');
  const found = [...t.matchAll(new RegExp(`\\b${esc(base)}\\s+(ex|vmax|vstar|gx|v)\\b`, 'g'))].map((m) => m[1]);
  return new Set(found).size > 1;
}

// A Trainer's own card named next to a Pokémon ("Gengar VMAX … Marnie",
// "PokeGear … Gengar VMAX"), not a Pokémon they own ("Marnie's Grimmsnarl").
let TRAINER_RE = null;
function otherTrainerNamed(name, t) {
  if (!TRAINER_RE) {
    const names = jaNames.names.map((x) => normalize(x.en)).filter((n) => n.length >= 5 && !/'s\b/.test(n));
    TRAINER_RE = new RegExp(`\\b(${[...names, 'pokegear', 'poke gear'].map(esc).join('|')})\\b(?!')`);
  }
  const hit = t.match(TRAINER_RE)?.[1];
  return !!hit && !normalize(name).includes(hit);
}

function pokemonNumbers(t) {
  const out = [];
  for (const m of t.matchAll(/(?<![\w/])#?\s*([a-z]{0,5}\d{1,4}[a-z]?)\s*\/\s*([a-z]{0,4}\d{1,4})(?![\w])/g)) out.push({ n: nz(m[1]), of: nz(m[2]), slash: true });
  for (const m of t.matchAll(/#\s*([a-z]{0,5}\d{1,4})\b/g)) out.push({ n: nz(m[1]) });
  for (const m of t.matchAll(/\b(tg\d{2}|gg\d{2}|sv\d{2,3}|swsh\d{2,3}|sm\d{2,3}|xy\d{2,3}|bw\d{2,3}|cc\d{2}|rc\d{1,2}|svp?\s?\d{3}|mep\s?\d{3})\b/g)) out.push({ n: nz(m[1].replace(/\s/g, '')) });
  for (const m of t.matchAll(/(?<![\w/#.$])(\d{1,3})(?![\w/%.$])/g)) {
    if (GRADECTX.test(t.slice(0, m.index))) continue;
    if (/^\s*(?:hp|psa|cgc)/.test(t.slice(m.index + m[0].length))) continue;
    out.push({ n: nz(m[1]), bare: true });
  }
  return out;
}

// Nicknames sellers use for sets (from the test).
const PK_ALIAS = {
  '2024sv': /mcdonald/, cel25: /^(?!.*\b30th\b).*(?:\bcelebrations\b|25th\s+anniv)/, cel25cc: /^(?!.*\b30th\b).*(?:classic\s+collection|\bccc\b|\bcelebrations\b)|\bcelebrations\s+classic\s+collection\b/,
  // 2026's 30th Celebration, which sellers also write "30th Celebrations" or "30C".
  '30th-c': /\b(?:30th|2026)\b.*\bclassic\s+collection\b|\bclassic\s+collection\b.*\b(?:30th|2026)\b/,
  '30th': /^(?!.*\bclassic\s+collection\b).*(?:\b30th\s+(?:anniversary|celebrations?)\b|\b30c\b)/, base1: /\bbase\s+set\b(?!\s*2)/,
  base4: /base\s+set\s+2/, lc: /legendary\s+collection/, xy12: /(?<!prismatic\s)\bevolutions\b/, 'sv03.5': /\b151\b/,
  'swsh9tg': /brilliant\s+stars/, 'swsh10tg': /astral\s+radiance/, 'swsh11tg': /lost\s+origin/, 'swsh12tg': /silver\s+tempest/,
  'swsh12.5': /crown\s+zenith/, 'swsh3.5': /champion'?s\s+path/, 'swsh4.5': /shining\s+fates/,
};
// Three-letter set codes sellers write in capitals.
const PK_CODE = {
  'sv03': 'OBF', 'sv03.5': 'MEW', 'sv04.5': 'PAF', 'sv02': 'PAL', 'sv08.5': 'PRE', 'swsh7': 'EVS', 'swsh9': 'BRS', 'swsh9tg': 'BRS',
  'sv08': 'SSP', 'swsh4': 'VIV', 'swsh3.5': 'CPA', 'swsh4.5': 'SHF', 'swsh8': 'FST', 'swsh12.5': 'CRZ', 'swsh10.5': 'PGO',
  'swsh11': 'LOR', 'swsh11tg': 'LOR', 'swsh12': 'SIT', 'sv01': 'SVI', 'sv06': 'TWM', 'sv07': 'SCR', 'sv09': 'JTG', 'sv10': 'DRI',
  'swsh10': 'ASR', 'swsh6': 'CRE', 'swsh5': 'BST', 'sv04': 'PAR', 'sv05': 'TEF', 'sv06.5': 'SFA',
};
const PROMO_SET = /^(?:svp|swshp|smp|xyp|bwp|hgssp|dpp|np|basep|mep|wp)$/;

function pokemonCandidates(card, title, t) {
  const data = catalogData('pokemon');
  const nums = pokemonNumbers(t);
  const ft = flat(t);
  const setHit = (code) => {
    const s = data.sets[code];
    if (!s) return false;
    if (code === 'base1' && /\bbase\s+set\s+2\b/.test(t)) return false;
    const sn = normalize(s[0]).replace(/^(sword & shield|scarlet & violet|mega evolution)\s*[-—:]?\s*/, '');
    if (sn.length >= 3 && new RegExp(`\\b${esc(flat(sn))}\\b`).test(ft)) return true;
    if (PK_ALIAS[code]?.test(t)) return true;
    const c = PK_CODE[code];
    return !!(c && new RegExp(`(?<![A-Za-z])${c}(?![A-Za-z])`).test(title));
  };
  const promoWords = /promo|\bsvp\b|\bswshp?\d|\bsmp?\d|\bmep\b/.test(t);
  const scored = card.p.map((row) => {
    const [set, num] = row;
    const total = data.sets[set]?.[2];
    // Promo numbers are written "SWSH261", "#261" or "SVP 176".
    const pn = nz(num).replace(/^(?:svp|swshp?|smp?|xyp?|bwp?|mep)/, '');
    let score = 0;
    let numberHit = false;
    for (const x of nums) {
      const xn = x.n.replace(/^(?:svp?|swsh|smp?|xy|bw|mep)(?=\d{2,3}$)/, '');
      if (xn !== pn && x.n !== nz(num)) continue;
      if (x.slash) {
        // Promo sets have no printed total, so sellers make one up ("SVP 176/296").
        if (total && x.of !== String(total) && !/^[a-z]/.test(x.of) && !PROMO_SET.test(set)) { score -= 5; continue; }
        // The card number is the most reliable part of a title (the test:
        // sellers get set names wrong more often than numbers).
        score += 5;
        numberHit = true;
      } else if (x.bare) score += 1;
      else { score += 2; numberHit = true; }
    }
    const sh = setHit(set);
    if (sh) score += 4;
    // Classic Collection reprints carry the original card's number ("4/102"),
    // which the catalog doesn't, so naming the set is enough.
    if (sh && (set === 'cel25cc' || set === '30th-c')) score += 6;
    // "Lugia 149/147 30th": the 2026 Classic Collection reprint carries the
    // original number; a 30th Celebration card has its own (x/128).
    if (set === '30th-c' && !sh && /\b30th\b|\b2026\b/.test(t) && !nums.some((x) => x.slash && x.of === '128')) score += 10;
    if (PROMO_SET.test(set) && promoWords) score += score >= 2 ? 4 : 1;
    return { row, score, numberHit, setHit: sh };
  }).filter((c) => c.score >= 2).sort((a, b) => b.score - a.score);
  return { scored, nums };
}

// Japanese product names that hold a Pokémon's name ("Flareon V … Eevee
// Heroes" isn't an Eevee card).
const PK_PRODUCT_NAMES = /\beevee\s+heroes\b|\bpikachu'?s?\s+(?:new\s+friends|world\s+collection)\b/g;

function matchPokemon(card, title, tIn, parsed) {
  const t = tIn.replace(PK_PRODUCT_NAMES, ' ');
  const jaName = (JA_TRAINER[normalize(card.n)] || []).some((ja) => title.includes(ja)) || !!ROMAN_TRAINER[normalize(card.n)]?.test(t);
  if (!jaName && !pokemonNameHit(card.n, t)) return { kind: 'reject', why: 'a different card' };
  if (otherPokemonNamed(card.n, t)) return { kind: 'reject', why: 'several cards, or a different card' };
  // Topps made Pokémon trading cards that aren't the card game.
  if (/\btopps\b/.test(t)) return { kind: 'reject', why: 'not a Pokémon TCG card (Topps)' };
  if (samePokemonTwice(card.n, t) || otherTrainerNamed(card.n, t)) return { kind: 'reject', why: 'several cards, or a different card' };
  // A deck or set for sale, not a card from it: no card number in the title.
  if (/\bstarter\s+set\b|\bhigh[\s-]*class\s+deck\b/.test(t) && !/\d\s*\/\s*\d|#\s*\d/.test(t)) return { kind: 'reject', why: 'lot, bundle or sealed product' };
  if (jaName && !pokemonNameHit(card.n, t)) return japaneseLabel(card, title);
  const lang = parsed.language !== 'en' || PK_FOREIGN.test(t) ? languageName(t) || (JP_CODES.test(t) ? 'Japanese' : 'Non-English') : null;
  // An "ex" card search: Japanese XY-era "EX" cards (CP6 20th Anniversary,
  // "XY-P" promos, Mega "M … EX") are the older, different card.
  if (lang && /\bex$/.test(normalize(card.n)) && !card.key.endsWith('-xy') && /\bEX\b/.test(title) && /\bxy\d*\b|\bxy-p\b|\bcp\d\b|\b20th\s+anniversary\b|\bbreak\b|\bfates\s+collide\b|\bcruel\s+traitor\b|\bawakening\s+psychic\s+king\b|\bxy\d+[a-z]?\b/.test(t)) {
    return { kind: 'reject', why: `a different card (${card.n.replace(/ex$/, 'EX')}, XY era)` };
  }
  if (lang) return lang === 'Japanese' ? japaneseLabel(card, title) : { kind: 'language', why: `${card.n} · ${lang} printing`, language: lang };
  // "Blastoise EX XY122": the older EX card (XY and Black & White eras), when
  // the title gives an era sign and no card number of ours.
  if (/\bex$/.test(normalize(card.n)) && !card.key.endsWith('-xy') && /\bEX\b/.test(title) && catalogData('pokemon').cards[`${card.key}-xy`]
    && /\bxy\s?\d{1,3}\b|\bbw\s?\d{1,3}\b|\b201[1-7]\b|\bxy\b|\bblack\s*(?:&|and)\s*white\b/.test(t)) {
    return { kind: 'reject', why: `a different card (${card.n.replace(/ex$/, 'EX')}, XY era)` };
  }

  const { scored, nums } = pokemonCandidates(card, title, t);
  let top = scored.filter((c) => c.score === scored[0]?.score);

  // "Charizard ex" vs the older "Charizard EX": if the number and set fit the
  // other card better, it's the other card.
  const siblingKey = card.key.endsWith('-xy') ? card.key.slice(0, -3) : `${card.key}-xy`;
  const sibling = catalogData('pokemon').cards[siblingKey];
  if (sibling) {
    const other = pokemonCandidates({ ...sibling, key: siblingKey }, title, t).scored[0];
    if (other && other.score >= 4 && other.score > (scored[0]?.score ?? 0)) return { kind: 'reject', why: `a different card (${sibling.n})` };
  }
  // Rarity words narrow a tie ("Fusion Strike Secret … Gengar VMAX").
  if (top.length > 1 && parsed.rarity) {
    const same = top.filter((c) => versionsOf('pokemon', c.row).some((v) => v.rarityKey === parsed.rarity));
    if (same.length) top = same;
  }

  // A plain "promo" with the set and full card number named is that card.
  // "Promo" with a card number that pins one printing (TG29/TG30, 021/128) is
  // that printing: sellers call any card from a promo product a promo.
  const promoSetHit = top.length === 1 && (PROMO_SET.test(top[0].row[0]) || top[0].numberHit);
  if ((parsed.printing && parsed.printing !== 'promo') || (parsed.printing === 'promo' && !promoSetHit)) {
    return promoUnconfirmed(card, parsed, top.length ? top : null, 'pokemon');
  }
  if (top.length === 1) return exactLabel('pokemon', card, top[0].row, t, parsed);
  if (top.length > 1) return setLabel('pokemon', card, top.map((c) => c.row), t);
  if (JP_CODES.test(t) || JP_SET_NAMES.test(t)) return japaneseLabel(card, title);
  // A total no English set has: Japanese when a Japanese set has it, otherwise
  // some other printing ("002/019", a Japanese deck our list doesn't have).
  const foreignTotal = nums.find((x) => x.slash && /^\d+$/.test(x.of) && !englishTotals().has(x.of));
  // An English set newer than our card list (TCGdex adds sets a few weeks after
  // release): its code ("ME06", "DLR") or "English" means it isn't Japanese.
  if (foreignTotal && /\bme\s?0?\d{1,2}\b|\bdlr\b|\bdelta\s+reign\b|\benglish\b|\beng?\b/.test(t)) return unknownLabel(card, t);
  if (foreignTotal) return JA_TOTALS.has(foreignTotal.of) ? japaneseLabel(card, title) : { kind: 'language', why: `${card.n} · not an English printing`, language: 'Non-English' };
  if (nums.some((x) => x.slash)) return { kind: 'reject', why: "card number isn't one of this card's printings" };
  // A set named in the title that has no copy of this card.
  const mySets = new Set(card.p.map((r) => r[0]));
  const data = catalogData('pokemon');
  for (const [code, s] of Object.entries(data.sets)) {
    if (mySets.has(code)) continue;
    const sn = normalize(s[0]);
    if (sn.length < 8 || /promo|base set|trainer kit|mcdonald|pop series|world championship/.test(sn)) continue;
    if (!new RegExp(`\\b${esc(sn)}\\b`).test(t)) continue;
    if ([...mySets].some((m) => { const mn = normalize(data.sets[m]?.[0] || ''); return mn.includes(sn) || sn.includes(mn); })) continue;
    return { kind: 'reject', why: `${s[0]} has no ${card.n}` };
  }
  return unknownLabel(card, t);
}

// Japanese copies: we can't confirm the version (TCGdex's Japanese lists are
// incomplete, and we don't fill them ourselves; DECISIONS.md 2026-10-31), so
// when the title gives a Japanese set code and card number we repeat them,
// marked "as listed by seller". Otherwise: "Japanese printing, version not named".
const JA_SETS = jaCoverage.sets.filter((x) => x.language === 'ja').sort((a, b) => b.setCode.length - a.setCode.length);
const JA_SET_RE = new RegExp(`(?<![a-z0-9])(${JA_SETS.map((x) => esc(x.setCode.toLowerCase())).join('|')})(?![a-z0-9])`);

const JA_TOTALS = new Set(JA_SETS.map((x) => String(x.cardsInSet)));
let EN_TOTALS = null;
function englishTotals() {
  if (!EN_TOTALS) EN_TOTALS = new Set(Object.values(catalogData('pokemon').sets).map((s) => String(s[2])));
  return EN_TOTALS;
}

export function japaneseSetFromTitle(title) {
  const t = normalize(title);
  const code = t.match(JA_SET_RE)?.[1];
  const num = t.match(/(?<![\d/])(\d{1,3})\s*\/\s*(\d{2,3})(?![\d/])/);
  if (!code || !num) return null;
  const set = JA_SETS.find((x) => x.setCode.toLowerCase() === code);
  return { setCode: set.setCode, setNameJa: set.nameJa, number: `${num[1]}/${num[2]}`, fullInCatalog: !!set.full };
}

function japaneseLabel(card, title) {
  const listed = japaneseSetFromTitle(title);
  if (!listed) return { kind: 'language', why: `${card.n} · Japanese printing, version not named`, language: 'Japanese' };
  return {
    kind: 'language',
    why: `${card.n} · Japanese · set ${listed.setCode} · #${listed.number}, as listed by seller`,
    language: 'Japanese',
    listed,
  };
}

// Japanese trainer names written in Japanese ("ナンジャモ" for Iono).
const JA_TRAINER = {};
for (const x of jaNames.names) (JA_TRAINER[normalize(x.en)] ||= []).push(x.ja);
// Japanese names written in English letters.
const ROMAN_TRAINER = { iono: /\bnanjamo\b/, cynthia: /\bshirona\b/ };

// ── Magic ───────────────────────────────────────────────────────────────────
const MTG_ALIAS = {
  spg: /special\s+guests?/, ltr: /\blotr\b/, lea: /\balpha\b/, leb: /\bbeta\b/, '2ed': /\bunlimited\b/, '3ed': /\brevised\b|\b3rd\s+ed/,
  '4ed': /\b4th\s+ed/, ced: /collector'?s'?\s+ed|\bce\b/, cei: /international|\bice\b|\bie\b/, fbb: /foreign\s+black|\bfbb\b/,
  '30a': /30th\s+anniv/, sum: /summer\s+magic/, pza: /\btmnt\b|\bteenage\s+mutant\b/, tmt: /\btmnt\b|\bteenage\s+mutant\b/, tmc: /\btmnt\b|\bteenage\s+mutant\b/, plst: /\bthe\s+list\b|^list\b|\blist\s+reprints?\b/, sld: /secret\s+lair|\bsld\b/,
};
// Words in a title → which printings they point to.
const TREAT = {
  serialized: (v) => v.tags.includes('serialized'),
  borderless: (v) => v.tags.includes('borderless'),
  'extended': (v) => v.tags.includes('extendedart'),
  showcase: (v) => v.tags.includes('showcase'),
  retro: (v) => v.tags.includes('retro'),
  'old frame': (v) => v.tags.includes('retro'),
  'old border': (v) => v.tags.includes('retro'),
  etched: (v) => v.finish === 'etched',
  surge: (v) => v.tags.includes('surgefoil'),
  textured: (v) => v.tags.includes('textured'),
  galaxy: (v) => v.tags.includes('galaxyfoil'),
  'double rainbow': (v) => v.tags.includes('doublerainbow'),
  'step and compleat': (v) => v.tags.includes('stepandcompleat'),
  'step-and-compleat': (v) => v.tags.includes('stepandcompleat'),
  'raised foil': (v) => v.tags.includes('raisedfoil'),
  halo: (v) => v.tags.includes('halofoil'),
  'silver scroll': (v) => v.tags.includes('silverscroll') || v.tags.includes('scroll'),
  confetti: (v) => v.tags.includes('confettifoil'),
  anime: (v) => v.tags.includes('borderless'),
  fracture: (v) => v.tags.includes('fracturefoil'),
  concept: (v) => v.tags.includes('concept'),
  poster: (v) => v.tags.includes('poster'),
  'full art': (v) => v.tags.includes('fullart'),
  'gold border': (v) => v.tags.includes('goldborder'),
  'jp alt': (v) => v.tags.includes('jpwalker') || v.tags.includes('japanshowcase'),
  'japanese alt': (v) => v.tags.includes('jpwalker') || v.tags.includes('japanshowcase'),
};
// A special printing from the title parser → catalog printings it can be.
const MTG_PRINTING = {
  list: (row, set) => /^(?:plst|ulst|plist)$/.test(row[0]) || /the list/i.test(set?.[0] || ''),
  wcd: (row, set) => /world championship/i.test(set?.[0] || '') || (row[4] || '').includes('goldborder'),
  mystery: (row) => /^(?:mb1|mb2|cmb1|cmb2|fmb1|pmb)$/.test(row[0]),
  judge: (row, set) => (row[4] || '').includes('judgegift') || /judge gift/i.test(set?.[0] || ''),
  prerelease: (row) => (row[4] || '').includes('prerelease'),
  stamped: (row) => /\b(?:promopack|stamped|datestamped)\b/.test(row[4] || ''),
  'box-topper': (row) => (row[4] || '').includes('boxtopper'),
  book: (row) => (row[4] || '').includes('mediainsert'),
  promo: (row, set) => set?.[2] === 'promo' || /\b(?:promopack|stamped|datestamped|prerelease|judgegift|mediainsert|buyabox|bundle|fnm|instore|playerrewards|wizardsplaynetwork|gameday|tourney)\b/.test(row[4] || ''),
};

const mtgPrefixCount = {};
function mtgNameRe(name) {
  const faces = name.split(/\s*\/\/\s*/);
  const parts = faces.map((face) => {
    const n = normalize(face).replace(/,/g, '');
    const toks = n.split(/\s+/).filter((w) => w !== 'the');
    const first = esc(toks[0]).replace(/'/g, "'?");
    return [first, ...toks.slice(1).map((w) => esc(w).replace(/'/g, "'?"))].join('[\\s,:-]*(?:the\\s+)?');
  });
  // "Ragavan, Nimble Pilferer" is often just "Ragavan", but "Sheoldred" alone
  // could be three different cards. Use the short name only when no other
  // card starts with it.
  const head = normalize(faces[0]).split(',')[0].trim();
  if (head !== normalize(faces[0]) && head.length >= 5) {
    if (mtgPrefixCount[head] == null) {
      mtgPrefixCount[head] = Object.values(catalogData('mtg').cards).filter((c) => normalize(c.n).startsWith(`${head},`) || normalize(c.n) === head).length;
    }
    if (mtgPrefixCount[head] === 1) parts.push(`${esc(head).replace(/'/g, "'?")}(?!,?\\s*(?:the\\s+)?[a-z]+\\s+(?:one|of|the)\\b)`);
  }
  // Longer card names that start with this one ("One Ring to Rule Them All").
  const core = normalize(faces[0]).replace(/,/g, '').replace(/^the\s+/, '');
  if (!mtgLonger[core]) {
    mtgLonger[core] = Object.values(catalogData('mtg').cards).map((c) => normalize(c.n).replace(/,/g, '').replace(/^the\s+/, ''))
      .filter((n) => n.startsWith(`${core} `)).map((n) => esc(n.slice(core.length + 1)));
  }
  const not = mtgLonger[core].length ? `(?![\\s,:-]+(?:${mtgLonger[core].join('|')})\\b)` : '';
  // "Sheoldred's Edict" isn't Sheoldred.
  return new RegExp(`\\b(?:${parts.join('|')})\\b(?!'s\\b)${not}`);
}
const mtgLonger = {};
const mtgFaces = {};
function otherFaceNamed(card, t) {
  if (card.n.includes('//')) return false;
  const me = normalize(card.n);
  if (!mtgFaces[me]) {
    mtgFaces[me] = Object.values(catalogData('mtg').cards)
      .map((c) => normalize(c.n).split(/\s*\/\/\s*/))
      .filter((faces) => faces.length > 1 && faces.includes(me))
      .flatMap((faces) => faces.filter((f) => f !== me));
  }
  return mtgFaces[me].some((f) => t.includes(f));
}

// Other cards whose names hold this one after other words ("Scion of the
// Ur-Dragon", "Very Cryptic Command", "Wild Wasteland").
const mtgContaining = {};
function otherMtgHolding(card, t) {
  const me = plain(card.n.split(/\s*\/\/\s*/)[0]);
  if (!mtgContaining[me]) {
    mtgContaining[me] = [...new Set(Object.values(catalogData('mtg').cards).map((c) => plain(c.n.split(/\s*\/\/\s*/)[0])))]
      .filter((n) => n !== me && n.includes(me) && !n.startsWith(me));
  }
  const pt = plain(t);
  return mtgContaining[me].some((n) => pt.includes(n));
}

function matchMtg(card, title, t, parsed) {
  const flavorHit = card.p.some((r) => r[6] && t.includes(normalize(r[6])));
  if (!flavorHit && !mtgNameRe(card.n).test(t)) return { kind: 'reject', why: 'a different card' };
  if (!flavorHit && otherMtgHolding(card, t)) return { kind: 'reject', why: 'a different card' };
  if (/\b[2-9][\s-]*sheet\s+set\b/.test(t)) return { kind: 'reject', why: 'lot, bundle or sealed product' };
  // A two-faced card whose other face is in the title ("Emeritus of Woe //
  // Demonic Tutor") is that card, not ours.
  if (otherFaceNamed(card, t)) return { kind: 'reject', why: 'a different card (two-faced)' };
  // "Wild Aesthir (Lightning Bolt)": the name in brackets isn't what's for sale.
  const lead = t.match(/^([a-z' ,-]{4,})\s*\(/)?.[1]?.trim();
  if (lead && normalize(card.n) !== lead && !normalize(card.n).startsWith(lead) && getCard('mtg', lead) && t.includes(`(${normalize(card.n)}`)) return { kind: 'reject', why: `a different card (${getCard('mtg', lead).n})` };
  if (/\btokens?\b/.test(t)) return { kind: 'reject', why: 'a token' };
  if (/\bduel\s+masters\b/.test(t)) return { kind: 'reject', why: 'not a Magic card (Duel Masters)' };
  // Sorcery: Contested Realm, another game that shares some card names.
  if (/\bsorcery\b.*\bcontested\s+realm\b|\bcontested\s+realm\b/.test(t)) return { kind: 'reject', why: 'not a Magic card (Sorcery: Contested Realm)' };
  const rows = card.p;

  // Non-English: only printings made in that language (Japanese alternate
  // art, for example) get a version; anything else is "Japanese printing".
  const lang = parsed.language !== 'en' ? languageName(t) || 'Non-English' : null;
  if (lang) {
    const languageOnly = { kind: 'language', why: `${card.n} · ${lang} printing`, language: lang };
    const own = rows.filter((r) => r[5] && languageName(normalize(langLabel(r[5]))) === lang);
    if (!own.length) return languageOnly;
    const m = matchMtgRows(card, title, t, parsed, own);
    return m.kind === 'exact' ? m : languageOnly;
  }
  return matchMtgRows(card, title, t, parsed, rows);
}

function matchMtgRows(card, title, t, parsed, rows) {
  const data = catalogData('mtg');

  // Special printings (The List, prerelease, judge…) only match their own printings.
  // "Promo" next to a printing's own long number ("Secret Lair … #8001") is
  // that printing, even when its set isn't a promo set.
  const longNums = new Set([...t.matchAll(/#?0*(\d{3,4})\b/g)].map((m) => m[1]));
  const promoNumbered = parsed.printing === 'promo' && rows.some((r) => longNums.has(nz(r[1])));
  if (parsed.printing && MTG_PRINTING[parsed.printing] && !promoNumbered) {
    const only = rows.filter((r) => MTG_PRINTING[parsed.printing](r, data.sets[r[0]]));
    if (!only.length) return promoUnconfirmed(card, parsed, null, 'mtg');
    rows = only;
  }

  // Set codes: capitals anywhere ("MH2"), or any case when it's a set this
  // card is in ("2Xm", "Uma").
  const mySets = new Set(rows.map((r) => r[0]));
  const codes = new Set([...title.matchAll(/(?<![A-Za-z])([A-Z0-9]{3,5})(?![a-z])/g)].map((m) => m[1].toLowerCase()));
  for (const m of t.matchAll(/(?<![a-z0-9])([a-z0-9]{3,5})(?![a-z0-9])/g)) if (mySets.has(m[1])) codes.add(m[1]);
  const nums = new Set([...t.matchAll(/(?<![\w.$])#?0*(\d{1,4}[a-z★]?)(?:\s*\/\s*\d+)?(?![\w%.$])/g)]
    .filter((m) => !GRADECTX.test(t.slice(0, m.index)) && !/^\s*of\s/.test(t.slice(m.index + m[0].length)))
    .map((m) => m[1])
    // Years ("1999 World Championship") aren't card numbers.
    .filter((n) => !/^(?:19[89]\d|20[0-3]\d)$/.test(n)));
  const ft = flat(t);
  // A printing's own alternate name in the title ("Zidane Tribal") pins it.
  const flavored = rows.filter((r) => r[6] && t.includes(normalize(r[6])));
  if (flavored.length === 1) return exactLabel('mtg', card, flavored[0], t, parsed);
  if (flavored.length > 1) rows = flavored;
  const nameScore = (code) => {
    const s = data.sets[code];
    if (!s) return 0;
    const sn = normalize(s[0]);
    let best = 0;
    if (t.includes(sn) || ft.includes(flat(sn))) best = sn.length + 100;
    for (const seg of sn.split(':').map((x) => x.trim()).filter((x) => x.length >= 8 && x !== 'commander' && x !== 'universes beyond')) if (t.includes(seg)) best = Math.max(best, seg.length);
    if (sn === 'secret lair drop' && /secret\s+lair|\bsld\b/.test(t)) best = Math.max(best, 50);
    if (codes.has(code)) best = Math.max(best, 40);
    if (MTG_ALIAS[code]?.test(t)) best = Math.max(best, code === 'cei' ? 31 : 30);
    return best;
  };
  // Companion sets (timeshifts, promos, The List) answer to their parent's
  // name too: "Modern Horizons 2" finds the retro-frame Ragavan in "Modern
  // Horizons 2 Timeshifts" (the test's group 3).
  // One point less than the set's own name, so "Revised" still means Revised.
  const setScore = (code) => Math.max(nameScore(code), data.sets[code]?.[3] ? nameScore(data.sets[code][3]) - 1 : 0);

  // Card numbers match as written, or by their digits alone: The List's
  // "2X2-107", prerelease "103s", World Championship "ml321".
  const numHit = (num) => nums.has(nz(num)) || nums.has(nz(String(num).split('-').pop())) || nums.has(String(num).replace(/\D/g, '').replace(/^0+(?=\d)/, ''));
  // "022/259": the number and the set's printed total, when no set is named.
  const totals = [...t.matchAll(/(?<![\w.$])#?0*(\d{1,4})\s*\/\s*0*(\d{2,4})(?![\w%.$])/g)].map((m) => [m[1], Number(m[2])]);
  const totalHit = (row) => totals.some(([n, of]) => nz(row[1]) === n && data.sets[row[0]]?.[4] === of);
  let cands = rows.map((row) => ({ row, s: setScore(row[0]) || (totalHit(row) ? 45 : 0), n: numHit(row[1]) })).filter((c) => c.s > 0 || c.n);
  const withSet = cands.filter((c) => c.s > 0);
  let pool = withSet.length ? withSet : cands.filter((c) => c.n && nz(c.row[1]).length >= 3);

  const said = Object.keys(TREAT).filter((k) => t.includes(k));
  const narrow = (list) => {
    for (const k of said) {
      const f = list.filter((c) => mtgVersions(c.row).some(TREAT[k]));
      if (f.length) list = f;
    }
    return list;
  };

  if (!pool.length) {
    let all = narrow(rows.map((row) => ({ row, s: 1, n: false })));
    // A special printing with only one copy of this card (Judge promo, World
    // Championship deck) is that copy, whatever else the title numbers ("*707").
    if (parsed.printing && parsed.printing !== 'promo' && all.length === 1) return exactLabel('mtg', card, all[0].row, t, parsed);
    // A number in the title that isn't this printing's: don't guess.
    if (all.length === 1 && nums.size && !numHit(all[0].row[1])) return unknownLabel(card, t);
    if (parsed.printing && all.length === 1) return exactLabel('mtg', card, all[0].row, t, parsed);
    if (parsed.printing) return promoUnconfirmed(card, parsed, all.length <= 6 ? all.map((c) => c.row) : null, 'mtg');
    if (!said.length || all.length > 3) return unknownLabel(card, t);
    pool = all;
  }
  if (pool.some((c) => c.n && c.s > 0)) pool = pool.filter((c) => c.n && c.s > 0);
  // Treatment words first ("Retro Frame" picks the Timeshifts printing), then the best set fit.
  pool = narrow(pool);
  const bestS = Math.max(...pool.map((c) => c.s));
  pool = pool.filter((c) => c.s === bestS);

  if (pool.length === 1) return exactLabel('mtg', card, pool[0].row, t, parsed);
  if (parsed.printing && parsed.printing === 'promo') return promoUnconfirmed(card, parsed, pool.map((c) => c.row), 'mtg');
  return setLabel('mtg', card, pool.map((c) => c.row), t);
}

const LANG_CODES = { ja: 'Japanese', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', ko: 'Korean', ru: 'Russian', zhs: 'Chinese', zht: 'Chinese' };
const langLabel = (code) => LANG_CODES[code] || code;
const mtgVersions = (row) => versionsOf('mtg', row);

// ── Yu-Gi-Oh! and Lorcana ───────────────────────────────────────────────────
// Titles and card names as bare words, so "Blue-Eyes" = "Blue Eyes" and
// "Ash Blossom & Joyous Spring" = "Ash Blossom and Joyous Spring".
const plain = (s) => ` ${normalize(s).replace(/'/g, '').replace(/&/g, ' ').replace(/\band\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()} `;
// A long name run together also counts ("Access Code Talker" = "Accesscode Talker").
const has = (pt, name) => name.trim().length > 0 && (pt.includes(name)
  || (name.length >= 10 && pt.replace(/ /g, '').includes(name.replace(/ /g, ''))));

// Other cards whose names hold this one ("Dark Magician Girl", "Toon Dark Magician").
const longerNames = {};
function longerNameIn(game, card, pt, name = plain(card.n)) {
  const id = `${game}:${name}`;
  if (!longerNames[id]) {
    longerNames[id] = [...new Set(Object.values(catalogData(game).cards).map((c) => plain(c.n.split(' - ')[0]))
      .concat(Object.values(catalogData(game).cards).map((c) => plain(c.n))))]
      .filter((n) => n !== name && n.includes(name));
  }
  return longerNames[id].some((n) => pt.includes(n));
}

// Language letters in a printed code: "RA01-JP001", "LOB-DE001".
const YGO_LANG_CODE = /(?<![a-z0-9])[a-z0-9]{2,5}-(jp|ja|de|fr|it|sp|kr|ko|ae|tc|sc)[a-z]?\d{2,3}(?![a-z0-9])/;
const YGO_LANG = { jp: 'Japanese', ja: 'Japanese', de: 'German', fr: 'French', it: 'Italian', sp: 'Spanish', kr: 'Korean', ko: 'Korean', ae: 'Asian English', tc: 'Chinese', sc: 'Chinese' };

// Set names holding a card's name ("The Legend of Blue Eyes White Dragon"),
// which aren't that card.
const ygoSetNames = {};
function withoutSetNames(card, pt, name) {
  if (!ygoSetNames[name]) {
    ygoSetNames[name] = [...new Set(Object.values(catalogData('yugioh').sets).map((s) => plain(String(s[0]).replace(/\(.*\)/, ''))))]
      .filter((n) => n !== name && n.includes(name));
    // "The Legend of…" is often written without "The".
    ygoSetNames[name].push(...ygoSetNames[name].map((n) => n.replace(/^ the /, ' ')));
  }
  return ygoSetNames[name].reduce((p, n) => p.split(n).join(' '), pt);
}

// Who owns a printed code, to tell a code from another card (wrong listing)
// from one the catalog doesn't have (YGOPRODeck has gaps): "LC01-EN002".
let ygoCodes = null;
function ygoCodeOwner(code) {
  if (!ygoCodes) {
    ygoCodes = new Map();
    for (const c of Object.values(catalogData('yugioh').cards)) for (const r of c.p) ygoCodes.set(`${r[0]}-${r[1]}`.toLowerCase(), c.n);
  }
  return ygoCodes.get(code) || null;
}
// Another well-known card named in a title with no code to go on ("Slifer the
// Sky Dragon, Obelisk the Tormentor…"). Long names only; short ones are words.
let ygoLongNames = null;
let ygoAllSetNames = null;
function otherYugiohNamed(name, pt) {
  if (!ygoLongNames) {
    ygoLongNames = [...new Set(Object.values(catalogData('yugioh').cards).map((c) => plain(c.n)))].filter((n) => n.length >= 16);
    ygoAllSetNames = [...new Set(Object.values(catalogData('yugioh').sets).map((s) => plain(String(s[0]).replace(/\(.*\)/, ''))))].filter((n) => n.length >= 16);
  }
  const clean = ygoAllSetNames.reduce((p, n) => (p.includes(n) ? p.split(n).join(' ') : p), pt);
  return ygoLongNames.some((n) => n !== name && !n.includes(name) && !name.includes(n) && clean.includes(n));
}

function matchYugioh(card, title, t, parsed) {
  const pt = plain(t);
  const name = plain(card.n);
  // A printed code of ours beats a short name ("Black Luster Soldier TOCH-EN029"
  // is Black Luster Soldier - Envoy of the Beginning), when the title's words
  // are the start of this card's name.
  const ownCode = card.p.find((r) => new RegExp(`(?<![a-z0-9])${esc(r[0].toLowerCase())}[\\s-]*${esc(r[1].toLowerCase())}(?![a-z0-9])`).test(t));
  const shortName = ownCode && name.split(' ').filter(Boolean).slice(0, 3).join(' ');
  const byCode = !!(ownCode && shortName && pt.includes(` ${shortName} `));
  if (!byCode && !has(withoutSetNames(card, pt, name), name)) return { kind: 'reject', why: 'a different card' };
  if (!byCode && (longerNameIn('yugioh', card, pt) || pt.includes(` sin${name}`))) return { kind: 'reject', why: 'a different card' };
  // Japanese names for other Kuriboh cards (Winged Kuriboh, Kuriboh Multiply!).
  if (/\bhane[\s-]*kuriboh\b|\bkuriboh\s+multipl|\bproliferat/.test(t)) return { kind: 'reject', why: 'a different card' };
  if (/\bdungeon\s+dice\b|\bddm\b/.test(t)) return { kind: 'reject', why: 'not a card (Dungeon Dice Monsters)' };
  if (/\bfull\s+set\b|\bcomplete\s+set\b|(?:^|\s)[x×]\s?[2-9]\b|\b[2-9]\s?[x×](?:\s|$)/.test(t)) return { kind: 'reject', why: 'lot, bundle or sealed product' };
  if (/\btokens?\b/.test(t) && !/\btoken\b/.test(normalize(card.n))) return { kind: 'reject', why: 'a token' };
  if (/\b(?:duel\s+links|master\s+duel)\b/.test(t)) return { kind: 'reject', why: 'not a card (the video game)' };

  // The printed code is the surest thing in a title: "LOB-EN001", "LOB EN001", "LOB-001".
  const data = catalogData('yugioh');
  const codeHit = (row, loose) => {
    const number = loose ? row[1].replace(/^[A-Z]+/, '') : row[1];
    return new RegExp(`(?<![a-z0-9])${esc(row[0].toLowerCase())}[\\s-]*${loose ? '(?:en)?' : ''}${esc(number.toLowerCase())}(?![a-z0-9])`).test(t);
  };
  const foreign = t.match(YGO_LANG_CODE)?.[1];
  // Old Japanese and Asian copies share codes like LOB-001 with English ones, so
  // a language word beats the code. Bandai made the first Japanese game.
  const lang = foreign ? YGO_LANG[foreign]
    : /\basian?\b/.test(t) ? 'Asian English'
    : /\bbandai\b|\bcarddass\b/.test(t) ? 'Japanese'
    : parsed.language !== 'en' ? languageName(t) || 'Non-English' : null;
  const exact = card.p.filter((r) => codeHit(r, false));
  const ownLanguage = (r) => lang === 'Portuguese' && /^PT|^P\d/.test(r[1]);
  if (exact.length && (!lang || exact.some(ownLanguage))) return exactLabel('yugioh', card, exact.find(ownLanguage) || exact[0], t, parsed);
  if (lang) return { kind: 'language', why: `${card.n} · ${lang} printing`, language: lang };

  const loose = card.p.filter((r) => codeHit(r, true));
  if (loose.length) return exactLabel('yugioh', card, loose[0], t, parsed);
  // A code from a set we know that isn't one of this card's printings.
  for (const m of t.matchAll(/(?<![a-z0-9])([a-z0-9]{2,5})-([a-z]{0,4}\d{1,3})(?![a-z0-9])/g)) {
    if (!data.sets[m[1].toUpperCase()]) continue;
    const owner = ygoCodeOwner(`${m[1]}-${m[2]}`);
    if (owner && owner !== card.n) return { kind: 'reject', why: `a different card (${owner})` };
    return unknownLabel(card, t);
  }
  if (otherYugiohNamed(name, pt)) return { kind: 'reject', why: 'several cards, or a different card' };

  let rows = card.p;
  const setHits = rows.filter((r) => {
    const sn = plain(data.sets[r[0]]?.[0] || '');
    return (sn.trim().length >= 5 && pt.includes(sn)) || new RegExp(`(?<![A-Za-z0-9])${esc(r[0])}(?![A-Za-z0-9])`).test(title);
  });
  if (setHits.length) rows = setHits;
  // Plain "Rare" is in too many names ("Millennium Gold Rare") to narrow by.
  if (parsed.rarity && parsed.rarity !== 'rare') {
    const same = rows.filter((r) => yugiohOfRung(r, parsed.rarity));
    if (same.length) rows = same;
    else if (!setHits.length && card.p.length > 1) return { kind: 'reject', why: `no ${parsed.rarityName || 'such'} printing of this card` };
  } else if (parsed.rarity === 'rare' && card.p.length > 1) {
    const named = /\bmillennium\b/.test(t) ? [] : rows.filter((r) => versionsOf('yugioh', r).some((v) => v.rarity && t.includes(normalize(v.rarity))));
    rows = named.length ? named : rows;
    if (!named.length && !setHits.length) return unknownLabel(card, t);
  }
  if (parsed.printing) return promoUnconfirmed(card, parsed, rows.length <= 6 && (setHits.length || parsed.rarity) ? rows : null, 'yugioh');
  if (rows.length === 1) return exactLabel('yugioh', card, rows[0], t, parsed);
  if (setHits.length || (parsed.rarity && rows.length <= 4)) return setLabel('yugioh', card, rows, t);
  return unknownLabel(card, t);
}
const yugiohOfRung = (row, rung) => versionsOf('yugioh', row).some((v) => v.rarityKey === rung);

// Nicknames and codes sellers use for Lorcana sets.
const LORCANA_ALIAS = {
  1: /\btfc\b/, 2: /\brotf\b|\brof\b|\bfloodborn\b/, 3: /\biti\b|\binklands\b/, 4: /\burr\b|\bursulas?\s+return\b/, 5: /\bssk\b/,
  6: /\bazs\b|\bazurite\b/, 7: /\bari\b|\barchazia\b/, 8: /\broj\b|\bjafar\b/, 9: /\bfab\b/, 10: /\bwiw\b|\bwhispers\b/,
  11: /\bwin\b/, P1: /\bp1\b/, P2: /\bp2\b/, P3: /\bp3\b/, P4: /\bp4\b/, D23: /\bd23\b/,
};

function matchLorcana(card, title, t, parsed) {
  const pt = plain(t);
  const [base, sub] = card.n.split(' - ');
  const baseName = plain(base);
  if (!has(pt, baseName)) return { kind: 'reject', why: 'a different card' };
  const subName = sub ? plain(sub) : null;
  const subHit = !subName || has(pt, subName);
  const cards = Object.values(catalogData('lorcana').cards);
  // Another version of the same character named in the title.
  if (!subHit && cards.some((c) => {
    const [b, s] = c.n.split(' - ');
    return s && c.n !== card.n && plain(b) === baseName && pt.includes(plain(s));
  })) return { kind: 'reject', why: 'a different card (another version of this character)' };
  if (!sub && longerNameIn('lorcana', card, pt, baseName)) return { kind: 'reject', why: 'a different card' };
  // Lorcana's own codes: "JA-1", "30/P1JA1", "ZH C2", "CHN".
  const lorcanaLang = /(?:\b|p\d)ja[\s-]*(?:p?\d)\b/.test(t) ? 'Japanese' : /\bzh\b|\bchn\b/.test(t) ? 'Chinese' : null;
  if (parsed.language !== 'en' || lorcanaLang) {
    const lang = lorcanaLang || languageName(t) || 'Non-English';
    return { kind: 'language', why: `${card.n} · ${lang} printing`, language: lang };
  }
  if (/\bsketch\b|\bhand[\s-]*(?:drawn|painted)\b/.test(t)) return { kind: 'reject', why: 'proxy or custom card' };

  const data = catalogData('lorcana');
  const isPromoRow = (r) => data.rarities[r[2]] === 'Promo';
  // The main sets' own number in a title: "[9 - 3/204]", "EN 7".
  const setNumber = t.match(/\[\s*(\d{1,2})\s*-|\ben[\s-]*(\d{1,2})\b/);
  const setSaid = setNumber ? setNumber[1] || setNumber[2] : null;
  const nums = pokemonNumbers(t);
  const scored = card.p.map((row) => {
    const sn = plain(data.sets[row[0]]?.[0] || '');
    const setHit = (sn.trim().length >= 3 && pt.includes(sn)) || !!LORCANA_ALIAS[row[0]]?.test(t) || setSaid === row[0];
    let score = setHit ? 4 : 0;
    let numberHit = false;
    for (const x of nums) {
      if (x.n !== nz(row[1])) continue;
      // "3/204": a main-set number, not promo #3.
      if (x.slash && /^\d{3}$/.test(x.of) && isPromoRow(row)) continue;
      if (x.bare) score += 1;
      else { score += 5; numberHit = true; }
    }
    return { row, score, numberHit, setHit };
  }).sort((a, b) => b.score - a.score);
  // Without the subtitle, only a printed number says it's this card.
  if (!subHit) {
    const pinned = scored.filter((c) => c.numberHit);
    if (pinned.length === 1 && nums.some((x) => x.slash || !x.bare)) return exactLabel('lorcana', card, pinned[0].row, t, parsed);
    return unknownLabel(card, t);
  }
  if (nums.some((x) => x.slash) && !scored.some((c) => c.numberHit)) {
    // A promo code Lorcast doesn't list ("15/C3"), or a promo with a made-up total.
    if (parsed.printing || nums.some((x) => x.slash && /^[a-z]/.test(x.of))) return promoUnconfirmed(card, parsed, null, 'lorcana');
    return { kind: 'reject', why: "card number isn't one of this card's printings" };
  }

  let rows = scored[0].score >= 4 ? scored.filter((c) => c.score === scored[0].score).map((c) => c.row) : card.p;
  const pinned = scored[0].score >= 4;
  if (parsed.printing || /\bprize\b|\bchamp(?:s|ionship)?\b/.test(t)) {
    const inRows = rows.filter(isPromoRow);
    const promos = inRows.length ? inRows : card.p.filter(isPromoRow);
    // A number that fits one promo: "Store Championship 30".
    const numbered = promos.filter((r) => scored.find((c) => c.row === r)?.score > 0);
    if (promos.length === 1) return exactLabel('lorcana', card, promos[0], t, parsed);
    if (numbered.length === 1) return exactLabel('lorcana', card, numbered[0], t, parsed);
    return promoUnconfirmed(card, parsed, promos.length ? promos : null, 'lorcana');
  }
  if (parsed.rarity) {
    const same = rows.filter((r) => versionsOf('lorcana', r).some((v) => v.rarityKey === parsed.rarity));
    if (same.length) rows = same;
    else if (!pinned) return { kind: 'reject', why: `no ${parsed.rarityName || 'such'} printing of this card` };
  }
  if (rows.length === 1) return exactLabel('lorcana', card, rows[0], t, parsed);
  if (pinned || parsed.rarity) return setLabel('lorcana', card, rows, t);
  return unknownLabel(card, t);
}

// ── A set named in a title (the Set filter) ─────────────────────────────────
// Whether a title names one set: its name, a code or nickname sellers use, or,
// where only one set has that total, a "199/165" card number. A longer set name
// doesn't count for a shorter one ("Base Set 2" isn't "Base Set").
const setNameIndex = {};
function setNames(game) {
  if (!setNameIndex[game]) {
    setNameIndex[game] = Object.entries(catalogData(game).sets).map(([code, s]) => ({ code, name: plain(String(s[0]).replace(/\(.*\)/, '')) })).filter((x) => x.name.trim().length >= 3);
  }
  return setNameIndex[game];
}
const totalIndex = {};
function totalOwner(game, total) {
  if (!totalIndex[game]) {
    const col = game === 'mtg' ? 4 : 2;
    const counts = {};
    for (const [code, s] of Object.entries(catalogData(game).sets)) if (s[col]) (counts[String(s[col])] ||= []).push(code);
    totalIndex[game] = counts;
  }
  const owners = totalIndex[game][total];
  return owners?.length === 1 ? owners[0] : null;
}
export function titleSetHit(game, code, title) {
  const data = catalogData(game);
  if (!data?.sets[code]) return false;
  const t = normalize(title);
  const pt = plain(t);
  const name = setNames(game).find((x) => x.code === code)?.name;
  if (name && pt.includes(name) && !setNames(game).some((x) => x.code !== code && x.name !== name && x.name.includes(name) && pt.includes(x.name))) return true;
  if (game === 'mtg' && (MTG_ALIAS[code]?.test(t) || (code.length >= 3 && new RegExp(`(?<![A-Za-z0-9])${esc(code.toUpperCase())}(?![A-Za-z0-9])`).test(title)))) return true;
  if (game === 'pokemon') {
    if (PK_ALIAS[code]?.test(t)) return true;
    if (PK_CODE[code] && new RegExp(`(?<![A-Za-z])${PK_CODE[code]}(?![A-Za-z])`).test(title)) return true;
  }
  if (game === 'pokemon' || game === 'mtg') {
    for (const m of t.matchAll(/(?<![\w/])\d{1,3}\s*\/\s*0*(\d{2,3})(?![\w/])/g)) if (totalOwner(game, m[1]) === code) return true;
  }
  if (game === 'yugioh') {
    if (new RegExp(`(?<![a-z0-9])${esc(code.toLowerCase())}[\\s-]*(?:en|e|p|g)?[a-z]?\\d{2,3}(?![a-z0-9])`).test(t)) return true;
    if (new RegExp(`(?<![A-Za-z0-9])${esc(code)}(?![A-Za-z0-9])`).test(title) && code.length >= 3) return true;
  }
  if (game === 'lorcana') {
    if (LORCANA_ALIAS[code]?.test(t)) return true;
    const said = t.match(/\[\s*(\d{1,2})\s*-|\ben[\s-]*(\d{1,2})\b/);
    if (said && (said[1] || said[2]) === code) return true;
    if (/^[A-Z]/.test(code) && new RegExp(`\\d+\\s*/\\s*${esc(code.toLowerCase())}(?![a-z0-9])`).test(t)) return true;
  }
  return false;
}

// ── Labels ──────────────────────────────────────────────────────────────────
// Which of a printing's versions the title allows (foil or not, reverse holo,
// 1st Edition). If the title doesn't say, all of them stay possible.
function finishFilter(game, versions, t) {
  const f = finishNarrow(game, versions, t);
  return f.length ? f : versions;
}

function finishWords(game, t) {
  if (game === 'yugioh') return false;
  return game === 'mtg' || game === 'lorcana' ? /\bfoil\b|\betched\b/.test(t) : /(?<!non[\s-]*)\bholo\b|\breverse\b|\b1st\b|\bfirst\s+edition\b|\bunlimited\b/.test(t);
}

// [] when the title names a finish this printing doesn't come in.
function finishNarrow(game, versions, t) {
  if (game === 'yugioh') {
    // The rarity named in the title, the longest name that fits.
    const named = versions.filter((v) => v.rarity && t.includes(normalize(v.rarity)));
    if (!named.length) return versions;
    const longest = Math.max(...named.map((v) => v.rarity.length));
    return named.filter((v) => v.rarity.length === longest);
  }
  if (game === 'lorcana') {
    if (versions.length < 2) return versions;
    if (/non[\s-]*foil/.test(t)) return versions.filter((v) => v.finish === 'nonfoil');
    return /\bfoil\b/.test(t) ? versions.filter((v) => v.finish === 'foil') : versions;
  }
  if (game === 'mtg') {
    const noFoil = /non[\s-]*foil/.test(t);
    const foil = !noFoil && /\bfoil\b/.test(t);
    const etched = /\betched\b/.test(t);
    let f = versions;
    if (etched) f = f.filter((v) => v.finish === 'etched');
    else if (foil) f = f.filter((v) => v.finish !== 'nonfoil');
    else if (noFoil) f = f.filter((v) => v.finish === 'nonfoil');
    return f;
  }
  const reverse = /\breverse\b/.test(t);
  const first = /\b1st\b|\bfirst\s+edition\b/.test(t);
  const holo = /(?<!non[\s-]*)\bholo\b/.test(t) && !reverse;
  let f = versions;
  if (reverse) f = f.filter((v) => v.finish === 'reverse');
  else if (first) f = f.filter((v) => v.firstEdition);
  else if (holo) f = f.filter((v) => v.finish === 'holo' && !v.firstEdition);
  else if (/\bunlimited\b/.test(t)) f = f.filter((v) => !v.firstEdition);
  return f;
}

function printingName(game, row) {
  const data = catalogData(game);
  const s = data.sets[row[0]];
  const name = s?.[0] || row[0];
  if (game === 'pokemon') return `${name} ${row[1]}${s?.[2] && /^\d+$/.test(row[1]) ? `/${s[2]}` : ''}`;
  if (game === 'yugioh') return `${name} ${row[0]}-${row[1]}`;
  return `${name} #${row[1]}`;
}

function exactLabel(game, card, row, t, parsed) {
  const all = versionsOf(game, row);
  const narrowed = finishNarrow(game, all, t);
  const versions = narrowed.length ? narrowed : all;
  const named = narrowed.length && narrowed.length < all.length || (all.length === 1 && finishWords(game, t));
  const parts = [card.n, printingName(game, row)];
  if (versions[0]?.rarity && versions.every((v) => v.rarity === versions[0].rarity)) parts.push(versions[0].rarity);
  // Name the finish only when the title and the catalog agree on one.
  if (named && narrowed.length === 1) parts.push(versions[0].label);
  else if (game === 'mtg') {
    // Name the treatments even when the finish is unknown.
    const tags = (row[4] || '').split(' ').filter((x) => MTG_TAG_LABELS[x]).map((x) => MTG_TAG_LABELS[x]);
    if (tags.length) parts.push(tags.join(' · '));
  }
  if (parsed.shadowless && game === 'pokemon') parts.push('Shadowless');
  return { kind: 'exact', versions: versions.map((v) => v.key), why: parts.join(' · ') };
}

function setLabel(game, card, rows, t) {
  const versions = rows.flatMap((r) => finishFilter(game, versionsOf(game, r), t));
  const sets = [...new Set(rows.map((r) => catalogData(game).sets[r[0]]?.[0] || r[0]))];
  return {
    kind: 'set',
    versions: versions.map((v) => v.key),
    why: `${card.n} · ${sets.slice(0, 2).join(' or ')}${sets.length > 2 ? ` (+${sets.length - 2} more)` : ''} · ${rows.length} versions possible`,
  };
}

function promoUnconfirmed(card, parsed, rows, game) {
  const versions = rows ? rows.flatMap((r) => versionsOf(game, r.row || r)) : [];
  const kind = parsed.printingLabel && parsed.printing !== 'promo' ? parsed.printingLabel.replace(/^Promo · /, '') : null;
  return {
    kind: 'promo',
    versions: versions.map((v) => v.key),
    why: `${card.n} · promo — version not confirmed${kind ? ` (${kind})` : ''}`,
  };
}

function unknownLabel(card, t) {
  return { kind: 'unknown', versions: [], why: `${card.n} · version not in title` };
}

// ── All together ────────────────────────────────────────────────────────────
export function matchListing(game, cardOrKey, title, parsedAlready = null) {
  const card = typeof cardOrKey === 'string' ? getCard(game, cardOrKey) : cardOrKey;
  if (!card) return { kind: 'reject', versions: [], why: 'unknown card' };
  const t = normalize(title);
  // Reuse a parse made for the same game (search results), else parse here.
  const parsed = parsedAlready && parsedAlready.game === game ? parsedAlready : parseTitle(title, { game });
  let out;
  // Lorcana's puzzle promos are real cards ("36/P2 Puzzle Promo"), and Yu-Gi-Oh!
  // set names hold pack and box words ("Movie Pack", "Duel Academy Box").
  const puzzlePromo = game === 'lorcana' && /\bpuzzle\s+promo\b|\b\d+\/p\d\b/.test(t);
  const setWordsOnly = game === 'yugioh' && parsed.lot && !isLot(t.replace(/\b(?!booster\b|sealed\b)[a-z]+\s+(?:pack|box|tin)\b/g, ' '), parsed.serial);
  if (parsed.proxy && !puzzlePromo) out = { kind: 'reject', why: 'proxy or custom card' };
  else if (parsed.lot && !setWordsOnly) out = { kind: 'reject', why: 'lot, bundle or sealed product' };
  else if (parsed.nonCard) out = { kind: 'reject', why: 'not a card (sticker, playmat, display piece…)' };
  // A card whose own name holds the word ("Coin Orb") isn't an accessory.
  else if (ACCESSORY.test(game === 'yugioh' || game === 'lorcana' ? t.replace(normalize(card.n.split(' - ')[0]), ' ') : t)) out = { kind: 'reject', why: 'not a card (accessory)' };
  else if (MULTI.test(t)) out = { kind: 'reject', why: 'lot, bundle or sealed product' };
  else if (game === 'yugioh') out = matchYugioh(card, title, t, parsed);
  else if (game === 'lorcana') out = matchLorcana(card, title, t, parsed);
  else out = game === 'mtg' ? matchMtg(card, title, t, parsed) : matchPokemon(card, title, t, parsed);
  return { versions: [], ...out, parsed };
}
