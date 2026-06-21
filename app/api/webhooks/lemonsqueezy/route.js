import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Client created inside handler — NOT at module level.
// Next.js evaluates module-level code at build time when env vars are absent,
// which throws "supabaseKey is required". Lazy creation avoids this.
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

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
  const supabase = getSupabase();

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

  const eventName  = payload?.meta?.event_name;
  const attrs      = payload?.data?.attributes ?? {};
  const customData = payload?.meta?.custom_data ?? {};

  const userId        = customData.user_id ?? null;
  const customerEmail = attrs.user_email ?? attrs.customer_email ?? null;
  const lsCustomerId  = String(payload?.data?.relationships?.customer?.data?.id ?? attrs.customer_id ?? '');
  const lsSubId       = String(payload?.data?.id ?? '');

  console.log(`LS webhook: ${eventName} | user=${userId} | email=${customerEmail} | sub=${lsSubId}`);

  async function resolveUserId() {
    if (userId) return userId;
    if (!customerEmail) return null;
    // Page through auth.users — Supabase's default page size is 50 and
    // listUsers() doesn't filter by email server-side. Walk pages until we
    // find the match or run out. Caps at 50 pages (2500 users) to bound
    // worst-case latency — beyond that the lookup-by-email-via-RPC route
    // would need a custom DB function, but at that scale you've earned it.
    const PER_PAGE = 50;
    const MAX_PAGES = 50;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: PER_PAGE,
      });
      if (error) {
        console.error('LS webhook: listUsers error on page', page, error);
        return null;
      }
      const users = data?.users ?? [];
      if (users.length === 0) return null;
      const match = users.find((u) => u.email === customerEmail);
      if (match) return match.id;
      if (users.length < PER_PAGE) return null; // last page, no match
    }
    console.error('LS webhook: hit MAX_PAGES without finding', customerEmail);
    return null;
  }

  if (eventName === 'subscription_created') {
    const uid = await resolveUserId();
    if (!uid) {
      console.error('LS webhook: could not resolve user for subscription_created');
      // Return 5xx so Lemon Squeezy retries — otherwise a paying user could
      // be permanently dropped if email matching races their account creation.
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 500 });
    }
    const { error: upsertError } = await supabase.from('profiles').upsert({
      id:                   uid,
      tier:                 'base',
      ls_customer_id:       lsCustomerId,
      ls_subscription_id:   lsSubId,
      trial_ends_at:        attrs.trial_ends_at ?? null,
      subscription_ends_at: attrs.renews_at ?? null,
    }, { onConflict: 'id' });
    if (upsertError) {
      console.error(`LS webhook: UPSERT FAILED for user ${uid}:`, JSON.stringify(upsertError));
      return NextResponse.json({ ok: false, error: 'Upsert failed', details: upsertError.message }, { status: 500 });
    }
    console.log(`LS webhook: granted base tier to user ${uid}`);
  }

  else if (eventName === 'subscription_updated') {
    const uid = await resolveUserId();
    if (!uid) return NextResponse.json({ ok: true }, { status: 200 });
    const status = attrs.status;
    const tier   = ['active', 'on_trial'].includes(status) ? 'base' : 'free';
    await supabase.from('profiles').upsert({
      id:                   uid,
      tier,
      ls_customer_id:       lsCustomerId,
      ls_subscription_id:   lsSubId,
      subscription_ends_at: attrs.renews_at ?? attrs.ends_at ?? null,
    }, { onConflict: 'id' });
    console.log(`LS webhook: updated user ${uid} → tier=${tier} status=${status}`);
  }

  else if (eventName === 'subscription_expired') {
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
        console.log(`LS webhook: founding member ${uid} — keeping alerts`);
      }
    }
  }

  else if (eventName === 'subscription_payment_success') {
    const uid = await resolveUserId();
    if (uid) {
      await supabase.from('profiles').update({
        tier:                 'base',
        subscription_ends_at: attrs.renews_at ?? null,
      }).eq('id', uid);
      console.log(`LS webhook: renewed base tier for user ${uid}`);
    }
  }

  else if (eventName === 'subscription_payment_failed') {
    console.log(`LS webhook: payment_failed for sub ${lsSubId} — awaiting LS retry`);
  }

  else if (eventName === 'subscription_cancelled') {
    console.log(`LS webhook: subscription_cancelled for sub ${lsSubId} — access continues until period end`);
  }

  else if (eventName === 'order_created') {
    console.log(`LS webhook: order_created ignored (handled via subscription_created)`);
  }

  else {
    console.log(`LS webhook: unhandled event ${eventName}`);
  }

  return NextResponse.json({ ok: true });
}
