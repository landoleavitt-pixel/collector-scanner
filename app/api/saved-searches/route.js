import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabaseServer';
import { recordOnce } from '../../../lib/trackServer';
import { PAYMENTS_LIVE } from '../../../lib/payments';
import { savedSearchParams } from '../../../lib/tcg/search';
import { buildFablesConfirmation, FABLES_SENDER } from '../../../lib/fablesEmail';
import { buildSportsConfirmation, SPORTS_SENDER } from '../../../lib/huntConfirmedEmail';

// Max searches that can be actively notifying at once (Base tier).
// Must match MAX_ACTIVE_WATCHES in app/api/saved-searches/[id]/route.js.
const MAX_ACTIVE_WATCHES = 5;
// Free accounts get a taste: one live alert.
const FREE_ACTIVE_WATCHES = 1;

// Which side of the site a saved search belongs to: 'sports' (Fields &
// Floors) or 'fables' (Foils & Fables). Rows saved before the sides
// migration have no side and are sports.
const SIDES = ['sports', 'fables'];
const withSide = (row) => (row ? { ...row, side: row.side ?? 'sports' } : row);

// List all saved searches for the current user. Optional ?side=sports|fables.
export async function GET(request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const side = new URL(request.url).searchParams.get('side');
  let q = supabase
    .from('saved_searches')
    .select('*')
    .order('created_at', { ascending: false });
  if (SIDES.includes(side)) q = q.eq('side', side);

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ searches: (data ?? []).map(withSide) });
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
  const side = body.side ?? 'sports';

  if (!name?.trim() || !query?.trim()) {
    return NextResponse.json({ error: 'Name and query are required' }, { status: 400 });
  }
  if (!SIDES.includes(side)) {
    return NextResponse.json({ error: "side must be 'sports' or 'fables'" }, { status: 400 });
  }

  // Saving is unlimited; only ACTIVE watching is capped. Decide here whether
  // this new search is allowed to start watching, because the create path
  // previously bypassed the cap entirely — a user could save 10 searches
  // with notify on and sail past the limit that PATCH enforces.
  //
  // When the limit is already reached we still save the search (that's free
  // and expected) but force alerts off and tell the client, so the UI can
  // explain rather than silently doing something different than asked.
  let effectiveNotify = notify_enabled === true;
  let watchLimited = false;

  if (effectiveNotify) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, is_founding_member')
      .eq('id', user.id)
      .single();

    // Early access: everyone gets the Base limit.
    const entitled = !PAYMENTS_LIVE || profile?.tier === 'base' || profile?.is_founding_member === true;
    const limit = entitled ? MAX_ACTIVE_WATCHES : FREE_ACTIVE_WATCHES;
    const { count } = await supabase
      .from('saved_searches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('notify_enabled', true);

    if ((count ?? 0) >= limit) {
      effectiveNotify = false;
      watchLimited = true;
      // Funnel: first time this person runs into their alert cap (no search text stored).
      await recordOnce({ event: 'watch_limit_hit', userId: user.id, source: 'create', meta: { plan: entitled ? 'base' : 'free' } });
    }
  }

  const { data: newSearch, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: user.id,
      name: name.trim(),
      query: query.trim(),
      filters: filters ?? {},
      notify_enabled: effectiveNotify,
      // Sports rows leave side to the column default, so saving sports
      // searches still works before the sides migration has run.
      ...(side === 'fables' ? { side } : {}),
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

  // Confirmation email — one-time "your hunt is set" message so the user
  // knows the search is armed. Also fire-and-forget: an email hiccup must
  // never fail the save.
  sendConfirmationEmail(user.email, newSearch, filters ?? {}).catch((err) => {
    console.error('Confirmation email failed for search', newSearch.id, err);
  });

  return NextResponse.json({ search: withSide(newSearch), watchLimited, limit: MAX_ACTIVE_WATCHES });
}

// One-time transactional email confirming the saved search is live
// (lib/huntConfirmedEmail.js, lib/fablesEmail.js).
async function sendConfirmationEmail(email, savedSearch, filters) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !email) return; // silently skip in dev / missing config

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fieldsandfloors.com';
  // Card-game searches get the Foils & Fables version.
  const { subject, html } = savedSearch.side === 'fables'
    ? buildFablesConfirmation(savedSearch, filters, siteUrl)
    : buildSportsConfirmation(savedSearch, filters, siteUrl);
  return sendResend(apiKey, {
    from: savedSearch.side === 'fables' ? FABLES_SENDER : SPORTS_SENDER,
    to: email,
    subject,
    html,
  });
}

async function sendResend(apiKey, message) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
}

// Silently fetch current matches and write them to sent_notifications so the
// poller skips them. Runs after the save returns; user never sees it.
async function primeNotifications(request, savedSearch, filters) {
  const supabase = createServerSupabase();
  const origin = new URL(request.url).origin;

  // Card-game searches run through /api/tcg-search, the way the poller does.
  if (savedSearch.side === 'fables') {
    const res = await fetch(`${origin}/api/tcg-search?${savedSearchParams(savedSearch.query, filters)}`);
    if (!res.ok) throw new Error(`Prime search returned ${res.status}`);
    return insertPrimed(supabase, savedSearch, (await res.json()).items ?? []);
  }

  // Build the search body the way the poller does
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
    brands: filters.brands ?? [],
    brandLines: filters.brandLines ?? [],
    teams: filters.teams ?? [],
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
  return insertPrimed(supabase, savedSearch, data.items ?? []);
}

async function insertPrimed(supabase, savedSearch, items) {
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
