# Ship List

The single list of work that's finished or in progress but **not live yet**. The boss session keeps it up to date. Nothing comes off this list until it's pushed and checked on fieldsandfloors.com.

**Status key:** 🟢 Ready to push · 🟡 Built, waiting on Landon's OK · 🔵 In progress · ⚪ Not started

| # | What | Agent | Status | Files | Extra deploy step |
|---|---|---|---|---|---|
| 7 | eBay Partner Network affiliate links | CFO | ⏸ Plan approved. Waiting on Landon's sign-up + Campaign ID; code held until batch ships | SiteTour.js, guides, reading-list copy + link tagging | — |
| L05 | Proof strip | Landing | ⏹ Skipped: no honest live number yet (no fake figures) | — | — |
| S-poll | Lock down the alert checker: it can be triggered by anyone holding the public key; require a private secret header from the cron jobs instead | Debugger | ⚪ Follow-up (low risk today: it only re-runs checks and never re-sends) | poller, both cron jobs | poller deploy + Landon edits 2 cron jobs |

**iOS release reminders:** run `npx cap sync ios` before every archive, so the app points at fieldsandfloors.com and not a test server. Check that the TestFlight build receives push notifications. Add the `ff_base_annual` product in App Store Connect and RevenueCat.

## Live (shipped)

| When | What | Commit |
|---|---|---|
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
