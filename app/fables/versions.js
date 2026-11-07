// Card-family data shared by the checklist and the versions-first search:
// every version of a family from the catalog (/api/tcg-versions), what's for
// sale from one family search (/api/tcg-family-search), and plain version names.

// A word that names hundreds of cards ("Dragon") isn't one card's family.
export const FAMILY_MAX = 60;

// Plain names for versions (Landon: no collector jargon).
function plainPokemonLabel(v) {
  const l = (v.label || '').toLowerCase();
  if (l.includes('reverse')) return 'Shiny frame';
  if (v.firstEdition || l.includes('1st edition')) return v.finish === 'holo' || l.includes('holo') ? 'First print, shiny' : 'First print';
  if (l.includes('holo')) return 'Shiny';
  if (l === 'normal') return 'Regular';
  return v.label || 'Regular';
}
// Magic's labels list finish and treatments: "Foil · Borderless · Surge foil"
// → "Surge shiny, no border".
const MTG_WORDS = { Borderless: 'no border', 'Extended art': 'wide art', Showcase: 'special art', 'Full art': 'full art', 'Retro frame': 'old-style frame', Serialized: 'numbered', qya: 'Elvish' };
function plainMtgLabel(v) {
  const [finish, ...tags] = String(v.label || 'Nonfoil').split(' · ');
  let base = /etched/i.test(finish) ? 'Etched shiny' : /^foil/i.test(finish) ? 'Shiny' : 'Regular';
  const rest = [];
  for (const t of tags) {
    if (/ foil$/i.test(t) && base === 'Shiny') base = `${t.replace(/ foil$/i, '')} shiny`;
    else rest.push(MTG_WORDS[t] || t);
  }
  return [base, ...rest].join(', ');
}
export const versionLabel = (game, v) => (game === 'mtg' ? plainMtgLabel(v) : plainPokemonLabel(v));

/** A different size of an eBay photo. */
export const sized = (url, n) => (url ? url.replace(/\/s-l\d+\.(\w+)/, `/s-l${n}.$1`) : url);

/**
 * Every version of a family, newest set first, card order within a set.
 * → { rows: [{ id, set, setName, released, total, number, cardKey, cardName, versions }], source, familySize }
 */
export async function loadFamily(game, name) {
  const found = await fetch(`/api/tcg-versions?game=${game}&q=${encodeURIComponent(name)}&family=1`).then((r) => r.json());
  const all = found.cards || [];
  const lists = await Promise.all(all.slice(0, FAMILY_MAX).map((c) => fetch(`/api/tcg-versions?game=${game}&card=${encodeURIComponent(c.key)}`)
    .then((r) => (r.ok ? r.json() : null)).catch(() => null)));
  const rows = [];
  let source = '';
  for (const body of lists) {
    if (!body?.sets) continue;
    if (body.source?.note) source = body.source.note;
    for (const s of body.sets) {
      for (const n of s.numbers) {
        rows.push({
          id: `${body.card.key}|${s.set}|${n.number}`,
          set: s.set, setName: s.name, released: s.released || '', total: s.total,
          number: n.number, cardKey: body.card.key, cardName: body.card.name, versions: n.versions,
        });
      }
    }
  }
  rows.sort((a, b) => b.released.localeCompare(a.released) || a.set.localeCompare(b.set)
    || (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0) || String(a.number).localeCompare(String(b.number)));
  return { rows, source, familySize: all.length };
}

export const familyKeys = (rows) => [...new Set((rows || []).map((r) => r.cardKey))];

/**
 * One live search for the whole family (cached 15 minutes on the server). Each
 * listing is pinned to its catalog printing where the title allows.
 * → { photos: { rowId: url }, counts: { `${cardKey}|${versionKey}`: n }, total,
 *     hidden, capped, pinned } or null if the search failed. `hidden`: listings
 * thrown out as not this card. `pinned`: listings pinned to exactly one version.
 */
export async function loadFamilyListings(game, name, rows) {
  const cardOf = {};
  for (const r of rows) for (const v of r.versions) cardOf[v.key] = r.cardKey;
  const params = new URLSearchParams({ game, cards: familyKeys(rows).join(','), q: name, lang: 'en', limit: '1000', unsure: 'show' });
  const d = await fetch(`/api/tcg-family-search?${params}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!d) return null;
  const photos = {};
  const counts = {};
  let pinned = 0;
  for (const [v, n] of Object.entries(d.counts || {})) {
    if (cardOf[v]) { counts[`${cardOf[v]}|${v}`] = n; pinned += n; }
  }
  for (const it of d.items || []) {
    const c = it.catalog;
    if (!c || !it.image) continue;
    const id = `${c.card}|${c.set}|${c.number}`;
    if (!photos[id]) photos[id] = it.image;
  }
  return { photos, counts, total: d.total || 0, hidden: d.kinds?.reject || 0, capped: !!d.capped, pinned };
}

/** One saved search for the whole family: one alert, skipping versions the member has. */
export async function saveFamilyAlert(game, title, rows) {
  const r = await fetch('/api/saved-searches', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `${title} cards`, query: title, notify_enabled: true, side: 'fables',
      filters: { game, cards: familyKeys(rows).slice(0, 100), needOnly: true, lang: ['en'] },
    }),
  }).catch(() => null);
  const d = r ? await r.json().catch(() => ({})) : {};
  if (r && r.ok) return d.watchLimited ? 'Saved, but your 5 alerts are in use. Pause one in Saved searches to turn this on.' : 'on';
  return d.error || 'That didn’t work. Try again.';
}
