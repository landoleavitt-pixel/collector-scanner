# Landon's To-Do List

Things only you can do, because they need your accounts, money or signature. The boss session keeps this list up to date and adds anything new the agents find. Finished items are removed.

## Do now

- [ ] Sign in and look at your new home page once (new matches, price drops, ending soon). Tell the boss if anything looks off.
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

## iPhone app (free early-access version first)

Full steps: [IOS_APP_SETUP.md](IOS_APP_SETUP.md). No in-app purchases, RevenueCat or App Store subscriptions for now; those wait until you charge.

- [ ] Join the Apple Developer Program ($99 USD/yr). **Security note:** name, address and card go only on developer.apple.com.
- [ ] Register the App ID `com.fieldsandfloors.app` (Push Notifications + Sign in with Apple) and create one key (.p8) for push + Sign in with Apple. Note the Key ID and Team ID.
- [ ] Turn on Sign in with Apple in Supabase (Client ID `com.fieldsandfloors.app`).
- [ ] Add the push key to Supabase (the boss gives you the exact command; the key file never goes in chat).
- [ ] Run the app on your iPhone from Xcode with the boss walking you through it; test sign-in, a search and an alert.
- [ ] **Make a demo account for Apple's reviewers:** sign up on fieldsandfloors.com with a separate email (e.g. a new Gmail) and a password you don't use anywhere else, save 2 searches with alerts on, and star 1 auction. **Security note:** this login goes to Apple only, in the App Review notes, so never reuse a real password. Then tell the boss, so the last 2 screenshots can be taken (steps in appstore/screenshots/README.md).
- [ ] App Store Connect: create the app (text, privacy answers and screenshots 1–3 are ready in APP_STORE_LISTING.md and appstore/screenshots/), fill in App Privacy (email, device ID for push, Product Interaction analytics), and add a demo account for reviewers. The boss drafts the text and screenshots.
- [ ] Before archiving, ask the boss to run `npx cap sync ios`; then submit.

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

## Foils & Fables (do these now, in order)
1. Supabase → SQL Editor → paste and run `supabase/migrations/20261030000000_sides.sql`. Until then, saving a Foils & Fables search shows an error.
2. Deploy the updated alert checker: `npx supabase functions deploy poller`
