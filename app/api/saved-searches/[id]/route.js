import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabaseServer';

// Fetch a single saved search by id
export async function GET(request, { params }) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json({ search: data });
}

// Max searches that can be actively notifying at once (Base tier).
// Saving searches is unlimited — this caps only the alerting half, since
// every watched search costs eBay API calls on each hourly poll.
const MAX_ACTIVE_WATCHES = 5;

// Update a saved search (rename, toggle notifications)
export async function PATCH(request, { params }) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const updates = {};
  if (typeof body.name === 'string') updates.name = body.name.trim();
  if (typeof body.notify_enabled === 'boolean') updates.notify_enabled = body.notify_enabled;
  // Edit flow: query + filters can be updated together when the user
  // overwrites a saved search from the home page's filter panel.
  if (typeof body.query === 'string' && body.query.trim()) {
    updates.query = body.query.trim();
  }
  if (body.filters && typeof body.filters === 'object') {
    updates.filters = body.filters;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Cap on how many searches can be actively notifying at once. Saving is
  // unlimited; only the alerting half is metered, because each watched
  // search costs eBay API calls on every poll. Enforced here rather than
  // only in the UI so the limit can't be bypassed by calling the API directly.
  if (updates.notify_enabled === true) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, is_founding_member')
      .eq('id', user.id)
      .single();

    const entitled = profile?.tier === 'base' || profile?.is_founding_member === true;
    if (!entitled) {
      return NextResponse.json(
        { error: 'Alerts require a Base subscription.', code: 'NOT_ENTITLED' },
        { status: 403 },
      );
    }

    // Count OTHER searches already watching (exclude this one so toggling
    // an already-on search off and on again doesn't false-trip the cap).
    const { count } = await supabase
      .from('saved_searches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('notify_enabled', true)
      .neq('id', params.id);

    if ((count ?? 0) >= MAX_ACTIVE_WATCHES) {
      return NextResponse.json(
        {
          error: `You're watching ${MAX_ACTIVE_WATCHES} of ${MAX_ACTIVE_WATCHES} searches. Pause one to watch this.`,
          code: 'WATCH_LIMIT',
          limit: MAX_ACTIVE_WATCHES,
        },
        { status: 409 },
      );
    }
  }

  const { data, error } = await supabase
    .from('saved_searches')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ search: data });
}

// Delete a saved search
export async function DELETE(request, { params }) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
