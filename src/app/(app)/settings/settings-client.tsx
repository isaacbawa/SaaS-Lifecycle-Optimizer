'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
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
import {
  Code, CreditCard, User, Users, Shield, Copy, Eye, EyeOff,
  Webhook, Plug, CheckCircle2, AlertTriangle, RefreshCw,
  Loader2, ArrowRight, Terminal, Plus, Trash2,
} from 'lucide-react';
import { CodeBlock } from '@/components/ui/code-block';
import type { TeamMember, WebhookConfig } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
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

/* ── Types ──────────────────────────────────────────────────────────── */

interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  environment: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

interface SettingsClientProps {
  teamMembers: TeamMember[];
  webhooks: WebhookConfig[];
  apiKeys: ApiKeyInfo[];
}

export function SettingsClient({ teamMembers, webhooks, apiKeys: initialApiKeys }: SettingsClientProps) {
  const { user, isLoaded: isUserLoaded } = useUser();

  // Profile state — seeded from Clerk
  const [profileName, setProfileName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (isUserLoaded && user) {
      setProfileName(`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'User');
    }
  }, [isUserLoaded, user]);

  // API Keys state
  const [apiKeysList, setApiKeysList] = useState<ApiKeyInfo[]>(initialApiKeys);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'development' | 'production'>('production');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showKeyId, setShowKeyId] = useState<string | null>(null);

  // Webhooks
  const [newWebhookUrl, setNewWebhookUrl] = useState('');

  // Notifications — DB-backed via /api/v1/preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(false);
  const [timezone, setTimezone] = useState('america-new-york');
  const [alertRules, setAlertRules] = useState<Record<string, boolean>>({
    'Churn Risk Alert': true,
    'Expansion Signal': true,
    'Deliverability Drop': true,
    'Revenue Milestone': false,
    'Activation Stall': true,
  });
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);

  const apiKey = 'lcos_live_a1b2c3d4e5f6g7h8i9j0';

  /* ── Connection Status (auto-detected) ──────── */
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
      const res = await fetch('/api/v1/health');
      const json = res.ok ? await res.json() : { data: {} };
      setConnStatus({
        apiKeysCount: apiKeysList.length,
        webhooksCount: webhooks.length,
        eventsIngested: json.data?.usersTracked > 0 || json.data?.eventsStored > 0,
        lastEventAt: json.data?.lastEventAt,
      });
    } catch {
      setConnStatus({ apiKeysCount: apiKeysList.length, webhooksCount: webhooks.length, eventsIngested: false });
    } finally {
      setConnLoading(false);
    }
  }, [apiKeysList.length, webhooks.length]);

  useEffect(() => { fetchConnectionStatus(); }, [fetchConnectionStatus]);

  /* ── Load Preferences from DB ──────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/v1/preferences');
        if (!res.ok) return;
        const json = await res.json();
        const data = json.data ?? {};
        if (data.notifications) {
          setEmailNotifications(data.notifications.emailNotifications ?? true);
          setSlackNotifications(data.notifications.slackNotifications ?? false);
        }
        if (data.timezone) {
          setTimezone(data.timezone.timezone ?? 'america-new-york');
        }
        if (data.alert_rules) {
          setAlertRules(prev => ({ ...prev, ...(data.alert_rules.rules ?? {}) }));
        }
      } catch { /* non-critical */ }
      finally { setPrefsLoaded(true); }
    })();
  }, []);

  /* ── Save a preference to DB ───────────────────── */
  const savePref = useCallback(async (key: string, value: Record<string, unknown>) => {
    setPrefsSaving(true);
    try {
      await fetch('/api/v1/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
    } catch { /* non-critical */ }
    finally { setPrefsSaving(false); }
  }, []);

  /* ── Profile Save ──────────────────────────────── */
  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      const parts = profileName.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      await user.update({ firstName, lastName });
      toast({ title: 'Profile updated', description: 'Your name has been saved.' });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setProfileSaving(false);
    }
  };

  /* ── API Key Create ────────────────────────────── */
  const createNewApiKey = async () => {
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    setNewlyCreatedKey(null);
    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          name: newKeyName.trim(),
          environment: newKeyEnv,
          scopes: ['identify', 'track', 'group', 'read', 'write'],
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: { message: 'Failed to create key' } }));
        throw new Error(j.error?.message ?? 'Failed to create key');
      }
      const j = await res.json();
      const newKey = j.data?.key;
      if (newKey?.rawKey) {
        setNewlyCreatedKey(newKey.rawKey);
      }
      if (newKey) {
        setApiKeysList(prev => [{
          id: newKey.id,
          name: newKey.name,
          keyPrefix: newKey.keyPrefix,
          environment: newKey.environment,
          scopes: newKey.scopes ?? [],
          createdAt: new Date().toISOString(),
          lastUsedAt: null,
        }, ...prev]);
      }
      setNewKeyName('');
      toast({ title: 'API key created', description: 'Copy the key now — it won\'t be shown again.' });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setCreatingKey(false);
    }
  };

  /* ── API Key Revoke ────────────────────────────── */
  const revokeKey = async (keyId: string) => {
    try {
      const res = await fetch(`/api/v1/keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: { message: 'Failed to revoke key' } }));
        throw new Error(j.error?.message ?? 'Failed to revoke');
      }
      setApiKeysList(prev => prev.filter(k => k.id !== keyId));
      toast({ title: 'API key revoked', description: 'The key has been permanently revoked.' });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

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
              <CardDescription>Your profile is managed through Clerk authentication. Update your display name below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl">
                    {isUserLoaded && user
                      ? (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')
                      : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{isUserLoaded && user ? user.primaryEmailAddress?.emailAddress : '...'}</p>
                  <p className="text-xs text-muted-foreground">Signed in via Clerk</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={isUserLoaded && user ? (user.primaryEmailAddress?.emailAddress ?? '') : ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email is managed via Clerk</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={(v) => { setTimezone(v); savePref('timezone', { timezone: v }); }}>
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
              <Button onClick={saveProfile} disabled={profileSaving}>
                {profileSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save Changes'}
              </Button>
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
                  {teamMembers.length} members · Team management is handled via Clerk organization settings.
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <a href="https://clerk.com" target="_blank" rel="noopener noreferrer">Manage in Clerk</a>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Active</TableHead>
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
              <div className="flex items-center gap-2">
                <CardTitle>Subscription & Billing</CardTitle>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
              <CardDescription>
                Stripe billing integration is on our roadmap. You&apos;ll be able to manage plans, view usage, and update payment methods here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Billing dashboard coming soon</p>
                <p className="text-sm mt-1">Stripe integration for subscription management, usage metering, and invoicing.</p>
                <Link href="/pricing">
                  <Button variant="outline" className="mt-4" size="sm">View Pricing Plans</Button>
                </Link>
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
              {/* Key creation form */}
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Key Name</Label>
                  <Input
                    placeholder="e.g. Production Backend"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="w-40 space-y-1">
                  <Label className="text-xs">Environment</Label>
                  <Select value={newKeyEnv} onValueChange={(v) => setNewKeyEnv(v as 'development' | 'production')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createNewApiKey} disabled={creatingKey || !newKeyName.trim()}>
                  {creatingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" />Create Key</>}
                </Button>
              </div>

              {/* Newly created key alert */}
              {newlyCreatedKey && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 p-4 space-y-2">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    New API key created — copy it now, this is the only time it will be shown:
                  </p>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={newlyCreatedKey} className="font-mono text-sm bg-white dark:bg-black" />
                    <Button variant="outline" size="icon" onClick={() => {
                      navigator.clipboard.writeText(newlyCreatedKey);
                      toast({ title: 'Copied', description: 'API key copied to clipboard.' });
                    }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Existing keys table */}
              {apiKeysList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key Prefix</TableHead>
                      <TableHead>Environment</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeysList.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.name}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {showKeyId === k.id ? k.keyPrefix + '••••••••••••' : '••••••••••••••••••'}
                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => setShowKeyId(showKeyId === k.id ? null : k.id)}>
                            {showKeyId === k.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{k.environment}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(k.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => revokeKey(k.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" />Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                  <Code className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No API keys yet. Create one to get started with the SDK.</p>
                </div>
              )}

              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-3">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Keep your API keys secure. Never expose them in client-side code or public repositories.
                </p>
              </div>

              <Separator />

              {/* Webhooks section */}
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

                {webhooks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Events</TableHead>
                        <TableHead>Status</TableHead>
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    No webhooks configured. Use the SDK setup page to add webhooks.
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Manage webhooks via the <Link href="/sdk" className="underline">SDK setup page</Link> or the REST API.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications ───────────────────────────────────── */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Notification Preferences</CardTitle>
                {prefsSaving ? (
                  <Badge variant="outline" className="text-xs"><Loader2 className="h-3 w-3 mr-1 animate-spin inline" />Saving…</Badge>
                ) : prefsLoaded ? (
                  <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50"><CheckCircle2 className="h-3 w-3 mr-1 inline" />Synced</Badge>
                ) : null}
              </div>
              <CardDescription>Control how and when you receive alerts. Preferences are saved to your account and sync across devices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive alerts via email for critical events</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={(v) => {
                    setEmailNotifications(v);
                    savePref('notifications', { emailNotifications: v, slackNotifications });
                  }} />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Slack Integration</p>
                    <p className="text-sm text-muted-foreground">Post alerts to a Slack channel</p>
                  </div>
                  <Switch checked={slackNotifications} onCheckedChange={(v) => {
                    setSlackNotifications(v);
                    savePref('notifications', { emailNotifications, slackNotifications: v });
                  }} />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Alert Rules</h4>
                {[
                  { label: 'Churn Risk Alert', desc: 'When a user moves to AtRisk or Critical tier' },
                  { label: 'Expansion Signal', desc: 'When an account triggers an expansion signal' },
                  { label: 'Deliverability Drop', desc: 'When delivery rate falls below 95%' },
                  { label: 'Revenue Milestone', desc: 'When MRR crosses a defined threshold' },
                  { label: 'Activation Stall', desc: 'When a trial user is stuck for >7 days' },
                ].map((rule) => (
                  <div key={rule.label} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{rule.label}</p>
                      <p className="text-xs text-muted-foreground">{rule.desc}</p>
                    </div>
                    <Switch checked={alertRules[rule.label] ?? false} onCheckedChange={(v) => {
                      const updated = { ...alertRules, [rule.label]: v };
                      setAlertRules(updated);
                      savePref('alert_rules', { rules: updated });
                    }} />
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
            <CodeBlock code={code} />
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
