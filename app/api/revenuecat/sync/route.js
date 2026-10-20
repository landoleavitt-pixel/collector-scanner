import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabaseServer';
import { syncRevenueCatUser } from '../../../../lib/revenuecat';

// POST /api/revenuecat/sync
//
// Called by the iOS app right after a purchase or restore so the tier flips
// immediately instead of waiting on the webhook. Only ever syncs the caller.

export async function POST() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const result = await syncRevenueCatUser(user.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error('RevenueCat sync failed:', err?.message || err);
    return NextResponse.json({ error: 'Could not confirm your purchase' }, { status: 502 });
  }
}
