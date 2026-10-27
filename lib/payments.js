// Payments switch.
//
// Off (default): early access. Everything is free, every account gets alerts
// on up to 5 saved searches plus bid reminders, and plans, pricing, the
// subscribe screen and checkout are hidden (checkout returns 503).
//
// On: set NEXT_PUBLIC_PAYMENTS_LIVE=1 in Vercel on launch day, together with
// the live Stripe keys, and redeploy. Plans, pricing and checkout come back
// exactly as before (Free 1 alert, Base 5).
//
// The poller can't read Vercel env vars: it uses the Supabase secret
// EARLY_ACCESS instead (on unless set to 0). Flip both on launch day.
//
// NEXT_PUBLIC_ so the same value is baked into the browser and server bundles.

export const PAYMENTS_LIVE = process.env.NEXT_PUBLIC_PAYMENTS_LIVE === '1';

// Alerts per account while payments are off.
export const EARLY_ACCESS_ALERTS = 5;
