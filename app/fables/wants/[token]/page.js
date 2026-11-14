import SharedWants from './SharedWants';

export const metadata = {
  title: 'A collector’s want list',
  description: 'The cards a collector is looking for, and which are for sale on eBay now.',
  robots: { index: false },
};

export default function SharedWantsPage({ params }) {
  return <SharedWants token={params.token} />;
}
