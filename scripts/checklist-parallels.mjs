// scripts/checklist-parallels.mjs
//
// Helper for adding a set to lib/parallelData.js. Reads one Checklist Insider
// set page and prints its parallel lists in the data file's shape, so the
// quarterly additions are copied from the source, not typed by hand.
//
//   node scripts/checklist-parallels.mjs <url>             list the page's sections
//   node scripts/checklist-parallels.mjs <url> 3           print section 3 as JS
//   node scripts/checklist-parallels.mjs <url> 3 --json    same, as JSON
//
// Facts only: parallel names, print runs, pack odds and box exclusives. No
// descriptions or other text is copied. One request per run; please don't
// loop it over many pages at once. See README "Adding a set each quarter".

const COLORS = [
  // Checked in order, so two-word names come before their parts.
  ['superfractor', '#fff5c0', '#ffd97a'], ['frozenfractor', '#e6f6ff', '#8fc9e6'],
  ['black finite', '#3a3a3a', '#0a0a0a'], ['gold vinyl', '#e6c14d', '#a8851e'],
  ['b&w', '#e8e8e8', '#2a2a2a'], ['black & white', '#e8e8e8', '#2a2a2a'], ['black and white', '#e8e8e8', '#2a2a2a'],
  ['white sparkle', '#f5f2ea', '#c9c3b3'], ['neon green', '#7dff6a', '#2fbf1c'], ['lime green', '#b5f24a', '#6fae12'],
  ['true gold', '#e6c14d', '#a8851e'], ['rose gold', '#e8a89a', '#a8685a'], ['red white', '#cc3340', '#3b5bd9'],
  ['magenta', '#d94db0', '#93226e'], ['fuchsia', '#d94db0', '#93226e'], ['pink', '#ffb3d1', '#cc6f95'],
  ['purple', '#8a4dd9', '#5d2da3'], ['violet', '#8a4dd9', '#5d2da3'], ['aqua', '#3fc6c9', '#1a8a90'], ['teal', '#3fc6c9', '#1a8a90'],
  ['blue', '#5694ff', '#2a5db8'], ['green', '#86d957', '#3fa61c'], ['yellow', '#f2dc4a', '#b59d12'],
  ['gold', '#e6c14d', '#a8851e'], ['orange', '#ff9842', '#cc5e0d'], ['red', '#cc3340', '#8a1c25'],
  ['black', '#3a3a3a', '#0a0a0a'], ['white', '#f5f2ea', '#c9c3b3'], ['bronze', '#c08a5a', '#7d5230'], ['copper', '#c08a5a', '#7d5230'],
  ['silver', '#d6d6d6', '#9c9c9c'], ['platinum', '#e8ecf2', '#a9b3c2'], ['sepia', '#b8a37a', '#8a7045'], ['camo', '#7d8a5a', '#4a5233'],
  ['negative', '#e8e8e8', '#2a2a2a'], ['pearl', '#f2eee6', '#cfc6b5'], ['ice', '#dff3ff', '#9cc9e6'], ['clear', '#f0f0f0', '#bababa'],
];
const DEFAULT_COLOR = ['#d8d8d8', '#9a9a9a'];

function colorFor(name) {
  const n = name.toLowerCase();
  const hit = COLORS.find(([w]) => new RegExp(`(^|[^a-z])${w.replace(/[&]/g, '\\&')}([^a-z]|$)`).test(n));
  const [, a, b] = hit || [null, ...DEFAULT_COLOR];
  return { color: a, gradient: [a, b] };
}

const slug = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '')
    .replace(/<h[1-4][^>]*>/gi, '\n## ')
    .replace(/<(br|\/p|\/li|\/h\d|\/tr|\/div)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, "'").replace(/&#8211;|&ndash;/g, '-')
    .replace(/&#8212;|&mdash;/g, '-').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
    .replace(/\n\s*\n+/g, '\n');
}

/** Box name as the data file spells it. */
function boxName(raw) {
  const s = raw.replace(/\b(packs?|exclusive|boxes?|box)\b/gi, '').replace(/[()]/g, '').trim();
  if (/breaker/i.test(s)) return 'Breaker';
  if (/^value\s+blaster/i.test(s)) return 'Value Blaster';
  if (/^fotl|first\s+off/i.test(s)) return 'FOTL';
  if (!s) return 'Packs';
  return s.replace(/\s+/g, ' ');
}

/** "1:20 Hobby; 1:38 Breaker" / "1:2 packs (Breaker exclusive)" → odds + exclusive. */
function parseOdds(text) {
  const odds = {};
  let exclusive = null;
  const ex = text.match(/\(?\s*([A-Za-z'&\- ]+?)\s+exclusive\s*\)?/i);
  if (ex) exclusive = boxName(ex[1]);
  for (const m of text.matchAll(/1:([\d,]+)\s*(?:packs?)?\s*\(?\s*([A-Za-z'&\- ]*)/g)) {
    const box = boxName(m[2] || '') || exclusive;
    if (box) odds[box] = `1:${m[1]}`;
  }
  return { odds, exclusive };
}

function parseItem(raw) {
  const s = raw.replace(/\.$/, '').trim();
  if (/^odds\b/i.test(s)) return null;
  // "Pearl Refractor (Pearl pack - Hobby)": unnumbered, notes in brackets.
  const paren = s.match(/^([^(/]+?)\s*\((.*)\)?$/);
  if (paren && !/\s-\s/.test(paren[1])) return { name: paren[1], run: null, rest: paren[2] };
  // List format: "Gold Refractor - /50 - 1:193 Hobby; 1:374 Breaker"
  let m = s.match(/^(.+?)\s+-\s+(?:#?\/\s*([\d,]+)|1\/1|one of one)\s*(?:-\s*(.*))?$/i);
  if (m) return { name: m[1], run: m[2] ? +m[2].replace(/,/g, '') : 1, rest: m[3] || '' };
  // Inline format: "Gold Refractor /50 (1:193 Hobby; 1:374 Breaker)"
  m = s.match(/^(.+?)\s+(?:#?\/\s*([\d,]+)|1\/1)\s*(?:\((.*)\)?)?$/i);
  if (m) return { name: m[1], run: m[2] ? +m[2].replace(/,/g, '') : 1, rest: m[3] || '' };
  m = s.match(/^(.+?)\s+-\s+(.*)$/) || s.match(/^(.+?)\s*\((.*)\)?$/);
  if (m && !/\d{2,}\s*$/.test(m[1])) return { name: m[1], run: null, rest: m[2] };
  if (/^[A-Z][A-Za-z'&\- ]{2,40}$/.test(s)) return { name: s, run: null, rest: '' };
  return null;
}

// Source typos seen on the pages.
const TYPOS = [[/\bLva\b/g, 'Lava'], [/\bRefactor\b/g, 'Refractor']];

function toParallel(it) {
  let name = it.name.replace(/\s+/g, ' ').replace(/^Parallels?:\s*/i, '').trim();
  let run = it.run;
  // "FrozenFractor -5/0" (numbered backwards), "Red Refractor/5" (no space).
  const back = name.match(/^(.*?)\s+-(\d+)\/0$/);
  if (back) { name = back[1]; run = run || +back[2]; }
  const glued = name.match(/^(.*?[a-z])\/(\d+)$/i);
  if (glued && !run) { name = glued[1]; run = +glued[2]; }
  name = name.replace(/\s*-$/, '').trim();
  for (const [re, fix] of TYPOS) name = name.replace(re, fix);
  const { odds, exclusive } = parseOdds(it.rest);
  const p = { key: slug(name), name, run };
  if (exclusive) p.exclusive = exclusive;
  if (Object.keys(odds).length) p.odds = odds;
  if (/variety\s+pack/i.test(it.rest) && !exclusive) p.exclusive = 'Variety pack';
  return { ...p, ...colorFor(name) };
}

const SERIAL = /(?:^|\s)(?:#?\/\s*\d|1\/1\b)/;

function sections(text) {
  const out = [];
  for (const block of text.split('\n## ').slice(1)) {
    const [heading, ...lines] = block.split('\n');
    const items = [];
    let oddsLine = null;
    let inList = false;      // under a "Parallels:" style header
    let groupEx = null;      // "Hobby Exclusive Parallels:" applies to the lines under it
    const add = (raw) => {
      const it = parseItem(raw);
      if (!it || it.name.length > 60) return;
      // Checklist rows ("BCP-12 Name", "1 Name, Team") and printing plates aren't parallels.
      if (/^[A-Z0-9]{1,6}-\d|^[A-Z]{1,6}\d|^[A-Z0-9]{1,6}-[A-Z0-9]{1,6}\s|^\d+\s|,|printing\s+plate/i.test(it.name)) return;
      if (groupEx && !/exclusive/i.test(it.rest)) it.rest = `${it.rest} (${groupEx} exclusive)`;
      items.push(it);
    };
    for (const line of lines) {
      const l = line.trim();
      if (!l) continue;
      if (/^(?:pack\s+)?odds\s*[-:]/i.test(l)) { oddsLine = l.replace(/^(?:pack\s+)?odds\s*[-:]\s*/i, ''); continue; }
      // "Parallels: A /50 (...); B /25 (...)" on one line.
      const inline = l.match(/^[^:]{0,40}parallels?:\s*(.+)$/i);
      if (inline) {
        inList = false;
        inline[1].split(/;\s+(?!1:|\d)/).forEach(add);
        continue;
      }
      // A header that opens a list: "Parallels:", "Hobby Exclusive Parallels:".
      const head = l.match(/^(.{0,40}?)\s*(?:parallels?(?:\s+list)?|versions):?$/i);
      if (head) {
        inList = true;
        const ex = head[1].match(/^(.+?)\s+exclusive$/i);
        groupEx = ex ? ex[1].replace(/\bdelight\b/i, '').trim() : (/pack$/i.test(head[1].trim()) ? head[1].trim() : null);
        continue;
      }
      const looksLikeItem = l.length < 400 && (/\s-\s(?:#?\/\s*\d|1\/1|1:)/.test(l) || (SERIAL.test(l) && l.replace(/\(.*$/, '').split(' ').length < 12));
      if (looksLikeItem) { add(l); continue; }
      if (inList && l.replace(/\(.*$/, '').length < 50 && !/[.!?]$/.test(l) && /^[A-Z0-9]/.test(l)) { add(l); continue; }
      inList = false; groupEx = null;
    }
    if (items.length) out.push({ heading: heading.trim(), odds: oddsLine, parallels: items.map(toParallel) });
  }
  return out;
}

function js(p) {
  const parts = [`key: "${p.key}"`, `name: "${p.name}"`, `run: ${p.run}`];
  if (p.exclusive) parts.push(`exclusive: "${p.exclusive}"`);
  if (p.odds) parts.push(`odds: {${Object.entries(p.odds).map(([k, v]) => `${/^\w+$/.test(k) ? k : `"${k}"`}: "${v}"`).join(', ')}}`);
  parts.push(`color: "${p.color}"`, `gradient: ["${p.gradient[0]}", "${p.gradient[1]}"]`);
  return `        {${parts.join(', ')}},`;
}

export async function readChecklist(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (fieldsandfloors.com set list helper)' } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return sections(toText(await res.text()));
}

export { sections, toText };

if (import.meta.url === `file://${process.argv[1]}`) {
  const [url, ...rest] = process.argv.slice(2);
  if (!url) { console.error('usage: node scripts/checklist-parallels.mjs <url> [section numbers] [--json]'); process.exit(1); }
  const secs = await readChecklist(url);
  const picks = rest.filter((a) => /^\d+$/.test(a)).map(Number);
  if (!picks.length) {
    secs.forEach((s, i) => console.log(`${String(i).padStart(3)}  ${s.heading}  (${s.parallels.length} parallels${s.odds ? `, odds ${s.odds}` : ''})`));
  } else {
    const ps = picks.flatMap((i) => secs[i].parallels);
    const numbered = ps.filter((p) => p.run).sort((a, b) => b.run - a.run);
    const unnumbered = ps.filter((p) => !p.run);
    if (rest.includes('--json')) console.log(JSON.stringify({ numbered, unnumbered }, null, 2));
    else console.log(`      numbered: [\n${numbered.map(js).join('\n')}\n      ],\n      unnumbered: [\n${unnumbered.map(js).join('\n')}\n      ],`);
  }
}
