// lib/tcg/games.js
//
// The five launch games for Foils & Fables, the card-game side of the site.
// Source: research/non-sports-filters.md, section 4.
//
// eBay has no per-game categories. Every card-game single (raw and graded)
// sits in category 183454, and the game is the "Game" item specific, which
// sellers fill in on nearly every listing. We filter on it with aspect_filter.

export const TCG_SINGLES_CATEGORY = '183454';

// Sibling categories that hold lots and sealed product. Searching 183454
// already leaves them out; results are also checked against this list in
// case eBay ever files one under singles.
export const EXCLUDED_CATEGORIES = [
  '183455', // mixed lots
  '183456', // sealed packs
  '261044', // sealed boxes
  '261045', // sealed cases
];

// eBay condition ids for card singles: graded vs ungraded is required.
export const CONDITION_GRADED = '2750';
export const CONDITION_RAW = '4000';

// key: our id. label: plain text shown in filters (no logos, see DECISIONS.md).
// aspect: eBay's exact "Game" value. title: how a title names the game.
// codes: set codes that only this game uses (title backup when the name is missing).
export const GAMES = [
  {
    key: 'pokemon',
    label: 'Pokémon',
    aspect: 'Pokémon TCG',
    title: /\bpok[eé]mon\b|\bpkmn\b|\bptcg\b/i,
    codes: /\b(?:swsh|svp|mep)\s?\d{2,3}\b|\bsv\d{1,2}[a-z]?\b|\bbw\d-[a-z]\b|\bbw-p\b|\bclash\s+of\s+the\s+blue\s+sky\b|\bgold\s+star\b/i,
    // Famous card names, for titles that leave the game out (QA 2026-11-01).
    names: /\b(?:charizard|pikachu|umbreon|rayquaza|mewtwo|lugia|blastoise|venusaur|gengar|espeon|sylveon|gardevoir|greninja|eevee|snorlax|dragonite)\b/i,
  },
  {
    key: 'mtg',
    label: 'Magic: The Gathering',
    aspect: 'Magic: The Gathering',
    title: /\bmtg\b|\bmagic:?\s+the\s+gathering\b/i,
    codes: null,
    names: /\b(?:black\s+lotus|sol\s+ring|mox\s+(?:pearl|sapphire|jet|ruby|emerald)|ragavan|the\s+one\s+ring|mana\s+crypt|time\s+walk|ancestral\s+recall|timetwister|underground\s+sea|gaea'?s\s+cradle|jace,?\s+the\s+mind\s+sculptor)\b/i,
  },
  {
    key: 'yugioh',
    label: 'Yu-Gi-Oh!',
    aspect: 'Yu-Gi-Oh! TCG',
    title: /\byu-?gi-?oh!?|\bygo\b|\bkonami\b/i,
    // "LOB-EN001", "RA03-EN052", "MP24-JP010", and the early sets that had
    // no region letters ("LOB-001", "MRD-060", "SDK-001")
    codes: /\b[A-Z0-9]{2,4}-(?:EN|JP|DE|FR|IT|SP|PT|KR|AE)\d{3}\b|\b(?:LOB|MRD|SDK)-\d{3}\b|\b(?:MFC|DDM|LOB|MRD|PSV|LON|LOD|PGD|SDK|SDY|JMP|DDS)\b/i,
    names: /\b(?:dark\s+magician|blue-?eyes\s+white\s+dragon|exodia|red-?eyes\s+black\s+dragon)\b/i,
  },
  {
    key: 'onepiece',
    label: 'One Piece',
    aspect: 'One Piece CCG',
    title: /\bone\s+piece\b/i,
    // "OP05-119", "ST01-001", "EB01-006", "PRB01-001", or just "OP09"
    codes: /\b(?:OP|ST|EB|PRB)\d{2}-\d{3}\b|\bOP\d{2}\b/i,
    names: /\b(?:monkey\.?\s*d\.?\s*luffy|roronoa\s+zoro|shanks|nico\s+robin|portgas)\b/i,
  },
  {
    key: 'lorcana',
    label: 'Disney Lorcana',
    aspect: 'Disney Lorcana TCG',
    title: /\blorcana\b/i,
    codes: null,
    names: null,
  },
];

export const GAME_KEYS = GAMES.map((g) => g.key);
export const gameByKey = (key) => GAMES.find((g) => g.key === key) || null;
