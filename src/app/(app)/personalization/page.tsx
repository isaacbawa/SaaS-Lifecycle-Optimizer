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
    PlusCircle, MoreHorizontal, Sparkles, Pencil, Trash2, Eye,
    Wand2, Target, BarChart3,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────── */

interface PersonalizationVariant {
    id: string;
    slot: string;
    content: string;
    weight: number;
    isControl?: boolean;
}

interface VariableMapping {
    key: string;
    source: string;
    field: string;
    transform?: string;
    fallback?: string;
}

interface PersonalizationRule {
    id: string;
    name: string;
    description: string | null;
    status: string;
    priority: number;
    channel: string;
    segmentId: string | null;
    filters: Array<{ field: string; operator: string; value: unknown }>;
    filterLogic: string;
    variants: PersonalizationVariant[];
    variableMappings: VariableMapping[];
    impressionCount: number;
    conversionCount: number;
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

const CHANNELS = [
    { value: 'email', label: 'Email' },
    { value: 'in_app', label: 'In-App' },
    { value: 'web', label: 'Web' },
    { value: 'push', label: 'Push' },
    { value: 'sms', label: 'SMS' },
];

const VARIABLE_SOURCES = [
    { value: 'user', label: 'User Property' },
    { value: 'account', label: 'Account Property' },
    { value: 'event', label: 'Event Data' },
    { value: 'custom', label: 'Custom / System' },
];

const USER_FIELDS = [
    'name', 'email', 'plan', 'mrr', 'lifecycleState', 'churnRiskScore',
    'expansionScore', 'npsScore', 'daysUntilRenewal', 'seatCount', 'loginFrequency7d',
];

const ACCOUNT_FIELDS = [
    'name', 'domain', 'industry', 'plan', 'mrr', 'arr', 'userCount', 'health',
];

const TRANSFORMS = [
    { value: '', label: 'None' },
    { value: 'uppercase', label: 'UPPERCASE' },
    { value: 'lowercase', label: 'lowercase' },
    { value: 'capitalize', label: 'Capitalize' },
    { value: 'truncate', label: 'Truncate' },
    { value: 'number_format', label: 'Number Format' },
];

/* ── Component ───────────────────────────────────────────────────────── */

export default function PersonalizationPage() {
    const [rules, setRules] = useState<PersonalizationRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<PersonalizationRule | null>(null);
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formChannel, setFormChannel] = useState('email');
    const [formPriority, setFormPriority] = useState(0);
    const [formVariants, setFormVariants] = useState<PersonalizationVariant[]>([
        { id: 'v1', slot: 'hero', content: '', weight: 100 },
    ]);
    const [formMappings, setFormMappings] = useState<VariableMapping[]>([
        { key: 'user_name', source: 'user', field: 'name', fallback: 'there' },
    ]);
    const [saving, setSaving] = useState(false);

    // Test / resolve dialog
    const [testOpen, setTestOpen] = useState(false);
    const [testUserId, setTestUserId] = useState('');
    const [testLoading, setTestLoading] = useState(false);
    const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);

    /* ── Fetch ──────────────────────────────────────── */
    const fetchRules = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/personalization-rules');
            if (res.ok) {
                const json = await res.json();
                setRules(json.data ?? []);
            }
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRules(); }, [fetchRules]);

    /* ── Actions ─────────────────────────────────────── */
    const openCreate = () => {
        setEditing(null);
        setFormName('');
        setFormDesc('');
        setFormChannel('email');
        setFormPriority(0);
        setFormVariants([{ id: 'v1', slot: 'hero', content: '', weight: 100 }]);
        setFormMappings([{ key: 'user_name', source: 'user', field: 'name', fallback: 'there' }]);
        setDialogOpen(true);
    };

    const openEdit = (rule: PersonalizationRule) => {
        setEditing(rule);
        setFormName(rule.name);
        setFormDesc(rule.description ?? '');
        setFormChannel(rule.channel ?? 'email');
        setFormPriority(rule.priority ?? 0);
        setFormVariants(rule.variants.length > 0
            ? rule.variants
            : [{ id: 'v1', slot: 'hero', content: '', weight: 100 }]);
        setFormMappings(rule.variableMappings.length > 0
            ? rule.variableMappings
            : [{ key: 'user_name', source: 'user', field: 'name', fallback: 'there' }]);
        setDialogOpen(true);
    };

    const saveRule = async () => {
        if (!formName.trim()) return;
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                name: formName,
                description: formDesc,
                channel: formChannel,
                priority: formPriority,
                status: 'active',
                variants: formVariants,
                variableMappings: formMappings,
            };
            if (editing) payload.id = editing.id;

            const res = await fetch('/api/v1/personalization-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setDialogOpen(false);
                fetchRules();
            }
        } finally { setSaving(false); }
    };

    const deleteRule = async (id: string) => {
        const res = await fetch(`/api/v1/personalization-rules/${id}`, { method: 'DELETE' });
        if (res.ok) fetchRules();
    };

    const testResolve = async () => {
        if (!testUserId.trim()) return;
        setTestLoading(true);
        try {
            const res = await fetch('/api/v1/personalization-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'resolve', trackedUserId: testUserId }),
            });
            if (res.ok) {
                const json = await res.json();
                setTestResult(json.data ?? {});
            }
        } finally { setTestLoading(false); }
    };

    /* ── Variant / Mapping helpers ──────────────────── */
    const addVariant = () => {
        const id = `v${Date.now()}`;
        setFormVariants([...formVariants, { id, slot: '', content: '', weight: 50 }]);
    };
    const removeVariant = (idx: number) => {
        setFormVariants(formVariants.filter((_, i) => i !== idx));
    };
    const updateVariant = (idx: number, key: keyof PersonalizationVariant, val: unknown) => {
        const updated = [...formVariants];
        updated[idx] = { ...updated[idx], [key]: val };
        setFormVariants(updated);
    };

    const addMapping = () => {
        setFormMappings([...formMappings, { key: '', source: 'user', field: '', fallback: '' }]);
    };
    const removeMapping = (idx: number) => {
        setFormMappings(formMappings.filter((_, i) => i !== idx));
    };
    const updateMapping = (idx: number, key: keyof VariableMapping, val: string) => {
        const updated = [...formMappings];
        updated[idx] = { ...updated[idx], [key]: val };
        setFormMappings(updated);
    };

    /* ── Computed ───────────────────────────────────── */
    const filtered = statusFilter === 'all'
        ? rules
        : rules.filter(r => r.status === statusFilter);

    const activeCount = rules.filter(r => r.status === 'active').length;
    const totalImpressions = rules.reduce((s, r) => s + (r.impressionCount ?? 0), 0);
    const totalConversions = rules.reduce((s, r) => s + (r.conversionCount ?? 0), 0);
    const avgConvRate = totalImpressions > 0 ? ((totalConversions / totalImpressions) * 100).toFixed(1) : '0.0';

    /* ── Render ────────────────────────────────────────── */
    return (
        <div className="grid gap-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-16" /> : (
                            <>
                                <div className="text-2xl font-bold">{activeCount}</div>
                                <p className="text-xs text-muted-foreground">of {rules.length} total</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Impressions</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-24" /> : (
                            <>
                                <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground">across all rules</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversions</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-20" /> : (
                            <>
                                <div className="text-2xl font-bold">{totalConversions.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground">{avgConvRate}% conversion rate</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Channels</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-16" /> : (
                            <>
                                <div className="text-2xl font-bold">
                                    {new Set(rules.map(r => r.channel)).size}
                                </div>
                                <p className="text-xs text-muted-foreground">unique channels used</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Rules Table */}
            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Personalization Rules</CardTitle>
                        <CardDescription className="mt-1">
                            Dynamic content personalization using real-time SDK user properties and variables
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setTestOpen(true)}>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Test Resolve
                        </Button>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-32">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="paused">Paused</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={openCreate}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Rule
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
                                    <TableHead>Rule</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Channel</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Variants</TableHead>
                                    <TableHead>Impressions</TableHead>
                                    <TableHead>Conv. Rate</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((rule) => {
                                    const imp = rule.impressionCount ?? 0;
                                    const conv = rule.conversionCount ?? 0;
                                    const rate = imp > 0 ? ((conv / imp) * 100).toFixed(1) : '0.0';
                                    return (
                                        <TableRow key={rule.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{rule.name}</p>
                                                    {rule.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-[220px]">
                                                            {rule.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn('border-transparent', statusStyles[rule.status] ?? statusStyles.draft)}>
                                                    {rule.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize text-xs">{rule.channel}</Badge>
                                            </TableCell>
                                            <TableCell className="tabular-nums">{rule.priority}</TableCell>
                                            <TableCell className="tabular-nums">{rule.variants.length}</TableCell>
                                            <TableCell className="tabular-nums">{imp.toLocaleString()}</TableCell>
                                            <TableCell className="tabular-nums">{rate}%</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openEdit(rule)}>
                                                            <Pencil className="h-3.5 w-3.5 mr-2" />
                                                            Edit Rule
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive" onClick={() => deleteRule(rule.id)}>
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
                                        <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                                            {rules.length === 0
                                                ? 'No personalization rules yet. Create one to start serving dynamic content.'
                                                : 'No rules match this filter.'}
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
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Personalization Rule' : 'Create Personalization Rule'}</DialogTitle>
                        <DialogDescription>
                            Map real-time user variables to dynamic content variants for personalized experiences.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        {/* Basic info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Rule Name</Label>
                                <Input
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g. Welcome Banner by Plan"
                                    className="mt-1"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label>Channel</Label>
                                    <Select value={formChannel} onValueChange={setFormChannel}>
                                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Priority</Label>
                                    <Input
                                        type="number"
                                        value={formPriority}
                                        onChange={(e) => setFormPriority(Number(e.target.value))}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={formDesc}
                                onChange={(e) => setFormDesc(e.target.value)}
                                placeholder="What this rule personalizes"
                                className="mt-1"
                                rows={2}
                            />
                        </div>

                        {/* Variable Mappings */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm font-medium">Variable Mappings</Label>
                                <Button variant="outline" size="sm" onClick={addMapping}>
                                    <PlusCircle className="mr-1 h-3.5 w-3.5" />
                                    Add Variable
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {formMappings.map((m, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2 rounded-md border p-2 bg-muted/30 items-center">
                                        <Input
                                            className="col-span-2 h-8 text-xs"
                                            value={m.key}
                                            onChange={(e) => updateMapping(idx, 'key', e.target.value)}
                                            placeholder="key"
                                        />
                                        <Select
                                            value={m.source}
                                            onValueChange={(v) => updateMapping(idx, 'source', v)}
                                        >
                                            <SelectTrigger className="col-span-2 h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {VARIABLE_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={m.field}
                                            onValueChange={(v) => updateMapping(idx, 'field', v)}
                                        >
                                            <SelectTrigger className="col-span-3 h-8 text-xs"><SelectValue placeholder="Field" /></SelectTrigger>
                                            <SelectContent>
                                                {(m.source === 'user' ? USER_FIELDS : m.source === 'account' ? ACCOUNT_FIELDS : USER_FIELDS).map(f => (
                                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={m.transform ?? ''}
                                            onValueChange={(v) => updateMapping(idx, 'transform', v)}
                                        >
                                            <SelectTrigger className="col-span-2 h-8 text-xs"><SelectValue placeholder="Transform" /></SelectTrigger>
                                            <SelectContent>
                                                {TRANSFORMS.map(t => <SelectItem key={t.value || 'none'} value={t.value}>{t.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            className="col-span-2 h-8 text-xs"
                                            value={m.fallback ?? ''}
                                            onChange={(e) => updateMapping(idx, 'fallback', e.target.value)}
                                            placeholder="Fallback"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="col-span-1 h-8 w-8 p-0"
                                            onClick={() => removeMapping(idx)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Variants */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm font-medium">Content Variants</Label>
                                <Button variant="outline" size="sm" onClick={addVariant}>
                                    <PlusCircle className="mr-1 h-3.5 w-3.5" />
                                    Add Variant
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {formVariants.map((v, idx) => (
                                    <div key={idx} className="rounded-md border p-3 bg-muted/30 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                className="h-8 text-xs w-32"
                                                value={v.slot}
                                                onChange={(e) => updateVariant(idx, 'slot', e.target.value)}
                                                placeholder="Slot (e.g. hero)"
                                            />
                                            <Input
                                                className="h-8 text-xs w-20"
                                                type="number"
                                                value={v.weight}
                                                onChange={(e) => updateVariant(idx, 'weight', Number(e.target.value))}
                                                placeholder="Weight"
                                            />
                                            <label className="flex items-center gap-1 text-xs">
                                                <input
                                                    type="checkbox"
                                                    checked={v.isControl ?? false}
                                                    onChange={(e) => updateVariant(idx, 'isControl', e.target.checked)}
                                                />
                                                Control
                                            </label>
                                            <div className="flex-1" />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => removeVariant(idx)}
                                                disabled={formVariants.length <= 1}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                            </Button>
                                        </div>
                                        <Textarea
                                            className="text-xs"
                                            rows={2}
                                            value={v.content}
                                            onChange={(e) => updateVariant(idx, 'content', e.target.value)}
                                            placeholder="Content with {{variables}} like: Hi {{user_name}}, upgrade your {{plan}} plan"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={saveRule} disabled={saving || !formName.trim()}>
                            {saving ? 'Saving...' : editing ? 'Update Rule' : 'Create Rule'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Test Resolve Dialog ─────────────────────────────── */}
            <Dialog open={testOpen} onOpenChange={setTestOpen}>
                <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Test Personalization</DialogTitle>
                        <DialogDescription>
                            Enter a tracked user ID to see what personalized content they would receive.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <Input
                                value={testUserId}
                                onChange={(e) => setTestUserId(e.target.value)}
                                placeholder="Tracked User ID or External ID"
                                className="flex-1"
                            />
                            <Button onClick={testResolve} disabled={testLoading || !testUserId.trim()}>
                                {testLoading ? 'Resolving...' : 'Resolve'}
                            </Button>
                        </div>

                        {testResult && (
                            <div className="rounded-md border p-3 bg-muted/30">
                                <Label className="text-xs font-medium mb-1 block">Resolved Result</Label>
                                <pre className="text-xs overflow-auto max-h-60 whitespace-pre-wrap">
                                    {JSON.stringify(testResult, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
