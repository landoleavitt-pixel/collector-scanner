# Card-family test: 20 Pokémon + 20 Magic cards

*Run 2026-10-31 for Foils & Fables. Research only: no app code was changed.*

## The short version

- **Result: FAIL.** 20 of 40 cards met both targets. The pass mark was 35 of 40.
- **Finding the right card works well.** Of the listings that really were the card, we caught **97.5%** (target 90%).
- **Labelling the right version is not good enough yet.** Of the listings we showed, **93.0%** had the right card *and* the right version label (target 95%).
- **The errors are concentrated in a few groups, and most look fixable** (details below):
  1. Fake and custom cards ("Play Test", "custom art", "altered art – Commander", metal and novelty cards) shown as real.
  2. Special printings (stamped promos, prerelease, judge promos, "The List", World Championship decks, box toppers) labelled as the normal set card.
  3. Japanese/Chinese bundles of two or three cards shown as one card.
- **Japanese Pokémon:** we caught Japanese and Chinese copies, but we can't say *which* version they are. The free catalog only covers English cards. That's **18% of real Pokémon listings** with no version label.
- **Promos:** this is the weakest area in both games.
- **Recommendation:** don't build card-family alerts on this matcher yet. Fix the groups above, then re-run the test on **fresh** listings (about 41 more eBay calls). Following the rule set before the test, Japanese versions and promo versions launch as **filters only** for now.

## What we did

1. **Picked 40 cards.**
   - Pokémon: classics (Charizard, Blastoise, Venusaur, Mewtwo), modern chase cards (Charizard ex, Umbreon VMAX, Pikachu VMAX and others) and one trainer (Iono).
   - Magic: Reserved List cards (Black Lotus, Gaea's Cradle, Underground Sea), serialized and borderless chase cards (The One Ring, Sheoldred), and heavily reprinted staples (Sol Ring with 143 printings, Lightning Bolt with 74).
2. **Pulled every version of each card from free catalogs.**
   - Scryfall for Magic: 40 calls, obeying its 10-per-second limit.
   - TCGdex for English Pokémon: 216 calls, spaced out. Pokémon TCG Pocket (digital) cards were excluded.
3. **Fetched 100 live eBay listings per card.**
   - Searched card-game singles (category 183454), filtered by game, on the US site.
   - **41 eBay calls in total** (1 sign-in plus 40 searches; the cap was 200).
   - Keys were read from `.env.local` inside the script and never printed or saved.
4. **Ran a matcher on every listing.** It reads the title and either labels a version (set, card number and finish), names the set only, says "version not in title", or rejects the listing (wrong card, fake, lot or sealed product).
5. **Scored by hand.** To keep the test fair, I adjusted the matcher only while looking at **odd-numbered** listings. I then hand-checked a random **30 even-numbered** listings per card (1,200 in all) that I hadn't used for tuning.

### How it was scored
- **Precision (target 95%):** of the listings we showed for a card, the share that were really that card *and* had a correct label.
  - "Version not in title" counts as correct when it's true.
  - A label naming the set but not the exact copy counts as correct when the set is right.
- **Recall (target 90%):** of the listings that really were the card (any language, any version), the share we showed.
- **A card passes** when it meets both targets.

## Overall numbers

| | Pokémon | Magic | Both |
|---|---:|---:|---:|
| Listings checked | 600 | 600 | 1,200 |
| Shown to the user | 398 | 490 | 888 |
| Wrong card shown (fake, lot, other card) | 14 | 20 | 34 |
| Right card, wrong version label | 9 | 19 | 28 |
| Real card wrongly hidden | 13 | 9 | 22 |
| **Precision** (target 95%) | **94.2%** | **92.0%** | **93.0%** |
| **Recall** (target 90%) | **96.7%** | **98.1%** | **97.5%** |
| Real listings with a version named | 81% | 88% | 85% |
| Cards passing both targets | 10 / 20 | 10 / 20 | **20 / 40** |

**How sure are we?**
- The pooled precision of 93.0% is based on 888 listings, so it's accurate to about ±1.7 points. It is clearly below 95%.
- Per-card results are less certain, because each is based on 7 to 30 listings shown. A single error can move a card from pass to fail.
- Pass/fail per card is the agreed rule, so I report it, but the pooled numbers are the more reliable read.

## Per-card results

Columns: shown = sampled listings we showed; wrong card = fake, lot or other card shown; wrong label = right card, wrong version.

| Card | Shown | Wrong card | Wrong label | Hidden by mistake | Precision | Recall | Result | Where it went wrong |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Charizard | 7 | 1 | 0 | 0 | 86% | 100% | ❌ Fail | Special Delivery Charizard is a different card |
| Blastoise | 9 | 0 | 0 | 0 | 100% | 100% | ✅ Pass | — |
| Venusaur | 12 | 1 | 0 | 0 | 92% | 100% | ❌ Fail | Japanese 3-card set incl. Mega Venusaur ex; label did not say "Spanish" (not counted) |
| Mewtwo | 12 | 3 | 0 | 0 | 75% | 100% | ❌ Fail | Japanese multi-card sets and 'SIR' (Mewtwo ex) let through |
| Charizard ex | 23 | 0 | 0 | 0 | 100% | 100% | ✅ Pass | — |
| Charizard VMAX | 21 | 1 | 0 | 2 | 95% | 91% | ✅ Pass | metal card let through; single promo rejected because title says Ultra Premium Collection |
| Pikachu VMAX | 25 | 0 | 0 | 0 | 100% | 100% | ✅ Pass | label did not say "Chinese" (language gap, not counted) |
| Pikachu ex | 23 | 1 | 0 | 1 | 96% | 96% | ✅ Pass | Prize Pack stamped single rejected (word pack); Japanese 2-card set let through |
| Umbreon VMAX | 28 | 0 | 0 | 0 | 100% | 100% | ✅ Pass | — |
| Umbreon ex | 17 | 0 | 3 | 2 | 82% | 89% | ❌ Fail | World Championship Deck copy labeled as Unseen Forces; seller wrote 161/386, labeled 060; Surprise Box stamp not in catalog; sealed UPC promo and premium-deck single rejected |
| Rayquaza VMAX | 26 | 0 | 1 | 2 | 96% | 93% | ✅ Pass | Chinese (CS4b) not recognised as non-English; single from a Japanese deck rejected; seller put wrong set name |
| Gengar VMAX | 23 | 0 | 0 | 3 | 100% | 88% | ❌ Fail | label did not say "German" (not counted); deck single and Spanish Prize Pack single rejected; Chinese not recognised |
| Mew ex | 25 | 2 | 1 | 1 | 88% | 96% | ❌ Fail | Japanese 2-card sets let through; rejected because the words "Full Art Card" tripped the art-card filter; wrong set picked from #152 |
| Lugia V | 30 | 0 | 0 | 0 | 100% | 100% | ✅ Pass | — |
| Giratina V | 27 | 0 | 0 | 0 | 100% | 100% | ✅ Pass | — |
| Espeon VMAX | 29 | 0 | 0 | 0 | 100% | 100% | ✅ Pass | — |
| Sylveon ex | 26 | 1 | 3 | 1 | 85% | 96% | ❌ Fail | Mega Evolution promo MEP 100 not in catalog, labeled as 30th Celebration; stamped promo; Chinese 2-card set; sealed single promo rejected |
| Gardevoir ex | 11 | 2 | 0 | 0 | 82% | 100% | ❌ Fail | Japanese Mega Gardevoir and XY-era Gardevoir EX let through (no number check for non-English) |
| Iono | 8 | 1 | 0 | 0 | 88% | 100% | ❌ Fail | fan-made waifu card |
| Greninja ex | 16 | 1 | 1 | 1 | 88% | 94% | ❌ Fail | Ash-Greninja EX let through; ME promo 099 labeled 30th Celebration; collection promo rejected by set rule |
| The One Ring | 23 | 0 | 0 | 1 | 100% | 96% | ✅ Pass | real Borderless Poster card rejected by the poster filter |
| Sol Ring | 29 | 1 | 0 | 1 | 97% | 97% | ✅ Pass | staples lot let through; sealed single promo rejected; Tales of Middle-earth Commander not recognised |
| Lightning Bolt | 29 | 0 | 0 | 0 | 100% | 100% | ✅ Pass | — |
| Black Lotus | 22 | 4 | 0 | 2 | 82% | 90% | ❌ Fail | novelty/third-party Lotus items (COA replica, Currency card, puzzle promo, altered proxy) let through; official oversized promos rejected as jumbo |
| Gaea's Cradle | 28 | 1 | 3 | 0 | 86% | 100% | ❌ Fail | Judge promos and the 1999 World Championship Deck copy labeled as the Urza's Saga original; altered-art proxy let through |
| Underground Sea | 29 | 2 | 0 | 0 | 93% | 100% | ❌ Fail | "Play Test" (two words) proxies let through |
| Mana Crypt | 28 | 0 | 1 | 0 | 96% | 100% | ✅ Pass | sellers say "Book Promo", "SGP", "Invention" — nicknames not in our table, so version left blank; Mystery Booster copy labeled Eternal Masters |
| Force of Will | 26 | 1 | 0 | 0 | 96% | 100% | ✅ Pass | "Play Test" proxy let through; World Championship and JP-alt versions not recognised |
| Ragavan, Nimble Pilferer | 29 | 0 | 8 | 0 | 72% | 100% | ❌ Fail | Retro Frame copies live in a separate catalog set (MH2 Timeshifts) so labels pointed at the wrong MH2 versions; Final Fantasy Zidane version labeled Multiverse Legends; prerelease promo labeled as the set card |
| Sheoldred, the Apocalypse | 23 | 1 | 2 | 1 | 87% | 96% | ❌ Fail | stamped promo-pack copies labeled as the set card; promo-pack single rejected (word pack); "Play Test" proxy let through |
| Jace, the Mind Sculptor | 13 | 0 | 0 | 0 | 100% | 100% | ✅ Pass | — |
| Rhystic Study | 19 | 1 | 0 | 0 | 95% | 100% | ❌ Fail | custom Naruto-themed card let through |
| Smothering Tithe | 22 | 2 | 1 | 1 | 86% | 95% | ❌ Fail | "Nintendo Box Art" customs let through; promo-pack single rejected; stamped promo labeled as set card; Judge promo and anime borderless not recognised |
| Dockside Extortionist | 26 | 1 | 3 | 0 | 85% | 100% | ❌ Fail | The List reprints labeled as the Double Masters 2022 card; "Play Test" proxy |
| Mana Drain | 25 | 2 | 0 | 0 | 92% | 100% | ❌ Fail | "Play-test"/"Play Test" proxies let through |
| Demonic Tutor | 22 | 0 | 1 | 1 | 95% | 96% | ✅ Pass | seller typo "Demonie"; box-topper version labeled as the regular set card |
| Orcish Bowmasters | 26 | 0 | 0 | 1 | 100% | 96% | ✅ Pass | seller typo "Bowmaster" |
| Doubling Season | 18 | 0 | 0 | 1 | 100% | 95% | ✅ Pass | single rejected because the title says "Pack Fresh" |
| Ancient Tomb | 24 | 3 | 0 | 0 | 88% | 100% | ❌ Fail | "Play Test" and altered-art proxies let through; FTV nickname not recognised |
| Cyclonic Rift | 29 | 1 | 0 | 0 | 97% | 100% | ✅ Pass | custom Kirby card let through; JP alternate-art numbers not matched |

## Where it failed

### 1. Fakes and customs shown as real (21 of the 34 wrong-card errors)
- The matcher already rejects "proxy", "custom" and "fan art". It missed these:
  - "Play Test" written as two words, and "Play-test";
  - "Altered Art – Commander – EDH" (a proxy seller's format);
  - "DIY … Full Art Foil";
  - novelty and themed customs (Naruto, Kirby, "Nintendo Box Art", a "waifu" card);
  - a metal Charizard;
  - Black Lotus novelties (a COA replica, a "Currency" card, an Ultra Pro puzzle promo).
- **Fix:** add these words, and treat "Commander/EDH + altered" as a proxy signal. Magic searches are the most affected; for some cards a third of the first 100 results are proxies.

### 2. Special printings labelled as the normal card (18 of the 28 wrong-label errors)
- Stamped promo-pack copies, prerelease promos, judge promos, "The List" and Mystery Booster reprints, World Championship deck copies, box toppers, and Pokémon Surprise Box or ME promo stamps all ended up labelled as the regular set card.
- The catalogs do list most of these. The matcher fell back to the set name because sellers write them differently ("Promos – Stamped", "LIST 107/024", "Judge Promos", "Book Promo").
- **Fix:** add a nickname table (promo pack, stamped, prerelease, judge, The List, Mystery Booster, WCD/World Championship, box topper, book promo, FTV, SGP). When a title says "promo" or "stamped" and we can't pin the promo version, say "promo version, not confirmed" rather than naming the set card.

### 3. A catalog quirk: Ragavan "Retro Frame" (6 errors)
- Scryfall files the retro-frame Ragavan under a separate set, "Modern Horizons 2 Timeshifts", while sellers write "Modern Horizons 2".
- **Fix:** for each Magic set, include its companion sets (timeshifts, promos, The List) when matching the set name.

### 4. Bundles of two or three cards (8 wrong-card errors)
- Mostly Japanese and Chinese "SAR set" listings (for example Mewtwo ex + Mew ex), plus one Magic staples lot.
- **Fix:** reject titles with two card numbers or the word "set" next to "SAR"/"AR".

### 5. Real singles hidden because of a word in the title (16 of the 22 hidden cards)
- Singles were rejected when the title also said "pack fresh", "Prize Pack", "Promo Pack", "Ultra Premium Collection", "Premium Deck", "sealed promo", "poster" (a real One Ring version), or "jumbo/oversized" (real Wizards oversized promos).
- One filter bug: the words "Full Art Card" tripped the "art card" rule.
- **Fix:** check for a card number or promo code before treating these words as a box or pack.

### 6. Japanese and other languages (Pokémon)
- **Caught:** the matcher found Japanese, Chinese, Korean and Indonesian copies well.
  - 69 of 384 real Pokémon listings (18%) were non-English.
  - Two Chinese listings were missed because the "CS4b"-style set code isn't in our language list.
- **Not labelled:** none of them got a version, because TCGdex's English catalog has no Japanese set lists.
- **Blind spot:** without a number check, two Japanese listings for *other* cards slipped in (Mega Gardevoir ex and an XY-era Gardevoir EX).
- **Language never shown:** for both games, the label also doesn't show the language when a Spanish, German or Japanese copy matches an English set and number. I didn't count this as an error, but the label should say it, and it's an easy fix.

### 7. Smaller gaps (not errors, but "version not in title" when the title did say it)
- Magic had 31 listings like this, mostly from nicknames: "Book Promo", "SGP", "Invention", "JP Alternate Art #79", "World Championship 1999".
- Pokémon had 3.
- The nickname table in fix 2 also covers these.

### Other things worth knowing
- **Plain-name Pokémon searches bring back mostly other cards.** For "Charizard", "Mewtwo", "Iono" and similar searches, 64–80 of the first 100 eBay results were a different card (Mega, ex, V, Iono's Bellibolt and so on). The matcher handled this well: almost no wrong-name cards got through. It does mean a card-family alert must run the matcher; eBay's search alone isn't enough.
- **Seller mistakes are common:**
  - wrong set names ("Rayquaza VMAX 101/159 Evolving Skies");
  - wrong totals ("161/386");
  - typos ("Demonie Tutor", "Bowmaster").
  - The card number usually rescues the label, so we should trust the card number over the set name.

## Recommendation

1. **Don't ship card-family alerts yet.** Recall is ready; labelling isn't.
2. **Fix groups 1–5 above.** These are word lists and matching rules, roughly a day of work for an agent session. Groups 1–4 cover 53 of the 62 precision errors; group 5 covers 16 of the 22 hidden cards.
3. **Re-run the 40-card test on fresh listings.** That's about 41 eBay calls. Use new listings so the fixes aren't tuned to this sample.
4. **Until a re-test passes, launch these versions as filters only** (the rule set before the test):
   - **Japanese and other non-English Pokémon:** show them under the card as "Japanese printing", with no version named;
   - **promo and stamped versions in both games:** show "promo — version not confirmed".
5. **Magic first:** if only one game goes ahead, Magic's catalog is the stronger base. Its recall was 98%, and most of its errors were proxies and nicknames, which are easier to fix than Pokémon's language gap.

## Data handling
- I fetched 4,000 eBay listing titles (no prices, no seller data) into a scratch folder outside the project. After scoring, I **deleted** the raw listings and the matcher's per-listing output.
- What's kept: this report and a scratch scoring sheet of listing positions and notes, with no listing titles.
- No app code, database or settings were touched. eBay keys were never printed, logged or copied.

## Sources
- Scryfall API (card search, `unique=prints`): https://scryfall.com/docs/api — data used under its terms (free to view, no paywall on card data).
- TCGdex API v2 (English cards and sets): https://tcgdex.dev — MIT licence.
- eBay Browse API `item_summary/search`: https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
