# Ship List

The single list of work that's finished or in progress but **not live yet**. The boss session keeps it up to date. Nothing comes off this list until it's pushed and checked on fieldsandfloors.com.

**Status key:** 🟢 Ready to push · 🟡 Built, waiting on Landon's OK · 🔵 In progress · ⚪ Not started

| # | What | Agent | Status | Files | Extra deploy step |
|---|---|---|---|---|---|
| P1 | F&F/Fables parity: refresh popup, spelling suggestions, full audit; then checklist mockup | Design | 🟡 Building | app/fables, shared components, app/page.js | — |
| P2 | Card-family engine: Scryfall + TCGdex catalogs, /api/tcg-versions, family search, owned_cards table, re-test | Engine | 🟡 Building | lib/tcg, app/api/tcg-*, app/api/owned, migration | owned_cards SQL done 2026-11-01 |
| P5 | App name ideas + two-sided App Store listing | Listing agent | 🟡 Drafting | APP_STORE_LISTING.md, appstore/ | Landon picks name |
| P7 | Catalog research phase 2 (Japanese Pokémon, One Piece, YGO/Lorcana terms) | Research | 🟡 Researching | research/catalogs-phase-2.md | — |
| 7 | eBay Partner Network affiliate links | CFO | ⏸ Plan approved. Waiting on Landon's sign-up + Campaign ID; code held until batch ships | SiteTour.js, guides, reading-list copy + link tagging | — |
| L05 | Proof strip | Landing | ⏹ Skipped: no honest live number yet (no fake figures) | — | — |
| P11 | floorsandfables.com chooser + foilsandfables.com routing; app renamed Floors & Fables | Design | 🟢 Live ea6a097, waiting on domains | middleware, chooser page | Landon buys domains + Vercel |
| J-later | Japanese Pokémon versions (research/japanese-pokemon-plan.md): about 3–4 days of engine work; 4 questions for Landon when started | Engine | ⏸ Saved for later (Landon, 2026-11-07) | lib/tcg, checklist | — |
| E-later | Fables versions: "Secret Lair Prize #8001" / "Buy-A-Box" titles to catalog set names; Magic titles with a number but no set ("022/259") | Engine | ⚪ Follow-up | lib/tcg | — |
| S-poll | Lock down the alert checker: it can be triggered by anyone holding the public key; require a private secret header from the cron jobs instead | Debugger | ⚪ Follow-up (low risk today: it only re-runs checks and never re-sends) | poller, both cron jobs | poller deploy + Landon edits 2 cron jobs |

**iOS release reminders:** run `npx cap sync ios` before every archive, so the app points at fieldsandfloors.com and not a test server. Check that the TestFlight build receives push notifications. Add the `ff_base_annual` product in App Store Connect and RevenueCat. **Before submitting, prove a release build on iOS 17:** the debug build closes at once on the iOS 17.5 simulator ("Library not loaded: SwiftUICore") although the project says iOS 15 minimum; archive a release build and run it on an iOS 17 simulator or device (QA 2026-11-07 #8). Also check the new notification ask: turn an alert on in the app, see the "Get your alerts" sheet, then iOS's prompt.

## Sprint to Sunday 2026-11-08 (usage resets about 4am Edmonton)

Landon wants the week's remaining usage spent, so all 4 agents run (above the usual limit of 3). Each stays on its own files.

**Engine**
- [x] Rarity groups: rarityGroup field, filter, rarest-first order
- [ ] Yu-Gi-Oh! and Lorcana "every version" catalogs
- [ ] Set filter
- [ ] Japanese cards with no language word; remaining multi-card and non-card listings
- [ ] Continue signed in: server steps, proven first (needs SQL from Landon)

**Design**
- [x] Rarity groups on results, popup, filters and checklist; big photo in the picker
- [x] Magic on the checklist
- [x] Mockup: Foils & Fables home and search built around the 3 reasons (approved)
- [x] Build the new Foils & Fables home and search
- [x] Mockup: "continue signed in" between the two domains (approved)
- [ ] Build the continue signed in screens and sign-out menu, after the engine

**Helper (QA)**
- [ ] Full test of the live site, both sides, phone and computer
- [ ] Alert checker lock-down (S-poll), after Engine's rarity report

**Research**
- [ ] "Floors & Fables" App Store and trademark first look
- [ ] Download links for the card makers' checklists, so Landon can save them quickly
- [ ] Safe plan for sign-in across the two domains

**Added 2026-11-07 (top priority)**
- [ ] Design: card lists front and center (mockup first), clearer first five seconds
- [ ] Engine: card lists browse endpoint; one card per list (no Toon Dark Magician); speed; clean re-test; set filter checks
- [ ] Research: popular card lists per game
- [ ] Engine: Pokémon accuracy to 95%+ (clean test 89.6%) and catalog rebuild; push held until then

**Added 2026-11-06 evening**
- [ ] Design: sports home and search mockup; App Store screenshots and listing; tour and guide wording
- [ ] Helper: pre-push test of main; iPhone app in the Simulator; speed warm-up
- [ ] Research: launch plan with tester recruiting; Japanese Pokémon plan; YGOPRODeck email draft

**Landon**
- [ ] Buy foilsandfables.com and floorsandfables.com
- [ ] Approve pushes and mockups

## Live (shipped)

| When | What | Commit |
|---|---|---|
| 2026-11-09 | Next.js 14.2.35 security upgrade; image optimizer endpoint off; /admin/visitors (PostHog numbers, admin only); funnel steps sent to PostHog | e6b0fbf |
| 2026-11-09 | PostHog analytics (EU, account ID only, no replay, off with Share usage stats); Privacy update; Foils & Fables Collectors header | 4c76c2a + key set in Vercel |
| 2026-11-09 | New Foils & Fables home ("Find any card. See every version."), versions-first search and card lists (popular lists, /fables/lists, Lists tab) for Pokémon, Magic, Yu-Gi-Oh! and Lorcana; set filter; Vintage; grade and reprint fixes; per-side colours on saved searches and starred cards; push ask at first alert; Save this search sheet | de0fe53 (poller deploy pending: set/rarity keys + cron secret) |
| 2026-11-06 | Shared card star and sign-in fix (sign-in returns you to where you were); Foils & Fables rarity groups on results, popup, filters and checklist; big photo in the picker; Magic on the checklist; domain routing code (off until domains are connected) | ea6a097 |
| 2026-11-01 | Card checklist (English Pokémon) with Find it and need-only alerts; rarity from card catalogs; 5 new Fables filters + shipping/offers on sports; Fables search fixes; Foils & Fables Collectors title; app renamed Floors & Fables; Usage stats menu link | dcd7881 + poller deployed |
| 2026-11-01 | Fables works like F&F; Fables emails; sports label fixes; Select option A + rookie/box-only flags; checklist importer + /api/checklist; Terms/Privacy both brands + usage-stats switch and menu link; payments-off header; Sign in with Apple revoke on delete; Fables result-quality fixes + card-family fixes | 65d60a7 + poller deployed |
| 2026-10-31 | Foils & Fables at /fables: card-game search (5 games), Night foil look, side switch, shared watchlist, app chooser; eBay token cache fix | 6f506e7 |
| 2026-10-30 | Rarity lists: Prizm Basketball 25-26, Topps Series 2 2026, Mosaic Basketball 24-25, UD Series 2 Hockey; Common print runs label on phones | fb93bfc |
| 2026-10-30 | Sign-up page benefits; signed-out sign-up prompt after the 4th result (Option B) | bf6a5ae |
| 2026-10-26 | Free early access (no payments; everyone 5 alerts; plans/pricing hidden behind NEXT_PUBLIC_PAYMENTS_LIVE); "Common print runs" wording | a5180af + poller deployed |
| 2026-10-26 | "How it works" header link jumps to its section (or opens the page) | 1fe3a45 |
| 2026-10-25 | Rarity colour lists: 27 sets + 19 autograph lists | 19a92e3 |
| 2026-10-25 | iOS app footer shrinks to one legal line | ca44725 |
| 2026-10-23 | 2024 Topps Chrome Football colour list; sport hint from searched player | a7cc720 |
| 2026-10-23 | Alert checker skips the visitor rate limit (signed) and retries if limited; funnel ignores your own and our browsers | b38e9c9 + poller deployed |
| 2026-10-23 | Auction reminders at chosen times (3h/1h/30m/15m/5m) with price cap; reminder-only poller mode for a 5-minute check; funnel "hit alert limit" tracking | 2a8c9e4 + poller deployed |
| 2026-10-23 | Price filter: quick picks + typed min/max, no $5,000 cap, searches start at any price; bold signed-in home with "The Grail Hunter." heading | abeb98a |
| 2026-10-22 | Team search finds player-only titles via a player-to-team history | c8b4cfb |
| 2026-10-22 | Signed-in "Live right now" from the member's saved and recent searches (cached hourly); as-you-type suggestions on the signed-in search | d6035ad |
| 2026-10-22 | Home redesign: "The Grail Hunter" signed-out hero with real-card strip, 3-icon How it works, short Plans; simple signed-in home (search, saved searches, since last visit, live cards) | 6c9dafb |
| 2026-10-21 | Professional polish: untrue lines fixed, slogans and decoration removed, lucide icons, no em-dashes, fewer all-caps labels, glow removed, Premium "coming soon" (hero motion kept); "Search tool only" disclaimer: Terms section 2 (legal style) + card popup line + footer line; pricing page fixed (CAD, no Pro, no stale banner); eBay comparison row 1 accuracy | e9c50bf |
| 2026-10-21 | Subscribe page: annual badge "Over 3 months free"; "plus applicable taxes" under web prices; iOS bottom tab bar (step 4) + fix undefined --ink-500; "Why not just search eBay?" comparison + new hero sub copy (Landon's request) | 0fd2dd8 |
| 2026-10-21 | Landing batch: Funnel tracking in a Supabase table + /admin/funnel; Splash intro once per visit (Landon: keep it every visit), under 1s, iOS handoff lines up; New hero copy, trust line, "Show cards", "Popular hunts", header nav; Steps title + step 3 text, Plans title; Straight to results, 3 preset hunts, filter chips + "Edit filters"; Phone hero order + "Live right now" row; recent searches tidied; "Keep this card" sign-in popup, "first alert is free" band on results; home sign-up band dropped (Free card is the prompt); Plans: Free · Base (most popular) · Premium (soon), no Anonymous, "$59/yr, over 3 months free"; no price in app; Hide multi-card lots, repacks and sealed product (search + alerts); Privacy page: real providers (Stripe, Apple, RevenueCat, Resend, Supabase, Vercel, Google, eBay), push tokens, accurate eBay and deletion text; Terms page: Stripe/Apple, CAD plus applicable taxes, renewals, trial, how to cancel; CFO checklist: net-per-sub recomputed at matched prices; app/web price alignment; College players in spelling help (8,944 names; quarterly script now ~330 ESPN requests); "Auto" filter can return "Non-Auto" titles; Header: How it works · Pricing hidden on the results view; Team search (college teams, unclear same-name titles left out) | 665a301 + poller deployed |
| 2026-10-21 | Step 3: home sections redesign | 52cbb14 |
| 2026-10-20 | Step 2: 11px text floor, standard corner radii | 5875f9c |
| 2026-10-20 | Card popup print-run chip uses tier colour; mystery packs/sealed product not read as 1/1 | ad122b0 |
| 2026-10-20 | Step 1: solid-gold buttons, colour clean-up, results header fits on phones | 167043a |
| 2026-10-19 | iOS app code, new landing page and intro, web tour, colour tokens, rarity data and parser, pricing $6.99 + annual + 1 free alert | c3547d1, 507d22a, poller deployed |
| 2026-10-20 | Rarity rungs in card modal, print-run detection fix | 78975de |
| 2026-10-20 | Tour tier-colour step; plan limits wording (Free 1, Base 5) | 44f7678 (checked live) |
| 2026-10-20 | Spelling suggestions + card company filter; card popup fix; security fixes (login redirect, error text, poller log check); annual "coming soon" fallback | df96c7f + poller deployed |
| 2026-10-20 | "/25 shows One of one" bug: already fixed by the rarity commit | 78975de |

## Landon's to-do list

Everything only Landon can do lives in [LANDON_TODO.md](LANDON_TODO.md).
