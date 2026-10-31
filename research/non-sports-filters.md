# Sister site for card games: games, filters, "rarest first", eBay set-up, legal, names

Research only. No code was changed. Written 2026-10-30.

**Words used in this report**
- **Singles**: one card sold on its own (not a pack, box or lot).
- **Sealed**: unopened packs, boxes or cases.
- **Slab / graded**: a card a grading company (PSA, CGC, BGS, TAG…) has scored 1–10 and sealed in a plastic case.
- **Item specifics**: the fill-in-the-blank fields sellers complete on eBay (Game, Set, Rarity, Language…). eBay's API calls them "aspects".
- **Title parsing**: reading the listing title to work out what the card is. This is how the sports site works today.
- **Rarity tier**: the rarity printed on the card by the game company (for example Common, Rare, Secret Rare).

---

## The short version

1. **Launch with 5 games: Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece and Disney Lorcana.** Together they make up about 98% of card-game singles listed on eBay right now. Pokémon alone is about 59%.
2. **Next:** Dragon Ball Super, Weiss Schwarz, Star Wars (Unlimited and older games), Flesh and Blood and Riftbound. **Easiest extra:** licensed non-sport sets (Topps Star Wars, Marvel, Garbage Pail Kids). They use the same serial numbers (/99, /25, /1) as sports cards, so our current engine already works on them.
3. **"Rarest first" can't use print runs for most of these games**, because the companies don't number most cards. Instead we rank by the **rarity tier printed on the card**, using each company's own rarity ladder. Where a card **is** serial-numbered (Magic "serialized" cards, non-sport sets), we put it at the top using the existing /N logic.
4. **eBay set-up is simple.** One category holds all card-game singles (183454). Separate categories hold packs, boxes, cases and lots, so excluding sealed product and lots is easy. "Graded" is a condition code (2750), not a separate category.
5. **eBay's own fields only reliably give us the game.** Rarity and set fields are coarse or wrong too often. Rarity tiers, serial numbers, 1st Edition and similar details should come from **title parsing** (as on the sports site), with eBay's fields as a backup.
6. **Legal:** naming games in plain text to say what cards we search ("Search Pokémon cards") is generally allowed as factual use. **No logos, official fonts, mascot art or game names in our brand, domain or app name.** Apple's App Store rules are stricter than the law. That is the biggest real risk, covered in section 5.
7. **Name picks:** **Foils & Fables**, **Realms & Rares** and **Spells & Sleeves**. All three .coms were unregistered on 2026-10-30, and quick US and Canadian trademark searches found no matching marks.

---

## 1. Which games to cover first

### Evidence

**A. eBay listing counts (live, US site, 2026-10-30).** These are card-game singles (category 183454) by eBay's "Game" field, counted from eBay's public search pages.

| Game | Singles listed now | Share |
|---|---:|---:|
| Pokémon | 20,072,361 | 58.8% |
| Magic: The Gathering | 8,454,313 | 24.8% |
| Yu-Gi-Oh! | 3,376,195 | 9.9% |
| One Piece | 957,930 | 2.8% |
| Disney Lorcana | 607,147 | 1.8% |
| Dragon Ball Super | 234,092 | 0.7% |
| Weiss Schwarz | 228,504 | 0.7% |
| Star Wars (eBay's "Star Wars CCG" value) | 161,494 | 0.5% |
| Everything else (Flesh and Blood, Riftbound, Gundam, Digimon, Sorcery…) | below 161k each | — |

The whole card-game area of eBay (category 2536, including sealed product and accessories) showed **37,216,006** listings.

eBay's own "Shop by game" menu lists the games in this order: Pokémon, Magic, Yu-Gi-Oh!, One Piece, Disney Lorcana, Star Wars, Flesh and Blood, Dragon Ball Super, Sorcery, Weiss Schwarz.

**B. Sold volume (what actually sells).**
- **GemRate (eBay only, 2025):** more than **$837 million** spent on card-game and non-sport singles on eBay, across **19.5 million+** sales, with an average sale of $43. This leaves out lots, packs and sealed product. It is not split by game. The top Pokémon characters were Charizard (more than $74M) and Pikachu (more than $72.9M). ([cllct via Yahoo Sports](https://sports.yahoo.com/articles/more-2-6-billion-spent-154500186.html))
- **Collectr 2026 mid-year report** (sales from eBay, Fanatics Collect, Goldin and Heritage): Pokémon is **65%** of tracked activity. One Piece is a clear #2 at **17%**, then Yu-Gi-Oh! (~7%), Magic, Lorcana and Flesh and Blood. Graded cards are **60%** of tracked sales, and PSA holds **85%** of graded sales. TAG grading grew more than 500% in a year. ([Collectr report PDF](https://public.getcollectr.com/public-assets/reports/state-of-the-hobby-2026-mid-year-report.pdf))
- **TCGplayer, Q4 2025** (dollar sales on TCGplayer, singles plus sealed): 1 Magic, 2 Pokémon, 3 One Piece, 4 Yu-Gi-Oh!, 5 Riftbound (new), 6 Lorcana, 7 Pokémon Japan, 8 Gundam, 9 Digimon, 10 Star Wars: Unlimited. ([TCGplayer](https://seller.tcgplayer.com/blog/bestselling-trading-card-games-q4-2025))

**What this means.** Every source puts the same five games on top. They disagree on the order after Pokémon. Magic is huge on TCGplayer, which is where players buy. One Piece is #2 among collectors (Collectr), which is closest to our "grail hunter" audience. On eBay itself, Magic has far more listings than One Piece. All five are clearly worth covering.

### Recommendation

- **Launch (5):** Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece, Disney Lorcana.
- **Later (in this order):** Dragon Ball Super (Fusion World and Masters), Star Wars: Unlimited, Weiss Schwarz, Flesh and Blood, Riftbound (new in late 2025 and climbing fast on TCGplayer; worth re-checking in a quarter), then Gundam, Digimon and Sorcery.
- **Separate quick win: licensed non-sport sets** (Topps Chrome Star Wars, Upper Deck Marvel, Garbage Pail Kids…). These sit in eBay's Non-Sport singles category (183050, listed in [eBay's condition guide](https://developer.ebay.com/api-docs/user-guides/static/mip-user-guide/mip-enum-condition-descriptor-ids-for-trading-cards.html)). They use serial numbers like sports cards, so the existing print-run engine applies almost unchanged.

---

## 2. Filters per game

### How a filter can be detected

- **Title** = we can read it from the listing title (most reliable for us, and how the sports site works).
- **Specifics** = eBay's fill-in fields. Fill rates below come from eBay's live counts.
- **Condition code** = eBay's required graded/ungraded condition, which is very reliable.
- **Category** = eBay category ID, which is very reliable.
- **No** = can't be detected well.

### How well sellers fill in eBay's fields (live counts, singles)

- **Game:** filled on nearly every listing. The per-game counts add up to about the total. **Reliable.**
- **Language:** well filled for Pokémon (16.0M English, 2.49M Japanese, 455k Chinese, 72k Korean), One Piece (689k English, 198k Japanese) and Yu-Gi-Oh! (2.66M English, 323k Japanese). **Mostly reliable**, but listings with the field blank are dropped if we filter on it.
- **Rarity:** filled often, but **too coarse and often wrong** for a rarity sort. For Pokémon, the top values are generic (Common, Uncommon, Rare, Holo Rare, Ultra Rare, Double Rare, Secret Rare, Reverse Holo). Modern tiers like "Special Illustration Rare" don't appear in the top values. Yu-Gi-Oh! and Lorcana show values borrowed from other games ("Holo Rare", "Gold").
- **Set:** **unreliable.** The Yu-Gi-Oh! Set field shows "Fossil" and "Commander", which are Pokémon and Magic set names. The Magic Set field shows "Unlimited" at only 9k listings.
- **Professional Grader:** wrong in a visible way. For Yu-Gi-Oh!, 288,000 listings say "Rare Edition (Rare)" as the grader, far more than PSA's 66,248. Sellers are clearly picking "Rare" from the list by mistake.
- **Features:** useful as a backup for **1st Edition** (Yu-Gi-Oh! 1.38M, Pokémon 413k), **Shadowless** (Pokémon 52k) and **Borderless / Showcase / Extended Art** (Magic 315k / 201k / 212k).
- **Finish:** Magic **Foil** is filled on 1.75M listings. A useful backup.
- **Graded:** graded vs ungraded is a **required condition** on eBay for card singles (code 2750 = graded, 4000 = ungraded). Grader and grade are **required fields** for graded cards. ([eBay docs](https://developer.ebay.com/api-docs/user-guides/static/mip-user-guide/mip-enum-condition-descriptor-ids-for-trading-cards.html)) Example: One Piece has 105,492 graded and 852,499 ungraded singles.

### Filters shared by every game

| Filter | What collectors want | How we detect it |
|---|---|---|
| **Game** | The switch at the top of the filters | Specifics (reliable) + category |
| **Rarity tier** | The core "how rare" filter. Each game has its own ladder (section 3) | Title (main), specifics (backup) |
| **Language** | English / Japanese / other. Japanese is about 12% of Pokémon singles and about 21% of One Piece singles | Specifics + title ("Japanese", "JP", "JPN", Japanese set codes) |
| **Graded or raw** | Graded is 60% of tracked sales (Collectr) | Condition code 2750 / 4000 (reliable) |
| **Grader** | PSA, CGC, BGS, TAG, SGC… | Title (main), with grader on the condition as backup |
| **Grade** | 10, 9.5, 9… ("PSA 10 only" is the most common ask) | Title (main), with grade on the condition as backup |
| **Set / era** | Era is easy (for example Pokémon "Vintage WOTC 1999–2003"). Exact set is harder | Title using set names and **set codes** (e.g. "OP05", "SV151", "MH3", "RA03-EN"). Specifics are unreliable |
| **Character / card name** | "Charizard", "Luffy", "Black Lotus" | Typed search (as today) |
| **Price** | Same quick picks plus min/max as the sports site (already decided) | API price filter |
| **Hide sealed, lots and proxies** (on by default) | Same as sports (already decided) | Category for sealed and lots. Title words for proxies ("proxy", "custom", "orica", "fan art", "replica", "not real") |
| **Sealed product mode** (optional, later) | Booster boxes and cases are a big market (Collectr: sealed up 37% in 2026) | Category (packs 183456, boxes 261044, cases 261045) |

### Filters for one game only

**Pokémon**
- **Rarity tier (modern):** Special Illustration Rare, Hyper Rare / Mega Hyper Rare, Illustration Rare, Ultra Rare, Double Rare, ACE SPEC. Detected by **title**. Sellers write "SIR", "Special Illustration", "IR", "Hyper Rare", "Gold", etc.
- **Japanese rarity codes:** SAR, SR, AR, UR, MUR, BWR, CHR, CSR. Detected by **title**.
- **Vintage flags:** **1st Edition** and **Shadowless** (title, plus the Features field as backup). Also Gold Star (☆), Shining, Crystal and Secret Rare (a card number above the set total, e.g. "105/102").
- **Promo:** title or Features ("Promo", "SWSH/SVP/MEP + number").
- Serial numbers: we found no regular serial-numbered cards in modern Pokémon sets. Scarcity comes from the rarity tier and how few graded 10s exist.

**Magic: The Gathering**
- **Serialized** (stamped, e.g. "123/500"). Detected by **title** (/N). This is the closest match to our sports engine.
- **Card treatment:** Borderless, Showcase, Extended Art, Full Art, Retro Frame. Title plus Features as backup.
- **Foil type:** Foil, Etched, Textured, Surge, Galaxy, Halo, Double Rainbow, Step-and-Compleat. Title plus Finish as backup.
- **Reserved List:** a fixed official list of about 570 older cards Wizards has promised never to reprint ([Wizards' reprint policy](https://magic.wizards.com/en/news/announcements/official-reprint-policy)). Detected **by card name**: we would keep the list ourselves and match names. Titles never say "Reserved List".
- **Vintage sets:** Alpha, Beta, Unlimited, Arabian Nights, Legends… Title.
- Rarity (Common / Uncommon / Rare / Mythic) is in the specifics, but it matters little to high-end collectors compared with treatment and serials.

**Yu-Gi-Oh!**
- **Rarity tier:** Starlight, Quarter Century Secret, Ghost, Ultimate, Collector's, Platinum Secret, Prismatic Secret, Secret, Ultra, Super. Detected by **title**.
- **Edition:** 1st Edition / Unlimited / Limited. Title plus Features as backup (well filled).
- **Set code:** e.g. "LOB-EN001", which tells us the set and the language region. Title.

**One Piece**
- **Rarity:** L, C, UC, R, SR, SEC, TR (these are Bandai's printed codes, seen on [Bandai's card list](https://en.onepiece-cardgame.com/cardlist/)). Detected by **title**.
- **Art version:** Parallel / Alternate Art, **Manga Rare** (a fan name, not printed on the card), SP, Super Parallel. Title.
- **Prize / event cards:** "Championship", "Treasure Cup", "Flagship". Title.
- Japanese is unusually big for One Piece (about 21% of singles).

**Disney Lorcana**
- **Rarity:** Common, Uncommon, Rare, Super Rare, Legendary, **Epic**, **Enchanted**, **Iconic** (Epic and Iconic were added in Set 9 "Fabled", 2025). Detected by **title**. The specifics include "Enchanted" (9,881 listings) and "Legendary", but not the new tiers yet.
- **Foil:** Cold Foil / Foil. Title plus Finish as backup.
- **Promos:** D23, Disney100, Challenge promos. Title.

---

## 3. "Rarest first": what replaces print-run sorting

**The idea:** each game gets a **ladder of rarity tiers** (highest first). The sort goes:
**(1) serial-numbered cards by /N (lowest first, exactly like sports) → (2) rarity tier → (3) graded 10 above other grades.**

The colour tiers could reuse the sports ones (Grail, Ultra, Rare, Scarce), mapped to each game's ladder.

**Fact to keep straight:** except for Magic serialized and non-sport sets, companies **don't publish print runs**. Some (Ravensburger for Lorcana) say they don't publish pull rates either. So the copy must say **"ranked by the rarity printed on the card"**, not "by print run" or "by pull rate". That keeps it strictly accurate.

### Pokémon (current Scarlet & Violet and Mega Evolution eras)
Official symbol order from [Pokémon.com](https://www.pokemon.com/us/pokemon-news/pokemon-tcg-scarlet-and-violet-revamps-pokemon-tcg-card-aesthetic): three gold stars = Hyper Rare, one gold star = Illustration Rare, two shiny stars = Ultra Rare, two black stars = Double Rare, then Rare, Uncommon and Common.

1. **Mega Hyper Rare.** It replaced Hyper Rare in the Mega Evolution era. Only 2 in the base Mega Evolution set ([TCGplayer set facts](https://seller.tcgplayer.com/blog/mega-evolution-quick-facts), [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Mega_hyper_rare_(TCG)))
2. **Hyper Rare** (gold) / Black White Rare (Black Bolt and White Flare sets)
3. **Special Illustration Rare** (two gold stars)
4. **Illustration Rare** (one gold star) / Mega Attack Rare
5. **Ultra Rare** (two silver stars)
6. **Double Rare** (two black stars) / ACE SPEC
7. Rare (holo, then non-holo) → Uncommon → Common

**Japanese equivalents:** MUR / UR → SAR → AR → SR → RR → R → U → C. These names come from fan checklists, so we should check them against each set list before shipping.

**Vintage overlay:** 1st Edition above Shadowless above Unlimited for the same card. Gold Star, Shining, Crystal and Secret Rare all sit at the top of their eras.

### Magic: The Gathering
1. **Serialized**, by /N: 1/1 (e.g. the One Ring), then /250, /500… Same logic as sports.
2. **Reserved List vintage** (Alpha, Beta, Unlimited power cards)
3. **Special foils in Collector Boosters** (Double Rainbow, Textured, Surge, Galaxy, Halo, Etched)
4. **Mythic** (Borderless/Showcase/Extended Art above the regular version)
5. Rare → Uncommon → Common

Official printed rarities are Common, Uncommon, Rare and Mythic Rare (plus "Special"). Steps 1–3 are collector treatments, not official rarities. Collectors value them that way, but the ordering is a judgement. Serial numbering is confirmed by [MTG Wiki](https://mtg.wiki/page/Serialized) (since 2021; e.g. Innistrad Remastered Edgar Markov /500).

### Yu-Gi-Oh!
Konami has no single official page that ranks rarities. This order follows [Yugipedia](https://yugipedia.com/wiki/Starlight_Rare), the main checklist source:
1. **Starlight Rare** / **Quarter Century Secret Rare** (Quarter Century replaced Starlight in core sets 2023–2025, and Starlight returned in mid-2025)
2. **Ghost Rare**
3. **Collector's Rare** / **Ultimate Rare** / **Platinum Secret Rare** / Prismatic Secret Rare
4. **Secret Rare**
5. **Ultra Rare**
6. **Super Rare**
7. Rare → Common

Within the same card: 1st Edition above Unlimited. LOB / MRD / SDK-era 1st Editions are the vintage grails.

### One Piece
1. **Manga Rare** and Super Parallel. These are community names for the comic-panel alternate art, not printed by Bandai. Collectors treat them as the top pack card.
2. **Treasure Rare (TR)** and **SP**
3. **Secret Rare (SEC)**, parallel version first
4. **Super Rare (SR)**, parallel version first
5. **Leader (L)**, parallel version first
6. Rare → Uncommon → Common

Printed codes (L, C, UC, R, SR, SEC, TR) are confirmed on [Bandai's card list](https://en.onepiece-cardgame.com/cardlist/). Prize cards (Championship, Treasure Cup) are rarer than any pack card and should sit at the very top.

### Disney Lorcana
1. **Iconic** (2 cards in Fabled)
2. **Enchanted** (18 in Fabled, from the foil slot)
3. **Epic** (18 in Fabled)
4. **Legendary**
5. **Super Rare**
6. Rare → Uncommon → Common

The order of Epic, Enchanted and Iconic, and the counts, come from [Rare Candy](https://rarecandy.com/blog/collectors-guide-lorcanas-new-card-rarities) and set lists. Ravensburger doesn't publish pull rates.

---

## 4. eBay Browse API: how it fits

### Category IDs (from eBay's public category pages)

| What | Category ID |
|---|---|
| All card games and accessories (parent) | **2536** |
| **Card-game singles** (raw **and** graded) | **183454** |
| Sealed packs | 183456 |
| Sealed boxes | 261044 |
| Sealed cases | 261045 |
| Sealed decks and kits | 183457 |
| Complete sets | 183459 |
| Player-built decks | 183458 |
| **Mixed lots** (to exclude) | 183455 |
| Uncut sheets | 261948 |
| Non-sport singles (Marvel, Star Wars Topps…) | 183050 |
| (For reference) Sports singles | 261328 (our current search uses parent 212) |

**Graded has no category of its own.** It is condition code **2750** (ungraded is **4000**) inside the singles category. The API filter `conditionIds:{2750}` returns graded only.

**There are no per-game categories.** The game is the "Game" item specific inside 183454. The exact values eBay uses are: `Pokémon TCG`, `Magic: The Gathering`, `Yu-Gi-Oh! TCG`, `One Piece CCG`, `Disney Lorcana TCG`, `Dragon Ball Super Card Game`, `Weiss Schwarz` and `Star Wars CCG`.

### Item-specific names seen in category 183454
Game · Set · Rarity · Language · Card Name · Character · Card Type · Features · Finish · Card Condition · Graded · Grade · Professional Grader · Manufacturer · Year Manufactured · Country of Origin · Attribute/MTG:Color. Fill quality is covered in section 2.

### Can aspect_filter do the filtering instead of title parsing?
**Partly.** eBay's docs ([Browse API guide](https://developer.ebay.com/api-docs/buy/static/api-browse.html)) say:
- `aspect_filter` works **inside one category**, and the category ID must be given twice. Example: `category_ids=183454&aspect_filter=categoryId:183454,Game:{Pokémon TCG}`. Several values are joined with `|`.
- `fieldgroups=ASPECT_REFINEMENTS` returns the value counts, so we could show "Japanese (2.4M)" style counts.

**Recommendation:**
- **Use aspect_filter for Game** (reliable, and it cuts the junk) and possibly **Language**.
- **Use condition codes for graded vs raw** (reliable and required).
- **Use categories** to drop sealed product and lots (reliable).
- **Use title parsing for rarity tier, serial numbers, grade, grader, 1st Edition, set codes and proxies.** eBay's Rarity, Set and Grader fields are too coarse or too often wrong to rank on. Filtering on them also hides every listing where the seller left them blank.
- **Note:** search results don't include each listing's item specifics. Reading them means one extra call per listing, which would burn our daily eBay quota. Title parsing avoids that.

I did not call the eBay API. Counts come from eBay's public pages. After about a dozen automated page reads, eBay's bot protection began blocking them, so I stopped. Sold counts per game on eBay were therefore not collected.

---

## 5. Legal and trademark

*Not legal advice. A one-hour review by a Canadian trademark lawyer before launch would be cheap insurance (see Questions).*

**Safe (with sources)**
- **Naming a game in plain text to say what we search** ("Search Pokémon cards", a "Magic: The Gathering" filter). In the US this is **nominative fair use**: using a brand name to refer to the real product. Courts allow it when (1) you need the name to identify the product, (2) you use only as much as needed (the plain word, not the logo or styling) and (3) nothing suggests sponsorship. ([New Kids test, applied in Toyota v. Tabari, 9th Cir. 2010](https://law.justia.com/cases/federal/appellate-courts/ca9/07-55344/07-55344-2011-02-25.html))
- **Rarity names** ("Special Illustration Rare", "Enchanted", "Starlight Rare") used to describe a card factually.
- **Card photos inside listings.** They come from eBay sellers through the API, the same as on the sports site.

**Not safe: don't do these**
- Game names, logos, official fonts, card-back designs or mascot art (Pikachu, Luffy…) in **our brand, logo, domain, app name or ads**. Wizards' fan policy, for example, says its logos and trademarks need written permission ([Wizards Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy)).
- Anything that hints we're official or endorsed ("the official Pokémon card finder").
- Showing proxies or fakes. We exclude them anyway.

**Do add**
- A footer line: "Not affiliated with or endorsed by The Pokémon Company, Nintendo, Wizards of the Coast, Konami, Bandai, Ravensburger or Disney. All game names are trademarks of their owners." (Plain, factual.)

**Risks, stated plainly**
- **Apple App Store (highest risk).** Apple's rules are stricter than the law. Guideline 5.2.1: *"Don't use protected third-party material such as trademarks… in your app without permission."* Guideline 2.3.7 bans packing the app name or keywords with trademarked terms ([Apple guidelines](https://developer.apple.com/app-store/review/guidelines/)). Many card-price apps do list game names. But a reviewer **could** reject the app, or ask for proof of permission, if game names are prominent in the app name, subtitle, keywords or screenshots. **Mitigation:** keep game names out of the app name, subtitle and keywords. Use them only as filter labels inside the app, and keep the disclaimer reachable.
- **Canada.** Canada has no written "nominative fair use" rule like the US. The closest risk is section 22 of the Trademarks Act, "depreciating the goodwill" of a registered mark. Under the Supreme Court's four-part test (Veuve Clicquot, 2006), the owner must show that the mark was used with our goods or services, that it is well known, that our use creates a link in people's minds, and that the use is likely to damage its goodwill ([Smart & Biggar summary](https://www.smartbiggar.ca/insights/publication/barbie-and-veuve-clicquot----supreme-court-of-canada-clarifies-protection-for-famous-trademarks-in-canada)). Plain text in filters to describe what's for sale is low risk. A name-and-logo-heavy page is not.
- **Pokémon** is known for protecting its brand aggressively against fan projects. Being purely factual and logo-free matters most here.

---

## 6. Names for the sister brand

The pattern beside **Fields & Floors**: "X & Y", alliterative, about where the hobby happens. Fantasy words, no game trademarks, and none of the game-specific rarity words ("Mythic", "Enchanted", "Planeswalker", "Wizard").

All .com checks were made with Verisign's WHOIS on 2026-10-30. "Unregistered" means nobody owns it today, so it can be bought at normal price. The US trademark check used USPTO's search; the Canada check used CIPO's database.

| Name | .com | US trademark (quick) | Canada (quick) | Notes |
|---|---|---|---|---|
| ⭐ **Foils & Fables** | foilsandfables.com **unregistered** (fablesandfoils.com also unregistered) | No combined mark. "FOILS" alone is a pending mark for online entertainment (class 41), a different field | No match | Best twin to Fields & Floors: same F & F initials. "Foils" = shiny cards, "Fables" = fantasy |
| ⭐ **Realms & Rares** | **unregistered** | No combined mark. "RARES" and "REALMS" exist alone in other fields | No match | Says "fantasy worlds" plus "rare cards" plainly. Fits "rarest first" |
| ⭐ **Spells & Sleeves** | **unregistered** | No combined mark | No match | "Sleeves" = card protectors every collector knows. Playful |
| Hoards & Holos | **unregistered** | No combined mark ("HOLOS" alone exists in other fields) | No match | Fun, but "holos" is jargon to non-collectors |
| Runes & Rares | **unregistered** | No combined mark | No match | Close to Realms & Rares, a bit darker |
| Myths & Mints | **unregistered** | No combined mark | No match | "Mint" = condition word. Slight candy feel |
| Wyrms & Wonders | **unregistered** | No combined mark | No match | Very fantasy. "Wyrm" is hard to spell |
| Vaults & Visions | **unregistered** | No combined mark | No match | Fine, but less clearly about cards |
| Glyphs & Gilds | **unregistered** | No combined mark | No match | Pretty, but hard to say aloud |
| Foils & Folklore | **unregistered** | Not checked separately ("foils" covered above) | Not checked | Back-up if Foils & Fables is lost |
| Lore & Lustre | taken (registered 2021) | — | — | Dropped |
| Realms & Relics / Tales & Treasures | taken | — | — | Dropped |

**My 3 picks: Foils & Fables (first choice), Realms & Rares, Spells & Sleeves.** Under one roof the pair would read "Fields & Floors" and "Foils & Fables". The matching initials make the switch button at the top feel like one family.

These quick searches are a first screen, not clearance. A proper trademark search (classes 9, 35 and 42 in Canada and the US) should be done before buying the domain and printing anything.

---

## Questions for Landon

1. **Launch games:** OK to launch with the five (Pokémon, Magic, Yu-Gi-Oh!, One Piece, Lorcana) and add the rest later?
2. **Non-sport sets** (Topps Star Wars, Marvel, Garbage Pail Kids): put them on the sports side (they're serial-numbered like sports cards), on the new side, or skip for now?
3. **Japanese cards:** show them by default (they're 12–21% of listings and highly collected), or English-only by default with a Language filter?
4. **Sealed product:** keep it hidden by default like sports (already decided), and maybe add a "Sealed boxes" mode later?
5. **Name:** do you like Foils & Fables, Realms & Rares or Spells & Sleeves? Should we register the chosen .com now (about US$10–20 a year) before someone else does?
6. **Lawyer check:** OK to spend for a short Canadian trademark lawyer review (clearing the name, plus the footer disclaimer) before launch?
7. **Copy wording:** OK to say "ranked by the rarity printed on the card" for these games, since most have no published print runs?

---

## Sources

- eBay public category and search pages (category 2536 and singles 183454; counts read 2026-10-30)
- [eBay condition and descriptor IDs for trading cards](https://developer.ebay.com/api-docs/user-guides/static/mip-user-guide/mip-enum-condition-descriptor-ids-for-trading-cards.html)
- [eBay Browse API guide: aspect_filter and refinements](https://developer.ebay.com/api-docs/buy/static/api-browse.html)
- [GemRate eBay 2025 singles report via cllct / Yahoo Sports](https://sports.yahoo.com/articles/more-2-6-billion-spent-154500186.html)
- [Collectr State of the TCG Hobby, mid-2026](https://public.getcollectr.com/public-assets/reports/state-of-the-hobby-2026-mid-year-report.pdf)
- [TCGplayer bestselling TCGs Q4 2025](https://seller.tcgplayer.com/blog/bestselling-trading-card-games-q4-2025)
- [Pokémon.com: Scarlet & Violet rarity symbols](https://www.pokemon.com/us/pokemon-news/pokemon-tcg-scarlet-and-violet-revamps-pokemon-tcg-card-aesthetic)
- [TCGplayer: Mega Evolution set facts](https://seller.tcgplayer.com/blog/mega-evolution-quick-facts) · [Bulbapedia: Mega Hyper Rare](https://bulbapedia.bulbagarden.net/wiki/Mega_hyper_rare_(TCG))
- [Wizards: Official Reprint Policy (Reserved List)](https://magic.wizards.com/en/news/announcements/official-reprint-policy) · [MTG Wiki: Serialized](https://mtg.wiki/page/Serialized)
- [Yugipedia: Starlight Rare](https://yugipedia.com/wiki/Starlight_Rare)
- [Bandai One Piece card list](https://en.onepiece-cardgame.com/cardlist/)
- [Rare Candy: Lorcana Epic and Iconic rarities](https://rarecandy.com/blog/collectors-guide-lorcanas-new-card-rarities)
- [Toyota v. Tabari (9th Cir. 2010)](https://law.justia.com/cases/federal/appellate-courts/ca9/07-55344/07-55344-2011-02-25.html)
- [Wizards Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Smart & Biggar on Veuve Clicquot (Canada s.22)](https://www.smartbiggar.ca/insights/publication/barbie-and-veuve-clicquot----supreme-court-of-canada-clarifies-protection-for-famous-trademarks-in-canada)
- USPTO trademark search (tmsearch.uspto.gov) and CIPO Canadian Trademarks Database, searched 2026-10-30
- Verisign .com WHOIS, 2026-10-30
