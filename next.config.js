/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // No page uses next/image; turning the optimizer off closes its endpoint
    // (image-optimizer advisories with no fix on Next 14).
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ebayimg.com' },
      { protocol: 'https', hostname: 'thumbs.ebaystatic.com' },
    ],
  },
};

module.exports = nextConfig;
