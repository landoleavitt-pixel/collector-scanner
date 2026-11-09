# Landon's To-Do List

Things only you can do, because they need your accounts, money or signature. The boss session keeps this list up to date and adds anything new the agents find. Finished items are removed.

## Do now

- [ ] **PostHog (visitor analytics):** sign up at posthog.com yourself (EU cloud if offered), create a project, copy its Project API key (starts with `phc_`), and add it in Vercel → Settings → Environment Variables (Production) as `NEXT_PUBLIC_POSTHOG_KEY`, plus `NEXT_PUBLIC_POSTHOG_HOST` = the address PostHog shows (e.g. `https://eu.i.posthog.com`). Then tell the boss. **Security note:** this key is meant to be public, but keep it in Vercel rather than chat; your PostHog password stays with you. Nothing is tracked until the key is set and the Privacy page update is live.
- [ ] **Download the card makers' checklists** for the sports checklist: follow [research/checklist-download-links.md](research/checklist-download-links.md), newest first, in your own browser, and save each with the name it lists into `data/checklists/`. Start with one Topps file so the boss can check it imports. If a site asks you to prove you're human, that step is yours. Not secret; nothing to enter.
- [ ] **Buy foilsandfables.com and floorsandfables.com** (about $15–25 CAD/yr each; the .ca versions are optional) at any domain seller, e.g. the one that holds fieldsandfloors.com. **Security note:** card details go only on the seller's own site, never in chat. Say no to paid extras except free privacy protection. Then tell the boss, who walks you through connecting them in Vercel.
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

- [ ] **Before charging for alerts:** get written OK from YGOPRODeck (its guide doesn't cover paid apps). Lorcana version lists must stay free. Draft ready: [research/ygoprodeck-email-draft.md](research/ygoprodeck-email-draft.md). You send it from your own email when you're closer to charging.

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
- [ ] App Store Connect: create the app, **named "Floors & Fables"**. Do this as soon as your developer account is active, because creating it is what reserves the name. (Text, privacy answers and screenshots 1–3 are ready in APP_STORE_LISTING.md and appstore/screenshots/), fill in App Privacy (email, device ID for push, Product Interaction analytics), and add a demo account for reviewers. The boss drafts the text and screenshots.
- [ ] Before archiving, ask the boss to run `npx cap sync ios`; then submit.
- [ ] **Sign in with Apple cleanup on account delete (Apple requires it):** (1) paste `supabase/migrations/20261101000000_apple_tokens.sql` into Supabase → SQL Editor and run it. (2) In Vercel → Settings → Environment Variables (Production) add `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_CLIENT_ID` (= `com.fieldsandfloors.app`) and `APPLE_PRIVATE_KEY` (the full contents of the .p8 key file), then redeploy. **Security note:** the .p8 key is a secret. Paste it only into Vercel, never into chat, email or a project file. If it ever leaks, revoke it in Apple Developer → Keys and make a new one. Until you do this, everything works as today; deleting an account just can't revoke the Apple token.

## eBay Partner Network (affiliate commission)

- [ ] Sign up at partnernetwork.ebay.com. **Security note:** it asks for your legal name, address, tax ID (SIN or business number) and payout details. Enter these only on eBay's own site, never through email links or through an agent.
- [ ] Once approved, give the boss your 10-digit Campaign ID (not a secret). The agents then switch on affiliate links and the disclosure wording.

## Lock the alert checker (do after the boss says the code is ready)

Right now anyone who finds the alert checker's web address can start a run. It only re-runs checks (it never re-sends an alert), so the risk is low, but it should need a private password. **Do these in this order, so alerts never stop:**

- [ ] **1. Make a password.** In Terminal run `openssl rand -hex 32` and copy the result. **Security note:** this password goes only into the two places below (Supabase), never into chat, email, GitHub or a project file. If it ever leaks, make a new one and redo steps 2 and 3.
- [ ] **2. Save it in Supabase.** In the project folder run `npx supabase secrets set POLLER_CRON_SECRET=PASTE_THE_PASSWORD_HERE`.
- [ ] **3. Make both timers send it.** Supabase → **Integrations → Cron** (or SQL Editor → `select jobid, jobname, schedule from cron.job;`). Open the hourly job and the 5-minute reminders job, and in each one's **HTTP request headers** add a header named `x-ff-cron-secret` with the password as its value. (Keep the existing Authorization header.) Safe to do before the new code is live: the checker ignores the header until step 4.
- [ ] **4. Deploy the checker:** `npx supabase functions deploy poller` (the boss may do this one).
- [ ] **5. Check it:** the boss runs two quick tests. A call without the header should be refused and a call with it should work. If alerts ever stop, remove `POLLER_CRON_SECRET` (`npx supabase secrets unset POLLER_CRON_SECRET`) and the checker goes back to accepting runs until it's fixed.

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
1. Deploy the updated alert checker: `npx supabase functions deploy poller`

## Sports checklists (for "every card of this player")
Download each set's official checklist **in your own browser** and save it into the folder `data/checklists/` in the project. Keep the file as it comes (Excel, PDF or CSV); the name doesn't matter. Where to find them: Topps → each product's page or the Ripped blog "checklist"; Panini → the product's **Checklist** tab (Excel); Upper Deck → "Product Checklists". If a site asks you to accept terms to download, read them first and tell the Boss anything that says the data can't be reused.
- [ ] 2024 Topps Chrome Baseball
- [ ] 2025 Topps Chrome Baseball
- [ ] 2026 Topps Chrome Baseball
- [ ] 2026 Topps Series 1 Baseball
- [ ] 2026 Topps Series 2 Baseball
- [ ] 2024 Bowman Chrome Prospects (and 2024 spring Bowman)
- [ ] 2025 Bowman Chrome Prospects (and 2025 spring Bowman)
- [ ] 2026 Bowman Chrome Prospects (and 2026 spring Bowman)
- [ ] 2025 Bowman Draft Chrome
- [ ] 2024 Topps Chrome Football
- [ ] 2025 Topps Chrome Football
- [ ] 2024 Panini Prizm Football
- [ ] 2025 Panini Prizm Football
- [ ] 2025 Donruss Optic Football
- [ ] 2025 Panini Mosaic Football
- [ ] 2026 Bowman Football Chrome Prospects
- [ ] 2023-24 Panini Prizm Basketball
- [ ] 2024-25 Panini Prizm Basketball
- [ ] 2025-26 Panini Prizm Basketball
- [ ] 2024-25 Panini Mosaic Basketball
- [ ] 2024-25 Donruss Optic Basketball
- [ ] 2025-26 Topps Chrome Basketball
- [ ] 2025-26 Topps Basketball
- [ ] 2025-26 Bowman Basketball Chrome Prospects
- [ ] 2023-24 Upper Deck Series 1 Hockey (Young Guns)
- [ ] 2024-25 Upper Deck Series 1 Hockey (Young Guns)
- [ ] 2025-26 Upper Deck Series 1 Hockey (Young Guns)
- [ ] 2025-26 Upper Deck Series 2 Hockey
