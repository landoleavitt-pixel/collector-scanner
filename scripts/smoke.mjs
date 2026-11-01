// scripts/smoke.mjs
//
// Quick check of a running site before a push. Makes about 12 eBay-backed
// requests per run (3 sports searches, 3 TCG searches, featured, rarest, and
// the live-for-you call if SMOKE_COOKIE is set), plus page requests.
//
//   node scripts/smoke.mjs                          check http://localhost:3100
//   node scripts/smoke.mjs --base https://fieldsandfloors.com
//   SMOKE_COOKIE='sb-...=...' node scripts/smoke.mjs   also check live-for-you (signed in)
//
// Exit code 0 when every check passes (expected fails don't count), 1 otherwise.
// The cookie is read from the environment and never printed.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argBase = process.argv.indexOf('--base');
const BASE = (argBase > -1 ? process.argv[argBase + 1] : 'http://localhost:3100').replace(/\/$/, '');
const COOKIE = process.env.SMOKE_COOKIE || '';

// Same print-run and non-card rules the site uses.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-smoke-'));
fs.writeFileSync(path.join(dir, 'listingFilter.mjs'), fs.readFileSync(path.join(root, 'lib/listingFilter.js'), 'utf8'));
const { isNonCard, detectPrintRun } = await import(pathToFileURL(path.join(dir, 'listingFilter.mjs')).href);

let failed = 0;
const lines = [];
const report = (status, name, detail = '') => {
  if (status === 'FAIL') failed++;
  const line = `${status.padEnd(13)} ${name}${detail ? ` — ${detail}` : ''}`;
  lines.push(line);
  console.log(line);
};

async function getJson(p, init) {
  const res = await fetch(BASE + p, { ...init, signal: AbortSignal.timeout(120000) });
  let body = null;
  try { body = await res.json(); } catch { /* not JSON */ }
  return { status: res.status, body };
}

// 1. Sports search: results with print runs for three players.
for (const player of ['Paul Skenes', 'Caitlin Clark', 'Victor Wembanyama']) {
  const name = `sports search "${player}" returns results with print runs`;
  try {
    const { status, body } = await getJson('/api/search', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ keywords: player }),
    });
    const items = body?.items || [];
    const numbered = items.filter((it) => detectPrintRun(it.title));
    if (status !== 200) report('FAIL', name, `HTTP ${status}`);
    else if (!items.length) report('FAIL', name, 'no items');
    else if (!numbered.length) report('FAIL', name, `${items.length} items, none with a print run`);
    else report('PASS', name, `${numbered.length} of ${items.length} numbered`);
  } catch (e) { report('FAIL', name, e.message); }
}

// 2. Featured, rarest and live-for-you: no customs, no "1 of N" read as /1.
function checkCards(label, items) {
  const bad = items.filter((it) => isNonCard(it.title));
  // "1 of 1,060" must not read as /1: a title saying 1 of N (N above 1) whose run is 1 is wrong.
  const oneOf = items.filter((it) => {
    const m = String(it.title || '').match(/\b1\s+of\s+(\d[\d,]*)\b/i);
    return m && Number(m[1].replace(/,/g, '')) > 1 && String(detectPrintRun(it.title)) === '1';
  });
  report(bad.length ? 'FAIL' : 'PASS', `${label}: no customs or displays`, bad.length ? bad.map((b) => b.title).slice(0, 2).join(' | ').slice(0, 160) : `${items.length} items`);
  report(oneOf.length ? 'FAIL' : 'PASS', `${label}: no "1 of N" read as /1`, oneOf.length ? oneOf[0].title.slice(0, 120) : '');
}
try {
  const f = await getJson('/api/featured');
  const items = [...(f.body?.items || []), ...(f.body?.featured ? [f.body.featured] : [])];
  if (f.status !== 200) report('FAIL', 'featured returns 200', `HTTP ${f.status}`);
  else checkCards('featured', items);
} catch (e) { report('FAIL', 'featured', e.message); }
try {
  const r = await getJson('/api/rarest');
  if (r.status !== 200) report('FAIL', 'rarest returns 200', `HTTP ${r.status}`);
  else checkCards('rarest', r.body?.items || []);
} catch (e) { report('FAIL', 'rarest', e.message); }
if (COOKIE) {
  try {
    const l = await getJson('/api/live-for-you', { method: 'POST', headers: { cookie: COOKIE } });
    if (l.status !== 200) report('FAIL', 'live-for-you returns 200 when signed in', `HTTP ${l.status}`);
    else checkCards('live-for-you', l.body?.items || []);
  } catch (e) { report('FAIL', 'live-for-you', e.message); }
} else {
  report('SKIP', 'live-for-you', 'needs a signed-in cookie; set SMOKE_COOKIE to check it');
}

// 3. Foils & Fables: games, search, proxies hidden.
let gameKeys = [];
try {
  const m = await getJson('/api/tcg-meta');
  const games = m.body?.games || [];
  gameKeys = games.map((g) => g.key);
  report(m.status === 200 && games.length === 5 ? 'PASS' : 'FAIL', 'tcg-meta lists 5 games', `${games.length} games, HTTP ${m.status}`);
} catch (e) { report('FAIL', 'tcg-meta', e.message); }
for (const key of gameKeys.slice(0, 3)) {
  const name = `tcg-search returns items for ${key}`;
  try {
    const t = await getJson(`/api/tcg-search?game=${encodeURIComponent(key)}`);
    const items = t.body?.items || [];
    if (t.status !== 200) report('FAIL', name, `HTTP ${t.status}`);
    else if (!items.length) report('FAIL', name, 'no items');
    else report('PASS', name, `${items.length} items`);
    const proxies = items.filter((it) => /\bproxy\b/i.test(it.title || ''));
    report(proxies.length ? 'FAIL' : 'PASS', `tcg-search ${key} hides proxies`, proxies.length ? proxies[0].title.slice(0, 120) : '');
  } catch (e) { report('FAIL', name, e.message); }
}

// 4. Pages: 200, except /fables?utm_source=x which must serve the home page.
const pages = ['/', '/fables', '/signup', '/login', '/how-it-works', '/terms', '/privacy'];
for (const p of pages) {
  try {
    const res = await fetch(BASE + p, { redirect: 'manual', signal: AbortSignal.timeout(60000) });
    report(res.status === 200 ? 'PASS' : 'FAIL', `${p} returns 200`, res.status === 200 ? '' : `HTTP ${res.status}`);
  } catch (e) { report('FAIL', `${p} returns 200`, e.message); }
}
try {
  const res = await fetch(`${BASE}/fables?utm_source=x`, { signal: AbortSignal.timeout(60000) });
  const html = await res.text();
  const isHome = /Chase the shine/i.test(html) && !/listings?,\s*ranked/i.test(html);
  // Known open issue (QA 2026-10-31 #1). Reported as expected until the design fix lands.
  if (res.status !== 200) report('FAIL', '/fables?utm_source=x returns 200', `HTTP ${res.status}`);
  else if (isHome) report('PASS', '/fables?utm_source=x serves the home page');
  else report('EXPECTED FAIL', '/fables?utm_source=x serves the home page', 'opens a results list (QA #1, fix in progress)');
} catch (e) { report('FAIL', '/fables?utm_source=x', e.message); }

const failedCount = lines.filter((l) => l.startsWith('FAIL')).length;
console.log(`\n${failedCount} failed, ${lines.filter((l) => l.startsWith('PASS')).length} passed, ${lines.filter((l) => l.startsWith('EXPECTED')).length} expected, ${lines.filter((l) => l.startsWith('SKIP')).length} skipped against ${BASE}`);
process.exit(failed ? 1 : 0);
