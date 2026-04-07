import type { NextConfig } from 'next';

/* ── Clerk Frontend API domain (derived from publishable key) ──────── */
function clerkFrontendDomain(): string {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
  const encoded = key.replace(/^pk_(test|live)_/, '');
  try {
    const raw = Buffer.from(encoded, 'base64').toString('utf-8');
    return raw.endsWith('$') ? raw.slice(0, -1) : raw;
  } catch {
    return '';
  }
}

const clerkDomain = clerkFrontendDomain();

const nextConfig: NextConfig = {  /* ── Clerk proxy: route /clerk through your own domain ───── */
  async rewrites() {
    if (!clerkDomain) return [];
    return [
      {
        source: '/clerk/:path*',
        destination: `https://${clerkDomain}/:path*`,
      },
    ];
  },
  /* ── Script & image remote sources ─────────────────────────── */
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.clerk.accounts.dev' },
      { protocol: 'https', hostname: 'img.clerk.com' },
      ...(clerkDomain ? [{ protocol: 'https' as const, hostname: clerkDomain }] : []),
    ],
  },

  /* ── Webpack: resilient chunk loading ──────────────────────── */
  webpack(config, { isServer }) {
    if (!isServer) {
      config.output = {
        ...config.output,
        chunkLoadTimeout: 20_000,
      };
    }
    return config;
  },

};

export default nextConfig;
