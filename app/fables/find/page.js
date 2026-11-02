import { Suspense } from 'react';
import Find from './Find';
import { WatchlistProvider } from '../../../lib/watchlistContext';

export const metadata = {
  title: 'Find a card',
  robots: { index: false },
};

export default function FindPage() {
  return (
    <Suspense fallback={<main className="min-h-[70vh]" />}>
      <WatchlistProvider>
        <Find />
      </WatchlistProvider>
    </Suspense>
  );
}
