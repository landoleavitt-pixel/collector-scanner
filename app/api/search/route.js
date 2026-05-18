// app/api/search/route.js
//
// eBay Browse API integration.
// Uses the OAuth2 client-credentials flow to get an app token,
// then calls /buy/browse/v1/item_summary/search.
//
// Docs:
//   https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
//   https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html

import { NextResponse } from 'next/server';

const EBAY_OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';

// Cache the app token in memory across requests on the same serverless instance.
// Vercel spins down instances regularly, so this is a soft cache — we always
// re-fetch when it's missing or near expiry.
let cachedToken = null;
let cachedExpiry = 0;

async function getAppToken() {
  const now = Date.now();
  // 60-second safety buffer
  if (cachedToken && now < cachedExpiry - 60_000) {
    return cachedToken;
  }

  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) {
    throw new Error('eBay credentials missing. Set EBAY_APP_ID and EBAY_CERT_ID.');
  }

  const basic = Buffer.from(`${appId}:${certId}`).toString('base64');

  const res = await fetch(EBAY_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay OAuth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  cachedExpiry = now + data.expires_in * 1000;
  return cachedToken;
}

// Build a keyword string and Browse-API filter string from our criteria.
function buildSearchParams(criteria) {
  const parts = [criteria.keywords?.trim() || ''];

  if (criteria.autoCards) parts.push('auto');
  if (criteria.numberedCards && criteria.numberedLimit) {
    // numberedLimit is like "/25". eBay search is keyword-based so we just
    // add it as a token — eBay's matching will pick it up in titles.
    parts.push(criteria.numberedLimit);
  }

  const q = parts.filter(Boolean).join(' ');

  const filters = [];
  if (criteria.priceMin != null || criteria.priceMax != null) {
    const min = criteria.priceMin ?? 0;
    const max = criteria.priceMax ?? '';
    filters.push(`price:[${min}..${max}],priceCurrency:USD`);
  }

  // Trading cards category. 212 = Sports Mem, Cards & Fan Shop > Sports Trading Cards.
  // Leaving broad on purpose; users can narrow with keywords.
  const params = new URLSearchParams({
    q,
    limit: '24',
    category_ids: '212',
  });

  if (filters.length) params.set('filter', filters.join(','));

  const sortMap = {
    'price-low': 'price',
    'price-high': '-price',
    'newest': 'newlyListed',
  };
  if (sortMap[criteria.sortBy]) {
    params.set('sort', sortMap[criteria.sortBy]);
  }

  return params;
}

function normalizeItem(item) {
  return {
    id: item.itemId,
    title: item.title,
    price: parseFloat(item.price?.value ?? 0),
    currency: item.price?.currency ?? 'USD',
    image: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? null,
    url: item.itemWebUrl,
    condition: item.condition ?? 'Unknown',
    seller: item.seller?.username ?? null,
    sellerFeedback: item.seller?.feedbackPercentage ?? null,
    isAuction: item.buyingOptions?.includes('AUCTION') ?? false,
    isBuyItNow: item.buyingOptions?.includes('FIXED_PRICE') ?? false,
    bidCount: item.bidCount ?? null,
    endTime: item.itemEndDate ?? null,
  };
}

export async function POST(req) {
  try {
    const criteria = await req.json();

    if (!criteria.keywords || !criteria.keywords.trim()) {
      return NextResponse.json(
        { error: 'Please enter a search term.' },
        { status: 400 },
      );
    }

    const token = await getAppToken();
    const params = buildSearchParams(criteria);

    const url = `${EBAY_SEARCH_URL}?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `eBay search failed (${res.status}).`, details: text },
        { status: res.status },
      );
    }

    const data = await res.json();
    const items = (data.itemSummaries ?? []).map(normalizeItem);

    return NextResponse.json({
      items,
      total: data.total ?? items.length,
    });
  } catch (err) {
    console.error('Search route error:', err);
    return NextResponse.json(
      { error: err.message || 'Unexpected server error.' },
      { status: 500 },
    );
  }
}
