# Popular card lists to seed the Foils & Fables home

*Research only, 2026-11-07. No code changed. Every entry has a source; where I couldn't find one, it's marked **UNSOURCED** and left out of the seed lists.*

## The short version

**No source says what people look up on eBay.** So the lists below use the best public stand-ins:
- **Most graded** (what collectors send in): PSA/GemRate figures for Pokémon and One Piece.
- **Most sold now** (what's hot): TCGplayer's monthly top-seller reports (a U.S. marketplace; it reflects new releases).
- **Most played / most viewed** (what players look up): EDHREC ranks (through Scryfall) for Magic, YGOPRODeck page views for Yu-Gi-Oh!.
- **Most valuable** (what newcomers hear about): TCGplayer-priced "most valuable" lists, mainly for Lorcana.

**Recommended shape for each game's home:** two short lists, both made of plain card or character names a person can tap to start a search.
1. **"Favourites"**: stable, changes about once a year. Characters for Pokémon, One Piece and Lorcana; cards for Magic and Yu-Gi-Oh!.
2. **"Hot right now"**: from TCGplayer's monthly top sellers, refreshed once a month. It's what newcomers see in the news.

**Every list item is a search term the engine can use as written** (a name only; no set code, no price). Where a character name needs a card suffix to be searchable ("Charizard ex"), that's noted.

**Two things the engine should know:**
- Characters (Charizard, Luffy, Elsa) are better "popular lists" than single cards: a newcomer wants "all the Charizards", not one printing.
- Magic and Yu-Gi-Oh! "most played" lists are mostly **staples** (Sol Ring, Ash Blossom). They are popular because they are reprinted often (Sol Ring has 143 printings; Blue-Eyes White Dragon has 78). That makes them the best showcase for "every version of a card".

---

## 1. Pokémon

### Favourites (characters), ranked

| # | Character | Evidence |
|---|---|---|
| 1 | **Charizard** | Most-graded Pokémon of all time, almost a million graded cards, about twice Pikachu ([Poke_rad, from PSA data via pokemetrics, May 2023](https://pokerad.substack.com/p/the-top-10-most-graded-pokemon-of)); biggest eBay dollar total among characters (more than $74M of GemRate's 2025 eBay report, see research/non-sports-filters.md); 100 PSA grades in March 2026, up 23% on February ([ComicBook.com, citing GemRate](https://comicbook.com/collectibles/news/pikachu-is-losing-ground-to-pokemon-runner-up-mvp-as-the-most-graded-character/)); top single by sales value in TCGplayer's Q1 2026 report was Mega Charizard X ex ([TCGplayer](https://seller.tcgplayer.com/blog/bestselling-trading-card-games-q1-2026)) |
| 2 | **Pikachu** | Still the most-graded character month to month (136+ PSA grades in March 2026, GemRate via ComicBook.com); #1 by sales in September 2026 ([TCGplayer](https://seller.tcgplayer.com/blog/top-selling-pokémon-cards-on-tcgplayer-september-2026)). **The order of 1 and 2 depends on the measure; both belong at the top.** |
| 3 | **Mew** | In the next five most-graded characters (Mew, Mewtwo, Gengar, Umbreon, Eevee) that together made more than 125,000 graded cards in December 2025 ([Sports Illustrated Collectibles, citing PSA/GemRate](https://www.si.com/collectibles/pokemon-cards-drive-millions-of-graded-tcg-submissions-and-it-s-not-slowing-down)); also in the older all-time list |
| 4 | **Mewtwo** | Same December 2025 group; a 30th Celebration Mewtwo ex was a top-5 seller over $50 in September 2026 (TCGplayer) |
| 5 | **Gengar** | Same December 2025 group; named in the March 2026 GemRate update |
| 6 | **Umbreon** | Same December 2025 group; named in the March 2026 GemRate update |
| 7 | **Eevee** | Same December 2025 group |
| 8 | **Blastoise** | In the all-time top ten (Poke_rad 2023; older data, count not stated) |
| 9 | **Venusaur** | All-time top ten (Poke_rad 2023); 15 PSA grades in March 2026 |
| 10 | **Rayquaza** | All-time top ten (Poke_rad 2023) |
| 11 | **Gyarados** | All-time top ten (Poke_rad 2023) |

The order from 3 to 7 isn't published (only the group is). **List them in this order but don't claim a ranking.** The exact per-character counts sit in GemRate's monthly reports and PSA's population report, which I couldn't open.

**Not seeded (no source):** Lugia, Gardevoir, Sylveon, Greninja as "favourites". (Sylveon and Greninja do appear as 2026 hot cards below.)

### Hot right now (TCGplayer, September 2026; refresh monthly)

- Pikachu ex · Jirachi ex · Mewtwo ex · Sylveon ex (all from 30th Celebration, which took the top 13 spots over $50)
- Mega Charizard X ex · Charizard ex (199/165) · Pikachu ex (276/217) · Mega Darkrai ex · Mega Greninja ex (top singles by sales value in Q3 2026, [TCGplayer Q3](https://seller.tcgplayer.com/blog/best-selling-trading-card-games-q3-2026))

**Note:** these reflect a big new set (30th Celebration was the #1 set of Q3 2026) and are short-lived. Rebuild monthly.

---

## 2. Magic: The Gathering

### Favourites (cards played in the most decks)

Ranked by **EDHREC rank** (how many Commander decks include the card), pulled from Scryfall's `order=edhrec` on 2026-11-07, paper cards legal in Commander, basic lands excluded ([Scryfall API](https://scryfall.com/docs/api), data from [EDHREC](https://edhrec.com)):

| # | Card | # | Card |
|---|---|---|---|
| 1 | **Sol Ring** | 11 | Counterspell |
| 2 | Command Tower | 12 | Fellwar Stone |
| 3 | Arcane Signet | 13 | Cultivate |
| 4 | Swords to Plowshares | 14 | Thought Vessel |
| 5 | Swiftfoot Boots | 15 | Blasphemous Act |
| 6 | Lightning Greaves | 16 | Farseek |
| 7 | Path to Exile | 17 | Beast Within |
| 8 | Exotic Orchard | 18 | Nature's Lore |
| 9 | Reliquary Tower | 19 | Heroic Intervention |
| 10 | Path of Ancestry | 20 | Rampant Growth |

(Chaos Warp, Mind Stone, Dark Ritual, Birds of Paradise and others follow. Lands rank high too but are less interesting to hunt, so show the non-lands first.)

**Recommended seed:** the first ten non-land cards of the table: Sol Ring, Arcane Signet, Swords to Plowshares, Swiftfoot Boots, Lightning Greaves, Path to Exile, Counterspell, Fellwar Stone, Cultivate, Thought Vessel.

### Collector favourites (cards people hunt for versions of)

| Card | Evidence |
|---|---|
| **Gaea's Cradle** | #6 single by sales value in TCGplayer's Q1 2026 report, $1,371 ([TCGplayer Q1](https://seller.tcgplayer.com/blog/bestselling-trading-card-games-q1-2026)) |
| **Mox Amber** (borderless) | #9 by sales value in Q3 2026 ([TCGplayer Q3](https://seller.tcgplayer.com/blog/best-selling-trading-card-games-q3-2026)) |
| **The One Ring** | More than 13,800 eBay card-game singles for the name in category 183454 on 2026-10-31 (our 40-card test, research/card-family-test.md); serialized and borderless versions |
| **Sol Ring** | 143 printings (Scryfall data); the best "every version" example |
| **Black Lotus**, **Underground Sea**, **Mana Crypt**, **Force of Will**, **Sheoldred, the Apocalypse**, **Ragavan, Nimble Pilferer**, **Orcish Bowmasters** | From our own 40-card test: eBay listing counts in category 183454 on 2026-10-31 (for example Force of Will 1,312, Sheoldred 1,234, Orcish Bowmasters 551). The Reserved List cards are the long-standing collector targets ([Wizards' reprint policy](https://magic.wizards.com/en/news/announcements/official-reprint-policy)). **Popularity here is from our own eBay count, not a published ranking.** |

### Hot right now (TCGplayer, Q3 2026)
The Mind Stone · Mox Amber (Borderless) · Gleaming Splendor · Wizard's Staff (top singles in Q3 2026; The Hobbit was the #2 set). Refresh quarterly (TCGplayer didn't publish a monthly Magic list I could find).

---

## 3. Yu-Gi-Oh!

### Favourites (most looked up, YGOPRODeck page views)

Counted from YGOPRODeck's own card data (`misc=yes` views) on 2026-11-07, all 14,656 cards ([YGOPRODeck API guide](https://ygoprodeck.com/api-guide/)):

| # | Card | All-time views | Printings |
|---|---|---:|---:|
| 1 | **Ash Blossom & Joyous Spring** | 26.2M | 34 |
| 2 | **Infinite Impermanence** | 17.6M | 26 |
| 3 | **Called by the Grave** | 12.5M | 25 |
| 4 | **Effect Veiler** | 9.3M | 29 |
| 5 | Mulcharmy Fuwalos | 8.8M | 13 |
| 6 | Nibiru, the Primal Being | 8.5M | 20 |
| 7 | Droll & Lock Bird | 8.3M | 17 |

These are "hand traps", the cards players use in nearly every deck. They're popular with players, not necessarily with collectors.

### Fan-favourite icons (what newcomers know), by the same views

| # | Card | Views | Printings |
|---|---|---:|---:|
| 1 | **Dark Magician** | 4.68M | 49 |
| 2 | **Blue-Eyes White Dragon** | 4.08M | **78** (the most printings of any card I checked) |
| 3 | Mirror Force | 2.85M | 40 |
| 4 | Red-Eyes Dark Dragoon | 2.80M | 12 |
| 5 | Pot of Greed | 2.29M | 21 |
| 6 | Blue-Eyes Alternative White Dragon | 1.92M | 14 |
| 7 | Cyber Dragon | 1.72M | 48 |
| 8 | Red-Eyes Black Dragon | 1.52M | 40 |
| 9 | Black Luster Soldier - Envoy of the Beginning | 1.49M | 18 |
| 10 | Dark Magician Girl | 1.29M | 43 |
| 11 | Exodia the Forbidden One | 0.98M | 25 |

(The three Egyptian God cards sit lower: Slifer 0.80M, Ra 0.84M, Obelisk 0.77M.) **The icon list is a hand-picked set of famous cards ranked by views**, not an automatic top list, since the automatic top is hand traps.

### Hot right now (TCGplayer, September 2026)
Over $50: Black Chaos · Pot of Sloth · Fydraulis Harmonia · Fallen of the White Dragon · Dominus Spark. Under $50: Dark Magical Curtain · Dark Magician, the Pharaoh's Servant · Kuriboh - Multiply! · Synchro Emergency · Winged Kuriboh Sabatiel LV10 ([TCGplayer](https://seller.tcgplayer.com/blog/top-selling-yu-gi-oh-cards-on-tcgplayer-september-2026)).

**Also useful:** this week's most-viewed cards (Mulcharmy Fuwalos, Dominus Impulse, The Great Gallant Bandit) change fast; YGOPRODeck's `viewsweek` field gives them weekly.

---

## 4. One Piece

### Favourites (characters)

| # | Character | Evidence |
|---|---|---|
| 1 | **Monkey D. Luffy** | Placed in the top 12 of GemRate's "Most Graded TCG Subjects" and appeared among PSA's most graded individual TCG cards in 2026, and was the main non-Pokémon entry in the monthly rankings (#3 in February) ([Sports Illustrated](https://www.si.com/collectibles/one-piece-and-monkey-d-luffy-cards-enter-pokemon-s-tcg-territory), [GemRate February report via Sports Illustrated](https://www.si.com/collectibles/new-gemrate-report-reflects-card-grading-strength-for-february)); the OP01 Alternate Art is described as the most consistently valuable One Piece card ([TCGTalk, retail blog](https://tcgtalk.com/guides/most-expensive-one-piece-op01-romance-dawn-cards)) |
| 2 | **Roronoa Zoro** | PSA 10 OP01 Zoro at $11,424 in TCGTalk's most-expensive guide (retail blog; high-price outlier, treat with caution) |
| 3 | **Shanks** | A serialized Shanks among OP01's top cards (TCGTalk); in TCGplayer's September 2026 under-$50 top 5 |
| 4 | **Nami** | OP01 Alternate Art PSA 10 at $300–600 (retail blog) |
| 5 | **Yamato** | #2 under $50 in TCGplayer September 2026 |
| 6 | **Charlotte Linlin** and **Charlotte Pudding** | TCGplayer September 2026 (#1 and #3 under $50) |
| 7 | **Edward Newgate** (Whitebeard) | #1 over $50 in September 2026 (Treasure Rare) |

**Honest limit:** the order after Luffy rests on **retail blogs and one month of sales**, not a ranking like GemRate's. Seed Luffy first, the rest as "also popular".

### Hot right now (TCGplayer, September 2026)
Over $50: Edward.Newgate (Treasure Rare) · Loki (Alternate Art) · Monkey.D.Luffy (079, Alternate Art) · Are You That Afraid of the New Era?! (Alternate Art) · Zehahahahaha! (Alternate Art). Under $50: Charlotte Pudding · Yamato · Charlotte Linlin · Shanks · Gloriosa ([TCGplayer](https://seller.tcgplayer.com/blog/top-selling-one-piece-cards-on-tcgplayer-september-2026)). Almost all are from The World's Strongest Warriors, the #4 set of Q3 2026.

---

## 5. Disney Lorcana

### Favourites (characters)

From the TCGplayer-priced "most valuable" list ([Card Gamer, Dec 18, 2025, updated Jan 1, 2026](https://cardgamer.com/best-lists/most-valuable-disney-lorcana-cards/)), which ranks by current TCGplayer prices:

| # | Character | Card on the list |
|---|---|---|
| 1 | **Mickey Mouse** | Brave Little Prince (Iconic); Brave Little Tailor (D23 promo) |
| 2 | **Elsa** | Snow Queen (D23 promo); Spirit of Winter (Enchanted) |
| 3 | **Stitch** | Rock Star (D23 promo) |
| 4 | **Minnie Mouse** | Sweetheart Princess (Iconic) |
| 5 | **Maleficent** | Monstrous Dragon (D23 promo) |
| 6 | **Captain Hook** | Forceful Duelist (D23 promo) |

**Limits:** this ranks by **price**, not by how often people search or grade, and several of the top cards are promos. I found no GemRate or PSA population ranking for Lorcana, and Lorcana singles don't appear in TCGplayer's top-ten lists for Q3 2026 (the game was #6 by sales value that quarter). **Treat the character order as a starting point.**

**TCGplayer's game ranking by sales value:** Lorcana was #8 in Q1 2026 and #6 in Q3 2026 ([Q1](https://seller.tcgplayer.com/blog/bestselling-trading-card-games-q1-2026), [Q3](https://seller.tcgplayer.com/blog/best-selling-trading-card-games-q3-2026)).

### Hot right now
**UNSOURCED.** I found no 2026 monthly Lorcana top-seller list. Leave this list out for Lorcana until TCGplayer publishes one, or use the set that released most recently as a stand-in (not researched).

---

## 6. How to refresh, and what to leave out

| List | Source | How often | Effort |
|---|---|---|---|
| Pokémon favourites | GemRate monthly PSA report | Yearly review | Manual |
| Pokémon, One Piece, Yu-Gi-Oh! "hot now" | TCGplayer "Top Selling … Cards on TCGplayer: <Month> 2026" posts (top 5 per price band; full lists only in CSVs behind the page) | Monthly | Manual copy of 10 names |
| Magic "most played" | Scryfall `order=edhrec` | Quarterly | One API call, one name list |
| Yu-Gi-Oh! "most viewed" | YGOPRODeck card data, `views` and `viewsweek` | Monthly | One API call (store the file; they ask for local copies, 20 requests a second limit) |
| Lorcana | None reliable | — | Add when a source appears |

**Leave out of the seed lists:** anything marked UNSOURCED above; prices (price history is on hold); card pictures from catalogs (seller photos only, as decided).

**Rules respected:** TCGplayer's report pages were read as ordinary public pages (their CSV downloads weren't opened). PokeBeach, Deltias and CardShopLive were not used. I used the card names only, not any report text or images. The Scryfall and YGOPRODeck calls were one call each at a polite rate; their data terms are in research/catalogs-phase-2.md.

## Sources (read 2026-11-07)
- TCGplayer: Q1 2026 https://seller.tcgplayer.com/blog/bestselling-trading-card-games-q1-2026 · Q3 2026 https://seller.tcgplayer.com/blog/best-selling-trading-card-games-q3-2026 · September 2026 Pokémon https://seller.tcgplayer.com/blog/top-selling-pokémon-cards-on-tcgplayer-september-2026 · One Piece https://seller.tcgplayer.com/blog/top-selling-one-piece-cards-on-tcgplayer-september-2026 · Yu-Gi-Oh! https://seller.tcgplayer.com/blog/top-selling-yu-gi-oh-cards-on-tcgplayer-september-2026
- Pokémon graded characters: https://comicbook.com/collectibles/news/pikachu-is-losing-ground-to-pokemon-runner-up-mvp-as-the-most-graded-character/ · https://www.si.com/collectibles/pokemon-cards-drive-millions-of-graded-tcg-submissions-and-it-s-not-slowing-down · https://pokerad.substack.com/p/the-top-10-most-graded-pokemon-of · research/non-sports-filters.md (GemRate 2025 eBay report)
- Magic: Scryfall API (EDHREC rank) https://scryfall.com/docs/api · EDHREC https://edhrec.com · Wizards reprint policy https://magic.wizards.com/en/news/announcements/official-reprint-policy · research/card-family-test.md (eBay counts)
- Yu-Gi-Oh!: YGOPRODeck API https://ygoprodeck.com/api-guide/ (views, 2026-11-07)
- One Piece: https://www.si.com/collectibles/one-piece-and-monkey-d-luffy-cards-enter-pokemon-s-tcg-territory · https://tcgtalk.com/guides/most-expensive-one-piece-op01-romance-dawn-cards
- Lorcana: https://cardgamer.com/best-lists/most-valuable-disney-lorcana-cards/
