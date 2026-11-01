# Foils & Fables result-quality audit (live site, 2026-11-01)

Read-only. 20 popular searches across the 5 games through the live `/api/tcg-search`, checking the top 20 rarest-first results for each search: game, printed-rarity label, grade, language, and junk (proxies, customs, lots, sealed, non-cards). No code changed.

## Method and quota
- **22 eBay calls in all:**
  - 20 searches, each Buy It Now sorted by price high to low (1 call each).
  - 1 real rarest-first search (Umbreon, 2 calls) to confirm the ordering.
- A normal rarest-first search costs up to 4 calls (2 pages × Buy It Now and auctions), so 20 of them would have been about 80.
- Each search's ~170 listings were re-ranked with the site's own rarest-first comparison (`lib/tcg/score.js` `compareRarity`) on the labels the live API returned. The top 20 of each were reviewed by hand. The live rarest-first Umbreon check showed the same ladder order and the same mistakes.
- **Searches** (no game filter, as a visitor typing on the home page):
  - **Pokémon:** Charizard (with the Pokémon filter), Umbreon, Pikachu, Mewtwo, Rayquaza
  - **Magic:** Black Lotus, The One Ring, Sol Ring, Ragavan, Mox Pearl
  - **Yu-Gi-Oh!:** Blue-Eyes White Dragon, Dark Magician, Dark Magician Girl, Exodia
  - **One Piece:** Luffy, Shanks, Zoro, Nami
  - **Lorcana:** Elsa, Stitch
- **Scale:** 3,389 listings returned in all. Raw top-20 lists: scratchpad `fq/top20.txt` (not in the repo).

**Overall:** results are mostly right. Lorcana (Elsa, Stitch Iconic) and vintage Magic (Black Lotus, Mox Pearl, Sol Ring) were clean apart from a few junk listings. The problems cluster in the patterns below, roughly worst first.

---

## 1. Multi-card sets, lots and sealed packs get through (and rank high)
About 200 of 3,389 listings contain set or lot wording, and 79 mention packs or sealed product. Several sit in the top 20.

| Search | Title (exact) | Labelled | Should be |
|---|---|---|---|
| Charizard | "97 PSA 10 CHARIZARD'S 6 1st EDITION BASE-12 SHADOWLESS 27 BGS 9.5 6x10s Pokemon" ($59,000,000) | single, 1st Ed, PSA 10 | lot (hide) |
| Charizard | "2003 Skyridge and AquapolIs Crystal Gem Mint PSA 10 Set Charizard Lugia Ho-oh" | Gold Star/Shining/Crystal, PSA 10 (#12) | lot of 3 (hide) |
| Black Lotus | "Magic the Gathering Black Lotus Unlimited and Power 9 Set PSA 10 MTG Gem Mint" | Vintage, PSA 10 (#2) | set of 10 cards (hide) |
| Exodia | "Exodia Set BLCR-EN101 - BLCR-EN105 1st Edition Starlight Rare PSA 10 Yugioh" | Starlight, PSA 10, **#1** | 5-card set (hide) |
| Exodia | "Yugioh Phantom God Exodia Set Japanese PG-61-65 Secret Rare PSA 8 PSA 9 PSA 10" | Secret Rare, PSA 8 | 5-card set (hide) |
| Dark Magician Girl | "PSA 10 Sequential Set Dark Magician and Dark Magician Girl Japanese Yu-Gi-Oh" | no label | 2-card set (hide) |
| Dark Magician Girl | "PSA10 Dark Magician / Girl Set JPD01 JPD02 SET Yugioh WCS 2026 Promo Japanese" | Promo | 2-card set (hide) |
| Shanks | "PSA 10 Shanks Buggy Luffy Teach One Piece Card 2nd Anniversary Sequential set 8" | no label | set (hide) |
| Zoro | "PSA 9, 10 One Piece 1st Anniversary Chinese Set Luffy 006 Zoro 025 Sanji Robin" | no label | 4-card lot (hide) |
| Umbreon (live rarest) | "Umbreon Espeon ex 043 044 SAR Deck Promo Set 30th Celebration Pokemon Japanese" | Promo, #12 | 2-card set (hide) |
| Dark Magician | "Yu-Gi-Oh! WCS 2018 Blue-Eyes White Dragon & Dark Magician 20th Secret Rare Unope" | Secret Rare | sealed (hide) |
| Zoro | "Zoro Serial Number OP12-020 Flagship Battle 2026 Promo Japanese Sealed Pack" (×8 listings) | Prize card | sealed pack (hide) |
| Zoro | "one piece card Zoro Serial OP12-020 Flagship Battle 2026 Promo unopen pack" | Prize card | sealed pack (hide) |
| Shanks | "Shanks OP01-120 Flagship Prize For Japan Sealed Pack Serial ONE PIECE Japanese" | Prize card | sealed pack (hide) |

**Signals to catch:**
- "Set" with two card numbers or a number range: "EN101 - EN105", "PG-61-65", "043 044", "JPD01 JPD02".
- "Sequential (set)".
- Several grades in one title: "PSA 8 PSA 9 PSA 10", "PSA 9, 10".
- "6x10s", "and Power 9 Set".
- "Sealed Pack", "unopen(ed)", "Unope".

**Careful:** "1st Anniversary Set", "3rd Anniversary Set" and "Duel Set" are product names for single One Piece and Yu-Gi-Oh! cards. Don't hide those.

## 2. "One of one" sales talk read as a serial number, and those listings rank #1
| Search | Title (exact) | Labelled | Should be |
|---|---|---|---|
| Umbreon | "TAG 10 PRISTINE UMBREON VMAX 095/069 Eevee Heroes Japanese Moonbreon ONE OF ONE!" | **serial /1, #1**, no game | Pokémon Secret/Hyper Rare 095/069, TAG 10 (pop 1, not serialized) |
| Rayquaza | "🔥 HYPER BEAM COPY \| One of One Gold Star Rayquaza \| SWIRL \| CGC 8.5 🔥" | **serial /1, #1**, no game | Pokémon Gold Star, CGC 8.5 (not serialized) |
| Luffy | "Monkey.D.Luffy Steve Aoki Signed 1/1 One of One Psa 10 Auto Psa Dna Cert 10" | **serial /1, #1**, no game | celebrity-signed card, not serialized |
| Ragavan | "Ragavan, Nimble Pilferer Serialized 007/500 James Bond Monkey BGS 9.5 Quad+ 1/1" | /500, **#1**, no game | Magic serialized /500 (right serial, missing game) |

**Signals to catch:**
- "ONE OF ONE", or a bare "1/1" with no "Serial / Serialized / #'d" next to it and no other N/M serial in the title, is sales talk (pop 1, one-off error, signed copy).
- Listings with no game detected shouldn't rank above game-labelled cards.

## 3. Set names read as rarities ("Shining", "Gold", "Crystal", "UR")
| Search | Title (exact) | Labelled | Should be |
|---|---|---|---|
| Charizard | "2007 POKEMON JAPANESE SHINING DARKNESS #006 CHARIZARD CGC 10" | Gold Star/Shining/Crystal | Holo Rare (Shining Darkness is a set) |
| Mewtwo | "PSA 10 AUTO AUTH Pokémon TCG Mewtwo GX (Shining) Shining Legends 78/73" | Gold Star/Shining/Crystal | Secret Rare (78/73, number above set size) |
| Umbreon | "PSA 10 Umbreon ex Star Holo 091/106 Gold Sky Silvery Ocean Pokemon Card Japan" | Hyper Rare (from "Gold") | Gold Star (the "Star" card in Golden Sky, Silvery Ocean) |
| Mewtwo | "2000 POKEMON DANONE *MEWTWO* #8 STADIUM TIP SHINY *GOLD FOIL* PSA-10! (POP-13)" | Hyper Rare (from "Gold") | not a TCG card (see 6) |
| Pikachu | "2000 POKEMON GOLD VERSION PART 2 PLAYING CARDS JOKER #025 PIKACHU PSA 10" | Hyper Rare (from "Gold") | not a TCG card (see 6) |
| Umbreon (live rarest) | "Umbreon V TG22/TG30 BS TG UR Holo FA EN 2022 200HP" | Hyper Rare (from "UR") | Ultra Rare (Trainer Gallery) |
| Umbreon | "2005 Pokemon Ex Unseen Forces #112 Umbreon Ex UR Holo BGS 9 MINT" | Hyper Rare (from "UR") | Ultra Rare (EX-era "ex" card) |
| Exodia | "PSA 10 Exodia the Forbidden One UR Reprint Yu-Gi-Oh Japanese Quarter Century" | Starlight / Quarter Century Secret | Ultra Rare (a UR reprint; "Quarter Century" here is the anniversary, not the rarity) |
| Dark Magician | "PSA 10 Dark Magician Girl QCAC-JP019 25th Secret Rare Yu-Gi-Oh! Japanese" | Secret Rare | Quarter Century Secret Rare (QCAC set code) |

**Signals to catch:**
- Known set names should be removed before rarity words are read: Shining Darkness, Shining Legends, Shining Fates, Golden Sky Silvery Ocean, Crystal Guardians, Aquapolis.
- "Gold" alone shouldn't mean Hyper Rare without a card number above the set size.
- "UR" means Ultra Rare on English EX-era and Trainer Gallery cards. It means the gold card only on modern Japanese cards.

## 4. Language: English cards flagged Japanese, Japanese-only cards flagged English
| Search | Title (exact) | Labelled | Should be |
|---|---|---|---|
| Charizard | "BGS 9.5 Shining Charizard 1st Edition Neo Destiny Pokemon Card English Holo JP" | Japanese | English ("JP" is the seller's tag) |
| Nami | "BGS 10 Black Label Nami Championship Promo One Piece Card English Pristine Japan" | Japanese | English |
| Ragavan | "MTG Magic The Gathering Jpver Ragavan Nimble Pilferer MH2 Mythic English Card JP" | Japanese | conflicting title; "English Card" should win, or show no language |
| Rayquaza | "PSA10 Rayquaza Dragon Blast 1st Edi 2012 Pokemon BW5-G 055/050 GEMMT" | English | Japanese (BW 1st Edition and BW5 are Japanese only) |
| Rayquaza | "2004 POKEMON CLAW SWIRL CLASH OF THE BLUE SKY GOLD STAR 067 RAYQUAZA-HOLO PSA 10" | English | Japanese (Clash of the Blue Sky is a Japanese set) |
| Blue-Eyes | "YUGIOH PSA 10 1999 JUMP FESTA BLUE-EYES WHITE DRAGON SECRET RARE" | English | Japanese (Jump Festa promo) |
| Dark Magician Girl | "PSA 10 Dark Magician Girl Overframe Prismatic Secret Yu-Gi-Oh! JP003" | English | Japanese (JP set code) |
| Umbreon (live rarest) | "Pokemon TCG Indonesia Umbreon EX SAR SV8a 217/187 NM A" | English | Other language (Indonesian) |

**Signals to catch:**
- An explicit "English" beats "JP / Japan / from Japan", which is often just the seller's location.
- Japanese-only sets and set codes mean Japanese: BW1–BW9, CP1–CP6, SV8a, S8b, M2a, "1st Edition" on BW/XY-era Pokémon, Jump Festa, Clash of the Blue Sky, and any "-JP" or bare "JP###" Yu-Gi-Oh! code.
- Add Indonesian, Thai, Korean and Chinese words as "Other language".

## 5. No game detected (11% of listings), so no rarity label either
376 of 3,389 listings had no game, usually because the title doesn't say "Pokémon", "MTG", "Yu-Gi-Oh" or "One Piece". They then get no rarity label even when the title states one, and fall to the bottom of rarest-first (or top it, if a serial is read; see 2).

| Search | Title (exact) | Labelled | Should be |
|---|---|---|---|
| Rayquaza | "Gold Star Rayquaza Clash Of The Blue Sky - PSA 10 (MBA Silver+Newest Cert!)" | no game, no rarity | Pokémon Gold Star, Japanese, PSA 10 |
| Rayquaza | "2004 Japanese Rayquaza Holo Ex Deoxys Gold Star #67 PSA 10" | no game, no rarity | Pokémon Gold Star, Japanese, PSA 10 |
| Dark Magician Girl | "Konami Dark Magician Girl #000 2003 MFC 1st Ed Secret Rare Holo PSA 8 English" | no game, no rarity | Yu-Gi-Oh! Secret Rare, 1st Ed, PSA 8 |
| Dark Magician Girl | "PSA 10 Dark Magician Girl DDM Secret" | no game, no rarity | Yu-Gi-Oh! Secret Rare, PSA 10 |
| Shanks | "Shanks Manga Op09 PSA 10" | no game, no rarity | One Piece Manga Rare, PSA 10 |
| Sol Ring | "2023 FOIL-SERIALIZED #410 SOL RING 495/900 PSA 9" | no game, /900 | Magic Serialized /900 |
| Zoro | "Roronoa Zoro Serial 056/600" | no game, /600, #2 | One Piece serialized /600 |

**Fix idea:** fall back to the game's own signals when the game name is missing:
- **Set codes:** OP09, OP12-020, MFC, DDM, LOB, BW-P, SV8a.
- **"Konami":** means Yu-Gi-Oh!.
- **Famous card names:** Sol Ring, Ragavan, Black Lotus, Roronoa Zoro, Dark Magician Girl.
- **The eBay "Game" field:** the search already sends it when a game is picked.

## 6. Not cards at all: stickers, playing cards, playmats, "For Display" listings
| Search | Title (exact) | Labelled | Should be |
|---|---|---|---|
| Pikachu | "1998 POKEMON MERLIN SERIES 1 POSTER - HOLO #S29 ASH & PIKACHU CGC 10 PRISTINE" | Holo Rare, #11 ($899,000) | sticker (hide) |
| Pikachu | "2000 POKEMON GOLD VERSION PART 2 PLAYING CARDS JOKER #025 PIKACHU PSA 10" | Hyper Rare, #4 | playing card (hide) |
| Pikachu | "Pikachu Pokemon Playing Cards 1997 Mini CoroCoro Karuta CGC 10" | — | playing card (hide) |
| Charizard | "1998 POKEMON TELEVI-KUN MAGAZINE PLAYING CARDS KING OF HEARTS CHARIZARD PSA 10" (×3) | — | playing card (hide) |
| Mewtwo | "2000 POKEMON DANONE *MEWTWO* #8 STADIUM TIP SHINY *GOLD FOIL* PSA-10! (POP-13)" | Hyper Rare, #10 | food-promo card, not TCG (hide) |
| Stitch | "PSA 9 Ditto Pokemon 1998 Bandai Sealdass Stitch Touch #08 Japanese Sticker Mint" (and 5 more "Stitch Touch" stickers) | — | sticker, and the wrong search too (see 7) |
| Dark Magician | "Vintage 1999 Marumiya Yu-Gi-Oh Dark Magician Light Sticker BGS 7" | — | sticker (hide) |
| Exodia | "1998 YuGiOh Marusho Duelist Sticker Series1 SILVER FOIL Battle Ox EXODIA BGS 9.5" | — | sticker (hide) |
| Dark Magician | "Yu-Gi-Oh! WCS 2023 Legendary White Dragon and Legendary Dark Magician Playmat" | — | playmat (hide) |
| Black Lotus | "MTG GRAND PRIX GP LAS VEGAS 2018 BLACK LOTUS FOIL PLAYMAT Signed 1/1" | — | playmat (hide) |
| Dark Magician Girl | "For Display - PSA 10 Dark Magician Girl MFC-000 1st Ed. Secret Rare Yugioh" ($200,000) | Secret Rare, #18 | not for sale (hide) |
| Umbreon | "For Display - PSA 10 Umbreon Neo Discovery 1st Ed. Perfect Swirl 13/75 Pokemon" | — | not for sale (hide) |
| Umbreon (live rarest) | "Umbreon Pumpkin GOLD Holo Pokemon Halloween Database Card Peru Us Seller" | Hyper Rare, #4 | unofficial custom card (hide) |

**Words to hide:**
- **Not TCG cards:** sticker, Sealdass, Marumiya, Marusho, Merlin, playing cards, Karuta, Televi-kun, Danone.
- **Accessories:** playmat.
- **Not for sale:** "For Display".
- **Unofficial:** "Database Card".

## 7. A name search pulls in longer names, or the word in another sense
| Search | What came back | Should be |
|---|---|---|
| Dark Magician | 11 of the top 20 are **Dark Magician Girl** cards (e.g. "PSA 10 Dark Magician Girl 25th Quarter Century Secret Rare Pink Text QCAC-JP019") | Dark Magician only, unless the visitor typed "Girl" |
| Exodia | "Yugioh 2005 Yu-Gi-Oh! Exodia Necross MC2-EN003 PSA 10 Secret Rare" | different card; arguably fine, lower priority |
| Stitch | Pokémon "Stitch Touch" stickers ("Pokémon Squirtle Sealdass Stitch Touch Sticker 03 PSA 9") | Lorcana Stitch only |
| Ragavan | "MTG Final Fantasy Zidane Tribal / Ragavan Mythic Rare M 0043" | a different card that names Ragavan |

**Fix idea:** when the search exactly matches a known card name and a longer known name contains it (Dark Magician → Dark Magician Girl, Blue-Eyes White Dragon → Blue-Eyes Ultimate Dragon), drop titles that contain the longer name, unless the visitor typed it.

## 8. Grades missed
| Search | Title (exact) | Labelled | Should be |
|---|---|---|---|
| Blue-Eyes | "Yu-Gi-Oh! Blue-Eyes White Dragon LOB-001 1st Ed Ultra Rare BGS Quad 9.5 Gem Mint" | raw | BGS 9.5 |
| Mox Pearl | "Mox Pearl Unlimited BGS 9/9/9/8.5 MINT Beauty MTG (RG) 4RCards" | raw | BGS (subgrades 9/9/9/8.5; overall 9) |
| Stitch | "CRIMPED ERROR Disney Lorcana Lilo & Stitch Iconic 244/207 CGC GRADED MINT 9 SLAB" | CGC (no number) | CGC 9 |
| Exodia | "Yu-Gi-Oh! Exodia 25LP-JP000 Secret Rare ARS 10" | raw | ARS 10 (a Japanese grader; add it or show "graded") |
| Dark Magician Girl | "【ARS 10+】Yu-gi-oh! Dark Magician girl JPD02 Ultra Rare WCS 2026 Duel Set Japan" | raw | ARS 10+ |

## 9. Customs and altered cards still showing
| Search | Title (exact) | Labelled | Should be |
|---|---|---|---|
| Sol Ring | "Sol Ring (Berserk) - Full Art / Altered - MTG / Magic the Gathering" (and 3 more: Tears of the Kingdom, LotR) | no label | custom altered art (hide) |
| Mox Pearl | "SIGNED BGS/JSA 10 Altered Beta Mox Pearl ~ Magic/MTG ~ LP+ Condition" | Vintage, #14 | altered (hide, or label "altered") |
| Black Lotus | "1/1 Eric Klug Alter on Unlimited Black Lotus ~ ICONIC Vintage MTG/Magic History" | Vintage | altered (label or hide) |

The parser commit d2d47a6 (Oct 31) says it hides altered art. These were on the live site on Nov 1, so either it isn't deployed or "Altered" after a slash or dash isn't caught.

---

## Top patterns (sent to Boss)
1. **Lots, sets and sealed packs get through and rank high:** "Exodia Set BLCR-EN101 - BLCR-EN105" was #1; also "6x10s", "Power 9 Set", "Sequential Set", "PSA 8 PSA 9 PSA 10", "Sealed Pack", "unopen pack".
2. **"One of one" / "1/1" sales talk is read as a /1 serial,** and those listings (often with no game detected) take #1 in Umbreon, Rayquaza and Luffy.
3. **Set names read as rarities:**
   - "Shining Darkness" and "Shining Legends" become Gold Star/Shining/Crystal.
   - "Gold" alone becomes Hyper Rare (Golden Sky Silvery Ocean, Danone, playing cards).
   - "UR" becomes Hyper Rare on EX-era and Trainer Gallery cards.
4. **Language mix-ups:** "English … JP/Japan" becomes Japanese; Japanese-only sets and codes become English (BW5 1st Edition, Clash of the Blue Sky, Jump Festa, JP003); Indonesian becomes English.
5. **No game detected on 11% of listings,** so no rarity label even when the title says "Gold Star" or "Secret Rare". Fall back to set codes, "Konami" and famous card names.
6. **Non-cards:** stickers (Sealdass, Merlin, Marumiya), playing cards, playmats, "For Display" listings ($200,000 Dark Magician Girl), Danone, "Database Card" customs.
7. **Name overlap:** "Dark Magician" returns mostly Dark Magician Girl; "Stitch" returns Pokémon "Stitch Touch" stickers.
8. **Grades missed:** "BGS Quad 9.5", "BGS 9/9/9/8.5", "CGC … MINT 9", and the ARS grader.
9. **Altered and custom Magic cards still live** ("Sol Ring (Berserk) - Full Art / Altered").

**Clean:** Lorcana Elsa and Stitch Iconic (right rarity, grades and Japanese flags); vintage Magic rarity and grades; One Piece serial and prize-card labels; Yu-Gi-Oh! Quarter Century, Starlight and Ghost labels.
