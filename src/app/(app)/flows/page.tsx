'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import type { FlowDefinition, FlowBuilderStatus } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import {
  PlusCircle, MoreHorizontal, Search,
  Play, Pause, Archive, Copy, Pencil, Trash2,
} from 'lucide-react';

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
      const res = await fetch('/api/v1/flow-definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFlowName, description: newFlowDesc }),
      });
      if (res.ok) {
        const json = await res.json();
        setCreateDialogOpen(false);
        setNewFlowName('');
        setNewFlowDesc('');
        router.push(`/flows/builder/${json.data.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const duplicateFlow = async (id: string) => {
    const res = await fetch(`/api/v1/flow-definitions/${id}/duplicate`, { method: 'POST' });
    if (res.ok) fetchFlows();
  };

  const updateFlowStatus = async (id: string, status: FlowBuilderStatus) => {
    const res = await fetch(`/api/v1/flow-definitions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchFlows();
  };

  const deleteFlow = async (id: string) => {
    const res = await fetch(`/api/v1/flow-definitions/${id}`, { method: 'DELETE' });
    if (res.ok) fetchFlows();
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
                            onClick={(e) => { e.stopPropagation(); deleteFlow(flow.id); }}
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

      {/* ── Create Dialog ──────────────────────────────────── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Flow</DialogTitle>
            <DialogDescription>
              Give your flow a name and description. You&apos;ll build the automation visually in the next step.
            </DialogDescription>
          </DialogHeader>
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
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={createFlow} disabled={creating || !newFlowName.trim()}>
              {creating ? 'Creating...' : 'Create & Open Builder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
