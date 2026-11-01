# Card catalogs, phase 2: Japanese Pokémon, One Piece, Yu-Gi-Oh!, Lorcana

*Research only, 2026-10-31, for Foils & Fables. No code was changed. No paid accounts were opened and no eBay calls were made.*

**What a "catalog" is here:** a list of every printing of every card (set, card number, rarity, finish). It powers the "every version" list and the "I own this" checklist. Like the Magic and Pokémon work, we'd use **facts only** (names, set codes, numbers, rarities) and keep showing **eBay sellers' own photos**, never catalog card art or card text.

## The short version

| Game | Recommended source | Cost | Can it be free to view while we charge for alerts? | Confidence |
|---|---|---|---|---|
| **Japanese Pokémon** | **TCGdex Japanese** for the sets it covers well (Scarlet & Violet, Mega, most Sun & Moon). Anything it lacks shows as "Japanese printing, version not named". A **Scrydex trial** is the possible paid top-up. | **$0** (Scrydex from **$29 a month** if we ever add it) | Yes. TCGdex's database is MIT-licensed. | Medium: TCGdex holds **71%** of Japanese cards, with big gaps |
| **One Piece** | **No clean free catalog exists.** Stay on filters only, as already decided. Scrydex covers One Piece but needs written OK. | $0 now (Scrydex $29+ a month later) | n/a | High that free options aren't clean |
| **Yu-Gi-Oh!** | **YGOPRODeck API** | **$0** | Probably. Its terms say nothing about paid apps, so **email for written OK** before charging. | Medium-high |
| **Lorcana** | **Lorcast API** | **$0** | **Only if card lists stay free.** Lorcast relies on Ravensburger's goodwill and says it can't charge for its content. Charge for alerts, never for the lists. | Medium |

**The general rule that keeps every source happy:** version lists and "I own this" checklists stay **free to view for everyone** (no paywall), and we charge only for alert features (speed, number of alerts). That's the same position as Scryfall, already decided for Magic.

---

## 1. Japanese Pokémon versions

Japanese and Chinese copies were **18%** of real Pokémon listings in the 40-card test, and none got a version label.

### Options

| Source | What it has | Cost | Terms | Verdict |
|---|---|---|---|---|
| **TCGdex, Japanese** (`api.tcgdex.net/v2/ja`) | 184 sets. Each card has set, number, rarity, finishes and the **national Pokédex number**, so we can map Japanese names to English. | Free, no key | The data repository says **"The Database is licensed under the MIT License"**: commercial use allowed, keep the licence notice. The tcgdex.net site's own pages are CC BY-SA 4.0, but we'd use the API and database, not site pages. There's no published rate limit, so be polite (it returned errors when I went too fast). | **Use**, with gaps shown honestly |
| **Official Pokémon card site, Japan** (pokemon-card.com) | Complete official card search | — | Footer: copyright belongs to Creatures and The Pokémon Company, and **"無断転載はお断りします"** ("no reproduction without permission") | **Don't copy from it** |
| **Scrydex** | Japanese expansions appear as separate `_ja` entries with an **English translation field**. Also covers One Piece, Lorcana and Magic. | Starter **$29** (5,000 credits), Growth $99, Professional $399 a month. No free tier. | Caching is "recommended". Terms forbid using it to **"redistribute, mirror, or commercially exploit the Services without prior written authorization"** or as a "wholesale data source for a competing commercial product". | **Maybe later.** Coverage numbers aren't published; we'd need a trial plus written OK. |
| PokeTrace, PokemonPriceTracker, TCG API and others | Mostly **price** APIs that also list Japanese cards | Free tiers to ~$50 a month | Not checked in detail. Price-focused, which runs against our no-price-history rule. | Not recommended |

### How complete TCGdex Japanese is (counted 2026-10-31, all 184 sets)

| Era | Sets | Sets with **no cards** | Sets complete | Cards held / cards in sets |
|---|---:|---:|---:|---|
| 1996–2002 (original, neo, e-series) | 17 | 0 | 16 | 1,462 / 1,463 (**~100%**) |
| 2003–2008 (ADV, PCG) | 15 | 6 | 9 | 722 / 1,155 (63%) |
| 2009–2012 (Legend) | 5 | 5 | 0 | 0 / 320 (**0%**) |
| 2013–2015 (XY) | 14 | 12 | 2 | 61 / 942 (**6%**) |
| 2016–2019 (Sun & Moon) | 51 | 16 | 35 | 3,139 / 4,095 (77%) |
| 2019–2022 (Sword & Shield) | 29 | 14 | 15 | 2,084 / 3,228 (65%) |
| 2023–2026 (Scarlet & Violet, Mega) | 53 | 15* | 38 | 5,313 / 6,828 (78%) |
| **All** | **184** | | | **12,781 / 18,031 (71%)** |

\*The empty sets in this era are Chinese-language sets that TCGdex files under Japanese. Every Japanese SV and Mega set I spot-checked was complete: 151, Raging Surf, Terastal Fest, VSTAR Universe, Mega Symphonia, MEGA Dream ex, the SV promos and others.

- **The worst gaps for us:**
  - Sword & Shield favourites are **empty**: **Eevee Heroes (S6a)**, Blue Sky Stream (S7R), 25th Anniversary (S8a), Sword/Shield (S1W/S1H) and others. These came up in our eBay sample.
  - The whole **DP** and **Black & White** eras aren't listed at all.
  - XY is nearly empty.
- **Images** exist mostly from late 2022 onward. That doesn't matter, because we don't use catalog images.
- **Card names are in Japanese** (for example ブラッキーVMAX). Matching needs a name map: the Pokédex number handles Pokémon cards, but **trainer cards need a small translation table** (about a day's work).

### Recommendation: Japanese Pokémon
1. Use **TCGdex Japanese** for sets that are complete (all modern SV and Mega, most Sun & Moon, the vintage era). Cost: **$0**. Credit TCGdex and include its MIT notice.
2. For everything else, show **"Japanese printing, version not named"** (the filters-only fallback already agreed).
3. **Optional:** a one-month Scrydex Starter trial (**$29**) to count how many of TCGdex's missing sets it covers. Only adopt it after Scrydex confirms in writing that a free-to-view version list in our app is allowed.
4. **Also possible:** TCGdex is open source and accepts contributions. Filling Eevee Heroes ourselves is legitimate **only** if the data comes from the physical cards, not from copying the official site. It's a lot of manual work, so it's not recommended now.

---

## 2. One Piece

| Source | Finding | Verdict |
|---|---|---|
| **Bandai official site** (onepiece-cardgame.com) | It has an official card list, but the footer says: **"All images, text and data on this website may not be reproduced without permission."** There's no public API or developer programme. | **Don't use** without a licence from Bandai |
| **OPTCG API** (optcgapi.com, a hobby project) | English only. Its own about page says its data was first entered by hand "including from the official One Piece Card Game website" and **later scraped**. No terms published. | **Not clean.** It inherits the Bandai problem. |
| **Scrydex** | Lists One Piece among its supported games ($29+ a month). Same terms as above: written OK needed to "commercially exploit". | The only licensed-looking route. Needs written OK. |
| CardSight AI (from section 7 of the earlier report) | Lists One Piece. $14.95+ a month. Terms forbid building "a standalone database". | Live feed only, with written OK |

### Recommendation: One Piece
- **Stay on filters only** (rarity codes from titles, already built) at **$0**.
- If One Piece grows (it was 17% of card-game sales in the Collectr report), ask **Scrydex** for written permission and a quote. Expect **$29–99 a month**.
- Don't copy from Bandai's card list, and don't use scraped community APIs.

---

## 3. Yu-Gi-Oh! and Lorcana: exact terms

### Yu-Gi-Oh! via YGOPRODeck API (ygoprodeck.com/api-guide)
- **Rate limit:** "20 requests per 1 second". Going over blocks you "for 1 hour".
- **Storage:** they ask: "Please download and store all data pulled from this API locally". Responses are cached on their side for 2 days. **Storing a local copy is encouraged, not forbidden.**
- **Images:** "Do not continually hotlink images directly from this site. Please download and re-host the images yourself", and pulling too many can get an IP blacklisted. We won't use catalog images, so this doesn't affect us.
- **Price:** "is and always will be completely free to use". An optional Premium subscription supports the site.
- **Versions data:** each card's `card_sets` list gives every printing: `set_name`, `set_code` (for example LOB-EN001), `set_rarity` and `set_rarity_code`. That's exactly what a version list needs. Languages: English, French, German, Portuguese and Italian. Japanese-only (OCG) printings aren't covered.
- **Attribution:** none required by the guide. The site notes card information is © 4K Media and Konami and that it's not affiliated with them. We should show a "Card data: YGOPRODeck" credit and a no-affiliation line.
- **Paid apps:** **not addressed**. Its terms-of-service page returned "not found" when checked. **Email YGOPRODeck for written OK** before alerts become paid.
- **Konami:** no fan-content or data policy found for apps. Its site terms protect its trademarks and logos. Use the plain game name for identification only, as covered in the trademark section of the earlier report.

### Lorcana via Lorcast API (lorcast.com/docs/api)
- **Rate limit:** "insert 50–100 milliseconds of delay between the requests". Too many requests return HTTP 429, and repeated overloading can mean a temporary or permanent IP ban. Bulk files on `*.lorcast.io` aren't rate-limited.
- **Storage:** "We encourage you to cache the data" for at least 24 hours. Weekly refresh is enough for card data.
- **Versions data:** `set` (code and name), `collector_number` (not always a whole number), `rarity` (documented values: Common, Uncommon, Rare, Super Rare, Legendary, Enchanted, Promo; **Epic and Iconic aren't listed in the docs**, so check against the live data), `version`, `lang` (only "en" documented), and `prices.usd` / `usd_foil`. We wouldn't use the prices.
- **Terms:** Lorcast uses Lorcana content **"under Ravensburger's Community Code Policy"** and says **"We are expressly prohibited from charging you to use or access this content."**
- **Ravensburger:** I found no published data or fan-content licence; its Community Code is a conduct code. **Enforcement risk is real:** Disney had the fan simulator Pixelborn shut down in 2024.
- **What this means for us:** the safe reading is to **never charge for Lorcana card data**. Lists and checklists stay free, and only alerts are paid. Keep Lorcana names in plain text, with no logos or card art. Confirm with Lorcast that this matches their understanding.

### "I own this" checklists (all games)
- Members' ownership ticks are **our own data**. Store them against our own key (game + set code + card number + finish), **not a vendor's ID**. Then if we ever drop a paid feed (Scrydex or CardSight require deleting cached catalog data when you stop paying), members' collections survive.
- **Privacy:** keep collections **private by default**, as recommended for the sports side.

---

## 4. Do the terms change if we charge for alerts?

| Source | Free to use? | If we charge for alerts | What we must do |
|---|---|---|---|
| **Scryfall** (Magic) | Yes | OK as long as **card data isn't paywalled** (its rule: data must be viewable for free or with free accounts) | Version lists free to view; charge only for alerts. Already decided. |
| **TCGdex** (Pokémon, English and Japanese) | Yes (MIT) | **No change.** MIT allows commercial use. | Include the MIT licence notice and a credit. Don't copy tcgdex.net site pages, which are CC BY-SA (share-alike). |
| **YGOPRODeck** (Yu-Gi-Oh!) | Yes, "always free" | **Not stated** | Email for written OK, credit them, cache weekly, stay under 20 requests a second. |
| **Lorcast** (Lorcana) | Yes | Lorcast can't charge for Lorcana content, and we shouldn't either | Lists free; charge only for alerts; no art or logos; confirm with Lorcast. |
| **Scrydex** (Japanese Pokémon, One Piece, others) | No, $29+ a month | Paid licence, but "commercially exploit" and "redistribute" need **written authorization** | Get written OK before using it in a paid product. |
| **CardSight AI** (sports, One Piece) | Free 750 calls a month, then $14.95+ | In-app use allowed. **No standalone database**; cache only for speed; delete when we stop paying. | Written OK for checklists; key ownership to our own IDs. |
| **SportsCardsPro** | No, $6–49 a month | **Internal use only**; showing data to users needs a commercial licence | Not recommended. |
| **Official sites** (Pokémon Japan, Bandai, Konami, Ravensburger) | — | No reproduction without permission | Don't copy from them. |

---

## Recommendation summary (cost)

1. **Japanese Pokémon:** TCGdex Japanese for complete sets, "version not named" for the rest. **$0.** Optional $29 one-month Scrydex trial to measure gaps.
2. **One Piece:** filters only. **$0.** Revisit with a Scrydex written-OK quote ($29–99 a month) if demand grows.
3. **Yu-Gi-Oh!:** YGOPRODeck. **$0.** Boss emails for written OK before paid alerts launch.
4. **Lorcana:** Lorcast. **$0.** Card lists never paywalled.
5. **Across all games:** lists and checklists free to view; members' "I own this" data on our own keys, private by default; no catalog images or card text anywhere.

**Total new data cost now: $0 a month.** The only possible spend is Scrydex at $29 a month (or $99 if we also want One Piece at volume), and only after a trial and written permission.

## Questions for Landon
A. **Japanese Pokémon:** OK to launch Japanese versions only for the sets TCGdex covers fully, showing "Japanese printing, version not named" for the rest?
B. **Scrydex trial:** OK to spend **$29 for one month** to measure whether it fills the Japanese gaps (Eevee Heroes and others) and covers One Piece? It would be cancelled if not useful.
C. **Free lists rule:** confirm that card version lists and "I own this" checklists stay free for everyone on Foils & Fables, with only alerts paid. Three of the four free catalogs depend on this.

## Sources (read 2026-10-31)
- TCGdex API (Japanese sets and cards): https://api.tcgdex.net/v2/ja/sets · database licence (MIT): https://github.com/tcgdex/cards-database · site terms (CC BY-SA 4.0 for site content): https://tcgdex.net/terms-and-conditions · docs: https://tcgdex.dev
- Pokémon Card Game official site (Japan), footer notice: https://www.pokemon-card.com/
- Scrydex pricing: https://scrydex.com/pricing · terms: https://scrydex.com/terms · expansions docs (Japanese `_ja` sample): https://scrydex.com/docs/pokemon/expansions · FAQ (games supported): https://scrydex.com/faq
- One Piece Card Game official site, footer notice: https://en.onepiece-cardgame.com/ · OPTCG API about page: https://optcgapi.com/about/general
- YGOPRODeck API guide: https://ygoprodeck.com/api-guide/
- Lorcast API docs: https://lorcast.com/docs/api · cards: https://lorcast.com/docs/api/cards · Ravensburger Community Code: https://cdn.ravensburger.com/lorcana/community-code-en · Pixelborn shutdown: https://www.si.com/esports/news/disney-lorcana-pixelborn
- Konami (Europe) website terms: https://www.yugioh-card.com/eu/website-terms/
- CardSight terms (section 7 of research/non-sports-filters.md): https://cardsight.ai/terms · SportsCardsPro API docs: https://www.sportscardspro.com/api-documentation
