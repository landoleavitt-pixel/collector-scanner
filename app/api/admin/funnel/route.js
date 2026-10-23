import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabaseServer';
import { getServiceSupabase } from '../../../../lib/revenuecat';
import { isAdminUser } from '../../../../lib/admin';

// GET /api/admin/funnel
// Funnel counts per step for the last 1, 7 and 30 days. Admin only.
// Reads through the funnel_summary() SQL function (service role).

const STEPS = ['landed', 'searched', 'card_opened', 'starred', 'signed_up', 'watch_limit_hit', 'trial_started'];
const WINDOWS = [1, 7, 30];

export async function GET() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!isAdminUser(user.id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const db = getServiceSupabase();
  const windows = {};
  for (const days of WINDOWS) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await db.rpc('funnel_summary', { since });
    if (error) {
      console.error('funnel_summary failed:', error.message);
      return NextResponse.json(
        { error: /funnel_summary|funnel_events/.test(error.message)
            ? 'Funnel table not set up yet. Run the funnel_events SQL migration.'
            : 'Could not load funnel.' },
        { status: 500 },
      );
    }
    const byEvent = Object.fromEntries((data || []).map((r) => [r.event, r]));
    windows[days] = STEPS.map((step) => ({
      step,
      events: Number(byEvent[step]?.events || 0),
      people: Number(byEvent[step]?.people || 0),
    }));
  }

  // Two health checks computed from data we already hold (no new events):
  //  - free accounts older than 14 days that still have an alert switched on
  //  - free trials that began 14+ days ago and are now paying
  // Founding members are left out: they keep alerts without paying.
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  let health = null;
  try {
    const { data: oldFree } = await db
      .from('profiles')
      .select('id')
      .eq('tier', 'free')
      .eq('is_founding_member', false)
      .lte('created_at', cutoff)
      .limit(5000);
    const freeIds = (oldFree || []).map((p) => p.id);
    let stillOnAlert = 0;
    if (freeIds.length) {
      const { data: watching } = await db
        .from('saved_searches')
        .select('user_id')
        .eq('notify_enabled', true)
        .in('user_id', freeIds);
      stillOnAlert = new Set((watching || []).map((r) => r.user_id)).size;
    }

    const { data: trials } = await db
      .from('funnel_events')
      .select('user_id')
      .eq('event', 'trial_started')
      .lte('created_at', cutoff)
      .not('user_id', 'is', null)
      .limit(5000);
    const trialIds = [...new Set((trials || []).map((t) => t.user_id))];
    let paying = 0;
    if (trialIds.length) {
      const { count } = await db
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('tier', 'base')
        .eq('is_founding_member', false)
        .in('id', trialIds);
      paying = count ?? 0;
    }
    health = {
      freeOlderThan14Days: freeIds.length,
      freeStillOnAlert: stillOnAlert,
      trialsOlderThan14Days: trialIds.length,
      trialsNowPaying: paying,
    };
  } catch (e) {
    console.error('funnel health failed:', e?.message || e);
  }

  return NextResponse.json({ fetchedAt: new Date().toISOString(), windows, health });
}
