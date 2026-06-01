import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabaseServer';

// List the current user's watched listings (newest first).
// Optional ?status=active|sold filter.
export async function GET(request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

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

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ listings: data });
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
  const { listing_id, title, price, currency, image_url, listing_url, badges } = body;

  if (!listing_id) {
    return NextResponse.json({ error: 'listing_id is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('watched_listings')
    .insert({
      user_id: user.id,
      listing_id: String(listing_id),
      title: title ?? null,
      price: price ?? null,
      currency: currency ?? 'USD',
      image_url: image_url ?? null,
      listing_url: listing_url ?? null,
      badges: badges ?? {},
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    // Unique violation = already saved. Treat as success (idempotent).
    if (error.code === '23505') {
      return NextResponse.json({ alreadySaved: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ listing: data });
}
