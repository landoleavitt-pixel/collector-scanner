import StillNeed from './StillNeed';

export const metadata = {
  title: 'Still need',
  description: 'The versions you still need from your card lists, and which are for sale on eBay now.',
  robots: { index: false },
};

export default function StillNeedPage() {
  return <StillNeed />;
}
