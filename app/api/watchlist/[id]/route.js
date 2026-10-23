import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabaseServer';

// Remove a listing from the watchlist. The [id] segment is the eBay
// listing_id (so the star button on a result card can unsave without
// knowing the internal row id).
export async function DELETE(request, { params }) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { error } = await supabase
    .from('watched_listings')
    .delete()
    .eq('user_id', user.id)
    .eq('listing_id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Update bid-reminder settings on a watched auction. Body may include:
//   bid_reminder (bool), reminder_max_price (number|null),
//   reminder_offsets (minutes before the end: any of 180, 60, 30, 15, 5)
// Changing the toggle or the times re-arms them so fresh reminders can fire.
const REMINDER_OFFSETS = [180, 60, 30, 15, 5];
export async function PATCH(request, { params }) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const patch = {};
  if (typeof body.bid_reminder === 'boolean') {
    patch.bid_reminder = body.bid_reminder;
    patch.reminder_sent = false; // re-arm whenever the toggle is changed
  }
  if (Array.isArray(body.reminder_offsets)) {
    const offsets = [...new Set(body.reminder_offsets.map(Number))].filter((o) => REMINDER_OFFSETS.includes(o));
    if (offsets.length === 0) {
      return NextResponse.json({ error: 'Pick at least one reminder time' }, { status: 400 });
    }
    patch.reminder_offsets = offsets.sort((a, b) => b - a);
    patch.reminders_sent = [];
    patch.reminder_sent = false;
  }
  if ('reminder_max_price' in body) {
    patch.reminder_max_price =
      body.reminder_max_price === null || body.reminder_max_price === ''
        ? null
        : Number(body.reminder_max_price);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('watched_listings')
    .update(patch)
    .eq('user_id', user.id)
    .eq('listing_id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ listing: data });
}
