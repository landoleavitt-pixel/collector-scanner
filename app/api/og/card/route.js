import { ImageResponse } from 'next/og';

// Link-preview image for a shared CARD (as opposed to a shared search).
//
// Called as /api/og/card?id=<ebayItemId>. Fetches the listing so the preview
// shows the actual eBay photo with the title and price under it — the point
// being that a pasted link looks like you handed someone the card, not a URL.
//
// satori constraints: flexbox only, no grid. Remote images are fetched and
// embedded, so the eBay CDN URL works directly in <img src>.

export const runtime = 'edge';

const GOLD = '#c9954a';
const GOLD_BRIGHT = '#ffd97a';
const INK_100 = '#f7f1e1';
const INK_400 = '#8a8275';

// eBay serves several sizes off the same path; bump to a large one so the
// preview isn't a blurry thumbnail.
function upscale(url) {
  if (!url) return null;
  return url.replace(/\/s-l\d+\.(jpg|jpeg|png|webp)/i, '/s-l1000.$1');
}

function formatPrice(value, currency) {
  if (value == null) return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${
    currency && currency !== 'USD' ? ` ${currency}` : ''
  }`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = (searchParams.get('id') || '').trim();

    let title = '';
    let price = null;
    let currency = 'USD';
    let image = null;

    if (id) {
      // Reuse the listing endpoint so the eBay call is shared with the 5-min
      // edge cache the modal already warms.
      const res = await fetch(
        `https://fieldsandfloors.com/api/listing/${encodeURIComponent(id)}`,
        { next: { revalidate: 300 } },
      );
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.ok) {
          title = (data.title || '').slice(0, 110);
          price = data.price ?? null;
          currency = data.currency || 'USD';
          image = upscale(Array.isArray(data.images) ? data.images[0] : null);
        }
      }
    }

    const priceLabel = formatPrice(price, currency);

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            backgroundColor: '#0a0907',
            padding: '48px 56px',
            gap: 48,
          }}
        >
          {/* Card image */}
          <div
            style={{
              display: 'flex',
              width: 380,
              height: 534,
              flexShrink: 0,
              borderRadius: 12,
              border: `2px solid ${GOLD}`,
              backgroundColor: '#1a1310',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {image ? (
              <img
                src={image}
                width={376}
                height={530}
                style={{ objectFit: 'cover' }}
                alt=""
              />
            ) : (
              <div style={{ display: 'flex', color: GOLD, fontSize: 90 }}>◇</div>
            )}
          </div>

          {/* Details */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              flex: 1,
              paddingTop: 8,
              paddingBottom: 8,
            }}
          >
            {/* Title gets the full width — no header lockup competing with it. */}
            <div
              style={{
                display: 'flex',
                color: INK_100,
                fontSize: title.length > 70 ? 38 : 46,
                lineHeight: 1.22,
              }}
            >
              {title || 'A card worth watching'}
            </div>

            {/* Price on the left, oversized seal on the right. The seal is the
                only branding in the image: link platforms already print the
                domain beneath the card, so repeating it was noise. */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {priceLabel ? (
                  <div style={{ display: 'flex', color: GOLD_BRIGHT, fontSize: 68, lineHeight: 1 }}>
                    {priceLabel}
                  </div>
                ) : null}
                <div style={{ display: 'flex', color: INK_400, fontSize: 24, marginTop: 14 }}>
                  Live from eBay
                </div>
              </div>

              {/* Double-ring seal, echoing the header mark on the site. */}
              <div
                style={{
                  display: 'flex',
                  position: 'relative',
                  width: 158,
                  height: 158,
                  flexShrink: 0,
                  borderRadius: 999,
                  border: `3px solid ${GOLD}`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    top: 15,
                    left: 15,
                    right: 15,
                    bottom: 15,
                    borderRadius: 999,
                    border: `1.5px solid ${GOLD}`,
                    opacity: 0.5,
                  }}
                />
                <div style={{ display: 'flex', color: GOLD, fontSize: 43 }}>F&amp;F</div>
              </div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch (err) {
    console.error('Card OG generation failed:', err?.message || err);
    return Response.redirect('https://fieldsandfloors.com/opengraph-image.png', 302);
  }
}
