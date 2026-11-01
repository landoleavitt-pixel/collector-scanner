// scripts/checklist-api.test.mjs
//
// The sports "every card of this player" checklist: lib/checklist.js and
// GET /api/checklist. Uses the FAKE fixtures in data/checklists/fixtures/ and
// made-up names; never writes to lib/checklists/.
//
//   npx tsx --test scripts/checklist-api.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { readChecklistFile } from './import-checklists.mjs';
import { findPlayerCards, loadChecklists, nameKey, queryKey } from '../lib/checklist.js';
import { PARALLEL_DATA } from '../lib/parallelData.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(root, 'data/checklists/fixtures');
const REAL_SET = '2025-topps-chrome-football'; // has rookie-only and box-only colours

// The importer's output shape, from a fixture file, filed under a set key.
function checklistFrom(file, set) {
  const { cards } = readChecklistFile(path.join(FIX, file));
  return { set, source: { file, format: 'test', pulled: '2026-10-31' }, cards: cards.map((c) => [c.number, c.player, c.team, c.rookie, c.subset]) };
}

// A small made-up set covering every flag coloursForCard reads.
const FAKE_SET = {
  label: 'Fake Flags Set', sport: 'football', year: 2099,
  parallels: {
    numbered: [
      { key: 'gold', name: 'Gold', run: 50 },
      { key: 'red', name: 'Red', run: 5, boxOnly: 'Hobby', exclusive: 'Hobby' },
      { key: 'rookie-blue', name: 'Rookie Blue', run: 150, cards: 'rookies' },
      { key: 'vet-green', name: 'Veteran Green', run: 99, cards: 'veterans' },
      { key: 'super', name: 'Superfractor', run: 1 },
      { key: 'image-var', name: 'Image Variation', run: 25, variation: true },
    ],
    unnumbered: [{ key: 'refractor', name: 'Refractor', run: null }],
  },
};
const SETS = { ...PARALLEL_DATA, 'fake-flags': FAKE_SET };

test('fixture rows are found and grouped by set, then card number', () => {
  const lists = [checklistFrom('2025-fake-csv-topps.csv', REAL_SET), checklistFrom('2025-fake-csv-topps.csv', 'fake-flags')];
  const r = findPlayerCards('fake player two', { checklists: lists, sets: SETS });
  assert.equal(r.sets.length, 2);
  assert.deepEqual(r.sets.map((s) => s.set), ['fake-flags', REAL_SET]); // newest year first
  for (const s of r.sets) {
    assert.ok(s.cards.every((c) => /fake player two/i.test(c.player)));
    const nums = s.cards.map((c) => parseInt(c.number, 10));
    assert.deepEqual(nums, [...nums].sort((a, b) => a - b));
  }
  assert.equal(r.sets[1].label, PARALLEL_DATA[REAL_SET].label);
  assert.equal(r.sets[1].checklistSource.file, '2025-fake-csv-topps.csv');
});

test('all three fixture formats (CSV, Excel, PDF text) are searchable', () => {
  const lists = [
    checklistFrom('2025-fake-csv-topps.csv', REAL_SET),
    checklistFrom('fake-panini.xlsx', 'fake-flags'),
    checklistFrom('fake-upper-deck.txt', 'fake-flags'),
  ];
  const find = (q) => findPlayerCards(q, { checklists: lists, sets: SETS }).sets.flatMap((s) => s.cards.map((c) => `${c.number}${c.rookie ? ' RC' : ''}`));
  assert.deepEqual(find('FAKE PLAYER, THREE'), ['3']);
  assert.deepEqual(find('fake player seven'), ['102 RC']);
  assert.deepEqual(find('Fake Player Ten'), ['2 RC']);
});

test('rookie-only colours appear on rookies only, veteran-only on veterans only', () => {
  const list = { set: 'fake-flags', cards: [['1', 'FAKE VET', 'T', 0, 'b'], ['2', 'FAKE ROOK', 'T', 1, 'r']] };
  const keys = (who) => findPlayerCards(who, { checklists: [list], sets: SETS }).sets[0].cards[0].versions.map((v) => v.key);
  assert.ok(keys('fake vet').includes('vet-green') && !keys('fake vet').includes('rookie-blue'));
  assert.ok(keys('fake rook').includes('rookie-blue') && !keys('fake rook').includes('vet-green'));
});

test('real set: rookie-only colours stay off veteran cards', () => {
  const rookieOnly = [...PARALLEL_DATA[REAL_SET].parallels.numbered, ...PARALLEL_DATA[REAL_SET].parallels.unnumbered].filter((p) => p.cards === 'rookies').map((p) => p.key);
  assert.ok(rookieOnly.length > 0);
  const lists = [checklistFrom('2025-fake-csv-topps.csv', REAL_SET)];
  const vet = findPlayerCards('fake player one', { checklists: lists, sets: SETS }).sets[0].cards[0];
  const rook = findPlayerCards('fake player two', { checklists: lists, sets: SETS }).sets[0].cards[0];
  assert.equal(vet.rookie, false);
  assert.equal(rook.rookie, true);
  assert.ok(!vet.versions.some((v) => rookieOnly.includes(v.key)));
  assert.ok(rook.versions.some((v) => rookieOnly.includes(v.key)));
});

test('versions carry print run and tier, rarest first, base last; variations apart; box-only kept and marked', () => {
  const list = { set: 'fake-flags', cards: [['7', 'FAKE VET', 'T', 0, 'b']] };
  const card = findPlayerCards('fake vet', { checklists: [list], sets: SETS }).sets[0].cards[0];
  assert.deepEqual(card.versions.map((v) => v.key), ['super', 'red', 'gold', 'vet-green', 'refractor', 'base']);
  const byKey = Object.fromEntries(card.versions.map((v) => [v.key, v]));
  assert.equal(byKey.super.tier, '1of1');
  assert.equal(byKey.red.tier, 'grail');
  assert.equal(byKey.gold.tier, 'ultra');
  assert.equal(byKey['vet-green'].tier, 'ultra');
  assert.equal(byKey.refractor.run, null);
  assert.equal(byKey.refractor.tier, null);
  assert.equal(byKey.red.boxOnly, 'Hobby');
  assert.equal(byKey.gold.boxOnly, null);
  assert.deepEqual(card.variations.map((v) => v.key), ['image-var']);
});

test('names match like the search box: accents, case, Jr., nicknames, dual cards', () => {
  const list = { set: 'fake-flags', cards: [
    ['10', 'JOSÉ FAKEÑO JR.', 'T', 0, 'b'],
    ['11', 'VICTOR WEMBANYAMA', 'T', 1, 'r'],
    ['12', 'FAKE ALPHA / JOSE FAKENO', 'T', 0, 'b'],
    ['13', 'FAKE PLAYER ONEILL', 'T', 0, 'b'],
  ] };
  const numbers = (q) => (findPlayerCards(q, { checklists: [list], sets: SETS }).sets[0]?.cards || []).map((c) => c.number);
  assert.deepEqual(numbers('jose fakeno'), ['10', '12']);
  assert.deepEqual(numbers('José Fakeño Jr'), ['10', '12']);
  assert.deepEqual(numbers('Wemby'), ['11']);
  assert.deepEqual(numbers('fake player one'), []); // whole names only, no partial matches
  assert.equal(nameKey('Ken Griffey Jr.'), 'ken griffey');
  assert.equal(queryKey('wemby'), 'victor wembanyama');
});

test('unknown sets, unknown players and empty input return nothing', () => {
  const list = { set: 'no-such-set', cards: [['1', 'FAKE VET', 'T', 0, 'b']] };
  assert.deepEqual(findPlayerCards('fake vet', { checklists: [list], sets: SETS }).sets, []);
  assert.deepEqual(findPlayerCards('nobody', { checklists: [], sets: SETS }).sets, []);
  assert.deepEqual(findPlayerCards('   ', { checklists: [], sets: SETS }).sets, []);
});

test('loadChecklists: missing folder is empty; broken files are skipped', () => {
  assert.deepEqual(loadChecklists(path.join(os.tmpdir(), 'ff-no-such-dir-' + Date.now())), []);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-checklists-'));
  fs.writeFileSync(path.join(dir, 'good.json'), JSON.stringify(checklistFrom('fake-upper-deck.txt', REAL_SET)));
  fs.writeFileSync(path.join(dir, 'broken.json'), '{ not json');
  const lists = loadChecklists(dir);
  assert.equal(lists.length, 1);
  assert.equal(lists[0].set, REAL_SET);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('GET /api/checklist: validates input and returns JSON', async () => {
  const { GET } = await import('../app/api/checklist/route.js');
  const call = (q) => GET(new Request(`http://localhost/api/checklist${q}`, { headers: { 'x-forwarded-for': `test-${Math.random()}` } }));
  assert.equal((await call('')).status, 400);
  assert.equal((await call('?player=a')).status, 400);
  const ok = await call('?player=Paul%20Skenes');
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.player, 'Paul Skenes');
  assert.ok(Array.isArray(body.sets));
});
