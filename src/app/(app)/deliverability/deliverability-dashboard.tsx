'use client';

/* ==========================================================================
 * Deliverability Dashboard — Domain Authentication & Email Health
 *
 * Full-featured domain management:
 *  - Add/remove sending domains
 *  - View required DNS records with copy-to-clipboard
 *  - One-click DNS verification (SPF, DKIM, DMARC, MX)
 *  - Auth score per domain
 *  - Best practices guide
 * ========================================================================== */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader,
    DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
    Alert, AlertDescription, AlertTitle,
} from '@/components/ui/alert';
import {
    MailCheck, MailOpen, MousePointerClick,
    Shield, Globe, CheckCircle2, XCircle, Clock, TrendingUp,
    PlusCircle, RefreshCw, Copy, Check, Trash2, AlertTriangle,
    ShieldCheck, ShieldAlert, ArrowRight, Info, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Types ──────────────────────────────────────────────────────────── */

interface DnsRecord {
    type: string;
    host: string;
    value: string;
    purpose: string;
}

interface DnsCheckResult {
    verified: boolean;
    found: boolean;
    record: string | null;
    expectedHost: string;
    expectedValue: string;
    error?: string;
    details?: string;
}

interface VerificationResult {
    domain: string;
    spf: DnsCheckResult;
    dkim: DnsCheckResult;
    dmarc: DnsCheckResult;
    mx: DnsCheckResult;
    overallStatus: string;
    score: number;
    recommendations: string[];
    checkedAt: string;
}

interface SendingDomain {
    id: string;
    domain: string;
    status: string;
    dkimVerified: boolean;
    spfVerified: boolean;
    dmarcVerified: boolean;
    mxVerified: boolean;
    authScore: number;
    dkimSelector: string | null;
    verificationDetails: VerificationResult | null;
    requiredRecords: DnsRecord[] | null;
    addedAt: string;
    lastCheckedAt: string | null;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

const statusStyles: Record<string, string> = {
    verified: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
};

function AuthIcon({ ok }: { ok: boolean }) {
    return ok
        ? <CheckCircle2 className="h-4 w-4 text-green-600" />
        : <XCircle className="h-4 w-4 text-red-500" />;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <Button variant="ghost" size="sm" onClick={copy} className="h-7 px-2 text-xs">
            {copied ? <Check className="h-3 w-3 mr-1 text-green-600" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? 'Copied' : 'Copy'}
        </Button>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
 * Main Component
 * ═══════════════════════════════════════════════════════════════════════ */

export default function DeliverabilityDashboard() {
    const [domains, setDomains] = useState<SendingDomain[]>([]);
    const [loading, setLoading] = useState(true);

    // Add domain dialog
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newDomain, setNewDomain] = useState('');
    const [adding, setAdding] = useState(false);

    // Verification state
    const [verifying, setVerifying] = useState<string | null>(null);
    const [verifyResult, setVerifyResult] = useState<Record<string, VerificationResult>>({});

    // Expanded domain
    const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

    /* ── Fetch ──────────────────────────────────────── */
    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/domains');
            if (res.ok) {
                const j = await res.json();
                setDomains(j.data ?? []);
            }
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── Add Domain ─────────────────────────────────── */
    const handleAddDomain = async () => {
        if (!newDomain.trim()) return;
        setAdding(true);
        try {
            const res = await fetch('/api/v1/domains', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add', domain: newDomain.trim() }),
            });
            if (res.ok) {
                setNewDomain('');
                setAddDialogOpen(false);
                await fetchData();
            }
        } finally {
            setAdding(false);
        }
    };

    /* ── Verify Domain ──────────────────────────────── */
    const handleVerifyDomain = async (domain: string) => {
        setVerifying(domain);
        try {
            const res = await fetch('/api/v1/domains', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify', domain }),
            });
            if (res.ok) {
                const j = await res.json();
                if (j.data?.verification) {
                    setVerifyResult(prev => ({ ...prev, [domain]: j.data.verification }));
                }
                await fetchData();
            }
        } finally {
            setVerifying(null);
        }
    };

    /* ── Delete Domain ──────────────────────────────── */
    const handleDeleteDomain = async (id: string) => {
        await fetch(`/api/v1/domains/${id}`, { method: 'DELETE' });
        await fetchData();
    };

    /* ── Verify All ─────────────────────────────────── */
    const handleVerifyAll = async () => {
        setVerifying('__all__');
        try {
            await fetch('/api/v1/domains', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify-all' }),
            });
            await fetchData();
        } finally {
            setVerifying(null);
        }
    };

    /* ── Computed ────────────────────────────────────── */
    const fullyVerified = domains.filter(d => d.status === 'verified').length;
    const partiallyVerified = domains.filter(d => d.status === 'partial').length;
    const pendingDomains = domains.filter(d => d.status === 'pending').length;

    /* ── Render ──────────────────────────────────────── */
    return (
        <div className="grid gap-6">
            {/* ── Page Header ─────────────────────────────────── */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Deliverability & Domain Authentication</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your sending domains, DNS authentication, and email delivery health.
                </p>
            </div>

            {/* ── KPI Cards ──────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Domains</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-12" /> : (
                            <>
                                <div className="text-2xl font-bold">{domains.length}</div>
                                <p className="text-xs text-muted-foreground">{fullyVerified} fully authenticated</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className={cn(
                    fullyVerified === domains.length && domains.length > 0
                        ? 'border-green-200 dark:border-green-800'
                        : pendingDomains > 0 ? 'border-yellow-200 dark:border-yellow-800' : '',
                )}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Auth Status</CardTitle>
                        {fullyVerified === domains.length && domains.length > 0
                            ? <ShieldCheck className="h-4 w-4 text-green-600" />
                            : <ShieldAlert className="h-4 w-4 text-amber-500" />}
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-16" /> : (
                            <>
                                <div className={cn(
                                    'text-2xl font-bold',
                                    fullyVerified === domains.length && domains.length > 0 ? 'text-green-600' : 'text-amber-600',
                                )}>
                                    {domains.length === 0 ? 'No Domains'
                                        : fullyVerified === domains.length ? 'All Verified'
                                            : `${pendingDomains + partiallyVerified} Need Action`}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {partiallyVerified > 0 ? `${partiallyVerified} partially verified` : '\u00a0'}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Auth Score</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-16" /> : (
                            <>
                                <div className="text-2xl font-bold">
                                    {domains.length > 0
                                        ? Math.round(domains.reduce((s, d) => s + (d.authScore ?? 0), 0) / domains.length)
                                        : 0}
                                    <span className="text-base font-normal text-muted-foreground">/100</span>
                                </div>
                                <p className="text-xs text-muted-foreground">SPF + DKIM + DMARC + MX</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">DKIM Status</CardTitle>
                        <MailCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-16" /> : (
                            <>
                                <div className="text-2xl font-bold">
                                    {domains.filter(d => d.dkimVerified).length}/{domains.length}
                                </div>
                                <p className="text-xs text-muted-foreground">DKIM-authenticated domains</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Alerts ─────────────────────────────────────── */}
            {!loading && domains.length === 0 && (
                <Alert variant="destructive" className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 [&>svg]:text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No sending domains configured</AlertTitle>
                    <AlertDescription>
                        Email authentication is critical for deliverability. Without SPF, DKIM, and DMARC records,
                        your emails are much more likely to land in spam. Add your first sending domain to get started.
                    </AlertDescription>
                </Alert>
            )}

            {!loading && domains.length > 0 && pendingDomains > 0 && (
                <Alert className="border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-100">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <AlertTitle>Domains pending verification</AlertTitle>
                    <AlertDescription>
                        {pendingDomains} domain(s) need DNS records configured. Add the required records at your
                        domain registrar, then click &ldquo;Verify DNS&rdquo; to confirm.
                    </AlertDescription>
                </Alert>
            )}

            {/* ═══ Domain Authentication Section ═══════════════ */}
            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Domain Authentication
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Add your sending domains and configure DNS records for SPF, DKIM, and DMARC.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {domains.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleVerifyAll}
                                disabled={verifying === '__all__'}
                            >
                                {verifying === '__all__'
                                    ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                    : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                                Verify All
                            </Button>
                        )}
                        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <PlusCircle className="h-3.5 w-3.5 mr-1" />
                                    Add Domain
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Sending Domain</DialogTitle>
                                    <DialogDescription>
                                        Enter the domain you&apos;ll use to send emails (e.g., yoursaas.com).
                                        We&apos;ll generate the DNS records you need to add.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="domain-input">Domain</Label>
                                        <Input
                                            id="domain-input"
                                            placeholder="yoursaas.com"
                                            value={newDomain}
                                            onChange={e => setNewDomain(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Enter just the domain — no https:// or www.
                                        </p>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleAddDomain} disabled={adding || !newDomain.trim()}>
                                        {adding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-1" />}
                                        Add Domain
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                        </div>
                    ) : domains.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Globe className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="font-medium">No sending domains</p>
                            <p className="text-sm mt-1">Add a domain to start authenticating your emails.</p>
                        </div>
                    ) : (
                        <Accordion
                            type="single"
                            collapsible
                            value={expandedDomain ?? undefined}
                            onValueChange={v => setExpandedDomain(v ?? null)}
                        >
                            {domains.map((d) => {
                                const vr = (d.verificationDetails as unknown as VerificationResult | null) ?? verifyResult[d.domain];
                                return (
                                    <AccordionItem key={d.id} value={d.id}>
                                        <AccordionTrigger className="hover:no-underline py-3">
                                            <div className="flex items-center gap-4 w-full mr-4">
                                                <div className="flex-1 text-left">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-base">{d.domain}</span>
                                                        <Badge className={cn('border-transparent text-xs', statusStyles[d.status] ?? statusStyles.pending)}>
                                                            {d.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <span className="font-medium">SPF</span>
                                                            <AuthIcon ok={d.spfVerified} />
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <span className="font-medium">DKIM</span>
                                                            <AuthIcon ok={d.dkimVerified} />
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <span className="font-medium">DMARC</span>
                                                            <AuthIcon ok={d.dmarcVerified} />
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <span className="font-medium">MX</span>
                                                            <AuthIcon ok={d.mxVerified} />
                                                        </span>
                                                        <span className="text-muted-foreground/60">|</span>
                                                        <span>Score: <b>{d.authScore ?? 0}</b>/100</span>
                                                    </div>
                                                </div>
                                                <div className="hidden sm:flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8"
                                                        onClick={() => handleVerifyDomain(d.domain)}
                                                        disabled={verifying === d.domain}
                                                    >
                                                        {verifying === d.domain
                                                            ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                            : <RefreshCw className="h-3 w-3 mr-1" />}
                                                        Verify DNS
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-destructive hover:text-destructive"
                                                        onClick={() => handleDeleteDomain(d.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4 pt-2">
                                                {/* Auth Score */}
                                                <div>
                                                    <div className="flex items-center justify-between text-sm mb-1">
                                                        <span className="text-muted-foreground">Authentication Score</span>
                                                        <span className={cn(
                                                            'font-bold',
                                                            (d.authScore ?? 0) >= 90 ? 'text-green-600' :
                                                                (d.authScore ?? 0) >= 65 ? 'text-amber-600' : 'text-red-600',
                                                        )}>
                                                            {d.authScore ?? 0}/100
                                                        </span>
                                                    </div>
                                                    <Progress value={d.authScore ?? 0} className="h-2" />
                                                </div>

                                                {/* Required DNS Records */}
                                                <div>
                                                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                                        <Info className="h-4 w-4 text-blue-500" />
                                                        Required DNS Records
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground mb-3">
                                                        Add these records at your domain registrar (GoDaddy, Cloudflare, Namecheap, etc.).
                                                        After adding, click &ldquo;Verify DNS&rdquo; to confirm.
                                                    </p>
                                                    <div className="space-y-3">
                                                        {(d.requiredRecords ?? []).map((record, idx) => {
                                                            const isVerified = record.purpose === 'SPF' ? d.spfVerified
                                                                : record.purpose === 'DKIM' ? d.dkimVerified
                                                                    : record.purpose === 'DMARC' ? d.dmarcVerified
                                                                        : d.mxVerified;
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className={cn(
                                                                        'rounded-lg border p-3',
                                                                        isVerified
                                                                            ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                                                                            : 'bg-muted/30',
                                                                    )}
                                                                >
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                                                                                {record.type}
                                                                            </Badge>
                                                                            <span className="text-sm font-medium">{record.purpose}</span>
                                                                            {isVerified
                                                                                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                                                                : <Clock className="h-3.5 w-3.5 text-amber-500" />}
                                                                        </div>
                                                                        <CopyButton text={record.value} />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-start gap-2 text-xs">
                                                                            <span className="text-muted-foreground min-w-[40px] font-medium">Host:</span>
                                                                            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">
                                                                                {record.host}
                                                                            </code>
                                                                        </div>
                                                                        <div className="flex items-start gap-2 text-xs">
                                                                            <span className="text-muted-foreground min-w-[40px] font-medium">Value:</span>
                                                                            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">
                                                                                {record.value}
                                                                            </code>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Verification Details */}
                                                {vr && (
                                                    <div>
                                                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                                            <Shield className="h-4 w-4 text-blue-500" />
                                                            Last Verification Result
                                                        </h4>
                                                        <div className="space-y-2">
                                                            <VerificationDetail label="SPF" result={vr.spf} />
                                                            <VerificationDetail label="DKIM" result={vr.dkim} />
                                                            <VerificationDetail label="DMARC" result={vr.dmarc} />
                                                            <VerificationDetail label="MX" result={vr.mx} />
                                                        </div>

                                                        {vr.recommendations.length > 0 && (
                                                            <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3">
                                                                <h5 className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">
                                                                    Recommendations
                                                                </h5>
                                                                <ul className="space-y-1">
                                                                    {vr.recommendations.map((r, i) => (
                                                                        <li key={i} className="text-xs text-blue-700 dark:text-blue-400 flex items-start gap-1.5">
                                                                            <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
                                                                            <span>{r}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        <p className="text-[10px] text-muted-foreground mt-2">
                                                            Last checked: {new Date(vr.checkedAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Mobile Actions */}
                                                <div className="flex items-center gap-2 sm:hidden pt-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleVerifyDomain(d.domain)}
                                                        disabled={verifying === d.domain}
                                                        className="flex-1"
                                                    >
                                                        {verifying === d.domain
                                                            ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                            : <RefreshCw className="h-3 w-3 mr-1" />}
                                                        Verify DNS
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDeleteDomain(d.id)}
                                                        className="flex-1"
                                                    >
                                                        <Trash2 className="h-3 w-3 mr-1" />
                                                        Remove
                                                    </Button>
                                                </div>

                                                {d.lastCheckedAt && (
                                                    <p className="text-[10px] text-muted-foreground">
                                                        Added: {new Date(d.addedAt).toLocaleDateString()} · Last verified: {new Date(d.lastCheckedAt).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    )}
                </CardContent>
            </Card>

            {/* ── Best Practices ──────────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        Email Deliverability Best Practices
                    </CardTitle>
                    <CardDescription>
                        Follow these guidelines to maximize inbox placement for every email.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <BestPracticeCard
                            icon={<Shield className="h-5 w-5 text-blue-600" />}
                            title="Authenticate Your Domain"
                            description="Configure SPF, DKIM, and DMARC records. This proves to mailbox providers that you're authorized to send from your domain."
                            status={fullyVerified > 0 ? 'done' : 'pending'}
                        />
                        <BestPracticeCard
                            icon={<MailCheck className="h-5 w-5 text-green-600" />}
                            title="Clean Your Lists"
                            description="Remove invalid addresses, bounced contacts, and unengaged users. Our suppression system automatically handles bounces and complaints."
                            status="info"
                        />
                        <BestPracticeCard
                            icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
                            title="Warm Up Gradually"
                            description="If you're sending from a new domain or IP, start with small volumes and increase over 2-4 weeks to build sender reputation."
                            status="info"
                        />
                        <BestPracticeCard
                            icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
                            title="Monitor Bounce Rate"
                            description="Keep bounce rate under 2%. High bounce rates damage your sender reputation. Use email validation before sending."
                            status="info"
                        />
                        <BestPracticeCard
                            icon={<MailOpen className="h-5 w-5 text-indigo-600" />}
                            title="Respect Unsubscribes"
                            description="Every email includes an RFC 8058 one-click unsubscribe header. Honoring opt-outs is critical for compliance and reputation."
                            status="done"
                        />
                        <BestPracticeCard
                            icon={<MousePointerClick className="h-5 w-5 text-rose-600" />}
                            title="Avoid Spam Triggers"
                            description="Don't use excessive caps, misleading subjects, or spammy language. Our system tracks complaint rates to alert you early."
                            status="info"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/* ── VerificationDetail ─────────────────────────────────────────────── */

function VerificationDetail({ label, result }: { label: string; result: DnsCheckResult }) {
    return (
        <div className={cn(
            'rounded-md border px-3 py-2',
            result.verified
                ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                : result.found
                    ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                    : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
        )}>
            <div className="flex items-center gap-2 mb-0.5">
                {result.verified
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    : result.found
                        ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                <span className="text-sm font-medium">{label}</span>
                <Badge variant="outline" className="text-[9px] ml-auto">
                    {result.verified ? 'Verified' : result.found ? 'Found — needs fix' : 'Not found'}
                </Badge>
            </div>
            {result.details && (
                <p className="text-xs text-muted-foreground mt-0.5">{result.details}</p>
            )}
            {result.record && (
                <div className="mt-1 flex items-start gap-1">
                    <span className="text-[10px] text-muted-foreground shrink-0">Found:</span>
                    <code className="text-[10px] font-mono bg-muted px-1 rounded break-all">{result.record}</code>
                </div>
            )}
        </div>
    );
}

/* ── BestPracticeCard ───────────────────────────────────────────────── */

function BestPracticeCard({ icon, title, description, status }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    status: 'done' | 'pending' | 'info';
}) {
    return (
        <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-medium text-sm">{title}</span>
                </div>
                {status === 'done' && (
                    <Badge className="bg-green-100 text-green-700 text-[10px] border-transparent">
                        <Check className="h-2.5 w-2.5 mr-0.5" /> Active
                    </Badge>
                )}
                {status === 'pending' && (
                    <Badge className="bg-amber-100 text-amber-700 text-[10px] border-transparent">
                        <Clock className="h-2.5 w-2.5 mr-0.5" /> Pending
                    </Badge>
                )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
    );
}
