import { Suspense } from 'react';
import FablesHome from './FablesHome';

export default function FablesPage() {
  return (
    <Suspense fallback={<main className="min-h-[70vh]" />}>
      <FablesHome />
    </Suspense>
  );
}
