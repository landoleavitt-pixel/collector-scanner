# Card-family re-test: 20 Pokémon + 20 Magic cards on fresh listings

*Run 2026-11-01 for Foils & Fables, after the card-family engine was built (`lib/tcg/family.js`). Same 40 cards, rules and targets as research/card-family-test.md.*

## The short version
- **Result: still FAIL, but close.** 16 of 40 cards met both targets; the pass mark is 35.
- **Showing only the right card: 94.0%** (target 95%). The first test scored 93.0%.
- **Catching the real listings: 97.7%** (target 90%). The first test scored 97.5%.
- **Wrong cards shown dropped from 34 to 20.** Fakes, Duel Masters cards, "One Ring to Rule Them All", altered cards and bundles are now mostly caught.
- **Most remaining errors are labels that say too little, not wrong cards.** For example, a listing says "SWSH261" but we still say "promo — version not confirmed". Or a title gives "1999 World Championship" and we say "version not in title".
- **Recommendation:** fix the four groups below (about half a day), then run a third test on fresh listings (41 eBay calls). Until a run passes, keep card-family alerts off. The version list (`/api/tcg-versions`) and the family search can go live, because they show every label as read from the title.

## What we did
1. **Fresh listings:** 41 eBay calls (1 sign-in and 40 searches), newest listings first, so most were not in the first test. The search is the same one `/api/tcg-family-search` makes: the card name in card-game singles, filtered by game.
2. **Tuning on odd-numbered listings only.** The matcher was adjusted only while looking at odd-numbered listings.
3. **Scoring by hand:** a random 30 even-numbered listings per card, which hadn't been looked at, 1,200 in all. The scoring was strict. A promo the title clearly names but we call "not confirmed" counted as a wrong label. So did "version not in title" when the version *was* in the title.
4. **Data:** eBay keys were read inside the script and never printed. The raw listings and the matcher's per-listing output were deleted after scoring.

## Overall numbers
| | Pokémon | Magic | Both |
|---|---:|---:|---:|
| Listings shown (of 600 / 600 checked) | 348 | 520 | 868 |
| Wrong card shown | 14 | 6 | 20 |
| Right card, wrong or too-vague label | 10 | 22 | 32 |
| Real card wrongly hidden | 15 | 5 | 20 |
| **Precision** (target 95%) | **93.1%** | **94.6%** | **94.0%** |
| **Recall** (target 90%) | **95.7%** | **99.0%** | **97.7%** |
| Cards passing both | 5 / 20 | 11 / 20 | **16 / 40** |

Per-card shown counts are small (4 to 30), so one error can fail a card. The pooled numbers are the better read.

## Per-card results
| Card | Shown | Wrong card | Wrong label | Hidden | Precision | Recall | Result |
|---|---:|---:|---:|---:|---:|---:|---|
| Charizard | 4 | 0 | 0 | 1 | 100% | 80% | ❌ |
| Blastoise | 9 | 0 | 1 | 0 | 89% | 100% | ❌ |
| Venusaur | 13 | 3 | 0 | 2 | 77% | 83% | ❌ |
| Mewtwo | 8 | 0 | 1 | 0 | 88% | 100% | ❌ |
| Charizard ex | 17 | 2 | 0 | 0 | 88% | 100% | ❌ |
| Charizard VMAX | 26 | 0 | 2 | 0 | 92% | 100% | ❌ |
| Pikachu VMAX | 15 | 2 | 1 | 0 | 80% | 100% | ❌ |
| Pikachu ex | 21 | 0 | 0 | 1 | 100% | 95% | ✅ |
| Umbreon VMAX | 22 | 0 | 0 | 1 | 100% | 96% | ✅ |
| Umbreon ex | 26 | 1 | 1 | 0 | 92% | 100% | ❌ |
| Rayquaza VMAX | 26 | 0 | 0 | 4 | 100% | 87% | ❌ |
| Gengar VMAX | 17 | 1 | 0 | 1 | 94% | 94% | ❌ |
| Mew ex | 26 | 3 | 1 | 1 | 85% | 96% | ❌ |
| Lugia V | 9 | 0 | 1 | 1 | 89% | 90% | ❌ |
| Giratina V | 23 | 0 | 0 | 0 | 100% | 100% | ✅ |
| Espeon VMAX | 26 | 0 | 0 | 1 | 100% | 96% | ✅ |
| Sylveon ex | 28 | 1 | 1 | 0 | 93% | 100% | ❌ |
| Gardevoir ex | 9 | 1 | 0 | 2 | 89% | 80% | ❌ |
| Iono | 8 | 0 | 1 | 0 | 88% | 100% | ❌ |
| Greninja ex | 15 | 0 | 0 | 0 | 100% | 100% | ✅ |
| The One Ring | 25 | 0 | 0 | 0 | 100% | 100% | ✅ |
| Sol Ring | 30 | 0 | 1 | 0 | 97% | 100% | ✅ |
| Lightning Bolt | 29 | 1 | 0 | 0 | 97% | 100% | ✅ |
| Black Lotus | 10 | 3 | 0 | 0 | 70% | 100% | ❌ |
| Gaea's Cradle | 25 | 0 | 5 | 1 | 80% | 96% | ❌ |
| Underground Sea | 26 | 0 | 0 | 0 | 100% | 100% | ✅ |
| Mana Crypt | 26 | 0 | 1 | 0 | 96% | 100% | ✅ |
| Force of Will | 25 | 0 | 2 | 0 | 92% | 100% | ❌ |
| Ragavan, Nimble Pilferer | 29 | 0 | 0 | 0 | 100% | 100% | ✅ |
| Sheoldred, the Apocalypse | 17 | 0 | 1 | 0 | 94% | 100% | ❌ |
| Jace, the Mind Sculptor | 27 | 0 | 3 | 0 | 89% | 100% | ❌ |
| Rhystic Study | 28 | 0 | 1 | 0 | 96% | 100% | ✅ |
| Smothering Tithe | 30 | 1 | 2 | 1 | 90% | 97% | ❌ |
| Dockside Extortionist | 28 | 0 | 1 | 0 | 96% | 100% | ✅ |
| Mana Drain | 26 | 0 | 0 | 0 | 100% | 100% | ✅ |
| Demonic Tutor | 27 | 1 | 1 | 1 | 93% | 96% | ❌ |
| Orcish Bowmasters | 29 | 0 | 0 | 1 | 100% | 97% | ✅ |
| Doubling Season | 28 | 0 | 2 | 1 | 93% | 97% | ❌ |
| Ancient Tomb | 28 | 0 | 0 | 0 | 100% | 100% | ✅ |
| Cyclonic Rift | 27 | 0 | 2 | 0 | 93% | 100% | ❌ |

## What's left (fix these, then test again)
1. **Years read as card numbers (about 8 wrong labels).** The fix I added during this test misread "1999 World Championship" and "2019" as card numbers, so it fell back to "version not in title". *Fixed after scoring* (years are now ignored). It isn't counted as fixed here, because the fix was made after looking at the scored half.
2. **Promos the title names exactly (about 7).** Examples: "#261 SWSH Promo", "SVP 176/296", "Secret Lair Prize #8001", "Buy-A-Box". We say "promo — version not confirmed" even though the catalog has that printing. Fix: match promo-set numbers written with "#" or a wrong total.
3. **Older "EX" cards and tag teams in Japanese listings (about 6 wrong cards).** Examples: "Charizard EX 20th Anniversary", "Venusaur Snivy GX", "Surf Pikachu VMAX". Fix: the "EX vs ex" check and a tag-team check for non-English titles, which today skip the number check.
4. **Singles from Japanese "High Class Pack" / "Gem Pack" listings hidden as sealed (about 6 hidden).** Same group-5 problem as the first test, but with Japanese product names.
5. Smaller: Japanese-art English cards (Mystical Archive "JP Alternate Art") labelled "Japanese printing"; non-cards like a "credit card skin" and a "collector insert"; seller typos ("Venasaur", "Gaia's Cradle").

## Japanese copies
- Japanese copies whose title gives a Japanese set code and a card number are now labelled from the seller's title. Example: **"Umbreon VMAX · Japanese · set S6a · #048/069, as listed by seller"**. This uses the 169 Japanese set codes in `data/tcg/ja-coverage.json`.
- Without a code and number, the label is **"Japanese printing, version not named"**.
- Japanese trainer names written in Japanese (`data/tcg/ja-names.json`, e.g. ナンジャモ for Iono) now count as the card.
- In this sample, labels like these were scored as correct when they were true.

## Sources
- Scryfall bulk data (default cards) and sets: https://scryfall.com/docs/api/bulk-data
- TCGdex GraphQL (English cards and sets): https://tcgdex.dev
- eBay Browse API item_summary/search: https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
