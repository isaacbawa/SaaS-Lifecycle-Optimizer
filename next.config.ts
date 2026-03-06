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

// Build a list of all Clerk-related origins that must be allowed by CSP.
// This covers dev instances (*.clerk.accounts.dev), production proxy
// domains (e.g. clerk.yourapp.vercel.app), and first-party Clerk CDN.
const clerkOrigins = [
  clerkDomain ? `https://${clerkDomain}` : '',
  clerkDomain ? `wss://${clerkDomain}` : '',
  'https://*.clerk.accounts.dev',
  'wss://*.clerk.accounts.dev',
  'https://*.clerk.com',
  'wss://*.clerk.com',
  'https://img.clerk.com',
  'https://challenges.cloudflare.com',
].filter(Boolean);

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

  /* ── Headers: CSP + Clerk origins ──────────────────────────── */
  async headers() {
    const clerkSrc = clerkOrigins.filter(o => o.startsWith('https://')).join(' ');
    const clerkConnect = clerkOrigins.join(' ');

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerkSrc}`,
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' data: blob: ${clerkSrc}`,
              "font-src 'self' data:",
              `connect-src 'self' ${clerkConnect}`,
              `frame-src 'self' ${clerkSrc}`,
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
