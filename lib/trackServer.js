// lib/trackServer.js
//
// Server-side funnel events (trial_started, signed_up). Same table as
// /api/track, written with the service role. Never throws: a tracking failure
// must not break a sign-in or a webhook.

import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Insert an event, but only the first time this user has ever produced it.
export async function recordOnce({ event, userId, source = null, path = null, meta = {} }) {
  try {
    if (!userId) return false;
    const db = getServiceSupabase();
    const { count } = await db
      .from('funnel_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('event', event);
    if ((count ?? 0) > 0) return false;
    const { error } = await db.from('funnel_events').insert({
      event, user_id: userId, source, path, meta,
    });
    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    console.error(`funnel ${event} not recorded:`, err?.message || err);
    return false;
  }
}

export const SIGNUP_SOURCES = ['star', 'alert', 'banner', 'direct'];

// A user counts as "signed up" the first time we see them within a day of
// their account being created: covers email confirmation, magic link, Google
// and Apple, which all end up here or in /api/track.
export async function recordSignedUp(user, rawSource) {
  try {
    if (!user?.id || !user.created_at) return false;
    if (Date.now() - Date.parse(user.created_at) > 24 * 60 * 60 * 1000) return false;
    const source = SIGNUP_SOURCES.includes(rawSource) ? rawSource : 'direct';
    return await recordOnce({ event: 'signed_up', userId: user.id, source });
  } catch {
    return false;
  }
}
