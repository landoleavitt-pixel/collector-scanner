# CFO launch checklist (approved 2026-10-19)

Decisions: Base = $6.99 CAD/mo (App Store $4.99 USD), $59 CAD/yr annual, 14-day trial. Go live on Stripe. Request eBay quota increase.

## 1. Stripe live (Landon, dashboard)
1. Finish business profile (SIN, bank account) and activate the account.
2. Products → create **Base**: monthly $6.99 CAD recurring, plus yearly $59 CAD recurring. Copy both price IDs.
3. Developers → Webhooks → add `https://fieldsandfloors.com/api/stripe/webhook` with the same 6 events as test mode. Copy the signing secret.
4. Vercel env vars (Production): `STRIPE_SECRET_KEY` (sk_live), `STRIPE_BASE_PRICE_ID` (monthly), webhook secret. Redeploy.
5. Run one real $6.99 purchase with your own card, confirm tier flips to Base, then refund it.

## 2. Annual plan (code built; needs setup)
**REMINDER (Landon creating the price):** web annual checkout shows "Annual billing is coming soon" and falls back to monthly until `STRIPE_BASE_ANNUAL_PRICE_ID` is set in Vercel (then redeploy).

Toggle is live on /subscribe (web + iOS). Add Vercel env `STRIPE_BASE_ANNUAL_PRICE_ID` (yearly price ID). Apple: add `ff_base_annual` ($39.99 USD, 14-day free intro) and a RevenueCat Annual package. See IOS_APP_SETUP.md.

## 3. eBay quota increase — ON HOLD (Landon submits in eBay developer portal, Application Growth Check)
**Status (2026-10-20):** usage was 200 of 5,000 calls (~4%). That is not demonstrated need, so do not submit yet. **Trigger:** daily buy.browse usage regularly above ~60% (3,000+/day), or after the poller rate-limit fix lands and signups grow. Check /admin/usage weekly. Keep the draft below ready; fill in X and Y with real numbers at that point.

Draft: "Fields & Floors is a subscription software tool for sports card collectors. It uses the Browse API to run saved searches and send email/push alerts when new listings match. Every user-facing listing links back to eBay for purchase. We deduplicate identical searches, cap per-run item refreshes, and currently use roughly X of our 5,000 daily calls at Y users. Growth in saved searches requires a higher limit to keep alerts timely." Fill X and Y from /admin/usage first.

## 4. Watch
- Apple takes 15% (Small Business Program); Stripe ~2.9% + $0.30. Net per monthly sub: ~$5.8 CAD via web, ~$5.7 CAD via iOS.
- Track trial-to-paid conversion and monthly churn before touching the price again.
