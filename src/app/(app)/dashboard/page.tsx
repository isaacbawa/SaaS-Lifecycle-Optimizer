import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign,
  Heart,
  Rocket,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  Clock,
  Shield,
} from 'lucide-react';
import { LifecycleChart } from '@/components/dashboard/lifecycle-chart';
import { store } from '@/lib/store';
import type { LifecycleState, User, Account, RevenueData, ActivityEntry, ExpansionOpportunity, EmailFlow } from '@/lib/definitions';

/* ==========================================================================
 * Computed KPIs — derived from live store data, never hardcoded
 * ========================================================================== */

function computeDashboardKPIs(
  users: User[],
  accounts: Account[],
  revenueData: RevenueData[],
  expansionOpps: ExpansionOpportunity[],
  emailFlows: EmailFlow[],
) {
  const totalMrr = accounts.reduce((sum, a) => sum + a.mrr, 0);
  const totalArr = accounts.reduce((sum, a) => sum + a.arr, 0);
  const totalUsers = users.length;
  const activeUsers = users.filter(
    (u) => !['Churned', 'Lead'].includes(u.lifecycleState),
  ).length;
  const atRiskUsers = users.filter((u) => u.lifecycleState === 'AtRisk');
  const churnedUsers = users.filter((u) => u.lifecycleState === 'Churned');
  const trialUsers = users.filter((u) => u.lifecycleState === 'Trial');
  const activatedUsers = users.filter(
    (u) => !['Trial', 'Lead', 'Churned'].includes(u.lifecycleState),
  );

  const activationRate =
    trialUsers.length + activatedUsers.length > 0
      ? (activatedUsers.length / (trialUsers.length + activatedUsers.length)) * 100
      : 0;

  const churnRate =
    totalUsers > 0 ? (churnedUsers.length / totalUsers) * 100 : 0;

  const atRiskMrr = atRiskUsers.reduce((sum, u) => sum + u.mrr, 0);

  const expansionPipeline = expansionOpps.reduce(
    (sum, o) => sum + o.upliftMrr,
    0,
  );

  // Rev growth from last two months
  const currentMonthRev =
    revenueData.length > 0 ? revenueData[revenueData.length - 1].netTotal : 0;
  const prevMonthRev =
    revenueData.length > 1 ? revenueData[revenueData.length - 2].netTotal : 0;
  const revGrowth =
    prevMonthRev > 0
      ? ((currentMonthRev - prevMonthRev) / prevMonthRev) * 100
      : 0;

  // Lifecycle distribution
  const lifecycleCounts: Record<string, number> = {};
  for (const u of users) {
    lifecycleCounts[u.lifecycleState] =
      (lifecycleCounts[u.lifecycleState] || 0) + 1;
  }

  // Flow performance
  const activeFlows = emailFlows.filter((f) => f.status === 'Active');
  const totalFlowRevenue = emailFlows.reduce(
    (sum, f) => sum + f.revenueGenerated,
    0,
  );

  return {
    totalMrr,
    totalArr,
    totalUsers,
    activeUsers,
    activationRate,
    churnRate,
    atRiskUsers,
    atRiskMrr,
    expansionPipeline,
    expansionOppsCount: expansionOpps.length,
    revGrowth,
    currentMonthRev,
    lifecycleCounts,
    activeFlows: activeFlows.length,
    totalFlowRevenue,
    accountCount: accounts.length,
    payingAccountCount: accounts.filter((a) => a.mrr > 0).length,
  };
}

/* ==========================================================================
 * Dashboard Page — command center (live store data)
 * ========================================================================== */

export default async function DashboardPage() {
  const [users, accounts, revenueData, expansionOpps, emailFlows, activityFeed] =
    await Promise.all([
      store.getAllUsers(),
      store.getAllAccounts(),
      store.getRevenueData(),
      store.getExpansionOpportunities(),
      store.getAllFlows(),
      store.getActivityFeed(),
    ]);

  const kpi = computeDashboardKPIs(users, accounts, revenueData, expansionOpps, emailFlows);

  const stateColors: Record<string, string> = {
    Lead: 'bg-slate-500',
    Trial: 'bg-blue-500',
    Activated: 'bg-green-500',
    PowerUser: 'bg-emerald-600',
    AtRisk: 'bg-amber-500',
    ExpansionReady: 'bg-purple-500',
    Churned: 'bg-red-500',
    Reactivated: 'bg-teal-500',
  };

  const stateBadgeVariant = (state: LifecycleState) => {
    const map: Record<LifecycleState, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      Lead: 'outline',
      Trial: 'secondary',
      Activated: 'default',
      PowerUser: 'default',
      AtRisk: 'destructive',
      ExpansionReady: 'secondary',
      Churned: 'destructive',
      Reactivated: 'outline',
    };
    return map[state];
  };

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
            <div className="text-2xl font-bold">
              ${kpi.totalMrr.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {kpi.revGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={kpi.revGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {kpi.revGrowth >= 0 ? '+' : ''}{kpi.revGrowth.toFixed(1)}%
              </span>
              <span>from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              of {kpi.totalUsers} total across {kpi.accountCount} accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activation Rate</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpi.activationRate.toFixed(1)}%
            </div>
            <Progress value={kpi.activationRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At-Risk MRR</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              ${kpi.atRiskMrr.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {kpi.atRiskUsers.length} user{kpi.atRiskUsers.length !== 1 ? 's' : ''} at risk &middot; {kpi.churnRate.toFixed(1)}% churn rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Grid: Chart + Sidebar ─────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lifecycle Distribution Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lifecycle Stage Distribution</CardTitle>
            <CardDescription>
              Real-time breakdown of where your users are in the lifecycle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LifecycleChart lifecycleCounts={kpi.lifecycleCounts} />
            <Separator className="my-4" />
            <div className="flex flex-wrap gap-3">
              {Object.entries(kpi.lifecycleCounts).map(([state, count]) => (
                <div key={state} className="flex items-center gap-2 text-sm">
                  <div className={`h-2.5 w-2.5 rounded-full ${stateColors[state] || 'bg-gray-400'}`} />
                  <span className="text-muted-foreground">{state}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Sidebar */}
        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-purple-600" />
                Expansion Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                +${kpi.expansionPipeline.toLocaleString()}/mo
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {kpi.expansionOppsCount} opportunities identified
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                Email Flow Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${kpi.totalFlowRevenue.toLocaleString()}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                revenue from {kpi.activeFlows} active flows
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                Annual Recurring Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${kpi.totalArr.toLocaleString()}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                across {kpi.payingAccountCount} paying accounts
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Bottom Row: At-Risk Alerts + Activity Feed ─────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* At-Risk Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              At-Risk Users
            </CardTitle>
            <CardDescription>
              Users requiring immediate attention to prevent churn
            </CardDescription>
          </CardHeader>
          <CardContent>
            {kpi.atRiskUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users currently at risk.</p>
            ) : (
              <div className="space-y-4">
                {users
                  .filter((u) => ['AtRisk', 'Churned'].includes(u.lifecycleState))
                  .sort((a, b) => (b.churnRiskScore ?? 0) - (a.churnRiskScore ?? 0))
                  .slice(0, 5)
                  .map((user) => (
                    <div key={user.id} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {user.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.account.name} &middot; ${user.mrr}/mo
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={stateBadgeVariant(user.lifecycleState)}>
                          {user.lifecycleState}
                        </Badge>
                        <span className="text-xs font-medium tabular-nums text-amber-600">
                          {user.churnRiskScore ?? '—'}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest lifecycle events and system actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityFeed.slice(0, 8).map((entry) => {
                const typeIcons: Record<string, string> = {
                  lifecycle_change: '🔄',
                  flow_triggered: '📧',
                  expansion_signal: '📈',
                  risk_alert: '⚠️',
                  account_event: '🏢',
                  system: '⚙️',
                };
                const timeAgo = getRelativeTime(entry.timestamp);
                return (
                  <div key={entry.id} className="flex gap-3 text-sm">
                    <span className="shrink-0 text-base leading-5">
                      {typeIcons[entry.type] || '📋'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
