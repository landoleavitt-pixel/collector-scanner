import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabase } from '../../../../lib/supabaseServer';

// Creates a Stripe Checkout Session for the Base subscription and returns
// { url } for the client to redirect to. Mirrors the old Lemon Squeezy
// checkout route's contract so the front-end change is minimal.
//
// The user's Supabase ID rides along in two places:
//   - client_reference_id  (top-level, easy to read in the webhook)
//   - subscription_data.metadata.user_id  (survives onto the subscription
//     object itself, so subscription.updated/deleted events can resolve the
//     user without a separate lookup)
//
// 14-day free trial, card required upfront — configured via
// subscription_data.trial_period_days. Stripe collects the card during
// Checkout but doesn't charge until the trial ends.
//
// Required env vars (set in Vercel):
//   STRIPE_SECRET_KEY            — sk_test_... then sk_live_...
//   STRIPE_BASE_PRICE_ID         — price_... from Dashboard → Products
//   NEXT_PUBLIC_SITE_URL         — https://fieldsandfloors.com (or preview URL)

export async function POST() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId   = process.env.STRIPE_BASE_PRICE_ID;
  const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL || 'https://fieldsandfloors.com';

  if (!secretKey || !priceId) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 });
  }

  const stripe = new Stripe(secretKey);

  try {
    // Reuse an existing Stripe customer if we've already created one for this
    // user (stored on their profile). Otherwise let Checkout create one and
    // the webhook will persist the new customer ID. Looking it up here keeps
    // a user from accumulating duplicate Stripe customers across retries.
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    const existingCustomerId = profile?.stripe_customer_id || undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],

      // Identify the buyer so the webhook can map payment → Supabase user.
      client_reference_id: user.id,
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : { customer_email: user.email }),

      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: user.id },
      },

      // Where Stripe sends them back. The webhook will usually have flipped
      // their tier before they land, so alerts unlock on arrival.
      success_url: `${siteUrl}/watchlist?subscribed=1`,
      cancel_url: `${siteUrl}/pricing?checkout=cancelled`,

      // Lets returning users not re-type their email; harmless for new ones.
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'No checkout URL returned' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe create-checkout failed:', err?.message || err);
    return NextResponse.json({ error: 'Could not create checkout' }, { status: 500 });
  }
}
