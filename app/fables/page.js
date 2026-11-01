import { Suspense } from 'react';
import FablesHome from './FablesHome';
import { WatchlistProvider } from '../../lib/watchlistContext';

export default function FablesPage() {
  return (
    <Suspense fallback={<main className="min-h-[70vh]" />}>
      <WatchlistProvider>
        <FablesHome />
      </WatchlistProvider>
    </Suspense>
  );
}
