'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Code, CreditCard, User, Users, Shield, Copy, Eye, EyeOff, Webhook, Plug, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Loader2, ArrowRight, Terminal, Zap } from 'lucide-react';
import { CodeBlock } from '@/components/ui/code-block';
import type { TeamMember, WebhookConfig } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/* ── Webhook status styles ──────────────────────────────────────────── */

const webhookStatusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  failing: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
};

const roleColors: Record<string, string> = {
  Admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  Manager: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  Marketer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  Analyst: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300',
  Viewer: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

/* ── Component ──────────────────────────────────────────────────────── */

interface SettingsClientProps {
  teamMembers: TeamMember[];
  webhooks: WebhookConfig[];
}

export function SettingsClient({ teamMembers, webhooks }: SettingsClientProps) {
  const [profileName, setProfileName] = useState('Admin User');
  const [profileEmail, setProfileEmail] = useState('admin@lifecycleos.com');
  const [showApiKey, setShowApiKey] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(false);

  const apiKey = 'lcos_live_a1b2c3d4e5f6g7h8i9j0';
  const testApiKey = 'lcos_test_x9y8z7w6v5u4t3s2r1q0';

  /* ── Connection Status (auto-detected like Clerk) ──────── */
  interface ConnectionStatus {
    apiKeysCount: number;
    webhooksCount: number;
    eventsIngested: boolean;
    lastEventAt?: string;
  }
  const [connStatus, setConnStatus] = useState<ConnectionStatus | null>(null);
  const [connLoading, setConnLoading] = useState(true);

  const fetchConnectionStatus = useCallback(async () => {
    try {
      // Fetch API keys count
      const keysRes = await fetch('/api/v1/keys', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const keysJson = keysRes.ok ? await keysRes.json() : { data: { keys: [] } };
      const keys = keysJson.data?.keys ?? [];

      // Fetch webhooks count
      const whRes = await fetch('/api/v1/webhooks', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const whJson = whRes.ok ? await whRes.json() : { data: { webhooks: [] } };
      const wh = whJson.data?.webhooks ?? [];

      // Fetch recent events to check if SDK is actively sending
      const evRes = await fetch('/api/v1/health', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const evJson = evRes.ok ? await evRes.json() : { data: {} };

      setConnStatus({
        apiKeysCount: keys.length,
        webhooksCount: wh.length,
        eventsIngested: evJson.data?.usersTracked > 0 || evJson.data?.eventsStored > 0,
        lastEventAt: evJson.data?.lastEventAt,
      });
    } catch {
      setConnStatus({ apiKeysCount: 0, webhooksCount: 0, eventsIngested: false });
    } finally {
      setConnLoading(false);
    }
  }, [apiKey]);

  useEffect(() => { fetchConnectionStatus(); }, [fetchConnectionStatus]);

  return (
    <div className="grid gap-6">
      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-6 max-w-4xl">
          <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="integrations"><Plug className="mr-2 h-4 w-4" />Integrations</TabsTrigger>
          <TabsTrigger value="team"><Users className="mr-2 h-4 w-4" />Team</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="mr-2 h-4 w-4" />Billing</TabsTrigger>
          <TabsTrigger value="api"><Code className="mr-2 h-4 w-4" />API</TabsTrigger>
          <TabsTrigger value="notifications"><Shield className="mr-2 h-4 w-4" />Alerts</TabsTrigger>
        </TabsList>

        {/* ── Profile ─────────────────────────────────────────── */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your personal profile and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl">
                    {profileName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">Change Photo</Button>
                  <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="america-new-york">
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="america-new-york">America/New York (EST)</SelectItem>
                      <SelectItem value="america-chicago">America/Chicago (CST)</SelectItem>
                      <SelectItem value="america-los-angeles">America/Los Angeles (PST)</SelectItem>
                      <SelectItem value="europe-london">Europe/London (GMT)</SelectItem>
                      <SelectItem value="asia-tokyo">Asia/Tokyo (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-display">Role</Label>
                  <Input id="role-display" value="Admin" disabled className="bg-muted" />
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Change Password</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" />
                  </div>
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Team ────────────────────────────────────────────── */}
        <TabsContent value="team" className="mt-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  {teamMembers.length} members · Manage access and roles for your organization.
                </CardDescription>
              </div>
              <Button>Invite Member</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{member.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('border-transparent text-xs', roleColors[member.role] ?? roleColors.Viewer)}>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            'h-2 w-2 rounded-full',
                            member.status === 'active' ? 'bg-green-500' : 'bg-gray-400',
                          )} />
                          <span className="text-sm">{member.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{member.lastActive ? new Date(member.lastActive).toLocaleDateString() : 'Never'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive">Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Billing ─────────────────────────────────────────── */}
        <TabsContent value="billing" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage your plan and billing details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">Business Plan</h4>
                    <Badge>Current</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">$499/month · Billed monthly · Renews Feb 15, 2025</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Change Plan</Button>
                  <Button variant="destructive" size="sm">Cancel</Button>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Usage This Billing Period</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Tracked Users</p>
                    <p className="text-lg font-bold">2,847 / 10,000</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Emails Sent</p>
                    <p className="text-lg font-bold">45,230 / 100,000</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">API Calls</p>
                    <p className="text-lg font-bold">12,400 / 50,000</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Payment Method</h4>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-14 items-center justify-center rounded bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold">
                      VISA
                    </div>
                    <div>
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-xs text-muted-foreground">Expires 12/2026</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Update</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── API ─────────────────────────────────────────────── */}
        <TabsContent value="api" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage your API keys for SDK integration and server-side access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Live API Key</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      readOnly
                      value={showApiKey ? apiKey : '•'.repeat(apiKey.length)}
                      className="font-mono text-sm bg-muted"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(apiKey)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Test API Key</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input readOnly value={testApiKey} className="font-mono text-sm bg-muted" />
                    <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(testApiKey)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-3">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Keep your API keys secure. Never expose them in client-side code or public repositories.
                </p>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      <Webhook className="h-4 w-4" />
                      Webhooks
                    </h4>
                    <p className="text-sm text-muted-foreground">Receive real-time event notifications.</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((wh) => (
                      <TableRow key={wh.id}>
                        <TableCell className="font-mono text-xs">{wh.url}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {wh.events.slice(0, 3).map((ev) => (
                              <Badge key={ev} variant="outline" className="text-[10px]">{ev}</Badge>
                            ))}
                            {wh.events.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">+{wh.events.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('border-transparent text-xs', webhookStatusColors[wh.status])}>
                            {wh.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Edit</Button>
                          <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4 flex gap-2">
                  <Input
                    placeholder="https://your-app.com/webhook"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                  />
                  <Button>Add Webhook</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications ───────────────────────────────────── */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control how and when you receive alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive alerts via email for critical events</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Slack Integration</p>
                    <p className="text-sm text-muted-foreground">Post alerts to a Slack channel</p>
                  </div>
                  <Switch checked={slackNotifications} onCheckedChange={setSlackNotifications} />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Alert Rules</h4>
                {[
                  { label: 'Churn Risk Alert', desc: 'When a user moves to AtRisk or Critical tier', enabled: true },
                  { label: 'Expansion Signal', desc: 'When an account triggers an expansion signal', enabled: true },
                  { label: 'Deliverability Drop', desc: 'When delivery rate falls below 95%', enabled: true },
                  { label: 'Revenue Milestone', desc: 'When MRR crosses a defined threshold', enabled: false },
                  { label: 'Activation Stall', desc: 'When a trial user is stuck for >7 days', enabled: true },
                ].map((rule) => (
                  <div key={rule.label} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{rule.label}</p>
                      <p className="text-xs text-muted-foreground">{rule.desc}</p>
                    </div>
                    <Switch defaultChecked={rule.enabled} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* ── Integrations ─────────────────────────────── */}
        <TabsContent value="integrations" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SaaS Product Integrations</CardTitle>
              <CardDescription>
                Connect your SaaS product to enable real-time data flow for flows, segmentation, email, and personalization.
                Connect your SaaS product to LifecycleOS using our SDK, REST API, and webhooks — just like you&apos;d integrate with Clerk or Stripe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connLoading ? (
                <div className="flex items-center gap-3 py-12 justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Checking connection status…</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* ── Overall Status ──────────────────────── */}
                  {connStatus && connStatus.apiKeysCount > 0 && connStatus.eventsIngested ? (
                    <div className="flex items-center gap-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 px-4 py-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">Connected &amp; Receiving Data</p>
                        <p className="text-xs text-green-700 dark:text-green-400">Your SDK is installed and events are flowing. You&apos;re ready to build flows and automations.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Setup Incomplete</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">Complete the steps below to connect your SaaS product and start building automations.</p>
                      </div>
                    </div>
                  )}

                  {/* ── Setup Steps (Clerk-style guided flow) ── */}
                  <div className="space-y-0">
                    {/* Step 1: API Key */}
                    <SetupStep
                      step={1}
                      title="Generate API Key"
                      description="Create an API key to authenticate your SDK and API calls."
                      completed={!!connStatus && connStatus.apiKeysCount > 0}
                      detail={connStatus && connStatus.apiKeysCount > 0 ? `${connStatus.apiKeysCount} key${connStatus.apiKeysCount > 1 ? 's' : ''} active` : undefined}
                      href="/sdk"
                      ctaLabel="Go to SDK Setup"
                    />

                    {/* Step 2: Install SDK */}
                    <SetupStep
                      step={2}
                      title="Install SDK in Your Product"
                      description="Add the LifecycleOS SDK to your application and initialize it with your API key."
                      completed={!!connStatus && connStatus.eventsIngested}
                      code="npm install @lifecycleos/sdk"
                      href="/sdk"
                      ctaLabel="View Setup Guide"
                    />

                    {/* Step 3: Events Flowing */}
                    <SetupStep
                      step={3}
                      title="Send Your First Event"
                      description="Use identify() and track() to start sending user data and product events."
                      completed={!!connStatus && connStatus.eventsIngested}
                      detail={connStatus?.lastEventAt ? `Last event: ${new Date(connStatus.lastEventAt).toLocaleString()}` : undefined}
                      href="/sdk"
                      ctaLabel="Test API"
                    />

                    {/* Step 4: Webhooks (optional) */}
                    <SetupStep
                      step={4}
                      title="Configure Webhooks (Optional)"
                      description="Receive real-time notifications when lifecycle state changes, risk alerts, or expansion signals fire."
                      completed={!!connStatus && connStatus.webhooksCount > 0}
                      detail={connStatus && connStatus.webhooksCount > 0 ? `${connStatus.webhooksCount} webhook${connStatus.webhooksCount > 1 ? 's' : ''} configured` : undefined}
                      href="/sdk"
                      ctaLabel="Set Up Webhooks"
                      optional
                    />
                  </div>

                  <Separator />

                  {/* ── Quick Reference ─────────────────────── */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">How It Works</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      LifecycleOS integrates with your SaaS product the same way Clerk or Stripe does — through an <strong>SDK</strong>, <strong>REST API</strong>, and <strong>Webhooks</strong>:
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border p-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                            <Terminal className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm font-medium">SDK</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Install in your product to automatically track users, events, and accounts in real-time.</p>
                      </div>
                      <div className="rounded-lg border p-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                            <Code className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm font-medium">REST API</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Server-side endpoints for user identification, event ingestion, analytics queries, and management.</p>
                      </div>
                      <div className="rounded-lg border p-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                            <Webhook className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm font-medium">Webhooks</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Receive signed HTTP callbacks when lifecycle transitions, risk alerts, or expansion signals occur.</p>
                      </div>
                    </div>
                  </div>

                  {/* ── Refresh ──────────────────────────────── */}
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => { setConnLoading(true); fetchConnectionStatus(); }}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Refresh Status
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * Setup Step Component (Clerk-style guided checklist)
 * ═══════════════════════════════════════════════════════════════════════ */

function SetupStep({
  step, title, description, completed, detail, code, href, ctaLabel, optional,
}: {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  detail?: string;
  code?: string;
  href: string;
  ctaLabel: string;
  optional?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-start gap-4 p-4 border-x border-b first:border-t first:rounded-t-lg last:rounded-b-lg',
      completed ? 'bg-card' : 'bg-muted/30',
    )}>
      {/* Step indicator */}
      <div className={cn(
        'flex items-center justify-center h-7 w-7 rounded-full shrink-0 text-xs font-bold',
        completed
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-muted text-muted-foreground',
      )}>
        {completed ? <CheckCircle2 className="h-4 w-4" /> : step}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <h4 className={cn('text-sm font-medium', completed && 'text-green-700 dark:text-green-400')}>
            {title}
          </h4>
          {optional && (
            <Badge variant="outline" className="text-[9px] text-muted-foreground">Optional</Badge>
          )}
          {completed && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-transparent text-[10px]">
              Done
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {detail && (
          <p className="text-[11px] text-muted-foreground font-medium">{detail}</p>
        )}
        {code && !completed && (
          <div className="mt-2">
            <CodeBlock code={code} language="bash" className="text-xs" />
          </div>
        )}
      </div>

      {/* CTA */}
      <Link href={href}>
        <Button variant={completed ? 'ghost' : 'outline'} size="sm" className="shrink-0">
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </Link>
    </div>
  );
}
