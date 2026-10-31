// Foils & Fables data access for the UI.
//
// Calls the engine's GET /api/tcg-meta and GET /api/tcg-search. Until those
// routes exist (or if they fail), it falls back to the small STUB below so
// the pages still render. The stub follows the agreed contract exactly, so
// nothing in the UI changes when the real API lands.

export const SIDE = 'fables';

export const STUB_META = {
  games: [
    { key: 'pokemon', label: 'Pokémon' },
    { key: 'mtg', label: 'Magic: The Gathering' },
    { key: 'yugioh', label: 'Yu-Gi-Oh!' },
    { key: 'onepiece', label: 'One Piece' },
    { key: 'lorcana', label: 'Disney Lorcana' },
  ],
  ladders: {
    pokemon: [
      { key: 'mhr', label: 'Mega Hyper Rare', tier: 'grail' },
      { key: 'hr', label: 'Hyper Rare', tier: 'grail' },
      { key: 'sir', label: 'Special Illustration Rare', tier: 'grail' },
      { key: 'ir', label: 'Illustration Rare', tier: 'ultra' },
      { key: 'ur', label: 'Ultra Rare', tier: 'ultra' },
      { key: 'dr', label: 'Double Rare', tier: 'rare' },
      { key: 'r', label: 'Rare', tier: 'scarce' },
    ],
    mtg: [
      { key: 'serial', label: 'Serialized', tier: 'grail' },
      { key: 'reserved', label: 'Reserved List', tier: 'grail' },
      { key: 'specialfoil', label: 'Special foil', tier: 'ultra' },
      { key: 'mythic', label: 'Mythic', tier: 'rare' },
      { key: 'rare', label: 'Rare', tier: 'scarce' },
    ],
    yugioh: [
      { key: 'starlight', label: 'Starlight Rare', tier: 'grail' },
      { key: 'qcsr', label: 'Quarter Century Secret', tier: 'grail' },
      { key: 'ghost', label: 'Ghost Rare', tier: 'ultra' },
      { key: 'collectors', label: "Collector's Rare", tier: 'ultra' },
      { key: 'secret', label: 'Secret Rare', tier: 'rare' },
      { key: 'ultra', label: 'Ultra Rare', tier: 'scarce' },
    ],
    onepiece: [
      { key: 'manga', label: 'Manga Rare', tier: 'grail' },
      { key: 'tr', label: 'Treasure Rare', tier: 'ultra' },
      { key: 'sec', label: 'Secret Rare', tier: 'rare' },
      { key: 'sr', label: 'Super Rare', tier: 'scarce' },
    ],
    lorcana: [
      { key: 'iconic', label: 'Iconic', tier: 'grail' },
      { key: 'enchanted', label: 'Enchanted', tier: 'grail' },
      { key: 'epic', label: 'Epic', tier: 'ultra' },
      { key: 'legendary', label: 'Legendary', tier: 'rare' },
      { key: 'superrare', label: 'Super Rare', tier: 'scarce' },
    ],
  },
  languages: [
    { key: 'en', label: 'English' },
    { key: 'ja', label: 'Japanese' },
    { key: 'zh', label: 'Chinese' },
    { key: 'ko', label: 'Korean' },
    { key: 'other', label: 'Other' },
  ],
  graders: ['PSA', 'CGC', 'BGS', 'TAG', 'SGC'],
};

const STUB_ITEMS = [
  ['Charizard ex Special Illustration Rare 199/165 PSA 10', 1450, 'pokemon', 'Special Illustration Rare', 'grail', null, 'PSA 10', 'English', false],
  ['The One Ring serialized 001/001', 98000, 'mtg', 'Serialized', 'grail', 1, null, 'English', false],
  ['Blue-Eyes White Dragon Starlight Rare 1st Edition', 2100, 'yugioh', 'Starlight Rare', 'grail', null, 'PSA 9', 'English', true],
  ['Monkey D. Luffy Manga Rare OP05 Japanese', 890, 'onepiece', 'Manga Rare', 'grail', null, null, 'Japanese', false],
  ['Elsa Enchanted foil, Rise of the Floodborn', 640, 'lorcana', 'Enchanted', 'grail', null, 'CGC 9.5', 'English', false],
  ['Umbreon VMAX alternate art, Evolving Skies', 1180, 'pokemon', 'Illustration Rare', 'ultra', null, null, 'English', false],
  ['Sheoldred borderless textured foil', 310, 'mtg', 'Special foil', 'ultra', null, null, 'English', false],
  ['Dark Magician Girl Quarter Century Secret', 420, 'yugioh', 'Quarter Century Secret', 'grail', null, 'PSA 10', 'English', false],
].map(([title, price, game, rarity, tier, serial, grade, language, firstEdition], i) => ({
  id: `stub-${i}`, title, price, currency: 'USD', image: null, url: 'https://www.ebay.com',
  endTime: i % 3 === 0 ? new Date(Date.now() + (i + 3) * 3600e3).toISOString() : null,
  buyingOptions: i % 3 === 0 ? ['AUCTION'] : ['FIXED_PRICE'], bidCount: i % 3 === 0 ? 4 + i : null,
  game, rarity, tier,
  serial: serial ? { n: 1, of: serial } : null,
  grade: grade ? { grader: grade.split(' ')[0], grade: grade.split(' ')[1] } : null,
  gradeLabel: grade, graded: !!grade,
  language: language === 'Japanese' ? 'ja' : 'en', firstEdition,
}));

export async function fetchMeta() {
  try {
    const r = await fetch('/api/tcg-meta');
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    if (!d?.games?.length) throw new Error('empty');
    return d;
  } catch {
    return STUB_META;
  }
}

// filters → query string, using the agreed parameter names.
export function toParams(q, f = {}, extra = {}) {
  const p = new URLSearchParams();
  if (q) p.set('q', q);
  if (f.game) p.set('game', f.game);
  if (f.rarity?.length) p.set('rarity', f.rarity.join(','));
  if (f.lang?.length) p.set('lang', f.lang.join(','));
  if (f.graded && f.graded !== 'any') p.set('graded', f.graded);
  if (f.grader) p.set('grader', f.grader);
  if (f.grade) p.set('grade', f.grade);
  if (f.firstEd) p.set('firstEd', '1');
  if (f.serialOnly) p.set('serialOnly', '1');
  if (f.priceMin) p.set('priceMin', String(f.priceMin));
  if (f.priceMax && f.priceMax < 100000) p.set('priceMax', String(f.priceMax));
  if (f.sort && f.sort !== 'rarest') p.set('sort', f.sort);
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
  return p;
}

// Display helpers for engine fields.
export const LANG_LABEL = { en: 'English', ja: 'Japanese', zh: 'Chinese', ko: 'Korean', other: 'Other language' };
export const serialOf = (item) => (item?.serial ? (typeof item.serial === 'object' ? item.serial.of : item.serial) : null);
export const gradeText = (item) => item?.gradeLabel || (typeof item?.grade === 'string' ? item.grade : (item?.grade ? `${item.grade.grader} ${item.grade.grade}` : null));

export function fromParams(sp) {
  const list = (k) => (sp.get(k) ? sp.get(k).split(',').filter(Boolean) : []);
  return {
    q: sp.get('q') || '',
    filters: {
      game: sp.get('game') || '',
      rarity: list('rarity'),
      lang: list('lang'),
      graded: sp.get('graded') || 'any',
      grader: sp.get('grader') || '',
      grade: sp.get('grade') || '',
      firstEd: sp.get('firstEd') === '1',
      serialOnly: sp.get('serialOnly') === '1',
      priceMin: Number(sp.get('priceMin')) || 0,
      priceMax: Number(sp.get('priceMax')) || 100000,
      sort: sp.get('sort') || 'rarest',
    },
  };
}

export async function searchCards(q, filters, offset = 0) {
  try {
    const r = await fetch(`/api/tcg-search?${toParams(q, filters, offset ? { offset } : {})}`);
    if (r.status === 404) throw new Error('no route');
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      return { items: [], total: 0, error: d.error || 'Search failed. Try again.' };
    }
    const d = await r.json();
    return { items: d.items || [], total: d.total ?? (d.items || []).length, nextOffset: d.nextOffset ?? null };
  } catch {
    // Engine not live yet: filter the stub so the UI can be exercised.
    const words = (q || '').toLowerCase().split(/\s+/).filter(Boolean);
    const items = STUB_ITEMS.filter((it) =>
      (!filters.game || it.game === filters.game) &&
      words.every((w) => it.title.toLowerCase().includes(w) || it.game.includes(w)));
    return { items, total: items.length, nextOffset: null, stub: true };
  }
}
