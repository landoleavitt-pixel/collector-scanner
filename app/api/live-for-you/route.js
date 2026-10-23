/**
 * POST /api/live-for-you   { recent: ["Paul Skenes", ...] }
 *
 * Live cards for the signed-in home's "Live right now" row, drawn from the
 * member's own hunts: their newest saved searches first (with each search's
 * own filters), then their recently searched players. At most 2 searches,
 * up to 5 cards, rarest first and spread across print runs.
 *
 * Quota: every search runs through our /api/search logic and is cached for
 * an hour per (query + filters), shared across all members, so a popular
 * hunt costs at most one eBay search an hour no matter how many people open
 * their home page. Signed-in members only.
 *
 * Returns { items: [] } when nothing usable comes back; the page then falls
 * back to the featured Grail cards.
 */
import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabaseServer';
import { POST as search } from '../search/route';
import { printRunOf } from '../../../lib/printRun';

const MAX_SEARCHES = 2;
const MAX_CARDS = 5;
const MAX_PER_RUN = 2;
const TTL_MS = 60 * 60 * 1000;
const MAX_CACHE = 300;

// Same defaults the home search uses for a plain player search.
const DEFAULT_RUNS = ['/1', '/5', '/10', '/15', '/25', '/49', '/50', '/75', '/99', '/149', '/150', '/199', '/249', '/299', '/499', '/999'];
const DEFAULT_BODY = {
  autoCards: false,
  numberedCards: true,
  selectedPrintRuns: DEFAULT_RUNS,
  rookieCards: false,
  listingType: 'any',
  condition: 'any',
  priceMin: 0,
  priceMax: null,
  sortBy: 'printrun-rarest',
  brands: [],
  brandLines: [],
  teams: [],
};

const cache = new Map(); // key -> { at, items }

// A saved search's filters, turned into the /api/search request body the
// results page would send. Old saved searches without numberedCards meant
// "numbered off".
function bodyFromSaved(query, f = {}) {
  return {
    ...DEFAULT_BODY,
    keywords: query,
    autoCards: !!f.autoCards,
    numberedCards: f.numberedCards ?? false,
    selectedPrintRuns: [...(f.selectedPrintRuns || []), ...(f.customPrintRuns || [])],
    rookieCards: !!f.rookieCards,
    listingType: f.listingType || 'any',
    condition: f.condition || 'any',
    priceMin: f.priceMin || 0,
    priceMax: f.priceMax == null || f.priceMax === 5000 ? null : f.priceMax,
    brands: f.brands || [],
    brandLines: f.brandLines || [],
    teams: f.teams || [],
  };
}

async function runSearch(body) {
  const key = JSON.stringify(body);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.items;

  const res = await search(new Request('http://internal/api/search', {
    method: 'POST',
    // Own rate-limit bucket, separate from visitors' searches.
    headers: { 'Content-Type': 'application/json', 'x-real-ip': 'live-for-you' },
    body: key,
  }));
  if (!res.ok) throw new Error(`search ${res.status}`);
  const items = ((await res.json()).items || []).filter((it) => it.image && it.price != null);

  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), items });
  return items;
}

export async function POST(request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let recent = [];
  try {
    const body = await request.json();
    recent = Array.isArray(body?.recent) ? body.recent : [];
  } catch { /* no recents */ }
  recent = recent
    .filter((r) => typeof r === 'string')
    .map((r) => r.trim().slice(0, 60))
    .filter(Boolean);

  // Saved searches first (newest), then recent players not already covered.
  const { data: saved } = await supabase
    .from('saved_searches')
    .select('name, query, filters')
    .order('created_at', { ascending: false })
    .limit(MAX_SEARCHES);

  const plans = [];
  const seen = new Set();
  for (const s of saved || []) {
    if (plans.length >= MAX_SEARCHES || !s.query?.trim()) continue;
    seen.add(s.query.trim().toLowerCase());
    plans.push({ label: s.name || s.query, body: bodyFromSaved(s.query.trim(), s.filters || {}) });
  }
  for (const r of recent) {
    if (plans.length >= MAX_SEARCHES) break;
    if (seen.has(r.toLowerCase())) continue;
    seen.add(r.toLowerCase());
    plans.push({ label: r, body: { ...DEFAULT_BODY, keywords: r } });
  }
  if (plans.length === 0) return NextResponse.json({ items: [] });

  try {
    const results = await Promise.all(plans.map(async (p) => {
      try {
        return (await runSearch(p.body)).map((it) => ({ it, from: p.label, run: printRunOf(it.title) }));
      } catch (err) {
        console.error('live-for-you search failed:', err?.message || err);
        return [];
      }
    }));

    // Rarest first; unnumbered cards after numbered ones. Spread across print
    // runs, and alternate between hunts so one search can't fill the row.
    const ranked = results.map((list) =>
      list.sort((a, b) => (a.run ?? 1e9) - (b.run ?? 1e9) || b.it.price - a.it.price));
    const picked = [];
    const perRun = new Map();
    const ids = new Set();
    for (let i = 0; picked.length < MAX_CARDS && ranked.some((l) => i < l.length); i++) {
      for (const list of ranked) {
        const x = list[i];
        if (!x || picked.length >= MAX_CARDS || ids.has(x.it.id)) continue;
        const n = perRun.get(x.run) || 0;
        if (x.run != null && n >= MAX_PER_RUN) continue;
        perRun.set(x.run, n + 1);
        ids.add(x.it.id);
        picked.push(x);
      }
    }
    picked.sort((a, b) => (a.run ?? 1e9) - (b.run ?? 1e9));

    const items = picked.map(({ it, from, run }) => ({
      id: it.id,
      title: it.title,
      price: it.price,
      currency: it.currency || 'USD',
      image: it.image,
      url: it.url,
      isAuction: !!it.isAuction,
      endTime: it.endTime || null,
      printRun: run,
      from,
    }));
    return NextResponse.json({ items });
  } catch (err) {
    console.error('live-for-you error:', err?.message || err);
    return NextResponse.json({ items: [] });
  }
}
