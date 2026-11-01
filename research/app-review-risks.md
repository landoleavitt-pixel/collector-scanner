# App Review risk audit: "Fields & Fables" iPhone app

*Research only, 2026-11-01. No code was changed.*

**What I reviewed:**
- Apple's **App Review Guidelines, last updated 16 October 2026** (developer.apple.com/app-store/review/guidelines), plus Apple's support page "Offering account deletion in your app".
- APP_STORE_LISTING.md, IOS_APP_SETUP.md and DECISIONS.md.
- The app code: `capacitor.config.json`, `lib/native.js`, `app/api/account/delete/route.js`, the watchlist and subscribe pages, and the privacy page.

**The app:** a Capacitor shell that loads fieldsandfloors.com. It opens on a choose-your-side screen, then has a switch at the top, push alerts, Sign in with Apple or email, free early access and no purchases.

## The short version: fix these before submitting

| # | Risk | Guideline | Rank | Change before submitting |
|---|---|---|---|---|
| 1 | Game logos and artwork in screenshots and on the Foils & Fables side | 5.2.1 | **High** | Pick screenshots with no game logo as the subject. Keep game names out of all metadata (already done). Have a written answer ready. |
| 2 | "Just a website" / "content aggregator" | 4.2, 4.2.2 | **High** | Make sure push alerts **actually fire for the reviewer** (seed the demo account). Spell out the native features in the notes. Optionally add one more native touch (share sheet or haptics). |
| 3 | **Account deletion doesn't revoke Sign in with Apple** | 5.1.1(v) + Apple's deletion guidance | **Medium–High (a real gap)** | Call Apple's revoke endpoint when an account that used Sign in with Apple is deleted. About half a day of agent work. |
| 4 | "Upgrade" wording with nothing to buy | 2.1, 3.1.1 | **Medium (a real gap)** | Hide the "Every 15 minutes" option and its "Faster alerts need an upgrade" note while payments are off. Make `/subscribe` send people home while payments are off. |
| 5 | Features changing without review (the app loads the live site) | 2.5.2, 2.3.1(a) | **Medium** | Submit only when both sides are live. Never switch payments on in the app until an update with in-app purchase is approved. |
| 6 | Anonymous usage events with no in-app opt-out | 5.1.1(ii) | **Low–Medium** | Add an "anonymous usage stats" off switch in Account, or don't record funnel events inside the app. |
| 7 | Permission to show eBay listings | 5.2.2 | **Low** | Keep proof ready: eBay developer account, API licence acceptance, production keys. |
| 8 | Metadata | 2.3.7 | **Low** | The current listing passes. Keep prices and game names out of the name, subtitle, keywords and screenshot captions. |
| 9 | Sign in with Apple | 4.8 | **Low** | Not strictly required (we use our own accounts; Google is hidden in the app), but offered anyway. Keep it if Google ever returns to the app. |
| 10 | Push used for marketing | 4.5.4 | **Low** | Alerts are requested by the member. Never send promotional pushes without a separate opt-in. |
| 11 | **Later:** paid alerts | 3.1.1, 3.1.2, 3.1.3 | **Low now, rules for later** | In-app purchase only inside the app (RevenueCat is ready). Don't link to web checkout from the app. |

**The two real gaps are 3 and 4.** Each is a small, specific code change. Risks 1 and 2 are judgement calls by the reviewer: we can lower them but not remove them.

---

## 1. Game trademarks and artwork (5.2.1) — High

**Apple's text (5.2.1):** "Don't use protected third-party material such as trademarks, copyrighted works, or patented ideas in your app without permission, and don't include misleading, false, or copycat representations, names, or metadata in your app bundle or developer name."

**Why it's a risk:**
- The Foils & Fables side shows eBay sellers' photos of Pokémon, Magic and other cards, which carry game logos and artwork. Filter labels name the games.
- Reviewers judge mostly from screenshots and metadata, and a screenshot full of a famous game's art invites a "show us your permission" message.

**What's already right:**
- No game names in the app name, subtitle, keywords, description or captions.
- A not-affiliated line, and game names used only as plain filter labels.
- The screenshot rule in `appstore/screenshots/README.md` ("No game names, logos or mascots as the subject of a shot").

**Change before submitting:**
1. **Screenshots:** follow the README rule strictly. For the game-side shots, choose searches whose top photos are graded slabs or card backs and corners rather than big logo art. The chooser, filters and rarity views make good game-side shots with little artwork. Don't edit or blur listing photos: screenshots must show the real app (2.3).
2. **App icon and splash:** keep the F&F monogram, never a card or a creature.
3. **Ready answer if asked** (already in section 6 of the listing): names are used only to describe what eBay sellers list, the photos are sellers' own photos shown through eBay's official API, and there's no logo use and no affiliation claim.
4. **If Apple insists:** the fallback is to send the game side's listing photos as small thumbnails, or to submit screenshots of only the sports side. Don't remove the filters.

## 2. Minimum functionality / web wrapper (4.2, 4.2.2) — High

**Apple's text:**
- 4.2: "Your app should include features, content, and UI that elevate it beyond a repackaged website. If your app is not particularly useful, unique, or 'app-like,' it doesn't belong on the App Store."
- 4.2.2: "Other than catalogs, apps shouldn't primarily be marketing materials, advertisements, web clippings, content aggregators, or a collection of links."

**Why it's a risk:**
- The app is a remote-website shell (`server.url: https://fieldsandfloors.com`).
- Its content is eBay listings, which a reviewer could call a "content aggregator" or "a collection of links", since tapping a listing goes to eBay.

**What helps:**
- Native **push alerts** for saved searches and bid reminders: the strongest reason to exist as an app.
- Native **Sign in with Apple**, native splash and status bar, an offline page, the side chooser and switch, a pill tab bar, and in-app account deletion.
- Our own value on top of eBay: rarest-first ranking, rarity tiers, filters, watchlist and alerts.

**Change before submitting:**
1. **Make push visible in review.**
   - The demo account's saved searches should be broad enough to match new listings within a few hours (for example a popular player or card with no price cap), so a notification arrives while the reviewer is testing.
   - Set one bid reminder on an auction that ends during the review window.
   - Say in the notes that alerts arrive within the hour.
2. **Ask for notification permission at a sensible moment** (when someone turns on an alert), not on first launch. That way the reviewer sees why the app wants it.
3. **The notes already list the native features.** Keep that list, and lead with "Push notifications are the core feature".
4. **Optional, cheap extras** that make it feel more app-like if we want more margin: the native share sheet for a card (Capacitor Share plugin) and light haptics on star or save. Not required, but they're the usual answer to a 4.2 rejection.

## 3. Account deletion and Sign in with Apple (5.1.1(v)) — Medium–High, a real gap

**Apple's text (5.1.1(v)):** "If your app supports account creation, you must also offer account deletion within the app."

**Apple's support page ("Offering account deletion in your app"):** "Apps that support Sign in with Apple should use the Sign in with Apple REST API to revoke user tokens."

**What we have:**
- `app/api/account/delete/route.js` cancels Stripe, deletes the member's rows and then deletes the Supabase user. The in-app path is Account → Delete account, confirmed by typing DELETE MY ACCOUNT. That's fine: Apple allows a confirmation step.
- **But nothing calls Apple's revoke endpoint.** No code anywhere in the project mentions it. Supabase doesn't do this automatically.

**Change before submitting** (agent work, about half a day):
1. When someone signs in with Apple in the app, keep Apple's authorization code long enough to exchange it for a refresh token on the server, and store that token privately.
2. On deletion, if the account used Apple, call `https://appleid.apple.com/auth/revoke` with that token. This uses a client secret signed by the Sign in with Apple key from IOS_APP_SETUP.md section 2.3.
3. If the revoke call fails, still delete the account and log the failure. Deletion must never be blocked.

**Privacy and security note:** the refresh token is a credential. Store it server-side only (Supabase, row-level security, not readable by the browser) and delete it with the account.

## 4. "Upgrade" wording when nothing can be bought (2.1, 3.1.1) — Medium, a real gap

**Apple's text:**
- 2.1(a): submissions should be final, with "placeholder text, empty websites, and other temporary content … scrubbed before submission".
- 3.1.1: "If you want to unlock features or functionality within your app … you must use in-app purchase."

**What I found** (with payments off, `NEXT_PUBLIC_PAYMENTS_LIVE` unset):
- **Watchlist page:** everyone can use alerts, so the alert-frequency control (`app/components/NotifyFrequency.js`) appears for every member. It lists **"Every 15 minutes"** with an upgrade note, and shows **"Faster alerts need an upgrade."** if tapped. It's unlocked only for founding members. 15-minute alerts are deferred (DECISIONS, 2026-10-31), and there's nothing to buy. A reviewer who taps it sees a feature locked behind a purchase that doesn't exist.
- **`/subscribe`** (`app/subscribe/page.js`) isn't gated by the payments switch. The Header still routes free native members there from the account menu (`app/components/Header.js` line 91), and it would show plans with no products configured.

**Change before submitting:**
1. Hide the 15-minute option and every upgrade note while payments are off. Simplest: drop the `pro` option from the list unless payments are live.
2. Make `/subscribe` redirect to the home page while payments are off, and don't route anyone there from the Header in that state.
3. Check by searching the live site, with payments off, for "upgrade", "subscribe", "trial" and "plan" on every page a signed-in app member can reach.

## 5. Features changing without review (2.5.2, 2.3.1(a)) — Medium

**Apple's text:**
- 2.5.2: apps may not "download, install, or execute code which introduces or changes features or functionality of the app".
- 2.3.1(a): "All new features, functionality, and product changes must be described with specificity in the Notes for Review section".

**Why it matters:** the app shows whatever fieldsandfloors.com serves. Apple accepts web content in a shell, but **big feature changes that appear without review** can lead to removal. Examples: switching on payments, adding a new side or launching the card checklist.

**Change before submitting:**
1. Submit only when **both sides** are live and match the notes. The reviewer must be able to do every step written there.
2. **Never switch payments on in the app** until an app update with the in-app purchase products has been approved. Apple reviews in-app purchase products with a build anyway.
3. For later big features (the card checklist, "every version" search), send an app update with a "What's New" line and notes, even if no native code changed.

## 6. Consent for anonymous usage events (5.1.1(ii)) — Low–Medium

**Apple's text:** "Apps that collect user or usage data must secure user consent for the collection, even if such data is considered to be anonymous … Apps must also provide the customer with an easily accessible and understandable way to withdraw consent."

**What we have:**
- First-party funnel events under a random device ID, skipped when the browser sends Do Not Track or Global Privacy Control.
- Disclosed in the privacy policy and the App Privacy label (Product Interaction, linked).
- **No in-app switch** to turn them off. Do Not Track and Global Privacy Control signals don't come from the iOS app shell.

**Change before submitting (pick one):**
- **(a)** Add "Share anonymous usage stats" (on by default, with a one-line explanation) in Account, and honour it; or
- **(b)** Don't record funnel events inside the native app at all. That's the simplest, but app numbers would then be missing from the funnel.

Reviewers rarely enforce this for first-party analytics. I recommend (a) as cheap insurance.

## 7. Permission to show eBay content (5.2.2) — Low

**Apple's text:** "If your app uses, accesses, monetizes access to, or displays content from a third-party service, ensure that you are specifically permitted to do so under the service's terms of use. Authorization must be provided upon request."

**We're covered:** we use eBay's official Browse API under eBay's developer licence, with clear "not affiliated with eBay" wording and no eBay logo.

**Change:** none to the app. Keep a screenshot of the eBay developer account showing production keys and the accepted API Licence Agreement, ready to send if asked. The listing already answers "third-party content: Yes". If card catalogs (Scryfall, TCGdex, YGOPRODeck, Lorcast) go live, name them in the notes and keep their terms links handy (research/catalogs-phase-2.md).

## 8. Metadata (2.3.7) — Low

**Apple's text:** "don't try to pack any of your metadata with trademarked terms, popular app names, pricing information, or other irrelevant phrases… Metadata such as app names, subtitles, screenshots, and previews should not include prices, terms, or descriptions that are not specific to the metadata type… [subtitles] should not … reference other apps, or make unverifiable product claims."

**Checked against APP_STORE_LISTING.md:**
- **Name, subtitle and keywords** contain no trademarks and no prices. "Find rare sports & game cards" is a plain description.
- **"Free during early access"** sits only in promotional text and the description, which is allowed. Keep it out of screenshot captions (pricing in screenshots is the 2.3.7 problem).
- **Category:** Shopping (primary) and Sports (secondary) are accurate.

**Change:** none, except to keep the captions free of "free" and prices.

## 9. Sign in with Apple (4.8) — Low

**Apple's text:** apps that use "a third-party or social login service (such as … Google Sign-In …) to set up or authenticate the user's primary account … must also offer as an equivalent option another login service" that limits data to name and email, lets users hide their email, and doesn't track for ads. It's not required when "your app exclusively uses your company's own account setup and sign-in systems."

**Our situation:**
- In the app, sign-in is email and password (our own system) plus Sign in with Apple. Google is hidden. So 4.8 isn't strictly triggered, and offering Apple is still good practice.
- **Change:** none. If Google ever returns to the app, Sign in with Apple must stay alongside it, given equal prominence. Pair this with fix 3 (revocation).

## 10. Push notifications (4.5.4) — Low

**Apple's text:** "Push Notifications must not be required for the app to function … should not be used for promotions or direct marketing purposes unless customers have explicitly opted in … and you provide a method in your app for a user to opt out."

**Our situation:** search, watchlist and saved searches all work without push. Alerts and bid reminders are things the member sets up. **Change:** none now. Never send "new feature" or "upgrade" pushes without a separate marketing opt-in.

## 11. Later: when alerts become paid (3.1.1, 3.1.2, 3.1.3) — rules to follow

**Apple's text:**
- 3.1.1: "If you want to unlock features or functionality within your app … you must use in-app purchase."
- 3.1.3: other purchase methods can't be promoted inside the app "except for apps on the United States storefront and as set forth in 3.1.1(a)". For the US, entitlements "are not required for developers to include buttons, external links, or other calls to action". This is the post-2025 US exception.
- 3.1.2(a): a subscription "must provide ongoing value … and the subscription period must last at least seven days and be available across all of the user's devices."
- Physical cards bought on eBay are covered by 3.1.3(e) ("physical goods or services that will be consumed outside of the app") and never go through in-app purchase.

**What to do when payments go live:**
1. **In the app, sell Base only through Apple in-app purchase** (RevenueCat is built in). This is already decided (DECISIONS, 2026-10-19).
2. **No links or buttons to web checkout in the app**, not even for US users. Landon's main market includes Canada, where the US exception doesn't apply. One rule everywhere is simpler and safe.
3. **Members who subscribed on the website** may use Base in the app (3.1.3(b), multiplatform), because Base is also sold as an in-app purchase.
4. **The purchase screen** must show price, renewal period, the 14-day free trial and what's included, plus a Restore Purchases button and links to Terms and Privacy. Prices must match the website (DECISIONS).
5. **Free card lists and paid alerts** (DECISIONS, 2026-10-31) fits Apple's rules: alerts are ongoing value across devices.
6. **Deleting an account with an Apple subscription:** we can't cancel it for them. The delete dialog already tells them to cancel in Settings (IOS_APP_SETUP.md, "Known risks").
7. Ship payments as an **app update** with "What's New" text and review notes (see item 5 above).

---

## Checklist for the Boss

- [ ] **Fix 3:** revoke Sign in with Apple tokens on account deletion. Agent, about half a day. Needs the Sign in with Apple key already listed in IOS_APP_SETUP.md.
- [ ] **Fix 4:** hide the 15-minute and upgrade wording and gate `/subscribe` while payments are off. Agent, about 1 hour.
- [ ] **Fix 6:** add an "anonymous usage stats" switch in Account, or skip funnel events in the app. Agent, about 1 hour.
- [ ] **Demo account** (Landon): broad saved searches on both sides, so a push alert arrives during review, plus one bid reminder on an auction ending soon.
- [ ] **Screenshots:** game-side shots without a logo as the subject; no prices or game names in captions.
- [ ] **Submit only when both sides are live.** Payments stay off in the app until an in-app purchase update is approved.

## Sources (read 2026-11-01)
- Apple App Review Guidelines (last updated 16 October 2026): https://developer.apple.com/app-store/review/guidelines/ — sections 2.1, 2.3.1, 2.3.7, 2.5.2, 3.1.1, 3.1.1(a), 3.1.2, 3.1.3, 3.1.3(b), 3.1.3(e), 4.2, 4.2.2, 4.5.4, 4.8, 5.1.1(i), (ii) and (v), 5.2.1, 5.2.2
- Apple, "Offering account deletion in your app": https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Apple, revoke tokens (Sign in with Apple REST API): https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens
- Project files: APP_STORE_LISTING.md, IOS_APP_SETUP.md, DECISIONS.md, capacitor.config.json, lib/native.js, app/api/account/delete/route.js, app/components/NotifyFrequency.js, app/watchlist/page.js, app/subscribe/page.js, app/components/Header.js, app/privacy/page.js, appstore/screenshots/README.md
