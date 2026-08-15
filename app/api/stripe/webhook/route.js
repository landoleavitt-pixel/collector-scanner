import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Stripe webhook → Supabase tier sync.
//
// Mirrors the old Lemon Squeezy webhook's behavior but uses Stripe's event
// model. The app only ever reads `tier` from profiles, so downstream code is
// untouched — we just keep `tier` correct as subscriptions come and go.
//
// Events handled:
//   checkout.session.completed         → first signup; grant base, store IDs
//   customer.subscription.updated      → trialing/active → base; else free
//   customer.subscription.deleted      → subscription ended → revoke to free
//   invoice.payment_succeeded          → renewal; keep base, extend period
//   invoice.payment_failed             → log only (Stripe retries via dunning)
//
// Required env vars (set in Vercel):
//   STRIPE_SECRET_KEY             — sk_test_... then sk_live_...
//   STRIPE_WEBHOOK_SECRET         — whsec_... from Dashboard → Webhooks
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY     — service role; bypasses RLS to write tiers
//
// IMPORTANT: this route must receive the RAW request body for signature
// verification. Next.js App Router gives us that via `await request.text()`.
// Do not parse JSON before verifying.

function getSupabase() {
  // Created inside the handler, not at module level — Next.js evaluates
  // module-level code at build time when env vars are absent, which throws.
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function POST(request) {
  const secretKey     = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    console.error('Stripe webhook: missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const stripe  = new Stripe(secretKey);
  const rawBody = await request.text();
  const sig     = request.headers.get('stripe-signature');

  // Verify the signature using the SDK — this is why we use the official
  // package rather than hand-rolling HMAC: getting this wrong is a security
  // hole, and constructEvent handles the timestamp-tolerance details.
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.warn('Stripe webhook: signature verification failed:', err?.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Resolve our Supabase user ID from whatever the event carries. Checkout
  // sessions have client_reference_id; subscription objects carry the
  // metadata.user_id we set at checkout time.
  function userIdFromSession(session) {
    return session?.client_reference_id
      || session?.metadata?.user_id
      || null;
  }
  function userIdFromSubscription(sub) {
    return sub?.metadata?.user_id || null;
  }

  // Read the subscription's current period end.
  //
  // As of Stripe's Basil release (API 2025-03-31), current_period_end and
  // current_period_start were REMOVED from the Subscription object and MOVED
  // onto SubscriptionItem. Our webhook endpoint runs a post-Basil API version,
  // so sub.current_period_end is undefined — and it fails silently: the event
  // still delivers 200 OK, the object still serializes, the field just comes
  // back undefined and subscription_ends_at would never populate.
  //
  // Read from the item first, fall back to the legacy subscription-level field
  // so this keeps working regardless of which API version delivers the event.
  function periodEndFromSubscription(sub) {
    const fromItem = sub?.items?.data?.[0]?.current_period_end;
    const value = fromItem ?? sub?.current_period_end;
    return typeof value === 'number' ? new Date(value * 1000).toISOString() : null;
  }

  // Fallback: map a Stripe customer ID back to a profile we've already
  // stamped. Covers renewal/cancellation events that don't carry our metadata.
  async function userIdFromCustomer(customerId) {
    if (!customerId) return null;
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();
    return data?.id || null;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const uid = userIdFromSession(session);
        if (!uid) {
          console.error('Stripe webhook: no user id on checkout.session.completed');
          // 500 so Stripe retries — better than silently dropping a payer.
          return NextResponse.json({ error: 'No user id' }, { status: 500 });
        }
        const { error } = await supabase.from('profiles').upsert({
          id:                     uid,
          tier:                   'base',
          stripe_customer_id:     String(session.customer || ''),
          stripe_subscription_id: String(session.subscription || ''),
        }, { onConflict: 'id' });
        if (error) {
          console.error(`Stripe webhook: upsert failed for ${uid}:`, error.message);
          return NextResponse.json({ error: 'Upsert failed' }, { status: 500 });
        }
        console.log(`Stripe webhook: granted base tier to ${uid}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const uid = userIdFromSubscription(sub) || await userIdFromCustomer(sub.customer);
        if (!uid) { console.warn('Stripe webhook: sub.updated unresolved user'); break; }
        // trialing + active both grant access; anything else (past_due,
        // canceled, unpaid, incomplete) drops them to free.
        const tier = ['trialing', 'active'].includes(sub.status) ? 'base' : 'free';
        await supabase.from('profiles').upsert({
          id:                     uid,
          tier,
          stripe_customer_id:     String(sub.customer || ''),
          stripe_subscription_id: String(sub.id || ''),
          subscription_ends_at:   periodEndFromSubscription(sub),
          trial_ends_at:          sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
        }, { onConflict: 'id' });
        console.log(`Stripe webhook: ${uid} → tier=${tier} status=${sub.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const uid = userIdFromSubscription(sub) || await userIdFromCustomer(sub.customer);
        if (!uid) break;
        // Founding members keep alerts even after a subscription lapses —
        // same carve-out the Lemon Squeezy webhook honored.
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_founding_member')
          .eq('id', uid)
          .single();
        if (profile?.is_founding_member) {
          console.log(`Stripe webhook: founding member ${uid} — keeping alerts`);
          break;
        }
        await supabase.from('profiles').update({
          tier:                 'free',
          subscription_ends_at: null,
        }).eq('id', uid);
        console.log(`Stripe webhook: revoked base tier for ${uid}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const uid = await userIdFromCustomer(invoice.customer);
        if (!uid) break;
        // Renewal — keep them on base and extend the period end if present.
        const periodEnd = invoice?.lines?.data?.[0]?.period?.end;
        await supabase.from('profiles').update({
          tier:                 'base',
          subscription_ends_at: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
        }).eq('id', uid);
        console.log(`Stripe webhook: renewed base tier for ${uid}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`Stripe webhook: payment_failed for customer ${invoice.customer} — Stripe will retry`);
        // Don't revoke immediately; Stripe's dunning retries the charge and
        // sends subscription.updated (→ past_due → free) if it ultimately fails.
        break;
      }

      default:
        // Many event types we don't care about will hit this — that's fine.
        console.log(`Stripe webhook: unhandled event ${event.type}`);
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err?.message || err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
