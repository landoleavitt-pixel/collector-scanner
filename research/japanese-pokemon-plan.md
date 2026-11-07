# Japanese Pokémon: what it would take to name versions

*Research only, 2026-11-07. No code changed. One small eBay test: 5 calls (a sign-in plus 4 searches of 100 Japanese-language listings; titles only, deleted after counting). Keys never printed.*

## The short version

**Japanese and graded cards are where eBay is the real market, and Japanese is where "every version" stops working.** English cards get a confirmed version from the catalog; Japanese cards mostly get "Japanese printing, version not named". Here is what can honestly be done under today's rules (DECISIONS, 2026-10-31: use TCGdex only where its Japanese set is complete; no AI-made data; we don't fill TCGdex gaps ourselves).

**What I measured** (400 live Japanese Pokémon singles for Pikachu, Charizard, Umbreon and Mewtwo; 378 left after dropping lots and sealed):

| What the seller's title gives | Share of listings | What we can honestly say |
|---|---:|---|
| **Set code and card number** (for example "S12a … 011/172") | **23%** (87) | **67 of the 87 are in a set TCGdex has complete** → we can **confirm** the version. The other 20 are in sets TCGdex has none of → "as listed by seller" |
| **Card number only** ("045/184", no set code) | **43%** (162) | The bottom number often identifies the set. **For 65 of the 162 the number matches exactly one Japanese set** (27 of those in a complete set). The other 97: ambiguous (17), no match (80) |
| **Nothing usable** (no number) | **34%** (129) | "Japanese printing, version not named" |

**So:**
- About **25% of Japanese listings (94 of 378) could be confirmed** from the catalog: 67 by set code, plus 27 by a number that fits one set.
- About **another 15% (58) can be shown with a named set but marked "as listed" or "set looks like…"**
- **About 60% stay "version not named"** however good our code is, because the seller didn't give a number or the set is missing from TCGdex.
- **The gap that matters most: the Japanese 30th Celebration (set code M6a).** It was the #1 set of Q3 2026 on TCGplayer, it appears all through today's listings (for example "M6a 30th Celebration 026/103"), and **TCGdex's Japanese list does not contain it at all** (it has M6 but no M6a). Eevee Heroes (S6a), Pokémon GO (S10b) and 25th Anniversary (S8a) are in the same position: listed, but with no cards.

**Recommendation:** build a **Japanese "every version" list from TCGdex's complete Japanese sets only**, confirm versions when the title's set code and number match a card there, label everything else honestly, and **re-run the coverage check every month** so sets upgrade themselves as TCGdex's volunteers add them. About **3–4 days of engine work**, no new money, no new sources, no contact with anyone.

---

## 1. What we start with

- **TCGdex Japanese** (MIT-licensed): 184 sets listed, 169 Japanese plus 15 Chinese. **115 Japanese sets are complete (98% or more of cards)**, holding **12,781 of 16,516 cards (77%)** ([data/tcg/ja-coverage.json](../data/tcg/ja-coverage.json); counted 2026-10-31; see research/catalogs-phase-2.md section 1).
- **Every card has the national Pokédex number** (`dexId`), the Japanese name, the set and number, a rarity and the finishes. So we can group Japanese cards **by character** without translating names. I checked: Pikachu 63 Japanese cards (32 sets), Charizard 44 (23 sets), Umbreon 24 (15), Mewtwo 35 (19), Eevee 47 (31), and **98–100% of them sit in complete sets**. The gaps are cards in sets TCGdex doesn't have, not holes inside sets it does.
- **Trainers and items** need a name table: `data/tcg/ja-names.json` holds 85 hand-checked names (59 of the high-value ones).
- **The engine already labels Japanese copies from the seller's title** ("Umbreon VMAX · Japanese · set S6a · #048/069, as listed by seller") and falls back to "Japanese printing, version not named" (lib/tcg/family.js, `japaneseSetFromTitle`; research/card-family-retest.md).

## 2. Coverage by era, and what shows up on eBay

**Catalog coverage** (from ja-coverage.json) next to **where the code-and-number listings in my sample came from**:

| Era | Sets | Complete | Cards known | Share of the 87 code-and-number listings |
|---|---:|---:|---|---:|
| Scarlet & Violet and Mega (2023–2026) | 38 | **38** | 100% | **48%** (42) |
| Sword & Shield (2019–2022) | 31 | 15 | 62% | **38%** (33) |
| Sun & Moon (2016–2019) | 49 | 35 | 79% | **13%** (11) |
| Legend (2009–2012) | 5 | 0 | 0% | 1% (1) |
| XY (2013–2015), ADV and PCG (2003–2008), vintage (1996–2002) | 46 | 27 | 6%, 63%, 100% | none in this sample |

**The busiest sets in the sample and their status:**

| Set (code) | Listings | In TCGdex? |
|---|---:|---|
| VSTAR Universe (S12a) | 11 | Complete |
| Pokémon Card 151 (SV2a) | 10 | Complete |
| Terastal Fest ex (SV8a) | 9 | Complete |
| **Eevee Heroes (S6a)** | 8 | **Empty** |
| VMAX Climax (S8b) | 6 | Complete |
| Ruler of the Black Flame (SV3) | 6 | Complete |
| MEGA Dream ex (M2a) | 5 | Complete |
| Shiny Treasure ex (SV4a) | 3 | Complete |
| **Pokémon GO (S10b)** | 3 | **Empty** |
| **25th Anniversary Collection (S8a)** | 2 | **Empty** |
| **20th Anniversary (CP3 area)** | 2 | **Empty** |
| **30th Celebration (M6a)** | many in number-only listings | **Not in TCGdex's Japanese list** |

**What this means:** the modern sets, where most sellers are, are fine. The popular Sword & Shield "special sets" (Eevee Heroes, 25th Anniversary, Pokémon GO) are exactly the empty ones. The one that hurts most is the brand-new 30th Celebration.

**Caveat:** four searches are a small sample (Pikachu, Charizard, Umbreon and Mewtwo, whichever 100 eBay returned first), so percentages are rough: treat each as plus or minus 5 points. Japanese singles number about 2.5 million on eBay (research/non-sports-filters.md), so this is the part of the market worth getting right.

## 3. Sources allowed, and the ones that aren't

| Source | Allowed? | Notes |
|---|---|---|
| **TCGdex Japanese** (MIT) | **Yes** | The base. Credit TCGdex (already in `data/tcg/README.md`) |
| **The seller's own title** (set code, number) | **Yes** | Already used; shown as "as listed by seller" |
| **Printed denominator → set** ("045/184" → VMAX Climax) | **Yes** | Our own lookup from TCGdex's set sizes (`cardCount.official`); only when exactly one Japanese set has that size |
| **Cards typed in by a person from cards they own, and contributed to TCGdex** | **Allowed in principle**, not recommended | TCGdex needs the contributor to author everything and rejects AI-made data; the work is hours per set and needs the cards in hand (research/catalogs-phase-2.md section 5) |
| **Pokémon Japan's official card search, press releases** | **No** | The site forbids reproduction without permission |
| **Bulbapedia, Serebii, TCG Collector, shop checklists** | **No** | No reuse licence compatible with a commercial site (Bulbapedia is non-commercial) |
| **Scrydex** | **Not now** | Decided: no trial. Paid, and needs written OK |
| **AI-written card or set lists** | **No** | DECISIONS (2026-10-31) and TCGdex's own rule |
| **An English-name table for Japanese sets** (so "Eevee Heroes" in a title maps to S6a) | **A question, not a yes** | It's a lookup of set *names*, not card data, and the engine already has some. But whoever builds it must **type it by hand from sources we may use**, not have AI write it. See question A |

## 4. What the screen can honestly say

Four states for a Japanese listing. The first is new; the other three exist today.

| # | What we know | The label | Why it's honest |
|---|---|---|---|
| 1 | **Set code and number in the title; the set is complete in TCGdex; the card at that number is the right character** | **"Japanese · Umbreon VMAX · VMAX Climax (S8b) · No. 095/184 · Triple Rare"** (no "as listed") | We checked it against a complete set, including that the card is the character searched. Strongest label |
| 2 | **Set code and number; the set is not in our list or has no cards** | **"Japanese · set S6a · No. 048/069, as listed by seller"** | We repeat what the seller wrote and say so (today's behaviour) |
| 3 | **Number only; the bottom number fits exactly one Japanese set** | **"Japanese · looks like Eevee Heroes (S6a) · No. 048/069, set guessed from the number"** | A guess, flagged as one. Only when the match is unique and the character fits |
| 4 | **Nothing usable** | **"Japanese printing, version not named"** | Today's wording |

**Rules for the engine (so labels never overclaim):**
- State 1 requires **all three**: the set is `full` in ja-coverage, the number exists in that set, and TCGdex's Pokédex number (or the trainer-name table) matches the card searched. Any miss falls to state 2, 3 or 4.
- **"Complete" should say "complete in our list"**, never "every Japanese printing exists". TCGdex's lists can still miss alternate or promo cards inside a set; that risk is small (I found none inside the sets I checked) but not zero.
- **Never show a rarity name on state 2, 3 or 4.** Only state 1 has one.
- **Cards with "CHN", "S-Chinese", "Korean"** (seen in the sample: for example "Pikachu E csDC 001/024") aren't Japanese. Keep the language check first.
- **Graded copies:** a graded Japanese card's slab label states the card; the same rules apply to the title.

**What the "every Japanese version" list can say at the top** (for the checklist or version list):
> "Japanese cards we know about: 63 cards from 32 sets. A few newer or special Japanese sets aren't in our list yet."

Plain, specific, no promise of completeness. **Don't show a total like "63 of 80".** We don't know the real total.

## 5. What it would take (engine work)

| # | Work | Effort |
|---|---|---|
| 1 | **Japanese catalog file** from TCGdex's complete Japanese sets: cards grouped by Pokédex number (set code, number, rarity name, finishes, Japanese name). About 12,800 cards, compact, built by the existing catalog script | ½ day |
| 2 | **Rarity mapping:** TCGdex's English rarity names for Japanese cards (for example "Triple Rare", "Art Rare") mapped to the five approved groups. I haven't checked every value in the Japanese data; the engine should list the distinct ones first | ½ day |
| 3 | **State 1 matching** in `family.js`: code + number → the card in that set → check the character | 1 day |
| 4 | **State 3 matching:** a table from printed bottom number to set, used **only** when exactly one Japanese set has it (39 of the 70 sizes are shared, so about half of the numbers can't be used) | ½ day |
| 5 | **Checklist and "I own this"**: a Japanese tab for a character, keyed by set code + number + finish as already decided; shows only cards from complete sets | 1–2 days |
| 6 | **Monthly refresh:** re-run the coverage script and rebuild the catalog; sets turn "complete" by themselves as TCGdex's volunteers add them (recent additions: BW8a Spiral Force on 19 Oct and S5R on 7 Oct 2026) | 2 hours, then monthly |
| **Total** | | **about 3–4 days** |

## 6. What it won't fix, and what could

**Won't fix:**
- **The missing sets** (30th Celebration, Eevee Heroes, 25th Anniversary, Pokémon GO). Only TCGdex's volunteers can add them, and we don't fill gaps ourselves.
- **The 34% of titles with no number**, and the 20% whose number matches no known Japanese set.
- **Japanese cards that exist in no database we may use** (very old promos, oddities).

**What could:**
- **Watch TCGdex's contributions.** New Japanese sets arrive as one-set pull requests (the two recent ones came from the same volunteer). The monthly refresh picks them up. We don't need to ask anyone.
- **A person contributing one set to TCGdex** (Landon, a friend, or a collector who owns the cards), by hand, with the cards in front of them. The 30th Celebration (103 cards) is the one that would matter most. This is the only route that adds data, and it's slow. I wouldn't plan around it.
- **Later, with a decision:** a paid, licensed Japanese feed (Scrydex, about $29 a month) *after* written permission; currently ruled out.

## 7. How it affects the rest of the plan

- **Searching Japanese cards works today**; only the version label is limited. The eBay Language field is reliable (a Japanese filter already exists).
- **Alerts for the version you're missing** work for Japanese cards in complete sets, once state 1 exists. For other Japanese cards, alerts can only be "any Japanese listing of this character".
- **Positioning** (research/fables-why.md): the strongest "every version" pitch is **English Pokémon and Magic**. For Japanese, the honest line is "we find Japanese cards and name the version when we can". That's still better than eBay, which names nothing.

## Questions for Landon
A. **An English-nicknames table for Japanese sets** ("Eevee Heroes", "VMAX Climax", "25th Anniversary" → set code): OK to build it **by hand** (typed by a person, not generated), limited to the 30 sets that appear most in eBay titles? It would turn many "number only" listings into state 3.
B. **State 3 ("looks like… set guessed from the number")**: OK to show, with the "guessed" wording? Or keep to states 1, 2 and 4 only (safer, fewer labels)?
C. **Should someone contribute the Japanese 30th Celebration set to TCGdex** by hand? (It needs the whole set in hand; I'd treat it as optional and slow.)
D. **Go ahead with the 3–4 days of engine work** now, or wait until the English versions-first screens have had real users?

## Sources (checked 2026-11-07)
- TCGdex Japanese sets and cards: https://api.tcgdex.net/v2/ja/sets · https://api.tcgdex.net/v2/ja/cards (queried by `dexId` and name) · TCGdex data licence (MIT): https://github.com/tcgdex/cards-database
- Our own data: data/tcg/ja-coverage.json, data/tcg/ja-names.json, data/tcg/README.md
- eBay Browse API sample (category 183454, Game Pokémon TCG, Language Japanese; Pikachu, Charizard, Umbreon, Mewtwo; 2026-11-07)
- TCGplayer, set rankings Q3 2026 (30th Celebration #1): https://seller.tcgplayer.com/blog/best-selling-trading-card-games-q3-2026
- Earlier research: research/catalogs-phase-2.md (sections 1 and 5), research/card-family-retest.md, research/non-sports-filters.md, research/fables-why.md · DECISIONS.md (2026-10-31, Japanese Pokémon)
- Engine: lib/tcg/family.js (`japaneseSetFromTitle`, `japaneseLabel`)
