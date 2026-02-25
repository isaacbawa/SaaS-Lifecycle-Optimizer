'use client';

import { useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DollarSign, TrendingUp, Building, ArrowUpRight, Target, Zap,
} from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import type { RevenueData, ExpansionOpportunity, User, Account } from '@/lib/definitions';
import { cn } from '@/lib/utils';

/* ── Lookup Maps ────────────────────────────────────────────────────── */

const signalLabels: Record<string, string> = {
  seat_cap: 'Seat Capacity',
  api_throttle: 'API Throttle',
  heavy_usage: 'Heavy Usage',
  feature_gate: 'Feature Gate',
  plan_limit: 'Plan Limit',
};

const statusColors: Record<string, string> = {
  identified: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  negotiating: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  converted: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  declined: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
};

const chartConfig = {
  expansionMrr: { label: 'Expansion MRR', color: 'hsl(260 60% 55%)' },
};

/* ── Component ──────────────────────────────────────────────────────── */

interface ExpansionClientProps {
  revenueData: RevenueData[];
  expansionOpportunities: ExpansionOpportunity[];
  users: User[];
  accounts: Account[];
}

export function ExpansionClient({
  revenueData, expansionOpportunities, users, accounts,
}: ExpansionClientProps) {
  /* ── Computed Metrics ─────────────────────────────────────────── */
  const totalPipeline = expansionOpportunities.reduce((s, o) => s + o.upliftMrr, 0);
  const avgUplift = expansionOpportunities.length > 0
    ? totalPipeline / expansionOpportunities.length : 0;
  const expansionReadyUsers = users.filter((u) => u.lifecycleState === 'ExpansionReady');
  const highConfidence = expansionOpportunities.filter((o) => o.confidence >= 70);
  const currentExpansionMrr = revenueData.length > 0
    ? revenueData[revenueData.length - 1].expansionMrr : 0;
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<ExpansionOpportunity | null>(null);

  const filtered = statusFilter === 'all'
    ? expansionOpportunities
    : expansionOpportunities.filter((o) => o.status === statusFilter);

  return (
    <div className="grid gap-6">
      {/* ── KPI Row ─────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expansion Pipeline</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              +${totalPipeline.toLocaleString()}/mo
            </div>
            <p className="text-xs text-muted-foreground">
              {expansionOpportunities.length} opportunities identified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Expansion MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentExpansionMrr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">this month from upgrades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highConfidence.length}</div>
            <p className="text-xs text-muted-foreground">
              {highConfidence.length > 0
                ? `$${highConfidence.reduce((s, o) => s + o.upliftMrr, 0).toLocaleString()} potential`
                : 'No high-confidence opportunities'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Uplift</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgUplift.toFixed(0)}/mo</div>
            <p className="text-xs text-muted-foreground">per opportunity</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Chart + Signal Summary ─────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Expansion MRR</CardTitle>
            <CardDescription>
              Revenue from upgrades, add-ons, and seat expansions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-72">
              <BarChart
                data={revenueData.map((d) => ({ month: d.month, expansionMrr: d.expansionMrr }))}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `$${Number(v) / 1000}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="expansionMrr" fill="var(--color-expansionMrr)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Signal Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Signal Breakdown
            </CardTitle>
            <CardDescription>Expansion signals detected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(
                expansionOpportunities.reduce<Record<string, { count: number; mrr: number }>>((acc, o) => {
                  if (!acc[o.signal]) acc[o.signal] = { count: 0, mrr: 0 };
                  acc[o.signal].count++;
                  acc[o.signal].mrr += o.upliftMrr;
                  return acc;
                }, {}),
              ).map(([signal, data]) => (
                <div key={signal} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{signalLabels[signal] || signal}</p>
                    <p className="text-xs text-muted-foreground">{data.count} opportunities</p>
                  </div>
                  <span className="text-sm font-medium text-purple-600 tabular-nums">
                    +${data.mrr.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Opportunity Pipeline ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Expansion Pipeline</CardTitle>
              <CardDescription>
                {filtered.length} active opportunities
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="identified">Identified</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="negotiating">Negotiating</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Signal</TableHead>
                <TableHead>Current → Suggested</TableHead>
                <TableHead>Uplift</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((opp) => (
                <TableRow key={opp.id} className="cursor-pointer" onClick={() => setSelected(opp)}>
                  <TableCell className="font-medium">{opp.accountName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {signalLabels[opp.signal] || opp.signal}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {opp.currentPlan} → {opp.suggestedPlan}
                  </TableCell>
                  <TableCell className="font-medium text-purple-600 tabular-nums">
                    +${opp.upliftMrr.toLocaleString()}/mo
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm tabular-nums">{opp.confidence}%</span>
                      <Progress value={opp.confidence} className="h-1.5 w-12" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('border-transparent text-xs', statusColors[opp.status])}>
                      {opp.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      setSelected(opp);
                    }}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No opportunities match this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Opportunity Detail Sheet ───────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.accountName}</SheetTitle>
                <SheetDescription>Expansion Opportunity Detail</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Signal</p>
                    <p className="text-sm font-medium">{signalLabels[selected.signal] || selected.signal}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={cn('border-transparent', statusColors[selected.status])}>
                      {selected.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="text-sm font-medium">{selected.confidence}%</p>
                    <Progress value={selected.confidence} className="h-1.5 mt-1" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Identified</p>
                    <p className="text-sm font-medium">{selected.identifiedDate}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Signal Description</p>
                  <p className="text-sm">{selected.signalDescription}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Current MRR</p>
                    <p className="text-lg font-bold">${selected.currentMrr.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-900 dark:bg-purple-900/20">
                    <p className="text-xs text-muted-foreground">Uplift</p>
                    <p className="text-lg font-bold text-purple-600">+${selected.upliftMrr.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Potential MRR</p>
                    <p className="text-lg font-bold">${selected.potentialMrr.toLocaleString()}</p>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground text-center">
                  {selected.currentPlan} → {selected.suggestedPlan}
                </div>

                {selected.lastActionDate && (
                  <>
                    <Separator />
                    <p className="text-xs text-muted-foreground">
                      Last action: {selected.lastActionDate}
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
