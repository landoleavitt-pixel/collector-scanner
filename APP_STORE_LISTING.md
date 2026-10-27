# App Store Listing: Fields & Floors (free early access)

Everything for App Store Connect, ready to copy and paste. This is for the **first release: free early access, no in-app purchases**. Each box below is the exact text to paste. Character counts are checked against Apple's limits.

Where to paste: App Store Connect → your app → the version under **iOS App** (text, screenshots, review notes), **App Information** (name, subtitle, category, age rating), and **App Privacy** (privacy answers).

> **Before you start:** never paste real passwords into this file. The demo account details go straight into App Store Connect only (section 4).

---

## 1. Name, subtitle, text

### App name (30 max)

| Option | Length |
|---|---|
| `Fields & Floors` | 15 |
| `Fields & Floors: Card Hunter` | 28 |

**Recommended: `Fields & Floors: Card Hunter`.** Words in the name count toward App Store search, and nobody searching for us yet knows the brand. "Card" is the word people actually type. The home screen icon label still shows the short name, because that comes from the app itself, not from this field.

### Subtitle (30 max, 28 used)

```
Numbered cards, rarest first
```

### Promotional text (170 max, 141 used)

You can change this any time without a new review.

```
Free during early access. Search live eBay listings for numbered sports cards, sorted rarest first, and get alerts on up to 5 saved searches.
```

### Description (4,000 max, about 1,500 used)

```
Fields & Floors is a search tool for collectors hunting numbered sports cards on eBay.

Type a player, team or set and see live eBay listings sorted rarest first, so a /5 shows up before a /299. Every result is tagged by print run: Grail (/1 to /25), Ultra (/26 to /99), Rare (/100 to /249) and Scarce (/250 and up).

WHAT YOU CAN DO
- Pick the print runs you want in one search
- Filter by price, card company, team and autographs
- Hide lots, repacks and sealed product (on by default)
- Open any card to see how rare its print run is, using the set's colour list where we have one
- Star cards to keep them on your watchlist, with the latest price and status
- Save a search and get a push notification or email when a new matching card is listed
- Set bid reminders for auctions you are watching: 3 hours, 1 hour, 30, 15 or 5 minutes before the end, with an optional "only if the bid is under $X"

FREE DURING EARLY ACCESS
Everything is free while we are in early access, including alerts on up to 5 saved searches and bid reminders. There are no purchases in the app.

HOW BUYING WORKS
We don't sell cards. Tapping a listing opens it on eBay, and you buy from the seller there. We don't inspect or guarantee cards, and our labels come from listing titles, so they can be wrong. Always check the listing before you bid.

Sign in with Apple or email. You can delete your account at any time from the Account menu.

Fields & Floors is independent and is not affiliated with, endorsed by or sponsored by eBay Inc.
```

### Keywords (100 max, 99 used)

No spaces after commas (spaces waste characters). Words already in the name or subtitle (cards, numbered, rarest) are left out because Apple counts them anyway.

```
sports,baseball,basketball,football,hockey,rookie,parallel,serial,autograph,grail,collector,auction
```

Left out on purpose: brand names such as eBay, Topps, Panini and Prizm. Apple's guideline 2.3.7 forbids other companies' trademarks in keywords, and it is a common rejection reason.

### What's New (version 1.0)

```
First release. Free during early access.
```

---

## 2. Category, age rating, links

### Category
- **Primary: Shopping.** The app finds items to buy, and buying happens on eBay.
- **Secondary: Sports.**

### Age rating
Answer **None / No** to every content question (violence, sexual content, profanity, horror, alcohol/drugs, gambling, contests, medical, and so on). For the capability questions:

| Question | Answer | Why |
|---|---|---|
| Unrestricted web access | **No** | The app only loads fieldsandfloors.com. eBay listings open in Safari, outside the app. |
| User-generated content | **No** | Members can't post anything other people see. |
| Messaging or chat | **No** | |
| Advertising | **No** | |
| Parental controls / age assurance | **No** | |

Expected result: **4+**.

> Unsure: listing photos and titles come from eBay sellers, not from us. They are trading-card photos, and eBay moderates them. We think "No" to user-generated content is correct because our members can't publish anything. If Apple disagrees, the change is to answer "Infrequent" for it, which may raise the rating.

### URLs

| Field | Paste |
|---|---|
| Support URL | `https://fieldsandfloors.com/contact` |
| Marketing URL | `https://fieldsandfloors.com/` |
| Privacy Policy URL | `https://fieldsandfloors.com/privacy` |

### Other fields
- **Copyright:** `2026 Fields & Floors Collectors`
- **Price:** Free. **In-App Purchases:** none for this version.
- **Content rights:** "Does your app contain, show, or access third-party content?" → **Yes**. It shows eBay listings through eBay's official Browse API, under eBay's developer terms.

---

## 3. App Privacy questionnaire

App Store Connect → **App Privacy** → **Get Started**.

**"Do you or your third-party partners collect data from this app?"** → **Yes.**

Then tick these data types. For every one: **Used for tracking: No.** We share nothing with advertisers or data brokers, so the app does not need the "Allow tracking?" prompt.

| Data type (Apple's name) | What it is for us | Linked to the user? | Purpose(s) to tick |
|---|---|---|---|
| **Contact Info → Email Address** | Sign-in, account emails, alert emails | **Yes** | App Functionality |
| **Identifiers → User ID** | The account ID that holds saved searches, watchlist and alerts | **Yes** | App Functionality, Analytics |
| **Identifiers → Device ID** | The push notification token Apple gives the device, so we can send alerts | **Yes** | App Functionality |
| **Usage Data → Product Interaction** | Funnel steps (visited, searched, opened a card, starred, signed up), plus page-view counts | **Yes** (see note) | Analytics |
| **Search History** | The words and filters in searches a member **saves**, so we can alert them | **Yes** | App Functionality |
| **User Content → Other User Content** | The watchlist (starred listings) and bid reminder settings | **Yes** | App Functionality |

**Do not tick:** Purchases, Financial Info, Location, Contacts, Health, Photos, Name, Phone Number, Physical Address, Browsing History, Advertising Data, Sensitive Info.

**Purchases → none for now.** Nothing is bought in this version. When paid plans go on, come back and add **Purchases → Purchase History**, linked, App Functionality.

### Things to know (flagged)

1. **Product Interaction: we chose "linked", the cautious answer.** Most funnel events are anonymous (a random ID on the device, no name, email or search words). But two events, "signed up" and "started a trial", are stored with the account ID. Saying "not linked" would be only partly true, so "linked" is the safe answer. It doesn't change anything users see beyond one line in the privacy label.
2. **Search History and Other User Content were not on the original list.** We added them because the app stores saved search words and the watchlist against the account (the privacy policy says so too). Leaving them off would make the label incomplete. One-off searches that aren't saved are sent to eBay to get results and not kept with the account, so they don't need declaring.
3. **Push token as "Device ID".** Apple doesn't have a category made for push tokens. Declaring it as Device ID is the cautious choice and is what many apps do.
4. **Server logs.** Our hosting (Vercel, Supabase) keeps short-lived technical logs that include IP addresses, for security and fixing errors. We don't use them to work out location or to profile anyone, so we haven't declared them. If you'd rather be fully cautious, add **Diagnostics → Other Diagnostic Data**, not linked, App Functionality.
5. **RevenueCat is built into the app but switched off.** The in-app purchase code only starts when its key is set, and that key isn't set during early access, so it collects nothing. Don't declare it now. When it's switched on, update the label (see the Purchases line above).
6. **Name.** Sign in with Apple can share a name, but the app doesn't ask for or store it. Google sign-in (which does share a name and photo) is hidden in the app. So Name is not ticked.

---

## 4. App Review information

### Sign-in required: Yes

| Field | Fill in |
|---|---|
| User name | `[DEMO ACCOUNT EMAIL: Landon creates this]` |
| Password | `[DEMO ACCOUNT PASSWORD: type it into App Store Connect only, never into this file]` |

**How to make the demo account (Landon):** on fieldsandfloors.com, sign up with a new email you own that you use only for this (for example a new address under your own domain). Then, signed in as that account, add 2 or 3 saved searches with alerts on (e.g. "Wembanyama", "Ohtani") and star 2 or 3 cards, so the reviewer sees a filled-in watchlist and alerts page. Everyone gets 5 alerts during early access, so the account doesn't need any special plan.

### Contact information
Your name, phone and email (App Store Connect asks for these separately; they are only seen by Apple).

### Notes (paste into "Notes")

```
Fields & Floors is a search tool for collectors of numbered sports cards. It uses eBay's official Browse API to show live eBay listings, sorted rarest first by print run, and tags each card by print run.

The app is free during early access. There are no in-app purchases and no paid plans in this version. We don't sell anything: tapping a listing opens it on eBay in Safari, and the member buys from the seller on eBay. Fields & Floors is not affiliated with eBay.

Native features:
- Push notifications: when a new listing matches a saved search, and bid reminders before an auction a member is watching ends (3 hours to 5 minutes before).
- Sign in with Apple (email and password also offered).
- A native tab bar: Search, Watchlist, Alerts, Account.
- Account deletion: Account tab, then Delete account. It permanently deletes the account and its data.

How to test with the demo account:
1. Sign in from the Account tab.
2. Search tab: search a player such as "Wembanyama" and tap a card to see how rare its print run is.
3. Tap the star on a card to add it to the Watchlist, and set a bid reminder on an auction.
4. Alerts tab: see the saved searches with alerts on. New matches arrive as push notifications.

Privacy policy and terms are linked at the bottom of every page and at https://fieldsandfloors.com/privacy.
```

> Check before pasting: the deletion path above ("Account tab, then Delete account") matches the current app. The screen asks the person to type DELETE MY ACCOUNT to confirm. If the button wording changes, update this line.

---

## 5. Screenshots

Files are in `appstore/screenshots/`. Upload them in the numbered order.

| Folder | App Store Connect slot | Size |
|---|---|---|
| `appstore/screenshots/6.9/` | iPhone 6.9" Display | 1320 × 2868 |
| `appstore/screenshots/6.5/` | iPhone 6.5" Display | 1284 × 2778 |

| # | Shows |
|---|---|
| 1 | Home: search first, "The Grail Hunter." |
| 2 | Search results, rarest first with tier tags |
| 3 | Card popup with the rarity ladder |
| 4 | Watchlist with bid reminders |
| 5 | Alerts: saved searches |

Apple only requires the 6.9" set; it scales it down for smaller iPhones. The 6.5" set is there in case App Store Connect asks for it.

**Status:** shots 1 to 3 are done (taken on the live early-access version). Shots 4 and 5 (watchlist, alerts) need the signed-in demo account from section 4; steps are in `appstore/screenshots/README.md`. Apple accepts 1 to 10 screenshots, so you can submit with 3 if needed.

---

## 6. What a reviewer might object to, and our answer

**Guideline 4.2, Minimum functionality ("this is just a website").**
Our answer: the app has native push alerts for saved searches and bid reminders, Sign in with Apple, a native tab bar, and account deletion. The alerts are the main reason to have the app: they reach the member on their phone the moment a matching card is listed or an auction is about to end. If Apple still pushes back, the next step is more native features (for example a home screen widget of watched auctions), not arguing.

**Guideline 5.2.1 / 5.2.2, Using eBay's name and content.**
Our answer: we use eBay's official Browse API under eBay's developer terms, we say clearly that we are not affiliated with eBay, and we don't use eBay's logo or put "eBay" in the app name, subtitle or keywords. The description mentions eBay only to say where listings come from.

**Guideline 3.1.1, In-app purchase.**
Our answer: nothing is sold in the app. Cards are physical goods bought from sellers on eBay, outside the app, which Apple allows (guideline 3.1.3(e), goods used outside the app). There are no paid plans in this version.

**Guideline 5.1.1(v), Account deletion.**
Our answer: Account tab → Delete account, inside the app. It deletes the account right away.

**Guideline 4.8, Sign in with Apple.**
Our answer: offered. Google sign-in is hidden in the app.

**Guideline 2.1, App completeness / demo account.**
Our answer: the demo account in the review notes already has saved searches and starred cards, so every screen has something on it.

**Guideline 1.5 / 2.3, Accurate metadata.**
Our answer: screenshots are of the real app with real current eBay listings. Nothing is mocked up.
