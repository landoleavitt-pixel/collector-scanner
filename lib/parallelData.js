// lib/parallelData.js
//
// Reference database of parallel/refractor families per set.
//
// Each entry covers ONE printing year of ONE set. Sets evolve year over
// year — Topps Chrome 2023 had a different rainbow than 2024 — so each
// year is keyed separately.
//
// Data shape:
//   setKey: stable URL-safe id, also used as the detection bucket
//   label: human-readable display name
//   sourceCredit: who we got the parallel list from, shown in the modal UI
//                 to build trust and admit where the data came from
//   parallels.numbered: serial-numbered parallels, ranked by print run
//                       descending (rarest at the bottom)
//   parallels.unnumbered: parallels without a serial number — pack-odds
//                         based. NOT ranked, listed flat.
//   parallelKey: stable id matching the patterns in parseSetFromTitle.js
//   color: hex used for the swatch in the rarity tree and for the card's
//          colored border in the modal
//   gradient: [from, to] hex pair used for the swatch gradient
//   run: integer serial-number count, or null for unnumbered
//
// Adding a new set: copy an existing entry, change setKey/label, swap in
// the new parallels, then add detection patterns in parseSetFromTitle.js.
// Sources should be cited honestly — don't fudge.

export const PARALLEL_DATA = {
  // ──────────────────────────────────────────────────────────────────────
  '2024-topps-chrome-baseball': {
    label: '2024 Topps Chrome',
    sport: 'baseball',
    year: 2024,
    sourceCredit: 'Beckett · Topps Ripped · Cardboard Connection',
    parallels: {
      numbered: [
        { key: 'refractor',       name: 'Refractor',       run: 499, color: '#cfcfcf', gradient: ['#cfcfcf', '#9a9a9a'] },
        { key: 'purple-speckle',  name: 'Purple Speckle',  run: 299, color: '#b06bff', gradient: ['#b06bff', '#7d3edf'] },
        { key: 'purple',          name: 'Purple',          run: 250, color: '#8a4dd9', gradient: ['#8a4dd9', '#5d2da3'] },
        { key: 'aqua-wave',       name: 'Aqua Wave',       run: 199, color: '#3fc6c9', gradient: ['#3fc6c9', '#1a8a90'] },
        { key: 'blue',            name: 'Blue',            run: 150, color: '#5694ff', gradient: ['#5694ff', '#2a5db8'] },
        { key: 'green-wave',      name: 'Green Wave',      run: 99,  color: '#86d957', gradient: ['#86d957', '#3fa61c'] },
        { key: 'gold',            name: 'Gold',            run: 50,  color: '#e6c14d', gradient: ['#e6c14d', '#a8851e'] },
        { key: 'orange',          name: 'Orange',          run: 25,  color: '#ff9842', gradient: ['#ff9842', '#cc5e0d'] },
        { key: 'black',           name: 'Black',           run: 10,  color: '#3a3a3a', gradient: ['#3a3a3a', '#0a0a0a'] },
        { key: 'red',             name: 'Red',             run: 5,   color: '#cc3340', gradient: ['#cc3340', '#8a1c25'] },
        { key: 'superfractor',    name: 'SuperFractor',    run: 1,   color: '#ffd97a', gradient: ['#fff5c0', '#ffd97a'] },
      ],
      unnumbered: [
        { key: 'x-fractor', name: 'X-Fractor', color: '#a8c4a8', gradient: ['#c4d6c4', '#7da37d'] },
        { key: 'sepia',     name: 'Sepia',     color: '#b8a37a', gradient: ['#b8a37a', '#8a7045'] },
        { key: 'pink',      name: 'Pink',      color: '#ffb3d1', gradient: ['#ffb3d1', '#cc6f95'] },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────
  '2023-24-ud-young-guns-hockey': {
    label: '2023-24 Upper Deck Young Guns',
    sport: 'hockey',
    year: 2023,
    sourceCredit: 'Cardboard Connection · CloutsnChara · Beckett',
    parallels: {
      // Note on this set: Young Guns parallels mix numbered and pack-odds
      // parallels intentionally. We keep them separated — the "Outburst
      // Silver 1:30 packs" is a different kind of rarity than "Exclusives
      // /100" and they shouldn't be sorted into the same ladder.
      numbered: [
        { key: 'deluxe',         name: 'Deluxe',          run: 250, color: '#9aa6b8', gradient: ['#9aa6b8', '#5d6b83'] },
        { key: 'exclusives',     name: 'Exclusives',      run: 100, color: '#e6b96b', gradient: ['#e6b96b', '#a8851e'] },
        { key: 'outburst-red',   name: 'Outburst Red',    run: 25,  color: '#cc3340', gradient: ['#cc3340', '#8a1c25'] },
        { key: 'high-gloss',     name: 'High Gloss',      run: 10,  color: '#ffd97a', gradient: ['#fff5c0', '#ffd97a'] },
        { key: 'outburst-gold',  name: 'Outburst Gold',   run: 1,   color: '#f0c419', gradient: ['#fff8a8', '#f0c419'] },
      ],
      unnumbered: [
        { key: 'base-yg',         name: 'Base Young Gun',    color: '#888888', gradient: ['#b8b8b8', '#888'] },
        { key: 'outburst-silver', name: 'Outburst Silver',   color: '#bababa', gradient: ['#d6d6d6', '#9c9c9c'], note: '1:30 packs' },
        { key: 'clear-cut',       name: 'Clear Cut',         color: '#cccccc', gradient: ['#f0f0f0', '#bababa'], note: '1:144 packs' },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────
  '2023-24-panini-prizm-basketball': {
    label: '2023-24 Panini Prizm',
    sport: 'basketball',
    year: 2023,
    sourceCredit: 'Cardboard Connection · Beckett',
    parallels: {
      numbered: [
        { key: 'red-prizm',     name: 'Red Prizm',     run: 299, color: '#cc3340', gradient: ['#cc3340', '#8a1c25'] },
        { key: 'teal-ice',      name: 'Teal Ice',      run: 225, color: '#3fc6c9', gradient: ['#3fc6c9', '#1a8a90'] },
        { key: 'blue-prizm',    name: 'Blue Prizm',    run: 199, color: '#5694ff', gradient: ['#5694ff', '#2a5db8'] },
        { key: 'red-numbered',  name: 'Red',           run: 99,  color: '#e63946', gradient: ['#e63946', '#a82a32'] },
        { key: 'blue-numbered', name: 'Blue',          run: 49,  color: '#3a6db8', gradient: ['#3a6db8', '#1f4280'] },
        { key: 'mojo',          name: 'Mojo',          run: 25,  color: '#b370e0', gradient: ['#b370e0', '#7d3edf'] },
        { key: 'snakeskin',     name: 'Snakeskin',     run: 15,  color: '#5a7045', gradient: ['#5a7045', '#3a4a2d'] },
        { key: 'gold-prizm',    name: 'Gold',          run: 10,  color: '#e6c14d', gradient: ['#e6c14d', '#a8851e'] },
        { key: 'gold-vinyl',    name: 'Gold Vinyl',    run: 5,   color: '#f0c419', gradient: ['#fff8a8', '#f0c419'] },
        { key: 'black-prizm',   name: 'Black',         run: 1,   color: '#1a1a1a', gradient: ['#3a3a3a', '#0a0a0a'] },
      ],
      unnumbered: [
        { key: 'base-prizm',  name: 'Silver Prizm', color: '#cfcfcf', gradient: ['#cfcfcf', '#9a9a9a'] },
        { key: 'hyper-prizm', name: 'Hyper Prizm',  color: '#ff70a8', gradient: ['#ff70a8', '#cc4080'] },
      ],
    },
  },
};

/**
 * Look up the parallel definition for a given setKey + parallelKey.
 * Returns null if either is unknown.
 */
export function getParallel(setKey, parallelKey) {
  const set = PARALLEL_DATA[setKey];
  if (!set) return null;
  const all = [...(set.parallels.numbered || []), ...(set.parallels.unnumbered || [])];
  return all.find((p) => p.key === parallelKey) || null;
}

/**
 * Return the full set definition by key, or null if not in the database.
 */
export function getSet(setKey) {
  return PARALLEL_DATA[setKey] || null;
}
