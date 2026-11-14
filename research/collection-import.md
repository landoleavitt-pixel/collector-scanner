# "Import my collection": which apps give people an official file?

*Research only, 2026-11-14. No code changed. Only public help pages and public documents; no accounts, no scraping, nobody contacted.*

## The short version

- **Almost every collection app has some official CSV export, but only a few document the column names.** I could read the official export steps for **Collectr, Dex and TCGplayer**, and a documented CSV import for **Deckbox**. For **Moxfield, Archidekt, Dragon Shield and Pokellector I could not reach an official export page**, so what I know comes from other apps' import guides and forums (marked below).
- **Top 3 to support, in this order:**
  1. **TCGplayer app CSV.** It covers all five of our games and can include TCGplayer's Product ID, which we can match to a catalog entry for Magic and Pokémon.
  2. **Moxfield collection CSV.** It's Magic's most-used collection file, with set code, collector number and foil columns that match Scryfall directly.
  3. **Collectr export.** The biggest Pokémon collection app; its export is paid (PRO) and its columns aren't documented, but its own import sample shows the layout it uses.
- **Build one generic CSV reader first.** It accepts any file whose headers say name, set code, number, quantity, foil, language and condition (in any order and under common names). The three presets then just add the right header names. That also covers Deckbox, Dragon Shield and Archidekt files whenever a person uploads one, without our claiming to support them.
- **The terms question could not be settled from public pages.** Most terms pages blocked my reader or didn't exist. What is clear: **the person is exporting their own data and giving us the file themselves.** We never log in to their account or touch an unofficial interface. I'd still have Landon or the Boss read each company's terms before naming it in the product.
- **Effort: about 2–3 days** for the generic reader plus three presets, and a matching step against our catalogs.

---

## 1. What each app offers

"Evidence" says where each fact comes from. **Official** means the company's own help page or documentation that I read.

| App | Official export? | How | Format and fields | Terms on importing elsewhere | Evidence |
|---|---|---|---|---|---|
| **Collectr** | **Yes, PRO members only** | Portfolio screen → three dots (top right) → **Export** → enter an email address; the file is emailed. The screen says it sends "all of your products and portfolio's in one CSV". | **CSV**. The export's columns aren't listed. Collectr's own **import sample** (for TCGplayer files) shows this layout: **Quantity, Name, Simple Name, Set, Card Number, Set Code, Printing, Condition, Language, Rarity, Product ID** (the Product ID must be TCGplayer's) | **Couldn't read** (terms page blocked me) | **Official** help page ([Collectr: Import / Export Your Collection](https://getcollectr.notion.site/Import-Export-Your-Collection-9aa6e5f4d0cd4efb995dadc992760c8e)); I read it in a browser. The sample columns are an image on that page |
| **Dex** | **Yes, iPhone only, paid (Dex+)** | Settings → Data → Export Collection | **CSV**. Columns not listed. **No import**: Dex says it has no file upload or bulk import on any platform, because matching other apps' files "could add wrong cards, miss variants, or create duplicates" | **Terms page not found** | **Official** help page ([Dex: importing your collection](https://dextcg.com/help/troubleshooting/importing-your-collection-into-dex)) |
| **Pokellector** | **None found** | I found nothing about export or import; competitors' pages describe it as a checklist with no prices, no scanner and no import | — | Not read | Searches only; **absence not confirmed** |
| **TCGplayer** (consumer app) | **Yes** | Settings → **Email Export**: change Plain Text to **CSV**, turn on "Export Email as Attachment", open **CSV Output Settings** and tick the columns. Then Collection tab → open a list → three dots → **Send via Email** | **CSV, with columns the person chooses.** The help page names none, but a third-party guide says to tick **"TCGplayer ID" and "Product ID"**. Scan review shows amount, set, foiling, condition and language | **Couldn't read** (terms page blocked me) | **Official** help page ([TCGplayer app setup](https://help.tcgplayer.com/hc/en-us/articles/23531246396183-How-to-Setup-and-Use-the-TCGplayer-App-for-Card-Scanning)); column names from [ManaBox's guide](https://manabox.app/guides/collection/import-export/) |
| **Moxfield** (Magic) | **Yes** | Collection page → **More** → **Export CSV** (per another app's guide) | **CSV**. Headers quoted from Moxfield's help page by a community post: **Count, Tradelist Count, Name, Edition, Condition, Language, Foil, Tags, Last Modified, Collector Number, Alter, Proxy, Purchase Price**. Edition is the set code | **Couldn't read** (403; the help URL I guessed was a 404) | **Not official**: [Codidact post](https://software.codidact.com/posts/294785) quoting the help page, [MythicHub guide](https://mythichub.com/help/importing-collection). **Check against a real export file** |
| **Archidekt** (Magic) | **Not confirmed** | Its collection page invites you to "upload or start importing your collection"; I found no export page | Unknown. A forum post shows one exported file with semicolons and columns `export_type;scryfall_uuid;set_code;quantity;foil_quantity;card_name;set_name;cardMarketId;english_card_name;lang;collector_number` (that file came from a phone app, not Archidekt) | Not read | Archidekt's own page and a [forum thread](https://archidekt.com/forum/thread/8054462); **no official format found** |
| **Dragon Shield** (Card Manager apps for Magic, Pokémon, Yu-Gi-Oh!) | **Yes, per store listings** | Mobile: Inventory → three dots on a folder → **Export**; web: Inventory → Export (per MythicHub) | **CSV or text.** Columns not documented; a 2023 forum post says a Dragon Shield file's condition values weren't recognised by one site | Not read | **Not official**: app listings and [MythicHub](https://mythichub.com/help/importing-collection), [TappedOut thread](https://tappedout.net/mtg-forum/tappedout/importing-csv-from-dragon-shield-app) |
| **Deckbox** (Magic and others) | **Yes** | Inventory → **View → Export**: a dialog lets you add extra columns (forum answer) | **CSV.** Deckbox's help says CSV can be exported and imported and warns about UTF-8 text. A file needs at least **Count and Name** to import (forum). The full column list wasn't on any official page I could read | **Terms read:** "You retain full ownership to your stuff." The terms say nothing about exporting or about using exports elsewhere | **Official** help page ([Deckbox: exports and imports](https://deckbox.org/help/exports_and_imports)) and [terms](https://deckbox.org/legal) |
| **Cardmarket** | **Not a collection app.** It exports **seller stock** (and wants lists through browser extensions) | — | The stock file has an `idProduct` column (per another company's API doc); no personal-collection export exists that I could find | Not read | Third-party sources only; **I couldn't open Cardmarket's own help pages** |

## 2. Ranking: the top 3 to support

**Scoring:** how many of our players use it, how many of our five games it covers, how well its columns match a printing exactly, and how sure I am of its format.

| Rank | Source | Why | What's weak |
|---|---|---|---|
| **1** | **TCGplayer app CSV** | Covers **all five games** (it's the marketplace for Pokémon, Magic, Yu-Gi-Oh!, One Piece and Lorcana). The **Product ID** column pins an exact printing. Collectr already accepts these files, so many people have one | Columns are chosen by the person, so a file may lack Product ID; column names unconfirmed (check a real file) |
| **2** | **Moxfield CSV** (Magic) | Magic is our first card-family game. **Edition (set code), Collector Number and Foil** match Scryfall one-to-one, and Moxfield is the most-used Magic collection tool | Column list is secondhand; Magic only |
| **3** | **Collectr CSV** | Largest Pokémon collection app (4.9 rating, 69K ratings on the App Store). Its import sample shows **Set Code, Card Number, Printing, Language, Product ID** | Export is **PRO only** and emailed; the export's own columns aren't documented (assume the sample's layout, then confirm) |

**Next in line:** Dragon Shield (people with scanner folders), Deckbox, Archidekt. The generic reader handles them without a preset.
**Not worth it:** Dex (iPhone-only paid export, columns unknown; and nobody can import *into* Dex), Pokellector (no export found), Cardmarket (not a collection).

### Sample column headers for the three presets

**Canonical form we'd keep per row:** game, set code, card number, finish, language, quantity, plus the source's Product ID or Scryfall ID if present. (Our own "I own this" key is already game + set code + number + finish; DECISIONS.)

**1. TCGplayer app CSV** *(names as ManaBox documents them; confirm on a real file)*
`Quantity, Name, Set Name, Card Number, Condition, Printing, Language, TCGplayer ID, Product ID`
Match: **Product ID → card** through the catalogs: Scryfall cards carry a `tcgplayer_id` (Magic), and TCGdex card records carry a TCGplayer product id (Pokémon). I confirmed that for TCGdex in a Japanese card record; I did **not** confirm Lorcast's or YGOPRODeck's catalogs hold TCGplayer ids, so for those games fall back to set code or set name plus number.

**2. Moxfield CSV** *(from the community quote of Moxfield's help page)*
`Count, Tradelist Count, Name, Edition, Condition, Language, Foil, Tags, Last Modified, Collector Number, Alter, Proxy, Purchase Price`
Match: **Edition + Collector Number + Foil → Scryfall printing.** Ignore Tradelist Count, Tags, Purchase Price (we don't track prices). **Skip rows marked Proxy = true.**

**3. Collectr CSV** *(from the import sample on Collectr's help page; the export is assumed to use the same names)*
`Quantity, Name, Simple Name, Set, Card Number, Set Code, Printing, Condition, Language, Rarity, Product ID`
Match: **Product ID** (TCGplayer's) first; otherwise **Set Code + Card Number + Printing**. *Printing* values such as "Foil" and "Normal" appear in the sample.

**Generic reader (build first):** accepts these header names, any order, any case, and either commas or semicolons (one Archidekt forum file used semicolons):
- name: `Name`, `Card name`, `card_name`
- set: `Set code`, `Edition`, `set_code`, `Set`, `Set Name`
- number: `Card number`, `Collector number`, `Collector Number`
- quantity: `Quantity`, `Count`, `Qty`, `Amount`
- finish: `Foil`, `Printing`, `foil_quantity`, `Finish`
- language: `Language`, `lang`
- ID: `Scryfall ID`, `scryfall_uuid`, `Product ID`, `TCGplayer ID`

(ManaBox documents a similar list of accepted columns: Name, Set code, Quantity, Foil, Card number, Language, Condition, and a Scryfall ID that can replace name and set; useful as a reference but it's a competitor's behaviour, not a standard.)

## 3. Terms and the right way to do it

- **What's safe by design:** the person uses the app's **own export button**, then **gives us the file**. We never ask for their Collectr, TCGplayer or Moxfield password; we never use an unofficial interface of any of these apps; we never read any app's website for them. That avoids the scraping questions most terms pages care about.
- **What I couldn't confirm:** whether each company's terms say anything about using an export elsewhere. Deckbox's terms say members keep ownership of their content and don't restrict exports. For Collectr, Dex, Moxfield and TCGplayer, my reader was blocked or the page didn't exist.
- **Precedent, not permission:** Collectr's own help page tells people to send it a TCGplayer export; ManaBox says most apps' CSV files work out of the box; Moxfield accepts files from other apps' formats (community scripts exist). That shows importing exports is normal practice but is **not** a licence.
- **Recommendation:** name only TCGplayer, Moxfield and Collectr in the product ("Works with files from…") **after Landon or the Boss has read each terms page in a browser.** Until then, call it **"Import a CSV file"** and mention nothing by name. Don't use any company's logo; plain names only (DECISIONS: game names plain text).

## 4. Privacy and security (state before building)

- **A collection is private information:** it shows who owns valuable cards. Keep imported marks **private by default** (DECISIONS, 2026-10-31), never on public profiles or share links.
- **Don't keep the file.** Read it, create the "I own this" rows, and delete the upload. Never log rows, card names or counts.
- **Never ask for another service's login or token.**
- **Limit the upload:** a size cap (for example 5 MB, as CollectHolo does) and a row cap (its first 1,000 rows), reject anything that isn't plain text, and show people what was matched before saving.
- **Spreadsheet formula risk:** if we ever let people *export* from us, escape cells starting with `=`, `+`, `-` or `@`.
- **Show the result honestly:** "We matched 212 of 240 rows. 28 couldn't be matched; here they are." Never silently guess a printing.

## 5. Effort and risks

| Work | Effort |
|---|---|
| Generic CSV reader with header aliases, delimiter detection, size and row limits | 1 day |
| Matching: set code or ID → printing, using the Scryfall and TCGdex catalogs we already hold (the Product ID tables need a small lookup built at catalog time) | 1 day |
| Three presets and tests with **real exports from Landon's own accounts or sample files** | 0.5–1 day |
| A "review what we matched" screen | ½ day |
| **Total** | **about 2–3 days** |

**Risks:** formats change without notice (Collectr's, Dex's and Moxfield's columns aren't contractually fixed); different apps spell set codes differently (so unmatched rows are normal); finishes ("Foil", "Etched", "Reverse Holo") vary by app. Yu-Gi-Oh!, One Piece and Lorcana matching rests on set codes and card numbers only, which is weaker than Magic's Scryfall IDs.

## Questions for Landon
A. **OK to build the generic "Import a CSV file" first** and name TCGplayer, Moxfield and Collectr only after the terms are read?
B. **Can you export a sample file** from your own Collectr (PRO), TCGplayer app and, if you use it, Moxfield, so the engine builds and tests against real headers? (The files hold only your own collection; remove anything private before sharing it.)
C. **Which game should the importer serve first?** I'd say Magic (cleanest matching) then Pokémon.

## Sources (read 2026-11-14)
- Collectr, Import / Export Your Collection: https://getcollectr.notion.site/Import-Export-Your-Collection-9aa6e5f4d0cd4efb995dadc992760c8e
- Dex, importing your collection (and CSV export): https://dextcg.com/help/troubleshooting/importing-your-collection-into-dex
- TCGplayer, app setup and CSV export: https://help.tcgplayer.com/hc/en-us/articles/23531246396183-How-to-Setup-and-Use-the-TCGplayer-App-for-Card-Scanning
- ManaBox, import and export (accepted columns; TCGplayer export settings): https://manabox.app/guides/collection/import-export/
- Moxfield columns (community quote of the help page): https://software.codidact.com/posts/294785 · MythicHub, importing a collection: https://mythichub.com/help/importing-collection
- Archidekt: https://archidekt.com/collection · https://archidekt.com/forum/thread/8054462
- Dragon Shield: https://dragonshield.com/card-manager · https://tappedout.net/mtg-forum/tappedout/importing-csv-from-dragon-shield-app
- Deckbox: https://deckbox.org/help/exports_and_imports · https://deckbox.org/legal
- Cardmarket (third-party only): https://github.com/demogorgon1/mkmcsv · https://news.cardmarket.com/en/Magic/Changes-To-Exportable-Buying-And-Selling-Statistics
- Pokellector comparison (competitor's page): https://www.scanpokemon.com/alternative/pokellector
- Earlier research: research/catalogs-phase-2.md, research/fables-why.md · DECISIONS.md (private marks, 2026-10-31)
- **Not read:** Collectr, Moxfield, TCGplayer and Dex terms of service (blocked or missing); Moxfield's, Archidekt's, Dragon Shield's and Pokellector's own export pages.
