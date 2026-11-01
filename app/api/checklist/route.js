// app/api/checklist/route.js
//
// GET /api/checklist?player=Paul+Skenes
//
// Every card of one player from the card makers' checklists we hold, grouped
// by set, then card number, then version (print run and tier on each). See
// lib/checklist.js. No eBay call, no login: card lists are free to view
// (DECISIONS.md). Empty until checklist files are imported.

import { NextResponse } from 'next/server';
import { findPlayerCards } from '../../../lib/checklist';
import { rateLimit, getClientIp } from '../../../lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const rate = rateLimit({ bucket: 'checklist', key: getClientIp(req), limit: 60, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in a moment.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } },
    );
  }

  const player = (new URL(req.url).searchParams.get('player') || '').trim();
  if (player.length < 2 || player.length > 80) {
    return NextResponse.json({ error: 'Add a player name (2 to 80 characters).' }, { status: 400 });
  }

  const result = findPlayerCards(player);
  return NextResponse.json(result, {
    // Lists only change when checklists are imported and deployed.
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' },
  });
}
