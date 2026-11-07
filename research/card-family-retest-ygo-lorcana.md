# Every version: Yu-Gi-Oh! and Lorcana re-test (2026-11-06)

Same method as research/card-family-retest.md: 40 cards (20 each), the newest 100 eBay listings per card, a seeded sample of 30 per card scored by hand against 95% precision and 90% recall, with 35 of 40 cards as the pass mark. 41 eBay calls. Listings were deleted after scoring.

## Result

| Game | Listings shown | Wrong card | Wrong label | Hidden by mistake | Precision | Recall | Cards passing |
|---|---|---|---|---|---:|---:|---:|
| Yu-Gi-Oh! | 410 | 2 | 8 | 8 | 97.6% | 98.0% | 15/20 |
| Lorcana | 531 | 0 | 1 | 2 | 99.8% | 99.6% | 20/20 |
| Both | 941 | 2 | 9 | 10 | 98.8% | 98.9% | **35/40** |

Cards below the mark: Blue-Eyes White Dragon, Ash Blossom, Red-Eyes Black Dragon, Raigeki, Kuriboh. Their samples are small once other cards are removed (7 to 26 listings), so one or two misses fail a card.

## How far to trust this

- **Scored after fixing.** The matcher was fixed using these same listings, then scored on them, so these numbers flatter it. No fresh listings were drawn.
- **Shortcut in scoring.** In the final pass, exact matches whose title held both the card's name and a printed code or number were counted right without a second read. They were read in the first pass, before the fixes.
- **Yu-Gi-Oh! Japanese copies** are common in these searches and are only labelled "Japanese printing". They count as right if the label is right.

## What misses remain

- Japanese-market cards with no language word ("Red-Eyes Black Dragon Color Secret Rare Card"): shown as an English printing.
- Misspellings hide real cards: "Sky Striker Ace - Ray", "Red-Eyed Black Dragon", "Stiitch".
- "Pot of Greed And Humility" and "Raigeki BreakSYE-050" read as the shorter card.

## What the catalogs don't cover

- **Yu-Gi-Oh! (YGOPRODeck):** no Japanese-only printings. 1st Edition and Unlimited share a code and aren't listed apart, so they're one version. Some printings are missing (Slifer LC01-EN002): a code no card owns shows as "version not in title" rather than being hidden.
- **Lorcana (Lorcast):** no finish field, so finishes come from rarity: Enchanted, Epic and Iconic are cold foil only, promos have no finish named, the rest come in both (based on Lorcast's prices, which never show a non-foil price for those three, apart from a few blanks). Some promo sets (C1, C3) aren't listed: those show as "promo, version not confirmed". Elsa 7/224 is Super Rare in Lorcast's data; we repeat what the source says.
- **Rarity groups with no source:** Yu-Gi-Oh! gold, parallel, Starfoil, Shatterfoil and Mosaic cards are placed one step above the card they copy, marked UNSOURCED in lib/tcg/catalog.js.

## Source rules checked

| Source | Rule | What we do |
|---|---|---|
| YGOPRODeck | 20 requests a second; store data locally; don't hotlink images. Paid apps not addressed. | Two requests per build, text only. **Written OK needed before alerts become paid.** |
| Lorcast | 50-100 ms between requests; caching encouraged; "expressly prohibited from charging" for this content. | About 30 requests per build, 120 ms apart, text only. **Version lists stay free.** Credit lines are in `source.note`. |

Neither rule blocks building this.
