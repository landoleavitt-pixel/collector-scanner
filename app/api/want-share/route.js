// app/api/want-share/route.js
//
// The signed-in member's want-list share link
// (supabase/migrations/20261115000000_want_shares.sql). Off by default.
//   GET               → { on, url }
//   POST { on: true }  → { on: true, url }   a new link (any old one stops working)
//   POST { on: false } → { on: false, url: null }   the link stops working at once
// The page at the link shows only the still-need list, never who it belongs to.

import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabaseServer';
import { rateLimit } from '../../../lib/rateLimit';
import { SPORTS_ORIGIN } from '../../../lib/domains';

const noStore = { 'Cache-Control': 'private, no-store' };
const json = (body, status = 200) => NextResponse.json(body, { status, headers: noStore });
const linkFor = (token) => `${SPORTS_ORIGIN}/fables/wants/${token}`;

async function me() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await me();
  if (!user) return json({ error: 'Not authenticated' }, 401);
  const { data, error } = await supabase.from('want_shares').select('token').maybeSingle();
  if (error) return json({ on: false, url: null }); // table not there yet
  return json({ on: !!data, url: data ? linkFor(data.token) : null });
}

export async function POST(request) {
  const { supabase, user } = await me();
  if (!user) return json({ error: 'Not authenticated' }, 401);
  if (!rateLimit({ bucket: 'want-share', key: user.id, limit: 10, windowMs: 60_000 }).allowed) return json({ error: 'Too many requests' }, 429);
  const body = await request.json().catch(() => ({}));
  if (typeof body.on !== 'boolean') return json({ error: 'on must be true or false' }, 400);
  const { error: delErr } = await supabase.from('want_shares').delete().eq('user_id', user.id);
  if (delErr) return json({ error: 'Sharing is not set up yet' }, 503);
  if (!body.on) return json({ on: false, url: null });
  const token = randomBytes(24).toString('base64url'); // 32 characters, 192 bits
  const { error } = await supabase.from('want_shares').insert({ user_id: user.id, token });
  if (error) return json({ error: 'Sharing is not set up yet' }, 503);
  return json({ on: true, url: linkFor(token) });
}
