'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DollarSign, ArrowUpRight, ArrowDownRight, TrendingUp, Users, BarChart3,
} from 'lucide-react';
import {
  Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import type { RevenueData, RevenueWaterfall, Account } from '@/lib/definitions';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';

/* ── Chart Configs ──────────────────────────────────────────────────── */

const mrrChartConfig = {
  netTotal: { label: 'Net MRR', color: 'hsl(var(--chart-1))' },
  newMrr: { label: 'New', color: 'hsl(var(--chart-2))' },
  expansionMrr: { label: 'Expansion', color: 'hsl(var(--chart-3))' },
};

const waterfallConfig = {
  amount: { label: 'Amount', color: 'hsl(var(--chart-1))' },
};

const planChartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(var(--chart-2))' },
};

/* ── Component ──────────────────────────────────────────────────────── */

interface RevenueClientProps {
  revenueData: RevenueData[];
  revenueWaterfall: RevenueWaterfall[];
  accounts: Account[];
}

export function RevenueClient({ revenueData, revenueWaterfall, accounts }: RevenueClientProps) {
  /* ── Computed KPIs ──────────────────────────────────────────── */
  const latestMonth = revenueData[revenueData.length - 1];
  const prevMonth = revenueData[revenueData.length - 2];

  const currentMrr = latestMonth?.netTotal ?? 0;
  const previousMrr = prevMonth?.netTotal ?? 0;
  const mrrGrowth = previousMrr > 0 ? ((currentMrr - previousMrr) / previousMrr) * 100 : 0;
  const currentArr = currentMrr * 12;

  const totalNewMrr = revenueData.reduce((s, d) => s + d.newMrr, 0);
  const totalExpansion = revenueData.reduce((s, d) => s + d.expansionMrr, 0);
  const totalContraction = revenueData.reduce((s, d) => s + d.contractionMrr, 0);
  const totalChurnMrr = revenueData.reduce((s, d) => s + d.churnMrr, 0);

  const payingAccounts = accounts.filter((a) => a.mrr > 0);
  const totalAccountMrr = payingAccounts.reduce((s, a) => s + a.mrr, 0);
  const arpu = payingAccounts.length > 0 ? totalAccountMrr / payingAccounts.length : 0;

  // revenue by plan
  const planRevenue = accounts.reduce((acc, a) => {
    if (a.mrr === 0) return acc;
    if (!acc[a.plan]) acc[a.plan] = { name: a.plan, revenue: 0, count: 0 };
    acc[a.plan].revenue += a.mrr;
    acc[a.plan].count += 1;
    return acc;
  }, {} as Record<string, { name: string; revenue: number; count: number }>);

  const planRevenueData = Object.values(planRevenue).sort((a, b) => b.revenue - a.revenue);
  return (
    <div className="grid gap-6">
      {/* ── KPI Row ─────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentMrr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {mrrGrowth >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600" />
              )}
              <span className={cn(mrrGrowth >= 0 ? 'text-green-600' : 'text-red-600')}>
                {mrrGrowth >= 0 ? '+' : ''}{mrrGrowth.toFixed(1)}%
              </span>{' '}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Run Rate (ARR)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentArr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Based on current MRR × 12</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${arpu.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">{payingAccounts.length} paying accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net New This Month</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(latestMonth ? latestMonth.newMrr + latestMonth.expansionMrr - latestMonth.contractionMrr - latestMonth.churnMrr + latestMonth.reactivationMrr : 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">new + expansion – contraction – churn</p>
          </CardContent>
        </Card>
      </div>

      {/* ── MRR Trend + Plan Breakdown ─────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>MRR Trend</CardTitle>
            <CardDescription>Net MRR with new and expansion breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={mrrChartConfig} className="min-h-[200px] w-full h-80">
              <LineChart data={revenueData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${Number(v) / 1000}k`} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="netTotal" stroke="var(--color-netTotal)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="newMrr" stroke="var(--color-newMrr)" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="expansionMrr" stroke="var(--color-expansionMrr)" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
            <CardDescription>Current MRR distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={planChartConfig} className="min-h-[200px] w-full h-80">
              <BarChart data={planRevenueData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid horizontal={false} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={80} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${Number(v) / 1000}k`} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" layout="vertical" fill="var(--color-revenue)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Revenue Waterfall ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Waterfall</CardTitle>
          <CardDescription>Breakdown of MRR movements: new, expansion, contraction, churn, reactivation</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Starting MRR</TableHead>
                <TableHead className="text-right">New</TableHead>
                <TableHead className="text-right">Expansion</TableHead>
                <TableHead className="text-right">Contraction</TableHead>
                <TableHead className="text-right">Churn</TableHead>
                <TableHead className="text-right">Reactivation</TableHead>
                <TableHead className="text-right">Ending MRR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueWaterfall.map((item) => (
                <TableRow key={item.month}>
                  <TableCell className="font-medium">{item.month}</TableCell>
                  <TableCell className="text-right tabular-nums">${item.startingMrr.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums text-green-600">+${item.newBusiness.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums text-green-600">+${item.expansion.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums text-red-600">${item.contraction.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums text-red-600">${item.churn.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums text-blue-600">+${item.reactivation.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">${item.endingMrr.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator className="my-4" />

          {/* Summary row */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Total New</p>
              <p className="font-bold text-green-600">${totalNewMrr.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Expansion</p>
              <p className="font-bold text-green-600">${totalExpansion.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Contraction</p>
              <p className="font-bold text-red-600">-${totalContraction.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Churned</p>
              <p className="font-bold text-red-600">-${totalChurnMrr.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
