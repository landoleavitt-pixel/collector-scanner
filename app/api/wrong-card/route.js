// app/api/wrong-card/route.js
//
// POST /api/wrong-card  { listingId, label, side, game?, reason? }
//   → 204. A shopper's "Wrong card?" report, stored in public.wrong_card_reports
//   (supabase/migrations/20261114000000_wrong_card_reports.sql).
//
// Stores only the listing id, our label, the side, the game, a reason from a
// fixed list and, when signed in, the account id. Nothing else about the
// person (no IP, email or browser details). Rate limited: 20 an hour per
// browser address, and once per listing per address. Best effort: if the
// table isn't there yet or the write fails, it still answers 204.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '../../../lib/supabaseServer';
import { rateLimit, getClientIp } from '../../../lib/rateLimit';

export const dynamic = 'force-dynamic';
const REASONS = ['different_card', 'different_version', 'not_a_card', 'fake_or_custom', 'other'];
const done = () => new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
const bad = (error) => NextResponse.json({ error }, { status: 400, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request) {
  const ip = getClientIp(request);
  const rate = rateLimit({ bucket: 'wrong-card', key: ip, limit: 20, windowMs: 60 * 60_000 });
  if (!rate.allowed) return NextResponse.json({ error: 'Too many reports. Thank you, try again later.' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } });

  let body;
  try { body = await request.json(); } catch { return bad('Invalid request'); }
  const listingId = String(body?.listingId || '');
  const label = String(body?.label || '').replace(/\s+/g, ' ').trim();
  const side = String(body?.side || 'fables');
  const game = body?.game == null || body.game === '' ? null : String(body.game);
  const reason = body?.reason == null || body.reason === '' ? null : String(body.reason);
  if (!/^[\w|.-]{1,64}$/.test(listingId)) return bad('listingId is invalid');
  if (!label || label.length > 200) return bad('label is required (up to 200 characters)');
  if (!['sports', 'fables'].includes(side)) return bad('side must be sports or fables');
  if (game && !/^[a-z0-9-]{1,40}$/.test(game)) return bad('game is invalid');
  if (reason && !REASONS.includes(reason)) return bad(`reason must be one of ${REASONS.join(', ')}`);

  // One report per listing per address is enough.
  if (!rateLimit({ bucket: 'wrong-card-listing', key: `${ip}|${listingId}`, limit: 1, windowMs: 24 * 60 * 60_000 }).allowed) return done();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return done();

  let userId = null;
  try {
    const { data: { user } } = await createServerSupabase().auth.getUser();
    userId = user?.id || null;
  } catch { /* signed out */ }

  try {
    await createClient(url, serviceKey).from('wrong_card_reports').insert({ listing_id: listingId, our_label: label, side, game, reason, user_id: userId });
  } catch { /* table not there yet: best effort */ }
  return done();
}
