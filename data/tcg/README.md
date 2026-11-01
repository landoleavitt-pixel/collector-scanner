# Card-game catalog data (Foils & Fables)

Data files only, no code. They're used by the card-game engine (`lib/tcg`, owned by the engine session) to label Japanese Pokémon versions.

| File | What it is | Size |
|---|---|---|
| `ja-coverage.json` | Every Japanese set TCGdex lists (184: 169 Japanese plus 15 Chinese-language sets that TCGdex files under Japanese). Each entry has the set code, Japanese name, release date, era, cards in set, cards in the catalog, % complete, and `full` (true at 98% or more). | 184 sets |
| `ja-names.json` | Japanese trainer, item, tool and stadium names mapped to official English card names, each with a `highValue` flag and how the pair was found. Pokémon cards don't need this; they're matched by Pokédex number. | 85 names (59 high-value) |

**How to use it:** label a Japanese listing with an exact version only when its set has `full: true`. Otherwise show "Japanese printing, version not named" (decided 2026-10-31).

## Coverage summary (checked 2026-10-31)
| Era | Sets | Full | Cards in catalog |
|---|---:|---:|---|
| Original, neo & e-series (1996–2002) | 17 | 16 | 1,462 / 1,463 (100%) |
| ADV & PCG (2003–2008) | 15 | 9 | 722 / 1,155 (63%) |
| Legend (2009–2012) | 5 | 0 | 0 / 320 (0%) |
| XY (2013–2015) | 14 | 2 | 61 / 942 (6%) |
| Sun & Moon (2016–2019) | 49 | 35 | 3,139 / 3,975 (79%) |
| Sword & Shield (2019–2022) | 31 | 15 | 2,084 / 3,348 (62%) |
| Scarlet & Violet & Mega (2023–2026) | 38 | 38 | 5,313 / 5,313 (100%) |
| **All Japanese** | **169** | **115** | **12,781 / 16,516 (77%)** |

- **Not covered:** the Japanese DP (2006–08) and Black & White (2010–13) eras aren't listed by TCGdex at all.
- **Notable empty sets:** Eevee Heroes (S6a), Blue Sky Stream (S7R), 25th Anniversary (S8a), Sword/Shield (S1W/S1H).

## About the name table
- TCGdex rarely lists the English and Japanese name on the same card; only 9 trainer names have both.
- The other 76 pairs were found by matching Japanese and English printings from the same era with the same illustrator and trainer type.
- **This matching alone is not reliable.** Of 117 candidate pairs, about a quarter were wrong or doubtful, so every pair was checked by hand and the doubtful ones were dropped.
- **Treat this as a starting list, not a complete one:** TCGdex lists 345 high-value Japanese trainer names, and this file covers 59 of them.
- Refresh both files by re-reading TCGdex (be gentle: it returned 503 errors when read quickly) and re-checking new pairs by hand.

## Credit and licence
Data derived from the **TCGdex** card database, https://github.com/tcgdex/cards-database (commit `ddaf9e1`, 2026-10-30) and https://api.tcgdex.net. TCGdex is not affiliated with Nintendo or The Pokémon Company. Pokémon card names are trademarks of their owners. We use names and numbers only; no card text or images.

```
MIT License

Copyright (c) 2021 TCGdex

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
