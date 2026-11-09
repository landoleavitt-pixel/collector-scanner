import { Suspense } from 'react';
import Lists from './Lists';

export const metadata = {
  title: 'Card lists',
  description: 'Every card, every version. Pick a game, open a card and tick the versions you have.',
};

export default function ListsPage() {
  return (
    <Suspense fallback={<main className="min-h-[70vh]" />}>
      <Lists />
    </Suspense>
  );
}
