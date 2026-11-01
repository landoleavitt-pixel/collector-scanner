// lib/huntConfirmedEmail.js
//
// The one-time "hunt confirmed" email for Fields & Floors (sports) saved
// searches, sent by app/api/saved-searches/route.js. The card-game version
// is lib/fablesEmail.js. Everything that came from a user or a filter goes
// through escapeHtml.

import { brandFilterLabels } from './cardBrands';
import { teamFilterLabels } from './teams';

export const SPORTS_SENDER = 'Fields & Floors <alerts@fieldsandfloors.com>';

// Build a compact, human-readable one-line summary of the search's filters.
// Deliberately plain text (not chip markup) — a wall of badges reads badly
// in email; a quiet summary line confirms the setup without shouting.
export function summarizeFilters(filters) {
  const parts = [];
  const runs = [
    ...(Array.isArray(filters.selectedPrintRuns) ? filters.selectedPrintRuns : []),
    ...(Array.isArray(filters.customPrintRuns) ? filters.customPrintRuns : []),
  ].filter((r) => typeof r === 'string' && /^\/\d{1,5}$/.test(r));
  if (runs.length > 0) {
    const sorted = [...new Set(runs)].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    parts.push(`Print runs ${sorted.join(', ')}`);
  }
  if (filters.autoCards) parts.push('Autograph');
  if (filters.rookieCards) parts.push('Rookie');
  if (typeof filters.condition === 'string' && filters.condition !== 'any' && filters.condition) {
    parts.push(filters.condition.charAt(0).toUpperCase() + filters.condition.slice(1));
  }
  if (filters.listingType === 'auction') parts.push('Auctions only');
  else if (filters.listingType === 'fixed') parts.push('Buy It Now only');
  parts.push(...brandFilterLabels(filters.brands, filters.brandLines));
  parts.push(...teamFilterLabels(filters.teams));
  const min = Number(filters.priceMin);
  const max = Number(filters.priceMax);
  if (Number.isFinite(min) && min > 0 && Number.isFinite(max) && max > 0) {
    parts.push(`$${min}–$${max}`);
  } else if (Number.isFinite(max) && max > 0 && max !== 5000) {
    parts.push(`Under $${max}`);
  }
  return parts.join(' · ');
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// Visual shell matches the poller's alert emails (dark, Georgia italic
// gold) so the confirmation and the eventual alerts feel like one system.
export function buildSportsConfirmation(savedSearch, filters, siteUrl) {
  const filterLine = summarizeFilters(filters);
  const alertsOn = savedSearch.notify_enabled !== false;

  const statusLine = alertsOn
    ? `We're scanning new eBay listings around the clock. The moment a match lists, it lands in your inbox.`
    : `Alerts are currently off for this search — flip them on from your watchlist any time to hear the moment a match lists.`;

  const html = `
  <div style="background:#0f0c0a;padding:32px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr><td style="text-align:center;padding-bottom:6px;">
        <span style="font-family:Georgia,serif;font-style:italic;font-size:24px;color:#d4af5c;">Fields &amp; Floors</span>
      </td></tr>
      <tr><td style="text-align:center;padding-bottom:24px;">
        <span style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#6e675b;">Hunt confirmed</span>
      </td></tr>
      <tr><td style="border-top:0.5px solid rgba(232,226,213,0.1);padding-top:24px;">
        <div style="font-family:Georgia,serif;font-style:italic;font-size:22px;color:#e8e2d5;">${escapeHtml(savedSearch.name)}</div>
        ${filterLine ? `<div style="font-size:12px;color:#a99e85;margin-top:8px;letter-spacing:0.02em;">${escapeHtml(filterLine)}</div>` : ''}
        <div style="font-size:13px;color:#d9d2bf;line-height:1.6;margin-top:18px;">${statusLine}</div>
      </td></tr>
      <tr><td style="padding-top:26px;text-align:center;">
        <a href="${siteUrl}/watchlist" style="display:inline-block;background:#c9954a;color:#1a1612;text-decoration:none;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;padding:13px 26px;border-radius:999px;">View your hunts</a>
      </td></tr>
      <tr><td style="padding-top:28px;text-align:center;">
        <span style="font-size:10px;color:#6e675b;">Fields &amp; Floors Collectors · <a href="${siteUrl}/watchlist" style="color:#8a8275;text-decoration:underline;">Manage saved searches</a></span>
      </td></tr>
    </table>
  </div>`;

  return { subject: `Hunt confirmed: ${savedSearch.name}`, html };
}
