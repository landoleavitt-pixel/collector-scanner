/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}'],
  theme: {
    extend: {
      // The 8 text sizes (design review, 2026-11-09). Nothing smaller than 12.
      fontSize: {
        fine: '12px',   // fine print only
        meta: '13px',   // seller, time left, captions
        body: '15px',   // listing titles, body text
        lede: '17px',   // intro text under a heading
        h3: '20px',     // section headings
        price: '28px',  // prices, card headings
        h1: '40px',     // page headings
        hero: '60px',   // the home headline
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'serif'],
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
