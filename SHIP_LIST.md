# Ship List

The single list of work that's finished or in progress but **not live yet**. The boss session keeps it up to date. Nothing comes off this list until it's pushed and checked on fieldsandfloors.com.

**Status key:** 🟢 Ready to push · 🟡 Built, waiting on Landon's OK · 🔵 In progress · ⚪ Not started

| # | What | Agent | Status | Files | Extra deploy step |
|---|---|---|---|---|---|
| 7 | eBay Partner Network affiliate links | CFO | ⏸ Plan approved. Waiting on Landon's sign-up + Campaign ID; code held until batch ships | SiteTour.js, guides, reading-list copy + link tagging | — |
| 8 | Poller rate limit: alerts silently skip past ~20 unique searches | Debugger | ⚪ Needs a fix plan (not urgent at today's size) | poller, api/search | `supabase functions deploy poller` |
| L05 | Proof strip | Landing | ⏹ Skipped: no honest live number yet (no fake figures) | — | — |
| 12 | 2024 Topps Chrome Football rarity data | Rarity tree | ⚪ Follow-up | lib/parallelData.js, lib/parseSetFromTitle.js | — |

**iOS release reminders:** run `npx cap sync ios` before every archive, so the app points at fieldsandfloors.com and not a test server. Check that the TestFlight build receives push notifications. Add the `ff_base_annual` product in App Store Connect and RevenueCat.

## Live (shipped)

| When | What | Commit |
|---|---|---|
| 2026-10-22 | Signed-in "Live right now" from the member's saved and recent searches (cached hourly); as-you-type suggestions on the signed-in search | (live) |
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
