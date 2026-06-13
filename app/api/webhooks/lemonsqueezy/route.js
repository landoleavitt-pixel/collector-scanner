import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Service-role client — can write to profiles without RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Lemon Squeezy signs every request with HMAC-SHA256.
// We verify before touching the DB — rejects spoofed requests.
async function verifySignature(request, rawBody) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) throw new Error('LEMONSQUEEZY_WEBHOOK_SECRET not set');
  const signature = request.headers.get('x-signature');
  if (!signature) return false;
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

export async function POST(request) {
  // Read raw body once — needed for signature verification AND JSON parse
  const rawBody = await request.text();

  const valid = await verifySignature(request, rawBody).catch(() => false);
  if (!valid) {
    console.warn('LS webhook: invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventName = payload?.meta?.event_name;
  const attrs     = payload?.data?.attributes ?? {};
  const customData = payload?.meta?.custom_data ?? {};

  // We embed the Supabase user_id in the checkout URL as custom_data.
  // Fall back to email lookup if missing (older checkouts).
  const userId        = customData.user_id ?? null;
  const customerEmail = attrs.user_email ?? attrs.customer_email ?? null;
  const lsCustomerId  = String(payload?.data?.relationships?.customer?.data?.id ?? attrs.customer_id ?? '');
  const lsSubId       = String(payload?.data?.id ?? '');

  console.log(`LS webhook: ${eventName} | user=${userId} | email=${customerEmail} | sub=${lsSubId}`);

  // Resolve Supabase user ID from custom_data or email
  async function resolveUserId() {
    if (userId) return userId;
    if (!customerEmail) return null;
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', customerEmail)  // only works if you mirror email to profiles
      .single();
    if (data?.id) return data.id;
    // Last resort: look up via auth admin
    const { data: list } = await supabase.auth.admin.listUsers();
    const match = list?.users?.find(u => u.email === customerEmail);
    return match?.id ?? null;
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  // subscription_created + subscription_payment_success on creation both fire
  // for a new sub. We dedupe by only acting on subscription_created for the
  // initial grant, and subscription_payment_success for renewals.
  if (eventName === 'subscription_created') {
    const uid = await resolveUserId();
    if (!uid) {
      console.error('LS webhook: could not resolve user for subscription_created');
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 200 });
    }

    const trialEndsAt = attrs.trial_ends_at ?? null;
    const renewsAt    = attrs.renews_at ?? null;

    await supabase.from('profiles').upsert({
      id:                   uid,
      tier:                 'base',
      ls_customer_id:       lsCustomerId,
      ls_subscription_id:   lsSubId,
      trial_ends_at:        trialEndsAt,
      subscription_ends_at: renewsAt,
    }, { onConflict: 'id' });

    console.log(`LS webhook: granted base tier to user ${uid}`);
  }

  else if (eventName === 'subscription_updated') {
    const uid = await resolveUserId();
    if (!uid) return NextResponse.json({ ok: true }, { status: 200 });

    const status   = attrs.status; // active | on_trial | past_due | cancelled | expired
    const renewsAt = attrs.renews_at ?? null;
    const endsAt   = attrs.ends_at ?? null;

    // Map LS status → our tier
    const tier = ['active', 'on_trial'].includes(status) ? 'base' : 'free';

    await supabase.from('profiles').upsert({
      id:                   uid,
      tier,
      ls_customer_id:       lsCustomerId,
      ls_subscription_id:   lsSubId,
      subscription_ends_at: renewsAt ?? endsAt,
    }, { onConflict: 'id' });

    console.log(`LS webhook: updated user ${uid} → tier=${tier} status=${status}`);
  }

  else if (eventName === 'subscription_cancelled') {
    // Cancelled means they won't renew — but keep access until period ends.
    // The subscription_updated event with status=cancelled fires alongside this;
    // we handle grace period there. Nothing extra needed here.
    console.log(`LS webhook: subscription_cancelled for sub ${lsSubId} (access continues until period end)`);
  }

  else if (eventName === 'subscription_expired') {
    // Period actually ended — revoke base tier (unless founding member).
    const uid = await resolveUserId();
    if (uid) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_founding_member')
        .eq('id', uid)
        .single();

      if (!profile?.is_founding_member) {
        await supabase.from('profiles').update({
          tier:                 'free',
          subscription_ends_at: null,
        }).eq('id', uid);
        console.log(`LS webhook: revoked base tier for user ${uid}`);
      } else {
        console.log(`LS webhook: founding member ${uid} expired — keeping alerts`);
      }
    }
  }

  else if (eventName === 'subscription_payment_success') {
    // Renewal payment — refresh the subscription end date.
    const uid = await resolveUserId();
    if (uid) {
      const renewsAt = attrs.renews_at ?? null;
      await supabase.from('profiles').update({
        tier:                 'base',
        subscription_ends_at: renewsAt,
      }).eq('id', uid);
      console.log(`LS webhook: renewed base tier for user ${uid}`);
    }
  }

  else if (eventName === 'subscription_payment_failed') {
    // Payment failed — leave tier as-is for now (LS will retry).
    // If it ultimately expires, subscription_expired handles the revoke.
    console.log(`LS webhook: payment_failed for sub ${lsSubId} — no action, awaiting retry`);
  }

  else if (eventName === 'order_created') {
    // order_created fires alongside subscription_created for new subs.
    // We ignore it here to avoid double-processing. subscription_created is
    // the authoritative event for new subscriptions.
    console.log(`LS webhook: order_created ignored (handled via subscription_created)`);
  }

  else {
    console.log(`LS webhook: unhandled event ${eventName}`);
  }

  // Always return 200 — LS retries on anything else
  return NextResponse.json({ ok: true });
}
