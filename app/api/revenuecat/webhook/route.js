import { NextResponse } from 'next/server';
import { syncRevenueCatUser } from '../../../../lib/revenuecat';

// POST /api/revenuecat/webhook
//
// RevenueCat → Supabase tier sync for Apple in-app purchases. Every event
// (INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, ...)
// is handled the same way: re-read the subscriber and write the result. See
// lib/revenuecat.js.
//
// RevenueCat authenticates with a static Authorization header we choose
// (REVENUECAT_WEBHOOK_AUTH), set in RevenueCat → Integrations → Webhooks.

// UUIDs only — RevenueCat's anonymous ids ($RCAnonymousID:...) have no profile.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request) {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected) {
    console.error('RevenueCat webhook: REVENUECAT_WEBHOOK_AUTH not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }
  const auth = request.headers.get('authorization') || '';
  if (auth !== expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = body?.event || {};
  if (event.type === 'TEST') return NextResponse.json({ received: true });

  // TRANSFER moves a purchase between users — sync both sides.
  const ids = new Set([
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases || []),
    ...(event.transferred_from || []),
    ...(event.transferred_to || []),
  ].filter((id) => typeof id === 'string' && UUID.test(id)));

  try {
    for (const id of ids) {
      const result = await syncRevenueCatUser(id);
      console.log(`RevenueCat webhook: ${event.type} ${id} → tier=${result.tier}`);
    }
  } catch (err) {
    console.error('RevenueCat webhook handler error:', err?.message || err);
    // 500 so RevenueCat retries.
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
