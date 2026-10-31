// scripts/import-checklists.mjs
//
// Imports the card makers' own player checklists (Panini Excel, Topps or
// Ripped CSV, Upper Deck PDF) into lib/checklists/<set-key>.json.
//
//   node scripts/import-checklists.mjs              read data/checklists/, write lib/checklists/
//   node scripts/import-checklists.mjs --check      read and report, write nothing
//
// File names must be the set key from lib/parallelData.js, with the format's
// extension: data/checklists/2025-topps-chrome-football.csv. Files in
// data/checklists/fixtures/ are fake test data and are never written out.
//
// Output, one row per card, kept compact:
//   { set, source: { file, format, pulled }, cards: [[number, player, team, rookie, subset], ...] }
//   rookie: 1 for a rookie card, 0 otherwise
//   subset: 'b' base card, 'r' base rookie card
//   Insert, autograph and relic rows are counted and skipped (phase 2).
//
// Column names are matched loosely (see HEADER below). The layouts are
// assumed from each maker's published checklists, not from a real file yet:
// the first real file of each format is the check, and mismatches stop with a
// message naming the columns that were found.
//
// PDFs need pdftotext (poppler) on the PATH. A PDF that can't be read is
// reported, and a plain-text export of it can be used instead (.txt).

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPUT = path.join(root, 'data/checklists');
const OUTPUT = path.join(root, 'lib/checklists');
const FIXTURES = path.join(INPUT, 'fixtures');

const HEADER = {
  number: /^(card\s*)?(#|no\.?|num|number|card\s*number|card\s*no\.?)$/i,
  player: /^(player|player\s*name|name)$/i,
  team: /^(team|tm|club|team\s*name)$/i,
  rookie: /^(rc|rookie|rookie\s*card|is\s*rookie)$/i,
  subset: /^(subset|set|card\s*type|type|insert\s*set|variation)$/i,
};
const INSERT = /insert|autograph|auto\b|signature|relic|patch|memorab|jersey|swatch|case\s*hit|short\s*print|\bsp\b|checklist\s*card/i;
const ROOKIE_VALUE = /^(y|yes|true|1|rc|rookie)$/i;

/** Parse one CSV text into rows of strings (quotes and CRLF handled). */
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const colIndex = (ref) => {
  let n = 0;
  for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};
const xmlText = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** Read every worksheet of an .xlsx file (zip + XML) into rows of strings. */
export function parseXlsx(file) {
  const zipList = execFileSync('unzip', ['-Z1', file], { encoding: 'utf8' }).split('\n');
  const read = (name) => (zipList.includes(name) ? execFileSync('unzip', ['-p', file, name], { encoding: 'utf8', maxBuffer: 1 << 26 }) : null);
  const shared = [];
  const ss = read('xl/sharedStrings.xml');
  if (ss) for (const m of ss.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(xmlText([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
  const sheets = zipList.filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
  return sheets.map((name) => {
    const xml = read(name);
    const rows = [];
    for (const r of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const row = [];
      for (const c of r[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const idx = colIndex(c[1]);
        const attrs = c[2], body = c[3] || '';
        let val = '';
        if (/t="s"/.test(attrs)) { const v = body.match(/<v>(\d+)<\/v>/); val = v ? shared[+v[1]] ?? '' : ''; }
        else if (/t="inlineStr"/.test(attrs)) val = xmlText([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''));
        else { const v = body.match(/<v>([\s\S]*?)<\/v>/); val = v ? xmlText(v[1]) : ''; }
        while (row.length < idx) row.push('');
        row[idx] = val;
      }
      if (row.some((x) => x && String(x).trim() !== '')) rows.push(row.map((x) => String(x ?? '')));
    }
    return rows;
  }).filter((rows) => rows.length);
}

/** Find the header row and the column for each field. Returns null if no header fits. */
export function findColumns(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const cells = rows[i].map((c) => String(c).trim());
    const col = {};
    for (const [field, re] of Object.entries(HEADER)) {
      const j = cells.findIndex((c) => re.test(c));
      if (j >= 0) col[field] = j;
    }
    if (col.number !== undefined && col.player !== undefined) return { header: i, col };
  }
  return null;
}

/** Turn the rows of one sheet or CSV into normalised card rows. */
export function rowsToCards(rows, format) {
  const found = findColumns(rows);
  if (!found) {
    const top = rows.slice(0, 3).map((r) => r.join(' | ')).join(' // ');
    throw new Error(`${format}: no header row with a card number and a player name. First rows: ${top.slice(0, 300)}`);
  }
  const { header, col } = found;
  const cards = [];
  const skipped = { insert: 0, badNumber: 0 };
  for (const r of rows.slice(header + 1)) {
    const get = (f) => (col[f] !== undefined ? String(r[col[f]] ?? '').trim() : '');
    const num = get('number').replace(/^#/, '');
    const player = get('player');
    if (!player) continue;
    if (!/^\d+[A-Za-z]?$/.test(num)) { skipped.badNumber++; continue; }
    const subset = get('subset');
    if (INSERT.test(subset) || INSERT.test(get('number'))) { skipped.insert++; continue; }
    const rookieText = get('rookie');
    const rookie = ROOKIE_VALUE.test(rookieText) || /rookie|\brc\b/i.test(subset) ? 1 : 0;
    cards.push({ number: num, player, team: get('team'), rookie, subset: rookie ? 'r' : 'b' });
  }
  return { cards, skipped, format };
}

/** Read the text of a PDF export, one card per line: NUMBER  PLAYER  TEAM [RC]. */
export function parsePdfText(text) {
  const cards = [];
  let skipped = 0;
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*#?(\d{1,4}[A-Za-z]?)\s{2,}(.+?)\s{2,}(.+?)(?:\s+(RC))?\s*$/);
    if (!m) continue;
    if (INSERT.test(line)) { skipped++; continue; }
    const rookie = m[4] ? 1 : 0;
    cards.push({ number: m[1], player: m[2].trim(), team: m[3].trim(), rookie, subset: rookie ? 'r' : 'b' });
  }
  return { cards, skipped: { insert: skipped, badNumber: 0 }, format: 'pdf' };
}

/** Read one file, whatever its format, into normalised card rows. */
export function readChecklistFile(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.csv') return rowsToCards(parseCsv(fs.readFileSync(file, 'utf8')), 'csv');
  if (ext === '.xlsx') {
    const sheets = parseXlsx(file);
    let lastErr = null;
    for (const rows of sheets) {
      try { return rowsToCards(rows, 'xlsx'); } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('xlsx: no sheets found');
  }
  if (ext === '.txt') return parsePdfText(fs.readFileSync(file, 'utf8'));
  if (ext === '.pdf') {
    let text;
    try { text = execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8', maxBuffer: 1 << 27 }); }
    catch { throw new Error(`pdf: pdftotext not found or failed on ${path.basename(file)}. Install poppler, or export the checklist to .txt and use that.`); }
    return parsePdfText(text);
  }
  throw new Error(`unsupported file type: ${ext}`);
}

/** Set keys this build knows about: the generated lists and the hand-written ones. */
export async function knownSetKeys() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-keys-'));
  for (const f of ['parallelData', 'parallelDataExtra']) {
    fs.writeFileSync(path.join(dir, `${f}.mjs`), fs.readFileSync(path.join(root, 'lib', `${f}.js`), 'utf8').replace(/from '\.\/([A-Za-z]+)'/g, "from './$1.mjs'"));
  }
  const { PARALLEL_DATA } = await import(pathToFileURL(path.join(dir, 'parallelData.mjs')).href);
  return new Set(Object.keys(PARALLEL_DATA));
}

const FORMATS = /\.(csv|xlsx|pdf|txt)$/i;

/** Import every file in a folder (not fixtures). Returns one result per set key. */
export async function importFolder(folder, known, { pulled = new Date().toISOString().slice(0, 10) } = {}) {
  const results = [];
  for (const name of fs.readdirSync(folder).sort()) {
    if (!FORMATS.test(name)) continue;
    const key = name.replace(FORMATS, '');
    const entry = { file: name, key, ok: false };
    if (!known.has(key)) { entry.error = `no set with key "${key}" in parallelData; rename the file to the set key`; results.push(entry); continue; }
    try {
      const { cards, skipped, format } = readChecklistFile(path.join(folder, name));
      const dupes = cards.length - new Set(cards.map((c) => c.number)).size;
      Object.assign(entry, { ok: true, format, cards: cards.length, skipped, dupes, json: {
        set: key,
        source: { file: name, format, pulled },
        cards: cards.sort((a, b) => parseInt(a.number) - parseInt(b.number) || a.number.localeCompare(b.number))
          .map((c) => [c.number, c.player, c.team, c.rookie, c.subset]),
      } });
    } catch (e) { entry.error = e.message; }
    results.push(entry);
  }
  return results;
}

async function main() {
  const check = process.argv.includes('--check');
  const known = await knownSetKeys();
  const results = await importFolder(INPUT, known);
  if (!results.length) console.log(`no checklist files in ${path.relative(root, INPUT)} (fixtures are not imported)`);
  for (const r of results) {
    if (!r.ok) { console.log(`SKIP  ${r.file}: ${r.error}`); continue; }
    const extra = r.dupes ? `, ${r.dupes} duplicate numbers` : '';
    console.log(`OK    ${r.file}: ${r.cards} base cards, ${r.skipped.insert} insert rows skipped${extra}`);
    if (!check) {
      fs.mkdirSync(OUTPUT, { recursive: true });
      fs.writeFileSync(path.join(OUTPUT, `${r.key}.json`), JSON.stringify(r.json));
    }
  }
  if (!check && results.some((r) => r.ok)) console.log(`wrote ${results.filter((r) => r.ok).length} file(s) to lib/checklists/`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
