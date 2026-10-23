import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabaseServer';
import { getServiceSupabase } from '../../../lib/revenuecat';

// GET /api/home
//
// Data for the signed-in home's "Since you were last here" block:
//   newMatches  alert matches per saved search since the last visit
//               (from sent_notifications, which the poller already writes)
//   priceDrops  starred cards now cheaper than when they were starred
//   endingSoon  starred auctions ending in the next 24 hours
//   tier        for the one-line upgrade prompt
//
// No eBay calls: everything comes from our own tables.
//
// The member is identified from their session cookie. Reads and the
// last_seen_at update then use the service role, filtered to that user id,
// because sent_notifications and the profile column grants aren't readable
// or writable by the signed-in role directly.
//
// Works before the signed_in_home migration runs: if last_seen_at or
// price_when_saved don't exist yet, those blocks come back empty.

const DAY = 24 * 60 * 60 * 1000;
// Opening the home again within this window doesn't move "last seen", so a
// refresh mid-visit doesn't wipe the list.
const SAME_VISIT_MS = 30 * 60 * 1000;

export async function GET() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let db;
  try { db = getServiceSupabase(); } catch { db = supabase; }
  const now = Date.now();

  // Profile: tier and last visit
  let tier = 'free';
  let lastSeen = null;
  {
    const { data, error } = await db.from('profiles')
      .select('tier, is_founding_member, last_seen_at').eq('id', user.id).single();
    if (!error && data) {
      tier = data.is_founding_member ? 'founding' : (data.tier || 'free');
      lastSeen = data.last_seen_at || null;
    } else {
      const { data: d2 } = await db.from('profiles').select('tier, is_founding_member').eq('id', user.id).single();
      if (d2) tier = d2.is_founding_member ? 'founding' : (d2.tier || 'free');
    }
  }
  // First visit after the migration: look back a week.
  const since = lastSeen ? new Date(lastSeen) : new Date(now - 7 * DAY);

  // New alert matches, grouped by saved search
  let newMatches = [];
  {
    // The log's timestamp column has been named both ways; try each.
    let sent = null;
    for (const col of ['created_at', 'sent_at']) {
      const { data, error } = await db.from('sent_notifications')
        .select(`saved_search_id, ${col}`)
        .eq('user_id', user.id)
        .gt(col, since.toISOString())
        .limit(500);
      if (!error) { sent = data; break; }
    }
    if (sent?.length) {
      const counts = {};
      for (const r of sent) counts[r.saved_search_id] = (counts[r.saved_search_id] || 0) + 1;
      const ids = Object.keys(counts);
      const { data: searches } = await db.from('saved_searches')
        .select('id, name, query, filters').eq('user_id', user.id).in('id', ids);
      newMatches = (searches || [])
        .map((s) => ({ id: s.id, name: s.name, query: s.query, filters: s.filters, count: counts[s.id] }))
        .sort((a, b) => b.count - a.count);
    }
  }

  // Starred cards: price drops and auctions ending soon
  let priceDrops = [];
  let endingSoon = [];
  {
    let { data: rows, error } = await db.from('watched_listings')
      .select('id, listing_id, title, price, price_when_saved, currency, image_url, listing_url, badges, is_auction, end_time, bid_count, status')
      .eq('user_id', user.id).eq('status', 'active');
    if (error) {
      ({ data: rows } = await db.from('watched_listings')
        .select('id, listing_id, title, price, currency, image_url, listing_url, badges, is_auction, end_time, bid_count, status')
        .eq('user_id', user.id).eq('status', 'active'));
    }
    for (const r of rows || []) {
      const was = Number(r.price_when_saved), is = Number(r.price);
      if (was > 0 && is > 0 && is < was) priceDrops.push({ ...r, dropPct: Math.round((1 - is / was) * 100) });
      if (r.is_auction && r.end_time) {
        const left = new Date(r.end_time).getTime() - now;
        if (left > 0 && left < DAY) endingSoon.push({ ...r, msLeft: left });
      }
    }
    priceDrops.sort((a, b) => b.dropPct - a.dropPct);
    endingSoon.sort((a, b) => a.msLeft - b.msLeft);
  }

  // Move "last seen" forward, unless this is the same visit.
  if (!lastSeen || now - new Date(lastSeen).getTime() > SAME_VISIT_MS) {
    await db.from('profiles').update({ last_seen_at: new Date(now).toISOString() }).eq('id', user.id);
  }

  return NextResponse.json({
    since: lastSeen,
    tier,
    newMatches: newMatches.slice(0, 3),
    priceDrops: priceDrops.slice(0, 3),
    endingSoon: endingSoon.slice(0, 3),
  });
}
