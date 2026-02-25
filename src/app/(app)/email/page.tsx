'use client';

/* ==========================================================================
 * Email Dashboard — Campaigns & Templates Overview
 *
 * Revenue-first KPI cards, campaign table with status/segment/revenue,
 * and template table with send/open metrics.
 *
 * Campaign creation → navigates to /campaigns/new (full-page builder)
 * Template creation → navigates to /email-builder (dual-mode editor)
 * Template editing → navigates to /email-builder?id=xxx
 * Campaign editing → navigates to /campaigns/new?id=xxx
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
import {
    Dialog, DialogContent, DialogDescription,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
    PlusCircle, MoreHorizontal, Mail, Send, Eye,
    Pencil, Trash2, Play, FileText, DollarSign,
    MousePointerClick, TrendingUp, ExternalLink,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────── */

interface EmailTemplate {
    id: string;
    name: string;
    status: string;
    subject: string;
    previewText: string | null;
    bodyHtml: string;
    variables: Array<{ key: string; label: string; source: string; fallback: string }>;
    category: string | null;
    sendCount: number;
    openCount: number;
    clickCount: number;
    createdAt: string;
    updatedAt: string;
}

interface EmailCampaign {
    id: string;
    name: string;
    status: string;
    type: string;
    templateId: string | null;
    segmentId: string | null;
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    totalUnsubscribed: number;
    totalRevenue: number;
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

/* ── Component ───────────────────────────────────────────────────────── */

export default function EmailPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('campaigns');
    const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    // Preview dialog
    const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewSubject, setPreviewSubject] = useState('');

    // Send state
    const [sending, setSending] = useState<string | null>(null);

    /* ── Fetch ──────────────────────────────────────── */
    const fetchAll = useCallback(async () => {
        try {
            const [cRes, tRes, sRes] = await Promise.all([
                fetch('/api/v1/email-campaigns'),
                fetch('/api/v1/email-templates'),
                fetch('/api/v1/segments'),
            ]);
            if (cRes.ok) { const j = await cRes.json(); setCampaigns(j.data ?? []); }
            if (tRes.ok) { const j = await tRes.json(); setTemplates(j.data ?? []); }
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

    /* ── Template Actions ────────────────────────────── */
    const deleteTemplate = async (id: string) => {
        await fetch(`/api/v1/email-templates/${id}`, { method: 'DELETE' });
        fetchAll();
    };

    const previewTemplate = async (id: string) => {
        const res = await fetch(`/api/v1/email-templates/${id}?preview=true`);
        if (res.ok) {
            const json = await res.json();
            setPreviewSubject(json.data?.resolvedSubject ?? json.data?.subject ?? '');
            setPreviewHtml(json.data?.resolvedBodyHtml ?? json.data?.bodyHtml ?? '');
            setPreviewDialogOpen(true);
        }
    };

    /* ── Computed ───────────────────────────────────── */
    const filteredCampaigns = statusFilter === 'all'
        ? campaigns
        : campaigns.filter(c => c.status === statusFilter);

    const totalSent = campaigns.reduce((s, c) => s + (c.totalSent ?? 0), 0);
    const totalOpened = campaigns.reduce((s, c) => s + (c.totalOpened ?? 0), 0);
    const totalClicked = campaigns.reduce((s, c) => s + (c.totalClicked ?? 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (c.totalRevenue ?? 0), 0);
    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0.0';
    const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0.0';
    const revenuePerEmail = totalSent > 0 ? (totalRevenue / totalSent) : 0;

    /* ── Render ────────────────────────────────────────── */
    return (
        <div className="grid gap-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-emerald-200 dark:border-emerald-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Email Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-24" /> : (
                            <>
                                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${totalRevenue.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground">${revenuePerEmail.toFixed(2)} per email sent</p>
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
                                <p className="text-xs text-muted-foreground">{campaigns.length} campaign(s)</p>
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
                                <div className="text-2xl font-bold">{openRate}%</div>
                                <p className="text-xs text-muted-foreground">{totalOpened.toLocaleString()} opens</p>
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
                                <div className="text-2xl font-bold">{clickRate}%</div>
                                <p className="text-xs text-muted-foreground">{totalClicked.toLocaleString()} clicks</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabs: Campaigns & Templates */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                    <TabsTrigger value="templates">Email Templates</TabsTrigger>
                </TabsList>

                {/* ── Campaigns Tab ─────────────────────────────── */}
                <TabsContent value="campaigns">
                    <Card>
                        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Email Campaigns</CardTitle>
                                <CardDescription className="mt-1">
                                    Send targeted emails to user segments. Each campaign references an email template.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="scheduled">Scheduled</SelectItem>
                                        <SelectItem value="sent">Sent</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="paused">Paused</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button asChild>
                                    <Link href="/campaigns/new">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Create Campaign
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Campaign</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Type</TableHead>
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
                                            return (
                                                <TableRow key={c.id}>
                                                    <TableCell>
                                                        <p className="font-medium">{c.name}</p>
                                                        {c.sentAt && (
                                                            <p className="text-xs text-muted-foreground">
                                                                Sent {new Date(c.sentAt).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={cn('border-transparent', statusStyles[c.status] ?? statusStyles.draft)}>
                                                            {c.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="capitalize text-xs">
                                                            {c.type.replace('_', ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs">{seg?.name ?? 'All users'}</TableCell>
                                                    <TableCell className="tabular-nums text-right">{(c.totalSent ?? 0).toLocaleString()}</TableCell>
                                                    <TableCell className="tabular-nums text-right">{or}{or !== '—' ? '%' : ''}</TableCell>
                                                    <TableCell className="tabular-nums text-right">{cr}{cr !== '—' ? '%' : ''}</TableCell>
                                                    <TableCell className="tabular-nums text-right font-medium text-emerald-600 dark:text-emerald-400">
                                                        {rev > 0 ? `$${rev.toLocaleString()}` : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
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
                                                <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                                                    {campaigns.length === 0
                                                        ? 'No campaigns yet. Create your first email campaign.'
                                                        : 'No campaigns match this filter.'}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Email Templates Tab ───────────────────────── */}
                <TabsContent value="templates">
                    <Card>
                        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Email Templates</CardTitle>
                                <CardDescription className="mt-1">
                                    Reusable email designs with {'{{variable}}'} personalization. Build in the email builder.
                                </CardDescription>
                            </div>
                            <Button asChild>
                                <Link href="/email-builder">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Create Email
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Template</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Subject</TableHead>
                                            <TableHead>Variables</TableHead>
                                            <TableHead className="text-right">Sent</TableHead>
                                            <TableHead className="text-right">Open %</TableHead>
                                            <TableHead><span className="sr-only">Actions</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {templates.map((t) => {
                                            const or = (t.sendCount ?? 0) > 0 ? (((t.openCount ?? 0) / t.sendCount) * 100).toFixed(1) : '—';
                                            return (
                                                <TableRow key={t.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{t.name}</p>
                                                            {t.category && (
                                                                <Badge variant="outline" className="text-xs mt-0.5 capitalize">{t.category}</Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={cn('border-transparent', statusStyles[t.status] ?? statusStyles.draft)}>
                                                            {t.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs max-w-[200px] truncate">
                                                        {t.subject}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                            {(t.variables ?? []).slice(0, 3).map((v) => (
                                                                <Badge key={v.key} variant="secondary" className="text-[9px] font-mono py-0">
                                                                    {`{{${v.key}}}`}
                                                                </Badge>
                                                            ))}
                                                            {(t.variables?.length ?? 0) > 3 && (
                                                                <Badge variant="secondary" className="text-[9px] py-0">
                                                                    +{(t.variables?.length ?? 0) - 3}
                                                                </Badge>
                                                            )}
                                                            {(t.variables ?? []).length === 0 && (
                                                                <span className="text-xs text-muted-foreground">—</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="tabular-nums text-right">{(t.sendCount ?? 0).toLocaleString()}</TableCell>
                                                    <TableCell className="tabular-nums text-right">{or}{or !== '—' ? '%' : ''}</TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => router.push(`/email-builder?id=${t.id}`)}>
                                                                    <Pencil className="h-3.5 w-3.5 mr-2" />
                                                                    Edit in Builder
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => previewTemplate(t.id)}>
                                                                    <Eye className="h-3.5 w-3.5 mr-2" />
                                                                    Preview
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-destructive" onClick={() => deleteTemplate(t.id)}>
                                                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {templates.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                                                    <div className="space-y-2">
                                                        <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                                                        <p>No email templates yet.</p>
                                                        <Button variant="outline" size="sm" asChild>
                                                            <Link href="/email-builder">
                                                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                                                Open Email Builder
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ── Preview Dialog ──────────────────────────────── */}
            <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Email Preview</DialogTitle>
                        <DialogDescription>
                            Personalized with sample user data
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="rounded-md border p-3 bg-muted/30">
                            <Label className="text-xs text-muted-foreground">Subject</Label>
                            <p className="font-medium">{previewSubject}</p>
                        </div>
                        <div className="rounded-md border p-4 bg-white dark:bg-gray-950">
                            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
