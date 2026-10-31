import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabaseServer';

// Which side of the site a starred card came from: 'sports' (Fields &
// Floors) or 'fables' (Foils & Fables). Rows starred before the sides
// migration have no side and are sports.
const SIDES = ['sports', 'fables'];

// List the current user's watched listings (newest first).
// Optional ?status=active|sold and ?side=sports|fables filters.
export async function GET(request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const side = searchParams.get('side');

  let q = supabase
    .from('watched_listings')
    .select('*')
    .order('saved_at', { ascending: false });

  if (status === 'active') {
    q = q.eq('status', 'active');
  } else if (status === 'sold') {
    // "Sold" tab shows both sold and ended listings
    q = q.in('status', ['sold', 'ended']);
  }
  if (SIDES.includes(side)) q = q.eq('side', side);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ listings: (data ?? []).map((row) => ({ ...row, side: row.side ?? 'sports' })) });
}

// Save a listing to the watchlist. Stores a snapshot so the tile renders
// instantly without re-fetching from eBay.
export async function POST(request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { listing_id, title, price, currency, image_url, listing_url, badges, is_auction, end_time, bid_count, condition } = body;
  const side = body.side ?? 'sports';

  if (!listing_id) {
    return NextResponse.json({ error: 'listing_id is required' }, { status: 400 });
  }
  if (!SIDES.includes(side)) {
    return NextResponse.json({ error: "side must be 'sports' or 'fables'" }, { status: 400 });
  }

  const row = {
    user_id: user.id,
    listing_id: String(listing_id),
    title: title ?? null,
    price: price ?? null,
    currency: currency ?? 'USD',
    image_url: image_url ?? null,
    listing_url: listing_url ?? null,
    badges: badges ?? {},
    status: 'active',
    is_auction: !!is_auction,
    end_time: end_time ?? null,
    bid_count: bid_count ?? null,
    condition: condition ?? null,
    // Price at the moment of starring, for "price dropped" on the signed-in home.
    price_when_saved: price ?? null,
    // Sports rows leave side to the column default.
    ...(side === 'fables' ? { side } : {}),
  };
  let { data, error } = await supabase.from('watched_listings').insert(row).select().single();
  // Before the signed_in_home migration runs, price_when_saved doesn't exist yet.
  // Save without it rather than failing the star.
  if (error && /price_when_saved/.test(error.message || '')) {
    const { price_when_saved, ...rest } = row;
    ({ data, error } = await supabase.from('watched_listings').insert(rest).select().single());
  }
  // Same before the sides migration: the star is kept (it shows with the
  // sports cards until the migration runs).
  if (error && /\bside\b/.test(error.message || '') && row.side) {
    const { side: _side, ...rest } = row;
    ({ data, error } = await supabase.from('watched_listings').insert(rest).select().single());
  }

  if (error) {
    // Unique violation = already saved. Treat as success (idempotent).
    if (error.code === '23505') {
      return NextResponse.json({ alreadySaved: true });
    }
    // Log the full Postgres error server-side — the code and details name
    // the cause (missing column, RLS denial, type mismatch) far more
    // precisely than the message alone.
    console.error('Watchlist insert failed:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      user_id: user.id,
      listing_id: String(listing_id),
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ listing: data && { ...data, side: data.side ?? 'sports' } });
}
