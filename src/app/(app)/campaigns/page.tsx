'use client';

/* ==========================================================================
 * Campaigns Dashboard — Analytics, Campaign List & Revenue Tracking
 *
 * Revenue-first KPI cards, full campaign table with status/segment/revenue,
 * and "Create Campaign" button that navigates to /campaigns/new.
 * Editing a campaign → /campaigns/new?id=xxx
 * ========================================================================== */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
    PlusCircle, MoreHorizontal, Mail, Send, Eye,
    Pencil, Trash2, Play, DollarSign,
    MousePointerClick, Megaphone, TrendingUp,
    AlertCircle, CheckCircle2, Clock, Pause,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────── */

interface EmailCampaign {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    type: string;
    templateId: string | null;
    segmentId: string | null;
    fromName: string | null;
    fromEmail: string | null;
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    totalUnsubscribed: number;
    totalRevenue: number;
    scheduledAt: string | null;
    sentAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

interface Segment {
    id: string;
    name: string;
}

/* ── Constants ──────────────────────────────────────────────────────── */

const statusStyles: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    scheduled: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    archived: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    sending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const statusIcons: Record<string, React.ElementType> = {
    draft: Pencil,
    scheduled: Clock,
    sending: Send,
    sent: CheckCircle2,
    completed: CheckCircle2,
    paused: Pause,
    failed: AlertCircle,
};

/* ── Component ───────────────────────────────────────────────────────── */

export default function CampaignsPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    // Send state
    const [sending, setSending] = useState<string | null>(null);

    /* ── Fetch ──────────────────────────────────────── */
    const fetchAll = useCallback(async () => {
        try {
            const [cRes, sRes] = await Promise.all([
                fetch('/api/v1/email-campaigns'),
                fetch('/api/v1/segments'),
            ]);
            if (cRes.ok) { const j = await cRes.json(); setCampaigns(j.data ?? []); }
            if (sRes.ok) { const j = await sRes.json(); setSegments(j.data ?? []); }
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    /* ── Campaign Actions ────────────────────────────── */
    const sendCampaign = async (id: string) => {
        setSending(id);
        try {
            await fetch('/api/v1/email-campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send', id }),
            });
            await fetchAll();
        } finally { setSending(null); }
    };

    const deleteCampaign = async (id: string) => {
        await fetch(`/api/v1/email-campaigns/${id}`, { method: 'DELETE' });
        fetchAll();
    };

    /* ── Computed ───────────────────────────────────── */
    const filteredCampaigns = statusFilter === 'all'
        ? campaigns
        : campaigns.filter(c => c.status === statusFilter);

    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => ['sent', 'sending', 'completed', 'active'].includes(c.status)).length;
    const draftCampaigns = campaigns.filter(c => c.status === 'draft').length;
    const scheduledCampaigns = campaigns.filter(c => c.status === 'scheduled').length;

    const totalSent = campaigns.reduce((s, c) => s + (c.totalSent ?? 0), 0);
    const totalDelivered = campaigns.reduce((s, c) => s + (c.totalDelivered ?? 0), 0);
    const totalOpened = campaigns.reduce((s, c) => s + (c.totalOpened ?? 0), 0);
    const totalClicked = campaigns.reduce((s, c) => s + (c.totalClicked ?? 0), 0);
    const totalBounced = campaigns.reduce((s, c) => s + (c.totalBounced ?? 0), 0);
    const totalUnsubscribed = campaigns.reduce((s, c) => s + (c.totalUnsubscribed ?? 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (c.totalRevenue ?? 0), 0);

    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100) : 0;
    const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100) : 0;
    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100) : 0;
    const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100) : 0;
    const revenuePerEmail = totalSent > 0 ? (totalRevenue / totalSent) : 0;

    /* ── Render ────────────────────────────────────────── */
    return (
        <div className="grid gap-6">
            {/* ═══ Page Header ═══════════════════════════════════════════ */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
                    <p className="text-sm text-muted-foreground">
                        Send targeted email campaigns to your audience segments and track revenue performance.
                    </p>
                </div>
                <Button asChild size="default">
                    <Link href="/campaigns/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Campaign
                    </Link>
                </Button>
            </div>

            {/* ═══ KPI Cards ════════════════════════════════════════════ */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-emerald-200 dark:border-emerald-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Campaign Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-24" /> : (
                            <>
                                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                    ${totalRevenue.toLocaleString()}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    ${revenuePerEmail.toFixed(2)} per email sent
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-24" /> : (
                            <>
                                <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground">
                                    {totalCampaigns} campaign{totalCampaigns !== 1 ? 's' : ''} &middot; {deliveryRate.toFixed(1)}% delivered
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-16" /> : (
                            <>
                                <div className="text-2xl font-bold">{openRate.toFixed(1)}%</div>
                                <p className="text-xs text-muted-foreground">
                                    {totalOpened.toLocaleString()} opens
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
                        <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-16" /> : (
                            <>
                                <div className="text-2xl font-bold">{clickRate.toFixed(1)}%</div>
                                <p className="text-xs text-muted-foreground">
                                    {totalClicked.toLocaleString()} clicks
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ═══ Campaign Status Summary ═══════════════════════════════ */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="col-span-full md:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Campaign Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-20 w-full" /> : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full p-2 bg-gray-100 dark:bg-gray-800">
                                        <Pencil className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{draftCampaigns}</p>
                                        <p className="text-xs text-muted-foreground">Drafts</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full p-2 bg-purple-100 dark:bg-purple-900/30">
                                        <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{scheduledCampaigns}</p>
                                        <p className="text-xs text-muted-foreground">Scheduled</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full p-2 bg-green-100 dark:bg-green-900/30">
                                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{activeCampaigns}</p>
                                        <p className="text-xs text-muted-foreground">Sent / Active</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full p-2 bg-blue-100 dark:bg-blue-900/30">
                                        <Megaphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{totalCampaigns}</p>
                                        <p className="text-xs text-muted-foreground">Total</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-full md:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Engagement Funnel</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-20 w-full" /> : (
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Delivered</span>
                                        <span className="font-medium tabular-nums">{deliveryRate.toFixed(1)}%</span>
                                    </div>
                                    <Progress value={deliveryRate} className="h-2" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Opened</span>
                                        <span className="font-medium tabular-nums">{openRate.toFixed(1)}%</span>
                                    </div>
                                    <Progress value={openRate} className="h-2" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Clicked</span>
                                        <span className="font-medium tabular-nums">{clickRate.toFixed(1)}%</span>
                                    </div>
                                    <Progress value={clickRate} className="h-2" />
                                </div>
                                <div className="flex items-center justify-between text-xs pt-1 border-t">
                                    <span className="text-muted-foreground">
                                        Bounce: <span className="font-medium">{bounceRate.toFixed(1)}%</span> ({totalBounced})
                                    </span>
                                    <span className="text-muted-foreground">
                                        Unsubs: <span className="font-medium">{totalUnsubscribed}</span>
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ═══ Campaigns Table ═══════════════════════════════════════ */}
            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>All Campaigns</CardTitle>
                        <CardDescription className="mt-1">
                            Manage and track your email campaigns. Click a campaign to edit it.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-32">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="sending">Sending</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="paused">Paused</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Campaign</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Segment</TableHead>
                                    <TableHead className="text-right">Sent</TableHead>
                                    <TableHead className="text-right">Open %</TableHead>
                                    <TableHead className="text-right">Click %</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCampaigns.map((c) => {
                                    const or = c.totalSent > 0 ? ((c.totalOpened / c.totalSent) * 100).toFixed(1) : '—';
                                    const cr = c.totalSent > 0 ? ((c.totalClicked / c.totalSent) * 100).toFixed(1) : '—';
                                    const seg = segments.find(s => s.id === c.segmentId);
                                    const rev = c.totalRevenue ?? 0;
                                    const StatusIcon = statusIcons[c.status] ?? Megaphone;
                                    return (
                                        <TableRow
                                            key={c.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => router.push(`/campaigns/new?id=${c.id}`)}
                                        >
                                            <TableCell>
                                                <div className="flex items-start gap-3">
                                                    <div className={cn(
                                                        'rounded-full p-1.5 mt-0.5 shrink-0',
                                                        c.status === 'draft' && 'bg-gray-100 dark:bg-gray-800',
                                                        c.status === 'scheduled' && 'bg-purple-100 dark:bg-purple-900/30',
                                                        c.status === 'sending' && 'bg-amber-100 dark:bg-amber-900/30',
                                                        ['sent', 'completed', 'active'].includes(c.status) && 'bg-green-100 dark:bg-green-900/30',
                                                        c.status === 'failed' && 'bg-red-100 dark:bg-red-900/30',
                                                        c.status === 'paused' && 'bg-yellow-100 dark:bg-yellow-900/30',
                                                    )}>
                                                        <StatusIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{c.name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Badge variant="outline" className="text-[10px] capitalize py-0">
                                                                {c.type.replace('_', ' ')}
                                                            </Badge>
                                                            {c.sentAt && (
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    Sent {new Date(c.sentAt).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                            {c.scheduledAt && c.status === 'scheduled' && (
                                                                <span className="text-[10px] text-purple-600 dark:text-purple-400">
                                                                    Scheduled {new Date(c.scheduledAt).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                            {!c.sentAt && !c.scheduledAt && (
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    Created {new Date(c.createdAt).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn('border-transparent text-xs', statusStyles[c.status] ?? statusStyles.draft)}>
                                                    {c.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs">{seg?.name ?? 'All users'}</TableCell>
                                            <TableCell className="tabular-nums text-right">{(c.totalSent ?? 0).toLocaleString()}</TableCell>
                                            <TableCell className="tabular-nums text-right">{or}{or !== '—' ? '%' : ''}</TableCell>
                                            <TableCell className="tabular-nums text-right">{cr}{cr !== '—' ? '%' : ''}</TableCell>
                                            <TableCell className="tabular-nums text-right font-medium text-emerald-600 dark:text-emerald-400">
                                                {rev > 0 ? `$${rev.toLocaleString()}` : '—'}
                                            </TableCell>
                                            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => router.push(`/campaigns/new?id=${c.id}`)}>
                                                            <Pencil className="h-3.5 w-3.5 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        {c.status === 'draft' && (
                                                            <DropdownMenuItem
                                                                onClick={() => sendCampaign(c.id)}
                                                                disabled={sending === c.id || !c.templateId}
                                                            >
                                                                <Play className="h-3.5 w-3.5 mr-2" />
                                                                {sending === c.id ? 'Sending...' : 'Send Now'}
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive" onClick={() => deleteCampaign(c.id)}>
                                                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {filteredCampaigns.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                                            <div className="space-y-3">
                                                <Megaphone className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                                                <div>
                                                    <p className="font-medium">
                                                        {campaigns.length === 0
                                                            ? 'No campaigns yet'
                                                            : 'No campaigns match your filter'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {campaigns.length === 0
                                                            ? 'Create your first email campaign to start engaging your audience.'
                                                            : 'Try adjusting your status filter.'}
                                                    </p>
                                                </div>
                                                {campaigns.length === 0 && (
                                                    <Button size="sm" asChild>
                                                        <Link href="/campaigns/new">
                                                            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                                                            Create Your First Campaign
                                                        </Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
