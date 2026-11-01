// scripts/email-escaping.test.mjs
//
// Every email we send must show seller and user text as text, never as
// HTML. Renders each email with a listing title, search name and seller
// link containing <script>, quotes and &, and checks none of it survives raw.
// Sends nothing.
//
//   npx tsx --test scripts/email-escaping.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';

// The poller's emails.ts reads Deno.env at load; give it a stand-in.
globalThis.Deno ??= { env: { get: () => undefined } };

const { buildEmailHtml, buildBidReminderEmail } = await import('../supabase/functions/poller/emails.ts');
const { buildSportsConfirmation } = await import('../lib/huntConfirmedEmail.js');
const { buildFablesConfirmation } = await import('../lib/fablesEmail.js');

const EVIL = `Charizard <script>alert(1)</script> & "Gold" <img src=x onerror=alert(2)>`;
const EVIL_LINK = 'javascript:alert(3)';

function assertSafe(html, label) {
  assert.ok(!/<script/i.test(html), `${label}: raw <script> tag`);
  assert.ok(!/<img src=x/i.test(html), `${label}: raw injected <img>`);
  assert.ok(!/javascript:/i.test(html), `${label}: javascript: link`);
  assert.ok(html.includes('&lt;script&gt;'), `${label}: title not shown as text`);
  assert.ok(html.includes('&amp;'), `${label}: & not escaped`);
}

const search = (side) => ({ id: 's', user_id: 'u', name: EVIL, query: EVIL, filters: {}, notify_enabled: true, side });
const listing = (side) => ({
  id: 'v1|1|0', title: EVIL, price: 10, currency: 'USD', image: null, url: EVIL_LINK,
  side, rarity: side === 'fables' ? EVIL : null, tier: side === 'fables' ? 'grail' : null, gradeLabel: side === 'fables' ? EVIL : null,
});

for (const side of ['sports', 'fables']) {
  test(`${side} alert digest escapes titles, search names and chips`, () => {
    const html = buildEmailHtml({ userId: 'u', email: 'e', side, bySearch: new Map([[search(side), [listing(side)]]]) });
    assertSafe(html, `${side} digest`);
  });

  test(`${side} bid reminder escapes the title and drops non-web links`, () => {
    const { html } = buildBidReminderEmail({ listing_id: '1', title: EVIL, listing_url: EVIL_LINK, side }, 10, 30 * 60000);
    assertSafe(html, `${side} bid reminder`);
  });
}

test('sports hunt confirmed escapes the search name and filter labels', () => {
  const { html } = buildSportsConfirmation({ name: EVIL, notify_enabled: true }, { customPrintRuns: [EVIL] }, 'https://fieldsandfloors.com');
  assertSafe(html, 'sports confirmation');
});

test('Foils & Fables hunt confirmed escapes the search name', () => {
  const { html } = buildFablesConfirmation({ name: EVIL, notify_enabled: true }, { game: EVIL, rarity: [EVIL], grader: EVIL }, 'https://fieldsandfloors.com');
  assertSafe(html, 'fables confirmation');
});
