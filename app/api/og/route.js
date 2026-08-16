import { ImageResponse } from 'next/og';

// Generates the link-preview image for a shared search.
//
// Called as /api/og?q=Caitlin+Clark&runs=5,10,25&auto=1&rc=1 — the same
// params the share link carries. Rendered on the fly, cached at the edge.
//
// Why an API route rather than the opengraph-image.js file convention:
// that convention only receives route `params`, never `searchParams`, so it
// can't see a share link's criteria. An API route gets the full URL.
//
// Constraints of ImageResponse (satori): flexbox only — no CSS grid, no
// float, limited shorthand. Keep the layout simple.

export const runtime = 'edge';

const GOLD = '#c9954a';
const GOLD_BRIGHT = '#ffd97a';
const INK_100 = '#f7f1e1';
const INK_400 = '#8a8275';

// Mirrors tierForRun() in app/components/rarityUtils.js so preview chips
// carry the same rarity colours as the site and the alert emails.
function tierColors(run) {
  const n = Number(String(run).replace(/^\//, ''));
  if (!Number.isFinite(n) || n < 1) return { bg: '#d99c14', fg: '#1a1612' };
  if (n <= 25) return { bg: '#ffd97a', fg: '#1a1612' };   // grail
  if (n <= 99) return { bg: '#c8d4e0', fg: '#1a1612' };   // ultra
  if (n <= 249) return { bg: '#d6884a', fg: '#1a1612' };  // rare
  return { bg: '#8a96a4', fg: '#1a1612' };                // scarce
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const query = (searchParams.get('q') || '').trim().slice(0, 60);
    const runsRaw = searchParams.get('runs') || '';
    const runs = runsRaw
      .split(',')
      .map((r) => r.trim())
      .filter((r) => /^\d{1,5}$/.test(r))
      .slice(0, 6);

    const toggles = [];
    if (searchParams.get('auto') === '1') toggles.push('Auto');
    if (searchParams.get('rc') === '1') toggles.push('Rookie');
    const cond = searchParams.get('cond');
    if (cond === 'graded') toggles.push('Graded');
    else if (cond === 'raw') toggles.push('Raw');
    const type = searchParams.get('type');
    if (type === 'auction') toggles.push('Auctions');
    else if (type === 'buyItNow') toggles.push('Buy It Now');

    const min = Number(searchParams.get('min'));
    const max = Number(searchParams.get('max'));
    let priceLabel = '';
    if (Number.isFinite(min) && min > 0 && Number.isFinite(max) && max > 0) {
      priceLabel = `$${min}–$${max}`;
    } else if (Number.isFinite(max) && max > 0) {
      priceLabel = `Under $${max}`;
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#0a0907',
            padding: '64px 72px',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                border: `2px solid ${GOLD}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: GOLD,
                fontSize: 18,
              }}
            >
              F&amp;F
            </div>
            <div style={{ display: 'flex', color: INK_100, fontSize: 30 }}>
              Fields <span style={{ color: GOLD, margin: '0 8px' }}>&amp;</span> Floors
            </div>
          </div>

          {/* The search itself */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                color: INK_400,
                fontSize: 20,
                letterSpacing: 4,
                marginBottom: 18,
              }}
            >
              SHARED SEARCH
            </div>
            <div
              style={{
                display: 'flex',
                color: GOLD_BRIGHT,
                fontSize: query.length > 28 ? 60 : 78,
                lineHeight: 1.05,
                marginBottom: 28,
              }}
            >
              {query || 'Rare sports cards'}
            </div>

            {/* Filter chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {runs.map((r) => {
                const c = tierColors(r);
                return (
                  <div
                    key={r}
                    style={{
                      display: 'flex',
                      backgroundColor: c.bg,
                      color: c.fg,
                      fontSize: 26,
                      padding: '8px 18px',
                      borderRadius: 8,
                    }}
                  >
                    /{r}
                  </div>
                );
              })}
              {toggles.map((t) => (
                <div
                  key={t}
                  style={{
                    display: 'flex',
                    color: GOLD_BRIGHT,
                    border: `1px solid ${GOLD}`,
                    fontSize: 26,
                    padding: '8px 18px',
                    borderRadius: 8,
                  }}
                >
                  {t}
                </div>
              ))}
              {priceLabel ? (
                <div
                  style={{
                    display: 'flex',
                    color: INK_400,
                    border: '1px solid #3a3530',
                    fontSize: 26,
                    padding: '8px 18px',
                    borderRadius: 8,
                  }}
                >
                  {priceLabel}
                </div>
              ) : null}
            </div>
          </div>

          {/* Footer pitch */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              borderTop: '1px solid rgba(232,226,213,0.12)',
              paddingTop: 24,
            }}
          >
            <div style={{ display: 'flex', color: INK_400, fontSize: 24 }}>
              Search eBay by multiple print runs at once
            </div>
            <div style={{ display: 'flex', color: GOLD, fontSize: 24 }}>
              fieldsandfloors.com
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch (err) {
    console.error('OG image generation failed:', err?.message || err);
    // Fall back to a 302 at the static image rather than erroring — a broken
    // preview is worse than a generic one.
    return Response.redirect('https://fieldsandfloors.com/opengraph-image.png', 302);
  }
}
