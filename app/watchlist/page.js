import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '../../lib/supabaseServer';
import WatchlistRow from '../components/WatchlistRow';

export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/watchlist');
  }

  const [{ data: searches, error }, { data: profile }] = await Promise.all([
    supabase
      .from('saved_searches')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('tier, is_founding_member')
      .eq('id', user.id)
      .single(),
  ]);

  // User can use alerts if they're on base tier OR a founding member
  const canUseAlerts =
    profile?.tier === 'base' ||
    profile?.is_founding_member === true;

  return (
    <main className="min-h-[calc(100vh-200px)] py-12 md:py-16">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10">

        {/* Page header */}
        <div className="mb-10 md:mb-12">
          <div
            className="text-[10px] tracking-[0.22em] uppercase mb-3"
            style={{ color: 'var(--ink-500)' }}
          >
            Your Searches
          </div>
          <h1
            className="font-display italic text-[36px] md:text-[44px] leading-[1.05] mb-3"
            style={{ color: 'var(--ink-100)' }}
          >
            Always watching.
          </h1>
          <p
            className="text-[14px] max-w-[460px] leading-[1.5]"
            style={{ color: 'var(--ink-400)' }}
          >
            We check eBay every fifteen minutes. When a new match appears, you'll know.
          </p>
        </div>

        {/* Searches list */}
        {error ? (
          <div
            className="rounded-lg p-6 text-center"
            style={{
              background: '#1a1614',
              border: '0.5px solid rgba(217,119,87,0.3)',
              color: '#d97757',
            }}
          >
            Couldn't load your searches. {error.message}
          </div>
        ) : !searches || searches.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {searches.map((search) => (
              <WatchlistRow
                key={search.id}
                search={search}
                canUseAlerts={canUseAlerts}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div
      className="rounded-[14px] p-10 md:p-14 text-center"
      style={{
        background: '#1a1614',
        border: '0.5px solid rgba(232,226,213,0.08)',
      }}
    >
      <div
        className="font-serif italic text-[24px] mb-3"
        style={{ color: 'var(--ink-200)' }}
      >
        Nothing on watch yet.
      </div>
      <p
        className="text-[14px] max-w-[400px] mx-auto mb-7 leading-[1.5]"
        style={{ color: 'var(--ink-400)' }}
      >
        Run a search, dial in your filters, and tap{' '}
        <span className="font-serif italic" style={{ color: '#d4af5c' }}>
          Save this search
        </span>{' '}
        to start receiving alerts.
      </p>
      <Link
        href="/"
        className="inline-block px-5 py-2.5 rounded-full text-[11px] tracking-[0.22em] uppercase transition-opacity hover:opacity-90"
        style={{ background: '#d4af5c', color: '#1a1614' }}
      >
        Start a search
      </Link>
    </div>
  );
}
