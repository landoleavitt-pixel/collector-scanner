// lib/cardBrands.js
//
// Card companies and their popular product lines, for the "Card Company"
// filter. Matching runs on the listing title only, after the eBay fetch, so
// the filter never costs an extra eBay call.
//
// Filter shape (saved-search JSON, share links, poller):
//   filters.brands       ['topps', 'panini']           company keys
//   filters.brandLines   ['bowman-chrome', 'prizm']    line keys
//
// A title passes when it matches ANY selected line, or ANY selected company
// that has none of its own lines picked. Picking a line narrows its company;
// it never narrows a different company. Empty arrays = filter off.
//
// Ownership notes: Bowman and Topps Chrome are Topps products. Prizm, Select,
// Optic, Donruss etc. are Panini. Young Guns and O-Pee-Chee are Upper Deck.
//
// Panini reuses "Prizm" as a parallel name inside other products ("Select
// Silver Prizm"), so the Prizm line excludes those sibling products, the same
// way lib/parseSetFromTitle.js does.

const PANINI_SIBLINGS = /\b(select|optic|mosaic|chronicles|national\s+treasures|contenders|flawless|immaculate|obsidian|spectra|phoenix|donruss)\b/i;

export const CARD_COMPANIES = [
  {
    key: 'topps',
    label: 'Topps',
    q: ['Topps', 'Bowman'],
    // Topps-owned names. "Chrome" alone is left out: other brands use it.
    match: /\btopps\b|\bbowman\b|\bstadium\s+club\b|\ballen\s*(?:&|and)\s*ginter\b|\bgypsy\s+queen\b/i,
    lines: [
      { key: 'topps-chrome', label: 'Topps Chrome', q: ['Chrome'], match: /\btopps\s+(?:20\d{2}\s+)?chrome\b|\b20\d{2}\s+chrome\b/i, exclude: /\bbowman\b/i },
      { key: 'bowman', label: 'Bowman', q: ['Bowman'], match: /\bbowman\b/i },
      { key: 'bowman-chrome', label: 'Bowman Chrome', q: ['Bowman'], match: /\bbowman(?:'?s)?\s+(?:draft\s+)?chrome\b|\bbcp\b/i },
      { key: 'bowman-draft', label: 'Bowman Draft', q: ['Bowman'], match: /\bbowman\s+draft\b|\bbdc\b|\bbdp\b/i },
      { key: 'heritage', label: 'Heritage', q: ['Heritage'], match: /\bheritage\b/i },
      { key: 'stadium-club', label: 'Stadium Club', q: ['"Stadium Club"'], match: /\bstadium\s+club\b/i },
      { key: 'finest', label: 'Finest', q: ['Finest'], match: /\bfinest\b/i },
      { key: 'topps-update', label: 'Update', q: ['Topps'], match: /\btopps\b.*\bupdate\b|\bupdate\s+series\b|\bus\d{1,3}\b/i, exclude: /\bchrome\s+update\b/i },
    ],
  },
  {
    key: 'panini',
    label: 'Panini',
    q: ['Panini', 'Prizm', 'Donruss', 'Optic', 'Select', 'Mosaic'],
    match: /\bpanini\b|\bprizm\b|\bdonruss\b|\boptic\b|\bmosaic\b|\bnational\s+treasures\b|\bcontenders\b|\bflawless\b|\bimmaculate\b|\bobsidian\b|\bspectra\b|\bchronicles\b|\bpanini\s+select\b|\b20\d{2}(?:-\d{2})?\s+select\b|\bselect\s+(?:concourse|premier|field|courtside|club|mezzanine)\b|\b20\d{2}(?:-\d{2})?\s+(?:nba\s+)?hoops\b|\bnba\s+hoops\b|\b20\d{2}\s+score\b/i,
    lines: [
      { key: 'prizm', label: 'Prizm', q: ['Prizm'], match: /\bprizm\b/i, exclude: PANINI_SIBLINGS },
      { key: 'select', label: 'Select', q: ['Select'], match: /\bpanini\s+select\b|\b20\d{2}(?:-\d{2})?\s+select\b|\bselect\s+(?:concourse|premier|field|courtside|club|mezzanine)\b/i },
      { key: 'optic', label: 'Optic', q: ['Optic'], match: /\boptic\b/i },
      { key: 'mosaic', label: 'Mosaic', q: ['Mosaic'], match: /\bmosaic\b/i },
      { key: 'donruss', label: 'Donruss', q: ['Donruss'], match: /\bdonruss\b/i, exclude: /\boptic\b/i },
      { key: 'national-treasures', label: 'National Treasures', q: ['"National Treasures"'], match: /\bnational\s+treasures\b/i },
      { key: 'contenders', label: 'Contenders', q: ['Contenders'], match: /\bcontenders\b/i },
      { key: 'flawless', label: 'Flawless', q: ['Flawless'], match: /\bflawless\b/i },
    ],
  },
  {
    key: 'upper-deck',
    label: 'Upper Deck',
    q: ['"Upper Deck"', 'UD', '"Young Guns"', 'OPC'],
    match: /\bupper\s+deck\b|\bud\b|\byoung\s+guns?\b|\bsp\s+authentic\b|\bspx\b|\bo-?pee-?chee\b|\bopc\b|\bthe\s+cup\b|\bud\s+artifacts\b/i,
    lines: [
      { key: 'young-guns', label: 'Young Guns', q: ['"Young Guns"', 'YG'], match: /\byoung\s+guns?\b|\byg\b/i },
      { key: 'sp-authentic', label: 'SP Authentic', q: ['"SP Authentic"'], match: /\bsp\s+authentic\b/i },
      { key: 'artifacts', label: 'Artifacts', q: ['Artifacts'], match: /\bartifacts\b/i },
      { key: 'o-pee-chee', label: 'O-Pee-Chee', q: ['OPC', '"O-Pee-Chee"'], match: /\bo-?pee-?chee\b|\bopc\b/i },
      { key: 'the-cup', label: 'The Cup', q: ['"The Cup"'], match: /\bthe\s+cup\b|\bud\s+cup\b/i },
    ],
  },
  {
    key: 'leaf',
    label: 'Leaf',
    q: ['Leaf'],
    match: /\bleaf\b/i,
    lines: [],
  },
];

const COMPANY_BY_KEY = Object.fromEntries(CARD_COMPANIES.map((c) => [c.key, c]));
const LINE_BY_KEY = Object.fromEntries(
  CARD_COMPANIES.flatMap((c) => c.lines.map((l) => [l.key, { ...l, company: c.key }])),
);

/** Keep only keys we know. Inputs come from saved JSON and URLs. */
export function cleanBrandFilter(brands, brandLines) {
  const b = (Array.isArray(brands) ? brands : []).filter((k) => typeof k === 'string' && COMPANY_BY_KEY[k]);
  const companies = new Set(b);
  // A line only counts when its company is selected.
  const l = (Array.isArray(brandLines) ? brandLines : []).filter(
    (k) => typeof k === 'string' && LINE_BY_KEY[k] && companies.has(LINE_BY_KEY[k].company),
  );
  return { brands: [...new Set(b)], brandLines: [...new Set(l)] };
}

function lineMatches(line, title) {
  return line.match.test(title) && !(line.exclude && line.exclude.test(title));
}

/**
 * Build a title test for the selected companies/lines, or null when the
 * filter is off.
 */
export function makeBrandMatcher(brands, brandLines) {
  const { brands: b, brandLines: l } = cleanBrandFilter(brands, brandLines);
  if (b.length === 0) return null;
  const lines = l.map((k) => LINE_BY_KEY[k]);
  const narrowed = new Set(lines.map((x) => x.company));
  const wholeCompanies = b.filter((k) => !narrowed.has(k)).map((k) => COMPANY_BY_KEY[k]);
  return (title) => {
    if (!title) return false;
    if (lines.some((line) => lineMatches(line, title))) return true;
    return wholeCompanies.some((c) => c.match.test(title));
  };
}

/**
 * eBay keyword OR group covering the selection, e.g. ("Topps", "Bowman"),
 * or '' when the filter is off. Only plain words/quoted phrases from the
 * table above ever reach eBay, never user input.
 */
export function brandQueryTerms(brands, brandLines) {
  const { brands: b, brandLines: l } = cleanBrandFilter(brands, brandLines);
  if (b.length === 0) return '';
  const narrowed = new Set(l.map((k) => LINE_BY_KEY[k].company));
  const terms = [
    ...l.flatMap((k) => LINE_BY_KEY[k].q),
    ...b.filter((k) => !narrowed.has(k)).flatMap((k) => COMPANY_BY_KEY[k].q),
  ];
  const unique = [...new Set(terms)];
  return unique.length === 1 ? unique[0] : `(${unique.join(', ')})`;
}

/** Short labels for chips/emails: ["Topps · Bowman Chrome", "Panini"]. */
export function brandFilterLabels(brands, brandLines) {
  const { brands: b, brandLines: l } = cleanBrandFilter(brands, brandLines);
  return b.map((k) => {
    const c = COMPANY_BY_KEY[k];
    const picked = c.lines.filter((x) => l.includes(x.key)).map((x) => x.label);
    return picked.length ? `${c.label} · ${picked.join(', ')}` : c.label;
  });
}
