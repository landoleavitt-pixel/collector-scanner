import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { PAYMENTS_LIVE } from './lib/payments';
import { siteForHost, isSideDomain, SPORTS_ORIGIN, FABLES_ORIGIN } from './lib/domains';

// Routes that require an authenticated user
const PROTECTED_PREFIXES = ['/watchlist', '/alerts/settings', '/account', '/subscribe', '/admin'];

export async function middleware(request) {
  // Which site this is, by domain (lib/domains.js). Temporary redirects (307)
  // while the domains are being set up.
  const host = request.headers.get('host');
  const site = siteForHost(host);
  const { pathname: path, search } = request.nextUrl;
  if (!path.startsWith('/api/')) {
    if (site === 'umbrella') {
      // floorsandfables.com: the front door. Anything else belongs to a side.
      if (path === '/') return NextResponse.rewrite(new URL('/choose', request.url));
      if (path !== '/choose') {
        const fables = path === '/fables' || path.startsWith('/fables/');
        return NextResponse.redirect(new URL(`${path}${search}`, fables ? FABLES_ORIGIN : SPORTS_ORIGIN), 307);
      }
    } else if (path === '/choose' && isSideDomain(host)) {
      return NextResponse.redirect(new URL('/', request.url), 307);
    } else if (site === 'fables' && path === '/') {
      // foilsandfables.com opens on the Foils & Fables home (search links keep their query).
      return NextResponse.redirect(new URL(`/fables${search}`, request.url), 307);
    }
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh session if it's near expiry (this is the recommended pattern from Supabase docs)
  const { data: { user } } = await supabase.auth.getUser();

  // Check if this route requires auth
  const { pathname } = request.nextUrl;

  // Early access: no plans or checkout to show (lib/payments.js).
  if (!PAYMENTS_LIVE && (pathname === '/pricing' || pathname.startsWith('/subscribe'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Run middleware on all routes except static assets and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
