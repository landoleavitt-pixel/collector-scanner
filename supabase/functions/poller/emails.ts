// Email builders for the alert poller: new-match digests and bid reminders.
// Pure functions (no network, no secrets), so scripts can render them to
// files for checking without sending anything.

export const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "https://fieldsandfloors.com";

// --- Types ---
export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  notify_enabled: boolean;
  created_at?: string;
  side?: "sports" | "fables"; // missing before the sides migration = sports
}

export interface Listing {
  id: string;
  title: string;
  price: string | number | null;
  currency: string;
  image: string | null;
  url: string;
  condition?: string;
  isAuction?: boolean;
  isBuyItNow?: boolean;
  // Foils & Fables results (/api/tcg-search)
  side?: "sports" | "fables";
  rarity?: string | null;
  tier?: string | null;
  serial?: { n: number | null; of: number } | null;
  gradeLabel?: string | null;
  buyingOptions?: string[];
}

export interface UserDigest {
  userId: string;
  email: string;
  // Which site the digest is for. One email per side, so each carries one
  // brand; missing = sports.
  side?: "sports" | "fables";
  bySearch: Map<SavedSearch, Listing[]>;
}

// Sender name per side. Same address (no Foils & Fables domain yet).
export function senderFor(side?: string): string {
  return side === "fables"
    ? "Foils & Fables <alerts@fieldsandfloors.com>"
    : "Fields & Floors <alerts@fieldsandfloors.com>";
}

// "about 3 hours" / "about 15 minutes"
export function timeLeftLabel(msLeft: number): string {
  const mins = Math.max(1, Math.round(msLeft / 60000));
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.max(1, Math.round(mins / 60));
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}


// "Auction ending soon" reminder for one watched listing.
export function buildBidReminderEmail(
  row: Record<string, any>,
  currentPrice: number | null,
  msLeft: number,
): { subject: string; html: string } {
  if (row.side === "fables") return buildFablesBidReminder(row, currentPrice, msLeft);
  const priceStr = currentPrice != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(currentPrice))
    : "—";
  const title = row.title || "Your watched auction";
  const url = row.listing_url || "https://fieldsandfloors.com/watchlist-cards";

  const subject = `Ending soon — ${title.slice(0, 60)}${title.length > 60 ? "…" : ""}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0907;font-family:Georgia,serif;color:#f7f1e1;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <div style="font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#c9954a;margin-bottom:14px;">
      Fields &amp; Floors · Auction ending soon
    </div>
    <div style="font-style:italic;font-size:26px;line-height:1.2;color:#f7f1e1;margin-bottom:18px;">
      An auction you're watching ends in about ${timeLeftLabel(msLeft)}.
    </div>
    <div style="border:0.5px solid #2a251c;border-radius:12px;background:#14110c;padding:18px;margin-bottom:22px;">
      <div style="font-size:14px;line-height:1.4;color:#f7f1e1;margin-bottom:10px;">${title}</div>
      <div style="font-style:italic;font-size:24px;color:#c9954a;">${priceStr}<span style="font-size:12px;color:#a99e85;font-style:normal;"> current bid</span></div>
    </div>
    <a href="${url}" style="display:inline-block;background:#c9954a;color:#1a1612;text-decoration:none;font-family:ui-monospace,monospace;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;padding:13px 26px;border-radius:999px;">
      View &amp; bid on eBay
    </a>
    <p style="font-size:12px;color:#6b6354;margin-top:24px;line-height:1.6;">
      Bidding happens on eBay — we just remind you before time runs out. Prices and
      availability can change; confirm on the listing.
    </p>
  </div>
</body>
</html>`;

  return { subject, html };
}

export function buildSubject(digest: UserDigest): string {
  const searches = [...digest.bySearch.entries()];
  const totalMatches = searches.reduce((sum, [, listings]) => sum + listings.length, 0);

  if (searches.length === 1) {
    const [search, listings] = searches[0];
    if (listings.length === 1) {
      const l = listings[0];
      const price = l.price != null
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(l.price))
        : "";
      return `A new match for ${search.name}${price ? ` — ${price}` : ""}`;
    }
    return `${listings.length} new matches for ${search.name}`;
  }

  return `${totalMatches} new matches across your watchlist`;
}

export function buildEmailHtml(digest: UserDigest): string {
  if (digest.side === "fables") return buildFablesEmailHtml(digest);
  const sections = [...digest.bySearch.entries()]
    .map(([search, listings]) => renderSearchSection(search, listings))
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f0c0a;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0c0a;padding:40px 20px;">
    <tr><td align="center">

      <!-- Brand header -->
      <table width="100%" style="max-width:560px;margin-bottom:24px;">
        <tr><td>
          <div style="font-family:Georgia,serif;font-size:20px;color:#d4af5c;font-style:italic;letter-spacing:0.02em;text-align:center;">
            Fields &amp; Floors
          </div>
          <div style="font-size:10px;color:#6e675b;letter-spacing:0.22em;text-transform:uppercase;text-align:center;margin-top:6px;">
            New on the hunt
          </div>
        </td></tr>
      </table>

      ${sections}

      <!-- Footer -->
      <table width="100%" style="max-width:560px;margin-top:32px;">
        <tr><td style="text-align:center;font-size:11px;color:#6e675b;line-height:1.6;">
          You're receiving this because you saved a search on Fields &amp; Floors.<br>
          <a href="${APP_BASE_URL}/watchlist" style="color:#8a8275;text-decoration:underline;">Manage your watchlist</a>
        </td></tr>
      </table>

    </td></tr>
  </table>
</body>
</html>
  `.trim();
}

function renderSearchSection(search: SavedSearch, listings: Listing[]): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin-bottom:28px;">
      <tr><td style="padding-bottom:14px;border-bottom:0.5px solid rgba(232,226,213,0.1);">
        <div style="font-family:Georgia,serif;font-style:italic;font-size:20px;color:#e8e2d5;">${escapeHtml(search.name)}</div>
        <div style="font-size:11px;color:#8a8275;letter-spacing:0.08em;text-transform:uppercase;margin-top:8px;">
          ${listings.length} new ${listings.length === 1 ? "match" : "matches"}
        </div>
      </td></tr>
      ${listings.map(renderListingCard).join("")}
    </table>
  `;
}

function renderListingCard(l: Listing): string {
  const price = l?.price != null
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Number(l.price))
    : "—";
  const img = (l?.image && typeof l.image === "string") ? l.image : "";
  // Upscale eBay's thumbnail using their s-l URL trick (only if we have an image)
  const upscaledImg = img ? img.replace(/\/s-l\d+\.(\w+)/, "/s-l500.$1") : "";
  const title = l?.title ?? "";
  // Link to OUR card modal (?card=<id> deep link on the homepage) instead of
  // straight to eBay. The modal gives the full image carousel, rarity tree,
  // and watch button — with its own "View on eBay" for the final hop. This
  // turns every alert click into a site visit instead of an eBay visit, and
  // preserves our ability to attach affiliate tracking later.
  // utm_source lets Vercel Analytics attribute the visit to alert emails.
  // Fallback to the raw eBay url only if the listing id is somehow missing.
  const viewUrl = l?.id
    ? `${APP_BASE_URL}/?card=${encodeURIComponent(l.id)}&utm_source=alert_email`
    : (l?.url ?? "#");

  // Derive chips from the listing — print run + tier, auto, rookie, grading, listing type
  const lowerTitle = title.toLowerCase();
  const hasAuto = /\bauto\b|autograph|signed/.test(lowerTitle);
  const hasRookie = /\brookie/.test(lowerTitle) || /\brc\b/.test(lowerTitle) || /\b1st\s+bowman\b/.test(lowerTitle);
  const printRun = detectPrintRun(title);
  const tier = printRun ? printRunTier(printRun) : null;
  const psaMatch = title.match(/PSA\s*(\d{1,2})/i);
  const bgsMatch = title.match(/BGS\s*(\d{1,2}(?:\.\d)?)/i);
  const sgcMatch = title.match(/SGC\s*(\d{1,2}(?:\.\d)?)/i);
  const cgcMatch = title.match(/CGC\s*(\d{1,2}(?:\.\d)?)/i);

  // Row tier styling — left border + faint gradient wash, mirrors the search results page
  const TIER_ROW_STYLES: Record<string, { bg: string; border: string }> = {
    grail:  { bg: "linear-gradient(90deg, rgba(255,180,30,0.18) 0%, rgba(245,200,80,0.05) 30%, transparent 60%)", border: "#ffc14d" },
    ultra:  { bg: "linear-gradient(90deg, rgba(180,200,220,0.14) 0%, rgba(210,220,230,0.03) 25%, transparent 50%)", border: "#c8d4e0" },
    rare:   { bg: "linear-gradient(90deg, rgba(200,90,30,0.12) 0%, rgba(220,110,50,0.03) 22%, transparent 45%)", border: "#d6722d" },
    scarce: { bg: "linear-gradient(90deg, rgba(80,90,100,0.09) 0%, transparent 24%)", border: "#5a6470" },
  };
  const rowStyle = tier ? TIER_ROW_STYLES[tier] ?? null : null;
  const rowBg = rowStyle ? `background:#1a1614;background-image:${rowStyle.bg};border-left:2px solid ${rowStyle.border};` : `background:#1a1614;border-left:2px solid rgba(232,226,213,0.08);`;

  // Tier-gradient chips for print runs (matches the Badge component on the live site)
  const TIER_CHIP_STYLES: Record<string, string> = {
    grail:  "color:#1a1612;background-image:linear-gradient(180deg,#ffd97a 0%,#d99c14 100%);border:0.5px solid #ffc14d;font-weight:700;",
    ultra:  "color:#1a1612;background-image:linear-gradient(180deg,#e0e8f0 0%,#98a5b3 100%);border:0.5px solid #c8d4e0;font-weight:700;",
    rare:   "color:#1a1612;background-image:linear-gradient(180deg,#d6884a 0%,#8e4f1f 100%);border:0.5px solid #d6722d;font-weight:700;",
    scarce: "color:#1a1612;background-image:linear-gradient(180deg,#8a96a4 0%,#4a5360 100%);border:0.5px solid #5a6470;font-weight:600;",
  };
  const defaultChipStyle = "color:#ffd97a;background:rgba(212,175,92,0.06);border:0.5px solid #8a7548;";
  const auctionChipStyle = "color:#e6a86b;background:rgba(201,122,58,0.10);border:0.5px solid #c97a3a;";

  const chips: string[] = [];
  if (printRun && tier) {
    chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${TIER_CHIP_STYLES[tier]}margin-right:4px;">/${printRun}</span>`);
  }
  if (hasAuto) chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${defaultChipStyle}margin-right:4px;">Auto</span>`);
  if (hasRookie) chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${defaultChipStyle}margin-right:4px;">RC</span>`);
  if (psaMatch) chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${defaultChipStyle}margin-right:4px;">PSA ${psaMatch[1]}</span>`);
  if (bgsMatch) chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${defaultChipStyle}margin-right:4px;">BGS ${bgsMatch[1]}</span>`);
  if (sgcMatch) chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${defaultChipStyle}margin-right:4px;">SGC ${sgcMatch[1]}</span>`);
  if (cgcMatch) chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${defaultChipStyle}margin-right:4px;">CGC ${cgcMatch[1]}</span>`);
  if (l?.isAuction) {
    chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${auctionChipStyle}margin-right:4px;">Auction</span>`);
  } else if (l?.isBuyItNow) {
    chips.push(`<span style="display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;${defaultChipStyle}margin-right:4px;">Buy It Now</span>`);
  }

  return `
    <tr><td style="padding-top:12px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="${rowBg}border-radius:0;">
        <tr>
          <td width="108" style="padding:16px 0 16px 18px;vertical-align:top;">
            ${upscaledImg
              ? `<img src="${escapeHtml(upscaledImg)}" width="96" height="128" style="border-radius:6px;display:block;background:#221d1a;object-fit:cover;" alt="">`
              : `<div style="width:96px;height:128px;border-radius:6px;background:#221d1a;"></div>`}
          </td>
          <td style="padding:16px 8px 16px 14px;vertical-align:top;">
            <div style="font-size:13px;color:#e8e2d5;line-height:1.4;margin-bottom:10px;">${escapeHtml(title)}</div>
            <div>${chips.join("")}</div>
          </td>
          <td width="110" style="padding:16px 18px 16px 8px;vertical-align:middle;text-align:right;">
            <div style="font-family:Georgia,serif;font-style:italic;font-size:30px;color:#d4af5c;line-height:1;margin-bottom:12px;">${escapeHtml(price)}</div>
            <a href="${escapeHtml(viewUrl)}" style="display:inline-block;padding:7px 14px;background:transparent;border:0.5px solid rgba(212,175,92,0.5);color:#d4af5c;text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;border-radius:999px;">View</a>
          </td>
        </tr>
      </table>
    </td></tr>
  `;
}

// Detect print run from a listing title — looks for /N patterns, rejects
// years, dates, inventory counts, and two-digit seasons. Mirrors the logic on
// the home page (kept in sync manually — see backlog: consolidate the three
// copies of this logic once a shared module spanning Next.js + Deno exists).
function detectPrintRun(title: string): string | null {
  if (!title) return null;
  const t = title.toLowerCase();
  const titleLen = t.length || 1;

  const seasonAround = /(19|20)\d{2}[-/\s]\d{1,4}/;   // 4-digit season: 2023-24
  const dateAround = /\b\d{1,2}\/\d{1,4}\/\d{2,4}\b/;
  const inventoryAround = /\bnew\s+\d{1,2}\/\d{1,2}\b/;

  // Explicit forms where the captured group is the run.
  const explicit = [
    /#\s*\d*\s*\/\s*(\d{1,4})\b/g,                      // #/25, #5/25
    /(?:^|[^0-9a-z])\/\s*(\d{1,4})\b/g,                 // /25
    /\b\d+\s+of\s+(\d{1,4})\b/g,                        // 5 of 25
    /\b(?:numbered|limited|serial)\s+to\s+(\d{1,4})\b/g,
  ];
  for (const re of explicit) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      const idx = m.index;
      const window = t.slice(Math.max(0, idx - 14), idx + m[0].length + 4);
      if (seasonAround.test(window) || dateAround.test(window) || inventoryAround.test(window)) continue;
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 999) return String(n);
    }
  }

  // Bare N/M — only count when N < M (real run), and reject two-digit seasons
  // (consecutive, 15–31, in the first 30% of the title).
  const reBare = /(?:^|[^0-9a-z])(?!0)(\d{1,4})\s*\/\s*(\d{1,4})\b/g;
  reBare.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = reBare.exec(t)) !== null) {
    const firstNum = parseInt(m[1], 10);
    const secondNum = parseInt(m[2], 10);
    const isOneOfOne = firstNum === 1 && secondNum === 1;
    if (firstNum >= secondNum && !isOneOfOne) continue;
    const idx = m.index;
    const window = t.slice(Math.max(0, idx - 14), idx + m[0].length + 4);
    if (seasonAround.test(window) || dateAround.test(window) || inventoryAround.test(window)) continue;
    const consecutive = secondNum === firstNum + 1;
    const inSeasonRange = firstNum >= 15 && firstNum <= 30 && secondNum >= 15 && secondNum <= 31;
    if (consecutive && inSeasonRange && idx / titleLen < 0.30) continue;
    if (secondNum >= 1 && secondNum <= 999) return String(secondNum);
  }
  return null;
}

function printRunTier(runValue: string): string {
  const n = parseInt(String(runValue).replace("/", ""), 10);
  if (isNaN(n)) return "scarce";
  if (n <= 25) return "grail";
  if (n <= 99) return "ultra";
  if (n <= 249) return "rare";
  return "scarce";
}

function escapeHtml(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Foils & Fables (card-game side) ───────────────────────────────────
// Same emails, Night foil look: midnight background, moonlight text,
// Fraunces headlines (Georgia where the mail app has no Fraunces), holo foil
// used sparingly (a thin top edge and the top-rarity chip). Links go to
// /fables. No game names or logos in the brand; footer says we're not
// affiliated with eBay or any game publisher (DECISIONS.md).

const NIGHT = {
  bg: "#080a12",
  panel: "#10131f",
  panel2: "#161a29",
  line: "#242a3d",
  ink100: "#eef0f7",
  ink200: "#d5d9e8",
  ink400: "#9198b0",
  ink600: "#5d6480",
  accent: "#8fd3e8",
  bright: "#b9e6f2",
  deep: "#4b7f93",
  onAccent: "#071018",
  foil: "linear-gradient(100deg,#9fe3f5 0%,#b6a8f0 28%,#f0b3d0 52%,#f3d9a0 76%,#9fe3f5 100%)",
  display: "Fraunces,Georgia,'Times New Roman',serif",
  body: "system-ui,-apple-system,Segoe UI,sans-serif",
};
const FABLES_URL = `${APP_BASE_URL}/fables`;
const NOT_AFFILIATED = "Not affiliated with eBay or any game publisher.";

// Thin holo edge across the top of the email; solid moonlight where
// gradients aren't drawn.
const foilEdge = `<div style="height:2px;background:${NIGHT.accent};background-image:${NIGHT.foil};border-radius:2px;margin-bottom:26px;"></div>`;

function fablesBrand(eyebrow: string): string {
  return `
      <table width="100%" style="max-width:560px;margin-bottom:24px;">
        <tr><td>
          ${foilEdge}
          <div style="font-family:${NIGHT.display};font-size:22px;color:${NIGHT.ink100};letter-spacing:0.01em;text-align:center;">
            <a href="${FABLES_URL}" style="color:${NIGHT.ink100};text-decoration:none;">Foils &amp; Fables</a>
          </div>
          <div style="font-size:12px;color:${NIGHT.ink400};text-align:center;margin-top:6px;">${eyebrow}</div>
        </td></tr>
      </table>`;
}

function fablesFooter(reason: string): string {
  return `
      <table width="100%" style="max-width:560px;margin-top:32px;">
        <tr><td style="text-align:center;font-size:12px;color:${NIGHT.ink600};line-height:1.6;">
          ${reason}<br>
          <a href="${APP_BASE_URL}/watchlist" style="color:${NIGHT.ink400};text-decoration:underline;">Manage your saved searches</a><br>
          ${NOT_AFFILIATED}
        </td></tr>
      </table>`;
}

function buildFablesEmailHtml(digest: UserDigest): string {
  const sections = [...digest.bySearch.entries()]
    .map(([search, listings]) => renderFablesSection(search, listings))
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:${NIGHT.bg};font-family:${NIGHT.body};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${NIGHT.bg};padding:40px 20px;">
    <tr><td align="center">
      ${fablesBrand("New listings for your saved searches")}
      ${sections}
      ${fablesFooter("You're getting this because you saved a search on Foils &amp; Fables.")}
    </td></tr>
  </table>
</body>
</html>
  `.trim();
}

function renderFablesSection(search: SavedSearch, listings: Listing[]): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin-bottom:28px;">
      <tr><td style="padding-bottom:14px;border-bottom:0.5px solid ${NIGHT.line};">
        <div style="font-family:${NIGHT.display};font-size:20px;color:${NIGHT.ink100};">${escapeHtml(search.name)}</div>
        <div style="font-size:12px;color:${NIGHT.ink400};margin-top:8px;">
          ${listings.length} new ${listings.length === 1 ? "match" : "matches"}
        </div>
      </td></tr>
      ${listings.map(renderFablesCard).join("")}
    </table>
  `;
}

function renderFablesCard(l: Listing): string {
  const price = l?.price != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(l.price))
    : "—";
  const img = (l?.image && typeof l.image === "string") ? l.image.replace(/\/s-l\d+\.(\w+)/, "/s-l500.$1") : "";
  const viewUrl = l?.id
    ? `${FABLES_URL}?card=${encodeURIComponent(l.id)}&utm_source=alert_email`
    : (l?.url ?? "#");

  // The top rarity step wears the foil; everything else is a quiet outline.
  const top = l.tier === "grail";
  const chipBase = "display:inline-block;padding:3px 9px;font-size:11px;border-radius:999px;margin:0 4px 4px 0;";
  const foilChip = `${chipBase}color:${NIGHT.onAccent};background:${NIGHT.bright};background-image:${NIGHT.foil};font-weight:600;`;
  const quietChip = `${chipBase}color:${NIGHT.bright};background:rgba(143,211,232,0.06);border:0.5px solid ${NIGHT.deep};`;
  const chip = (text: string, style: string) => `<span style="${style}">${escapeHtml(text)}</span>`;

  const chips: string[] = [];
  if (l.serial?.of) chips.push(chip(`/${l.serial.of}`, top ? foilChip : quietChip));
  if (l.rarity) chips.push(chip(l.rarity, top && !l.serial?.of ? foilChip : quietChip));
  if (l.gradeLabel) chips.push(chip(l.gradeLabel, quietChip));
  if (l.isAuction) chips.push(chip("Auction", quietChip));
  else if (l.isBuyItNow) chips.push(chip("Buy It Now", quietChip));

  const rowBg = top
    ? `background:${NIGHT.panel};background-image:linear-gradient(90deg,rgba(143,211,232,0.12) 0%,rgba(182,168,240,0.04) 30%,transparent 60%);border-left:2px solid ${NIGHT.bright};`
    : `background:${NIGHT.panel};border-left:2px solid ${NIGHT.line};`;

  return `
    <tr><td style="padding-top:12px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="${rowBg}border-radius:8px;">
        <tr>
          <td width="108" style="padding:16px 0 16px 18px;vertical-align:top;">
            ${img
              ? `<img src="${escapeHtml(img)}" width="96" height="128" style="border-radius:6px;display:block;background:${NIGHT.panel2};object-fit:cover;" alt="">`
              : `<div style="width:96px;height:128px;border-radius:6px;background:${NIGHT.panel2};"></div>`}
          </td>
          <td style="padding:16px 8px 16px 14px;vertical-align:top;">
            <div style="font-size:13px;color:${NIGHT.ink200};line-height:1.4;margin-bottom:10px;">${escapeHtml(l?.title ?? "")}</div>
            <div>${chips.join("")}</div>
          </td>
          <td width="110" style="padding:16px 18px 16px 8px;vertical-align:middle;text-align:right;">
            <div style="font-family:${NIGHT.display};font-size:28px;color:${NIGHT.bright};line-height:1;margin-bottom:12px;">${escapeHtml(price)}</div>
            <a href="${escapeHtml(viewUrl)}" style="display:inline-block;padding:7px 14px;border:0.5px solid ${NIGHT.deep};color:${NIGHT.bright};text-decoration:none;font-size:12px;border-radius:999px;">View</a>
          </td>
        </tr>
      </table>
    </td></tr>
  `;
}

function buildFablesBidReminder(
  row: Record<string, any>,
  currentPrice: number | null,
  msLeft: number,
): { subject: string; html: string } {
  const priceStr = currentPrice != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(currentPrice))
    : "—";
  const title = row.title || "Your watched auction";
  const url = row.listing_url || FABLES_URL;
  const subject = `Ending soon — ${title.slice(0, 60)}${title.length > 60 ? "…" : ""}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:${NIGHT.bg};font-family:${NIGHT.body};color:${NIGHT.ink100};">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    ${foilEdge}
    <div style="font-size:12px;color:${NIGHT.accent};margin-bottom:14px;">
      <a href="${FABLES_URL}" style="color:${NIGHT.accent};text-decoration:none;">Foils &amp; Fables</a> · Auction ending soon
    </div>
    <div style="font-family:${NIGHT.display};font-size:26px;line-height:1.2;color:${NIGHT.ink100};margin-bottom:18px;">
      An auction you're watching ends in about ${timeLeftLabel(msLeft)}.
    </div>
    <div style="border:0.5px solid ${NIGHT.line};border-radius:12px;background:${NIGHT.panel};padding:18px;margin-bottom:22px;">
      <div style="font-size:14px;line-height:1.4;color:${NIGHT.ink100};margin-bottom:10px;">${escapeHtml(title)}</div>
      <div style="font-family:${NIGHT.display};font-size:24px;color:${NIGHT.bright};">${priceStr}<span style="font-family:${NIGHT.body};font-size:12px;color:${NIGHT.ink400};"> current bid</span></div>
    </div>
    <a href="${escapeHtml(url)}" style="display:inline-block;background:${NIGHT.bright};color:${NIGHT.onAccent};text-decoration:none;font-size:14px;font-weight:600;padding:13px 26px;border-radius:999px;">
      View and bid on eBay
    </a>
    <p style="font-size:12px;color:${NIGHT.ink600};margin-top:24px;line-height:1.6;">
      Bidding happens on eBay. We just remind you before time runs out. Prices and
      availability can change, so check the listing.<br>
      <a href="${APP_BASE_URL}/watchlist" style="color:${NIGHT.ink400};text-decoration:underline;">Manage reminders</a> · ${NOT_AFFILIATED}
    </p>
  </div>
</body>
</html>`;

  return { subject, html };
}
