import { Suspense } from 'react';
import Checklist from './Checklist';

export const metadata = {
  title: 'Card checklist',
  description: 'Every card of one Pokémon in one list. Mark the ones you have and get an alert when one you need is for sale.',
};

export default function ChecklistPage() {
  return (
    <Suspense fallback={<main className="min-h-[70vh]" />}>
      <Checklist />
    </Suspense>
  );
}
