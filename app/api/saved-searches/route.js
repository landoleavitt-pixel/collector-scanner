import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabaseServer';

// List all saved searches for the current user
export async function GET() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ searches: data });
}

// Create a new saved search
export async function POST(request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { name, query, filters, notify_enabled = true } = body;

  if (!name?.trim() || !query?.trim()) {
    return NextResponse.json({ error: 'Name and query are required' }, { status: 400 });
  }

  const { data: newSearch, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: user.id,
      name: name.trim(),
      query: query.trim(),
      filters: filters ?? {},
      notify_enabled,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // First-run priming: mark every currently-matching listing as "already
  // notified" so the next poll doesn't dump existing eBay inventory into the
  // user's inbox. They want to know about NEW listings going forward.
  // We do this fire-and-forget — if it fails, the save still succeeds and
  // the worst-case is a larger-than-ideal first email next hour.
  primeNotifications(request, newSearch, filters ?? {}).catch((err) => {
    console.error('Priming failed for search', newSearch.id, err);
  });

  return NextResponse.json({ search: newSearch });
}

// Silently fetch current matches and write them to sent_notifications so the
// poller skips them. Runs after the save returns; user never sees it.
async function primeNotifications(request, savedSearch, filters) {
  const supabase = createServerSupabase();

  // Build the search body the way the poller does
  const origin = new URL(request.url).origin;
  const searchBody = {
    keywords: savedSearch.query,
    autoCards: filters.autoCards ?? false,
    numberedCards: filters.numberedCards ?? false,
    selectedPrintRuns: [
      ...(filters.selectedPrintRuns ?? []),
      ...(filters.customPrintRuns ?? []),
    ],
    rookieCards: filters.rookieCards ?? false,
    listingType: filters.listingType ?? 'any',
    condition: filters.condition ?? 'any',
    priceMin: filters.priceMin ?? 0,
    priceMax: filters.priceMax === 5000 ? null : (filters.priceMax ?? 1000),
    sortBy: filters.sortBy ?? 'printrun-rarest',
  };

  const res = await fetch(`${origin}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(searchBody),
  });

  if (!res.ok) {
    throw new Error(`Prime search returned ${res.status}`);
  }

  const data = await res.json();
  const items = data.items ?? [];
  if (items.length === 0) return;

  // Insert sent_notifications rows so the poller skips these listings
  const rows = items.map((item) => ({
    user_id: savedSearch.user_id,
    saved_search_id: savedSearch.id,
    listing_id: item.id,
  }));

  const { error } = await supabase.from('sent_notifications').insert(rows);
  if (error) {
    throw new Error(`Insert failed: ${error.message}`);
  }
}
