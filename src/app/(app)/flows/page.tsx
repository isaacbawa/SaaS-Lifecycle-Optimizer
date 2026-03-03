'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FlowDefinition, FlowBuilderStatus } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import {
  PlusCircle, MoreHorizontal, Search,
  Play, Pause, Archive, Copy, Pencil, Trash2,
  Rocket, Sparkles, Activity, Shield, TrendingUp,
  DollarSign, MessageCircle, Users, Lock,
  ArrowLeft, FileText, Check, Clock,
} from 'lucide-react';
import {
  FLOW_TEMPLATES, FLOW_TEMPLATE_CATEGORIES,
  type FlowTemplate, type FlowTemplateCategory,
} from '@/lib/flow-templates';

/* ── Category Icon Mapping ───────────────────────────────────────────── */

const categoryIcons: Record<string, React.ReactNode> = {
  rocket: <Rocket className="h-4 w-4" />,
  sparkles: <Sparkles className="h-4 w-4" />,
  activity: <Activity className="h-4 w-4" />,
  shield: <Shield className="h-4 w-4" />,
  'trending-up': <TrendingUp className="h-4 w-4" />,
  'dollar-sign': <DollarSign className="h-4 w-4" />,
  'message-circle': <MessageCircle className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  lock: <Lock className="h-4 w-4" />,
};

/* ── Status Badge Styles ─────────────────────────────────────────────── */

const statusStyles: Record<FlowBuilderStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  draft: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  paused: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  archived: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  error: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
};

const statusLabel: Record<FlowBuilderStatus, string> = {
  active: 'Active',
  draft: 'Draft',
  paused: 'Paused',
  archived: 'Archived',
  error: 'Error',
};

/* ── Helpers ─────────────────────────────────────────────────────────── */

function fmtCurrency(cents: number): string {
  if (cents === 0) return '$0';
  return `$${cents.toLocaleString()}`;
}

function fmtRate(pct: number): string {
  if (pct === 0) return '0%';
  return `${pct.toFixed(1)}%`;
}

/* ── Component ───────────────────────────────────────────────────────── */

export default function FlowsPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDesc, setNewFlowDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ── Template picker state ──────────────────────────────── */
  const [createStep, setCreateStep] = useState<'pick' | 'configure'>('pick');
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FlowTemplateCategory | 'all'>('all');

  /* ── Filtered templates ─────────────────────────────────── */
  const filteredTemplates = useMemo(() => {
    let tpls = FLOW_TEMPLATES;
    if (selectedCategory !== 'all') {
      tpls = tpls.filter(t => t.category === selectedCategory);
    }
    if (templateSearch.trim()) {
      const q = templateSearch.toLowerCase();
      tpls = tpls.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q)),
      );
    }
    return tpls;
  }, [selectedCategory, templateSearch]);

  /* ── Fetch ──────────────────────────────────────────────── */
  const fetchFlows = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/flow-definitions');
      if (res.ok) {
        const json = await res.json();
        setFlows(json.data ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFlows(); }, [fetchFlows]);

  /* ── Actions ────────────────────────────────────────────── */

  const createFlow = async () => {
    if (!newFlowName.trim()) return;
    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        name: newFlowName,
        description: newFlowDesc,
      };
      // If a template was selected, include its full definition
      if (selectedTemplate) {
        payload.nodes = selectedTemplate.nodes;
        payload.edges = selectedTemplate.edges;
        payload.variables = selectedTemplate.variables;
        payload.settings = selectedTemplate.settings;
        payload.trigger = selectedTemplate.trigger;
      }
      const res = await fetch('/api/v1/flow-definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        setCreateDialogOpen(false);
        setNewFlowName('');
        setNewFlowDesc('');
        setSelectedTemplate(null);
        setCreateStep('pick');
        setTemplateSearch('');
        setSelectedCategory('all');
        toast({ title: 'Flow created', description: `"${newFlowName}" is ready to configure.` });
        router.push(`/flows/builder/${json.data.id}`);
      } else {
        toast({ title: 'Error', description: 'Failed to create flow. Please try again.', variant: 'destructive' });
      }
    } finally {
      setCreating(false);
    }
  };

  const openCreateDialog = () => {
    setCreateStep('pick');
    setSelectedTemplate(null);
    setNewFlowName('');
    setNewFlowDesc('');
    setTemplateSearch('');
    setSelectedCategory('all');
    setCreateDialogOpen(true);
  };

  const pickTemplate = (tpl: FlowTemplate) => {
    setSelectedTemplate(tpl);
    setNewFlowName(tpl.name);
    setNewFlowDesc(tpl.description);
    setCreateStep('configure');
  };

  const startFromScratch = () => {
    setSelectedTemplate(null);
    setNewFlowName('');
    setNewFlowDesc('');
    setCreateStep('configure');
  };

  const duplicateFlow = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/flow-definitions/${id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        fetchFlows();
        toast({ title: 'Flow duplicated', description: 'A copy of the flow has been created.' });
      } else {
        toast({ title: 'Error', description: 'Failed to duplicate flow.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to duplicate flow.', variant: 'destructive' });
    }
  };

  const updateFlowStatus = async (id: string, status: FlowBuilderStatus) => {
    try {
      const res = await fetch(`/api/v1/flow-definitions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchFlows();
        toast({ title: 'Status updated', description: `Flow status changed to ${status}.` });
      } else {
        toast({ title: 'Error', description: 'Failed to update flow status.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update flow status.', variant: 'destructive' });
    }
  };

  const deleteFlow = async (id: string) => {
    const res = await fetch(`/api/v1/flow-definitions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchFlows();
      toast({ title: 'Flow deleted', description: 'The flow has been removed.' });
    } else {
      toast({ title: 'Error', description: 'Failed to delete flow.', variant: 'destructive' });
    }
  };

  /* ── Filtered list ──────────────────────────────────────── */

  const filtered = useMemo(() => {
    if (!search.trim()) return flows;
    const q = search.toLowerCase();
    return flows.filter((f) =>
      f.name.toLowerCase().includes(q) ||
      f.trigger?.toLowerCase().includes(q) ||
      f.status.includes(q),
    );
  }, [flows, search]);

  /* ── Revenue totals ─────────────────────────────────────── */

  const totalRevenue = flows.reduce((s, f) => s + (f.metrics.revenueGenerated ?? 0), 0);

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl">Email Flows</CardTitle>
              <CardDescription className="mt-1">
                Automate your email marketing with event-triggered flows.
                {!loading && totalRevenue > 0 && (
                  <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
                    {fmtCurrency(totalRevenue)} total revenue driven
                  </span>
                )}
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Flow
            </Button>
          </div>

          {/* ── Search ──────────────────────────────────────── */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flows..."
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent className="px-0">
          {loading ? (
            <div className="space-y-3 px-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Flow Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead className="text-right">Open Rate</TableHead>
                  <TableHead className="text-right">Click Rate</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((flow) => (
                  <TableRow
                    key={flow.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/flows/builder/${flow.id}`)}
                  >
                    <TableCell className="pl-6 font-medium">{flow.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs font-medium capitalize', statusStyles[flow.status])}>
                        {statusLabel[flow.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {flow.trigger || '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {flow.metrics.totalEnrolled.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtRate(flow.metrics.openRate ?? 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtRate(flow.metrics.clickRate ?? 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                      {fmtCurrency(flow.metrics.revenueGenerated ?? 0)}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/flows/builder/${flow.id}`); }}>
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Edit Flow
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateFlow(flow.id); }}>
                            <Copy className="h-3.5 w-3.5 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {flow.status === 'active' ? (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateFlowStatus(flow.id, 'paused'); }}>
                              <Pause className="h-3.5 w-3.5 mr-2" />
                              Pause
                            </DropdownMenuItem>
                          ) : flow.status !== 'archived' ? (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateFlowStatus(flow.id, 'active'); }}>
                              <Play className="h-3.5 w-3.5 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          ) : null}
                          {flow.status !== 'archived' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateFlowStatus(flow.id, 'archived'); }}>
                              <Archive className="h-3.5 w-3.5 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(flow.id); }}
                          >
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
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                      {flows.length === 0
                        ? 'No flows yet. Create your first automation flow.'
                        : 'No flows match your search.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Create Flow Dialog — Template Picker & Config ──── */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          setCreateStep('pick');
          setSelectedTemplate(null);
          setTemplateSearch('');
          setSelectedCategory('all');
        }
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          {createStep === 'pick' ? (
            <>
              <DialogHeader>
                <DialogTitle>Create New Flow</DialogTitle>
                <DialogDescription>
                  Choose a template to get started quickly, or start from scratch.
                </DialogDescription>
              </DialogHeader>

              {/* ── Template picker ─────────────────────────── */}
              <div className="flex gap-3 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Search templates..."
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>

              {/* Category pills */}
              <div className="flex flex-wrap gap-1.5 py-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                    selectedCategory === 'all'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80',
                  )}
                >
                  All
                </button>
                {FLOW_TEMPLATE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1',
                      selectedCategory === cat.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80',
                    )}
                  >
                    {categoryIcons[cat.icon]}
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Template grid */}
              <ScrollArea className="flex-1 -mx-6 px-6 min-h-0 max-h-[420px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                  {/* Start from scratch card */}
                  <button
                    onClick={startFromScratch}
                    className="text-left p-4 rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      <span className="font-medium text-sm">Start from Scratch</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Build a flow from an empty canvas with a trigger and exit node.
                    </p>
                  </button>

                  {filteredTemplates.map((tpl) => {
                    const catMeta = FLOW_TEMPLATE_CATEGORIES.find(c => c.id === tpl.category);
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => pickTemplate(tpl)}
                        className="text-left p-4 rounded-lg border hover:border-primary/40 hover:bg-muted/30 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-medium text-sm line-clamp-1">{tpl.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-2 shrink-0" style={{ borderColor: catMeta?.color }}>
                            {catMeta?.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {tpl.description}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {tpl.nodes.length} nodes
                          </span>
                          {tpl.estimatedSetupMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              ~{tpl.estimatedSetupMinutes}m setup
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {filteredTemplates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No templates match your search.
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            /* ── Step 2: Configure name & description ───── */
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <button onClick={() => setCreateStep('pick')} className="hover:bg-muted rounded p-1 -ml-1 transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  {selectedTemplate ? 'Customize Flow' : 'Create Blank Flow'}
                </DialogTitle>
                <DialogDescription>
                  {selectedTemplate
                    ? `Starting from "${selectedTemplate.name}" template. Customize the name and description below.`
                    : 'Give your flow a name and description. You\'ll build the automation visually in the next step.'}
                </DialogDescription>
              </DialogHeader>

              {selectedTemplate && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border text-sm">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>
                    Template: <span className="font-medium">{selectedTemplate.name}</span>
                    <span className="text-muted-foreground ml-1">({selectedTemplate.nodes.length} nodes, {selectedTemplate.edges.length} connections)</span>
                  </span>
                </div>
              )}

              <div className="space-y-3 py-2">
                <div>
                  <Label>Flow Name</Label>
                  <Input
                    value={newFlowName}
                    onChange={(e) => setNewFlowName(e.target.value)}
                    placeholder="e.g. Trial Welcome Series"
                    className="mt-1"
                    autoFocus
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newFlowDesc}
                    onChange={(e) => setNewFlowDesc(e.target.value)}
                    placeholder="Brief description of what this flow does"
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateStep('pick')}>Back</Button>
                <Button onClick={createFlow} disabled={creating || !newFlowName.trim()}>
                  {creating ? 'Creating...' : 'Create & Open Builder'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete flow?"
        description="This will permanently remove this flow and all its enrollment data. This cannot be undone."
        onConfirm={() => { if (deleteId) deleteFlow(deleteId); }}
      />
    </div>
  );
}
