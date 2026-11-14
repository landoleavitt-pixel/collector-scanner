// app/api/want-share/[token]/route.js
//
// GET /api/want-share/<token>: the data for a shared want list
// (/fables/wants/<token>). Same shape as /api/still-need (lib/tcg/stillNeed.js),
// with nothing about whose list it is: no name, email or account id, and no
// owned counts per version.
//
// Looked up on the server with the service role, because the list's owner
// isn't the visitor. Unknown or turned-off links answer 404. Rate limited per
// browser address. Each family costs one family search (shared 15-minute cache).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '../../../../lib/rateLimit';
import { stillNeed, STILL_NEED_DEFAULT } from '../../../../lib/tcg/stillNeed';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' };
const notFound = () => NextResponse.json({ error: 'This list is not shared' }, { status: 404, headers });

export async function GET(req, { params }) {
  const token = String(params?.token || '');
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return notFound();
  if (!rateLimit({ bucket: 'want-share-view', key: getClientIp(req), limit: 30, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return notFound();
  const db = createClient(url, key);
  const { data: share, error } = await db.from('want_shares').select('user_id').eq('token', token).maybeSingle();
  if (error || !share) return notFound();
  const [owned, searches] = await Promise.all([
    db.from('owned_cards').select('game, card_key, version_key, updated_at').eq('user_id', share.user_id).eq('side', 'fables').limit(5000),
    db.from('saved_searches').select('filters, query, created_at').eq('user_id', share.user_id).eq('side', 'fables').limit(200),
  ]);
  const p = new URL(req.url).searchParams;
  const body = await stillNeed({
    owned: owned.error ? [] : owned.data || [],
    searches: searches.error ? [] : searches.data || [],
    offset: Math.max(0, parseInt(p.get('offset'), 10) || 0),
    limit: parseInt(p.get('limit'), 10) || STILL_NEED_DEFAULT,
  });
  // A shared list shows what's missing, not what's owned.
  for (const f of body.families) delete f.owned;
  return NextResponse.json(body, { headers });
}
