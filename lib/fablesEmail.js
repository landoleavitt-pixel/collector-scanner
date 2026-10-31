// lib/fablesEmail.js
//
// The "hunt confirmed" email for Foils & Fables (card-game) saved searches.
// Same message as the sports one in app/api/saved-searches/route.js, in the
// Night foil look, with a card-game filter summary and links to /fables. The
// alert poller's emails (supabase/functions/poller/emails.ts) use the same
// colours; keep the two in step.

import { gameByKey } from './tcg/games';
import { rungOf } from './tcg/ladders';
import { LANGUAGES, NO_MAX_PRICE } from './tcg/search';

const NIGHT = {
  bg: '#080a12',
  panel: '#10131f',
  line: '#242a3d',
  ink100: '#eef0f7',
  ink200: '#d5d9e8',
  ink400: '#9198b0',
  ink600: '#5d6480',
  accent: '#8fd3e8',
  bright: '#b9e6f2',
  onAccent: '#071018',
  foil: 'linear-gradient(100deg,#9fe3f5 0%,#b6a8f0 28%,#f0b3d0 52%,#f3d9a0 76%,#9fe3f5 100%)',
  display: "Fraunces,Georgia,'Times New Roman',serif",
  body: 'system-ui,-apple-system,Segoe UI,sans-serif',
};

export const FABLES_SENDER = 'Foils & Fables <alerts@fieldsandfloors.com>';

// Saved filters arrive as a value or a list ("pokemon" or ["pokemon"], "10" or [10]).
const list = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : String(v).split(','))
  .map((x) => String(x).trim())
  .filter(Boolean);

/**
 * One plain line describing card-game filters, e.g.
 * "Pokémon · Special Illustration Rare · English · PSA 10 · 1st Edition · Under $500".
 */
export function summarizeFablesFilters(filters = {}) {
  const parts = [];
  const games = list(filters.game);
  const gameLabels = games.map((g) => gameByKey(g)?.label).filter(Boolean);
  if (gameLabels.length) parts.push(gameLabels.join(', '));

  // Rarity keys are plain ("sir") or game-prefixed ("pokemon:sir").
  const rarities = list(filters.rarity).map((r) => {
    const [g, k] = r.includes(':') ? r.split(':') : [null, r];
    for (const game of g ? [g] : games.length ? games : ['pokemon', 'mtg', 'yugioh', 'onepiece', 'lorcana']) {
      const rung = rungOf(game, k);
      if (rung) return rung.label;
    }
    return null;
  }).filter(Boolean);
  if (rarities.length) parts.push([...new Set(rarities)].join(', '));

  const langs = list(filters.lang).map((l) => LANGUAGES.find((x) => x.key === l)?.label).filter(Boolean);
  if (langs.length && langs.length < LANGUAGES.length) parts.push(langs.join(', '));

  const graders = list(filters.grader).map((g) => g.toUpperCase());
  const grades = list(filters.grade);
  if (graders.length || grades.length) {
    parts.push(`${graders.length ? graders.join(' or ') : 'Graded'}${grades.length ? ` ${grades.join(' or ')}` : ''}`);
  } else if (filters.graded === 'graded') {
    parts.push('Graded only');
  } else if (filters.graded === 'raw') {
    parts.push('Ungraded only');
  }

  if (filters.firstEd === true || filters.firstEd === '1') parts.push('1st Edition');
  if (filters.serialOnly === true || filters.serialOnly === '1') parts.push('Serial numbered only');
  if (filters.listing === 'auction') parts.push('Auctions only');
  else if (filters.listing === 'bin') parts.push('Buy It Now only');

  const min = Number(filters.priceMin);
  const max = Number(filters.priceMax);
  const hasMax = Number.isFinite(max) && max > 0 && max < NO_MAX_PRICE;
  if (Number.isFinite(min) && min > 0 && hasMax) parts.push(`$${min}–$${max}`);
  else if (hasMax) parts.push(`Under $${max}`);
  else if (Number.isFinite(min) && min > 0) parts.push(`$${min} and up`);

  return parts.join(' · ');
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Subject and HTML for a card-game "hunt confirmed" email. */
export function buildFablesConfirmation(savedSearch, filters, siteUrl) {
  const fablesUrl = `${siteUrl}/fables`;
  const filterLine = summarizeFablesFilters(filters);
  const alertsOn = savedSearch.notify_enabled !== false;
  const statusLine = alertsOn
    ? "We're scanning new eBay listings around the clock. The moment a match lists, it lands in your inbox."
    : 'Alerts are currently off for this search. Flip them on from your watchlist any time to hear the moment a match lists.';

  const html = `
  <div style="background:${NIGHT.bg};padding:32px 16px;font-family:${NIGHT.body};">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr><td style="padding-bottom:22px;">
        <div style="height:2px;background:${NIGHT.accent};background-image:${NIGHT.foil};border-radius:2px;"></div>
      </td></tr>
      <tr><td style="text-align:center;padding-bottom:6px;">
        <a href="${fablesUrl}" style="font-family:${NIGHT.display};font-size:24px;color:${NIGHT.ink100};text-decoration:none;">Foils &amp; Fables</a>
      </td></tr>
      <tr><td style="text-align:center;padding-bottom:24px;">
        <span style="font-size:12px;color:${NIGHT.ink400};">Hunt confirmed</span>
      </td></tr>
      <tr><td style="border-top:0.5px solid ${NIGHT.line};padding-top:24px;">
        <div style="font-family:${NIGHT.display};font-size:22px;color:${NIGHT.ink100};">${escapeHtml(savedSearch.name)}</div>
        ${filterLine ? `<div style="font-size:13px;color:${NIGHT.ink400};margin-top:8px;">${escapeHtml(filterLine)}</div>` : ''}
        <div style="font-size:14px;color:${NIGHT.ink200};line-height:1.6;margin-top:18px;">${statusLine}</div>
      </td></tr>
      <tr><td style="padding-top:26px;text-align:center;">
        <a href="${fablesUrl}" style="display:inline-block;background:${NIGHT.bright};color:${NIGHT.onAccent};text-decoration:none;font-size:14px;font-weight:600;padding:13px 26px;border-radius:999px;">View your hunts</a>
      </td></tr>
      <tr><td style="padding-top:28px;text-align:center;font-size:12px;color:${NIGHT.ink600};line-height:1.6;">
        <a href="${siteUrl}/watchlist" style="color:${NIGHT.ink400};text-decoration:underline;">Manage your saved searches</a><br>
        Not affiliated with eBay or any game publisher.
      </td></tr>
    </table>
  </div>`;

  return { subject: `Hunt confirmed: ${savedSearch.name}`, html };
}
