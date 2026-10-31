# Screenshots: shot list for the two-sided app

**Don't take these yet.** Wait until the two-sided app (side chooser on launch, switch at the top, Foils & Fables live) is deployed, then take all 7 in one sitting so the status bar, data and look match.

## Shot list (7)

No checklist or "every version of a card" shot until those are live.

Order matters: Apple shows the first 3 in search results, so they must explain the app on their own.

| # | File | Side | Shows | Notes |
|---|---|---|---|---|
| 1 | `01-choose-side.png` | Both | The side chooser on launch: Fields & Floors and Foils & Fables, equal weight | Explains "two sides" in one picture. Nothing highlighted |
| 2 | `02-sports-results.png` | Sports | A player search, /5 and /10 cards first, tier tags, switch at the top | Like the current `02-results.png`, retaken with the switch visible |
| 3 | `03-games-results.png` | Games | A card or character search, ranked by the rarity printed on the card, Night foil look, switch at the top | Pick a search whose top photos aren't dominated by a game logo |
| 4 | `04-sports-card.png` | Sports | Card popup with the rarity ladder, "This card" row highlighted | Prefer a set with a colour list (2024/2025 Topps Chrome, Prizm, Bowman Chrome) so the full ladder shows |
| 5 | `05-games-card.png` | Games | Card popup with its rarity explained | |
| 6 | `06-watchlist.png` | Both | Watchlist with cards from both sides and bid reminders set | Needs the signed-in demo account |
| 7 | `07-alerts.png` | Both | Alerts: saved searches from both sides, alerts on | Needs the signed-in demo account |

Sizes: `6.9/` is 1320 x 2868 (iPhone 18 Pro Max simulator), `6.5/` is the same shots scaled to 1284 x 2778.

## Rules for every shot
- Real app, real current eBay listings. Nothing mocked up.
- **No game names, logos or mascots as the subject of a shot**, and none in any caption. Game names may appear as small filter labels inside the app; they should not be the headline of a picture (Apple 5.2.1). Where a seller's photo shows a game logo, prefer a different listing.
- Status bar: 9:41, full signal and battery (`xcrun simctl status_bar <device> override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3`).
- Signed out for 1 to 5, signed in as the demo account for 6 and 7. Agents can't create accounts or sign in on the live site, so 6 and 7 need Landon to sign in once in the simulator (or take them on an iPhone Pro Max).
- Retake 2 to 5 if a pictured listing has ended by submission day.

## Current files (from the one-sided app, 2026-10-26)
`01-home.png`, `02-results.png`, `03-card-rarity.png` in both folders are from the sports-only app. They are placeholders: replace all of them when the new set is taken.

## Making the 6.5" set
```bash
cd ~/projects/Fields\ and\ Floors/appstore/screenshots && for f in 6.9/*.png; do sips -z 2778 1284 "$f" --out "6.5/$(basename $f)"; done
```
