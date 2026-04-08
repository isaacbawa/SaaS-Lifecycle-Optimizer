# @lifecycleos/sdk

Production SDK for integrating **LifecycleOS** into Next.js SaaS applications.

Track users, events, accounts, and page views. Manage lifecycle stages from trial to expansion automatically.

---

## Architecture

The SDK ships as **three sub-path exports** so you only import what your runtime needs:

| Entry point | Runtime | Depends on | Purpose |
|---|---|---|---|
| `@lifecycleos/sdk` | Any (browser, Node.js, edge) | Nothing | Core client: identify, track, group, flush |
| `@lifecycleos/sdk/react` | Browser + React 18+ | `react` | Provider, hooks, drop-in components |
| `@lifecycleos/sdk/nextjs` | Next.js 14+ server | `next` | Server Actions, Route Handlers, middleware, webhook verification |

> **Designed for Next.js.** The React layer works with any React framework (Remix, Vite+React, CRA, Gatsby), but the server-side helpers (`/nextjs`) are purpose-built for Next.js Server Components, Server Actions, and middleware.

---

## Install

```bash
npm install @lifecycleos/sdk
# or
pnpm add @lifecycleos/sdk
# or
yarn add @lifecycleos/sdk
```

**Peer dependencies** (install alongside):

| Package | Required for |
|---|---|
| `react` ≥18 | `@lifecycleos/sdk/react` only |
| `react-dom` ≥18 | `@lifecycleos/sdk/react` only |
| `next` ≥14 | `@lifecycleos/sdk/nextjs` only |

All peers are optional - if you only use the core client, no peer deps are needed.

---

## Quick Start - Next.js App Router

### 1. Provider Setup

```tsx
// app/providers.tsx
'use client';

import { LifecycleOSProvider } from '@lifecycleos/sdk/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LifecycleOSProvider
      apiKey={process.env.NEXT_PUBLIC_LIFECYCLEOS_KEY!}
      apiBaseUrl="/api/v1"
    >
      {children}
    </LifecycleOSProvider>
  );
}
```

```tsx
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 2. Identify Users

```tsx
'use client';

import { useIdentify } from '@lifecycleos/sdk/react';

export function OnboardingComplete({ userId, email, plan }: Props) {
  const { identify, loading } = useIdentify();

  useEffect(() => {
    identify(userId, { email, plan, onboardedAt: new Date().toISOString() });
  }, [userId]);

  return loading ? <Spinner /> : <Dashboard />;
}
```

Or declaratively:

```tsx
import { IdentifyUser } from '@lifecycleos/sdk/react';

export function App({ user }) {
  return (
    <IdentifyUser
      userId={user.id}
      traits={{ email: user.email, plan: user.plan }}
      onIdentified={() => console.log('User identified')}
    />
  );
}
```

### 3. Track Events

```tsx
'use client';

import { useTrack } from '@lifecycleos/sdk/react';

export function FeatureButton() {
  const track = useTrack();

  return (
    <button onClick={() => track('feature_used', { feature: 'export', format: 'csv' })}>
      Export CSV
    </button>
  );
}
```

Or declaratively with triggers:

```tsx
import { TrackEvent } from '@lifecycleos/sdk/react';

// Track on mount
<TrackEvent event="page_loaded" properties={{ page: 'pricing' }} />

// Track on click
<TrackEvent event="cta_clicked" trigger="click" properties={{ cta: 'upgrade' }}>
  <button>Upgrade Now</button>
</TrackEvent>

// Track when visible (IntersectionObserver)
<TrackEvent event="section_viewed" trigger="visible" properties={{ section: 'features' }}>
  <section>Features content...</section>
</TrackEvent>
```

### 4. Automatic Page Tracking

```tsx
import { PageTracker } from '@lifecycleos/sdk/react';

// In your layout - tracks all client-side navigations
<PageTracker />
```

### 5. Account / Group Tracking

```tsx
import { GroupAccount } from '@lifecycleos/sdk/react';

<GroupAccount
  groupId="acc_456"
  traits={{ name: 'Acme Corp', plan: 'Enterprise', seats: 50 }}
/>
```

---

## Server-Side - Next.js API Routes & Server Actions

```ts
import { serverIdentify, serverTrack, serverGroup } from '@lifecycleos/sdk/nextjs';

// In a Server Action
export async function upgradeUser(userId: string, newPlan: string) {
  'use server';

  await serverTrack('subscription_upgraded', {
    userId,
    plan: newPlan,
    upgradedAt: new Date().toISOString(),
  });

  await serverIdentify(userId, { plan: newPlan });
}
```

### Batch Server-Side Events

```ts
import { serverTrackBatch } from '@lifecycleos/sdk/nextjs';

await serverTrackBatch([
  { event: 'feature_used', properties: { feature: 'reports', userId: 'u1' } },
  { event: 'feature_used', properties: { feature: 'exports', userId: 'u2' } },
]);
```

### Webhook Verification

```ts
import { verifyWebhook } from '@lifecycleos/sdk/nextjs';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('X-Lifecycle-Signature') ?? '';

  try {
    const valid = await verifyWebhook(body, signature, process.env.LIFECYCLEOS_WEBHOOK_SECRET!);
    if (!valid) return new Response('Unauthorized', { status: 401 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Web Crypto API not available') {
      return new Response('Webhook verification unavailable', { status: 503 });
    }
    throw error;
  }

  const payload = JSON.parse(body);
  // Process webhook...
  return new Response('OK');
}
```

### Middleware Page View Tracking

```ts
// middleware.ts
import { trackMiddlewarePageView } from '@lifecycleos/sdk/nextjs';

export async function middleware(request: NextRequest) {
  await trackMiddlewarePageView(request);
  return NextResponse.next();
}
```

---

## Core Client (Advanced / Framework-Agnostic)

The core client works in **any JavaScript runtime** - no React or Next.js required.

```ts
import { createClient } from '@lifecycleos/sdk';

const client = createClient({
  apiKey: 'lcos_live_xxx',
  apiBaseUrl: 'https://your-lifecycleos-instance.com/api/v1',
  flushAt: 20,
  flushInterval: 10000,
  maxRetries: 3,
  debug: true,
});

// Identify a user
await client.identify('user_123', { email: 'jane@example.com', plan: 'Growth' });

// Track an event
client.track('button_clicked', { button: 'signup' });

// Track a page view
client.page({ url: '/pricing', title: 'Pricing' });

// Associate user with an account
await client.group('acc_456', { name: 'Acme Corp', plan: 'Enterprise', seats: 50 });

// Force-flush all queued events
await client.flush();

// Shut down gracefully (flushes remaining events)
await client.shutdown();
```

### Plugins

```ts
import { createClient } from '@lifecycleos/sdk';
import type { LifecycleOSPlugin } from '@lifecycleos/sdk';

const loggingPlugin: LifecycleOSPlugin = {
  name: 'logger',
  beforeTrack: (event, properties) => {
    console.log(`[Track] ${event}`, properties);
    return properties; // Return null to suppress the event
  },
  afterFlush: (results) => {
    console.log(`[Flush] ${results.length} events sent`);
  },
};

const client = createClient({
  apiKey: 'lcos_live_xxx',
  apiBaseUrl: '/api/v1',
  plugins: [loggingPlugin],
});
```

---

## Environment Variables

```env
# Client-side (public - included in browser bundle)
NEXT_PUBLIC_LIFECYCLEOS_KEY=lcos_live_xxx

# Server-side (secret - never exposed to browser)
LIFECYCLEOS_API_KEY=lcos_sec_xxx
LIFECYCLEOS_API_URL=https://your-app.com/api/v1
LIFECYCLEOS_WEBHOOK_SECRET=whsec_xxx
```

---

## API Reference

### Hooks (`@lifecycleos/sdk/react`)

| Hook | Returns | Description |
|------|---------|-------------|
| `useIdentify()` | `{ identify, loading, error, data }` | Identify users with traits |
| `useTrack()` | `track(event, props?)` | Track events (batched) |
| `useGroup()` | `{ group, loading, error, data }` | Associate user with account |
| `usePage()` | `trackPage(props?)` | Track page views |
| `useFlush()` | `flush()` | Force flush event queue |
| `usePageTracking()` | `void` | Auto page tracking on navigation |
| `useLifecycleOS()` | `LifecycleOSClient` | Direct client access |
| `useLifecycleOSOptional()` | `LifecycleOSClient \| null` | Safe client access (no throw) |

### Components (`@lifecycleos/sdk/react`)

| Component | Props | Description |
|-----------|-------|-------------|
| `LifecycleOSProvider` | `apiKey, apiBaseUrl?, ...config` | Provides client to component tree |
| `IdentifyUser` | `userId, traits?, onIdentified?, onError?` | Identify on mount |
| `GroupAccount` | `groupId, traits?, onGrouped?, onError?` | Group on mount |
| `TrackEvent` | `event, properties?, trigger?, children?` | Track with mount/click/visible triggers |
| `PageTracker` | - | Auto page view tracking |

### Server Functions (`@lifecycleos/sdk/nextjs`)

| Function | Description |
|----------|-------------|
| `serverIdentify(userId, traits?, config?)` | Server-side identify |
| `serverTrack(event, props?, config?)` | Server-side track (single event) |
| `serverTrackBatch(events[], config?)` | Batch server-side track |
| `serverGroup(groupId, traits?, config?)` | Server-side group |
| `verifyWebhook(body, signature, secret)` | Verify webhook HMAC-SHA256 |
| `trackMiddlewarePageView(request, config?)` | Track from Next.js middleware |

### Core Client (`@lifecycleos/sdk`)

| Method | Description |
|--------|-------------|
| `createClient(config)` | Create a new client instance |
| `init(config)` | Initialize default singleton |
| `getClient()` | Get default singleton |
| `resetClient()` | Reset and shutdown singleton |

### Client Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | - | **Required.** Your LifecycleOS API key |
| `apiBaseUrl` | `string` | `'/api/v1'` | API base URL |
| `environment` | `string` | `'production'` | Environment tag |
| `flushAt` | `number` | `20` | Batch size before auto-flush |
| `flushInterval` | `number` | `10000` | Auto-flush interval (ms) |
| `maxRetries` | `number` | `3` | Max retry attempts on failure |
| `retryBaseDelay` | `number` | `1000` | Base delay for exponential backoff (ms) |
| `debug` | `boolean` | `false` | Enable console debug logging |
| `timeout` | `number` | `10000` | Request timeout (ms) |

---

## License

MIT
