// app/api/tcg-meta/route.js
//
// GET /api/tcg-meta: games, rarity ladders (rarest first), tiers, languages
// and graders for the Foils & Fables filter UI. Static, no eBay calls.

import { NextResponse } from 'next/server';
import { tcgMeta } from '../../../lib/tcg/search';

export async function GET() {
  return NextResponse.json(tcgMeta(), {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' },
  });
}
