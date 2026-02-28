import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ChurnAnalysisClient } from '@/components/retention/churn-analysis-client';
import { resolveOrgId } from '@/lib/auth/resolve-org';
import { getAllTrackedUsers } from '@/lib/db/operations';
import { mapTrackedUserToUser, computeRetentionCohorts } from '@/lib/db/mappers';
import {
  Shield, AlertTriangle, TrendingDown, Users, Heart, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Component ──────────────────────────────────────────────────────── */

export default async function RetentionPage() {
  const orgId = await resolveOrgId();
  const dbUsers = await getAllTrackedUsers(orgId);
  const users = dbUsers.map(mapTrackedUserToUser);
  const retentionCohorts = computeRetentionCohorts(dbUsers);

  /* ── Computed Metrics ─────────────────────────────────────────── */
  const activeUsers = users.filter((u) => !['Churned', 'Lead'].includes(u.lifecycleState));
  const atRiskUsers = users.filter((u) => u.lifecycleState === 'AtRisk');
  const churnedUsers = users.filter((u) => u.lifecycleState === 'Churned');
  const totalUsers = users.length;
  const nonLeadUsers = users.filter((u) => u.lifecycleState !== 'Lead');
  const retentionRate = nonLeadUsers.length > 0
    ? ((nonLeadUsers.length - churnedUsers.length) / nonLeadUsers.length * 100) : 100;
  const churnRate = nonLeadUsers.length > 0
    ? (churnedUsers.length / nonLeadUsers.length * 100) : 0;
  const atRiskMrr = atRiskUsers.reduce((s, u) => s + u.mrr, 0);
  const churnedMrr = churnedUsers.reduce((s, u) => s + u.mrr, 0);
  const avgRiskScore = users.length > 0
    ? users.reduce((s, u) => s + (u.churnRiskScore ?? 0), 0) / users.length : 0;

  // Risk distribution
  const riskTiers = {
    Critical: users.filter((u) => (u.churnRiskScore ?? 0) >= 80),
    High: users.filter((u) => (u.churnRiskScore ?? 0) >= 60 && (u.churnRiskScore ?? 0) < 80),
    Medium: users.filter((u) => (u.churnRiskScore ?? 0) >= 40 && (u.churnRiskScore ?? 0) < 60),
    Low: users.filter((u) => (u.churnRiskScore ?? 0) >= 20 && (u.churnRiskScore ?? 0) < 40),
    Healthy: users.filter((u) => (u.churnRiskScore ?? 0) < 20),
  };

  const tierColors: Record<string, string> = {
    Critical: 'bg-red-600',
    High: 'bg-red-400',
    Medium: 'bg-amber-500',
    Low: 'bg-yellow-400',
    Healthy: 'bg-green-500',
  };
  return (
    <div className="grid gap-6">
      {/* ── KPI Row ─────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{retentionRate.toFixed(1)}%</div>
            <Progress value={retentionRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{churnRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {churnedUsers.length} churned of {nonLeadUsers.length} users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At-Risk MRR</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">${atRiskMrr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {atRiskUsers.length} users at risk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRiskScore.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              across {totalUsers} tracked users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Risk Distribution + Cohort ─────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Risk Distribution
            </CardTitle>
            <CardDescription>
              Breakdown of users by churn risk tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(riskTiers).map(([tier, tierUsers]) => (
                <div key={tier}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={cn('h-2.5 w-2.5 rounded-full', tierColors[tier])} />
                      <span className="text-sm font-medium">{tier}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm tabular-nums">{tierUsers.length}</span>
                      <span className="text-xs text-muted-foreground">
                        (${tierUsers.reduce((s, u) => s + u.mrr, 0).toLocaleString()}/mo)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={totalUsers > 0 ? (tierUsers.length / totalUsers) * 100 : 0}
                    className="h-1.5"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cohort Retention Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Cohort Retention
            </CardTitle>
            <CardDescription>
              Monthly cohort retention rates (% of users still active)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left py-1 pr-2 font-medium text-muted-foreground">Cohort</th>
                    <th className="text-center py-1 px-1 font-medium text-muted-foreground">Size</th>
                    {[0, 1, 2, 3, 4, 5, 6].map((m) => (
                      <th key={m} className="text-center py-1 px-1 font-medium text-muted-foreground">
                        M{m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {retentionCohorts.map((cohort) => (
                    <tr key={cohort.cohort}>
                      <td className="py-1 pr-2 font-medium whitespace-nowrap">{cohort.cohort}</td>
                      <td className="text-center py-1 px-1">{cohort.size}</td>
                      {[0, 1, 2, 3, 4, 5, 6].map((m) => {
                        const val = cohort.retention[m];
                        if (val === undefined) return <td key={m} className="py-1 px-1" />;
                        const bg =
                          val >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                            val >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                              'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
                        return (
                          <td key={m} className={cn('text-center py-1 px-1 rounded font-medium tabular-nums', bg)}>
                            {val}%
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Churn Analysis Engine ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Churn Risk Analysis Engine</CardTitle>
          <CardDescription>
            Select any user to run a deep churn risk analysis with actionable recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChurnAnalysisClient users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
