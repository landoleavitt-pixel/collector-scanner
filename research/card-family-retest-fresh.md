# Every version: clean re-test on all four games (2026-11-06/07)

A clean test: 80 cards (20 per game) that the matcher was never tuned on, the newest 100 eBay listings per card, a seeded random 30 per card scored by hand. No matcher changes were made between drawing and scoring. 81 eBay calls. Listings were deleted after scoring. Per-card scores: research/card-family-retest-fresh-scores.txt.

Targets as before: 95% of listings shown are the right card with the right label (precision), 90% of the right card's listings are shown (recall), and 35 of 40 cards per pair passing both.

## Result

| Game | Shown | Wrong card | Wrong label | Hidden by mistake | Precision | Recall | Cards passing |
|---|---:|---:|---:|---:|---:|---:|---:|
| Yu-Gi-Oh! | 449 | 5 | 9 | 14 | 96.9% | 96.9% | 14/20 |
| Lorcana | 476 | 2 | 1 | 2 | 99.4% | 99.6% | 19/20 |
| Pokémon | 240 | 16 | 9 | 5 | **89.6%** | 97.7% | 12/20 |
| Magic | 515 | 7 | 4 | 5 | 97.9% | 99.0% | 16/20 |
| All four | 1,680 | 30 | 23 | 26 | 96.8% | 98.4% | 61/80 |

- **Yu-Gi-Oh! + Lorcana: 33/40 cards pass** (mark 35). Pooled 98.2% precision, 98.3% recall.
- **Pokémon + Magic: 28/40 cards pass**. Pokémon is below the precision target on its own.
- Many cards have few listings shown (0 to 30), so one error can fail a card. The pooled numbers are the better read.

## How to read it

- One shortcut: for the last ten Lorcana cards, exact matches that had a "/204" number and a condition word weren't read line by line. Everything else was.
- Scoring was strict: a right card with the wrong set or printing counts as wrong.

## What went wrong, by cause (to fix next)

**Pokémon**
- **"Pikachu V-UNION" read as Pikachu V** (6 of 7 wrong cards for that card). The name rule stops at "V" and doesn't see "-UNION".
- **Delta Reign (a new set) is missing from our catalog**, built 2026-11-01. English Eevee 114/103 was labelled "not English / Japanese" (8 wrong labels). The catalog needs a rebuild after each set release.
- **Japanese set names pull in other cards**: "Flareon V … Eevee Heroes" shown for Eevee. Same for "Team Rocket's Mewtwo ex" shown as Mewtwo ex.
- **Older "EX" cards from Japan and XY promos** (XY122, SR 061/060) shown for the newer "ex" card.
- A 30th Celebration Classic Collection Lugia with no "classic collection" words was matched to Aquapolis.

**Yu-Gi-Oh!**
- **Short names with a code are hidden**: "Black Luster Soldier TOCH-EN029" is Black Luster Soldier – Envoy of the Beginning by its code, but the title's name is another card. 7 hidden on that one card.
- **Japanese "Relief" Ultimate Rares rejected** as "no Ultimate Rare printing" (3 hidden for Thousand-Eyes Restrict).
- "Lava Golem, Steelcage of the Sun God" (a different card, Japanese-only) shown for Lava Golem.
- A set name can come out as its Portuguese variant ("OTS Tournament Pack 9 (POR)").

**Magic**
- **Sorcery: Contested Realm** (another game) has a "City of Traitors" too: 4 shown.
- "Oversize Cards" not hidden (only "oversized" is).
- "Choco, Seeker of Paradise" shown for Birds of Paradise.
- "Opal Mox" (Japanese name order) hidden.

**Lorcana**
- "Goofy - Musketeer Swordsman" shown once as Goofy - Musketeer.
- An Ariel + Tinker Bell two-card listing shown once.
