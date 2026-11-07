# Screenshots: shot list for Floors & Fables (two-sided app)

**Don't take these yet.** Wait until the new Foils & Fables home, the card lists (mockups/fables-card-lists.html, waiting for Landon on 2026-11-07) and the checklist are deployed, then take all 7 in one sitting so the status bar, data and look match. The card lists change the Foils & Fables home and add a tab, so shots taken before them would need retaking.

## Shot list (7)

Updated 2026-11-07 for the new Foils & Fables: shot 3 shows every version of a card, shot 5 the card list (checklist).

Order matters: Apple shows the first 3 in search results, so they must explain the app on their own.

| # | File | Side | Shows | Notes |
|---|---|---|---|---|
| 1 | `01-choose-side.png` | Both | The side chooser on launch: Fields & Floors and Foils & Fables, equal weight | Explains "two sides" in one picture. Nothing highlighted |
| 2 | `02-sports-results.png` | Sports | A player search, /5 and /10 cards first, tier tags, switch at the top | Like the current `02-results.png`, retaken with the switch visible |
| 3 | `03-games-versions.png` | Games | A card search opening on every version for sale: "130 versions", "We hid … listings that aren't this card", rows with seller photos and plain rarity words, switch at the top | Pick a card whose top photos aren't dominated by a game logo. Signed out is fine |
| 4 | `04-sports-card.png` | Sports | Card popup with the rarity ladder, "This card" row highlighted | Prefer a set with a colour list (2024/2025 Topps Chrome, Prizm, Bowman Chrome) so the full ladder shows |
| 5 | `05-games-checklist.png` | Games | A card list: rows with seller photos, "Extremely rare" words, a few versions ticked as owned, the picker open with a big photo | **Needs the signed-in demo account** to show ticks. Signed out, the list shows but nothing can be ticked |
| 6 | `06-watchlist.png` | Both | Watchlist with cards from both sides and bid reminders set | Needs the signed-in demo account |
| 7 | `07-alerts.png` | Both | Alerts: saved searches from both sides, alerts on | Needs the signed-in demo account |

Sizes: `6.9/` is 1320 x 2868 (iPhone 18 Pro Max simulator), `6.5/` is the same shots scaled to 1284 x 2778.

## Rules for every shot
- Real app, real current eBay listings. Nothing mocked up.
- **No game names, logos or mascots as the subject of a shot**, and none in any caption. Game names may appear as small filter labels inside the app; they should not be the headline of a picture (Apple 5.2.1). Where a seller's photo shows a game logo, prefer a different listing.
- Status bar: 9:41, full signal and battery (`xcrun simctl status_bar <device> override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3`).
- Signed out for 1 to 4, signed in as the demo account for 5 (ticks), 6 and 7. Agents can't create accounts or sign in on the live site, so 5, 6 and 7 need Landon to sign in once in the simulator (or take them on an iPhone Pro Max).
- Retake 2 to 5 if a pictured listing has ended by submission day.

## Current files (from the one-sided app, 2026-10-26)
`01-home.png`, `02-results.png`, `03-card-rarity.png` in both folders are from the sports-only app. They are placeholders: replace all of them when the new set is taken.

## Making the 6.5" set
```bash
cd ~/projects/Fields\ and\ Floors/appstore/screenshots && for f in 6.9/*.png; do sips -z 2778 1284 "$f" --out "6.5/$(basename $f)"; done
```
