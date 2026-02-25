'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CodeBlock } from '@/components/ui/code-block';
import { cn } from '@/lib/utils';
import {
  Key, Plus, Trash2, RefreshCw, Eye, EyeOff, Play, CheckCircle2,
  XCircle, AlertTriangle, Copy, Globe, Webhook, Code, Zap,
  Terminal, ArrowRight, Loader2, Shield, Clock,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════
 * Types
 * ═══════════════════════════════════════════════════════════════════════ */

interface ApiKey {
  id: string;
  key: string;
  name: string;
  environment: string;
  createdAt: string;
  lastUsedAt?: string;
  scopes: string[];
}

interface WebhookEntry {
  id: string;
  url: string;
  events: string[];
  status: string;
  secret: string;
  createdDate: string;
  lastTriggered?: string;
  successRate: number;
}

interface TestResult {
  success: boolean;
  status: number;
  data: unknown;
  time: number;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Constants & Code Samples
 * ═══════════════════════════════════════════════════════════════════════ */

const API_KEY_PROD = 'lcos_live_a1b2c3d4e5f6g7h8i9j0';

const installCode = `npm install @lifecycleos/sdk`;

const initCode = (apiKey: string) => `import { LifecycleOS } from '@lifecycleos/sdk';

const lifecycle = new LifecycleOS({
  apiKey: '${apiKey}',
  environment: 'production',    // 'production' | 'staging' | 'development'
  flushAt: 20,                  // Batch size before auto-flush
  flushInterval: 10000,         // Auto-flush every 10s
  maxRetries: 3,                // Retry failed requests
  debug: false,                 // Enable console logging
});`;

const identifyCode = `// Identify a user and attach traits
await lifecycle.identify('user-123', {
  email: 'sarah@acme.com',
  name: 'Sarah Chen',
  accountId: 'acc-001',
  plan: 'Business',
  createdAt: '2025-09-15',
});`;

const trackCode = `// Track product events (auto-batched)
lifecycle.track('feature_used', {
  userId: 'user-123',
  feature: 'email_flow_builder',
  duration: 45,
  success: true,
});

// Track lifecycle transitions
lifecycle.track('trial_activated', {
  userId: 'user-123',
  plan: 'Business',
  activationDay: 3,
  completedSteps: ['profile', 'first_flow', 'domain_verified'],
});

// Track revenue events
lifecycle.track('subscription_upgraded', {
  userId: 'user-123',
  previousPlan: 'Starter',
  newPlan: 'Business',
  mrrChange: 150,
});`;

const groupCode = `// Associate a user with an account/company
await lifecycle.group('acc-001', {
  name: 'Acme Corp',
  industry: 'Technology',
  plan: 'Business',
  seats: 25,
  arr: 59880,
});`;

const serverIdentifyCode = `// Server-side: Identify a user via REST API
const response = await fetch('/api/v1/identify', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: 'user-123',
    traits: {
      email: 'sarah@acme.com',
      name: 'Sarah Chen',
      accountId: 'acc-001',
      plan: 'Business',
    },
    timestamp: new Date().toISOString(),
  }),
});`;

const serverAnalyzeCode = `// Server-side: Run churn risk analysis
const response = await fetch('/api/v1/users/usr_1/analyze', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
});

const { data } = await response.json();
// data.analysis = { riskScore, riskTier, factors, recommendations, estimatedMrrAtRisk }`;

const serverEventsCode = `// Server-side: Batch ingest events
const response = await fetch('/api/v1/events', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    batch: [
      {
        event: 'feature_used',
        properties: { userId: 'user-123', feature: 'analytics' },
        timestamp: new Date().toISOString(),
      },
      {
        event: 'session_started',
        properties: { userId: 'user-123' },
        timestamp: new Date().toISOString(),
      },
    ],
    sentAt: new Date().toISOString(),
  }),
});`;

const webhookPayloadCode = `// Webhook payload (POST to your endpoint)
{
  "id": "dlv_abc123",
  "event": "user.lifecycle_changed",
  "timestamp": "2026-02-24T10:30:00Z",
  "data": {
    "userId": "user-123",
    "previousState": "Trial",
    "newState": "Activated",
    "account": { "id": "acc-001", "name": "Acme Corp" },
    "confidence": 85,
    "signals": ["Met activation criteria", "3 features used"]
  },
  "signature": "sha256=a1b2c3..."
}`;

const webhookVerifyCode = `// Verify webhook signature (Node.js)
const crypto = require('crypto');

function verifyWebhook(body, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}

// In your webhook handler:
app.post('/webhooks/lifecycle', (req, res) => {
  const sig = req.headers['x-lifecycle-signature'];
  if (!verifyWebhook(req.body, sig, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  // Process the event...
  res.status(200).json({ received: true });
});`;

/* ── Event Reference ────────────────────────────────────────────────── */

const eventReference = [
  { event: 'user_signed_up', category: 'Lifecycle', description: 'User creates an account', required: 'userId, email' },
  { event: 'trial_started', category: 'Lifecycle', description: 'Trial period begins', required: 'userId, plan' },
  { event: 'trial_activated', category: 'Lifecycle', description: 'User reaches activation criteria', required: 'userId, activationDay' },
  { event: 'subscription_created', category: 'Revenue', description: 'New paid subscription', required: 'userId, plan, mrr' },
  { event: 'subscription_upgraded', category: 'Revenue', description: 'Plan upgrade', required: 'userId, previousPlan, newPlan, mrrChange' },
  { event: 'subscription_downgraded', category: 'Revenue', description: 'Plan downgrade', required: 'userId, previousPlan, newPlan, mrrChange' },
  { event: 'subscription_cancelled', category: 'Revenue', description: 'Subscription cancellation', required: 'userId, reason' },
  { event: 'feature_used', category: 'Product', description: 'Feature interaction tracked', required: 'userId, feature' },
  { event: 'session_started', category: 'Product', description: 'User session begins', required: 'userId' },
  { event: 'nps_submitted', category: 'Feedback', description: 'NPS score submitted', required: 'userId, score' },
  { event: 'support_ticket_created', category: 'Support', description: 'Support ticket opened', required: 'userId, priority' },
  { event: 'email_opened', category: 'Email', description: 'Email opened by recipient', required: 'userId, flowId, stepId' },
  { event: 'email_clicked', category: 'Email', description: 'Link clicked in email', required: 'userId, flowId, stepId, link' },
];

const categoryColors: Record<string, string> = {
  Lifecycle: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Revenue: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Product: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  Feedback: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Support: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  Email: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
};

const webhookStatusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  failing: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const API_ENDPOINTS = [
  { method: 'POST', path: '/api/v1/identify', desc: 'Identify a user with traits' },
  { method: 'POST', path: '/api/v1/events', desc: 'Batch ingest events' },
  { method: 'POST', path: '/api/v1/group', desc: 'Associate user with account' },
  { method: 'GET', path: '/api/v1/users/:id', desc: 'Get user profile & lifecycle state' },
  { method: 'POST', path: '/api/v1/users/:id/analyze', desc: 'Run churn risk analysis' },
  { method: 'GET', path: '/api/v1/accounts/:id', desc: 'Get account details & users' },
  { method: 'GET', path: '/api/v1/flows', desc: 'List email flows' },
  { method: 'GET', path: '/api/v1/analytics/kpi', desc: 'KPI summary dashboard' },
  { method: 'GET', path: '/api/v1/analytics/revenue', desc: 'Revenue & waterfall data' },
  { method: 'GET', path: '/api/v1/analytics/retention', desc: 'Retention cohort data' },
  { method: 'GET', path: '/api/v1/webhooks', desc: 'List webhooks' },
  { method: 'POST', path: '/api/v1/webhooks', desc: 'Create a webhook' },
  { method: 'GET', path: '/api/v1/keys', desc: 'List API keys (masked)' },
  { method: 'POST', path: '/api/v1/keys', desc: 'Create API key' },
];

const WEBHOOK_EVENT_OPTIONS = [
  'lifecycle_change',
  'risk_alert',
  'expansion_signal',
  'account_event',
  'flow_triggered',
  'user.identified',
  'user.lifecycle_changed',
  'user.risk_score_changed',
  'account.updated',
  'account.expansion_signal',
  'event.tracked',
  'flow.triggered',
  'flow.completed',
];

/* ═══════════════════════════════════════════════════════════════════════
 * Component
 * ═══════════════════════════════════════════════════════════════════════ */

export default function SdkPage() {
  /* ── API Keys State ─────────────────────────────────────────────── */
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<string>('development');
  const [newKeyResult, setNewKeyResult] = useState<ApiKey | null>(null);

  /* ── Webhooks State ─────────────────────────────────────────────── */
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['lifecycle_change']);

  /* ── API Test Console State ─────────────────────────────────────── */
  const [testEndpoint, setTestEndpoint] = useState('/api/v1/analytics/kpi');
  const [testMethod, setTestMethod] = useState('GET');
  const [testBody, setTestBody] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testRunning, setTestRunning] = useState(false);

  /* ── Helpers ────────────────────────────────────────────────────── */

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${API_KEY_PROD}`,
    'Content-Type': 'application/json',
  }), []);

  /* ── API Keys CRUD ──────────────────────────────────────────────── */

  const loadKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const res = await fetch('/api/v1/keys', { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setApiKeys(json.data.keys);
    } catch { /* silent */ }
    setKeysLoading(false);
  }, [authHeaders]);

  const createKey = useCallback(async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: newKeyName, environment: newKeyEnv }),
      });
      const json = await res.json();
      if (json.success) {
        setNewKeyResult(json.data.key);
        setNewKeyName('');
        await loadKeys();
      }
    } catch { /* silent */ }
  }, [newKeyName, newKeyEnv, authHeaders, loadKeys]);

  const revokeKey = useCallback(async (keyId: string) => {
    try {
      await fetch(`/api/v1/keys/${keyId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      await loadKeys();
    } catch { /* silent */ }
  }, [authHeaders, loadKeys]);

  /* ── Webhooks CRUD ──────────────────────────────────────────────── */

  const loadWebhooks = useCallback(async () => {
    setWebhooksLoading(true);
    try {
      const res = await fetch('/api/v1/webhooks', { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setWebhooks(json.data.webhooks);
    } catch { /* silent */ }
    setWebhooksLoading(false);
  }, [authHeaders]);

  const createWebhook = useCallback(async () => {
    if (!newWebhookUrl.trim() || newWebhookEvents.length === 0) return;
    try {
      const res = await fetch('/api/v1/webhooks', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ url: newWebhookUrl, events: newWebhookEvents }),
      });
      const json = await res.json();
      if (json.success) {
        setNewWebhookUrl('');
        setNewWebhookEvents(['lifecycle_change']);
        await loadWebhooks();
      }
    } catch { /* silent */ }
  }, [newWebhookUrl, newWebhookEvents, authHeaders, loadWebhooks]);

  const deleteWebhook = useCallback(async (whId: string) => {
    try {
      await fetch(`/api/v1/webhooks/${whId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      await loadWebhooks();
    } catch { /* silent */ }
  }, [authHeaders, loadWebhooks]);

  /* ── API Test Console ───────────────────────────────────────────── */

  const runTest = useCallback(async () => {
    setTestRunning(true);
    setTestResult(null);
    const start = Date.now();
    try {
      const opts: RequestInit = { method: testMethod, headers: authHeaders() };
      if (testMethod !== 'GET' && testBody.trim()) opts.body = testBody;
      const res = await fetch(testEndpoint, opts);
      const json = await res.json();
      setTestResult({ success: res.ok, status: res.status, data: json, time: Date.now() - start });
    } catch (err) {
      setTestResult({ success: false, status: 0, data: { error: (err as Error).message }, time: Date.now() - start });
    }
    setTestRunning(false);
  }, [testEndpoint, testMethod, testBody, authHeaders]);

  /* ── Load data on mount ─────────────────────────────────────────── */

  useEffect(() => { loadKeys(); loadWebhooks(); }, [loadKeys, loadWebhooks]);

  /* ── Endpoint click handler ─────────────────────────────────────── */

  const selectEndpoint = (method: string, path: string) => {
    setTestMethod(method);
    setTestEndpoint(path.replace(':id', 'usr_1'));
    setTestResult(null);
    if (method === 'POST' && path.includes('/events')) {
      setTestBody(JSON.stringify({ batch: [{ event: 'feature_used', properties: { userId: 'usr_1', feature: 'analytics', duration: 30 }, timestamp: new Date().toISOString() }], sentAt: new Date().toISOString() }, null, 2));
    } else if (method === 'POST' && path.includes('/identify')) {
      setTestBody(JSON.stringify({ userId: 'usr_new_test', traits: { email: 'test@example.com', name: 'Test User', plan: 'Growth' }, timestamp: new Date().toISOString() }, null, 2));
    } else if (method === 'POST' && path.includes('/group')) {
      setTestBody(JSON.stringify({ groupId: 'acc_test_1', traits: { name: 'Test Corp', industry: 'Technology', plan: 'Business', seats: 10 }, timestamp: new Date().toISOString() }, null, 2));
    } else if (method === 'POST' && path.includes('/analyze')) {
      setTestBody('{}');
    } else if (method === 'POST' && path.includes('/keys')) {
      setTestBody(JSON.stringify({ name: 'Test Key', environment: 'development' }, null, 2));
    } else if (method === 'POST' && path.includes('/webhooks')) {
      setTestBody(JSON.stringify({ url: 'https://example.com/webhook', events: ['lifecycle_change', 'risk_alert'] }, null, 2));
    } else {
      setTestBody('');
    }
  };

  const toggleWebhookEvent = (event: string) => {
    setNewWebhookEvents((prev) => prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]);
  };

  /* ═══════════════════════════════════════════════════════════════════
   * Render
   * ═══════════════════════════════════════════════════════════════════ */

  return (
    <div className="grid gap-6">
      <Tabs defaultValue="quickstart">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="quickstart" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Quick Start</TabsTrigger>
          <TabsTrigger value="apikeys" className="gap-1.5"><Key className="h-3.5 w-3.5" /> API Keys</TabsTrigger>
          <TabsTrigger value="tracking" className="gap-1.5"><Code className="h-3.5 w-3.5" /> Event Tracking</TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5"><Terminal className="h-3.5 w-3.5" /> Event Reference</TabsTrigger>
          <TabsTrigger value="serverapi" className="gap-1.5"><Globe className="h-3.5 w-3.5" /> Server API</TabsTrigger>
          <TabsTrigger value="console" className="gap-1.5"><Play className="h-3.5 w-3.5" /> API Console</TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5"><Webhook className="h-3.5 w-3.5" /> Webhooks</TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════
         * TAB 1 — Quick Start
         * ══════════════════════════════════════════════════════════ */}
        <TabsContent value="quickstart" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> SDK Quick Start</CardTitle>
              <CardDescription>Get up and running with the LifecycleOS SDK in under 5 minutes. All endpoints are live and functional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span> Installation
                </h3>
                <p className="text-muted-foreground mb-3">Install the SDK package in your project.</p>
                <CodeBlock code={installCode} />
              </div>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span> Initialize
                </h3>
                <p className="text-muted-foreground mb-3">Initialize the SDK with your API key. Your production key:</p>
                <div className="flex items-center gap-2 mb-3 p-3 bg-muted rounded-lg font-mono text-sm">
                  <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                  <code className="break-all">{API_KEY_PROD}</code>
                  <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto flex-shrink-0" onClick={() => navigator.clipboard.writeText(API_KEY_PROD)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <CodeBlock code={initCode(API_KEY_PROD)} />
              </div>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span> Identify Users
                </h3>
                <p className="text-muted-foreground mb-3">Identify users with traits to power lifecycle segmentation. This creates or updates the user in the system.</p>
                <CodeBlock code={identifyCode} />
              </div>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span> Group Accounts
                </h3>
                <p className="text-muted-foreground mb-3">Associate users with B2B accounts for account-level analytics and expansion detection.</p>
                <CodeBlock code={groupCode} />
              </div>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">5</span> Track Events
                </h3>
                <p className="text-muted-foreground mb-3">Track product events. Events are auto-batched (default: 20 events or 10s interval) and sent with retry logic.</p>
                <CodeBlock code={trackCode} />
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 p-4">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">What happens after ingestion?</p>
                  <ul className="mt-2 text-sm text-blue-700 dark:text-blue-400 space-y-1.5">
                    <li className="flex items-start gap-2"><ArrowRight className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> Events are persisted and the lifecycle engine re-classifies the user</li>
                    <li className="flex items-start gap-2"><ArrowRight className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> If a state transition occurs (e.g., Trial → Activated), webhooks fire</li>
                    <li className="flex items-start gap-2"><ArrowRight className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> Churn risk score is recalculated in real-time</li>
                    <li className="flex items-start gap-2"><ArrowRight className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> Expansion signals are detected (seat cap, API throttle, feature gate)</li>
                    <li className="flex items-start gap-2"><ArrowRight className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> Email flows can be triggered automatically based on lifecycle state</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
         * TAB 2 — API Keys Management
         * ══════════════════════════════════════════════════════════ */}
        <TabsContent value="apikeys" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5 text-primary" /> API Keys</CardTitle>
                  <CardDescription className="mt-1.5">Manage API keys for authenticating SDK and REST API requests.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadKeys} disabled={keysLoading}>
                  <RefreshCw className={cn('h-4 w-4 mr-1', keysLoading && 'animate-spin')} /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {keysLoading ? 'Loading...' : 'No API keys found. Create one below.'}
                      </TableCell>
                    </TableRow>
                  ) : apiKeys.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                            {showSecrets[k.id] ? k.key : k.key.substring(0, 10) + '••••••••'}
                          </code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSecrets((prev) => ({ ...prev, [k.id]: !prev[k.id] }))}>
                            {showSecrets[k.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{k.environment}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(k.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => revokeKey(k.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-3">Create New API Key</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Label htmlFor="key-name" className="text-xs text-muted-foreground mb-1 block">Key Name</Label>
                    <Input id="key-name" placeholder="e.g., Production Backend" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                  </div>
                  <div className="w-full sm:w-[180px]">
                    <Label htmlFor="key-env" className="text-xs text-muted-foreground mb-1 block">Environment</Label>
                    <Select value={newKeyEnv} onValueChange={setNewKeyEnv}>
                      <SelectTrigger id="key-env"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="development">Development</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={createKey} disabled={!newKeyName.trim()}><Plus className="h-4 w-4 mr-1" /> Create Key</Button>
                  </div>
                </div>
                {newKeyResult && (
                  <div className="mt-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 p-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">API key created! Copy it now — it won&apos;t be shown again.</p>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded font-mono break-all">{newKeyResult.key}</code>
                          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => navigator.clipboard.writeText(newKeyResult.key)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setNewKeyResult(null)}>Dismiss</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
         * TAB 3 — Event Tracking
         * ══════════════════════════════════════════════════════════ */}
        <TabsContent value="tracking" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5 text-primary" /> Event Tracking</CardTitle>
              <CardDescription>Track product events, lifecycle transitions, and revenue events. Events are auto-batched and sent with retry logic.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <CodeBlock code={trackCode} />
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Best Practices</p>
                <ul className="mt-2 text-sm text-amber-700 dark:text-amber-400 list-disc list-inside space-y-1">
                  <li>Always include <code className="text-xs bg-amber-100 dark:bg-amber-900 px-1 rounded">userId</code> for user-scoped events</li>
                  <li>Use <code className="text-xs bg-amber-100 dark:bg-amber-900 px-1 rounded">snake_case</code> for event names</li>
                  <li>Track revenue events server-side for accuracy</li>
                  <li>Include <code className="text-xs bg-amber-100 dark:bg-amber-900 px-1 rounded">accountId</code> for B2B lifecycle attribution</li>
                  <li>Call <code className="text-xs bg-amber-100 dark:bg-amber-900 px-1 rounded">lifecycle.flush()</code> before page unload for critical events</li>
                </ul>
              </div>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-2">SDK Features</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { title: 'Auto-Batching', desc: 'Events buffered and sent in batches of 20 (configurable)' },
                    { title: 'Flush Interval', desc: 'Auto-flush every 10 seconds even if batch threshold not reached' },
                    { title: 'Retry with Backoff', desc: '3 retries with exponential backoff + jitter on failures' },
                    { title: 'Beacon on Unload', desc: 'Uses navigator.sendBeacon on page close for reliable delivery' },
                    { title: 'Idempotent IDs', desc: 'Each event gets a unique messageId for server-side deduplication' },
                    { title: 'Rich Context', desc: 'Automatically captures page URL, user agent, timezone, locale' },
                  ].map((f) => (
                    <div key={f.title} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{f.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
         * TAB 4 — Event Reference
         * ══════════════════════════════════════════════════════════ */}
        <TabsContent value="events" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5 text-primary" /> Event Reference</CardTitle>
              <CardDescription>Standard events recognized by LifecycleOS for automated lifecycle classification, flow triggers, and analytics.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Required Properties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventReference.map((ev) => (
                    <TableRow key={ev.event}>
                      <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{ev.event}</code></TableCell>
                      <TableCell><Badge className={cn('border-transparent text-xs', categoryColors[ev.category])}>{ev.category}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ev.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{ev.required}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
         * TAB 5 — Server API
         * ══════════════════════════════════════════════════════════ */}
        <TabsContent value="serverapi" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Server-Side REST API</CardTitle>
              <CardDescription>All endpoints are live and authenticated via Bearer token. Use the API Console tab to test them interactively.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Available Endpoints</h3>
                <div className="rounded-lg border divide-y">
                  {API_ENDPOINTS.map((ep) => (
                    <div key={`${ep.method}-${ep.path}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors">
                      <Badge variant="outline" className={cn('text-[10px] w-14 justify-center font-mono', {
                        'border-green-300 text-green-700 dark:border-green-700 dark:text-green-400': ep.method === 'GET',
                        'border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400': ep.method === 'POST',
                      })}>{ep.method}</Badge>
                      <code className="text-xs font-mono flex-1">{ep.path}</code>
                      <span className="text-xs text-muted-foreground hidden sm:block">{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-2">Identify a User</h3>
                <p className="text-muted-foreground mb-3 text-sm">Creates or updates a user record and runs lifecycle classification.</p>
                <CodeBlock code={serverIdentifyCode} />
              </div>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-2">Batch Ingest Events</h3>
                <p className="text-muted-foreground mb-3 text-sm">Send up to 100 events per batch. Each event triggers the lifecycle engine.</p>
                <CodeBlock code={serverEventsCode} />
              </div>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-2">Churn Risk Analysis</h3>
                <p className="text-muted-foreground mb-3 text-sm">Get a real-time churn risk assessment with weighted signals, recommendations, and estimated MRR at risk.</p>
                <CodeBlock code={serverAnalyzeCode} />
              </div>
              <Separator />
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 p-4">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2"><Shield className="h-4 w-4" /> Authentication</p>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1.5">All API requests require a Bearer token in the <code className="text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">Authorization</code> header. API keys can be managed in the <strong>API Keys</strong> tab.</p>
                <CodeBlock code={`Authorization: Bearer ${API_KEY_PROD}`} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
         * TAB 6 — API Console (Live Testing)
         * ══════════════════════════════════════════════════════════ */}
        <TabsContent value="console" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Play className="h-5 w-5 text-primary" /> Live API Console</CardTitle>
              <CardDescription>Test any API endpoint in real-time. All requests hit your live data store — changes are reflected across the dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Quick Select Endpoint</Label>
                <div className="flex flex-wrap gap-1.5">
                  {API_ENDPOINTS.map((ep) => (
                    <Button key={`${ep.method}-${ep.path}`} variant={testEndpoint === ep.path.replace(':id', 'usr_1') && testMethod === ep.method ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => selectEndpoint(ep.method, ep.path)}>
                      <span className={cn('mr-1 font-mono', { 'text-green-500': ep.method === 'GET', 'text-blue-500': ep.method === 'POST' })}>{ep.method}</span>
                      {ep.path.split('/').pop()}
                    </Button>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="grid sm:grid-cols-[120px_1fr] gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Method</Label>
                  <Select value={testMethod} onValueChange={setTestMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">URL</Label>
                  <Input value={testEndpoint} onChange={(e) => setTestEndpoint(e.target.value)} className="font-mono text-sm" />
                </div>
              </div>
              {testMethod !== 'GET' && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Request Body (JSON)</Label>
                  <textarea value={testBody} onChange={(e) => setTestBody(e.target.value)} rows={8} className="w-full rounded-lg border bg-muted p-3 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              )}
              <Button onClick={runTest} disabled={testRunning} className="w-full sm:w-auto">
                {testRunning ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>) : (<><Play className="h-4 w-4 mr-2" /> Send Request</>)}
              </Button>
              {testResult && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {testResult.success ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-transparent"><CheckCircle2 className="h-3 w-3 mr-1" /> {testResult.status}</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-transparent"><XCircle className="h-3 w-3 mr-1" /> {testResult.status}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {testResult.time}ms</span>
                  </div>
                  <pre className="bg-muted text-muted-foreground p-4 rounded-lg overflow-x-auto font-mono text-xs max-h-[400px] overflow-y-auto">{JSON.stringify(testResult.data, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
         * TAB 7 — Webhooks
         * ══════════════════════════════════════════════════════════ */}
        <TabsContent value="webhooks" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5 text-primary" /> Configured Webhooks</CardTitle>
                  <CardDescription className="mt-1.5">Real-time webhook endpoints receiving lifecycle event notifications with HMAC-SHA256 signatures.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadWebhooks} disabled={webhooksLoading}>
                  <RefreshCw className={cn('h-4 w-4 mr-1', webhooksLoading && 'animate-spin')} /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">{webhooksLoading ? 'Loading...' : 'No webhooks configured.'}</TableCell>
                    </TableRow>
                  ) : webhooks.map((wh) => (
                    <TableRow key={wh.id}>
                      <TableCell className="font-mono text-xs max-w-[250px] truncate">{wh.url}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {wh.events.map((ev) => (<Badge key={ev} variant="outline" className="text-[10px]">{ev}</Badge>))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('border-transparent text-xs', webhookStatusColors[wh.status] ?? webhookStatusColors.active)}>
                          {wh.status === 'failing' && <AlertTriangle className="h-3 w-3 mr-1" />}{wh.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn('text-sm font-medium', { 'text-green-600': wh.successRate >= 95, 'text-amber-600': wh.successRate >= 80 && wh.successRate < 95, 'text-red-600': wh.successRate < 80 })}>{wh.successRate}%</span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteWebhook(wh.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-3">Add Webhook Endpoint</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="wh-url" className="text-xs text-muted-foreground mb-1 block">Endpoint URL</Label>
                    <Input id="wh-url" placeholder="https://your-server.com/webhooks/lifecycle" value={newWebhookUrl} onChange={(e) => setNewWebhookUrl(e.target.value)} className="font-mono text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Subscribe to Events</Label>
                    <div className="flex flex-wrap gap-2">
                      {WEBHOOK_EVENT_OPTIONS.map((ev) => (
                        <label key={ev} className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs cursor-pointer transition-colors', newWebhookEvents.includes(ev) ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/50 border-transparent text-muted-foreground hover:border-border')}>
                          <Switch checked={newWebhookEvents.includes(ev)} onCheckedChange={() => toggleWebhookEvent(ev)} className="scale-75" />
                          {ev}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button onClick={createWebhook} disabled={!newWebhookUrl.trim() || newWebhookEvents.length === 0}><Plus className="h-4 w-4 mr-1" /> Create Webhook</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook Payload &amp; Verification</CardTitle>
              <CardDescription>All webhooks are signed with HMAC-SHA256 for security. Verify the signature before processing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Payload Structure</h3>
                <CodeBlock code={webhookPayloadCode} />
              </div>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-2">Signature Verification</h3>
                <p className="text-muted-foreground mb-3 text-sm">The signature is sent in the <code className="text-xs bg-muted px-1 rounded">X-Lifecycle-Signature</code> header. Compare it against the HMAC-SHA256 of the raw request body using your webhook secret.</p>
                <CodeBlock code={webhookVerifyCode} />
              </div>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-2">Delivery &amp; Retry</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm font-medium">3 Retries</p>
                    <p className="text-xs text-muted-foreground mt-1">Failed deliveries retry up to 3 times with exponential backoff.</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm font-medium">10s Timeout</p>
                    <p className="text-xs text-muted-foreground mt-1">Your endpoint must respond within 10 seconds.</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm font-medium">Auto-Disable</p>
                    <p className="text-xs text-muted-foreground mt-1">Webhooks are marked &quot;failing&quot; after 5+ consecutive failures.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Webhook Headers</p>
                <div className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-400 font-mono">
                  <p><code className="text-xs">X-Lifecycle-Signature</code> — HMAC-SHA256 signature</p>
                  <p><code className="text-xs">X-Lifecycle-Event</code> — Event type (e.g., user.lifecycle_changed)</p>
                  <p><code className="text-xs">X-Lifecycle-Delivery</code> — Unique delivery ID for deduplication</p>
                  <p><code className="text-xs">User-Agent</code> — LifecycleOS-Webhook/1.0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
