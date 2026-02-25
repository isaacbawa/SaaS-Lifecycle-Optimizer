'use client';

import { useState, useEffect, useCallback } from 'react';
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
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
    PlusCircle, MoreHorizontal, Users, Filter, RefreshCw, Eye,
    Pencil, Trash2, Play, Layers,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────── */

interface SegmentFilter {
    field: string;
    operator: string;
    value: unknown;
}

interface Segment {
    id: string;
    name: string;
    description: string | null;
    status: string;
    type: string;
    filterLogic: string;
    filters: SegmentFilter[];
    matchedUserCount: number;
    lastEvaluatedAt: string | null;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

/* ── Constants ──────────────────────────────────────────────────────── */

const statusStyles: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    archived: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const FIELD_OPTIONS = [
    { value: 'lifecycleState', label: 'Lifecycle State' },
    { value: 'plan', label: 'Plan' },
    { value: 'mrr', label: 'MRR' },
    { value: 'churnRiskScore', label: 'Churn Risk Score' },
    { value: 'expansionScore', label: 'Expansion Score' },
    { value: 'loginFrequency7d', label: 'Login Frequency (7d)' },
    { value: 'loginFrequency30d', label: 'Login Frequency (30d)' },
    { value: 'sessionDepthMinutes', label: 'Session Depth (min)' },
    { value: 'npsScore', label: 'NPS Score' },
    { value: 'seatCount', label: 'Seat Count' },
    { value: 'seatLimit', label: 'Seat Limit' },
    { value: 'apiCalls30d', label: 'API Calls (30d)' },
    { value: 'apiLimit', label: 'API Limit' },
    { value: 'supportTickets30d', label: 'Support Tickets (30d)' },
    { value: 'daysUntilRenewal', label: 'Days Until Renewal' },
    { value: 'email', label: 'Email' },
    { value: 'name', label: 'Name' },
    { value: 'tags', label: 'Tags' },
];

const OPERATOR_OPTIONS = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Not Contains' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'greater_or_equal', label: 'Greater or Equal' },
    { value: 'less_or_equal', label: 'Less or Equal' },
    { value: 'is_set', label: 'Is Set' },
    { value: 'is_not_set', label: 'Is Not Set' },
    { value: 'in_list', label: 'In List' },
    { value: 'not_in_list', label: 'Not In List' },
    { value: 'between', label: 'Between' },
];

/* ── Component ───────────────────────────────────────────────────────── */

export default function SegmentsPage() {
    const [segments, setSegments] = useState<Segment[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    // Create / Edit dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Segment | null>(null);
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formType, setFormType] = useState<'dynamic' | 'static'>('dynamic');
    const [formLogic, setFormLogic] = useState<'and' | 'or'>('and');
    const [formFilters, setFormFilters] = useState<SegmentFilter[]>([
        { field: 'lifecycleState', operator: 'equals', value: '' },
    ]);
    const [saving, setSaving] = useState(false);

    // Preview dialog
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewUsers, setPreviewUsers] = useState<Array<{ id: string; email: string; name: string; lifecycleState: string }>>([]);
    const [previewCount, setPreviewCount] = useState(0);

    // Evaluate state
    const [evaluating, setEvaluating] = useState<string | null>(null);

    /* ── Fetch ──────────────────────────────────────── */
    const fetchSegments = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/segments');
            if (res.ok) {
                const json = await res.json();
                setSegments(json.data ?? []);
            }
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSegments(); }, [fetchSegments]);

    /* ── Actions ─────────────────────────────────────── */
    const openCreate = () => {
        setEditing(null);
        setFormName('');
        setFormDesc('');
        setFormType('dynamic');
        setFormLogic('and');
        setFormFilters([{ field: 'lifecycleState', operator: 'equals', value: '' }]);
        setDialogOpen(true);
    };

    const openEdit = (seg: Segment) => {
        setEditing(seg);
        setFormName(seg.name);
        setFormDesc(seg.description ?? '');
        setFormType(seg.type as 'dynamic' | 'static');
        setFormLogic(seg.filterLogic as 'and' | 'or');
        setFormFilters(seg.filters.length > 0 ? seg.filters : [{ field: 'lifecycleState', operator: 'equals', value: '' }]);
        setDialogOpen(true);
    };

    const saveSegment = async () => {
        if (!formName.trim()) return;
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                name: formName,
                description: formDesc,
                type: formType,
                filterLogic: formLogic,
                filters: formFilters.filter(f => f.field && f.operator),
                status: 'active',
            };
            if (editing) payload.id = editing.id;

            const res = await fetch('/api/v1/segments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setDialogOpen(false);
                fetchSegments();
            }
        } finally { setSaving(false); }
    };

    const deleteSegment = async (id: string) => {
        const res = await fetch(`/api/v1/segments/${id}`, { method: 'DELETE' });
        if (res.ok) fetchSegments();
    };

    const evaluateSegment = async (id: string) => {
        setEvaluating(id);
        try {
            await fetch('/api/v1/segments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'evaluate', segmentId: id }),
            });
            await fetchSegments();
        } finally { setEvaluating(null); }
    };

    const previewSegment = async (filters: SegmentFilter[], logic: 'and' | 'or') => {
        setPreviewLoading(true);
        setPreviewOpen(true);
        try {
            const res = await fetch('/api/v1/segments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'preview', filters, filterLogic: logic }),
            });
            if (res.ok) {
                const json = await res.json();
                setPreviewUsers(json.data?.users ?? []);
                setPreviewCount(json.data?.count ?? 0);
            }
        } finally { setPreviewLoading(false); }
    };

    /* ── Filter helpers ─────────────────────────────── */
    const addFilter = () => {
        setFormFilters([...formFilters, { field: 'mrr', operator: 'greater_than', value: '' }]);
    };

    const removeFilter = (idx: number) => {
        setFormFilters(formFilters.filter((_, i) => i !== idx));
    };

    const updateFilter = (idx: number, key: keyof SegmentFilter, val: unknown) => {
        const updated = [...formFilters];
        updated[idx] = { ...updated[idx], [key]: val };
        setFormFilters(updated);
    };

    /* ── Computed ───────────────────────────────────── */
    const filtered = statusFilter === 'all'
        ? segments
        : segments.filter(s => s.status === statusFilter);

    const totalUsers = segments.reduce((s, seg) => s + seg.matchedUserCount, 0);
    const dynamicCount = segments.filter(s => s.type === 'dynamic').length;
    const activeCount = segments.filter(s => s.status === 'active').length;

    /* ── Render ────────────────────────────────────────── */
    return (
        <div className="grid gap-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Segments</CardTitle>
                        <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-16" /> : (
                            <>
                                <div className="text-2xl font-bold">{segments.length}</div>
                                <p className="text-xs text-muted-foreground">{activeCount} active</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users Segmented</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-24" /> : (
                            <>
                                <div className="text-2xl font-bold">{totalUsers.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground">across all segments</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dynamic Segments</CardTitle>
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-16" /> : (
                            <>
                                <div className="text-2xl font-bold">{dynamicCount}</div>
                                <p className="text-xs text-muted-foreground">auto-evaluated from rules</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Segment Size</CardTitle>
                        <Filter className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-20" /> : (
                            <>
                                <div className="text-2xl font-bold">
                                    {segments.length > 0
                                        ? Math.round(totalUsers / segments.length).toLocaleString()
                                        : '0'}
                                </div>
                                <p className="text-xs text-muted-foreground">users per segment</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Segments Table */}
            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Segments</CardTitle>
                        <CardDescription className="mt-1">
                            Build dynamic or static user segments using real-time SDK data
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-32">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={openCreate}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Segment
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full" />
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Segment</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Rules</TableHead>
                                    <TableHead>Matched Users</TableHead>
                                    <TableHead>Last Evaluated</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((seg) => (
                                    <TableRow key={seg.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{seg.name}</p>
                                                {seg.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-[250px]">
                                                        {seg.description}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn('border-transparent', statusStyles[seg.status] ?? statusStyles.draft)}>
                                                {seg.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">{seg.type}</Badge>
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {seg.filters.length} {seg.filters.length > 1 ? `(${seg.filterLogic.toUpperCase()})` : ''}
                                        </TableCell>
                                        <TableCell className="tabular-nums font-medium">
                                            {seg.matchedUserCount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {seg.lastEvaluatedAt
                                                ? new Date(seg.lastEvaluatedAt).toLocaleString()
                                                : 'Never'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEdit(seg)}>
                                                        <Pencil className="h-3.5 w-3.5 mr-2" />
                                                        Edit Segment
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => evaluateSegment(seg.id)}
                                                        disabled={evaluating === seg.id}
                                                    >
                                                        <Play className="h-3.5 w-3.5 mr-2" />
                                                        {evaluating === seg.id ? 'Evaluating...' : 'Evaluate Now'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => previewSegment(seg.filters, seg.filterLogic as 'and' | 'or')}>
                                                        <Eye className="h-3.5 w-3.5 mr-2" />
                                                        Preview Users
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive" onClick={() => deleteSegment(seg.id)}>
                                                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                                            {segments.length === 0
                                                ? 'No segments yet. Create your first segment to get started.'
                                                : 'No segments match this filter.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* ── Create / Edit Dialog ────────────────────────────── */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Segment' : 'Create Segment'}</DialogTitle>
                        <DialogDescription>
                            Define rules to dynamically group users based on real-time properties from your SDK.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Segment Name</Label>
                                <Input
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g. High-Value At-Risk"
                                    className="mt-1"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label>Type</Label>
                                    <Select value={formType} onValueChange={(v) => setFormType(v as 'dynamic' | 'static')}>
                                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="dynamic">Dynamic</SelectItem>
                                            <SelectItem value="static">Static</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Logic</Label>
                                    <Select value={formLogic} onValueChange={(v) => setFormLogic(v as 'and' | 'or')}>
                                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="and">AND (all rules)</SelectItem>
                                            <SelectItem value="or">OR (any rule)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={formDesc}
                                onChange={(e) => setFormDesc(e.target.value)}
                                placeholder="Brief description"
                                className="mt-1"
                                rows={2}
                            />
                        </div>

                        {/* Filter Rules */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm font-medium">Filter Rules</Label>
                                <Button variant="outline" size="sm" onClick={addFilter}>
                                    <PlusCircle className="mr-1 h-3.5 w-3.5" />
                                    Add Rule
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {formFilters.map((filter, idx) => (
                                    <div key={idx} className="flex items-center gap-2 rounded-md border p-2 bg-muted/30">
                                        <Select
                                            value={filter.field}
                                            onValueChange={(v) => updateFilter(idx, 'field', v)}
                                        >
                                            <SelectTrigger className="w-44 h-8 text-xs">
                                                <SelectValue placeholder="Field" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {FIELD_OPTIONS.map(f => (
                                                    <SelectItem key={f.value} value={f.value}>
                                                        {f.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select
                                            value={filter.operator}
                                            onValueChange={(v) => updateFilter(idx, 'operator', v)}
                                        >
                                            <SelectTrigger className="w-40 h-8 text-xs">
                                                <SelectValue placeholder="Operator" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {OPERATOR_OPTIONS.map(o => (
                                                    <SelectItem key={o.value} value={o.value}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {filter.operator !== 'is_set' && filter.operator !== 'is_not_set' && (
                                            <Input
                                                className="h-8 text-xs flex-1"
                                                value={String(filter.value ?? '')}
                                                onChange={(e) => updateFilter(idx, 'value', e.target.value)}
                                                placeholder={filter.operator === 'between' ? 'min,max' : 'Value'}
                                            />
                                        )}

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 flex-shrink-0"
                                            onClick={() => removeFilter(idx)}
                                            disabled={formFilters.length <= 1}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex justify-between sm:justify-between">
                        <Button
                            variant="outline"
                            onClick={() => previewSegment(formFilters.filter(f => f.field && f.operator), formLogic)}
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button onClick={saveSegment} disabled={saving || !formName.trim()}>
                                {saving ? 'Saving...' : editing ? 'Update Segment' : 'Create Segment'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Preview Dialog ──────────────────────────────────── */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Segment Preview</DialogTitle>
                        <DialogDescription>
                            {previewLoading ? 'Evaluating...' : `${previewCount} user(s) match the current rules`}
                        </DialogDescription>
                    </DialogHeader>
                    {previewLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>State</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {previewUsers.map(u => (
                                    <TableRow key={u.id}>
                                        <TableCell className="font-medium">{u.name || '—'}</TableCell>
                                        <TableCell className="text-xs">{u.email || '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize text-xs">{u.lifecycleState}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {previewUsers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                                            No users matched the rules.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
