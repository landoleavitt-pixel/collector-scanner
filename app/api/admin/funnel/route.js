import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabaseServer';
import { getServiceSupabase } from '../../../../lib/revenuecat';
import { isAdminUser } from '../../../../lib/admin';

// GET /api/admin/funnel
// Funnel counts per step for the last 1, 7 and 30 days. Admin only.
// Reads through the funnel_summary() SQL function (service role).

const STEPS = ['landed', 'searched', 'card_opened', 'starred', 'signed_up', 'trial_started'];
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
  return NextResponse.json({ fetchedAt: new Date().toISOString(), windows });
}
