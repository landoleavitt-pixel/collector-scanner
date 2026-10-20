import { createClient } from '@supabase/supabase-js';

// RevenueCat (Apple in-app purchase) → Supabase tier sync.
//
// Rather than trust individual webhook payloads, every webhook and every
// in-app "I just bought it" call re-reads the subscriber from RevenueCat's REST
// API and writes the result. Same answer no matter which event arrives first.
//
// A user can hold Base through Stripe (website) OR Apple (app). billing_source
// records which one granted it, so an Apple expiry never revokes a paying
// Stripe subscriber (and vice versa — see the Stripe webhook).
//
// Required env vars (Vercel):
//   REVENUECAT_SECRET_KEY        — RevenueCat → Project → API keys → secret (sk_...)
//   REVENUECAT_WEBHOOK_AUTH      — any long random string; same value pasted
//                                  into RevenueCat → Integrations → Webhooks →
//                                  Authorization header
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

export const RC_ENTITLEMENT = 'base';

export function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

async function fetchSubscriber(appUserId) {
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    { headers: { Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}` }, cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`RevenueCat ${res.status}`);
  const data = await res.json();
  return data?.subscriber;
}

// Returns { tier, appleActive, endsAt } after writing the profile.
export async function syncRevenueCatUser(userId) {
  if (!process.env.REVENUECAT_SECRET_KEY) throw new Error('REVENUECAT_SECRET_KEY not set');

  const subscriber = await fetchSubscriber(userId);
  const ent = subscriber?.entitlements?.[RC_ENTITLEMENT];
  const now = Date.now();

  // expires_date null = non-expiring. Billing grace period still counts as active.
  const expiresMs = ent ? (ent.expires_date ? Date.parse(ent.expires_date) : Infinity) : 0;
  const graceMs = ent?.grace_period_expires_date ? Date.parse(ent.grace_period_expires_date) : 0;
  const appleActive = Boolean(ent) && Math.max(expiresMs, graceMs) > now;
  const endsAt = ent?.expires_date || null;

  const sub = ent?.product_identifier ? subscriber?.subscriptions?.[ent.product_identifier] : null;
  const inTrial = appleActive && sub?.period_type === 'trial';

  const supabase = getServiceSupabase();
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, billing_source, is_founding_member')
    .eq('id', userId)
    .single();

  if (appleActive) {
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      tier: 'base',
      billing_source: 'apple',
      iap_subscription_ends_at: endsAt,
      trial_ends_at: inTrial ? endsAt : null,
    }, { onConflict: 'id' });
    if (error) throw new Error(`Profile update failed: ${error.message}`);
    return { tier: 'base', appleActive, endsAt };
  }

  // Not active on Apple. Only downgrade if Apple was what granted Base —
  // a Stripe subscriber who once tried the app keeps their web subscription.
  if (profile?.billing_source === 'apple' && !profile?.is_founding_member) {
    const { error } = await supabase.from('profiles').update({
      tier: 'free',
      iap_subscription_ends_at: endsAt,
    }).eq('id', userId);
    if (error) throw new Error(`Profile update failed: ${error.message}`);
    return { tier: 'free', appleActive, endsAt };
  }

  return { tier: profile?.tier || 'free', appleActive, endsAt };
}
