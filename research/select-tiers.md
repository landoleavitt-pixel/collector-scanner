# Panini Select: how tiers and colours should map to our ladder

Status: proposal for Boss and Landon. No code yet. Facts come from Checklist Insider's Select checklist pages, pulled 2026-10-31:

- 2025 Panini Select Football: https://www.checklistinsider.com/2025-panini-select-football
- 2024-25 Panini Select Basketball: https://www.checklistinsider.com/2024-25-panini-select-basketball

## The problem

Select prints each base set in tiers. The same player's card can be in one tier and not another, and the print run for one colour name can change by tier.

**Football (2025), 5 tiers:** Concourse, Premier Level, Club Level, Suite Level, Field Level.
**Basketball (2024-25), 4 tiers:** Concourse, Premier Level, Courtside, Mezzanine Level.

Checked on the pages, across all colour names:

| | Football | Basketball |
|---|---|---|
| Colour names listed | 51 | 71 |
| In every tier, same print run everywhere | 16 | 5 |
| In only some tiers | 33 | 66 |
| In 2+ tiers, with a different print run in each | 4 | 3 |

Examples of the same colour name at different print runs:
- Football, Pink Prizm: Concourse /10, Premier /8, Club /6, Suite /4, Field Level /1.
- Football, Blue Prizm: Concourse /249, Premier /175, Club /99, Suite /99, Field Level /75.
- Football, Red Prizm: Concourse /99, Club /49, Suite /49.
- Basketball, Pink Prizms Marketing: Concourse /10, Premier /4, Courtside /1.
- Basketball, Maroon Prizms: Concourse /175, Premier /175, Mezzanine /85.

So "Pink Prizm /6" can be right on one tier and wrong on another. Showing a colour name with the wrong run would mislead people, which is exactly what the brief rules out.

## What a listing tells us

The eBay title usually doesn't name the tier. It may name the colour and the serial number, but not "Field Level". So we can't tell the tier from most titles. The tier words to check in real titles are "Concourse", "Premier", "Club", "Courtside", "Suite", "Mezzanine" and "Field". How often they appear is not measured yet. It should be measured on real titles before the design is final.

## Options

**A. Print run only, colour names kept where they're safe (recommended as the default).**
- Show the rungs by print run, as we do for other sets.
- Show a colour name only when that name has the same print run in every tier it appears in. That's 16 football colours and 5 basketball colours today.
- For the rest, show the run and say "colour depends on the tier" instead of a name.
- Nobody gets a wrong colour or run.

**B. Tier-aware ladder, only when the title names the tier (recommended as the second step).**
- If a title says "Field Level" and "Pink Prizm /1", we can place it. If the title gives no tier, fall back to A.
- Needs a tier word list per product and a check that the words aren't in player names or other products (Premier League, Club, Field Goal).

**C. No Select colour ladder at all.**
- Simplest and safest. Select cards get the generic five-tier view only.
- Loses the most-hunted Select colours, which the brief wants covered.

## Recommendation

Start with **A**. It's correct on every card we can see today, and it still shows the rungs people hunt. Add **B** after we've measured how many real titles name the tier. Don't ship **C** unless A is rejected, because it drops a product people search for.

## Other facts to keep

- Both pages also list autograph and memorabilia sets (Prime Selections, Rookie Signatures, Jumbo Swatches). Those stay out of the base ladder, as they are for every other set.
- Basketball's "Courtside" and "Mezzanine" tiers don't have a clear match to football's "Club" and "Suite" tiers. Don't assume they line up. The mapping needs Landon or a maker's own naming to confirm.
- Print runs are from the checklist's own numbers (for example "Blue Prizm /99"). Pack odds aren't on these pages for most tiers, so odds shouldn't be shown per tier yet.

## Questions for Landon (through Boss)

1. OK to start with option A (rungs by print run, colour names only where safe)?
2. OK to measure tier words in real titles before deciding on B?

## Measured (2026-11-01): how often titles name the tier

Two plain searches ("2025 Panini Select Football" and "2024-25 Panini Select Basketball", no tier words in the query), 404 Select listings from the site's own search:
- **50% (203 of 404)** name a tier: Concourse, Premier, Club, Courtside, Suite, Mezzanine or Field Level.
- Searches that include a tier word in the query are not used: they inflate the figure (78%).
- Sample size is small and from one day. Re-measure before deciding on option B.

## Built: option A (2026-11-01)

- Ladder rows are print runs. A colour name appears only where it has the same run in every tier of its set (16 football colours, 5 basketball). Other names give a "Colour depends on tier" row at each run they can have, with no name.
- Football: 30 numbered rows and 5 unnumbered colours. Basketball: 25 numbered rows and 2 unnumbered.
- The parser places a Select title only on a named colour that is consistent across tiers, or on its run (rung) when no safe colour is named. Real titles checked: Silver Prizm, Zebra Prizm, and rung placements for Club and Field Level /249, /799 and /35.
