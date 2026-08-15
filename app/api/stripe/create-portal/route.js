import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabase } from '../../../../lib/supabaseServer';

// Creates a Stripe Customer Portal session and returns { url }. The portal is
// Stripe-hosted — subscribers update their card, view invoices, or cancel
// there, and we hear about any changes via the webhook. No billing UI to
// build or maintain on our side.
//
// Required env vars:
//   STRIPE_SECRET_KEY      — sk_test_... then sk_live_...
//   NEXT_PUBLIC_SITE_URL   — where to send them back after they're done
//
// Note: in test mode you must first save portal settings once at
// https://dashboard.stripe.com/test/settings/billing/portal or this call
// errors with "No configuration provided". One-time dashboard step.

export async function POST() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL || 'https://fieldsandfloors.com';

  if (!secretKey) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 });
  }

  // We need the user's Stripe customer ID, stamped on their profile by the
  // webhook at checkout time. No ID → they've never subscribed.
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  const customerId = profile?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/watchlist`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal session failed:', err?.message || err);
    return NextResponse.json({ error: 'Could not open billing portal' }, { status: 500 });
  }
}
