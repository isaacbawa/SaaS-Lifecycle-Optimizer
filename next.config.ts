import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* ── Script & image remote sources ─────────────────────────── */
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.clerk.accounts.dev' },
      { protocol: 'https', hostname: 'img.clerk.com' },
    ],
  },

  /* ── Webpack: resilient chunk loading ──────────────────────── */
  webpack(config, { isServer }) {
    if (!isServer) {
      // Lower the timeout before webpack marks a chunk as failed.
      // The default (120 000 ms) keeps the spinner too long on flaky
      // networks; 20 s is enough for any reasonable CDN round-trip.
      config.output = {
        ...config.output,
        chunkLoadTimeout: 20_000,
      };
    }
    return config;
  },

  /* ── Headers: allow Clerk CDN scripts to load ──────────────── */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.clerk.accounts.dev https://img.clerk.com",
              "font-src 'self' data:",
              "connect-src 'self' https://*.clerk.accounts.dev https://api.clerk.com wss://*.clerk.accounts.dev",
              "frame-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
