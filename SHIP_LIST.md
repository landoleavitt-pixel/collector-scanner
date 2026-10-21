# Ship List

The single list of work that's finished or in progress but **not live yet**. The boss session keeps it up to date. Nothing comes off this list until it's pushed and checked on fieldsandfloors.com.

**Status key:** 🟢 Ready to push · 🟡 Built, waiting on Landon's OK · 🔵 In progress · ⚪ Not started

| # | What | Agent | Status | Files | Extra deploy step |
|---|---|---|---|---|---|
| 7 | eBay Partner Network affiliate links | CFO | ⏸ Plan approved. Waiting on Landon's sign-up + Campaign ID; code held until batch ships | SiteTour.js, guides, reading-list copy + link tagging | — |
| 13 | Card popup print-run chip is always gold, even for /199 | Rarity tree | 🔵 Approved |  CardModal.js | — |
| 14 | "(AUTO or 1/1 Possible) Sealed Pack" read as a /1 | Rarity tree | 🔵 Approved | page.js detectPrintRun, lib/parseSetFromTitle.js | — |
| 8 | Poller rate limit: alerts silently skip past ~20 unique searches | Debugger | ⚪ Needs a fix plan (not urgent at today's size) | poller, api/search | `supabase functions deploy poller` |
| 9 | Type and radius scale (step 2) | Design | 🔵 Approved; starting | many | — |
| 10 | Home page section redesign (step 3) | Design | ⚪ After step 2 | page.js | — |
| 11 | iOS bottom tab bar (step 4) | Design | ⚪ After step 3 | new component, Header.js, layout.js | — |
| 12 | 2024 Topps Chrome Football rarity data | Rarity tree | ⚪ Follow-up | lib/parallelData.js, lib/parseSetFromTitle.js | — |

**iOS release reminders:** run `npx cap sync ios` before every archive, so the app points at fieldsandfloors.com and not a test server. Check that the TestFlight build receives push notifications. Add the `ff_base_annual` product in App Store Connect and RevenueCat.

## Live (shipped)

| When | What | Commit |
|---|---|---|
| 2026-10-20 | Step 1: solid-gold buttons, colour clean-up, results header fits on phones | (step1) |
| 2026-10-19 | iOS app code, new landing page and intro, web tour, colour tokens, rarity data and parser, pricing $6.99 + annual + 1 free alert | c3547d1, 507d22a, poller deployed |
| 2026-10-20 | Rarity rungs in card modal, print-run detection fix | 78975de |
| 2026-10-20 | Tour tier-colour step; plan limits wording (Free 1, Base 5) | 44f7678 (checked live) |
| 2026-10-20 | Spelling suggestions + card company filter; card popup fix; security fixes (login redirect, error text, poller log check); annual "coming soon" fallback | df96c7f + poller deploy |
| 2026-10-20 | "/25 shows One of one" bug: already fixed by the rarity commit | 78975de |

## Landon's account setup (not code)

- iOS app: [IOS_APP_SETUP.md](IOS_APP_SETUP.md), from step 2 (Apple Developer Program).
- Stripe live mode and annual price: [CFO_LAUNCH_CHECKLIST.md](CFO_LAUNCH_CHECKLIST.md).
