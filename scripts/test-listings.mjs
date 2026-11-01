// scripts/test-listings.mjs
//
// Checks the shared listing rules in lib/listingFilter.js and lib/printRun.js:
// non-cards (customs, displays, frames, reprints, proofs, RP), print runs
// ("1 of 1,060" is 1,060), and autograph text ("Unsigned" is not an auto).
//
//   node scripts/test-listings.mjs

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-listings-'));
fs.writeFileSync(path.join(dir, 'listingFilter.mjs'), fs.readFileSync(path.join(root, 'lib/listingFilter.js'), 'utf8'));
fs.writeFileSync(path.join(dir, 'printRun.mjs'), fs.readFileSync(path.join(root, 'lib/printRun.js'), 'utf8'));
const { isNonCard, hasAutoText, detectPrintRun } = await import(pathToFileURL(path.join(dir, 'listingFilter.mjs')).href);
const { printRunOf } = await import(pathToFileURL(path.join(dir, 'printRun.mjs')).href);

let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) pass++; else { fail++; console.log('FAIL', msg); } };

// Non-cards: each must be dropped.
const nonCards = [
  'Custom 1/1 Shohei Ohtani Jersey /25 Auto And Gem 10 Patch Card Raree Dispay',
  '2023 Leaf Metal Pre-Production Proof Unsigned 1/1',
  '2025 Topps Chrome Paul Skenes Built By Patch Lab 1/1 Custom',
  '2025 Topps Chrome Paul Skenes Reprint RP /25',
  '2025 Topps Chrome Paul Skenes Framed Display Case Auto /25',
  '2024 Bowman Chrome Prospect Auto Custom Art Card Shadowbox /25',
  'Shohei Ohtani Acrylic Display Plaque 1/1 Auto',
  'Mock-Up Proof Bobby Witt Jr Rookie Auto /99',
];
for (const t of nonCards) check(isNonCard(t), `non-card not dropped: ${t}`);

// Real cards: must be kept.
const cards = [
  '2025 Topps Chrome Paul Skenes Rookie Auto /25 Pirates',
  '2024 Bowman Chrome Prospect Auto Gold /50 Dylan Crews',
  '2025 Topps Chrome Jackson Holliday Red Refractor /5 PSA 10',
  '2026 Bowman Football 1st Bowman Green Auto /99 Micah Ford Stanford',
];
for (const t of cards) check(!isNonCard(t), `real card dropped: ${t}`);

// Print runs: "1 of N" reads the whole N.
check(Number(detectPrintRun('Paul Skenes (1 of 1,060 made) ~ 2023 Choice Bradenton Marauders')) === 1060, '1 of 1,060 should be 1060');
check(Number(detectPrintRun('2023 Leaf Metal Proof 1/1 Unsigned')) === 1, '1/1 stays 1');
check(Number(detectPrintRun('Paul Skenes 1 of 25 Auto')) === 25, '1 of 25 should be 25');
check(Number(detectPrintRun('2024 Topps Chrome Holliday Purple Refractor /299')) === 299, 'plain /299 unchanged');
check(printRunOf('Paul Skenes (1 of 1,060 made) Choice Bradenton Marauders') === 1060, 'rarest route reads 1 of 1,060 as 1060');
check(printRunOf('Paul Skenes Rookie Auto /25') === 25, 'rarest route /25 unchanged');

// Autographs: "Unsigned" and "non-auto" aren't autographs.
check(!hasAutoText('2023 Leaf Metal Pre-Production Proof Unsigned 1/1'), 'Unsigned is not an auto');
check(!hasAutoText('2024 Topps Chrome Non-Auto Refractor /99'), 'Non-Auto is not an auto');
check(hasAutoText('2025 Topps Chrome Paul Skenes Rookie Auto /25'), 'Auto is an auto');
check(hasAutoText('2025 Topps Chrome Autographed Refractor'), 'Autographed is an auto');
check(hasAutoText('2024 Topps Chrome Signed Refractor /99'), 'Signed is an auto');

console.log(fail ? `${fail} listing check(s) failed, ${pass} passed` : `listing checks pass (${pass})`);
process.exit(fail ? 1 : 0);
