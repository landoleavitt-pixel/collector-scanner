# Ship List

The single list of work that's finished or in progress but **not live yet**. The boss session keeps it up to date. Nothing comes off this list until it's pushed and checked on fieldsandfloors.com.

**Status key:** 🟢 Ready to push · 🟡 Built, waiting on Landon's OK · 🔵 In progress · ⚪ Not started

| # | What | Agent | Status | Files | Extra deploy step |
|---|---|---|---|---|---|
| 1 | Tour: tier-colour step (search-results example) | Website tutorial | 🟢 Ready to push | SiteTour.js, rarityUtils.js | — |
| 2 | Plan limits wording (Free 1 alert, Base 5) | Design | 🟢 Ready to push | page.js (PlansSection), pricing/page.js, subscribe/page.js | — |
| 3 | Spelling suggestions + card company filter | Search | 🟡 Waiting on mockup OK | search route, saved-searches, og, share, shareLink, WatchlistRow, poller, lib/athletes*, lib/cardBrands.js, lib/playerSuggest.js, scripts/ | `supabase functions deploy poller` |
| 4 | Colour fold + solid-gold buttons (step 1) | Design | ⚪ Waiting on go | many | — |
| 5 | Type and radius scale (step 2) | Design | ⚪ After step 1 | many | — |
| 6 | Home page section redesign (step 3) | Design | ⚪ After step 2 | page.js | — |
| 7 | iOS bottom tab bar (step 4) | Design | ⚪ After step 3 | new component, Header.js, layout.js | iOS rebuild not needed |
| 8 | 2024 Topps Chrome Football rarity data | Rarity tree | ⚪ Follow-up | lib/parallelData.js, lib/parseSetFromTitle.js | — |

## Live (shipped)

| When | What | Commit |
|---|---|---|
| 2026-10-19 | iOS app code, new landing page and intro, web tour, colour tokens, rarity data and parser, pricing $6.99 + annual + 1 free alert | c3547d1, 507d22a, poller deployed |
| 2026-10-20 | Rarity rungs in card modal, print-run detection fix | 78975de |

## Landon's account setup (not code)

- iOS app: [IOS_APP_SETUP.md](IOS_APP_SETUP.md), from step 2 (Apple Developer Program).
- Stripe live mode and annual price: [CFO_LAUNCH_CHECKLIST.md](CFO_LAUNCH_CHECKLIST.md).
