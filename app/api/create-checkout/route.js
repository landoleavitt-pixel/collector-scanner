import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabaseServer';

// Creates a Lemon Squeezy hosted checkout URL with the user's Supabase ID
// embedded as custom_data so the webhook can resolve them without email lookup.
// Returns { url } — the client opens it in a new tab.
export async function POST() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const apiKey     = process.env.LEMONSQUEEZY_API_KEY;
  const storeId    = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId  = process.env.LEMONSQUEEZY_BASE_VARIANT_ID;

  if (!apiKey || !storeId || !variantId) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 });
  }

  const payload = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email: user.email,
          custom: {
            user_id: user.id,
          },
        },
        product_options: {
          // After checkout completes, LS sends them back to the app.
          // The webhook will already have flipped their tier by the time
          // they land here, so alerts will be unlocked.
          redirect_url: 'https://fieldsandfloors.com/watchlist?subscribed=1',
        },
        checkout_options: {
          embed: false,
          media: true,
          logo: true,
          desc: true,
          skip_trial: false,
        },
      },
      relationships: {
        store: {
          data: { type: 'stores', id: String(storeId) },
        },
        variant: {
          data: { type: 'variants', id: String(variantId) },
        },
      },
    },
  };

  const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('LS create checkout failed:', res.status, text);
    return NextResponse.json({ error: 'Could not create checkout' }, { status: 500 });
  }

  const data = await res.json();
  const url  = data?.data?.attributes?.url;

  if (!url) {
    return NextResponse.json({ error: 'No checkout URL returned' }, { status: 500 });
  }

  return NextResponse.json({ url });
}
