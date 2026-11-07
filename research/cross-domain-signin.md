# One login across fieldsandfloors.com and foilsandfables.com

*Research only. First written 2026-11-06; **updated the same day for "one login across both sites"** (DECISIONS.md, 2026-11-06, Landon): log in once and you're signed in on both, however you arrive; sign out once and you're out of both. No code changed. Written for Landon and for Design (section 1 is what a mockup needs).*

## The short version

**The problem:** a browser keeps a site's sign-in in a cookie that **only that domain can read**. Being signed in on fieldsandfloors.com does nothing on foilsandfables.com, even though both use the same Supabase accounts. Refresh tokens can't be shared either (Supabase ends the whole session if one is used twice).

**Recommendation (updated):** the same **one-time hand-off code** as before, but now it also runs **by itself on the first page of a visit** to the other site, however the person arrives (typed, link, bookmark, side switch):
- The new site quickly asks the other site "is this browser signed in with you?" by sending the browser there and straight back. If yes, a one-time code comes back (60 seconds, single use, useless without the browser that asked) and the new site starts its own session. If no, the person just stays signed out.
- **No sign-in token ever appears in a web address.** Only the short code does.
- **Bots, link previews and search crawlers are never sent on this trip.**
- **Sign-out is recorded in our own table** that links the two sessions, so signing out on either site ends both, without signing the person out of their other devices.

**What this costs and risks, honestly:**
- A signed-out visitor pays **one extra quick hop, about 0.1–0.4 seconds, on the first page of a visit** (my estimate; unmeasured; section 4.9).
- **Safari's tracking protection is the biggest unknown.** A site that only "bounces" people between sites can be treated as a tracker and have its stored data deleted after 30 days without a direct visit. Both our sites are real destinations people use, which protects them, but only real iPhone testing can prove it. Section 4.6.
- **The simple fallback still stands** (your own decision): if the session step can't be proven, people sign in once on each site.

**Two earlier points unchanged:** the iPhone app stays on **one domain** (fieldsandfloors.com, with Foils & Fables at `/fables`), so it needs none of this; and the server step that starts the session ("generateLink" then "verifyOtp") comes from community code, not an official Supabase guide, so the engine session must test it first.

---

## 1. What the person sees (for the mockup)

| Moment | What happens on screen |
|---|---|
| **Signed in on one site, opens the other by any route** (types the address, taps a link, uses the switch) | The page opens normally, a fraction of a second late. They are already signed in: saved searches, starred cards, "I own this" marks all there. No screen or button in between. |
| **Not signed in anywhere** | The page opens normally, a fraction of a second late, **once per visit**. Nothing visible happens. |
| **Taps the side switch** | Same trip, but **always** runs (even if the quiet check already ran earlier in the visit). If a short moment is visible, the one-line screen "Taking you to Foils & Fables…" |
| **The trip fails** (cookies blocked, code expired, opened twice) | They land signed out, with the normal "Sign in" button and one quiet line: "Please sign in again." Never an error wall; never a code on screen. |
| **Signs out** | **Signed out of both sites.** One button, "Sign out", with a small note "You'll be signed out of Fields & Floors and Foils & Fables" (there is no current-site-only choice). |
| **Signs out, then opens the other site** | Stays signed out. Nothing signs them back in by itself (section 4.8, "no resurrection"). |

**Never show** a code, a token or a long address. The address bar shows only the normal page.

---

## 2. Why the easy ways don't work

| Idea | Why not |
|---|---|
| **Share the cookie** | Not possible. A site can only set a cookie for its own domain or a parent of it ([MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)). The two domains are unrelated. |
| **Sign-in token in the address** | Addresses leak into history, logs, analytics and the Referer header; anyone who sees one can sign in as that person. |
| **Pass the refresh token to the other site** | Supabase gives each refresh token one use; reuse (outside a 10-second window) ends the whole session on both sites ([sessions](https://supabase.com/docs/guides/auth/sessions)). Each site needs its own session. |
| **Hidden frame or background request to the other site** | Browsers block or limit cookies in that setting, and iPhone does it silently. A full-page trip is the only reliable way. |
| **Supabase as an OAuth sign-in provider** (its OAuth 2.1 server) | Built for other companies' apps, with consent screens and client registration; in beta when last documented ([docs](https://supabase.com/docs/guides/auth/oauth-server)). Too heavy for two sites we own. |

---

## 3. The options

| Option | What it is | Verdict |
|---|---|---|
| **A. Quiet arrival check plus hand-off code (recommended)** | Section 4 | **Do this.** Matches "one login however you arrive". |
| B. Hand-off only on the switch | The earlier version | Simpler and safer, but typed or linked arrivals stay signed out. Superseded by Landon's decision. |
| C. Old site pushes a code to the new site | Weaker: an attacker can sign a victim into the attacker's account | No |
| D. Token in the address, or moving the refresh token | Leaks, or breaks sessions | No |
| **E. Sign in once per site** | Same account, two sign-ins | **The agreed fallback** if A can't be proven |

---

## 4. The design

Both sites are **one app**, one database, one Supabase project, and both run the same code. So **every site can both ask and answer**: the site the person arrives on is the "asker" (**B**), the other is the "answerer" (**A**). Nothing special about which is which.

### 4.1 The trip (same three steps as before, now started automatically)

1. **B's first page of a visit** (when the rules in 4.2 say yes): B's middleware sends the browser to `B/auth/handoff/begin`, which:
   - makes a random **verifier**, a random **state**, and remembers where the person was going (the path and query) **in a cookie on B**, not in the address. A never learns the path.
   - sets the cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, 2 minutes), and also sets the "already checked" cookie (4.4);
   - sends the browser to `A/auth/handoff/approve?challenge=<hash of verifier>&state=<state>`.
2. **A's `approve`**:
   - **no sign-in cookie at all** → sends the browser straight back to `B/auth/handoff/finish?none=1&state=…`. This is handled **without a database call or a function start** (4.9), so it's fast;
   - **signed in** → makes a random 32-byte **code**, stores only its **hash** with the person's ID, the `challenge`, the target site, **A's session ID**, and a 60-second expiry; sends the browser to `B/auth/handoff/finish?code=<code>&state=<state>`.
3. **B's `finish`**: checks `state` matches the cookie and the cookie's verifier matches the stored challenge; **redeems the code in one atomic step**; starts B's **own new session** on the server; records the **link** between the two sessions (4.8); clears the hand-off cookie; redirects to the remembered path. For `none=1` it simply sets the cookie and redirects to the remembered path.

The Supabase token never travels through the browser address. Only our own opaque code does.

### 4.2 When the quiet check runs, and when it doesn't

It runs **only** when all of these are true:
- It's a normal **page load** (GET of an HTML page), not a file, picture, API call, `HEAD`, or a prefetch/prerender (skip `Sec-Purpose: prefetch`).
- The browser says it's a **real arrival**, not a click inside the same site: `Sec-Fetch-Dest: document`, `Sec-Fetch-Mode: navigate`, and `Sec-Fetch-Site` of `none` (typed address, bookmark) or `cross-site` (a link from elsewhere, or the side switch) ([MDN: Sec-Fetch-Site](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site)). Clicks within the same site send `same-origin` and **never** trigger it.
- The person **isn't already signed in** on this site (a valid session cookie).
- The **"already checked" cookie** (4.4) isn't present.
- The path isn't one of ours that must never bounce: `/auth/*`, `/api/*`, `/_next/*`, `robots.txt`, sitemaps, picture and share-card routes, and any URL carrying an auth or payment return (for example `?code=`, `?token_hash=`).
- It isn't a known **bot, link-preview, in-app browser or our own iPhone app** (4.5, 4.6, section 6).
- It runs **before** the existing "protected page, send to /login" redirect. A signed-in person opening `/watchlist` on the other site should get in, not see a login page.

**The side switch** goes straight to `begin` with a "force" flag, which ignores the already-checked cookie and the arrival test (it is already a user action).

### 4.3 Avoiding redirect loops (six independent stops)

1. **Never check a signed-in visitor.**
2. **Set "already checked" before leaving B**, in `begin`'s own response. Even if the trip breaks halfway, this visit can't start another.
3. **Only arrivals trigger it** (4.2), so a page that reloads itself or links to itself can't start one.
4. **The trip's own pages never start a trip.** `approve` and `finish` never redirect to `begin`, and the middleware skips `/auth/*`.
5. **A hop counter in `state`.** `approve` refuses a `state` that already went around once.
6. **Cookies blocked?** The "already checked" cookie then can't stick, so each *arrival* (not each page) would bounce. The browser can't sign in on our sites without cookies anyway. `finish` notices the missing verifier cookie, lands the person signed out, and the 30-minute memory in 4.4 can't help them, so it's bounded to one trip per arrival. That's acceptable; the tests confirm it is never endless.

### 4.4 Remembering "already checked" per visit

- A cookie on each site, `ff_sso`, **`HttpOnly`, `Secure`, `SameSite=Lax`**, with a **30-minute life** (renewed whenever a page is opened). It means "we already asked, don't ask again". A visit that goes quiet for 30 minutes counts as a new visit.
- It's set by `begin` (both when the answer is "signed in" and when it's "none"), so a visitor gets **at most one check per visit** per site.
- **Sign-in on either site clears the memory on that site** (a signed-in person never needs a check anyway). And a person who was "none" and then signs in on the other site is picked up by the side switch (always runs) or by their next arrival after 30 minutes.

### 4.5 Keeping bots, link previews and search crawlers out (and SEO)

- **Fail closed.** If a request lacks the `Sec-Fetch-*` headers above, the check is skipped. Crawlers and link-preview fetchers (Google, Bing, Facebook, X, Slack, Discord, iMessage, WhatsApp, LinkedIn) don't send them, so they skip it. Browsers without those headers (very old ones) just don't get the quiet check; the switch still works.
- **Also skip by name.** A short list of crawler and preview user-agents (`Googlebot`, `bingbot`, `facebookexternalhit`, `Twitterbot`, `Slackbot`, `LinkedInBot`, `Discordbot`, `WhatsApp`, `Applebot`) as a second, belt-and-braces rule.
- **Search engines see the normal page, at the normal address, with no redirect.** The check only changes things for a real browser carrying a sign-in on the other site. A visitor with no sign-in ends up on the same page anyway.
- **Redirect responses must never be cached or shared.** Send `Cache-Control: no-store` on `begin`, `approve` and `finish` and on the middleware's redirect, and `Vary: Cookie, Sec-Fetch-Site` where a page could be cached. Otherwise a cached redirect could be served to someone who shouldn't get it, or to a bot.
- **The trip's own addresses** are marked `noindex`, disallowed in `robots.txt` (`Disallow: /auth/`), and send `Referrer-Policy: no-referrer`.
- **I could not confirm Google's published guidance on conditional redirects.** The safeguard above (crawlers never redirected, same final content as a signed-out visitor) is the part that doesn't depend on it.

### 4.6 Safari tracking protection, Chrome, Firefox and in-app browsers

**Safari (the one to test hardest).** Safari's tracking protection counts how many different **top-level redirects** a domain performs, even delayed ones, and a domain it classifies as a tracker **with no real tap, click or typing on it in 30 days has all its stored data deleted**. Scrolling doesn't count as interaction. Separately, cookies written by *page scripts* are capped at 7 days without interaction, and cookies written by a script on a page reached via a tracking-style address (link decoration) are capped at 24 hours ([WebKit: Tracking Prevention](https://webkit.org/tracking-prevention/)).
- **Why we are probably OK:** both our domains are real destinations that people tap and type on. Classified or not, a domain people visit and click on within 30 days isn't wiped; and a classified domain that did get interaction "may have cookies rewritten to SameSite=Strict" instead, which would break the trip in a way the tests below must catch.
- **Why it's still a risk:** someone who only ever uses the new site for a month, and never taps on the old one, could have the old site's data deleted. The old site then answers "none" and the quiet check does nothing for them. They're still signed in on the site they use, because that site's own cookies are fresh.
- **Our mitigations:** keep the hop as small as possible (no extra redirect hops, no tracking-style parameters); set every sign-in cookie with a normal response header, not with a script (script cookies get the 7-day cap; Supabase's server code already refreshes by header on every request); keep both sites as real destinations.
- **What to measure:** after launch, count arrivals where the other site answered "signed in" versus "none" on Safari, compared with Chrome. A big gap means Safari is wiping data.
- **Chrome** has a similar "bounce tracking" cleanup. I couldn't read Google's documentation for it (the page returned an error), so treat it as the same class of risk and test it.
- **Firefox**: I did not confirm how it treats redirects; test it.
- **In-app browsers** (Instagram, Facebook, TikTok and similar): these keep their **own** cookie store, separate from Safari's, so a person clicking a link there is almost never signed in on the other site in that browser ([explainer, vendor source](https://link.boo/guides/in-app-browser-cookies-explained)). The check would cost time for nothing, so **skip it for the common in-app browser names** (`FBAN`, `FBAV`, `FB_IAB`, `Instagram`, and similar; these names are undocumented and can change). Sign-in on the page still works as normal.

### 4.7 Starting the session on B (the part to test)

Unchanged. On B's server, with the service-role key (already used for account deletion), `supabase.auth.admin.generateLink({ type: 'magiclink', email })` creates a one-time link **without sending an email**; take its `hashed_token` and call `supabase.auth.verifyOtp({ token_hash, type })` with B's cookie-writing server client. Source quality, the deprecated `magiclink` type, and the possible clash with an unused password-reset email are exactly as in the earlier version: community-sourced, test on `@supabase/supabase-js` 2.106.2 and `@supabase/ssr` 0.10.3 ([generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink), [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp), [community pattern](https://app.unpkg.com/nuxt-supabase-team-auth@0.5.0/files/src/runtime/server/utils/magicLinkSession.ts)). No other supported way to create a session for a user exists that I could find.

### 4.8 One sign-out that reaches both sites safely

**What Landon decided:** sign out once, out of both; no current-site-only option.

**What Supabase offers, and the catch:**
- Supabase's sign-out has three reaches: this session only (`local`), all *other* sessions, or **every session on every device** (`global`, the default). The admin version revokes the session tied to a **user's access token**, not to a user ID ([sign-out reference](https://supabase.com/docs/reference/javascript/auth-signout), [Swift admin reference](https://supabase.com/docs/reference/swift/auth-admin-signout)).
- A site can only revoke the *other* site's session if it has that session's token. We don't want to store tokens. And `global` would also sign the person out of their **phone and every other device**, which "both sites" doesn't mean.
- Supabase's documentation says an access token stays usable until it expires even after sign-out (the refresh token is what's revoked), so "signed out" isn't instant for anything that only reads the token. Our server checks (`getUser()` in the middleware and in the API routes; also `useUser`) do ask Supabase, and Supabase's sessions page says a session's removal can be detected by its `session_id` ([sessions](https://supabase.com/docs/guides/auth/sessions)). **Whether `getUser()` rejects a revoked session at once is something to test, not assume.**

**Recommended design: a link table of our own** (`session_links`), no tokens stored:
- When `finish` creates B's session, it records `a_session_id` (from the hand-off row), `b_session_id` (from the new session's token), the user, and the time. Sessions started the quiet way are "linked".
- **Sign-out on either site (call it X):**
  1. X ends its own session normally (`local`) and clears its cookies.
  2. X marks every link row for that session **revoked** (a plain update on our own table; fully supported).
  3. X sets a **`ff_signed_out` marker** on itself (below).
- **The other site (Y) sees the revocation on its next page load.** Y's middleware looks up its own session ID in `session_links` (an indexed lookup by one ID, run for **linked sessions only**). If the row is revoked, Y ends its own session with its own cookies and clears them, then shows the signed-out page. Same for Y's API routes, so alerts and "I own this" calls stop at once.
- **Safety net:** nothing else is needed for tabs left open on Y: the next click or page load triggers the lookup. A tab that sits idle stays showing signed-in until its next request, as with any logout.
- **No hop through the other site is needed at all**, so sign-out has no added delay and nothing to loop on. (An optional faster path, a one-time-ticket hop to Y that clears its cookies immediately, is possible but not required.)

**No resurrection.** Without a guard, signing out on A while B's session survives (idle tab, failed lookup) would let A's next quiet arrival check ask B, find B signed in, and sign the person straight back into A. Two guards:
1. **`ff_signed_out` marker** on the site you signed out of: disables the quiet check there until the person signs in on purpose (clears when they do; otherwise a 24-hour life).
2. **The revoked link** itself: `approve` refuses to answer "signed in" for a session whose link row is revoked.

**Other devices and the iPhone app:** signing out on the web does **not** sign out their phone, and the app (a separate browser world on one domain) is unaffected; nothing in this design signs out other devices. Landon should confirm that's what he wants (question B).

**What this does not do:** it doesn't kill a **stolen** session cookie on a device the person no longer holds; for that, Supabase's session limits (inactivity timeout, time-boxed sessions; Pro plans and up) are the tools ([sessions](https://supabase.com/docs/guides/auth/sessions)).

### 4.9 How much delay signed-out visitors see

My estimate, **not measured** (nothing is deployed yet):
- **Signed out everywhere (the common case):** two quick redirects, to A and back. `approve`'s "no cookie, send back" answer and `finish`'s `none` handling both run in the edge middleware with **no database call and no function start**. Expect roughly **0.1–0.4 seconds** once per visit, mostly the extra connection to the other domain, longer on a slow mobile link.
- **Signed in on the other site:** a database write, the `generateLink` and `verifyOtp` calls and a new session: roughly **0.5–1.2 seconds, once**, then never again that visit.
- **Everyone else:** nothing. Pages inside a site, return visits within 30 minutes, signed-in visitors, bots, previews and the iPhone app never pay it.
- **Page-speed scoring:** crawlers skip the trip, so search-engine measurements aren't affected, but real first-page times for signed-out arrivals rise by the amount above. Measure it with real visitors (the funnel table can count how often the trip runs and how often it ends in "none").

### 4.10 The table for the trip

Same locked-down style as the existing `apple_tokens` table. Name `auth_handoffs`: `code_hash` (unique), `user_id`, `challenge`, `target`, `a_session_id`, `created_at`, `expires_at`, `used_at`. Second table `session_links`: `user_id`, `a_session_id`, `b_session_id`, `created_at`, `revoked_at`. Both: row-level security **on with no policies**, all rights taken from `anon` and `authenticated`, service role only (like `supabase/migrations/20261101000000_apple_tokens.sql`), plus a `pg_cron` cleanup of old rows.

**Effort:** the arrival check, trip pages, link table and sign-out lookup are roughly **2 days** of agent work plus the testing in section 8, up from about one day before. Both directions use the same code.

---

## 5. Attack risks and what stops each (updated)

| # | Attack or problem | How it would work | What stops it |
|---|---|---|---|
| 1 | **Open redirect** | A forged link sends the person (and the code) elsewhere | Fixed list of our own origins; the remembered path lives in a cookie on the site, not in an address, and must start with `/` |
| 2 | **Sign-in forced onto the wrong account** (login CSRF) | Attacker gets their own code and tricks a victim into opening `finish` | The code only works for the browser holding the **verifier** cookie; the quiet check starts on the site the person is on, and never trusts a code that arrives without it |
| 3 | **Code stolen from the address** | History, logs, screenshots, Referer | 60 seconds, single use, bound to the verifier, `no-referrer`, immediate redirect away |
| 4 | **Replay** | Same code twice | One atomic "mark as used" update |
| 5 | **Guessing** | Random codes | 256-bit code stored only as a hash; rate limit |
| 6 | **Code for the wrong site** | A's code used on B | Row stores `target` and `challenge`; mismatch fails |
| 7 | **Framing** | `approve` in a hidden frame | "Don't allow framing"; `approve` only redirects |
| 8 | **Leaked service key** | The trip uses it | Server only, already required by account deletion |
| 9 | **Stolen refresh token** | A token in a log | Never moved between sites; each site has its own session |
| 10 | **Redirect loop** *(new)* | A page keeps bouncing between sites | The six stops in 4.3; tests prove none is endless |
| 11 | **Bots and crawlers sent on the trip** *(new)* | Wasted crawl, odd indexing | Fail closed on missing `Sec-Fetch-*` headers, user-agent list, never redirect crawlers |
| 12 | **Cached redirect served to the wrong person** *(new)* | A shared cache keeps a 307 | `no-store` on every redirect and trip page, `Vary` where needed |
| 13 | **Path and query leaked to the other site** *(new)* | Arrival URL (maybe a search) passes through A | The path stays in B's own cookie; A only sees the challenge and state |
| 14 | **Tabs racing** *(new)* | Two tabs arrive at once; the second overwrites the first's verifier cookie | Name the cookie with a short state suffix, clear on finish; a failed second tab lands signed out |
| 15 | **Resurrection after sign-out** *(new)* | Signing out on A, then a quiet check re-signs the person in from B | `ff_signed_out` marker plus revoked link (4.8) |
| 16 | **One site stays signed in after sign-out** *(new)* | Idle tab or failed lookup | Revoked link checked on Y's next request, for pages and APIs |
| 17 | **Sign-out of all their devices by mistake** *(new)* | Using global sign-out | Don't. Revoke by our own link table; revoke only the two linked sessions |
| 18 | **Browser tracking protection wipes the old site's data** *(new)* | Safari or Chrome treats us as a bounce tracker | Real destinations, header cookies, minimal hop, measured after launch (4.6) |
| 19 | **Privacy: recognising the person across our own sites** *(new)* | Quiet check links one browser to one account across both domains | They are one account by design; say so in the privacy policy (question C) |
| 20 | **Wildcard allow-list in Supabase** | A broad entry lets any site receive sign-in redirects | Exact addresses only (section 7) |

---

## 6. The iPhone app (unchanged, plus one rule)

**Keep the app on one domain**: it loads fieldsandfloors.com (`capacitor.config.json` → `server.url`), Foils & Fables is already served at `/fables`, and the side switch's link already goes to `/fables`. No trip, no check, no second login inside the app. Capacitor opens other websites in the external browser by default; `server.allowNavigation` is documented as not meant for production ([Capacitor config](https://capacitorjs.com/docs/config)).

**New rule:** the quiet check must **never run inside the app**. Add a marker to the app's browser name (Capacitor's `appendUserAgent` setting) and skip any request that carries it; also skip when the existing `isNativeApp()` test is true on the client. Sign in with Apple in the app is unaffected (native sheet, `signInWithIdToken`, fixed bundle ID, existing `fieldsandfloors.com/auth/callback`). The app's sign-out is separate from the web's (own cookie world).

---

## 7. What Landon would change (when the engine session is ready)

**Supabase** (Authentication → URL Configuration): Site URL stays `https://fieldsandfloors.com`; **Redirect URLs**: add the exact `https://foilsandfables.com/auth/callback` and the `www` version (and `.ca` only if it will host sign-in). **No broad wildcard** ([redirect URLs guide](https://supabase.com/docs/guides/auth/redirect-urls)). The trip itself uses our own redirects, so it needs no entry. Email templates: switch `{{ .SiteURL }}` to `{{ .RedirectTo }}` if confirmation and reset emails requested on the new site should return there. **SQL Editor:** paste the two new tables (4.10). Google and Apple sign-in point back to Supabase, so they need no change; add `foilsandfables.com` under Google's "Authorized domains" only if the consent screen's links point there.

**Vercel:** add the domains (`foilsandfables.com`, `www`, and the `.ca` pair), pick one primary, add the DNS records Vercel shows, redeploy. **No new environment variables** (the service-role key already exists).

**Don't change:** the refresh-token reuse setting, and don't enable any cookie "domain" option.

---

## 8. Checks for the engine session before shipping (updated)

**The trip itself**
1. `generateLink` then `verifyOtp` on our versions: working session, the right `type`, the hash field present.
2. Does generating the link **cancel an unused password-reset or magic-link email**? (unverified)
3. Does the person's session on each site survive three refreshes independently?
4. Replay a code, wait 61 seconds, change `state`, delete the cookie, use the other site's code: each fails cleanly, landing signed out.

**The quiet check**
5. **Loops:** cookies blocked; cookies cleared mid-trip; `finish` opened directly; `approve` opened directly; reload during the trip; Back and Forward buttons (including the browser's page cache); two tabs arriving at once; a deep link to `/watchlist` while signed in on the other site. None may loop, and the person always ends on the page they asked for.
6. **Once per visit:** second page inside the site doesn't trigger; return within 30 minutes doesn't; return after 30 minutes does; the switch always does.
7. **Bots:** plain `curl`, a fake Googlebot, Slackbot and Facebook preview fetch: all get the page with no redirect and nothing indexed from `/auth/*`. Confirm caches never keep a redirect.
8. **Browsers:** Safari iPhone and Mac, Chrome, Firefox, a private window, an Instagram or Facebook in-app browser (should skip), and the app's web view (must not run). On Safari, **age the test**: leave the old site untouched for 8–31 days and see whether the quiet check still finds the session.
9. **Arrival types:** typed address, bookmark, link from a chat app, link from a search result, the switch, an emailed magic link (must not trigger).

**Sign-out**
10. Sign out on A: B is out on its next page load and API call; the reverse. Idle tab. Sign out then **immediately** open the other site (no resurrection). Sign out with the other site closed, reopen after an hour.
11. **Does `getUser()` reject a revoked session straight away,** or only after the access token expires?
12. Signing out does **not** sign the person out on a second device or in the app.
13. A forced or forged sign-out link does nothing (no unsigned request can end someone's session).

**Measure**
14. Time to first page for signed-out and signed-in arrivals, with and without the trip, on a real phone over mobile data.
15. Handoffs aren't counted as "signed up" in the funnel table.

## Questions for Landon
A. **OK that the quiet check adds a short pause (about a third of a second, my estimate) to the first page of a visit** for people who aren't signed in on the other site? (It can be limited to people who've used the other site before, but then someone signed in only on the other site wouldn't be recognised on a first arrival.)
B. **"Sign out once, out of both": should that also sign the person out of their other devices and the iPhone app?** I recommend **no**: both sites in this browser only.
C. **Add one line to the privacy policy:** "If you're signed in on Fields & Floors, Foils & Fables recognises you in the same browser, and the reverse." OK?
D. **Fallback:** if Safari tracking protection or the Supabase session step can't be proven in testing, ship with sign-in once per site? (Your earlier decision; asking so it's confirmed for launch.)

## Sources (read 2026-11-06)
- MDN: Set-Cookie https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie · Sec-Fetch-Site https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site
- WebKit Tracking Prevention (bounce tracking, 30-day, 7-day and 24-hour rules): https://webkit.org/tracking-prevention/
- Supabase: sessions https://supabase.com/docs/guides/auth/sessions · redirect URLs https://supabase.com/docs/guides/auth/redirect-urls · generateLink https://supabase.com/docs/reference/javascript/auth-admin-generatelink · verifyOtp https://supabase.com/docs/reference/javascript/auth-verifyotp · signOut https://supabase.com/docs/reference/javascript/auth-signout · admin signOut (Swift) https://supabase.com/docs/reference/swift/auth-admin-signout · OAuth server https://supabase.com/docs/guides/auth/oauth-server
- Community pattern (generateLink then verifyOtp): https://app.unpkg.com/nuxt-supabase-team-auth@0.5.0/files/src/runtime/server/utils/magicLinkSession.ts · issues https://github.com/supabase/gotrue/issues/1357, https://github.com/supabase/auth/issues/2538
- In-app browser cookie behaviour (vendor explainer, unofficial): https://link.boo/guides/in-app-browser-cookies-explained
- Capacitor config: https://capacitorjs.com/docs/config
- DECISIONS.md ("One login across both sites", 2026-11-06). In the repo: lib/domains.js, middleware.js, app/auth/callback/route.js, lib/supabaseClient.js, lib/supabaseServer.js, lib/useUser.js, lib/native.js, app/components/SideSwitch.js, capacitor.config.json, supabase/migrations/20261101000000_apple_tokens.sql
- **Not read or not confirmed:** Chrome's bounce-tracking documentation (page error); Firefox's redirect handling; Google's guidance on conditional redirects for crawlers.
