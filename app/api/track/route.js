import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { rateLimit, getClientIp } from '../../../lib/rateLimit';
import { getServiceSupabase } from '../../../lib/revenuecat';
import { createServerSupabase } from '../../../lib/supabaseServer';
import { recordSignedUp } from '../../../lib/trackServer';

// POST /api/track  { event, anon_id, source?, path?, meta? }
//
// Anonymous funnel events into public.funnel_events. Fixed allow-list of
// events, small payloads, per-IP rate limit, service-role insert (the table
// has RLS on with no policies). We never store the IP, email, names or search
// text; meta is filtered down to short primitive values.
//
// trial_started is server-only (Stripe webhook / RevenueCat sync), and
// signed_up is verified against the signed-in account before it counts.

const BROWSER_EVENTS = ['landed', 'searched', 'card_opened', 'starred', 'signed_up'];
const MAX_BODY_BYTES = 2048;

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const TAG_RE = /^[a-z0-9_.-]{1,32}$/;
// Keys that suggest personal data or search text. Dropped, never stored.
const BLOCKED_KEY_RE = /(mail|name|phone|query|keyword|search|term|player|text|ip|address|token|password)/i;

function cleanMeta(meta) {
  const out = {};
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return out;
  for (const [k, v] of Object.entries(meta).slice(0, 10)) {
    if (!/^[a-z0-9_]{1,24}$/i.test(k) || BLOCKED_KEY_RE.test(k)) continue;
    if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'string' && v.length <= 40 && !v.includes('@')) out[k] = v;
  }
  return out;
}

export async function POST(request) {
  const rate = rateLimit({ bucket: 'track', key: getClientIp(request), limit: 60, windowMs: 60_000 });
  if (!rate.allowed) {
    return new NextResponse(null, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } });
  }

  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const event = body?.event;
  if (!BROWSER_EVENTS.includes(event)) {
    return NextResponse.json({ error: 'Unknown event' }, { status: 400 });
  }
  const anonId = typeof body.anon_id === 'string' && ID_RE.test(body.anon_id) ? body.anon_id : null;
  if (!anonId) return NextResponse.json({ error: 'Bad id' }, { status: 400 });

  const source = typeof body.source === 'string' && TAG_RE.test(body.source) ? body.source : null;
  // Path only: a same-site path with the query string and fragment removed.
  const rawPath = typeof body.path === 'string' ? body.path.split(/[?#]/)[0] : '';
  const path = rawPath.startsWith('/') ? rawPath.slice(0, 200) : null;

  // Only look up the account when a login cookie is present.
  const hasLogin = cookies().getAll().some((c) => c.name.startsWith('sb-'));
  let user = null;
  if (hasLogin) {
    try {
      user = (await createServerSupabase().auth.getUser()).data.user ?? null;
    } catch {}
  }

  try {
    if (event === 'signed_up') {
      // Counts once, and only for a real, brand-new account.
      await recordSignedUp(user, source);
      return new NextResponse(null, { status: 204 });
    }

    const { error } = await getServiceSupabase().from('funnel_events').insert({
      event,
      anon_id: anonId,
      user_id: user?.id ?? null,
      source,
      path,
      meta: cleanMeta(body.meta),
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error('track insert failed:', err?.message || err);
    return new NextResponse(null, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
