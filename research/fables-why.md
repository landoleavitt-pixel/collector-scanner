# Why would a card-game collector use Foils & Fables?

*Research only, 2026-11-01. No code changed. Read-only visits to public pages and app-store listings; nothing signed in or bypassed.*

## The short version

**Our working answer** ("Tell us the card you want. We show every version for sale, cleanly grouped by how rare it really is, with the junk hidden; we alert you only for the ones you're missing.") **is a real gap, but only in its combination, and the strongest parts aren't the ones in the middle of the sentence.**

- **Strong, and I found no competitor that does it:** *Every version, for sale on eBay, with the wrong cards removed,* plus *alerts that skip the versions you already own.* The alert piece is already built in the alert checker (`ownedVersionsFor` in the poller).
- **Real but secondary:** *grouped by how rare it really is.* It helps newcomers read a page of results, but collectors who hunt a specific version already know what they want. It shouldn't be the headline.
- **Weak as a reason on its own:** *cleaner than eBay.* TCGplayer already gives every printing its own page for raw modern cards. We win where eBay is the only real market: graded, vintage, Japanese and high-end cards.

**Top 3 reasons, in a newcomer's words:**
1. "I typed the card once and saw every version, so I didn't have to guess which set it was from."
2. "It's only the real card. No lots, no fakes, no other Pokémon with a similar name."
3. "It tells me when one I *don't* have shows up, and ignores the ones I own."

**The single most important thing to get right: the version label has to be right.** The whole promise ("this is the one you want") rests on it, and our own test fell short: 93.0% right against a 95% target (research/card-family-test.md). When we aren't sure, say so ("version not named", "as listed by seller") instead of guessing.

---

## 1. What collectors use today

**How good is this evidence?** Reddit threads weren't reachable by the searches I could run, so I did not read them. What I used: official help pages, app-store listings, fee pages, eBay's community forum, and complaint summaries on Trustpilot and BBB. Several summaries were machine-written and are marked low reliability. Treat the "frustrations" column as themes, not counts.

| Tool | What it does well | What frustrates people | Free or paid |
|---|---|---|---|
| **eBay (search and saved searches)** | The biggest supply: about 20 million Pokémon card singles listed in the category, and the main market for graded, vintage and Japanese cards. Saved searches email you; the official notifications page also lists saved searches as an app, email or SMS alert ([eBay help](https://www.ebay.com/help/buying/search-tips/saved-searches?id=4051), [notifications](https://www.ebay.com/help/account/changing-account-settings/notifications?id=4203)) | **Finding one version:** the results mix lots, other cards and fakes. Foreign variants can need the native-language name ([Elite Fourum](https://www.elitefourum.com/t/how-to-list-foreign-variants/19986)). Proxies are sometimes sold as the real card ([Elite Fourum](https://www.elitefourum.com/t/proxy-being-mistaken-for-an-actual-card-1st-ed/28556?tl=ja)). **Alerts:** community answers say saved-search emails come once a day, and many threads say they stop arriving ([eBay Community](https://community.ebay.com/t5/Report-eBay-Technical-Issues/No-longer-receiving-daily-e-mail-alerts-for-saved-searches/m-p/34020904/highlight/true)). I couldn't confirm a current official frequency or search limit | Free |
| **TCGplayer** | One product page per printing, with prices by condition and many sellers. Strong for raw, modern, English singles | Multi-seller carts mean several parcels; some buyers report shipping charged at checkout after "shipping included" and cards that didn't match the listed condition ([Trustpilot](https://jp.trustpilot.com/review/tcgplayer.com), [BBB](https://prod.bbb.org/us/ny/syracuse/profile/games/tcgplayer-0041-235983801/customer-reviews)). Japanese cards sit in a separate product line and Japanese characters aren't supported in search ([TCGplayer help](https://help.tcgplayer.com/hc/en-us/articles/26336064030615-Listing-Japanese-Pokemon-Products-FAQ)) | Free to browse; sellers pay a 10.75% commission plus fees ([TCGplayer fees](https://help.tcgplayer.com/hc/en-us/articles/201357836-Fees)) |
| **Cardmarket** | Pokémon listings carry language, reverse holo, signed, first edition and altered-art attributes ([Cardmarket help](https://help.cardmarket.com/en/finding-and-listing-pokemon-cards)), the clearest version labelling I found | Mainly a European market; I couldn't confirm buying rules for US or Canadian buyers. One forum report of cards arriving worse than "Mint" | Free to browse |
| **Collectr** | Portfolio value across many games, graded and sealed included; price alerts ("Price Alerts are here!"); a sold-listings button. 4.9 rating from 69K ratings ([App Store](https://apps.apple.com/us/app/collectr-tcg-collector-app/id1603892248)) | A reviewer says free scanning is limited; reports of inaccurate prices and missing high-end Yu-Gi-Oh! cards ([review summary](https://justuseapp.com/en/app/1603892248/collectr-tcg-collector-app/reviews), low reliability). No wishlist mentioned in its description | Free; Pro is $7.99 a month or $59.99 a year |
| **PriceCharting** | Collection tracker and wishlist are free. The paid tier adds **deal alerts for wishlist items listed on eBay below market price**, downloadable set checklists and "Watchtower" (filters by grade and discount) ([plans](https://www.pricecharting.com/pricecharting-pro)). The closest rival to our alert idea | Its alerts are about **price**, not about which version you're missing. Its data is licensed for internal use only, so it can't be shown in other apps ([API terms](https://www.sportscardspro.com/api-documentation)) | Collector $6 a month or $59 a year; Legendary $49 a month |
| **Dex and Pokellector** (checklist apps) | Know every card in every set and let you tick what you own. Pokellector marks missing cards, with no prices or scanner ([comparison, competitor site](https://tcgalbum.com/en/blog/pokemon-karten-apps-vergleich)). Dex: free, unlimited owned and bookmarked cards, camera scanning ([Dex](https://dextcg.com)) | Scanning described as slow or inaccurate (Dex). **Neither shows what's for sale now or alerts you when a missing card appears** (I found no sign of either) | Free with paid upgrades (Pokellector subscriptions; Dex in-app purchase; prices not confirmed) |
| **Third-party eBay alert tools** (for example uBuyFirst, AutomatedSearches) | Faster, custom alerts on eBay searches | Built for power users and resellers; paid desktop-style tools ([vendor pages](https://ubuyfirst.com/?p=3975), marketing only) | Paid |

**What this tells us:**
- **Checklist apps know the versions but not the market.** Marketplaces know the market but not the versions. Nobody I found joins the two.
- **The nearest rival to the alert idea is PriceCharting's deal alerts,** which trigger on price below market, not on "this is a version you're missing".
- **Everyone's price features are covered:** Collectr, PriceCharting and TCGplayer own prices. Our price-history hold (DECISIONS, 2026-10-22) is the right call. Don't compete there.

---

## 2. Testing the working answer, claim by claim

| Claim | Is it a real gap? | Evidence | What's missing |
|---|---|---|---|
| **"Tell us the card you want"** | Yes | eBay's results need the right words (set, language, number). Checklist apps start from the card, not from a typed search box on a live market | A very simple first screen: type a card, see versions. Today the "every version" view is Pokémon only |
| **"We show every version for sale"** | **Yes, our strongest point** | No competitor I found lists the versions of a card with live eBay listings under each. Our test caught 97.5% of real listings (research/card-family-test.md) | Version coverage: Japanese Pokémon has gaps (18% of real listings had no version), Magic is ready, Yu-Gi-Oh! and Lorcana come later, One Piece has no catalog |
| **"Cleanly grouped by how rare it really is"** | Partly | Printed names mislead (Super Rare is about 1 pack in 2–3; Legendary is far more common than Enchanted; research/fables-rarity-tiers.md). Newcomers can't read these ladders | This is a *help for reading*, not a reason to switch. Pull rates are community estimates, so the copy must say so |
| **"With the junk hidden"** | **Yes** | For plain-name searches like Charizard, Mewtwo or Iono, **64–80 of the first 100 eBay results were a different card** (research/card-family-test.md). Lots, sealed product and proxies were another 13% (Pokémon) to 12% (One Piece) of listings (research/fables-filters-2.md) | Still 93% right, not 95%. Fakes ("Play Test", "altered art") and stamped promos got through. Fixes are in progress |
| **"We alert you only for the ones you're missing"** | **Yes, nothing similar found** | The alert checker already skips listings of versions a member has marked as owned (poller, `ownedVersionsFor` / `onlyOwned`). eBay emails every match once a day (community reports); PriceCharting's alerts key off price | Make sure the screen offers it plainly ("only tell me about the ones I don't have"). Only works once "I own this" is filled in, which is manual work for the member |

**Where we are *not* better, and shouldn't pretend to be:**
- **Raw, modern, English singles:** TCGplayer's one-page-per-printing is already easy. Our edge there is small.
- **Buying:** we send people to eBay; the shipping, condition and seller risk are eBay's.
- **Price and collection value:** Collectr and PriceCharting.

**Where we are clearly better:** eBay-only territory.
- eBay is the main market for graded cards: graded was 60% of tracked sales in Collectr's report, and GemRate counted $837M of card-game singles on eBay in 2025 (research/non-sports-filters.md).
- Vintage, Japanese, alternate-art and high-end cards are mostly found on eBay too.

### What would make a newcomer or a grandparent say "this is easier than eBay"
1. **One box, one question:** "Which card?" No filter rows on the first screen; the grandparent test says to keep them behind "More filters". (I did not review the live first screen, so check how far it already does this.)
2. **Pictures first, words second:** each version shown as a small card picture (the seller's photo) with a plain label, such as "Base Set · Holo" or "Japanese · 2021". No codes or hobby words.
3. **A one-line promise on every result:** "This is the right card" or "We think this is the right card". No guessing in silence.
4. **A way to say "I have this one":** one tap on a version.
5. **"Tell me when I don't have it" as the default alert,** not a settings page.
6. **Plain rarity words** (Common to Extremely rare) only as a quiet tag, never as the sorting you have to understand.

---

## 3. Recommendations

### The top 3 reasons to use us (newcomer's words, in order)
1. **"I typed the card once and saw every version for sale."** *(solves: not knowing which set or which printing)*
2. **"Only the real card shows up."** *(solves: lots, fakes, similar names)*
3. **"It alerts me when one I don't have shows up."** *(solves: checking eBay every day)*

Keep "how rare it really is" as a small helper under reason 1, not a fourth headline.

### The single most important thing to get right
**Version accuracy, shown honestly.**
- Why: a wrong label sends someone to bid on the wrong card (a Base Set Charizard and a reprint can differ by hundreds of dollars). Trust is the product.
- Where we stand: 93.0% right against a 95% target; Japanese (18% of real Pokémon listings) mostly unlabelled; fakes and promos leaking through (research/card-family-test.md).
- What "right" looks like: a clear fallback wording whenever we're unsure ("Japanese printing, version not named", "as listed by seller"), already decided in DECISIONS (2026-10-31). Hold the launch bar at the 95% mark on a fresh re-test (about 41 eBay calls), and show the confidence to the user rather than hiding it.

### What to stop doing (or not start)
1. **Stop leading with "rarity".** Publishers don't publish print runs or pull rates, and collectors hunting a version don't think in tiers. Use rarity as a quiet tag.
2. **Don't build price history, value tracking or a portfolio.** Collectr, PriceCharting and TCGplayer own that, and eBay's terms and our own hold rule it out.
3. **Don't promise "every version" for games we can't back.** One Piece has no clean catalog (research/catalogs-phase-2.md). Say "filters" there, not "every version".
4. **Don't treat Foils & Fables as a copy of the sports side.** Sports has print runs; card games have versions, languages and finishes. Keep the same interactions (decided) but not the same words.
5. **Don't hide the sign-in step behind a long first screen.** The first thing a newcomer should see is the search box and a result.
6. **Don't add filters faster than we check labels.** Each new filter (research/fables-filters-2.md) is another place to be wrong. Prefer eBay's own fields (Card Condition, shipping, offers) that are exact.

### Honest uncertainties
- **Demand isn't measured.** I found no count of how many collectors want "every version" or "alerts for the missing ones". The market is large (see above), but this is an argument, not a survey.
- **Checking for competitors is hard to prove.** "No one does X" means I didn't find it in the tools above. It's worth five conversations with collectors.
- **Cheap tests to run next:**
  - Show the version view to 5–10 collectors (including one over 60) and watch whether they find the right version without help.
  - After launch, count how many saved searches use a specific version and how many members tick "I own this" (anonymous funnel counts only, per DECISIONS).

---

## Questions for Landon
A. **Lead with** "see every version for sale, and get told only about the ones you're missing" rather than rarity? (My recommendation.)
B. **First screen:** OK to open on just the search box and hide the game and filter rows behind "More filters" for newcomers?
C. **Collector chats:** can you ask 5–10 collectors you know (including a grandparent) to try the version view for ten minutes?

## Sources (read 2026-11-01)
- eBay saved searches and notifications: https://www.ebay.com/help/buying/search-tips/saved-searches?id=4051 · https://www.ebay.com/help/account/changing-account-settings/notifications?id=4203 · eBay Community threads on daily emails: https://community.ebay.com/t5/Report-eBay-Technical-Issues/No-longer-receiving-daily-e-mail-alerts-for-saved-searches/m-p/34020904/highlight/true
- Collectors' eBay problems: https://www.elitefourum.com/t/how-to-list-foreign-variants/19986 · https://www.elitefourum.com/t/proxy-being-mistaken-for-an-actual-card-1st-ed/28556?tl=ja
- TCGplayer: fees https://help.tcgplayer.com/hc/en-us/articles/201357836-Fees · Japanese FAQ https://help.tcgplayer.com/hc/en-us/articles/26336064030615-Listing-Japanese-Pokemon-Products-FAQ · complaint summaries https://jp.trustpilot.com/review/tcgplayer.com, https://prod.bbb.org/us/ny/syracuse/profile/games/tcgplayer-0041-235983801/customer-reviews
- Cardmarket Pokémon help: https://help.cardmarket.com/en/finding-and-listing-pokemon-cards
- Collectr: https://apps.apple.com/us/app/collectr-tcg-collector-app/id1603892248 · review summary https://justuseapp.com/en/app/1603892248/collectr-tcg-collector-app/reviews (low reliability)
- PriceCharting plans: https://www.pricecharting.com/pricecharting-pro · data terms: https://www.sportscardspro.com/api-documentation
- Dex: https://dextcg.com · Pokellector comparison (competitor's site): https://tcgalbum.com/en/blog/pokemon-karten-apps-vergleich
- Our own findings: research/card-family-test.md · research/fables-filters-2.md · research/fables-rarity-tiers.md · research/catalogs-phase-2.md · research/non-sports-filters.md · supabase/functions/poller/index.ts (`ownedVersionsFor`)
