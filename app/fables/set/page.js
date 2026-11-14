import { Suspense } from 'react';
import Checklist from '../checklist/Checklist';

export const metadata = {
  title: 'Set list',
  description: 'Every card in one set. Mark the ones you have, see which are for sale, and get an alert for the ones you need.',
};

// A whole set as a checklist: /fables/set?game=…&set=<code> (Pokémon has no game param).
export default function SetPage() {
  return (
    <Suspense fallback={<main className="min-h-[70vh]" />}>
      <Checklist setMode />
    </Suspense>
  );
}
