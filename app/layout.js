import './globals.css';

export const metadata = {
  title: 'Collector Scanner — eBay marketplace, for collectors',
  description: 'Find numbered, autographed, and rare trading cards on eBay with filters built for serious collectors.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
