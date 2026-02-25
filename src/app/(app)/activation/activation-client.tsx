'use client';

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, Target, Clock, TrendingDown, ArrowRight, CheckCircle2,
} from 'lucide-react';
import {
  Bar, BarChart, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import type { ActivationData, ActivationMilestone, User } from '@/lib/definitions';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';

/* ── Chart Configs ──────────────────────────────────────────────────── */

const funnelConfig = {
  signups: { label: 'Signups', color: 'hsl(var(--chart-5))' },
  completedSetup: { label: 'Setup Completed', color: 'hsl(var(--chart-4))' },
  reachedAha: { label: 'Aha Moment', color: 'hsl(var(--chart-3))' },
  activated: { label: 'Activated', color: 'hsl(var(--chart-1))' },
  converted: { label: 'Converted', color: 'hsl(var(--chart-2))' },
};

/* ── Component ──────────────────────────────────────────────────────── */

interface ActivationClientProps {
  activationData: ActivationData[];
  activationMilestones: ActivationMilestone[];
  users: User[];
}

export function ActivationClient({ activationData, activationMilestones, users }: ActivationClientProps) {
  /* ── Computed Metrics ─────────────────────────────────────────── */
  const totals = activationData.reduce(
    (acc, d) => ({
      signups: acc.signups + d.signups,
      completedSetup: acc.completedSetup + d.completedSetup,
      reachedAha: acc.reachedAha + d.reachedAha,
      activated: acc.activated + d.activated,
      converted: acc.converted + d.converted,
    }),
    { signups: 0, completedSetup: 0, reachedAha: 0, activated: 0, converted: 0 },
  );

  const activationRate =
    totals.signups > 0 ? ((totals.activated / totals.signups) * 100).toFixed(1) : '0.0';
  const conversionRate =
    totals.signups > 0 ? ((totals.converted / totals.signups) * 100).toFixed(1) : '0.0';

  const stuckUsers = users.filter(
    (u) => u.lifecycleState === 'Trial' && u.lastLoginDaysAgo <= 7,
  );

  const funnelSteps = [
    { label: 'Signups', count: totals.signups, rate: 100 },
    { label: 'Setup', count: totals.completedSetup, rate: totals.signups > 0 ? (totals.completedSetup / totals.signups) * 100 : 0 },
    { label: 'Aha Moment', count: totals.reachedAha, rate: totals.signups > 0 ? (totals.reachedAha / totals.signups) * 100 : 0 },
    { label: 'Activated', count: totals.activated, rate: totals.signups > 0 ? (totals.activated / totals.signups) * 100 : 0 },
    { label: 'Converted', count: totals.converted, rate: totals.signups > 0 ? (totals.converted / totals.signups) * 100 : 0 },
  ];
  return (
    <div className="grid gap-6">
      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activation Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activationRate}%</div>
            <Progress value={Number(activationRate)} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial → Paid Conversion</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totals.converted} of {totals.signups} signups this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stuck in Trial</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stuckUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              Active but not yet activated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Signups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.signups}</div>
            <p className="text-xs text-muted-foreground">
              {totals.completedSetup} completed setup ({totals.signups > 0 ? ((totals.completedSetup / totals.signups) * 100).toFixed(0) : 0}%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Visual Funnel ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Activation Funnel</CardTitle>
          <CardDescription>
            Step-by-step conversion from signup to paid customer (7-day aggregate)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-2 py-4">
            {funnelSteps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="text-center min-w-[100px]">
                  <div className="text-2xl font-bold tabular-nums">{step.count}</div>
                  <div className="text-xs text-muted-foreground">{step.label}</div>
                  <div className={cn(
                    'text-xs font-medium mt-0.5',
                    step.rate >= 70 ? 'text-green-600' :
                      step.rate >= 40 ? 'text-amber-600' : 'text-red-600',
                  )}>
                    {step.rate.toFixed(0)}%
                  </div>
                </div>
                {i < funnelSteps.length - 1 && (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <ArrowRight className="h-4 w-4" />
                    <span className="text-[10px]">
                      {funnelSteps[i + 1].count > 0
                        ? `-${((1 - funnelSteps[i + 1].count / step.count) * 100).toFixed(0)}%`
                        : '—'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Tabbed Detail ──────────────────────────────────────── */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="stuck">Stuck Users</TabsTrigger>
        </TabsList>

        {/* Daily chart */}
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Daily Activation Funnel</CardTitle>
              <CardDescription>
                5-stage funnel performance by day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={funnelConfig} className="min-h-[200px] w-full h-80">
                <BarChart data={activationData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="signups" fill="var(--color-signups)" radius={4} />
                  <Bar dataKey="completedSetup" fill="var(--color-completedSetup)" radius={4} />
                  <Bar dataKey="activated" fill="var(--color-activated)" radius={4} />
                  <Bar dataKey="converted" fill="var(--color-converted)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milestones */}
        <TabsContent value="milestones">
          <Card>
            <CardHeader>
              <CardTitle>Activation Milestones</CardTitle>
              <CardDescription>
                Key actions users must complete to reach activation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activationMilestones.map((ms, i) => (
                  <div key={ms.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{ms.name}</p>
                          <p className="text-xs text-muted-foreground">{ms.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium tabular-nums">{ms.completionRate}%</p>
                        <p className="text-xs text-muted-foreground">avg {ms.avgTimeToComplete}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={ms.completionRate} className="h-2 flex-1" />
                      {ms.dropoffRate > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-red-600 shrink-0">
                          <TrendingDown className="h-3 w-3" />
                          {ms.dropoffRate}% drop
                        </span>
                      )}
                    </div>
                    {i < activationMilestones.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stuck Users */}
        <TabsContent value="stuck">
          <Card>
            <CardHeader>
              <CardTitle>Stuck in Trial</CardTitle>
              <CardDescription>
                Users who signed up recently but haven&apos;t activated — require intervention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stuckUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No users currently stuck in trial.</p>
              ) : (
                <div className="space-y-3">
                  {stuckUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {u.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {u.account.name} &middot; {u.featureUsageLast30Days.length} features used
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          Day {u.lastLoginDaysAgo === 0 ? 'Active today' : `${u.lastLoginDaysAgo}d ago`}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {u.sessionDepthMinutes}m avg session
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
