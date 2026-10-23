// lib/parallelData.js
//
// Reference database of parallel/refractor rainbows per set.
//
// Each entry covers ONE printing year of ONE set, because rainbows change
// year to year (2025 Chrome added Lava and Geometric families, for example).
//
// Data shape:
//   setKey      stable URL-safe id
//   label       display name
//   sport/year  year is the season's start year when season is true (2023-24 → 2023)
//   brand       detection bucket used by parseSetFromTitle.js
//   baseKey     parallel to assume when a title names no parallel (Young Guns only)
//   source      where the list came from, shown in the tree. Cite honestly.
//   parallels.numbered    serial-numbered, sorted by run descending
//   parallels.unnumbered  pack-odds parallels, not ranked
//     key       stable id, unique within the set
//     run       serial-number count (null for unnumbered)
//     odds      { boxType: '1:N' } pack odds where published
//     exclusive box type it's only found in (Hobby, Retail, Choice, FOTL...)
//     color / gradient  swatch + card-border tint
//
// Base parallels only. Inserts and autographs have their own rainbows and
// aren't covered. Facts only (names, print runs, pack odds, box exclusives),
// pulled from checklistinsider.com on 2026-10-19, 2024 Topps Chrome Football
// on 2026-10-23 (Young Guns 2023-24 from
// Beckett's checklist); each set links its source page. Regenerate
// rather than hand-edit when adding a set.

export const PARALLEL_DATA = {
  // ──────────────────────────────────────────────────────────────────────
  '2024-topps-chrome-baseball': {
    label: "2024 Topps Chrome",
    sport: "baseball",
    year: 2024,
    season: false,
    brand: "topps-chrome",
    baseSize: 300,
    source: {name: "Checklist Insider", url: "https://www.checklistinsider.com/2024-topps-chrome-baseball"},
    parallels: {
      numbered: [
        {key: "magenta-speckle", name: "Magenta Speckle Refractor", run: 350, odds: {Hobby: "1:102", Jumbo: "1:31", Breaker: "1:3", Blaster: "1:285", Monster: "1:116"}, color: "#d94db0", gradient: ["#d94db0", "#93226e"]},
        {key: "purple-speckle", name: "Purple Speckle Refractor", run: 299, odds: {Hobby: "1:119", Jumbo: "1:36", Breaker: "1:3", Blaster: "1:334", Monster: "1:136"}, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "purple-sonar", name: "Purple Sonar Refractor", run: 275, odds: {Blaster: "1:109", Monster: "1:73"}, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "purple", name: "Purple Refractor", run: 250, odds: {Hobby: "1:143", Jumbo: "1:44", Breaker: "1:4", Blaster: "1:403", Monster: "1:164"}, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "aqua", name: "Aqua Refractor", run: 199, odds: {Hobby: "1:179", Jumbo: "1:55", Breaker: "1:5", Blaster: "1:503", Monster: "1:205"}, color: "#3fc6c9", gradient: ["#3fc6c9", "#1a8a90"]},
        {key: "aqua-lava", name: "Aqua Lava Refractor", run: 199, odds: {Hobby: "1:179", Jumbo: "1:55", Breaker: "1:5", Blaster: "1:503", Monster: "1:205"}, color: "#3fc6c9", gradient: ["#3fc6c9", "#1a8a90"]},
        {key: "aqua-raywave", name: "Aqua Raywave Refractor", run: 199, odds: {Blaster: "1:151", Monster: "1:101"}, color: "#3fc6c9", gradient: ["#3fc6c9", "#1a8a90"]},
        {key: "blue", name: "Blue Refractor", run: 150, odds: {Hobby: "1:238", Jumbo: "1:73", Breaker: "1:6", Blaster: "1:669", Monster: "1:271"}, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "blue-raywave", name: "Blue Raywave Refractor", run: 150, odds: {Blaster: "1:200", Monster: "1:134"}, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "blue-sonar", name: "Blue Sonar Refractor", run: 125, odds: {Hobby: "1:285", Jumbo: "1:87", Breaker: "1:7", Blaster: "1:804", Monster: "1:326"}, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "green", name: "Green Refractor", run: 99, odds: {Hobby: "1:361", Jumbo: "1:110", Breaker: "1:9", Blaster: "1:1,016", Monster: "1:413"}, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-sonar", name: "Green Sonar", run: 99, odds: {Hobby: "1:361", Jumbo: "1:110", Breaker: "1:9", Blaster: "1:1,016", Monster: "1:413"}, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-wave", name: "Green Wave Refractor", run: 99, odds: {Hobby: "1:185", Jumbo: "1:57", Breaker: "1:62"}, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-raywave", name: "Green Raywave Refractor", run: 99, odds: {Blaster: "1:304", Monster: "1:203"}, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "blue-wave", name: "Blue Wave Refractor", run: 75, odds: {Hobby: "1:245", Jumbo: "1:76", Breaker: "1:82"}, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "gold", name: "Gold Refractor", run: 50, odds: {Hobby: "1:714", Jumbo: "1:218", Breaker: "1:18", Blaster: "1:2,014", Monster: "1:817"}, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-wave", name: "Gold Wave Refractor", run: 50, odds: {Hobby: "1:367", Jumbo: "1:113", Breaker: "1:122"}, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-raywave", name: "Gold Raywave Refractor", run: 50, odds: {Blaster: "1:601", Monster: "1:402"}, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "orange", name: "Orange Refractor", run: 25, odds: {Hobby: "1:388"}, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "orange-wave", name: "Orange Wave Refractor", run: 25, odds: {Hobby: "1:733", Jumbo: "1:226", Breaker: "1:244"}, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "orange-raywave", name: "Orange Raywave Refractor", run: 25, odds: {Blaster: "1:1,201", Monster: "1:800"}, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "black", name: "Black Refractor", run: 10, odds: {Hobby: "1:1,833", Jumbo: "1:564", Breaker: "1:626"}, color: "#3a3a3a", gradient: ["#3a3a3a", "#0a0a0a"]},
        {key: "black-raywave", name: "Black Raywave Refractor", run: 10, odds: {Blaster: "1:3,012", Monster: "1:2,013"}, color: "#3a3a3a", gradient: ["#3a3a3a", "#0a0a0a"]},
        {key: "red", name: "Red Refractor", run: 5, odds: {Hobby: "1:7,117", Jumbo: "1:2,163", Breaker: "1:173", Blaster: "1:20,184", Monster: "1:8,336"}, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-wave", name: "Red Wave Refractor", run: 5, odds: {Hobby: "1:3,657", Jumbo: "1:1,127", Breaker: "1:1,251"}, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-raywave", name: "Red Raywave Refractor", run: 5, odds: {Blaster: "1:6,024", Monster: "1:4,025"}, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "frozenfractor", name: "FrozenFractor", run: 5, note: "numbered backwards /-5", odds: {Jumbo: "1:506"}, exclusive: "Jumbo", color: "#e6f6ff", gradient: ["#e6f6ff", "#8fc9e6"]},
        {key: "superfractor", name: "Superfractor", run: 1, odds: {Hobby: "1:35,584", Jumbo: "1:11,011", Breaker: "1:834", Blaster: "1:104,587", Monster: "1:40,062"}, color: "#fff5c0", gradient: ["#fff5c0", "#ffd97a"]},
      ],
      unnumbered: [
        {key: "refractor", name: "Refractor", run: null, odds: {Hobby: "1:3", Jumbo: "1:1", Breaker: "1:1", Blaster: "1:4", Monster: "1:3"}, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "big-apple", name: "Big Apple Refractor", run: null, exclusive: "Fanatics Fest NYC", color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "x-fractor", name: "X-Fractor", run: null, odds: {Monster: "1:1"}, color: "#c4d6c4", gradient: ["#c4d6c4", "#7da37d"]},
        {key: "sepia", name: "Sepia Refractor", run: null, odds: {Blaster: "1:4"}, color: "#b8a37a", gradient: ["#b8a37a", "#8a7045"]},
        {key: "pink", name: "Pink Refractor", run: null, odds: {Blaster: "1:4"}, color: "#ffb3d1", gradient: ["#ffb3d1", "#cc6f95"]},
        {key: "prism", name: "Prism Refractor", run: null, odds: {Hobby: "1:6", Jumbo: "1:2", Blaster: "1:7", Monster: "1:7"}, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "raywave", name: "Raywave Refractor", run: null, odds: {Blaster: "1:9", Monster: "1:4"}, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "negative", name: "Negative Refractor", run: null, odds: {Hobby: "1:89", Jumbo: "1:27", Breaker: "1:3", Blaster: "1:249", Monster: "1:101"}, color: "#e8e8e8", gradient: ["#e8e8e8", "#2a2a2a"]},
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────
  '2025-topps-chrome-baseball': {
    label: "2025 Topps Chrome",
    sport: "baseball",
    year: 2025,
    season: false,
    brand: "topps-chrome",
    baseSize: 300,
    source: {name: "Checklist Insider", url: "https://www.checklistinsider.com/2025-topps-chrome-baseball"},
    parallels: {
      numbered: [
        {key: "teal", name: "Teal Refractor", run: 299, odds: {Hobby: "1:108", Jumbo: "1:33", Breaker: "1:3", Blaster: "1:545", Mega: "1:239", "Fanatics Mega": "1:562"}, color: "#3fc6c9", gradient: ["#3fc6c9", "#1a8a90"]},
        {key: "purple", name: "Purple Refractor", run: 250, odds: {Hobby: "1:130", Jumbo: "1:40", Breaker: "1:3.2", Blaster: "1:653", Mega: "1:286", "Fanatics Mega": "1:675"}, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "purple-raywave", name: "Purple RayWave Refractor", run: 250, odds: {Blaster: "1:172", Mega: "1:109", "Fanatics Mega": "1:59"}, exclusive: "Retail", color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "aqua", name: "Aqua Refractor", run: 199, odds: {Hobby: "1:149", Jumbo: "1:49", Breaker: "1:6", Blaster: "1:821", Mega: "1:316", "Fanatics Mega": "1:849"}, color: "#3fc6c9", gradient: ["#3fc6c9", "#1a8a90"]},
        {key: "aqua-lava", name: "Aqua Lava Refractor", run: 199, odds: {Hobby: "1:113", Jumbo: "1:49", Blaster: "1:822", Mega: "1:316", "Fanatics Mega": "1:849"}, color: "#3fc6c9", gradient: ["#3fc6c9", "#1a8a90"]},
        {key: "aqua-raywave", name: "Aqua RayWave Refractor", run: 199, odds: {Blaster: "1:217", Mega: "1:137", "Fanatics Mega": "1:74"}, exclusive: "Retail", color: "#3fc6c9", gradient: ["#3fc6c9", "#1a8a90"]},
        {key: "blue", name: "Blue Refractor", run: 150, odds: {Hobby: "1:197", Jumbo: "1:64", Breaker: "1:9", Blaster: "1:1,092", Mega: "1:420", "Fanatics Mega": "1:1,132"}, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "blue-lava", name: "Blue Lava Refractor", run: 150, odds: {Hobby: "1:150", Jumbo: "1:65", Blaster: "1:1,092", Mega: "1:420", "Fanatics Mega": "1:1,132"}, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "blue-raywave", name: "Blue RayWave Refractor", run: 150, odds: {Blaster: "1:288", Mega: "1:182", "Fanatics Mega": "1:98"}, exclusive: "Retail", color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "green", name: "Green Refractor", run: 99, odds: {Hobby: "1:285", Jumbo: "1:104", Breaker: "1:13", Blaster: "1:1,659", Mega: "1:639", "Fanatics Mega": "1:1,712"}, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-geometric", name: "Green Geometric Refractor", run: 99, odds: {Breaker: "1:2"}, exclusive: "Breaker", color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-lava", name: "Green Lava Refractor", run: 99, odds: {Hobby: "1:229", Jumbo: "1:98", Blaster: "1:1,659", Mega: "1:639", "Fanatics Mega": "1:1,712"}, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-raywave", name: "Green RayWave Refractor", run: 99, odds: {Blaster: "1:438", Mega: "1:277", "Fanatics Mega": "1:148"}, exclusive: "Retail", color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-wave", name: "Green Wave Refractor", run: 99, odds: {Hobby: "1:141", Jumbo: "1:86"}, exclusive: "Hobby", color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "gold", name: "Gold Refractor", run: 50, odds: {Hobby: "1:595", Jumbo: "1:193", Breaker: "1:25", Blaster: "1:3,286", Mega: "1:1,264", "Fanatics Mega": "1:3,396"}, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-geometric", name: "Gold Geometric Refractor", run: 50, odds: {Breaker: "1:2.5"}, exclusive: "Breaker", color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-lava", name: "Gold Lava Refractor", run: 50, odds: {Hobby: "1:452", Jumbo: "1:193", Blaster: "1:3,286", Mega: "1:1,264", "Fanatics Mega": "1:3,396"}, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-raywave", name: "Gold RayWave Refractor", run: 50, odds: {Blaster: "1:867", Mega: "1:547", "Fanatics Mega": "1:293"}, exclusive: "Retail", color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-wave", name: "Gold Wave Refractor", run: 50, odds: {Hobby: "1:278", Jumbo: "1:169"}, exclusive: "Hobby", color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "orange", name: "Orange Refractor", run: 25, odds: {Hobby: "1:681", Jumbo: "1:540", Breaker: "1:50", Blaster: "1:15,843", Mega: "1:5,666", "Fanatics Mega": "1:2,924"}, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "orange-geometric", name: "Orange Geometric Refractor", run: 25, odds: {Breaker: "1:5"}, exclusive: "Breaker", color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "orange-lava", name: "Orange Lava Refractor", run: 25, odds: {Hobby: "1:945", Jumbo: "1:386", Blaster: "1:6,572", Mega: "1:2,530", "Fanatics Mega": "1:6,793"}, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "orange-raywave", name: "Orange RayWave Refractor", run: 25, odds: {Blaster: "1:1,733", Mega: "1:1,093", "Fanatics Mega": "1:585"}, exclusive: "Retail", color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "orange-wave", name: "Orange Wave Refractor", run: 25, odds: {Hobby: "1:556", Jumbo: "1:338"}, exclusive: "Hobby", color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "black", name: "Black Refractor", run: 10, odds: {Hobby: "1:1,717", Jumbo: "1:1,350", Breaker: "1:124", Blaster: "1:39,528", Mega: "1:14,109", "Fanatics Mega": "1:7,261"}, color: "#3a3a3a", gradient: ["#3a3a3a", "#0a0a0a"]},
        {key: "black-geometric", name: "Black Geometric Refractor", run: 10, odds: {Breaker: "1:13"}, exclusive: "Breaker", color: "#3a3a3a", gradient: ["#3a3a3a", "#0a0a0a"]},
        {key: "black-lava", name: "Black Lava Refractor", run: 10, odds: {Hobby: "1:2,362", Jumbo: "1:964", Blaster: "1:16,430", Mega: "1:6,324", "Fanatics Mega": "1:17,547"}, color: "#3a3a3a", gradient: ["#3a3a3a", "#0a0a0a"]},
        {key: "black-raywave", name: "Black RayWave Refractor", run: 10, odds: {Blaster: "1:4,331", Mega: "1:2,733", "Fanatics Mega": "1:1,462"}, exclusive: "Retail", color: "#3a3a3a", gradient: ["#3a3a3a", "#0a0a0a"]},
        {key: "black-wave", name: "Black Wave Refractor", run: 10, exclusive: "Hobby", color: "#3a3a3a", gradient: ["#3a3a3a", "#0a0a0a"]},
        {key: "red", name: "Red Refractor", run: 5, odds: {Hobby: "1:6,299", Jumbo: "1:2,052", Breaker: "1:247", Blaster: "1:32,859", Mega: "1:12,6406", "Fanatics Mega": "1:35,093"}, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-geometric", name: "Red Geometric Refractor", run: 5, odds: {Breaker: "1:25"}, exclusive: "Breaker", color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-lava", name: "Red Lava Refractor", run: 5, odds: {Hobby: "1:4,725", Jumbo: "1:1,930", Blaster: "1:32,859", Mega: "1:12,646", "Fanatics Mega": "1:35,093"}, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-raywave", name: "Red RayWave Refractor", run: 5, odds: {Blaster: "1:8,661", Mega: "1:5,473", "Fanatics Mega": "1:2,925"}, exclusive: "Retail", color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-wave", name: "Red Wave Refractor", run: 5, odds: {Hobby: "1:2,780", Jumbo: "1:1,687"}, exclusive: "Hobby", color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "frozenfractor", name: "FrozenFractor", run: 5, note: "numbered backwards /-5", odds: {Hobby: "1:9,449", Jumbo: "1:900", Breaker: "1:124"}, exclusive: "Hobby", color: "#e6f6ff", gradient: ["#e6f6ff", "#8fc9e6"]},
        {key: "superfractor", name: "SuperFractor", run: 1, odds: {Hobby: "1:28,345", Jumbo: "1:9,042", Breaker: "1:2,087", Blaster: "1:162,955", Mega: "1:62,584", "Fanatics Mega": "1:210,560"}, color: "#fff5c0", gradient: ["#fff5c0", "#ffd97a"]},
      ],
      unnumbered: [
        {key: "refractor", name: "Refractor", run: null, odds: {Hobby: "1:3", Jumbo: "1:1", Breaker: "1:0.33", Blaster: "1:3.5", Mega: "1:2.33"}, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "prism", name: "Prism Refractor", run: null, odds: {Hobby: "1:6", Jumbo: "1:2", Blaster: "1:7", Mega: "1:7"}, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "x-fractor", name: "X-Fractor", run: null, exclusive: "Retail", color: "#c4d6c4", gradient: ["#c4d6c4", "#7da37d"]},
        {key: "sepia", name: "Sepia Refractor", run: null, exclusive: "Retail", color: "#b8a37a", gradient: ["#b8a37a", "#8a7045"]},
        {key: "raywave", name: "RayWave Refractor", run: null, exclusive: "Retail", color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "topps", name: "Topps Refractor", run: null, exclusive: "Retail", color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "geometric", name: "Geometric Refractor", run: null, odds: {Breaker: "1:0.33"}, exclusive: "Breaker", color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "negative", name: "Negative Refractor", run: null, odds: {Hobby: "1:54", Jumbo: "1:26", Blaster: "1:407", Mega: "1:157", "Fanatics Mega": "1:421"}, color: "#e8e8e8", gradient: ["#e8e8e8", "#2a2a2a"]},
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────
  '2024-topps-chrome-football': {
    label: "2024 Topps Chrome Football",
    sport: "football",
    year: 2024,
    season: false,
    brand: "topps-chrome",
    baseSize: 300,
    source: {name: "Checklist Insider", url: "https://www.checklistinsider.com/2024-topps-chrome-football"},
    parallels: {
      numbered: [
        {key: "magenta", name: "Magenta Refractor", run: 399, odds: {Hobby: "1:59", Mega: "1:68", "Value Blaster": "1:141", Hanger: "1:41"}, color: "#d94db0", gradient: ["#d94db0", "#93226e"]},
        {key: "magenta-speckle", name: "Magenta Speckle Refractor", run: 399, odds: {Hobby: "1:59", Mega: "1:68", "Value Blaster": "1:141", Hanger: "1:41"}, color: "#d94db0", gradient: ["#d94db0", "#93226e"]},
        {key: "purple-speckle", name: "Purple Speckle Refractor", run: 275, odds: {Hobby: "1:88", Mega: "1:100", "Value Blaster": "1:200", Hanger: "1:59"}, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "purple", name: "Purple Refractor", run: 275, odds: {Hobby: "1:88", Mega: "1:100", "Value Blaster": "1:200", Hanger: "1:59"}, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "teal", name: "Teal Refractor", run: 250, odds: {Hobby: "1:97", Mega: "1:113", "Value Blaster": "1:219", Hanger: "1:61"}, color: "#2bb3a3", gradient: ["#2bb3a3", "#16786c"]},
        {key: "aqua", name: "Aqua Refractor", run: 199, odds: {Hobby: "1:121", Mega: "1:141", "Value Blaster": "1:275", Hanger: "1:79"}, color: "#3fc6c9", gradient: ["#3fc6c9", "#1a8a90"]},
        {key: "aqua-sonar", name: "Aqua Sonar Refractor", run: 199, odds: {Hobby: "1:121", Mega: "1:141", "Value Blaster": "1:275", Hanger: "1:79"}, color: "#3fc6c9", gradient: ["#3fc6c9", "#1a8a90"]},
        {key: "blue", name: "Blue Refractor", run: 150, odds: {Hobby: "1:161", Mega: "1:187", "Value Blaster": "1:374", Hanger: "1:107"}, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "blue-sonar", name: "Blue Sonar Refractor", run: 150, odds: {Hobby: "1:161", Mega: "1:187", "Value Blaster": "1:374", Hanger: "1:107"}, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "green", name: "Green Refractor", run: 99, odds: {Hobby: "1:243", Mega: "1:283", "Value Blaster": "1:566", Hanger: "1:162"}, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-sonar", name: "Green Sonar Refractor", run: 99, odds: {Hobby: "1:243", Mega: "1:283", "Value Blaster": "1:566", Hanger: "1:162"}, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-geometric", name: "Green Geometric Refractor", run: 99, exclusive: "Breaker's Delight", odds: {Breaker: "1:2"}, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "yellow", name: "Yellow Refractor", run: 75, odds: {Hobby: "1:321", Mega: "1:373", "Value Blaster": "1:750", Hanger: "1:214"}, color: "#f2dc4a", gradient: ["#f2dc4a", "#b59d12"]},
        {key: "gold", name: "Gold Refractor", run: 50, odds: {Hobby: "1:481", Mega: "1:562", "Value Blaster": "1:1,122", Hanger: "1:320"}, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-wave", name: "Gold Wave Refractor", run: 50, exclusive: "Hobby", odds: {Hobby: "1:65"}, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-geometric", name: "Gold Geometric Refractor", run: 50, exclusive: "Breaker's Delight", odds: {Breaker: "1:3"}, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "orange", name: "Orange Refractor", run: 25, odds: {Hobby: "1:962", Mega: "1:1,110", "Value Blaster": "1:2,261", Hanger: "1:643"}, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "orange-wave", name: "Orange Wave Refractor", run: 25, exclusive: "Hobby", odds: {Hobby: "1:130"}, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "orange-geometric", name: "Orange Geometric Refractor", run: 25, exclusive: "Breaker's Delight", odds: {Breaker: "1:6"}, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "white-geometric", name: "White Geometric Refractor", run: 15, exclusive: "Breaker's Delight", odds: {Breaker: "1:9"}, color: "#f5f2ea", gradient: ["#f5f2ea", "#c9c3b3"]},
        {key: "red", name: "Red Refractor", run: 5, odds: {Hobby: "1:4,807", Mega: "1:5,269", "Value Blaster": "1:11,680", Hanger: "1:3,212"}, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-wave", name: "Red Wave Refractor", run: 5, exclusive: "Hobby", odds: {Hobby: "1:646"}, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-geometric", name: "Red Geometric Refractor", run: 5, exclusive: "Breaker's Delight", odds: {Breaker: "1:26"}, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "frozenfractor", name: "FrozenFractor", run: 5, note: "numbered backwards /-5", odds: {Hobby: "1:4,807", Mega: "1:5,269", "Value Blaster": "1:11,680", Hanger: "1:3,212"}, color: "#e6f6ff", gradient: ["#e6f6ff", "#8fc9e6"]},
        {key: "black-geometric", name: "Black Geometric Refractor", run: 2, exclusive: "Breaker's Delight", odds: {Breaker: "1:65"}, color: "#3a3a3a", gradient: ["#3a3a3a", "#0a0a0a"]},
        {key: "superfractor", name: "Superfractor", run: 1, odds: {Hobby: "1:8,444", Breaker: "1:501", Mega: "1:42,147", "Value Blaster": "1:140,154", Hanger: "1:80,294"}, color: "#fff5c0", gradient: ["#fff5c0", "#ffd97a"]},
      ],
      unnumbered: [
        {key: "refractor", name: "Refractor", run: null, odds: {Hobby: "1:2", Breaker: "1:1", Mega: "1:4", "Value Blaster": "1:4", Hanger: "1:2"}, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "x-fractor", name: "X-Fractor", run: null, odds: {Mega: "1:2"}, color: "#c4d6c4", gradient: ["#c4d6c4", "#7da37d"]},
        {key: "pink", name: "Pink Refractor", run: null, odds: {"Value Blaster": "1:7"}, color: "#ffb3d1", gradient: ["#ffb3d1", "#cc6f95"]},
        {key: "sepia", name: "Sepia Refractor", run: null, odds: {"Value Blaster": "1:7"}, color: "#b8a37a", gradient: ["#b8a37a", "#8a7045"]},
        {key: "prism", name: "Prism Refractor", run: null, odds: {Mega: "1:11", "Value Blaster": "1:11", Hanger: "1:2"}, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "negative", name: "Negative Refractor", run: null, odds: {Hobby: "1:63", Mega: "1:83", "Value Blaster": "1:125", Hanger: "1:25"}, color: "#e8e8e8", gradient: ["#e8e8e8", "#2a2a2a"]},
        {key: "camo-wave", name: "Camo Wave Refractor", run: null, odds: {Hobby: "1:130"}, color: "#7d8a5a", gradient: ["#7d8a5a", "#4a5233"]},
        {key: "yellow-wave", name: "Yellow Wave Refractor", run: null, odds: {Hobby: "1:44"}, color: "#f2dc4a", gradient: ["#f2dc4a", "#b59d12"]},
        {key: "yellow-geometric", name: "Yellow Geometric Refractor", run: null, odds: {Breaker: "1:2"}, color: "#f2dc4a", gradient: ["#f2dc4a", "#b59d12"]},
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────
  '2024-bowman-chrome-prospects': {
    label: "2024 Bowman Chrome Prospects",
    sport: "baseball",
    year: 2024,
    season: false,
    brand: "bowman-chrome",
    baseSize: 100,
    note: "Prospect (BCP) cards. Odds are per Hobby pack.",
    source: {name: "Checklist Insider", url: "https://www.checklistinsider.com/2024-bowman-chrome-baseball"},
    parallels: {
      numbered: [
        {key: "refractor", name: "Refractor", run: 499, odds: {Hobby: "1:35"}, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "speckle", name: "Speckle Refractor", run: 299, odds: {Hobby: "1:59"}, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "purple", name: "Purple Refractor", run: 250, odds: {Hobby: "1:70"}, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "purple-shimmer", name: "Purple Shimmer Refractor", run: 250, odds: {Hobby: "1:70"}, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "fuchsia-shimmer", name: "Fuchsia Shimmer Refractor", run: 199, odds: {Hobby: "1:88"}, color: "#e64fb0", gradient: ["#e64fb0", "#a01f70"]},
        {key: "reptilian-blue", name: "Reptilian Blue Refractor", run: 150, odds: {Hobby: "1:117"}, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "blue", name: "Blue Refractor", run: 150, odds: {Hobby: "1:117"}, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "aqua", name: "Aqua Refractor", run: 125, odds: {Hobby: "1:140"}, color: "#3fc6c9", gradient: ["#3fc6c9", "#1a8a90"]},
        {key: "reptilian-green", name: "Reptilian Green Refractor", run: 99, odds: {Hobby: "1:177"}, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green", name: "Green Refractor", run: 99, odds: {Hobby: "1:177"}, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-shimmer", name: "Green Shimmer Refractor", run: 99, odds: {Hobby: "1:177"}, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "yellow", name: "Yellow Refractor", run: 75, odds: {Hobby: "1:233"}, color: "#f2d64b", gradient: ["#f2d64b", "#c2a21a"]},
        {key: "reptilian-gold", name: "Reptilian Gold Refractor", run: 50, odds: {Hobby: "1:350"}, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold", name: "Gold Refractor", run: 50, odds: {Hobby: "1:350"}, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-shimmer", name: "Gold Shimmer Refractor", run: 50, odds: {Hobby: "1:350"}, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "orange", name: "Orange Refractor", run: 25, odds: {Hobby: "1:699"}, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "orange-shimmer", name: "Orange Shimmer Refractor", run: 25, odds: {Hobby: "1:699"}, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "reptilian-orange", name: "Reptilian Orange Refractor", run: 25, odds: {Hobby: "1:699"}, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "black", name: "Black Refractor", run: 10, odds: {Hobby: "1:1,746"}, color: "#3a3a3a", gradient: ["#3a3a3a", "#0a0a0a"]},
        {key: "reptilian-black", name: "Reptilian Black Refractor", run: 10, odds: {Hobby: "1:1,746"}, color: "#3a3a3a", gradient: ["#3a3a3a", "#0a0a0a"]},
        {key: "red", name: "Red Refractor", run: 5, odds: {Hobby: "1:3,484"}, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-shimmer", name: "Red Shimmer Refractor", run: 5, odds: {Hobby: "1:3,497"}, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "reptilian-red", name: "Reptilian Red Refractor", run: 5, odds: {Hobby: "1:3,484"}, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "superfractor", name: "SuperFractor", run: 1, odds: {Hobby: "1:17,562"}, color: "#fff5c0", gradient: ["#fff5c0", "#ffd97a"]},
      ],
      unnumbered: [
        {key: "shimmer", name: "Shimmer Refractor", run: null, odds: {Hobby: "1:22"}, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "pearl", name: "Pearl Refractor", run: null, odds: {Hobby: "1:480"}, color: "#f4efe6", gradient: ["#f4efe6", "#d6cbb8"]},
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────
  '2023-24-panini-prizm-basketball': {
    label: "2023-24 Panini Prizm",
    sport: "basketball",
    year: 2023,
    season: true,
    brand: "panini-prizm",
    baseSize: 300,
    source: {name: "Checklist Insider", url: "https://www.checklistinsider.com/2023-24-panini-prizm-basketball"},
    parallels: {
      numbered: [
        {key: "red", name: "Red Prizm", run: 299, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-seismic", name: "Red Seismic Prizm", run: 299, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "teal-ice", name: "Teal Ice Prizm", run: 225, color: "#3fc6c9", gradient: ["#3fc6c9", "#1a8a90"]},
        {key: "blue", name: "Blue Prizm", run: 199, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "white", name: "White Prizm", run: 175, exclusive: "Hobby", color: "#f4f1ea", gradient: ["#f4f1ea", "#c9c4b8"]},
        {key: "fast-break-blue", name: "Fast Break Blue Prizm", run: 150, exclusive: "Fast Break", color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "premium-factory-set", name: "Premium Factory Set Prizm", run: 150, exclusive: "Factory set", color: "#d8d8d8", gradient: ["#d8d8d8", "#e6c14d"]},
        {key: "purple-ice", name: "Purple Ice Prizm", run: 149, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "blue-sparkle", name: "Blue Sparkle Prizm", run: 144, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "blue-ice", name: "Blue Ice Prizm", run: 125, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "fast-break-red", name: "Fast Break Red Prizm", run: 100, exclusive: "Fast Break", color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "blue-seismic", name: "Blue Seismic Prizm", run: 99, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "purple", name: "Purple Prizm", run: 99, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "choice-red", name: "Choice Red Prizm", run: 88, exclusive: "Choice", color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "multi-wave", name: "Multi Wave Prizm", run: 88, exclusive: "Hobby Intl", color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "fast-break-purple", name: "Fast Break Purple Prizm", run: 75, exclusive: "Fast Break", color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "red-power", name: "Red Power Prizm", run: 75, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "orange-wave", name: "Orange Wave Prizm", run: 60, exclusive: "Hobby Intl", color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "fast-break-pink", name: "Fast Break Pink Prizm", run: 50, exclusive: "Fast Break", color: "#ffb3d1", gradient: ["#ffb3d1", "#cc6f95"]},
        {key: "choice-blue", name: "Choice Blue Prizm", run: 49, exclusive: "Choice", color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "orange", name: "Orange Prizm", run: 49, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "pink-pulsar", name: "Pink Pulsar Prizm", run: 42, color: "#ffb3d1", gradient: ["#ffb3d1", "#cc6f95"]},
        {key: "white-wave", name: "White Wave Prizm", run: 38, exclusive: "Hobby Intl", color: "#f4f1ea", gradient: ["#f4f1ea", "#c9c4b8"]},
        {key: "blue-shimmer-fotl", name: "Blue Shimmer FOTL Prizm", run: 35, exclusive: "FOTL", color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "purple-pulsar", name: "Purple Pulsar Prizm", run: 35, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "white-ice", name: "White Ice Prizm", run: 35, color: "#f4f1ea", gradient: ["#f4f1ea", "#c9c4b8"]},
        {key: "green-pulsar", name: "Green Pulsar Prizm", run: 25, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "mojo", name: "Mojo Prizm", run: 25, color: "#b370e0", gradient: ["#b370e0", "#7d3edf"]},
        {key: "gold-sparkle", name: "Gold Sparkle Prizm", run: 24, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "choice-cherry-blossom", name: "Choice Cherry Blossom Prizm", run: 20, exclusive: "Choice", color: "#ffc2d6", gradient: ["#ffc2d6", "#d9577f"]},
        {key: "fast-break-bronze", name: "Fast Break Bronze Prizm", run: 20, exclusive: "Fast Break", color: "#c9844a", gradient: ["#c9844a", "#7d4a1f"]},
        {key: "gold", name: "Gold Prizm", run: 10, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-shimmer-fotl", name: "Gold Shimmer FOTL Prizm", run: 10, exclusive: "FOTL", color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-wave", name: "Gold Wave Prizm", run: 10, exclusive: "Hobby Intl", color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "choice-green", name: "Choice Green Prizm", run: 8, exclusive: "Choice", color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-sparkle", name: "Green Sparkle Prizm", run: 8, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "lucky-envelopes", name: "Lucky Envelopes Prizm", run: 8, color: "#cc3340", gradient: ["#cc3340", "#e6c14d"]},
        {key: "black-gold", name: "Black Gold Prizm", run: 5, color: "#3a3a3a", gradient: ["#3a3a3a", "#e6c14d"]},
        {key: "fast-break-neon-green", name: "Fast Break Neon Green Prizm", run: 5, exclusive: "Fast Break", color: "#b8ff4d", gradient: ["#b8ff4d", "#86d957"]},
        {key: "green-shimmer-fotl", name: "Green Shimmer FOTL Prizm", run: 5, exclusive: "FOTL", color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "black", name: "Black Prizm", run: 1, color: "#3a3a3a", gradient: ["#3a3a3a", "#0a0a0a"]},
        {key: "black-shimmer-fotl", name: "Black Shimmer FOTL Prizm", run: 1, exclusive: "FOTL", color: "#3a3a3a", gradient: ["#3a3a3a", "#0a0a0a"]},
        {key: "choice-nebula", name: "Choice Nebula Prizm", run: 1, exclusive: "Choice", color: "#6b4bd9", gradient: ["#6b4bd9", "#1b1446"]},
      ],
      unnumbered: [
        {key: "blue-wave", name: "Blue Wave Prizm", run: null, exclusive: "Hobby Intl", color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "choice-blue-yellow-green", name: "Choice Blue Yellow & Green Prizm", run: null, exclusive: "Choice", color: "#5694ff", gradient: ["#5694ff", "#f2d64b"]},
        {key: "choice-tiger-stripe", name: "Choice Tiger Stripe Prizm", run: null, exclusive: "Choice", color: "#ff9842", gradient: ["#ff9842", "#1a1a1a"]},
        {key: "fast-break", name: "Fast Break Prizm", run: null, exclusive: "Fast Break", color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "glitter", name: "Glitter Prizm", run: null, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "green", name: "Green Prizm", run: null, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-ice", name: "Green Ice Prizm", run: null, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-wave", name: "Green Wave Prizm", run: null, exclusive: "Hobby Intl", color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "hyper", name: "Hyper Prizm", run: null, color: "#ff70a8", gradient: ["#ff70a8", "#cc4080"]},
        {key: "ice", name: "Ice Prizm", run: null, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "orange-ice", name: "Orange Ice Prizm", run: null, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "pink-ice", name: "Pink Ice Prizm", run: null, color: "#ffb3d1", gradient: ["#ffb3d1", "#cc6f95"]},
        {key: "pulsar", name: "Pulsar Prizm", run: null, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "red-ice", name: "Red Ice Prizm", run: null, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-sparkle", name: "Red Sparkle Prizm", run: null, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-white-blue", name: "Red White & Blue Prizm", run: null, color: "#cc3340", gradient: ["#cc3340", "#f4f1ea"]},
        {key: "ruby-wave", name: "Ruby Wave Prizm", run: null, exclusive: "Hobby Intl", color: "#b3203a", gradient: ["#b3203a", "#6e0f20"]},
        {key: "silver-prizm", name: "Silver Prizm", run: null, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "snakeskin", name: "Snakeskin Prizm", run: null, exclusive: "Hobby", color: "#7d8f55", gradient: ["#7d8f55", "#3a4a2d"]},
        {key: "white-sparkle", name: "White Sparkle Prizm", run: null, color: "#f4f1ea", gradient: ["#f4f1ea", "#c9c4b8"]},
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────
  '2024-25-panini-prizm-basketball': {
    label: "2024-25 Panini Prizm",
    sport: "basketball",
    year: 2024,
    season: true,
    brand: "panini-prizm",
    baseSize: 300,
    source: {name: "Checklist Insider", url: "https://www.checklistinsider.com/2024-25-panini-prizm-basketball"},
    parallels: {
      numbered: [
        {key: "red", name: "Red Prizm", run: 299, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-seismic", name: "Red Seismic Prizm", run: 299, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "white-lazer", name: "White Lazer Prizm", run: 275, color: "#f4f1ea", gradient: ["#f4f1ea", "#c9c4b8"]},
        {key: "pink", name: "Pink Prizm", run: 249, color: "#ffb3d1", gradient: ["#ffb3d1", "#cc6f95"]},
        {key: "skewed", name: "Skewed Prizm", run: 249, exclusive: "Hobby", color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "basketball", name: "Basketball Prizm", run: 225, exclusive: "Hobby", color: "#ff9842", gradient: ["#ff9842", "#7d4a1f"]},
        {key: "teal-ice", name: "Teal Ice Prizm", run: 225, color: "#3fc6c9", gradient: ["#3fc6c9", "#1a8a90"]},
        {key: "blue", name: "Blue Prizm", run: 199, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "orange-seismic", name: "Orange Seismic Prizm", run: 199, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "white", name: "White Prizm", run: 175, color: "#f4f1ea", gradient: ["#f4f1ea", "#c9c4b8"]},
        {key: "fast-break-blue", name: "Fast Break Blue Prizm", run: 150, exclusive: "Fast Break", color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "premium-factory-set", name: "Premium Factory Set Prizm", run: 150, exclusive: "Factory set", color: "#d8d8d8", gradient: ["#d8d8d8", "#e6c14d"]},
        {key: "purple-ice", name: "Purple Ice Prizm", run: 149, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "blue-sparkle", name: "Blue Sparkle Prizm", run: 144, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "blue-ice", name: "Blue Ice Prizm", run: 125, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "blue-wave", name: "Blue Wave Prizm", run: 125, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "fast-break-orange", name: "Fast Break Orange Prizm", run: 125, exclusive: "Fast Break", color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "fast-break-red", name: "Fast Break Red Prizm", run: 100, exclusive: "Fast Break", color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "blue-pulsar", name: "Blue Pulsar Prizm", run: 99, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "blue-seismic", name: "Blue Seismic Prizm", run: 99, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "purple", name: "Purple Prizm", run: 99, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "choice-red", name: "Choice Red Prizm", run: 88, exclusive: "Choice", color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "dragon-year", name: "Dragon Year Prizm", run: 88, exclusive: "China", color: "#cc3340", gradient: ["#cc3340", "#e6c14d"]},
        {key: "multi-wave", name: "Multi Wave Prizm", run: 88, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "fast-break-purple", name: "Fast Break Purple Prizm", run: 75, exclusive: "Fast Break", color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "red-power", name: "Red Power Prizm", run: 75, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-pulsar", name: "Red Pulsar Prizm", run: 75, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "orange-wave", name: "Orange Wave Prizm", run: 60, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "fast-break-pink", name: "Fast Break Pink Prizm", run: 50, exclusive: "Fast Break", color: "#ffb3d1", gradient: ["#ffb3d1", "#cc6f95"]},
        {key: "choice-blue", name: "Choice Blue Prizm", run: 49, exclusive: "Choice", color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "orange", name: "Orange Prizm", run: 49, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "jade-dragon-scale", name: "Jade Dragon Scale Prizm", run: 48, exclusive: "China", color: "#4fae8a", gradient: ["#4fae8a", "#cc3340"]},
        {key: "pink-pulsar", name: "Pink Pulsar Prizm", run: 42, color: "#ffb3d1", gradient: ["#ffb3d1", "#cc6f95"]},
        {key: "white-wave", name: "White Wave Prizm", run: 38, color: "#f4f1ea", gradient: ["#f4f1ea", "#c9c4b8"]},
        {key: "blue-shimmer-fotl", name: "Blue Shimmer FOTL Prizm", run: 35, exclusive: "FOTL", color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "purple-pulsar", name: "Purple Pulsar Prizm", run: 35, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "red-lazer", name: "Red Lazer Prizm", run: 35, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "white-ice", name: "White Ice Prizm", run: 35, color: "#f4f1ea", gradient: ["#f4f1ea", "#c9c4b8"]},
        {key: "green-pulsar", name: "Green Pulsar Prizm", run: 25, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "mojo", name: "Mojo Prizm", run: 25, color: "#b370e0", gradient: ["#b370e0", "#7d3edf"]},
        {key: "gold-sparkle", name: "Gold Sparkle Prizm", run: 24, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "choice-cherry-blossom", name: "Choice Cherry Blossom Prizm", run: 20, exclusive: "Choice", color: "#ffc2d6", gradient: ["#ffc2d6", "#d9577f"]},
        {key: "fast-break-bronze", name: "Fast Break Bronze Prizm", run: 20, exclusive: "Fast Break", color: "#c9844a", gradient: ["#c9844a", "#7d4a1f"]},
        {key: "lotus-flower", name: "Lotus Flower Prizm", run: 18, exclusive: "China", color: "#ffb3d1", gradient: ["#ffb3d1", "#e67fa8"]},
        {key: "gold", name: "Gold Prizm", run: 10, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-ice", name: "Gold Ice Prizm", run: 10, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-lazer", name: "Gold Lazer Prizm", run: 10, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-shimmer-fotl", name: "Gold Shimmer FOTL Prizm", run: 10, exclusive: "FOTL", color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-wave", name: "Gold Wave Prizm", run: 10, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "choice-green", name: "Choice Green Prizm", run: 8, exclusive: "Choice", color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-sparkle", name: "Green Sparkle Prizm", run: 8, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "lucky-envelopes", name: "Lucky Envelopes Prizm", run: 8, color: "#cc3340", gradient: ["#cc3340", "#e6c14d"]},
        {key: "plum-blossom", name: "Plum Blossom Prizm", run: 8, color: "#8e4585", gradient: ["#8e4585", "#5a2253"]},
        {key: "black-gold", name: "Black Gold Prizm", run: 5, color: "#3a3a3a", gradient: ["#3a3a3a", "#e6c14d"]},
        {key: "fast-break-neon-green", name: "Fast Break Neon Green Prizm", run: 5, exclusive: "Fast Break", color: "#b8ff4d", gradient: ["#b8ff4d", "#86d957"]},
        {key: "green-shimmer-fotl", name: "Green Shimmer FOTL Prizm", run: 5, exclusive: "FOTL", color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "black", name: "Black Prizm", run: 1, color: "#3a3a3a", gradient: ["#3a3a3a", "#0a0a0a"]},
        {key: "black-shimmer-fotl", name: "Black Shimmer FOTL Prizm", run: 1, exclusive: "FOTL", color: "#3a3a3a", gradient: ["#3a3a3a", "#0a0a0a"]},
        {key: "choice-nebula", name: "Choice Nebula Prizm", run: 1, exclusive: "Choice", color: "#6b4bd9", gradient: ["#6b4bd9", "#1b1446"]},
      ],
      unnumbered: [
        {key: "black-white", name: "Black White Prizm", run: null, exclusive: "China", color: "#3a3a3a", gradient: ["#3a3a3a", "#f4f1ea"]},
        {key: "choice-blue-yellow-green", name: "Choice Blue/Yellow/Green Prizm", run: null, exclusive: "Choice", color: "#5694ff", gradient: ["#5694ff", "#f2d64b"]},
        {key: "choice-tiger-stripe", name: "Choice Tiger Stripe Prizm", run: null, exclusive: "Choice", color: "#ff9842", gradient: ["#ff9842", "#1a1a1a"]},
        {key: "fast-break", name: "Fast Break Prizm", run: null, exclusive: "Fast Break", color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "glitter", name: "Glitter Prizm", run: null, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "green-ice", name: "Green Ice Prizm", run: null, exclusive: "Mega", color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-wave", name: "Green Wave Prizm", run: null, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "hyper", name: "Hyper Prizm", run: null, color: "#ff70a8", gradient: ["#ff70a8", "#cc4080"]},
        {key: "ice", name: "Ice Prizm", run: null, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "orange-ice", name: "Orange Ice Prizm", run: null, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "pink-ice", name: "Pink Ice Prizm", run: null, color: "#ffb3d1", gradient: ["#ffb3d1", "#cc6f95"]},
        {key: "pulsar", name: "Pulsar Prizm", run: null, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "red-ice", name: "Red Ice Prizm", run: null, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-sparkle", name: "Red Sparkle Prizm", run: null, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-white-blue", name: "Red/White/Blue Prizm", run: null, color: "#cc3340", gradient: ["#cc3340", "#f4f1ea"]},
        {key: "ruby-wave", name: "Ruby Wave Prizm", run: null, color: "#b3203a", gradient: ["#b3203a", "#6e0f20"]},
        {key: "silver-prizm", name: "Silver Prizm", run: null, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "snakeskin", name: "Snakeskin Prizm", run: null, color: "#7d8f55", gradient: ["#7d8f55", "#3a4a2d"]},
        {key: "wave", name: "Wave Prizm", run: null, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "white-sparkle", name: "White Sparkle Prizm", run: null, color: "#f4f1ea", gradient: ["#f4f1ea", "#c9c4b8"]},
        {key: "white-tiger-stripe", name: "White Tiger Stripe Prizm", run: null, exclusive: "China", color: "#f4f1ea", gradient: ["#f4f1ea", "#ff9842"]},
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────
  '2024-panini-prizm-football': {
    label: "2024 Panini Prizm Football",
    sport: "football",
    year: 2024,
    season: false,
    brand: "panini-prizm",
    baseSize: 300,
    source: {name: "Checklist Insider", url: "https://www.checklistinsider.com/2024-panini-prizm-football"},
    parallels: {
      numbered: [
        {key: "pandora", name: "Pandora Prizm", run: 400, exclusive: "Factory set", color: "#b370e0", gradient: ["#b370e0", "#3fc6c9"]},
        {key: "orange", name: "Orange Prizm", run: 249, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "blue-wave", name: "Blue Wave Prizm", run: 230, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "purple-ice", name: "Purple Ice Prizm", run: 225, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "hyper", name: "Hyper Prizm", run: 180, color: "#ff70a8", gradient: ["#ff70a8", "#cc4080"]},
        {key: "red-wave", name: "Red Wave Prizm", run: 149, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "purple", name: "Purple Prizm", run: 125, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "blue-ice", name: "Blue Ice Prizm", run: 99, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "no-huddle-blue", name: "No Huddle Blue Prizm", run: 99, exclusive: "No Huddle", color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "purple-wave", name: "Purple Wave Prizm", run: 99, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "blue-sparkle", name: "Blue Sparkle Prizm", run: 96, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "green-scope", name: "Green Scope Prizm", run: 75, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "no-huddle-red", name: "No Huddle Red Prizm", run: 75, exclusive: "No Huddle", color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "orange-wave", name: "Orange Wave Prizm", run: 60, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "no-huddle-purple", name: "No Huddle Purple Prizm", run: 49, exclusive: "No Huddle", color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "purple-power", name: "Purple Power Prizm", run: 49, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "red-yellow", name: "Red & Yellow Prizm", run: 44, exclusive: "Hobby Intl", color: "#cc3340", gradient: ["#cc3340", "#f2d64b"]},
        {key: "red-shimmer", name: "Red Shimmer Prizm", run: 35, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "white", name: "White Prizm", run: 35, color: "#f4f1ea", gradient: ["#f4f1ea", "#c9c4b8"]},
        {key: "blue-shimmer", name: "Blue Shimmer Prizm", run: 25, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "navy-camo", name: "Navy Camo Prizm", run: 25, color: "#3a4f80", gradient: ["#3a4f80", "#5a7045"]},
        {key: "no-huddle-pink", name: "No Huddle Pink Prizm", run: 25, exclusive: "No Huddle", color: "#ffb3d1", gradient: ["#ffb3d1", "#cc6f95"]},
        {key: "gold-sparkle", name: "Gold Sparkle Prizm", run: 24, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "choice-red", name: "Choice Red Prizm", run: 20, exclusive: "Choice", color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "choice-cherry-blossom", name: "Choice Cherry Blossom Prizm", run: 15, exclusive: "Choice", color: "#ffc2d6", gradient: ["#ffc2d6", "#d9577f"]},
        {key: "forest-camo", name: "Forest Camo Prizm", run: 15, color: "#5a7045", gradient: ["#5a7045", "#2f3d24"]},
        {key: "choice-blue", name: "Choice Blue Prizm", run: 14, exclusive: "Choice", color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "choice-gold", name: "Choice Gold Prizm", run: 10, exclusive: "Choice", color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold", name: "Gold Prizm", run: 10, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-shimmer", name: "Gold Shimmer Prizm", run: 10, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "gold-wave", name: "Gold Wave Prizm", run: 10, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "no-huddle-neon-green", name: "No Huddle Neon Green Prizm", run: 10, exclusive: "No Huddle", color: "#b8ff4d", gradient: ["#b8ff4d", "#86d957"]},
        {key: "green-sparkle", name: "Green Sparkle Prizm", run: 8, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "gold-vinyl", name: "Gold Vinyl Prizm", run: 5, color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
        {key: "green-shimmer", name: "Green Shimmer Prizm", run: 5, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "white-knight", name: "White Knight Prizm", run: 3, color: "#f4f1ea", gradient: ["#f4f1ea", "#c9c4b8"]},
        {key: "black-finite", name: "Black Finite Prizm", run: 1, color: "#3a3a3a", gradient: ["#3a3a3a", "#0a0a0a"]},
        {key: "black-shimmer", name: "Black Shimmer Prizm", run: 1, color: "#3a3a3a", gradient: ["#3a3a3a", "#0a0a0a"]},
        {key: "black-stars", name: "Black Stars Prizm", run: 1, color: "#3a3a3a", gradient: ["#3a3a3a", "#2a2a3a"]},
        {key: "choice-nebula", name: "Choice Nebula Prizm", run: 1, exclusive: "Choice", color: "#6b4bd9", gradient: ["#6b4bd9", "#1b1446"]},
      ],
      unnumbered: [
        {key: "black-red-checker", name: "Black & Red Checker Prizm", run: null, color: "#3a3a3a", gradient: ["#3a3a3a", "#cc3340"]},
        {key: "black-white-checker", name: "Black & White Checker Prizm", run: null, color: "#3a3a3a", gradient: ["#3a3a3a", "#f4f1ea"]},
        {key: "blue", name: "Blue Prizm", run: null, color: "#5694ff", gradient: ["#5694ff", "#2a5db8"]},
        {key: "choice-blue-yellow-green", name: "Choice Blue Yellow & Green Prizm", run: null, exclusive: "Choice", color: "#5694ff", gradient: ["#5694ff", "#f2d64b"]},
        {key: "choice-tiger-stripe", name: "Choice Tiger Stripe Prizm", run: null, exclusive: "Choice", color: "#ff9842", gradient: ["#ff9842", "#1a1a1a"]},
        {key: "disco", name: "Disco Prizm", run: null, color: "#e6c3ff", gradient: ["#e6c3ff", "#7fd6e6"]},
        {key: "green", name: "Green Prizm", run: null, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-ice", name: "Green Ice Prizm", run: null, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "green-wave", name: "Green Wave Prizm", run: null, color: "#86d957", gradient: ["#86d957", "#3fa61c"]},
        {key: "lazer", name: "Lazer Prizm", run: null, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "neon-green-pulsar", name: "Neon Green Pulsar Prizm", run: null, color: "#b8ff4d", gradient: ["#b8ff4d", "#86d957"]},
        {key: "no-huddle", name: "No Huddle Prizm", run: null, exclusive: "No Huddle", color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "orange-ice", name: "Orange Ice Prizm", run: null, color: "#ff9842", gradient: ["#ff9842", "#cc5e0d"]},
        {key: "pink", name: "Pink Prizm", run: null, color: "#ffb3d1", gradient: ["#ffb3d1", "#cc6f95"]},
        {key: "pink-wave", name: "Pink Wave Prizm", run: null, color: "#ffb3d1", gradient: ["#ffb3d1", "#cc6f95"]},
        {key: "press-proof", name: "Press Proof Prizm", run: null, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "purple-pulsar", name: "Purple Pulsar Prizm", run: null, color: "#8a4dd9", gradient: ["#8a4dd9", "#5d2da3"]},
        {key: "red", name: "Red Prizm", run: null, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-sparkle", name: "Red Sparkle Prizm", run: null, color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "red-white-blue", name: "Red White & Blue Prizm", run: null, color: "#cc3340", gradient: ["#cc3340", "#f4f1ea"]},
        {key: "silver-prizm", name: "Silver Prizm", run: null, color: "#d8d8d8", gradient: ["#d8d8d8", "#9a9a9a"]},
        {key: "snakeskin", name: "Snakeskin Prizm", run: null, color: "#7d8f55", gradient: ["#7d8f55", "#3a4a2d"]},
        {key: "white-sparkle", name: "White Sparkle Prizm", run: null, color: "#f4f1ea", gradient: ["#f4f1ea", "#c9c4b8"]},
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────
  '2024-25-ud-young-guns-hockey': {
    label: "2024-25 Upper Deck Young Guns",
    sport: "hockey",
    year: 2024,
    season: true,
    brand: "ud-young-guns",
    baseSize: 50,
    note: "Young Guns rookies (#201–250) fall 1:2 Hobby packs.",
    baseKey: "young-guns",
    source: {name: "Checklist Insider", url: "https://www.checklistinsider.com/2024-25-upper-deck-series-1-hockey"},
    parallels: {
      numbered: [
        {key: "deluxe", name: "Deluxe", run: 250, exclusive: "Hobby/ePack", color: "#9aa6b8", gradient: ["#9aa6b8", "#5d6b83"]},
        {key: "exclusives", name: "Exclusives", run: 100, exclusive: "Hobby/ePack", color: "#e6b96b", gradient: ["#e6b96b", "#a8851e"]},
        {key: "outburst-red", name: "Outburst Red", run: 25, exclusive: "Hobby/ePack", color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "high-gloss", name: "High Gloss", run: 10, exclusive: "Hobby/ePack", color: "#fff5c0", gradient: ["#fff5c0", "#ffd97a"]},
        {key: "outburst-gold", name: "Outburst Gold", run: 1, exclusive: "Hobby/ePack", color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
      ],
      unnumbered: [
        {key: "young-guns", name: "Young Guns", run: null, odds: {Hobby: "1:2"}, note: "base rookie card", color: "#b8b8b8", gradient: ["#b8b8b8", "#888888"]},
        {key: "outburst-silver", name: "Outburst Silver", run: null, odds: {Hobby: "1:60", Blaster: "1:180"}, color: "#d6d6d6", gradient: ["#d6d6d6", "#9c9c9c"]},
        {key: "clear-cut", name: "Clear Cut", run: null, odds: {Hobby: "1:144"}, exclusive: "Hobby", color: "#f0f0f0", gradient: ["#f0f0f0", "#bababa"]},
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────
  '2023-24-ud-young-guns-hockey': {
    label: "2023-24 Upper Deck Young Guns",
    sport: "hockey",
    year: 2023,
    season: true,
    brand: "ud-young-guns",
    baseSize: 50,
    note: "Young Guns rookies (#201–250) fall 1:2 Hobby packs.",
    baseKey: "young-guns",
    source: {name: "Beckett", url: "https://www.beckett.com/news/2023-24-upper-deck-series-1-hockey-cards/"},
    parallels: {
      numbered: [
        {key: "deluxe", name: "Deluxe", run: 250, exclusive: "Hobby/ePack", color: "#9aa6b8", gradient: ["#9aa6b8", "#5d6b83"]},
        {key: "exclusives", name: "Exclusives", run: 100, exclusive: "Hobby/ePack", color: "#e6b96b", gradient: ["#e6b96b", "#a8851e"]},
        {key: "outburst-red", name: "Outburst Red", run: 25, exclusive: "Hobby/ePack", color: "#cc3340", gradient: ["#cc3340", "#8a1c25"]},
        {key: "high-gloss", name: "High Gloss", run: 10, exclusive: "Hobby/ePack", color: "#fff5c0", gradient: ["#fff5c0", "#ffd97a"]},
        {key: "outburst-gold", name: "Outburst Gold", run: 1, exclusive: "Hobby/ePack", color: "#e6c14d", gradient: ["#e6c14d", "#a8851e"]},
      ],
      unnumbered: [
        {key: "young-guns", name: "Young Guns", run: null, odds: {Hobby: "1:2"}, note: "base rookie card", color: "#b8b8b8", gradient: ["#b8b8b8", "#888888"]},
        {key: "outburst-silver", name: "Outburst Silver", run: null, odds: {Hobby: "1:60"}, color: "#d6d6d6", gradient: ["#d6d6d6", "#9c9c9c"]},
        {key: "clear-cut", name: "Clear Cut", run: null, odds: {Hobby: "1:144"}, exclusive: "Hobby", color: "#f0f0f0", gradient: ["#f0f0f0", "#bababa"]},
      ],
    },
  },
};

function allParallels(set) {
  return [...(set.parallels.numbered || []), ...(set.parallels.unnumbered || [])];
}

/**
 * Look up the parallel definition for a given setKey + parallelKey.
 * Returns null if either is unknown.
 */
export function getParallel(setKey, parallelKey) {
  const set = PARALLEL_DATA[setKey];
  if (!set || !parallelKey) return null;
  return allParallels(set).find((p) => p.key === parallelKey) || null;
}

/**
 * Return the full set definition by key, or null if not in the database.
 */
export function getSet(setKey) {
  return PARALLEL_DATA[setKey] || null;
}

/**
 * Group a set's numbered parallels into print-run rungs, rarest first.
 * Returns [{ run, parallels: [...] }]. Several parallels often share a run
 * (2024 Chrome has four /99 Greens), so the ladder ranks rungs, not names.
 */
export function getRungs(set) {
  const byRun = new Map();
  for (const p of set?.parallels?.numbered || []) {
    if (!byRun.has(p.run)) byRun.set(p.run, []);
    byRun.get(p.run).push(p);
  }
  return [...byRun.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([run, parallels]) => ({ run, parallels }));
}
