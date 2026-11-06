# Carrying one sign-in between fieldsandfloors.com and foilsandfables.com

*Research only, 2026-11-06. No code changed. Written for Landon and for Design (the "What the person sees" section is what a mockup needs).*

## The short version

**The problem:** the two sites are on different domains, and a browser keeps a site's sign-in in a cookie that **only that domain can read**. So being signed in on fieldsandfloors.com does nothing on foilsandfables.com, even though both use the same Supabase accounts.

**Recommendation:** a **one-time hand-off code**, with the *new* site asking the *old* site, not the other way round.
- No sign-in token ever appears in a web address. Only a short random code does. It works once, expires in 60 seconds, and is useless unless it comes back to the same browser that asked for it.
- It uses only things we already have (Supabase, our own server, one small database table). No new service, no cost.
- It runs only when the person **taps the side switch**. It never runs on its own in the background.

**Two things to decide that aren't about the code:**
1. **iPhone app:** keep the app on **one domain** (fieldsandfloors.com, with Foils & Fables at its `/fables` page, which already works). Then the app needs no hand-off at all. Details in section 6.
2. **Fallback if this isn't ready at launch:** people sign in once on each site. It's the same account, so nothing is lost. It's a little annoying but safe, and needs no engineering. Section 3, option E.

**The one thing I could not confirm from Supabase's own documentation:** the exact steps for the server to start a fresh session for a person ("generateLink" then "verifyOtp") come from community code, not an official Supabase guide. The engine session must test it on our installed versions before building on it. Section 4 lists the checks.

---

## 1. What the person sees (for the mockup)

| Moment | What happens on screen |
|---|---|
| **Signed in on Fields & Floors, taps "Foils & Fables" in the switch** | A calm one-line screen on foilsandfables.com: "Taking you to Foils & Fables…" It shows for under a second, then the Foils & Fables page opens, signed in. Their saved searches and starred cards are there. |
| **Not signed in on Fields & Floors, taps the switch** | Straight to Foils & Fables, signed out, exactly as a first-time visitor. No error, no extra screen. |
| **Hand-off fails** (expired, opened twice, wrong browser) | They land on Foils & Fables **signed out**, with the normal "Sign in" button and one quiet line: "Please sign in again." Never an error wall or a code on screen. |
| **Signing out** | Signs out of **this site only** by default. A separate "Sign out of everywhere" link is optional (see section 5). Say which one it is on the button. |
| **From the front page (floorsandfables.com)** | No sign-in there, so nothing carries. It only links to the two sides. |

**Never show** a code, a token or a long address to the person. The only thing in the address bar is the normal page.

---

## 2. Why the easy ways don't work

| Idea | Why not |
|---|---|
| **Share the cookie** | Not possible. A site can only set a cookie for its own domain or a parent of it, never for an unrelated domain ([MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)). `fieldsandfloors.com` and `foilsandfables.com` are unrelated. Setting a cookie "domain" option only helps sites that are subdomains of one domain. |
| **Put the sign-in token in the address** (`…?token=…`) | Web addresses leak: they land in browser history, server logs, analytics, and the "Referer" header sent to other sites. Anyone who sees the address can sign in as that person. The brief rules this out, and so do I. |
| **Pass the refresh token to the other site** | Supabase gives each refresh token one use. Using it twice (outside a 10-second window) is treated as theft and **ends the whole session on both sites** ([Supabase sessions](https://supabase.com/docs/guides/auth/sessions)). Two sites cannot share one session. Each site needs its own. |
| **Hidden frame / third-party cookie** | Browsers block or limit this kind of cookie. It also fails quietly on iPhone. Avoid. |
| **Make Supabase the "sign in with" provider** (its OAuth 2.1 server) | It's the standard way to sign in from *another company's* app, with a consent screen and client registration, and was in public beta when last documented ([Supabase OAuth server](https://supabase.com/docs/guides/auth/oauth-server)). Too heavy for two of our own sites, and it would still leave us building a session on the other domain. Not recommended. |

---

## 3. The options

| Option | What it is | Safety | Effort | Verdict |
|---|---|---|---|---|
| **A. Hand-off code, new site asks old site (recommended)** | Section 4 | High | About 1 day of agent work plus testing | **Do this** |
| B. Hand-off code, old site pushes to new site | Site A makes a code and sends the person to B | **Weaker**: an attacker can send a victim a link that signs them into the *attacker's* account | Same | No (see attack 2) |
| C. Refresh token moved between sites | | Breaks both sessions | | No |
| D. Token in the web address | | Leaks | | No |
| **E. Sign in separately on each site** | Same Supabase account, two sign-ins (Apple, email or Google) | High | **None** | **Good fallback** if A slips. Tell people "same account on both sides" |

---

## 4. The recommended design (option A)

Both sites are **one app**, one database, one Supabase project. That makes this simple: the sites don't need to call each other, only share a table.

### The flow ("the new site asks the old one")
Here **B** is the site the person is *going to* (for example foilsandfables.com), and **A** is the site they're *coming from* and are signed in on.

1. **Person taps the switch on A.** It's a plain link to `B/auth/handoff/begin?next=/fables`.
2. **B's `begin` page** (first-party, on B):
   - makes a random secret, the **verifier**, and a random **state**;
   - puts both in a short-lived cookie on B (`HttpOnly`, `Secure`, `SameSite=Lax`, 2 minutes);
   - sends the browser to `A/auth/handoff/approve?challenge=<hash of verifier>&state=<state>&to=fables` .
3. **A's `approve` page** (on A, where the sign-in cookie lives):
   - **not signed in** → sends the browser straight back to B with `?none=1` and nothing else;
   - **signed in** → makes a random **code** (32 bytes), stores only its **hash** in a new table with the person's ID, the `challenge`, which site it's for (`to`), and an expiry 60 seconds away; then sends the browser to `B/auth/handoff/finish?code=<code>&state=<state>`.
4. **B's `finish` page**:
   - checks `state` matches the cookie, and that the cookie's verifier hashes to the stored `challenge`;
   - **redeems the code in one atomic step**: set `used_at` where the hash matches, it's unused, unexpired, for this site, and the challenge matches. If zero rows change, it fails (see "failed" in section 1);
   - on success, starts a **new** Supabase session **on B's server** (below), which writes B's own cookies;
   - clears the hand-off cookie and redirects to a **validated relative path** (`next`), so the address bar shows only the normal page.

The Supabase token never travels through the browser address. Only our own opaque code does, and it's useless on its own.

### Starting the session on B (the part to test)
- On B's server, with the service-role key (already used for account deletion), call `supabase.auth.admin.generateLink({ type: 'magiclink', email })`. This creates a one-time link **without sending an email**.
- Take its `hashed_token` and call `supabase.auth.verifyOtp({ token_hash, type })` using B's normal cookie-writing server client. That signs the person in on B and sets B's cookies.
- Our callback already does the second half: `app/auth/callback/route.js` calls `verifyOtp` with `token_hash` and `type`.
- **Source quality:** the pattern is in community projects ([example](https://app.unpkg.com/nuxt-supabase-team-auth@0.5.0/files/src/runtime/server/utils/magicLinkSession.ts)). Supabase's reference page for `generateLink` only says it "generates email links and OTPs to be sent via a custom email provider" and doesn't document the returned fields. The official `verifyOtp` reference lists `magiclink` as deprecated and points to `email`, so the engine must pick the type that works on our versions (`@supabase/supabase-js` 2.106.2, `@supabase/ssr` 0.10.3) ([verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp)).
- **No other supported way** to create a session for a user exists that I could find. Supabase has no "create session as this user" call.

### The new table (SQL for Landon to paste into the Supabase SQL Editor)
Name: `auth_handoffs`. Same locked-down style as the existing `apple_tokens` table:
- columns: `code_hash` (unique), `user_id`, `challenge`, `target` ('sports' or 'fables'), `created_at`, `expires_at`, `used_at`;
- row-level security **on with no policies**; all rights taken from `anon` and `authenticated`; only the service role can use it (exactly like `supabase/migrations/20261101000000_apple_tokens.sql`);
- a cleanup job (Supabase `pg_cron`) deleting rows older than an hour.

### Rules for the hand-off pages
- Fixed list of allowed sites in code (`lib/domains.js` already has the origins). **Never** build a redirect from the request's own host or from a `return` value.
- `next` must be a relative path starting with `/` (the existing callback already does this check: reject `//`, `\\`).
- Headers on `begin`, `approve` and `finish`: `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `X-Robots-Tag: noindex`, and "don't allow framing".
- Don't log the `code` in our own logs. Vercel logs the web address, so keep the code's life short (60 s) and single-use; that's why it's safe to appear there.
- A hand-off must **not** be counted as "signed up" in funnel numbers (the callback calls `recordSignedUp`; this route shouldn't).
- Rate limit `finish` (the existing `lib/rateLimit.js` is per server instance, which is fine here because a code has 256 bits of randomness and can't be guessed).

### Effort
About a day for the engine session (3 routes, 1 table, tests), plus Landon's settings in section 7. Both directions (fables→sports and sports→fables) use the same code.

---

## 5. Attack risks and what stops each

| # | Attack | How it would work | What stops it |
|---|---|---|---|
| 1 | **Open redirect** | A forged link sends the person (and the code) to an evil site | Fixed allow-list of our own origins; `next` must be a relative path |
| 2 | **Sign-in forced onto the wrong account** ("login CSRF") | Attacker gets their *own* code and tricks a victim into opening the `finish` link, so the victim ends up signed in as the attacker and puts saved searches and "I own this" lists into the attacker's account | The code only works for the browser that holds the **verifier** (the cookie set on B in step 2). The attacker can't plant that cookie. This is why the new site must start the exchange (option A, not B) |
| 3 | **Code stolen from the address** | Seen in history, logs, a shared screenshot or the Referer header | 60-second life, single use, bound to the verifier, `Referrer-Policy: no-referrer`, immediate redirect away |
| 4 | **Replay** | Same code used twice | One atomic "mark as used" update; second attempt fails |
| 5 | **Guessing** | Try random codes | 256-bit random code stored only as a hash; rate limit |
| 6 | **Code meant for the wrong site** | A code made for site A is used on B | The row stores `target` and the `challenge`; mismatch fails |
| 7 | **Framing / click-jacking** | `approve` page loaded in a hidden frame | "Don't allow framing" header; approve only redirects, shows nothing to click |
| 8 | **Leaked service key** | The hand-off uses the service-role key | Server only (never in browser code). It's already required by account deletion, so no new exposure |
| 9 | **One session stolen from a log** | Someone sees a refresh token | We never move refresh tokens. Each site makes its own session. Supabase also ends a session if a refresh token is reused ([sessions](https://supabase.com/docs/guides/auth/sessions)) |
| 10 | **Sign-out confusion** | Person signs out on one site and thinks they're out everywhere | Label the button. Optional: "Sign out of everywhere" using Supabase's global sign-out ([signOut reference](https://supabase.com/docs/reference/javascript/auth-signout)) |
| 11 | **Browser "bounce" tracking rules** | Safari and Chrome clear storage for sites that only redirect | Low risk: both sites are ones the person visits and uses; the redirect happens only on a tap, not in the background |
| 12 | **Wildcard allow-list in Supabase** | A broad entry like `https://**` lets any site receive sign-in redirects | Use exact addresses (section 7). Supabase itself says to avoid broad wildcards in production ([redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)) |

---

## 6. The iPhone app

**Recommendation: keep the app on one domain.**
- The app is a shell that loads **fieldsandfloors.com** (`capacitor.config.json` → `server.url`). Foils & Fables is already served there at **`/fables`**, and the side switch's "Foils & Fables" link already points to `/fables`. In the app, both sides can live on one domain with **no hand-off at all**.
- **Why not load foilsandfables.com inside the app:**
  - Capacitor opens other websites in the **external browser** by default; only hosts in `server.allowNavigation` stay inside, and Capacitor's own docs say that setting isn't meant for production ([Capacitor config](https://capacitorjs.com/docs/config)). Sign-in would also be a separate cookie jar there.
  - It adds the hand-off to the one place where App Review is strictest. Keeping the app on its own domain also keeps the reviewer on a site that is plainly ours.
- **What the engine must do:**
  - In the app (`isNativeApp()`), the switch stays on `/fables` of the current domain (don't send app users to the other domain).
  - Notifications keep opening `/fables?…` and `/?…` on the app's domain.
  - On the web, `fieldsandfloors.com/fables` should point search engines to `foilsandfables.com/fables` (canonical link) so the same page isn't listed twice.
- **Sign in with Apple in the app** is unaffected: it uses the native sheet and `signInWithIdToken`, with the app's own fixed ID (`com.fieldsandfloors.app`) and the existing `fieldsandfloors.com/auth/callback` address. It doesn't use the new domain at all.
- If Landon later wants the app to load foilsandfables.com anyway: add it to `server.allowNavigation`, run the same hand-off inside the app's web view, and re-check App Review. I'd treat that as a separate decision.

---

## 7. What Landon would change (when the engine session is ready)

**Supabase dashboard** (Authentication → URL Configuration):
1. **Site URL:** leave as `https://fieldsandfloors.com`.
2. **Redirect URLs:** add the exact addresses where sign-in can finish on the new site: `https://foilsandfables.com/auth/callback` and `https://www.foilsandfables.com/auth/callback` (and the `.ca` versions only if those domains will host sign-in). **No broad wildcard.** The hand-off itself doesn't use Supabase's redirects, so it needs no entry; only Google, email links and password resets started on the new site do.
3. **Email templates** (Authentication → Email templates): confirmation, magic-link and password-reset emails use `{{ .SiteURL }}`, so a reset requested on foilsandfables.com would email a link to fieldsandfloors.com. Either leave that (the person signs in on the sports site, then taps the switch) or switch the templates to `{{ .RedirectTo }}` ([redirect URLs guide](https://supabase.com/docs/guides/auth/redirect-urls)). The engine session would pass the right `emailRedirectTo` per site.
4. **SQL Editor:** paste the `auth_handoffs` migration the engine session writes (the same way as earlier migrations).
5. **pg_cron:** the cleanup job comes with that SQL.
6. **Check, probably no change:** Google (Google Cloud Console) and Apple (Apple Developer) both send people back to Supabase's own address, not to our sites. Only add `foilsandfables.com` under Google's "Authorized domains" if the consent screen's home page or privacy link will point there.

**Vercel:**
1. Project → Settings → Domains: add `foilsandfables.com`, `www.foilsandfables.com` and the `.ca` pair, then make `www` redirect to the bare domain (or the reverse, but pick one).
2. At the domain registrar, add the DNS records Vercel shows.
3. Environment variables: **no new ones needed.** `SUPABASE_SERVICE_ROLE_KEY` already exists. Keep `NEXT_PUBLIC_SITE_URL` as the sports site.
4. Redeploy after the domains are added.

**Do not change:** the Supabase refresh-token reuse setting (leave the default 10 seconds), and don't enable any "cookie domain" option.

---

## 8. Checks for the engine session before shipping

1. `generateLink` (magiclink) then `verifyOtp` on **our** versions: does the person get a working session, which `type` string works, and is the returned hash field present?
2. Does generating the link **cancel an unused password-reset or magic-link email** the person just asked for? (The pattern may share one slot per user; I did not confirm this, so test it.)
3. Does the person's session survive 3 refreshes on **both** sites, and does signing out on one leave the other signed in?
4. Replay the same code twice, wait 61 seconds, change `state`, remove the cookie, use the other site's code: each must fail cleanly, with the person landing signed out.
5. Safari (iPhone and Mac), Chrome and Firefox, plus the app's web view to confirm it's untouched.
6. Confirm hand-off visits don't appear as "sign-ups" in the funnel table.

## Questions for Landon
A. **OK that the iPhone app stays on one domain** (fieldsandfloors.com, with Foils & Fables at `/fables` inside it)? This avoids the hand-off in the app entirely.
B. **If the hand-off isn't finished by launch,** is "sign in once on each site" acceptable for the first weeks? (Same account both sides; a short note on the Foils & Fables sign-in page.)
C. **Should "Sign out" on one site also sign out the other,** or only the site you're on? I recommend only the current site, with an optional "Sign out of everywhere".

## Sources (read 2026-11-06)
- MDN, Set-Cookie (Domain, SameSite, Secure, HttpOnly): https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
- Supabase sessions and refresh-token reuse: https://supabase.com/docs/guides/auth/sessions
- Supabase redirect URLs and wildcards: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase `generateLink`: https://supabase.com/docs/reference/javascript/auth-admin-generatelink · `verifyOtp`: https://supabase.com/docs/reference/javascript/auth-verifyotp · `signOut`: https://supabase.com/docs/reference/javascript/auth-signout
- Community pattern (generateLink then verifyOtp): https://app.unpkg.com/nuxt-supabase-team-auth@0.5.0/files/src/runtime/server/utils/magicLinkSession.ts · related issues: https://github.com/supabase/gotrue/issues/1357, https://github.com/supabase/auth/issues/2538
- Supabase OAuth 2.1 server: https://supabase.com/docs/guides/auth/oauth-server
- Capacitor config (`server.allowNavigation`): https://capacitorjs.com/docs/config
- In the repo: lib/domains.js, middleware.js, app/auth/callback/route.js, lib/supabaseClient.js, lib/supabaseServer.js, lib/native.js (native Apple sign-in), app/components/SideSwitch.js, capacitor.config.json, supabase/migrations/20261101000000_apple_tokens.sql
