# CFO launch checklist (approved 2026-10-19)

Decisions: Base = $6.99 CAD/mo and $59 CAD/yr, 14-day trial, the same on the website and in the iOS app (App Store prices set with Canada as the base country). Go live on Stripe. Request eBay quota increase.

## 1. Stripe live (Landon, dashboard)
1. Finish business profile (SIN, bank account) and activate the account.
2. Products → create **Base**: monthly $6.99 CAD recurring, plus yearly $59 CAD recurring. Copy both price IDs.
3. Developers → Webhooks → add `https://fieldsandfloors.com/api/stripe/webhook` with the same 6 events as test mode. Copy the signing secret.
4. Vercel env vars (Production): `STRIPE_SECRET_KEY` (sk_live), `STRIPE_BASE_PRICE_ID` (monthly), webhook secret. Redeploy.
5. Run one real $6.99 purchase with your own card, confirm tier flips to Base, then refund it.

## 2. Annual plan (code built; needs setup)
**REMINDER (Landon creating the price):** web annual checkout shows "Annual billing is coming soon" and falls back to monthly until `STRIPE_BASE_ANNUAL_PRICE_ID` is set in Vercel (then redeploy).

Toggle is live on /subscribe (web + iOS). Add Vercel env `STRIPE_BASE_ANNUAL_PRICE_ID` (yearly price ID). Apple: add `ff_base_annual` (closest to CA$59, 14-day free intro) and a RevenueCat Annual package. See IOS_APP_SETUP.md.

## 3. eBay quota increase — ON HOLD (Landon submits in eBay developer portal, Application Growth Check)
**Status (2026-10-20):** usage was 200 of 5,000 calls (~4%). That is not demonstrated need, so do not submit yet. **Trigger:** daily buy.browse usage regularly above ~60% (3,000+/day), or after the poller rate-limit fix lands and signups grow. Check /admin/usage weekly. Keep the draft below ready; fill in X and Y with real numbers at that point.

Draft: "Fields & Floors is a subscription software tool for sports card collectors. It uses the Browse API to run saved searches and send email/push alerts when new listings match. Every user-facing listing links back to eBay for purchase. We deduplicate identical searches, cap per-run item refreshes, and currently use roughly X of our 5,000 daily calls at Y users. Growth in saved searches requires a higher limit to keep alerts timely." Fill X and Y from /admin/usage first.

## 4. Watch
- Net per subscriber at the same prices (CA$), before income tax, and assuming Stripe's standard Canadian card rate of 2.9% + $0.30 and Apple's 15% Small Business rate:
  - Monthly CA$6.99: web ~$6.49 (Stripe fee ~$0.50), iOS ~$5.94 (Apple fee ~$1.05).
  - Annual CA$59: web ~$56.99 (~$4.75/mo), iOS ~$50.15 (~$4.18/mo).
  - The web is worth about 9% more per subscriber, so the website is the better place to send people. (Apple rules limit how the app can point to it.)
  - The earlier ~$5.8 web / ~$5.7 iOS figures were wrong (web was understated) and are replaced by these.
  - Apple's price point nearest CA$59 may land at CA$58.99 or CA$59.99, which moves iOS annual net by under $1.
- Track trial-to-paid conversion and monthly churn before touching the price again.
