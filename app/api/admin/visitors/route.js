import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabaseServer';
import { isAdminUser } from '../../../../lib/admin';
import { posthogQueryConfig, runHogQL, queries } from '../../../../lib/posthogQuery';

// GET /api/admin/visitors
// PostHog numbers for /admin/visitors, last 7, 30, 90 and 365 days, sports and
// Foils & Fables separately. Admin only (same gate as /api/admin/funnel).
// The PostHog key stays on the server. Results are kept for about 10 minutes
// on this server so reloading the page doesn't re-query PostHog.

export const dynamic = 'force-dynamic';

const WINDOWS = [7, 30, 90, 365];
const SIDES = ['sports', 'fables'];
const TTL_MS = 10 * 60 * 1000;
const TOP = 8;
const STEPS = [
  ['$pageview', 'Visited'],
  ['searched', 'Ran a search'],
  ['card_opened', 'Opened a card'],
  ['alert_saved', 'Saved an alert'],
];

let cache = null; // { at, body }

const side = (v) => (v === 'fables' ? 'fables' : 'sports');

function days(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function shapeWindow(n, rows) {
  const out = { daily: {}, sources: {}, pages: {}, funnel: {}, lists: [], errors: [] };
  const [daily, sources, pages, lists, funnel] = rows;
  const failed = (r, label) => { if (r.status === 'rejected') out.errors.push(label); return r.status === 'fulfilled' ? r.value : []; };

  const dailyRows = failed(daily, 'visitors per day');
  for (const s of SIDES) {
    const byDay = new Map(dailyRows.filter((r) => side(r[1]) === s).map((r) => [String(r[0]).slice(0, 10), Number(r[2]) || 0]));
    out.daily[s] = days(n).map((day) => ({ day, visitors: byDay.get(day) || 0 }));
  }
  const top = (list, mapRow) => {
    const res = {};
    for (const s of SIDES) res[s] = list.filter((r) => side(r[0]) === s).slice(0, TOP).map(mapRow);
    return res;
  };
  out.sources = top(failed(sources, 'sources'), (r) => ({ name: String(r[1] ?? 'direct').slice(0, 40), visitors: Number(r[2]) || 0 }));
  out.pages = top(failed(pages, 'pages'), (r) => ({ path: String(r[1] ?? '/').slice(0, 80), views: Number(r[2]) || 0 }));

  const byGame = new Map();
  for (const r of failed(lists, 'card lists')) {
    const key = String(r[1] || 'pokemon');
    const cur = byGame.get(key) || { game: key, lists: 0, checklists: 0 };
    if (r[0] === '/fables/lists') cur.lists += Number(r[2]) || 0;
    else cur.checklists += Number(r[2]) || 0;
    byGame.set(key, cur);
  }
  out.lists = [...byGame.values()].sort((a, b) => b.lists + b.checklists - (a.lists + a.checklists));

  const f = failed(funnel, 'steps');
  for (const s of SIDES) {
    out.funnel[s] = STEPS.map(([event, label]) => ({
      step: label,
      people: Number(f.find((r) => side(r[0]) === s && r[1] === event)?.[2]) || 0,
    }));
  }
  return out;
}

export async function GET() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!isAdminUser(user.id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const headers = { 'Cache-Control': 'private, max-age=600' };
  if (!posthogQueryConfig()) {
    return NextResponse.json({ configured: false }, { headers: { 'Cache-Control': 'no-store' } });
  }
  if (cache && Date.now() - cache.at < TTL_MS) return NextResponse.json(cache.body, { headers });

  try {
    const windows = {};
    for (const n of WINDOWS) {
      const rows = await Promise.allSettled([
        runHogQL(queries.daily(n)),
        runHogQL(queries.sources(n)),
        runHogQL(queries.pages(n)),
        runHogQL(queries.lists(n)),
        runHogQL(queries.funnel(n)),
      ]);
      // Every query failing means the key or project is wrong; say so plainly.
      if (rows.every((r) => r.status === 'rejected')) {
        const msg = String(rows[0].reason?.message || '');
        console.error('admin/visitors: PostHog query failed:', msg);
        return NextResponse.json({
          configured: true,
          error: /401|403/.test(msg)
            ? 'PostHog refused the key. Check POSTHOG_PERSONAL_API_KEY (read-only query access) and POSTHOG_PROJECT_ID.'
            : 'Could not reach PostHog. Try again in a minute.',
        }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
      }
      windows[n] = shapeWindow(n, rows);
    }
    const body = { configured: true, updatedAt: new Date().toISOString(), windows };
    cache = { at: Date.now(), body };
    return NextResponse.json(body, { headers });
  } catch (err) {
    console.error('admin/visitors failed:', err?.message);
    return NextResponse.json({ configured: true, error: 'Could not load visitor numbers.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
