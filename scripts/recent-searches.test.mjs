// scripts/recent-searches.test.mjs
//
// "Pick up where you left off" chips (lib/recentSearches.js).
//
//   npx tsx --test scripts/recent-searches.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as names from '../lib/playerSuggest.js';
import { tidyRecentSearches } from '../lib/recentSearches.js';

const tidy = (list) => tidyRecentSearches(list, names);

test('team names are never spell-checked (QA #2: Pittsburgh Pirates)', () => {
  assert.deepEqual(tidy(['Pittsburgh Pirates']), ['Pittsburgh Pirates']);
  assert.deepEqual(tidy(['pittsburgh pirates']), ['Pittsburgh Pirates']);
  assert.deepEqual(tidy(['Texas Rangers', 'Duke Blue Devils', 'Lakers']), ['Texas Rangers', 'Duke Blue Devils', 'Los Angeles Lakers']);
});

test('a team searched two ways shares one chip', () => {
  assert.deepEqual(tidy(['Pittsburgh Pirates', 'pittsburgh pirates', 'Mavs', 'Dallas Mavericks']), ['Pittsburgh Pirates', 'Dallas Mavericks']);
});

test('repairs the stored wrong spelling the old version made', () => {
  assert.deepEqual(tidy(['Pittsburgh Perales', 'Pittsburgh Pirates', 'Paul Skenes']), ['Pittsburgh Pirates', 'Paul Skenes']);
});

test('a real search that merely looks similar is kept', () => {
  // No Pirates entry in the list, so nothing marks this as the old bug.
  assert.deepEqual(tidy(['Pittsburgh Perales']).length, 1);
});

test('player typos merge into the correct spelling when both are there', () => {
  assert.deepEqual(tidy(['paul skeenes', 'Paul Skenes', 'connor mcdavid prizm']), ['Paul Skenes', 'Connor McDavid Prizm']);
});

test('a typo on its own is shown as searched, not rewritten', () => {
  assert.deepEqual(tidy(['wembenyama']), ['Wembenyama']);
  assert.deepEqual(tidy(['Caitlin Clark psa 10']), ['Caitlin Clark PSA 10']);
});

test('caps at five and skips junk', () => {
  assert.deepEqual(tidy(['a1', '', null, 'b2', 'c3', 'd4', 'e5', 'f6']).length, 5);
});
