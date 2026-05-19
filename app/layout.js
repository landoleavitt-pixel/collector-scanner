import './globals.css';

export const metadata = {
  title: 'Fields & Floors Collectors — eBay marketplace, for collectors',
  description: 'Collect the diamonds in the rough. A search instrument for trading card collectors — filter eBay by autograph, print run, and price simultaneously.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
