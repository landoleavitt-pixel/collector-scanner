# Where to download the official checklists (for Landon)

*Research only, 2026-11-06. I did **not** download any files and I did **not** get past any bot check. I only read public pages, and I stopped when a site blocked me. Landon downloads the files in his own browser and puts them in `data/checklists/`.*

## The short version

- **You need about 35 files, one per base set.** Autograph and insert lists come from the *same* file as their base set, so you don't download anything extra for them.
- **Each maker works differently:**
  - **Topps / Bowman:** a "Download checklist" button on each product's page (usually a **PDF**).
  - **Upper Deck:** a checklist **web page** per product (no file button that I could see). You save the page as a PDF.
  - **Panini:** the checklist is on each product's page on paniniamerica.net, and Panini's own guide says an Excel file exists. I could not find a single index page or a confirmed link per product, so the Panini rows below say where to look.
- **Their sites block automated visits** (Topps and Upper Deck showed "access denied" or a Cloudflare check to me). In your own browser it normally just works. If a site asks you to prove you're human, do it yourself.
- **I could not read Topps' or Panini's terms of use** (both sites blocked me), so the standing plan stays: **take only the facts** (card number, player, team, rookie), never descriptions or pictures, and keep each file's source on record.

---

## How to save each file (3 steps)

1. Open the page link in the table. Click **Download checklist** (Topps), save the page as a PDF (Upper Deck: File → Print → Save as PDF), or download the Excel/PDF from the product page (Panini).
2. **Rename the file to the "Save as" name in the table** (the set key plus the extension). The importer finds the file only by that name.
3. Put it in `data/checklists/` inside the Fields and Floors folder.

Then tell the Boss which ones are in. The importer is `scripts/import-checklists.mjs`; run it with `--check` first and it reports what it can read without writing anything.

**File types the importer reads:** `.csv`, `.xlsx`, `.pdf` (set up for Upper Deck's layout) and `.txt`.
**One thing to watch:** the importer was built expecting Topps as **CSV** and Panini as **Excel**. Topps' own buttons often give a **PDF**. If a Topps file is a PDF, save it as `.pdf` anyway and tell the Boss; the importer may need a small change to read it. The first real file of each kind is the test.

---

## The list, newest first

"Page" = where the checklist is. **Confirmed** = I saw this page exist in a search result or by reading it. **Find it** = I couldn't confirm the page, so use the hub page and the exact name in the first column.

Hubs:
- **Topps:** https://www.topps.com/pages/checklists (all Topps and Bowman checklists)
- **Upper Deck:** https://upperdeck.com/checklists/ (all sports; hockey list: https://upperdeck.com/checklist-category/hockey/)
- **Panini:** the product pages on https://www.paniniamerica.net (search the set name; look for a checklist tab or link)

### 2026 and the 2025-26 season

| # | Set | Maker | Page | File | Save as |
|---|---|---|---|---|---|
| 1 | 2026 Topps Chrome Football | Topps | Find it on the Topps hub (2026 football releases) | PDF | `2026-topps-chrome-football.pdf` |
| 2 | 2026 Bowman Football (Chrome Prospects) | Topps | https://www.topps.com/pages/bowman-football (**confirmed**) | PDF | `2026-bowman-football-prospects.pdf` |
| 3 | 2026 Bowman Chrome Prospects (baseball) | Topps | https://www.topps.com/pages/bowman-chrome-baseball (**confirmed**; check it is the 2026 product) | PDF | `2026-bowman-chrome-prospects.pdf` |
| 4 | 2026 Bowman Chrome Prospects (spring Bowman) | Topps | Find it on the Topps hub | PDF | `2026-bowman-prospects.pdf` |
| 5 | 2026 Topps Series 2 (baseball) | Topps | Find it on the Topps hub | PDF | `2026-topps-series-2-baseball.pdf` |
| 6 | 2026 Topps Chrome (baseball) | Topps | https://www.topps.com/pages/topps-chrome-baseball (**confirmed**; 300-card base) | PDF | `2026-topps-chrome-baseball.pdf` |
| 7 | 2026 Topps Series 1 (baseball) | Topps | https://www.topps.com/pages/series-1 (**confirmed**; 350-card base) | PDF | `2026-topps-series-1-baseball.pdf` |
| 8 | 2025-26 Panini Prizm Basketball | Panini | Find it on paniniamerica.net (product page) | Excel or PDF | `2025-26-panini-prizm-basketball.xlsx` |
| 9 | 2025-26 Upper Deck Series 2 Hockey (Young Guns) | Upper Deck | Product page https://upperdeck.com/product/2025-26-upper-deck-series-2-hobby/ (**confirmed**); its checklist page is on the Upper Deck hub | Web page → save as PDF | `2025-26-ud-series-2-hockey.pdf` |
| 10 | 2025-26 Upper Deck Series 1 Hockey (Young Guns #201–250) | Upper Deck | https://upperdeck.com/checklist/2025-26-ud-series-1-checklist/ (**confirmed**) | Web page → save as PDF | `2025-26-ud-young-guns-hockey.pdf` |
| 11 | 2025-26 Topps Chrome Basketball | Topps | https://www.topps.com/pages/topps-chrome-basketball (**confirmed**; released Dec 18, 2025). Also an article: https://ripped.topps.com/topps-chrome-basketball-2025-26-checklist/ | PDF | `2025-26-topps-chrome-basketball.pdf` |
| 12 | 2025-26 Topps Basketball (flagship) | Topps | Find it on the Topps hub | PDF | `2025-26-topps-basketball.pdf` |
| 13 | 2025-26 Bowman Basketball Chrome Prospects | Topps | Find it on the Topps hub | PDF | `2025-26-bowman-basketball-prospects.pdf` |

**About row 9 and 10:** Young Guns are the rookie cards *inside* Upper Deck's Series 1 and Series 2 hockey sets (Series 1 base cards #1–250; Series 2 #251–450), so one set key (`2025-26-ud-young-guns-hockey`) is fed by the Series 1 page, and `2025-26-ud-series-2-hockey` by the Series 2 page. Upper Deck's Extended Series (https://upperdeck.com/checklist/2025-26-ud-extended-series-checklist/, **confirmed**) is a separate product we don't have a set for.

### 2025 (football and baseball)

| # | Set | Maker | Page | File | Save as |
|---|---|---|---|---|---|
| 14 | 2025 Topps Chrome Football | Topps | Listed on the Topps hub as "2025 Topps Chrome® Football" (**confirmed on the hub**) | PDF | `2025-topps-chrome-football.pdf` |
| 15 | 2025 Panini Prizm Football | Panini | Find it on paniniamerica.net | Excel or PDF | `2025-panini-prizm-football.xlsx` |
| 16 | 2025 Panini Mosaic Football | Panini | Find it on paniniamerica.net | Excel or PDF | `2025-panini-mosaic-football.xlsx` |
| 17 | 2025 Panini Select Football | Panini | Find it on paniniamerica.net | Excel or PDF | `2025-panini-select-football.xlsx` |
| 18 | 2025 Donruss Optic Football | Panini | Find it on paniniamerica.net | Excel or PDF | `2025-donruss-optic-football.xlsx` |
| 19 | 2025 Bowman Draft Chrome | Topps | Find it on the Topps hub | PDF | `2025-bowman-draft-chrome.pdf` |
| 20 | 2025 Bowman Chrome Prospects | Topps | Find it on the Topps hub (also reachable from https://www.topps.com/pages/bowman-chrome-baseball) | PDF | `2025-bowman-chrome-prospects.pdf` |
| 21 | 2025 Bowman Chrome Prospects (spring Bowman) | Topps | Find it on the Topps hub | PDF | `2025-bowman-prospects.pdf` |
| 22 | 2025 Topps Chrome (baseball) | Topps | Find it on the Topps hub (may be archived) | PDF | `2025-topps-chrome-baseball.pdf` |

### 2024-25 and 2024

| # | Set | Maker | Page | File | Save as |
|---|---|---|---|---|---|
| 23 | 2024-25 Panini Prizm Basketball | Panini | Find it on paniniamerica.net | Excel or PDF | `2024-25-panini-prizm-basketball.xlsx` |
| 24 | 2024-25 Panini Mosaic Basketball | Panini | Find it on paniniamerica.net | Excel or PDF | `2024-25-panini-mosaic-basketball.xlsx` |
| 25 | 2024-25 Panini Select Basketball | Panini | Find it on paniniamerica.net | Excel or PDF | `2024-25-panini-select-basketball.xlsx` |
| 26 | 2024-25 Donruss Optic Basketball | Panini | Find it on paniniamerica.net | Excel or PDF | `2024-25-donruss-optic-basketball.xlsx` |
| 27 | 2024-25 Upper Deck Young Guns (hockey) | Upper Deck | Series 1 and Series 2 pages for 2024-25: look on the hockey list; **older entries are many pages back** (the list was 30 pages long): https://upperdeck.com/checklist-category/hockey/ | Web page → save as PDF | `2024-25-ud-young-guns-hockey.pdf` |
| 28 | 2024 Topps Chrome Football | Topps | Find it on the Topps hub (may be archived) | PDF | `2024-topps-chrome-football.pdf` |
| 29 | 2024 Panini Prizm Football | Panini | Find it on paniniamerica.net | Excel or PDF | `2024-panini-prizm-football.xlsx` |
| 30 | 2024 Topps Chrome (baseball) | Topps | Find it on the Topps hub (may be archived) | PDF | `2024-topps-chrome-baseball.pdf` |
| 31 | 2024 Bowman Chrome Prospects | Topps | Find it on the Topps hub (may be archived) | PDF | `2024-bowman-chrome-prospects.pdf` |
| 32 | 2024 Bowman Chrome Prospects (spring Bowman) | Topps | Find it on the Topps hub (may be archived) | PDF | `2024-bowman-prospects.pdf` |

### 2023-24

| # | Set | Maker | Page | File | Save as |
|---|---|---|---|---|---|
| 33 | 2023-24 Panini Prizm Basketball | Panini | Find it on paniniamerica.net | Excel or PDF | `2023-24-panini-prizm-basketball.xlsx` |
| 34 | 2023-24 Upper Deck Young Guns (hockey) | Upper Deck | Hockey list, far back: https://upperdeck.com/checklist-category/hockey/ | Web page → save as PDF | `2023-24-ud-young-guns-hockey.pdf` |

**What the hubs show for older sets:** Topps tends to take its product pages down or keep them only as "sold out" pages; if a Topps page has no checklist button, the article on https://ripped.topps.com (Topps' own blog, "Checklist Spotlight" posts) is the next place to look. Panini's older checklists may not be online at all.

### Not on the list on purpose
- **Autograph, rookie-autograph and insert lists** (about 21 of our 57 rarity lists): they come from the same file as their base set. The importer skips those rows for now (phase 2).
- **Insert-only lists** such as Select Hot Stars, Optic Express Lane and Mosaic Elevate: phase 2 (DECISIONS: insert colour lists stay out of the UI until checked against the makers' checklists).

---

## What I could and couldn't confirm

**Confirmed (I saw the page or link in a search result):**
- Topps product pages for 2026 Topps Series 1, 2026 Topps Chrome, 2026 Bowman Football, Topps Chrome Basketball and Bowman Chrome Baseball, each with a "Download checklist" button; the hub https://www.topps.com/pages/checklists listing 2025 Topps Chrome Football.
- Upper Deck's checklist pages for 2025-26 Series 1 and 2025-26 Extended Series, the product page for 2025-26 Series 2, and the hockey list and hub.

**Could not confirm:**
- **Panini:** any official per-product checklist page or file link. My searches only found Panini's blog PDFs (product information sheets for older sets and a 2026 National checklist) and Panini's own guide to reading checklists ([Whitepaper_Checklist.pdf](https://assets.paniniamerica.net/resources/Whitepaper_Checklist.pdf)), which says each product has a checklist tab and that an Excel file is available. Whether the 2025-26 Prizm Basketball file is online yet is unknown; one checklist site showed its list as still pending, so check release dates.
- **Topps pages for sets marked "Find it":** I couldn't open them (Topps' site returned "access denied" to my reader), so I have no direct link.
- **Release dates:** I didn't confirm every date. The table is ordered by season and year, newest at the top.
- **Terms of use:** couldn't read Topps' or Panini's (blocked). Upper Deck's I did not check.
- **Whether Topps' button gives a PDF or CSV** for each set. The ones I saw linked as PDFs on Topps' file host.

**If a page won't load or asks you to prove you're human:** do that yourself in your browser. Don't use a download tool or ask an agent to. That keeps us on the right side of each site's rules.

## Questions for Landon
A. **Start with the 10 newest** (rows 1–10 plus any Panini ones you can reach) and send the Boss what you have? The importer reports what it can read after the first real file of each kind.

## Sources (read 2026-11-06)
- Topps checklists hub: https://www.topps.com/pages/checklists · product pages: https://www.topps.com/pages/series-1, https://www.topps.com/pages/topps-chrome-baseball, https://www.topps.com/pages/topps-chrome-basketball, https://www.topps.com/pages/bowman-football, https://www.topps.com/pages/bowman-chrome-baseball, https://www.topps.com/pages/topps-updates-baseball · Topps blog: https://ripped.topps.com/topps-chrome-basketball-2025-26-checklist/
- Upper Deck: https://upperdeck.com/checklists/ · https://upperdeck.com/checklist-category/hockey/ · https://upperdeck.com/checklist/2025-26-ud-series-1-checklist/ · https://upperdeck.com/checklist/2025-26-ud-extended-series-checklist/ · https://upperdeck.com/product/2025-26-upper-deck-series-2-hobby/
- Panini: https://www.paniniamerica.net · Panini checklist guide: https://assets.paniniamerica.net/resources/Whitepaper_Checklist.pdf · Panini blog PDFs: https://blog.paniniamerica.net/wp-content/uploads/2026/07/National-checklist262-3.pdf
- Release-date hints: https://www.checklistinsider.com/2025-26-panini-prizm-basketball (third-party, so treat as a hint)
- Importer and set keys: scripts/import-checklists.mjs, data/checklists/fixtures/README.md, lib/parallelData.js, scripts/parallel-sets.json
