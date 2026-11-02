# More filters for Foils & Fables

*Research only, 2026-11-01. No code changed. 14 eBay calls in total: 11 for about 1,000 listing titles (no prices or seller data, deleted after counting), plus 3 for the Card Condition test below. Keys never printed.*

## The short version

**Today's filters:** Game, Rarity, Language (English / Japanese / Other), Graded or raw, Grader, Grade, 1st Edition, Serial-numbered, Price, Auction or Buy It Now, and the sort. That is a thin set next to what collectors use on TCGplayer, Cardmarket and eBay itself.

**Build these 8 first, in this order** (full reasoning in the ranking section):

| # | Filter (plain label) | Works for | How reliably we can tell | Effort |
|---|---|---|---|---|
| 1 | **Foil / holo type** | Pokémon, Magic, Lorcana | About 1 in 3 titles say it | Low |
| 2 | **Condition** (Near Mint, Lightly Played…) for raw cards | All 5 | **Use eBay's own Card Condition filter (tested, it works)**; filled on about 86% of listings. Titles (34–62%) only as a backup | Low |
| 3 | **Special art** (alternate art, borderless, showcase, parallel…) | Pokémon, Magic, One Piece (Yu-Gi-Oh! not measured) | 13–30% of titles | Low–medium |
| 4 | **Promos and special printings** (show, hide, only) | All 5 | 17–28% of titles | Low (the engine already reads these) |
| 5 | **Set** (a drop-down, per game) | All 5 | 55–75% of titles carry a set name, code or number | Medium–high |
| 6 | **Shipping and offers** (Best Offer, free shipping, ships from my country, returns accepted) | All 5 | **100%**: these come from eBay itself, not from titles | Low |
| 7 | **Card type** (Pokémon ex / V / VMAX; Leader cards in One Piece; Monster / Spell / Trap) | Pokémon, One Piece, Yu-Gi-Oh! | Pokémon about 4 in 10; One Piece Leaders 9% | Low |
| 8 | **Singles or sealed** (a mode switch) | All 5 | **100%**: it comes from eBay's categories | Medium |

**Quick wins that aren't in the top 8:** split "Other" language into Chinese and Korean for Pokémon; add a "no bids yet" option for auctions. Both are small.

**Not worth building:** signed or autographed (0–3% of titles), error or misprint (0–1%), card colour or ink (3–11%), HP and attack filters. Details below.

**The grandparent test:** show four things up front (Game, Rarity, Graded or raw, Price) and keep everything else behind **More filters**, with plain labels and no jargon. Only show a filter when it applies. For example, "Reverse holo" appears only for Pokémon, and "Condition" only appears when "Raw" is chosen.

---

## How to read the numbers

- **Hit rate** = the share of listing titles that actually *say* the thing. It tells us how many listings a filter can include, not how many cards truly have the trait.
- **A listing that doesn't say it is not a "no".** A title with no "foil" may still be a foil card. So filters should be **"only show X"**, never **"hide everything that isn't X"**. This matches how Fields & Floors treats titles.
- **Sample:** 200 titles per game (two searches of 100 each: Pikachu and Mewtwo; Lightning Bolt and Sol Ring; Blue-Eyes White Dragon and Dark Magician; Luffy and Zoro; Elsa and Mickey Mouse). After dropping lots, sealed product and proxies, 173–197 singles remained per game.
- **Caveats:** it's two famous searches per game, so rates will differ for other cards. Magic's staples are heavily reprinted, so set and treatment words show up more than for a typical card. Counts come from simple word patterns, which I spot-checked on a dozen titles per filter; they're good for ranking filters, not for promising exact accuracy.

### What collectors use elsewhere (so we match what they expect)
- **Cardmarket** gives every Pokémon listing five attributes: language, reverse holo, signed, first edition and altered art. Its help page warns that sellers often confuse "reverse holo" with "holo". ([Cardmarket help](https://help.cardmarket.com/en/finding-and-listing-pokemon-cards))
- **CardNexus** (a marketplace with TCGplayer-style filters) offers set, finish (non-foil, foil, etched, reverse holo), condition (Near Mint to Damaged), language, and for Pokémon, card type, stage and HP. ([CardNexus help](https://help.cardnexus.com/articles/4611539))
- **Scryfall** (Magic) filters by finish, frame, border, promo type and language. Its `is:default` shortcut exists because "normal version only" is a common wish. ([Scryfall](https://scryfall.com/blog/introducing-is-default-232))
- **eBay's own fields** for card singles include Game, Set, Rarity, Language, Card Type, Features, Finish and Card Condition. Section 2 of research/non-sports-filters.md covers how reliable they are: Game, Language and graded-versus-raw are good; Set, Rarity and Grader are not.
- **TCGplayer's own filter list** I couldn't confirm: its advanced-search documentation lists only Final Fantasy as an example. PriceCharting's pages weren't reachable either, so the list above comes from CardNexus, Cardmarket and Scryfall. I couldn't read collector-forum threads directly, so "who wants it" below is from what those sites offer and from what sellers write in titles.

---

## Filters that apply to every game

| Filter | Plain label | Who wants it | From titles? | From eBay? | Hit rate in my sample | Verdict |
|---|---|---|---|---|---|---|
| **Condition (raw)** | "Near Mint or better · Lightly played · Played" | Buyers of cards to play with or keep in a binder. Standard on every card marketplace | Yes: NM, LP, MP, HP, "Near Mint" | eBay requires a Card Condition on every raw single, but search results don't include it (one extra call per listing). *Tested 2026-11-01: eBay does let us filter on it directly (see the test result below).* | Raw titles that name a condition: Pokémon 48%, Magic 62%, Yu-Gi-Oh! 36%, One Piece 48%, Lorcana 34% | **Build (#2)** |
| **Promos and special printings** | "Promo cards: show · hide · only" | Chasers of stamped, prerelease, Prize Pack and event cards. Others want to avoid them | Yes: promo, stamped, prerelease, staff, judge, Prize Pack, Secret Lair | No | Promo or event words: Pokémon 17%, Magic 28% (mostly Secret Lair), One Piece 26%, Lorcana 23%, Yu-Gi-Oh! 3% | **Build (#4)**; the engine already labels these printings |
| **Set** | "Set" (drop-down) | Set collectors, and anyone who knows "I want it from Evolving Skies" | Partly: names, codes (OP13, LOB-EN001), and for Pokémon the number "199/165" tells us the set with the catalog | Unreliable (eBay's Set field is often wrong) | Carries a set name, code or number: Yu-Gi-Oh! 65%, One Piece 69%, Pokémon 62% (a slash number), Magic 55% (full set names), Lorcana 62% (slash number) / 35% (set name) | **Build (#5)**; the card-family catalogs give us the set lists |
| **Shipping and offers** | "Best Offer · Free shipping · Ships from the US · Ships from Canada · Returns accepted" | Everyone; Canadian buyers especially | No | **Yes, built into eBay's search** (`buyingOptions: BEST_OFFER`, `maxDeliveryCost:0`, `itemLocationCountry`, `returnsAccepted`) | 100% | **Build (#6)**; same for the sports side |
| **Singles or sealed** | "Single cards · Sealed products" | Booster box and case buyers (Collectr reports sealed sales up 37% in 2026) | No | **Yes, eBay categories** (packs, boxes, cases, decks) | 100% | **Build (#8)**; it needs its own result layout |
| **No bids yet / few bids** | "No bids yet" | Auction hunters | No | Yes (`bidCount`) | 100% | Quick win |
| **Seller type** | "Private sellers only" | Buyers who avoid stores | No | Yes (`sellerAccountTypes`) | 100% | Skip for now |
| **Signed / autographed** | "Signed cards" | Collectors of signed artist cards | Yes: "signed", "autograph" | Weak | 0–3% | **Skip**; too rare |
| **Error / misprint** | "Error cards" | Error hunters (mostly Pokémon) | Yes: "error", "misprint", "miscut", "off-center" | Weak | 0–1% | **Skip**; people find these by typing the word |
| **Language split** | "English · Japanese · Chinese · Korean · Other" | Pokémon: Chinese (455k listings) and Korean (72k) are real markets | Yes, plus eBay's Language field | Yes | Pokémon names a language on 38% of titles; Magic 3–11%; One Piece 25–30% | **Quick win**; split "Other" |
| **Card number range** | "Card number" | Almost nobody | Yes | — | 15–75% | **Skip**; covered by Set and by "secret rare" detection |

---

## Filters for one game

### Pokémon
| Filter | Plain label | Who wants it | Reliability | Hit rate | Verdict |
|---|---|---|---|---|---|
| **Holo / reverse holo** | "Holo · Reverse holo" | Everyone. Cardmarket treats reverse holo as its own attribute | Title ("reverse", "holo", "cosmos holo", "cracked ice"). Sellers say "holo" often, "reverse" rarely | Any holo word 46%; "reverse holo" 2% | **Build as part of #1.** Offer "Holo (any)" and "Reverse holo only" |
| **Special art** | "Full art · Alternate art · Illustration rare" | Modern chase cards | Title ("full art", "alt art", "SIR", "SAR", "CSR", "Trainer Gallery") | 17% (the rarity ladder already catches many) | **Build as part of #3** |
| **Card type** | "ex · V · VMAX · VSTAR · GX · Trainer · Energy" | Players and set builders | Title for ex/V/VMAX/VSTAR/GX; Trainer and Energy almost never named | ex/V family named on about 42% | **Build (#7)** for the ex / V / VMAX / VSTAR family |
| **Vintage flags** | "1st Edition · Shadowless · Unlimited" | Vintage collectors | Title, with the eBay Features field as backup | 1% in this modern-heavy sample; much higher for vintage searches | Already have 1st Edition; add Shadowless later |
| **Era** | "Vintage · Modern" | Casual collectors | Title (set names) plus the catalog | Era words 10% | Covered by Set |
| **Japanese set code** | "S12a, SV2a, M2a…" | Japanese buyers | Title | 16% of titles | Covered by Set, and by the Japanese labelling already decided |

### Magic: The Gathering
| Filter | Plain label | Who wants it | Reliability | Hit rate | Verdict |
|---|---|---|---|---|---|
| **Foil type** | "Foil · Etched foil · Non-foil · Surge foil · Textured" | Nearly every Magic buyer; foil is a big price difference | Title ("foil" 32%, "etched" 1%); eBay's Finish field is a good backup (1.75M listings) | 32% | **Build as part of #1** |
| **Special frame** | "Borderless · Showcase · Extended art · Retro frame" | Commander players and collectors | Title; eBay's Features field backs it up (315k borderless, 201k showcase, 212k extended art) | 13% | **Build as part of #3** |
| **Secret Lair** | "Secret Lair" | Collectors, a huge share of Magic singles | Title ("Secret Lair", "SLD") | 27% | Include in Promos and special printings |
| **Vintage sets** | "Alpha · Beta · Unlimited · Revised…" | Vintage buyers | Title | 15% | Covered by Set |
| **Reserved List** | "Reserved List only" | Investors | By card name from Scryfall's own flag; titles never say it | Exact for about 570 cards | Already a rarity tier; leave it there |
| **Language** | existing | Japanese alt-art buyers | Title | 3–11% | Existing filter is fine |

### Yu-Gi-Oh!
| Filter | Plain label | Who wants it | Reliability | Hit rate | Verdict |
|---|---|---|---|---|---|
| **Edition** | "1st Edition · Unlimited · Limited" | Core to how the game is collected | Title and eBay's Features field | 1st Edition 25%; Unlimited 7%; Limited 3% | 1st Edition exists; add Unlimited / Limited inside More filters |
| **Set code** | "LOB-EN001" | Set collectors; the code tells set and region | Title | 48% (strict) – 65% | Covered by Set |
| **Rarity** | existing ladder | — | Title | 67% name a rarity | Already built |
| **Card type** | "Monster · Spell · Trap" | Deck builders more than collectors | Titles rarely say it; eBay's Card Type field exists | Too low to measure cleanly | **Skip**; deck builders aren't our user |
| **Product type** | "Tournament pack · Structure deck · Legendary decks" | Chasers of promo-only printings | Title | 7% | Include in Promos and special printings |
| **Region (OCG / TCG)** | covered by Language | — | Set code ("-JP", "-EN") | 7% | Covered by Language |

### One Piece
| Filter | Plain label | Who wants it | Reliability | Hit rate | Verdict |
|---|---|---|---|---|---|
| **Set** | "OP01 … OP15, ST, EB, PRB" | Set collectors | Title code | 69% | **Build as part of #5**; the strongest set signal of any game |
| **Alternate art** | "Alternate art · Parallel · SP · Manga" | The main thing One Piece buyers chase | Title | Parallel / alt art 30%; SP 5% | **Build as part of #3** |
| **Leader cards** | "Leaders" | Players and collectors | Title | 9% | Include in Card type (#7) |
| **Promos / event cards** | "Treasure Cup · Championship · Promo" | Chasers | Title | 26% | Include in Promos and special printings |
| **Colour** | "Red · Green · Blue…" | Deck builders | Title | 11% | **Skip** |
| **Rarity** | existing ladder | — | Title | The printed codes (L, C, UC, R, SR, SEC, TR) appear on 17% | Already built |

### Disney Lorcana
| Filter | Plain label | Who wants it | Reliability | Hit rate | Verdict |
|---|---|---|---|---|---|
| **Foil type** | "Foil · Cold foil" | Everyone; foil vs cold foil is a real price split | Title; eBay's Finish field backs it up | 21–33% | **Build as part of #1** |
| **Set** | "The First Chapter … Fabled" | Set collectors | Title name or card number past the set total | Set name 35%; number 62% | Covered by Set |
| **Rarity** | existing ladder | — | Title | 69% | Already built (Epic and Iconic are newer tiers) |
| **Promos / events** | "D23 · Disney 100 · Challenge · Illumineer's Quest" | Chasers | Title | 23% | Include in Promos and special printings |
| **Ink colour** | "Amber · Ruby…" | Deck builders | Title | 3% | **Skip** |

**One extra finding:** a card number higher than the set total is a quick sign of a hidden rare. It was on about 15% of Pokémon titles and 22% of Lorcana titles in my sample. The engine already uses that for Pokémon, so no new filter is needed. It only needs to keep working for Lorcana's Enchanted, Epic and Iconic cards.

---

## Ranking: value against effort

**Scoring:** value = how many collectors use it and how much it changes what they see; reliability = how often we can read it; effort = what the engine session has to build. I put the cheap, reliable, high-value items first.

| Rank | Filter | Value | Reliability | Effort | Why this place |
|---|---|---|---|---|---|
| 1 | **Foil / holo type** | High | Medium (about 1 in 3 titles) | Low | Foil is the biggest price swing on the same card, and every marketplace has it. The title patterns are simple, and eBay's Finish field is a backup |
| 2 | **Condition** (raw cards) | High | **High (about 86%, eBay's own field)** | Low | Raw cards are 40% of tracked sales and nobody wants Heavily Played by accident. Only shows when "Raw" is picked |
| 3 | **Special art** | High | Low–medium (13–30%) | Low–medium | It's the thing chase collectors hunt (alt art, borderless, parallel). Extends parsing the engine already does |
| 4 | **Promos and special printings** | Medium–high | Medium (17–28%) | Low | The engine already labels these printings. A three-way choice (show, hide, only) is small work |
| 5 | **Set** | Highest | Medium–high (55–75%) | Medium–high | The most-requested filter on every card site, but it needs the set lists from the catalogs (Scryfall, TCGdex, and codes for Yu-Gi-Oh!, One Piece and Lorcana). It's the big one, so it comes after the cheap wins |
| 6 | **Shipping and offers** | Medium–high | **Perfect** (eBay does it) | Low | No title reading needed. Add four options to the search request. Do it for the sports side too |
| 7 | **Card type** | Medium | Medium for Pokémon, low elsewhere | Low | Valuable mostly for Pokémon (ex / V / VMAX). Show it only when the game is Pokémon |
| 8 | **Singles or sealed** | Medium–high | **Perfect** (categories) | Medium | Sealed boxes are a growing market, but it needs a different results layout with no rarity ranking, so it's the biggest of the eight in effort |

Ties and judgement calls:
- Set is valued highest but ranked 5th because it depends on the catalog work and shouldn't hold up the cheap wins above it.
- Shipping and offers could go first on effort and reliability alone. I placed it 6th because it's the least *card-specific* filter and Fables is judged on card search.
- Condition's reliability is settled: the test call showed eBay's own Card Condition filter works and is filled on about 86% of listings (see the test result below).

### What to show up front (the grandparent test)
- **Always visible:** Game, Rarity, Graded or raw, Price.
- **One tap away, "More filters":** Foil / holo type, Condition (only when "Raw"), Special art, Promos, Set, Card type (Pokémon only), Language, Edition, and Shipping and offers.
- **Plain labels, no jargon.** Use "Foil" not "Finish"; "Alternate art" not "variant"; "Promo cards"; "Ships from Canada". Avoid "rungs", "parallels" and set codes in the labels. Show codes only inside the Set drop-down, next to the name.
- **Never show an empty filter.** If a game has no such trait (for example Yu-Gi-Oh! has no reverse holo), hide it.

### Order of work
1. **Week 1 (low effort, no catalog):** Foil / holo, Condition, Promos, Shipping and offers, Language split.
2. **Week 2:** Special art, Card type.
3. **After the catalog work:** Set, then Singles or sealed.

---

## Test result: eBay's Card Condition filter works (2026-11-01)

The Boss approved one test of whether we can use eBay's own Card Condition field instead of reading titles. It used 3 eBay calls: a sign-in, one search that returns eBay's value counts, and one search that filters on a condition. Both searches were for Charizard in Pokémon card singles.

**What I found:**
- **The field is real and filterable.** Filtering on `Card Condition: Near Mint or Better` returned 121,174 of the 214,793 results, with no error. It uses the same filter style we already use for Game (`aspect_filter=categoryId:183454,Game:{…},Card Condition:{…}`).
- **eBay's four values:** Near Mint or Better, Lightly Played (Excellent), Moderately Played (Very Good), Heavily Played (Poor). These are the plain labels to show.
- **How often sellers fill it in:** the value counts eBay returned for this search were 257,427 Near Mint or Better, 41,519 Lightly Played, 18,461 Moderately Played, 3,891 Heavily Played and 54,349 "Not Specified". So about **86% of listings carry a condition**, against 34–62% from titles. (The counts add up to more than the 214,793 results because eBay counts them across the wider card-singles group; the proportions are what matter.)
- **Graded cards don't use it.** The same count shows 66,596 listings marked Graded: Yes. Graded cards have their own grade fields, so show Condition only when "Raw" is chosen, as planned.
- **Search results don't include the condition on each card.** The 100 items returned carried no condition detail, only the general condition code (graded or ungraded). So we can **filter** on it but can't **show** "Near Mint" on each result card without an extra call per listing. Filtering is what matters; a small condition label on result cards would need the title fallback.

**What this changes in the plan:**
- Condition (rank 2) becomes **nearly reliable and cheap**: one extra word in the eBay request, no title reading. Reliability rises from 34–62% to about 86%.
- **Sellers who left it blank (about 14%) disappear** when someone picks a condition. Show a note, "Hides listings with no condition stated", so nobody wonders where they went.
- **Some sellers tick "Near Mint or Better" carelessly** since it's the first choice in the list. That's a seller-honesty problem every site has. It's also another reason to keep our "we don't inspect cards" wording.
- The same style of eBay field might work for other filters (Finish, Features, Card Type). I tested only Card Condition. Section 2 of research/non-sports-filters.md has the earlier view of those fields' quality.

## Open questions for Landon
A. **Include Shipping and offers (Best Offer, free shipping, ships from Canada or the US, returns accepted) on both sides?** Fields & Floors doesn't have them today. They're reliable and the engine can add them to both sides in one go.
~~B. One eBay test call for Card Condition~~ — **done, see above** (approved by the Boss, 2026-11-01).

## Sources (checked 2026-11-01)
- eBay Browse API filter reference (`buyingOptions`, `itemLocationCountry`, `deliveryCountry`, `maxDeliveryCost`, `returnsAccepted`, `bidCount`, `sellerAccountTypes`, `conditionIds`): https://developer.ebay.com/api-docs/buy/static/ref-buy-browse-filters.html
- eBay card singles: item specifics and fill rates, section 2 and section 4 of research/non-sports-filters.md; sealed categories in section 4
- Cardmarket, Finding and Listing Pokémon Cards: https://help.cardmarket.com/en/finding-and-listing-pokemon-cards
- CardNexus, How to Find Cards: https://help.cardnexus.com/articles/4611539
- Scryfall, "is:default": https://scryfall.com/blog/introducing-is-default-232 · Scryfall search reference: https://scryfall.com/docs/syntax
- TCGplayer Advanced Search docs (Final Fantasy example only): https://docs.tcgplayer.com/docs/advanced-search
- Current filters: app/fables/data.js, lib/tcg/search.js, lib/tcg/parseTitle.js (printings list)
- Hit rates: about 1,000 live eBay US card-single titles (category 183454, filtered by game) pulled 2026-11-01 via the Browse API (11 calls) and counted with word patterns
