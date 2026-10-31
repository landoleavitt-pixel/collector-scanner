import FablesSide from './FablesSide';

export const metadata = {
  title: {
    absolute: 'Foils & Fables',
    template: '%s · Foils & Fables',
  },
  description:
    'Search trading card listings on eBay by rarity, language and grade, rarest first. Ranked by the rarity printed on the card.',
  openGraph: {
    siteName: 'Foils & Fables',
    title: 'Foils & Fables',
    description: 'Search trading card listings on eBay by rarity, language and grade, rarest first.',
  },
};

// Everything under /fables uses the Night foil look. The attribute goes on
// <html> before first paint (inline script) so the header and footer, which
// live in the root layout, switch too without a flash; FablesSide keeps it in
// sync on client-side navigation and removes it when leaving /fables.
export default function FablesLayout({ children }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.setAttribute('data-side','fables')" }} />
      <FablesSide />
      {children}
    </>
  );
}
