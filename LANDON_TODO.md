# Landon's To-Do List

Things only you can do, because they need your accounts, money or signature. The boss session keeps this list up to date and adds anything new the agents find. Tick items off as you go.

## Do now

- [x] **Paste the tracking table SQL.** Supabase → SQL Editor → paste `supabase/migrations/20261021000000_funnel_events.sql` → Run. You should see "Success. No rows returned".

- [x] **Paste the signed-in home SQL.** Supabase → SQL Editor → paste `supabase/migrations/20261022000000_signed_in_home.sql` → Run. It adds your last-visit time and each starred card's saved price, so "Since you were last here" and price drops work.
- [ ] After both SQL pastes and the next deploy, sign in and look at your new home page once (new matches, price drops, ending soon).

- [x] **Paste the reminder-times SQL.** Supabase → SQL Editor → paste `supabase/migrations/20261023000000_reminder_times.sql` → Run. Do this before the boss pushes the reminders update.
- [x] **Add the 5-minute reminder check** (after the boss says the reminders update is live). Supabase → Integrations → Cron → open the existing job that runs the `poller` function → create a copy with: schedule `*/5 * * * *` and the same URL with `?only=reminders` added on the end. Security note: it reuses the exact same settings and key as your existing hourly job, so nothing new is exposed.

- [ ] **Deploy the alert checker** (alert fix + reminder timing): in Terminal, `cd ~/projects/Fields\ and\ Floors && supabase functions deploy poller`.
- [ ] **Stop counting your own visits:** open **fieldsandfloors.com/?internal=1** once on each browser and phone you use (or just sign in on it). The agents' browser is already done.

## Stripe: take real payments on the website

Full steps: [CFO_LAUNCH_CHECKLIST.md](CFO_LAUNCH_CHECKLIST.md), section 1.

- [ ] **Check your Vercel plan** (Vercel → Settings → Billing). The free Hobby plan is for non-commercial use only. Once you take real payments, Vercel's terms require Pro (about $20 USD/month). Upgrade before switching Stripe to live.
- [ ] Finish the Stripe business profile (SIN, bank account).
- [ ] Create Base in Stripe live mode: **$6.99 CAD monthly** and **$59 CAD yearly**.
- [ ] Add the live keys and both price IDs to Vercel (`STRIPE_SECRET_KEY`, `STRIPE_BASE_PRICE_ID`, `STRIPE_BASE_ANNUAL_PRICE_ID`, webhook secret).
- [ ] In Stripe → Settings → Billing → Subscriptions and emails, turn on **email customers before their free trial ends**. Then tell the boss, so the pricing page can say "We'll remind you before the trial ends" again.
- [ ] Do one real $6.99 purchase with your own card, check you became Base, then refund it.

## iPhone app

Full steps: [IOS_APP_SETUP.md](IOS_APP_SETUP.md).

- [ ] Join the Apple Developer Program ($99 USD/yr).
- [ ] Turn on Sign in with Apple in Supabase.
- [ ] In App Store Connect: create the app, accept the Paid Apps agreement, and join the Small Business Program.
- [ ] Create the subscriptions **at the same prices as the website**: CA$6.99 monthly and the price closest to CA$59 yearly (double-check the yearly price point before submitting), with Canada as the base country, **and a free 14-day introductory offer on both**. The Terms page promises that trial.
- [ ] Set up RevenueCat (products, the `base` entitlement, a Monthly + Annual offering, the webhook).
- [ ] Add the RevenueCat and Apple push keys to Vercel and Supabase.
- [ ] Run it on your iPhone from Xcode and test sign-in, purchase and alerts.
- [ ] Before archiving for the App Store, ask the boss to run `npx cap sync ios`, so the app points at fieldsandfloors.com.
- [ ] Fill in App Privacy labels to match the privacy page: email, purchases, device ID for push, and Product Interaction (analytics).
- [ ] Check the TestFlight build receives push notifications.

## eBay Partner Network (affiliate commission)

- [ ] Sign up at partnernetwork.ebay.com. **Security note:** it asks for your legal name, address, tax ID (SIN or business number) and payout details. Enter these only on eBay's own site, never through email links or through an agent.
- [ ] Once approved, give the boss your 10-digit Campaign ID (not a secret). The agents then switch on affiliate links and the disclosure wording.

## Check after the next deploy

- [ ] Star a card while signed out, sign up, and confirm you land back on the same search with the card starred.
- [ ] Open /admin/funnel and confirm "Visited the site" is counting.

## Later

- [ ] Apply to eBay for sold-price data (the Marketplace Insights API, approval-only) once you have steady traffic. Price history and any sold-prices button wait on this.
- [ ] Ask eBay for a higher API limit, once daily usage regularly passes about 3,000 of 5,000 (check /admin/usage weekly). The draft is in CFO_LAUNCH_CHECKLIST.md.
- [ ] Before passing $30k a year in sales, talk to an accountant about registering for GST/HST. Prices are shown "plus applicable taxes".
- [ ] Have a lawyer look over the Terms and Privacy pages before a big launch. They haven't been legally reviewed. Start with Terms section 2 (the "search tool, not a seller" disclaimer), especially clause 2.7 (the release), which Alberta consumer law may limit.
- [ ] Record the "Watch how it works" YouTube video, then send the boss the link.
