'use client';

/* ==========================================================================
 * Email Dashboard — Templates, Analytics & Email Management
 *
 * Focused on email templates/designs with performance metrics.
 * "Create Email" button opens the email builder (/email-builder).
 * Editing a template navigates to /email-builder?id=xxx.
 *
 * Campaigns have their own dedicated page at /campaigns.
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
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
    PlusCircle, MoreHorizontal, Mail, Send, Eye,
    Pencil, Trash2, FileText, MousePointerClick, Copy,
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

/* ── Constants ──────────────────────────────────────────────────────── */

const statusStyles: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    archived: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

/* ── Component ───────────────────────────────────────────────────────── */

export default function EmailPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Preview dialog
    const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewSubject, setPreviewSubject] = useState('');

    /* ── Fetch ──────────────────────────────────────── */
    const fetchTemplates = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/email-templates');
            if (res.ok) {
                const j = await res.json();
                setTemplates(j.data ?? []);
            }
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    /* ── Template Actions ────────────────────────────── */
    const deleteTemplate = async (id: string) => {
        await fetch(`/api/v1/email-templates/${id}`, { method: 'DELETE' });
        fetchTemplates();
    };

    const duplicateTemplate = async (id: string) => {
        const original = templates.find(t => t.id === id);
        if (!original) return;
        try {
            await fetch('/api/v1/email-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${original.name} (Copy)`,
                    subject: original.subject,
                    previewText: original.previewText,
                    bodyHtml: original.bodyHtml,
                    variables: original.variables,
                    category: original.category,
                    status: 'draft',
                }),
            });
            fetchTemplates();
        } catch { /* ignore */ }
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
    const categories = Array.from(
        new Set(templates.map(t => t.category).filter(Boolean))
    ) as string[];

    const filtered = templates.filter(t => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && (t.category ?? 'uncategorized') !== categoryFilter) return false;
        return true;
    });

    const totalTemplates = templates.length;
    const activeTemplates = templates.filter(t => t.status === 'active').length;
    const totalSent = templates.reduce((s, t) => s + (t.sendCount ?? 0), 0);
    const totalOpened = templates.reduce((s, t) => s + (t.openCount ?? 0), 0);
    const totalClicked = templates.reduce((s, t) => s + (t.clickCount ?? 0), 0);
    const avgOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0.0';
    const avgClickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0.0';

    /* ── Render ──────────────────────────────────────── */
    return (
        <div className="grid gap-6">
            {/* ═══ Page Header ═══════════════════════════════════════════ */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Email</h1>
                    <p className="text-sm text-muted-foreground">
                        Create, manage, and track your email templates and designs.
                    </p>
                </div>
                <Button asChild size="default">
                    <Link href="/email-builder">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Email
                    </Link>
                </Button>
            </div>

            {/* ═══ KPI Cards ════════════════════════════════════════════ */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-16" /> : (
                            <>
                                <div className="text-2xl font-bold">{totalTemplates}</div>
                                <p className="text-xs text-muted-foreground">
                                    {activeTemplates} active
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-20" /> : (
                            <>
                                <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground">
                                    Across all templates
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-16" /> : (
                            <>
                                <div className="text-2xl font-bold">{avgOpenRate}%</div>
                                <p className="text-xs text-muted-foreground">
                                    {totalOpened.toLocaleString()} opens
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Click Rate</CardTitle>
                        <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-16" /> : (
                            <>
                                <div className="text-2xl font-bold">{avgClickRate}%</div>
                                <p className="text-xs text-muted-foreground">
                                    {totalClicked.toLocaleString()} clicks
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ═══ Email Templates Table ═════════════════════════════════ */}
            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Email Templates</CardTitle>
                        <CardDescription className="mt-1">
                            Reusable email designs with {'{{variable}}'} personalization. Used by campaigns and flows.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-28">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                        {categories.length > 0 && (
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map(c => (
                                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
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
                                    <TableHead>Template</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Variables</TableHead>
                                    <TableHead className="text-right">Sent</TableHead>
                                    <TableHead className="text-right">Open %</TableHead>
                                    <TableHead className="text-right">Click %</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((t) => {
                                    const or = (t.sendCount ?? 0) > 0
                                        ? (((t.openCount ?? 0) / t.sendCount) * 100).toFixed(1)
                                        : '—';
                                    const cr = (t.sendCount ?? 0) > 0
                                        ? (((t.clickCount ?? 0) / t.sendCount) * 100).toFixed(1)
                                        : '—';
                                    return (
                                        <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/email-builder?id=${t.id}`)}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{t.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {t.category && (
                                                            <Badge variant="outline" className="text-[10px] capitalize py-0">{t.category}</Badge>
                                                        )}
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {new Date(t.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn('border-transparent text-xs', statusStyles[t.status] ?? statusStyles.draft)}>
                                                    {t.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs max-w-[200px] truncate">
                                                {t.subject}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-[180px]">
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
                                            <TableCell className="tabular-nums text-right">{cr}{cr !== '—' ? '%' : ''}</TableCell>
                                            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => router.push(`/email-builder?id=${t.id}`)}>
                                                            <Pencil className="h-3.5 w-3.5 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => previewTemplate(t.id)}>
                                                            <Eye className="h-3.5 w-3.5 mr-2" />
                                                            Preview
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => duplicateTemplate(t.id)}>
                                                            <Copy className="h-3.5 w-3.5 mr-2" />
                                                            Duplicate
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
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                                            <div className="space-y-3">
                                                <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                                                <div>
                                                    <p className="font-medium">
                                                        {templates.length === 0
                                                            ? 'No email templates yet'
                                                            : 'No templates match your filters'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {templates.length === 0
                                                            ? 'Create your first email template with the visual builder.'
                                                            : 'Try adjusting your status or category filters.'}
                                                    </p>
                                                </div>
                                                {templates.length === 0 && (
                                                    <Button size="sm" asChild>
                                                        <Link href="/email-builder">
                                                            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                                                            Create Your First Email
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

            {/* ═══ Preview Dialog ════════════════════════════════════════ */}
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
