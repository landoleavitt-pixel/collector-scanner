import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '../../../../lib/supabaseServer';

// POST /api/account/delete
//
// Permanently closes an account. Irreversible, so it requires the caller to
// echo back a confirmation string — a stray fetch or a mis-click can't trigger
// it, only a deliberate action from the confirmation dialog.
//
// Order matters:
//   1. Cancel any Stripe subscription FIRST. If we deleted the user first and
//      the cancel then failed, we'd have an orphaned subscription still
//      billing a card with no account behind it. Charging someone who has no
//      way to log in and stop it is the worst possible failure here.
//   2. Delete their rows. Foreign keys to auth.users may or may not cascade
//      depending on how each table was created, so we delete explicitly
//      rather than trusting a cascade we haven't verified.
//   3. Delete the auth user last.
//
// Requires SUPABASE_SERVICE_ROLE_KEY — removing an auth user is an admin
// operation and can't be done with the caller's own session.

const CONFIRM_PHRASE = 'DELETE MY ACCOUNT';

export async function POST(request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (body?.confirm !== CONFIRM_PHRASE) {
    return NextResponse.json({ error: 'Confirmation phrase did not match' }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    console.error('account/delete: missing service role config');
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }
  const admin = createClient(supabaseUrl, serviceKey);

  // ── 1. Cancel Stripe subscription ────────────────────────────────
  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', user.id)
      .single();

    const subId = profile?.stripe_subscription_id;
    if (subId && process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      try {
        await stripe.subscriptions.cancel(subId);
      } catch (err) {
        // Already cancelled or unknown to Stripe — fine, keep going. Anything
        // else and we stop, because deleting the account would strand a live
        // subscription with no way for the user to reach it.
        const code = err?.code || err?.raw?.code;
        if (code !== 'resource_missing') {
          console.error('account/delete: subscription cancel failed:', err?.message);
          return NextResponse.json(
            { error: 'Could not cancel your subscription. Nothing was deleted — please contact support.' },
            { status: 500 },
          );
        }
      }
    }
  } catch (err) {
    console.error('account/delete: profile lookup failed:', err?.message);
    return NextResponse.json({ error: 'Could not close account' }, { status: 500 });
  }

  // ── 2. Delete their data ─────────────────────────────────────────
  // Explicit rather than relying on FK cascades, which aren't guaranteed here.
  for (const table of ['sent_notifications', 'watched_listings', 'saved_searches', 'profiles']) {
    const { error } = await admin.from(table).delete().eq(
      table === 'profiles' ? 'id' : 'user_id',
      user.id,
    );
    if (error) {
      console.error(`account/delete: failed clearing ${table}:`, error.message);
      return NextResponse.json({ error: 'Could not fully close account' }, { status: 500 });
    }
  }

  // ── 3. Delete the auth user ──────────────────────────────────────
  const { error: authError } = await admin.auth.admin.deleteUser(user.id);
  if (authError) {
    console.error('account/delete: auth user delete failed:', authError.message);
    return NextResponse.json({ error: 'Could not close account' }, { status: 500 });
  }

  console.log(`account/delete: closed account ${user.id}`);
  return NextResponse.json({ ok: true });
}
