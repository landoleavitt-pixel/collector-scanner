# Review-day playbook: make sure Apple's reviewer gets a push alert

*For Landon. Written 2026-11-01. Doc only, no code changed.*

**Why this matters:** Apple's biggest objection to our app will be "this is just a website" (guideline 4.2; see research/app-review-risks.md). Push alerts are our best answer, but only if one actually arrives on the reviewer's iPhone while they're testing. This plan sets up the demo account so that a new-listing alert and a bid reminder arrive on **both sides** (Fields & Floors and Foils & Fables).

**How alerts work (so the steps make sense):**
- Our server checks every saved search with alerts on **once an hour**. Any listing the account hasn't been told about yet goes out as one push (and one email).
- Bid reminders are checked **every 5 minutes** and sent at the times you pick (3 hours, 1 hour, 30, 15 or 5 minutes before the auction ends).
- Pushes go to **every iPhone signed in to the account**: yours during setup, and the reviewer's once they sign in and allow notifications.

> ⚠️ **One blocker, fixed in code by an agent first.** Today the app only asks for notification permission if the account is a paying member (or a founding member). During free early access, the demo account and every other member would **never be asked**, so no push could reach them. The Boss has this flagged for the engine/app agent. **Step 4 below checks it.** If the "Allow notifications" question doesn't appear, stop and tell the Boss. Don't submit.

> 🔒 **Privacy and security:** the demo account gets its own new email and a password **you make up yourself**. Keep the password in your password manager and type it **only** into App Store Connect. Never paste it into a chat, an email to us, or any file in the project. The account should hold nothing personal: no real name, no purchases, nothing about you.

---

## Part 1. Two or three days before you submit

### Step 1. Make a new email just for review
1. Create a new email address you control and use only for this (for example a new iCloud "Hide My Email" address or a new Gmail).
2. Write down only the **email** somewhere handy. The password comes in step 2.

### Step 2. Create the demo account on the website
1. On your computer, go to **fieldsandfloors.com** and sign up with the new email and **email + password**. Don't use Sign in with Apple: the reviewer needs a password they can type.
2. Make up a strong password and save it in your password manager under "Fields & Fables – App Review".
3. Confirm the email when the message arrives.

### Step 3. Install the build you'll submit
1. Install the app on your iPhone from **TestFlight**, using the exact build you plan to submit.
2. Open it, pick either side, go to the **Account** tab and sign in with the demo account.

### Step 4. Turn on push (this is the check for the blocker)
1. After signing in, the app should ask **"Fields & Fables would like to send you notifications"**. Tap **Allow**.
2. **If no question appears within a minute:** stop here and message the Boss: "No push prompt on the demo account." Don't submit until it's fixed.
3. Double-check on the iPhone: **Settings → Notifications → Fields & Fables → Allow Notifications** is on, with Lock Screen, Notification Centre and Banners ticked.
4. If you ever tapped "Don't Allow" by mistake, switch it on in that same Settings screen.

### Step 5. Set up 4 broad saved searches with alerts on
Broad searches with **no price limit** get new eBay listings every hour, so there's always something new to alert on. Use **4 of the 5** alert slots and leave 1 free, so the reviewer can try turning one on themselves.

For each search: type it, leave the filters at their defaults (any price, lots and sealed hidden), tap **Save search**, and make sure the **alert bell is on**.

| # | Side | Search exactly | Filters to set | Why |
|---|---|---|---|---|
| 1 | Fields & Floors | `Shohei Ohtani` | none (any price) | One of the most-listed players; new cards go up all day |
| 2 | Fields & Floors | `Victor Wembanyama` | none (any price) | A second sport, so the reviewer sees variety |
| 3 | Foils & Fables | `Charizard` | Game: Pokémon | The most-listed card on eBay (over 200,000 live listings) |
| 4 | Foils & Fables | `Pikachu` | Game: Pokémon | A second high-volume search on the games side |

Then:
1. Open the **Alerts** tab and check all 4 are listed with the bell on, 2 under each side.
2. If there's an alert-frequency setting, choose **Hourly**, not a daily or weekly digest.
3. **Expect a burst the first hour.** The first check sends everything already listed, because none of it has been "told" yet. That's why this happens days before you submit: by review day, only genuinely new listings trigger alerts.

### Step 6. Star auctions ending during the review window
Apple usually starts a review within 1–2 days of submitting, and we can't know the exact hour. So spread several auctions over the next few days. One of them will almost always end while the reviewer is looking.

On **each side**:
1. Search something popular (the same searches as step 5 are fine).
2. Pick **3 auctions** (cards showing a time left, not "Buy It Now"), ending roughly:
   - **A:** about 1 day after you plan to submit
   - **B:** about 2 days after
   - **C:** about 3 days after
3. Tap the **star** on each to add it to the Watchlist.
4. Open **Watchlist**, tap each starred auction, tap **Set a reminder**, tick **3 hours, 1 hour and 30 min**, and leave the price limit empty. Each auction then gives three chances to land in front of the reviewer.

That's 6 auctions and up to 18 reminders spread over three days.

### Step 7. Test it yourself before submitting
1. Wait at least **1 hour** after step 5 (ideally overnight).
2. On your iPhone you should see:
   - a push like "New match for Shohei Ohtani" (or similar) from **each side**;
   - tapping it opens the right side (sports alerts open Fields & Floors, game alerts open Foils & Fables).
3. If you set an auction ending within the next few hours, check its reminder push arrives on time.
4. If nothing arrives after 2 hours, tell the Boss before submitting. The Boss can check the server's alert log.

---

## Part 2. Submitting

### Step 8. Fill in App Review Information in App Store Connect
1. **Sign-in required:** Yes.
2. **User name:** the demo email.
3. **Password:** type it in from your password manager. Don't paste it anywhere else.
4. **Notes:** paste the text below exactly.

```
Fields & Fables is a search tool for card collectors. It has two sides, chosen on a screen when the app opens: Fields & Floors (sports cards) and Foils & Fables (trading card games). A switch at the top moves between them, and one account covers both. It uses eBay's official Browse API to show live eBay listings, ranked rarest first.

The core feature is push notifications. Please allow notifications when the app asks after you sign in.
- New-listing alerts: the demo account has 4 saved searches with alerts on (2 per side). Our server checks them every hour, so a push for a newly listed card should arrive within about an hour of signing in. Tapping it opens the matching side.
- Bid reminders: the demo account's Watchlist has auctions ending over the next few days, each with reminders 3 hours, 1 hour and 30 minutes before the end.

The app is free during early access. There are no in-app purchases and no paid plans in this version. We don't sell anything: tapping a listing opens it on eBay in Safari, and the member buys from the seller on eBay. Fields & Fables is not affiliated with eBay or with any card maker or game publisher. Game names appear inside the app only as plain filter labels, to describe which listings a member wants to see.

Other native features: Sign in with Apple (email and password also offered), a side chooser on launch, a switch at the top, a native tab bar (Search, Watchlist, Alerts, Account), and account deletion (Account tab, then Delete account; it permanently deletes the account and its data).

How to test with the demo account:
1. Pick either side on the opening screen. Sign in from the Account tab and allow notifications.
2. Search tab: search a player (sports side, e.g. "Shohei Ohtani") or a card name (game side, e.g. "Charizard") and tap a card to see how rare it is.
3. Tap the star on a card to add it to the Watchlist. Open the Watchlist and tap "Set a reminder" on an auction.
4. Alerts tab: see the saved searches with alerts on. One alert slot is free if you'd like to turn on your own.
5. Use the switch at the top to move to the other side; the Watchlist and Alerts show both sides.

Privacy policy and terms are linked at the bottom of every page and at https://fieldsandfloors.com/privacy.
```

5. **Submit early in your day** (a weekday morning is best). Reviews often start within a day.

---

## Part 3. Each morning until it's approved

Takes about 5 minutes.

### Step 9. Morning check
1. **Phone check:** were there new-listing pushes from **both** sides in the last few hours? (Your phone is still signed in to the demo account, so it works as an early warning.)
2. **Alerts tab:** do the 4 searches still have their bells on?
3. **Watchlist:** is there still at least one starred auction **ending in the next 24 hours** with a reminder set?
   - If not, star a new one ending within the next 1–2 days and set reminders (3 hours, 1 hour, 30 min), as in step 6.
   - Remove auctions that have ended, so the Watchlist looks tidy for the reviewer.
4. **Website check:** open fieldsandfloors.com and /fables on your phone. Both load, and a search returns cards.
5. **Status:** in App Store Connect, the status is "Waiting for Review" or "In Review". If it changes to **"Rejected"** or a message arrives, forward the exact message to the Boss and don't reply to Apple until we've drafted the answer.
6. **If no pushes arrived overnight:** tell the Boss right away. The Boss checks that the hourly and 5-minute server jobs are running.

### Things *not* to do during review
- Don't change the demo account's password, delete it, or turn alerts off.
- Don't sign the demo account in on extra devices (every device gets the pushes, which is harmless but noisy).
- Don't switch payments on or make big changes to the website while the app is in review. The reviewer must see what the notes describe.

---

## Part 4. After approval

1. On your iPhone, **sign out of the demo account** (Account tab → Sign out). That removes your phone's push token from it.
2. **Keep the account.** Every future app update needs a demo account, so re-use it: just refresh the starred auctions before each submission.
3. Remove ended auctions from its Watchlist. The saved searches can stay.

---

## One-page checklist

- [ ] Agent fix shipped: the app asks for notification permission during free early access (checked in step 4)
- [ ] New email made; demo account created on the website with email + password (password only in your password manager)
- [ ] Signed in on your iPhone in the TestFlight build; notifications **allowed**
- [ ] 4 saved searches with alerts on: Shohei Ohtani, Victor Wembanyama (sports); Charizard, Pikachu with Game: Pokémon (games); frequency Hourly; 1 slot left free
- [ ] 6 auctions starred (3 per side) ending about 1, 2 and 3 days after submitting, reminders at 3 hours, 1 hour and 30 min
- [ ] Waited an hour or more: pushes arrived from both sides and open the right side
- [ ] App Review notes pasted; demo email and password typed into App Store Connect only
- [ ] Each morning: pushes still arriving, an auction ending within 24 hours, both sites loading
- [ ] After approval: sign out of the demo account on your phone and keep the account for next time
