# Boss handoff (2026-11-01)

Start a new Boss session with: "Read BOSS_HANDOFF.md, DECISIONS.md, SHIP_LIST.md and LANDON_TODO.md. You are the Boss."

## Role and rules
- The Boss directs agent sessions. Landon (non-technical founder) gives commands. All agent questions go through the Boss, asked once, and get logged in DECISIONS.md.
- Plain language. Show visuals only for decisions. State any security or privacy risk before asking Landon to do anything.
- Push only after Landon says so. Before every push, test exactly what's committed:
  - `git archive HEAD` into a scratch folder, symlink node_modules, copy .env.local;
  - run the `scripts/test-*.mjs` scripts and `npx tsx --test scripts/*.test.mjs`;
  - run `next build`;
  - run `next start -p 3200` and `node scripts/smoke.mjs --base http://localhost:3200`.
  - Then push, and confirm the deploy through the GitHub commit status API plus a live check.
- Landon pastes SQL himself and runs `npx supabase functions deploy poller` himself.
- Agents share one folder: `git commit -- <own paths>` only. Never build in the main folder; :3100 is the shared dev server.
- **Token budget:** at most 3 active agents. Use Sonnet for research and QA. Give big batched jobs and one report at the end.

## Live now
- fieldsandfloors.com (sports) and /fables (Foils & Fables, the card-game side, Night foil look): free early access, payments off.

## Not pushed yet: 33 commits, all tested together on 2026-11-01 (157/230/48/26/23 + 22 tests, build OK, smoke 24/0)
- Fables works like F&F (shared search components, spelling, refresh popup, card popup); QA fixes
- Fables emails; email escaping
- Sports label fixes (customs and displays hidden, "1 of N", "Unsigned")
- Recent-search team fix
- Select option A; rookie- and box-only flags; 2026 Topps Chrome Football
- Checklist importer and /api/checklist; smoke checks
- Terms/Privacy for both brands, with catalog credits behind CARD_DATA_LIVE; usage-stats switch on /privacy
- App renamed in native files to "Fields & Fables" (**name now in doubt, see below**)
- Hidden: the paid 15-minute alert option and the billing menu while payments are off; the app asks everyone for push during early access
- **After the push: Landon runs the poller deploy** (emails changed)
- Re-check smoke on live: /fables?utm_source=x should now be the home page; the smoke check still marks it "expected fail", so flip it to a plain check

## Agents
- Design (local_787e8154…, Opus): next is the checklist mockup (mockups/card-checklist.html), to show Landon. Also to add: a "Usage stats" link (/privacy#usage-stats) in the Header account menu.
- Engine "fables-engine" (local_7590def3…, Opus, paused by usage limits): first the 9 result-quality patterns (research/qa-fables-results.md), then card-family search (Scryfall + TCGdex, /api/tcg-versions, owned_cards table, Japanese seller-title labels), then a re-test. Also ladders "X or Y" names (QA #13) and isNonCard on Fables.
- QA/helper "team-search" (local_63c4c8f0…, Sonnet, paused): Sign in with Apple token revoke on account delete. **Uncommitted files:** lib/appleAuth.js, app/api/account/apple-token/, app/api/account/delete/route.js, lib/native.js, IOS_APP_SETUP.md, .env.local.example. When it's done, Landon gets SQL plus Apple env vars (keys go into Vercel only).
- Research (local_fd5ef39f…, Sonnet): idle.
- Archived (work committed): rarity, listing, spelling. Reopen rarity when Landon's checklist files land in data/checklists/.

## Open decisions for Landon
- **App name:** fieldsandfables.com already exists (registered 2026-03), so "Fields & Fables" is risky. Landon floated "CardAtlas": cardatlas.com is a parked domain (owned since 2016); App Store and trademark checks are still to do. "Rarest First": rarestfirst.com is free. Once he picks, update capacitor.config.json, Info.plist, mobile-shell/offline.html, IOS_APP_SETUP.md, APP_STORE_LISTING.md and DECISIONS.md.
- Checklist mockup approval (when design sends it).
- pricing page still says "every"; it's hidden, so low priority.


## Update 2026-11-07 (Boss session local_c6e2e1cd-4c53-4768-b8b0-94dbedfa0c5e)
- Live: ea6a097 (rarity groups, Magic checklist, shared-card sign-in fix) + 10b7ec0 (Apple hidden on web, Privacy Apple token, faster sports search). Poller last deployed 2026-11-01; next deploy adds set/rarity keys and the cron secret (Landon steps in LANDON_TODO.md).
- Waiting on main, not pushed (about 60 commits): new Fables home and versions-first search, four games (Pokémon, Magic, Yu-Gi-Oh!, Lorcana), set filter, Vintage, grade fix (minifier bug), reprint fixes, per-side colours on saved searches and starred cards, push ask at first alert, card lists (design finishing), QA fixes. Gate: fresh test Pokémon 95.4% / Magic 95.3% precision (passes the 95% bar; per-card rule 26/40 still short). Delta Reign isn't in TCGdex yet, so its cards show "version not in title". Run the full pre-push test before pushing.
- Open for Landon: sports home mockup headline (mockups/fields-floors-home-story.html); throwaway Supabase test project for one login (engine stopped until then); buy foilsandfables.com and floorsandfables.com; first Topps checklist file.
- Saved for later: Japanese Pokémon plan; launch plan (research/launch-plan.md) once domains and the push are live.
- Agents were run at 4 during the 2026-11-06/07 sprint because Landon asked to spend the week's usage; go back to max 3.

- **Our testing never counts as visitors:** before any browser visit to the live site, open https://fieldsandfloors.com/?internal=1 once in that browser (repeat per new domain). Curl/smoke checks and localhost are fine. (Landon, 2026-11-09)
