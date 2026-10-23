/**
 * GET /api/rarest
 *
 * Real, live listings for the home page's "One search. Rarest first." strip:
 * one player's autographs numbered 50 or less, sorted rarest first.
 *
 * Runs our own /api/search logic (same lot, name and print-run filters), so
 * the strip shows exactly what a visitor would get from that search.
 *
 * Caching: one eBay search per hour at most. The CDN caches the response for
 * an hour (s-maxage), and each server instance also keeps the last result in
 * memory for the same window. The player rotates once a day.
 *
 * Returns { player, items: [] } when there aren't enough good cards; the
 * strip hides itself rather than showing placeholders.
 */
import { NextResponse } from 'next/server';
import { POST as search } from '../search/route';

const PLAYERS = ['Paul Skenes', 'Caitlin Clark', 'Shohei Ohtani', 'Victor Wembanyama'];
const RUNS = ['/1', '/5', '/10', '/15', '/25', '/49', '/50'];
const MIN_CARDS = 6;
const MAX_CARDS = 8;
const MAX_PER_RUN = 2; // spread the strip across print runs
const TTL_MS = 60 * 60 * 1000;

let cache = null; // { at, body }

// The print run in a title, limited to the runs we searched for.
function runOf(title) {
  const t = String(title || '');
  const allowed = new Set(RUNS.map((r) => Number(r.slice(1))));
  const found = [];
  for (const m of t.matchAll(/(?:^|[^\d])\/\s*(\d{1,3})\b/g)) found.push(Number(m[1]));
  for (const m of t.matchAll(/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/g)) {
    if (Number(m[1]) <= Number(m[2])) found.push(Number(m[2]));
  }
  const ok = found.filter((n) => allowed.has(n));
  return ok.length ? Math.min(...ok) : null;
}

async function build() {
  const day = Math.floor(Date.now() / 86_400_000);
  const player = PLAYERS[day % PLAYERS.length];

  const req = new Request('http://internal/api/search', {
    method: 'POST',
    // Own rate-limit bucket, separate from visitors.
    headers: { 'Content-Type': 'application/json', 'x-real-ip': 'rarest-strip' },
    body: JSON.stringify({
      keywords: player,
      autoCards: true,
      numberedCards: true,
      selectedPrintRuns: RUNS,
      rookieCards: false,
      listingType: 'any',
      condition: 'any',
      priceMin: 0,
      priceMax: null,
      sortBy: 'printrun-rarest',
      brands: [],
      brandLines: [],
    }),
  });
  const res = await search(req);
  if (!res.ok) throw new Error(`search ${res.status}`);
  const data = await res.json();

  const ranked = (data.items || [])
    .filter((it) => it.image && it.price != null)
    .map((it) => ({ it, run: runOf(it.title) }))
    .filter((x) => x.run != null)
    // Rarest first; within a run, the higher-priced card (usually the cleaner listing).
    .sort((a, b) => a.run - b.run || b.it.price - a.it.price);

  const perRun = new Map();
  const picked = [];
  for (const x of ranked) {
    const n = perRun.get(x.run) || 0;
    if (n >= MAX_PER_RUN) continue;
    perRun.set(x.run, n + 1);
    picked.push(x);
    if (picked.length === MAX_CARDS) break;
  }

  const items = picked.length >= MIN_CARDS
    ? picked.map(({ it, run }) => ({
        id: it.id,
        title: it.title,
        price: it.price,
        currency: it.currency || 'USD',
        image: it.image,
        url: it.url,
        isAuction: !!it.isAuction,
        endTime: it.endTime || null,
        printRun: run,
      }))
    : [];

  return { player, items };
}

export async function GET() {
  try {
    if (!cache || Date.now() - cache.at > TTL_MS) {
      cache = { at: Date.now(), body: await build() };
    }
    return NextResponse.json(cache.body, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('rarest strip error:', err);
    return NextResponse.json({ player: null, items: [] }, { status: 200 });
  }
}
