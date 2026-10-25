// scripts/build-parallel-data.mjs
//
// Builds lib/parallelDataExtra.js from scripts/parallel-sets.json: for each
// set, reads the named sections of its Checklist Insider page and writes the
// parallel list in lib/parallelData.js's shape.
//
//   node scripts/build-parallel-data.mjs              fetch pages, write the file
//   node scripts/build-parallel-data.mjs --cache DIR  read/write pages as DIR/<page>.html
//   node scripts/build-parallel-data.mjs --check      print a summary, write nothing
//
// Facts only (names, print runs, pack odds, box exclusives). One request per
// page, a second apart. See README "Adding a set each quarter".

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sections, toText } from './checklist-parallels.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'scripts/parallel-sets.json'), 'utf8'));
const args = process.argv.slice(2);
const cacheDir = args.includes('--cache') ? args[args.indexOf('--cache') + 1] : null;
const checkOnly = args.includes('--check');

const SOURCE = 'https://www.checklistinsider.com/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function page(name) {
  const cached = cacheDir && path.join(cacheDir, `${name}.html`);
  if (cached && fs.existsSync(cached)) return fs.readFileSync(cached, 'utf8');
  await sleep(1000);
  const res = await fetch(SOURCE + name, { headers: { 'User-Agent': 'Mozilla/5.0 (fieldsandfloors.com set list helper)' } });
  if (!res.ok) throw new Error(`${res.status} for ${SOURCE + name}`);
  const html = await res.text();
  if (cached) fs.writeFileSync(cached, html);
  return html;
}

// Not parallels: section notes the list format picks up by accident.
// Words too common to mark another set on their own.
const GENERIC = new Set(['the', 'base', 'rookie', 'rookies', 'prospect', 'prospects', 'chrome', 'paper', 'nfl', 'nil', 'mlb', 'nba', 'veterans', 'veteran', 'update', 'series', 'variations', 'variation', 'image', '1st', 'and', 'of', 'a', 'refractor', 'refractors', 'prizm', 'prizms', 'mosaic', 'optic', 'football', 'basketball', 'baseball', 'hockey', 'parallel', 'parallels', 'set']);

const NOT_A_PARALLEL = /checklist|\bbox\b|\bpacks?\b|\bcards?\b|^(?:breaker|hobby|retail|mega|jumbo|blaster)[\w' ]*exclusives?$|^(?:odds|versions)$/i;

function build(set, secs) {
  const find = (h) => {
    const s = secs.find((x) => x.heading === h);
    if (!s) throw new Error(`${set.key}: no section "${h}" on ${set.page}`);
    return s;
  };
  const list = [];
  const byKey = new Map();
  for (const h of set.sections) {
    for (const p of find(h).parallels) {
      if (NOT_A_PARALLEL.test(p.name) || p.name.length > 45) continue;
      let key = p.key;
      // The same name at two print runs (a source typo or two versions): keep both.
      if (byKey.has(key) && byKey.get(key).run !== p.run) key = `${key}-${p.run || 'unnumbered'}`;
      if (byKey.has(key)) {
        const had = byKey.get(key);
        had.odds = { ...(p.odds || {}), ...(had.odds || {}) };
        continue;
      }
      const q = { ...p, key };
      byKey.set(key, q);
      list.push(q);
    }
  }
  if (set.oddsFrom) {
    for (const p of find(set.oddsFrom).parallels) {
      const q = byKey.get(p.key);
      if (q && q.run === p.run && p.odds) q.odds = { ...p.odds, ...(q.odds || {}) };
      if (q && !q.exclusive && p.exclusive) q.exclusive = p.exclusive;
    }
  }
  for (const p of list) {
    if (p.odds && !Object.keys(p.odds).length) delete p.odds;
    // "Snack Pack Parallels:" / "1 per Variety pack" read as the box name.
    if (p.exclusive === 'Snack' || p.exclusive === 'Variety') p.exclusive = `${p.exclusive} pack`;
  }

  let baseKey = null;
  if (set.baseAuto) {
    // The plain signed card, unnumbered; its odds are the whole line's.
    const odds = {};
    for (const m of (find(set.sections[0]).odds || '').matchAll(/1:([\d,]+)\s+([A-Za-z' ]+?)(?=;|\.|$)/g)) odds[m[2].trim().replace(/^Breaker.*/, 'Breaker')] = `1:${m[1]}`;
    list.unshift({ key: 'auto', name: 'Base Autograph', run: null, ...(Object.keys(odds).length ? { odds, oddsAnyColour: true } : {}), color: '#b8b8b8', gradient: ['#b8b8b8', '#888888'] });
    baseKey = 'auto';
  }
  if (set.baseName) {
    list.unshift({ key: 'base', name: set.baseName, run: null, ...(set.baseOdds ? { odds: set.baseOdds } : {}), color: '#b8b8b8', gradient: ['#b8b8b8', '#888888'] });
    baseKey = 'base';
  }

  // Other sets on the same page (inserts, other autograph lines), by name:
  // a title naming one of them isn't on this list's ladder.
  const own = new Set([...set.label.toLowerCase().split(/[^a-z0-9]+/), ...set.sections.flatMap((h) => h.toLowerCase().split(/[^a-z0-9]+/))]);
  const others = [...new Set(secs.map((x) => x.heading)
    .filter((h) => !set.sections.includes(h) && h !== set.oddsFrom && !/details|box\s+break|^base\b|team\s+set\s+list|product\s+configuration/i.test(h))
    .map((h) => h.replace(/\b(checklist|autographs?|signatures?|autos?|\d{4}(?:-\d{2})?\s+(?:panini|topps|bowman|donruss|upper\s+deck)?)\b/gi, ' ').replace(/[^A-Za-z0-9&' ]+/g, ' ').replace(/\b(nil|nfl|nba|mlb)\s*$/i, '').replace(/\s+/g, ' ').trim().toLowerCase())
    .filter((core) => core && core.split(' ').some((w) => !GENERIC.has(w) && !own.has(w))))].sort();

  const out = {
    label: set.label,
    sport: set.sport,
    year: set.year,
    season: !!set.season,
    brand: set.brand,
    ...(set.college ? { college: true } : {}),
    ...(set.kind === 'auto' ? { kind: 'auto', line: set.line, parent: set.parent } : {}),
    ...(set.requireNamed ? { requireNamed: true } : {}),
    ...(set.note ? { note: set.note } : {}),
    ...(baseKey ? { baseKey } : {}),
    ...(others.length ? { others } : {}),
    source: { name: 'Checklist Insider', url: SOURCE + set.page, pulled: spec.pulled },
    parallels: {
      numbered: list.filter((p) => p.run).sort((a, b) => b.run - a.run),
      unnumbered: list.filter((p) => !p.run),
    },
  };
  return out;
}

const pages = new Map();
const result = {};
for (const set of spec.sets) {
  if (!pages.has(set.page)) pages.set(set.page, sections(toText(await page(set.page))));
  result[set.key] = build(set, pages.get(set.page));
}

if (checkOnly) {
  for (const [k, s] of Object.entries(result)) {
    const n = s.parallels.numbered, u = s.parallels.unnumbered;
    console.log(`${k}: ${n.length} numbered, ${u.length} unnumbered`);
    console.log('   ' + [...n, ...u].map((p) => `${p.name}${p.run ? ' /' + p.run : ''}${p.exclusive ? ' [' + p.exclusive + ']' : ''}${p.odds ? '' : ' (no odds)'}`).join('; '));
  }
} else {
  const line = (p) => `        ${JSON.stringify(p)},`;
  const body = Object.entries(result).map(([k, s]) => {
    const { parallels, ...meta } = s;
    const head = Object.entries(meta).map(([mk, v]) => `    ${mk}: ${JSON.stringify(v)},`).join('\n');
    return `  ${JSON.stringify(k)}: {\n${head}\n    parallels: {\n      numbered: [\n${parallels.numbered.map(line).join('\n')}\n      ],\n      unnumbered: [\n${parallels.unnumbered.map(line).join('\n')}\n      ],\n    },\n  },`;
  }).join('\n\n');
  const file = `// lib/parallelDataExtra.js
//
// GENERATED by scripts/build-parallel-data.mjs from scripts/parallel-sets.json.
// Don't hand-edit: change the spec and rerun. Facts only (names, print runs,
// pack odds, box exclusives) from Checklist Insider, pulled ${spec.pulled}.
// Merged into PARALLEL_DATA by lib/parallelData.js.

export const EXTRA_SETS = {
${body}
};
`;
  fs.writeFileSync(path.join(root, 'lib/parallelDataExtra.js'), file);
  console.log(`wrote lib/parallelDataExtra.js: ${Object.keys(result).length} lists, ${(file.length / 1024).toFixed(0)} KB`);
}
