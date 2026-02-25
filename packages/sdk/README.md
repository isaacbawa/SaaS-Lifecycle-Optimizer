# @lifecycleos/sdk

Production SDK for integrating LifecycleOS into Next.js SaaS applications.

Track users, events, accounts, and page views. Manage lifecycle stages from trial to expansion automatically.

## Install

```bash
npm install @lifecycleos/sdk
```

## Quick Start

### 1. Provider Setup (App Router)

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

// In your layout — tracks all client-side navigations
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

## Server-Side (API Routes, Server Actions)

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

### Webhook Verification

```ts
import { verifyWebhook } from '@lifecycleos/sdk/nextjs';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('X-Lifecycle-Signature') ?? '';

  const valid = await verifyWebhook(body, signature, process.env.LIFECYCLEOS_WEBHOOK_SECRET!);
  if (!valid) return new Response('Unauthorized', { status: 401 });

  const payload = JSON.parse(body);
  // Process webhook...
  return new Response('OK');
}
```

---

## Environment Variables

```env
# Client-side (public)
NEXT_PUBLIC_LIFECYCLEOS_KEY=lk_pub_xxx

# Server-side (secret)
LIFECYCLEOS_API_KEY=lk_sec_xxx
LIFECYCLEOS_API_URL=https://your-app.com/api/v1
LIFECYCLEOS_WEBHOOK_SECRET=whsec_xxx
```

## Core Client (Advanced)

```ts
import { createClient } from '@lifecycleos/sdk';

const client = createClient({
  apiKey: 'lk_pub_xxx',
  apiBaseUrl: '/api/v1',
  flushAt: 20,
  flushInterval: 10000,
  maxRetries: 3,
  debug: true,
});

client.identify('user_123', { email: 'jane@example.com' });
client.track('button_clicked', { button: 'signup' });
await client.flush();
```

### Plugins

```ts
import { createClient, LifecycleOSPlugin } from '@lifecycleos/sdk';

const loggingPlugin: LifecycleOSPlugin = {
  name: 'logger',
  beforeTrack: (event, properties) => {
    console.log(`[Track] ${event}`, properties);
    return properties;
  },
  afterFlush: (results) => {
    console.log(`[Flush] ${results.length} events sent`);
  },
};

const client = createClient({
  apiKey: 'lk_pub_xxx',
  apiBaseUrl: '/api/v1',
  plugins: [loggingPlugin],
});
```

## API

### Hooks

| Hook | Returns | Description |
|------|---------|-------------|
| `useIdentify()` | `{ identify, loading, error, data }` | Identify users |
| `useTrack()` | `track(event, props?)` | Track events |
| `useGroup()` | `{ group, loading, error, data }` | Group accounts |
| `usePage()` | `trackPage(props?)` | Track pages |
| `useFlush()` | `flush()` | Force flush queue |
| `usePageTracking()` | `void` | Auto page tracking |

### Components

| Component | Props | Description |
|-----------|-------|-------------|
| `IdentifyUser` | `userId, traits?, onIdentified?, onError?` | Identify on mount |
| `GroupAccount` | `groupId, traits?, onGrouped?` | Group on mount |
| `TrackEvent` | `event, properties?, trigger?, children?` | Track with triggers |
| `PageTracker` | — | Auto page view tracking |

### Server Functions

| Function | Description |
|----------|-------------|
| `serverIdentify(userId, traits?)` | Server-side identify |
| `serverTrack(event, props?)` | Server-side track |
| `serverTrackBatch(events[])` | Batch server-side track |
| `serverGroup(groupId, traits?)` | Server-side group |
| `verifyWebhook(body, sig, secret)` | Verify webhook HMAC |
| `trackMiddlewarePageView(req)` | Track from middleware |

## License

MIT
