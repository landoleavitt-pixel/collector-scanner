// lib/listingFilter.js
//
// Shared rules for sports listing titles, used by the search page, the
// featured and rarest routes and the live-for-you route:
//   detectPrintRun(title)  the print run in a title ("/25", "1 of 1,060"), or null
//   isNonCard(title)       customs, displays, frames, reprints, proofs and other
//                          non-card items: dropped from featured and results
//   hasAutoText(title)     an autograph title; "Unsigned" and "non-auto" are not

export const SEALED_PRODUCT = /\bsealed\s+(?:\w+\s+){0,2}(?:pack|packs|box|boxes|case|blaster|hanger|mega)\b|\b(?:mystery|repack|re-pack)\b|\bhobby\s+box\b/;
// "1/1 possible", "chance at a 1/1", "1/1 hit": a chase, not this card's run.
// Only words right next to the 1/1 count, so "Case hit SuperFractor 1/1" stays a 1/1.
function chaseAround(t, index) {
  const before = t.slice(Math.max(0, index - 14), index + 1);
  const after = t.slice(index, index + 22);
  return /\b(possible|chance|chances|look\s+for|odds)\b/.test(before)
    || /1\s*\/\s*1\W*(possible|chance|chances|hits?|odds)\b/.test(after);
}

/**
 * Extract a print run number from a listing title, OR return null if no real
 * print run is present. Mirrors the server-side verifyPrintRun logic but
 * without a target — we're looking for ANY print run that appears.
 *
 * Rejects false-positive patterns:
 *   - Season years: "2024-25", "2024/25"
 *   - Dates: "5/25/2024"
 *   - Inventory counts: "+New 12/12", "(+NEW 2/02)"
 *   - Card numbers: "Card #25" (just a number, no /)
 */
export function detectPrintRun(rawTitle) {
  if (!rawTitle) return null;
  const t = rawTitle.toLowerCase();
  // Sealed packs, boxes and repacks aren't one card: "1/1 possible" there
  // is a chase, not this card's print run.
  if (SEALED_PRODUCT.test(t)) return null;

  // Find all candidate print-run patterns
  const candidates = [];
  const reSlash = /(?:^|[^0-9a-z])\/\s*(\d{1,4})\b/g;       // "/N" not preceded by digit/letter
  const reHash = /#\s*\d+\s*\/\s*(\d{1,4})\b/g;              // "#5/25"
  // "N/M" — bare format like "2/10", "5/25". Captures BOTH numbers so we can
  // verify N < M (real print run) and not return inventory like "12/12".
  const reBare = /(?:^|[^0-9a-z])(?!0)(\d{1,4})\s*\/\s*(\d{1,4})\b/g;
  const reOf = /\b\d+\s+of\s+(\d{1,3}(?:,\d{3})+|\d{1,4})(?![\d,])/g;
  const reTo = /\b(?:numbered|limited|serial)\s+to\s+(\d{1,4})\b/g;
  // Not when a slash follows: "SSP 11/25" is serial 11 of 25, not a /11.
  const reNumbered = /\b(?:numbered|limited|serial|ssp|sp)\s+(\d{1,4})\b(?!\s*\/)/g;

  let m;
  // Patterns where the captured group IS the print run (the second number in /N).
  for (const re of [reSlash, reHash, reOf, reTo, reNumbered]) {
    re.lastIndex = 0;
    while ((m = re.exec(t)) !== null) {
      candidates.push({ value: m[1].replace(/,/g, ''), index: m.index, firstNum: null });
    }
  }
  // Bare N/M pattern — needs special handling: only count if N < M.
  reBare.lastIndex = 0;
  while ((m = reBare.exec(t)) !== null) {
    const firstNum = parseInt(m[1], 10);
    const secondNum = parseInt(m[2], 10);
    const isOneOfOne = firstNum === 1 && secondNum === 1;
    // N === M is the last copy ("25/25"); rank it behind the clearer forms.
    if (firstNum < secondNum || isOneOfOne) {
      candidates.push({ value: m[2], index: m.index, firstNum, rank: isOneOfOne ? 2 : 0 });
    } else if (firstNum === secondNum) {
      candidates.push({ value: m[2], index: m.index, firstNum, rank: 1 });
    }
  }

  if (candidates.length === 0) return null;
  // A "1/1" phrase ("eBay 1/1 color match") loses to any real serial.
  candidates.sort((a, b) => (a.rank || 0) - (b.rank || 0));

  // Guards against misreading non-print-run numbers.
  const seasonAround = /(19|20)\d{2}[-/\s]\d{1,4}/;   // 4-digit season: 2023-24, 2022/23
  const dateAround = /\b\d{1,2}\/\d{1,4}\/\d{2,4}\b/;  // dates
  const inventoryAround = /\bnew\s+\d{1,2}\/\d{1,2}\b/;

  // Two-digit season detection (e.g. "22/23", "24/25"). These look exactly
  // like real serial numbers (24/25 is also a valid /25 print run), so the
  // distinguishing signal is POSITION: sellers put the season at the START of
  // the title ("22/23 Bowman Chrome ...") and the serial number LATER, near
  // the parallel/grade ("... Gold 24/25 PSA 10"). So we only treat a
  // consecutive 2-digit N/M as a season when it appears in the first ~30% of
  // the title. Later in the title, the same pattern is a real print run.
  const titleLen = t.length || 1;
  function looksLikeEarlySeason(c) {
    if (c.firstNum == null) return false;           // only applies to bare N/M
    const n = c.firstNum;
    const m = parseInt(c.value, 10);
    const consecutive = m === n + 1;
    const inSeasonRange = n >= 15 && n <= 30 && m >= 15 && m <= 31;
    const positionFrac = c.index / titleLen;
    return consecutive && inSeasonRange && positionFrac < 0.30;
  }

  for (const c of candidates) {
    if (c.value === "1" && chaseAround(t, c.index)) continue;
    const window = t.slice(Math.max(0, c.index - 14), c.index + 8);
    if (seasonAround.test(window)) continue;
    if (dateAround.test(window)) continue;
    if (inventoryAround.test(window)) continue;
    if (looksLikeEarlySeason(c)) continue;          // 2-digit season at title start
    return c.value;
  }
  return null;
}

/** Customs, displays, frames, reprints, proofs and RP items are not cards. */
const NON_CARD = /\b(customs?|customi[sz]ed|displays?|dispay|framed|frames?|framing|shadow\s*box|acrylic|reprints?|replicas?|rp|proofs?|pre-?production|mock-?ups?|bootlegs?|unofficial|fan\s*made|art\s+cards?|art\s+prints?|collages?|plaques?|magnets?|keychains?|stickers?|posters?)\b|\bpatch\s*lab\b|\bbuilt\s+by\b/i;
export function isNonCard(title) {
  return NON_CARD.test(String(title || ''));
}

/** An autograph title. "Unsigned" and "non-auto" don't count. */
export function hasAutoText(title) {
  const t = String(title || '');
  if (/\bun-?signed\b|\bnon-?auto\b|\bnot\s+auto(?:graphed)?\b/i.test(t)) return false;
  return /\b(auto|autos|autograph|autographs|autographed|signed)\b/i.test(t);
}

