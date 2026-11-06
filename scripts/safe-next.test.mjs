// scripts/safe-next.test.mjs
//
// The return path after sign-in stays on our own site (lib/safeNext.js).
//
//   npx tsx --test scripts/safe-next.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNext } from '../lib/safeNext.js';

test('own paths are kept, with their query', () => {
  assert.equal(safeNext('/share/card?card=123'), '/share/card?card=123');
  assert.equal(safeNext('/fables/checklist?name=Charizard'), '/fables/checklist?name=Charizard');
});

test('nothing given goes home', () => {
  assert.equal(safeNext(null), '/');
  assert.equal(safeNext(undefined), '/');
  assert.equal(safeNext(''), '/');
});

test('other sites go home', () => {
  for (const bad of ['https://evil.com', '//evil.com', '@evil.com', '/\\evil.com', 'evil.com']) {
    assert.equal(safeNext(bad), '/', bad);
  }
});
