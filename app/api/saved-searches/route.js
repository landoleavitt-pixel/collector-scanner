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

  // Confirmation email — one-time "your hunt is set" message so the user
  // knows the search is armed. Also fire-and-forget: an email hiccup must
  // never fail the save.
  sendConfirmationEmail(user.email, newSearch, filters ?? {}).catch((err) => {
    console.error('Confirmation email failed for search', newSearch.id, err);
  });

  return NextResponse.json({ search: newSearch });
}

// Build a compact, human-readable one-line summary of the search's filters.
// Deliberately plain text (not chip markup) — a wall of badges reads badly
// in email; a quiet summary line confirms the setup without shouting.
function summarizeFilters(filters) {
  const parts = [];
  const runs = [
    ...(Array.isArray(filters.selectedPrintRuns) ? filters.selectedPrintRuns : []),
    ...(Array.isArray(filters.customPrintRuns) ? filters.customPrintRuns : []),
  ].filter((r) => typeof r === 'string' && /^\/\d{1,5}$/.test(r));
  if (runs.length > 0) {
    const sorted = [...new Set(runs)].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    parts.push(`Print runs ${sorted.join(', ')}`);
  }
  if (filters.autoCards) parts.push('Autograph');
  if (filters.rookieCards) parts.push('Rookie');
  if (typeof filters.condition === 'string' && filters.condition !== 'any' && filters.condition) {
    parts.push(filters.condition.charAt(0).toUpperCase() + filters.condition.slice(1));
  }
  if (filters.listingType === 'auction') parts.push('Auctions only');
  else if (filters.listingType === 'fixed') parts.push('Buy It Now only');
  const min = Number(filters.priceMin);
  const max = Number(filters.priceMax);
  if (Number.isFinite(min) && min > 0 && Number.isFinite(max) && max > 0) {
    parts.push(`$${min}–$${max}`);
  } else if (Number.isFinite(max) && max > 0 && max !== 5000) {
    parts.push(`Under $${max}`);
  }
  return parts.join(' · ');
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// One-time transactional email confirming the saved search is live.
// Visual shell matches the poller's alert emails (dark, Georgia italic
// gold) so the confirmation and the eventual alerts feel like one system.
async function sendConfirmationEmail(email, savedSearch, filters) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !email) return; // silently skip in dev / missing config

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fieldsandfloors.com';
  const filterLine = summarizeFilters(filters);
  const alertsOn = savedSearch.notify_enabled !== false;

  const statusLine = alertsOn
    ? `We're scanning new eBay listings around the clock. The moment a match lists, it lands in your inbox.`
    : `Alerts are currently off for this search — flip them on from your watchlist any time to hear the moment a match lists.`;

  const html = `
  <div style="background:#0f0c0a;padding:32px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr><td style="text-align:center;padding-bottom:6px;">
        <span style="font-family:Georgia,serif;font-style:italic;font-size:24px;color:#d4af5c;">Fields &amp; Floors</span>
      </td></tr>
      <tr><td style="text-align:center;padding-bottom:24px;">
        <span style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#6e675b;">Hunt confirmed</span>
      </td></tr>
      <tr><td style="border-top:0.5px solid rgba(232,226,213,0.1);padding-top:24px;">
        <div style="font-family:Georgia,serif;font-style:italic;font-size:22px;color:#e8e2d5;">${escapeHtml(savedSearch.name)}</div>
        ${filterLine ? `<div style="font-size:12px;color:#a99e85;margin-top:8px;letter-spacing:0.02em;">${escapeHtml(filterLine)}</div>` : ''}
        <div style="font-size:13px;color:#d9d2bf;line-height:1.6;margin-top:18px;">${statusLine}</div>
      </td></tr>
      <tr><td style="padding-top:26px;text-align:center;">
        <a href="${siteUrl}/watchlist" style="display:inline-block;background:#c9954a;color:#1a1612;text-decoration:none;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;padding:13px 26px;border-radius:999px;">View your hunts</a>
      </td></tr>
      <tr><td style="padding-top:28px;text-align:center;">
        <span style="font-size:10px;color:#6e675b;">Fields &amp; Floors Collectors · <a href="${siteUrl}/watchlist" style="color:#8a8275;text-decoration:underline;">Manage saved searches</a></span>
      </td></tr>
    </table>
  </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Fields & Floors <alerts@fieldsandfloors.com>',
      to: email,
      subject: `Hunt confirmed: ${savedSearch.name}`,
      html,
    }),
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
