import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabaseServer';

// PATCH /api/profile/notify-frequency
//
// Account-wide setting for how often alert digests are sent. Stored on
// profiles rather than per saved search — one preference is simpler to reason
// about, and the poller already batches every user's matches into a single
// email per run, so cadence naturally applies to the whole digest.
//
// '15min' is accepted only from entitled users. It's a higher-tier option and
// currently behaves like hourly in the poller (the cron interval and eBay
// quota both need to change before it can mean anything more), so selecting
// it isn't harmful — but gating it here keeps the stored value honest.

const ALLOWED = ['15min', 'hourly', 'daily', 'weekly'];
const PRO_ONLY = ['15min'];

export async function PATCH(request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const frequency = String(body?.frequency || '');
  if (!ALLOWED.includes(frequency)) {
    return NextResponse.json({ error: 'Unknown frequency' }, { status: 400 });
  }

  if (PRO_ONLY.includes(frequency)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, is_founding_member')
      .eq('id', user.id)
      .single();
    // No tier above 'base' exists yet, so founding members are the only ones
    // who can hold this. When a Pro tier ships, add it to this check.
    const allowed = profile?.is_founding_member === true;
    if (!allowed) {
      return NextResponse.json(
        { error: 'Faster alerts require an upgrade.', code: 'UPGRADE_REQUIRED' },
        { status: 403 },
      );
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ notify_frequency: frequency })
    .eq('id', user.id);

  if (error) {
    console.error('notify-frequency update failed:', error.message);
    return NextResponse.json({ error: 'Could not save preference' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, frequency });
}
