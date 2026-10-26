# Landon's To-Do List

Things only you can do, because they need your accounts, money or signature. The boss session keeps this list up to date and adds anything new the agents find. Finished items are removed.

## Do now

- [ ] Sign in and look at your new home page once (new matches, price drops, ending soon). Tell the boss if anything looks off.
- [ ] **Deploy the alert checker** (alert fix + reminder timing): in Terminal, `cd ~/projects/Fields\ and\ Floors && supabase functions deploy poller`.
- [ ] **Stop counting your own visits:** open **fieldsandfloors.com/?internal=1** once on each browser and phone you use (or just sign in on it). The agents' browser is already done.

## Stripe: for when you're ready to charge (not now)

The site runs as free early access for now (2026-10-26), so none of this is needed yet. When you decide to charge, do these, then the launch-day steps together.

**Setup (free, any time before launch):**
- [ ] Activate your Stripe account (business details, SIN and bank on stripe.com only).
- [ ] In **live mode**, create the product **Base** with two prices: **$6.99 CAD monthly** and **$59 CAD yearly**. Save both `price_…` IDs somewhere handy (not secret).
- [ ] Live mode: set up the **Customer portal** (cancel, update card, invoices, switch plans).
- [ ] Live mode: turn on **trial-ending reminder emails**, then tell the boss.
- [ ] Live mode: add the **webhook** `https://fieldsandfloors.com/api/stripe/webhook` with the 6 events. Don't copy its secret anywhere yet.

**Launch day (together):**
- [ ] Upgrade Vercel to **Pro** (about $20 USD/month; required once you take payments).
- [ ] Put the live `sk_live_…`, `whsec_…`, both price IDs **and `NEXT_PUBLIC_PAYMENTS_LIVE` = `1`** into Vercel (Production), then redeploy. That switch turns "Coming soon" back into "Start free trial".
- [ ] Do one real test purchase with your own card, then cancel it.

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
