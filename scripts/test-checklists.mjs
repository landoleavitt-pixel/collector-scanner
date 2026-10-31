// scripts/test-checklists.mjs
//
// Tests the checklist importer and the card-colour join against the FAKE
// fixtures in data/checklists/fixtures/. Nothing here writes to lib/checklists.
//
//   node scripts/test-checklists.mjs

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { parseCsv, parsePdfText, findColumns, readChecklistFile, importFolder, knownSetKeys, rowsToCards } from './import-checklists.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(root, 'data/checklists/fixtures');
let fail = 0, pass = 0;
const check = (ok, msg) => { if (ok) pass++; else { fail++; console.log('FAIL', msg); } };

// CSV: quoted commas, RC column, Insert Set rows skipped.
const csv = readChecklistFile(path.join(FIX, '2025-fake-csv-topps.csv'));
check(csv.format === 'csv', 'csv format');
check(csv.cards.length === 4, `csv: 4 base/rookie cards, got ${csv.cards.length}`);
check(csv.skipped.insert === 1, 'csv: the Insert Set row is skipped');
check(csv.cards[2].player === 'FAKE PLAYER, THREE', 'csv: quoted comma kept in the name');
check(csv.cards[1].rookie === 1 && csv.cards[1].subset === 'r', 'csv: RC Y is a rookie row');
check(csv.cards[0].rookie === 0 && csv.cards[0].subset === 'b', 'csv: RC N is a base row');

// xlsx: header on row 1, Insert row skipped, Rookie column.
const xlsx = readChecklistFile(path.join(FIX, 'fake-panini.xlsx'));
check(xlsx.format === 'xlsx', 'xlsx format');
check(xlsx.cards.length === 2, `xlsx: 2 cards, got ${xlsx.cards.length}`);
check(xlsx.skipped.insert === 1, 'xlsx: the Insert row is skipped');
check(xlsx.cards[1].number === '102' && xlsx.cards[1].rookie === 1, 'xlsx: numeric and Yes cells read');

// PDF text: NUMBER  PLAYER  TEAM [RC]; the RC marker sets rookie.
const pdf = readChecklistFile(path.join(FIX, 'fake-upper-deck.txt'));
check(pdf.format === 'pdf' && pdf.cards.length === 4, `pdf: 4 cards, got ${pdf.cards.length}`);
check(pdf.cards.filter((c) => c.rookie).map((c) => c.number).join() === '2,4', 'pdf: RC lines are rookies');
check(pdf.cards[0].team === 'FAKE TEAM I', 'pdf: a team with no RC marker is read whole');

// Header detection: no number or player column is a clear error.
check(findColumns([['x', 'y'], ['1', '2']]) === null, 'no header: null');
let threw = '';
try { rowsToCards([['Brand', 'Notes'], ['Topps', 'x']], 'csv'); } catch (e) { threw = e.message; }
check(/no header row/.test(threw), 'a file without a card number and player column is a clear error');

// Fixtures are never imported or written out, and only real set keys are accepted.
const known = await knownSetKeys();
const results = await importFolder(FIX, known);
check(results.every((r) => !r.ok && /no set with key/.test(r.error)), 'fixture file names are not set keys, so they are reported and not imported');
check(known.has('2025-topps-chrome-football'), 'the real set key is known');

// Parser helper: quoted fields and CRLF.
const rows = parseCsv('a,"b, c",d\r\n1,"x ""y""",3\r\n');
check(rows[0][1] === 'b, c' && rows[1][1] === 'x "y"', 'parseCsv: quotes and CRLF');
check(parsePdfText('   12   FAKE PLAYER   FAKE TEAM   RC\n').cards[0].rookie === 1, 'parsePdfText: RC on its own line');

// Join: rookie-only colours go on rookie cards only; box-only colours keep their box.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-cl-'));
for (const f of ['parallelData', 'parallelDataExtra']) {
  fs.writeFileSync(path.join(dir, `${f}.mjs`), fs.readFileSync(path.join(root, 'lib', `${f}.js`), 'utf8').replace(/from '\.\/([A-Za-z]+)'/g, "from './$1.mjs'"));
}
fs.writeFileSync(path.join(dir, 'checklistColours.mjs'), fs.readFileSync(path.join(root, 'lib/checklistColours.js'), 'utf8'));
const { PARALLEL_DATA } = await import(pathToFileURL(path.join(dir, 'parallelData.mjs')).href);
const { coloursForCard: join } = await import(pathToFileURL(path.join(dir, 'checklistColours.mjs')).href);
const set = PARALLEL_DATA['2025-topps-chrome-football'];
const names = (list) => list.map((p) => p.name);
const vet = join(set, { rookie: 0 }), rook = join(set, { rookie: 1 });
check(!names(vet.colours).includes('Football Leather Blue Refractor'), 'veteran card: no rookie-only Football Leather Blue');
check(names(rook.colours).includes('Football Leather Blue Refractor'), 'rookie card: has Football Leather Blue');
check(names(rook.colours).includes('Teal Wave Refractor') && !names(vet.colours).includes('Teal Wave Refractor'), 'Teal Wave is rookie-only');
check(names(vet.colours).includes('Gold Refractor') && names(rook.colours).includes('Gold Refractor'), 'Gold Refractor is on every card');
const pg = [...set.parallels.numbered].find((p) => p.name === 'Purple Geometric Refractor');
check(pg && pg.boxOnly === 'Breaker' && names(rook.colours).includes(pg.name), 'Purple Geometric: rookie card, Breaker-only box flag kept');
check(!names(vet.colours).some((n) => /Geometric/.test(n) && n.startsWith('Green')), 'veteran card: no rookie-only Green Geometric');
check(vet.variations.every((p) => p.variation === true) && rook.variations.length === vet.variations.length, 'variation colours are listed apart on both cards');

console.log(fail ? `${fail} check(s) failed, ${pass} passed` : `checklist checks pass (${pass})`);
process.exit(fail ? 1 : 0);
