# Screenshots: status

Taken 2026-10-26 in the iOS Simulator (iPhone 18 Pro Max) against the live early-access site, with real eBay listings. Status bar set to 9:41, full signal and battery.

| # | File | Status |
|---|---|---|
| 1 | `01-home.png` | Done. Signed out, "The Grail Hunter." with search and a live card. |
| 2 | `02-results.png` | Done. "Shohei Ohtani" search, /5 cards first. |
| 3 | `03-card-rarity.png` | Done. Card popup for a /5 Ohtani auto with the rarity ladder ("This card" at 2 to 25 made). This set has no colour list yet, so it shows the common print runs version. |
| 4 | `04-watchlist.png` | **Not taken.** Needs the signed-in demo account (starred cards with bid reminders set). |
| 5 | `05-alerts.png` | **Not taken.** Needs the signed-in demo account (2 or 3 saved searches with alerts on). |

`6.9/` is 1320 x 2868. `6.5/` is the same shots scaled to 1284 x 2778.

## To finish shots 4 and 5
Agents can't create accounts or sign in on the live site, so this needs the demo account from APP_STORE_LISTING.md section 4. Once it exists and has saved searches and starred cards, either Landon signs in once in the simulator, or he takes the two shots on an iPhone Pro Max (side button + volume up). Then:

```bash
cd ~/projects/Fields\ and\ Floors/appstore/screenshots && for f in 6.9/0[45]*.png; do sips -z 2778 1284 "$f" --out "6.5/$(basename $f)"; done
```

Listings change constantly, so retake 2 and 3 if a pictured card has ended by submission day (Apple doesn't require this, but it keeps them current).
