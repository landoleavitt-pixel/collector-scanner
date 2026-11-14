// lib/tcg/csvImport.js
//
// "Import a CSV file" (research/collection-import.md): read a collection file
// someone exported from their own app, and turn its rows into "I own this"
// marks on our card lists. Nothing is kept: the text is read, matched and
// dropped; rows are never logged.
//
//   readCsv(text)            → { headers, rows, error? }   (comma or semicolon)
//   importRows(text, game?)  → { matched: [...], unmatched: [...], total, skipped }
//
// One generic reader: headers in any order and any case, under the common
// names collection apps use (aliases below). It covers the layouts of the
// three most-used apps' exports without naming them. Never a silent guess: a
// row is matched only when the set, the card number and the finish lead to
// exactly one version of ours; otherwise it's listed with the reason.

import { catalogData, getCard, versionsOf, CATALOG_GAMES } from './catalog';
import { normalize } from './parseTitle';

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 1000;

// Our field → header names seen in collection exports (compared lower case,
// spaces and underscores ignored).
const ALIASES = {
  name: ['name', 'card name', 'cardname', 'simple name', 'product name'],
  set: ['set code', 'setcode', 'edition', 'set', 'set id'],
  setName: ['set name', 'setname', 'expansion'],
  number: ['card number', 'cardnumber', 'collector number', 'collectornumber', 'number', 'no'],
  qty: ['quantity', 'count', 'qty', 'amount', 'total quantity', 'add to quantity'],
  finish: ['foil', 'printing', 'finish', 'foil quantity', 'variant'],
  language: ['language', 'lang'],
  game: ['game', 'product line', 'productline', 'category'],
  rarity: ['rarity'],
  proxy: ['proxy'],
};
const key = (h) => String(h || '').toLowerCase().replace(/[\s_]+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim();

// RFC 4180-style: quoted fields, doubled quotes, quoted line breaks.
export function readCsv(text) {
  let s = String(text || '').replace(/^﻿/, '');
  if (!s.trim()) return { error: 'The file is empty' };
  const firstLine = s.slice(0, s.indexOf('\n') >= 0 ? s.indexOf('\n') : s.length);
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      if (rows.length > IMPORT_MAX_ROWS + 1) break;
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  const [head, ...data] = rows;
  if (!head) return { error: 'The file has no header row' };
  const fields = {};
  head.forEach((h, i) => {
    const k = key(h);
    for (const [field, names] of Object.entries(ALIASES)) if (names.includes(k) && fields[field] == null) fields[field] = i;
  });
  if (fields.number == null && fields.name == null) return { error: "We couldn't find a card name or card number column" };
  return {
    headers: head,
    fields,
    rows: data.slice(0, IMPORT_MAX_ROWS).map((r) => Object.fromEntries(Object.entries(fields).map(([f, i]) => [f, String(r[i] ?? '').trim()]))),
    cut: data.length > IMPORT_MAX_ROWS,
  };
}

const GAME_WORDS = [['pokemon', /pok[eé]mon/i], ['mtg', /magic|mtg/i], ['yugioh', /yu-?gi-?oh/i], ['lorcana', /lorcana/i]];
const gameOf = (text) => GAME_WORDS.find(([, re]) => re.test(text || ''))?.[0] || null;

// set:number → [card keys], per game; set names → set codes.
const idx = {};
function index(game) {
  if (!idx[game]) {
    const data = catalogData(game);
    const byNumber = {};
    for (const [k, c] of Object.entries(data.cards)) for (const row of c.p) (byNumber[`${row[0]}:${normalizeNumber(game, row[1])}`] ||= new Set()).add(k);
    const byName = {};
    const byCode = {};
    for (const [code, s] of Object.entries(data.sets)) {
      (byName[normalize(String(s[0]).replace(/\(.*\)/, '')).replace(/[^a-z0-9]+/g, ' ').trim()] ||= []).push(code);
      byCode[code.toLowerCase()] = code;
    }
    idx[game] = { byNumber, byName, byCode };
  }
  return idx[game];
}
function normalizeNumber(game, n) {
  const s = String(n || '').trim().toLowerCase();
  return game === 'yugioh' ? s : s.replace(/^0+(?=[0-9a-z])/, '');
}

// The finish letter a file's Foil / Printing value names, per game; null when it doesn't say.
function finishOf(game, raw, rarity) {
  const f = normalize(raw || '');
  if (game === 'mtg') {
    if (/etched/.test(f)) return 'e';
    if (/^(?:true|yes|foil|1)$|\bfoil\b/.test(f) && !/non/.test(f)) return 'f';
    if (/^(?:false|no|0|normal|regular|nonfoil|non-foil)?$/.test(f) || /non[\s-]*foil/.test(f)) return 'n';
    return null;
  }
  if (game === 'pokemon') {
    if (/reverse/.test(f)) return 'r';
    if (/1st/.test(f)) return '1';
    if (/holo/.test(f) && !/non/.test(f)) return 'h';
    if (/^(?:normal|regular|non[\s-]*holo|unlimited)?$/.test(f)) return 'n';
    return null;
  }
  if (game === 'lorcana') {
    if (/foil/.test(f) && !/non/.test(f)) return 'f';
    if (/^(?:normal|regular|non[\s-]*foil)?$/.test(f)) return 'n';
    return null;
  }
  return normalize(rarity || '') || null; // Yu-Gi-Oh!: the rarity is the version
}

function setCodesFor(game, row) {
  const { byName, byCode } = index(game);
  const out = new Set();
  const code = row.set && byCode[row.set.toLowerCase()];
  if (code) out.add(code);
  for (const n of [row.setName, row.set]) {
    const k = normalize(String(n || '')).replace(/[^a-z0-9]+/g, ' ').trim();
    for (const c of byName[k] || []) out.add(c);
  }
  return [...out];
}

// One row → { card, cardName, version, qty } or { reason }. With no game
// picked and none in the file, each game is tried, and the row is matched only
// if exactly one game has that card.
export function matchRow(row, gameHint = null) {
  const game = CATALOG_GAMES.includes(gameHint) ? gameHint : gameOf(row.game);
  if (game) return matchInGame(row, game);
  const tries = CATALOG_GAMES.map((g) => matchInGame(row, g));
  const ok = tries.filter((m) => !m.reason);
  if (ok.length === 1) return ok[0];
  return ok.length > 1 ? { reason: 'game not given, and more than one game has that card' } : (tries.find((m) => m.reason === 'marked as a proxy') || { reason: 'no card with that set and number in any game' });
}

function matchInGame(row, game) {
  if (/^(?:true|yes|1)$/i.test(row.proxy || '')) return { reason: 'marked as a proxy' };
  const lang = normalize(row.language || '');
  if (lang && !/^(?:en|english|eng)$/.test(lang) && game !== 'mtg') return { reason: 'not an English card (our card lists are English)' };
  let set = null;
  let number = row.number;
  // Yu-Gi-Oh! numbers are often the whole code: "LOB-EN001".
  if (game === 'yugioh') {
    const m = String(row.number || row.set || '').toUpperCase().match(/^([A-Z0-9]+)-([A-Z]{0,4}\d+[A-Z]?)$/);
    if (m) { set = m[1]; number = m[2]; }
  }
  const sets = set ? [set] : setCodesFor(game, row);
  if (!sets.length) return { reason: 'set not recognised' };
  number = String(number || '').split('/')[0].trim();
  if (!number) return { reason: 'card number missing' };
  const { byNumber } = index(game);
  const hits = [];
  for (const s of sets) for (const k of byNumber[`${s}:${normalizeNumber(game, number)}`] || []) hits.push({ set: s, key: k });
  if (!hits.length) return { reason: 'no card with that number in that set' };
  // A name in the file must agree (sellers' and apps' names differ in small ways, so start-of-name).
  const name = normalize(row.name || '');
  const fits = name ? hits.filter((h) => { const n = normalize(getCard(game, h.key).n); return n.startsWith(name.split(' // ')[0]) || name.startsWith(n.split(' // ')[0]); }) : hits;
  if (!fits.length) return { reason: 'the name in the file is a different card' };
  if (fits.length > 1) return { reason: 'more than one card fits; add the set code' };
  const card = getCard(game, fits[0].key);
  const versions = card.p.filter((r) => r[0] === fits[0].set && normalizeNumber(game, r[1]) === normalizeNumber(game, number)).flatMap((r) => versionsOf(game, r));
  const want = finishOf(game, row.finish, row.rarity);
  let picked = versions;
  if (game === 'yugioh') {
    if (versions.length > 1) picked = want ? versions.filter((v) => v.rarity && normalize(v.rarity) === want) : [];
  } else if (want) {
    picked = versions.filter((v) => v.key.endsWith(`:${want}`));
  } else if (versions.length > 1) picked = [];
  if (picked.length !== 1) return { reason: versions.length > 1 ? 'finish or rarity not given, and the card comes in several' : 'that finish isn\'t one of this card\'s versions' };
  const qty = Math.max(1, Math.min(999, parseInt(row.qty, 10) || 1));
  return { game, card: card.key, cardName: card.n, version: picked[0].key, label: picked[0].label, qty };
}

export function importRows(text, gameHint = null) {
  if (String(text || '').length > IMPORT_MAX_BYTES) return { error: 'The file is larger than 5 MB' };
  if (/\u0000/.test(String(text || ''))) return { error: 'That isn\'t a text file' };
  const csv = readCsv(text);
  if (csv.error) return csv;
  const merged = new Map();
  const unmatched = [];
  csv.rows.forEach((row, i) => {
    const m = matchRow(row, gameHint);
    if (m.reason) { unmatched.push({ line: i + 2, name: row.name || null, set: row.set || row.setName || null, number: row.number || null, reason: m.reason }); return; }
    const k = `${m.game}|${m.card}|${m.version}`;
    const prev = merged.get(k);
    merged.set(k, prev ? { ...prev, qty: Math.min(999, prev.qty + m.qty) } : m);
  });
  return { matched: [...merged.values()], unmatched, total: csv.rows.length, cut: csv.cut };
}
