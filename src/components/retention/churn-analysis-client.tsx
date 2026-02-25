'use client';
import type { User, ChurnRiskAnalysisOutput } from '@/lib/definitions';
import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Wand2, AlertTriangle, Lightbulb, DollarSign } from 'lucide-react';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { runChurnAnalysis } from '@/app/actions';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';

const stateClasses: Record<User['lifecycleState'], string> = {
  Lead: 'border-transparent bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-300',
  Trial: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  Activated: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  PowerUser: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  AtRisk: 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  ExpansionReady: 'border-transparent bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  Churned: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  Reactivated: 'border-transparent bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-300',
};

const priorityColors: Record<string, string> = {
  critical: 'text-red-600',
  high: 'text-amber-600',
  medium: 'text-yellow-600',
  low: 'text-muted-foreground',
};

export function ChurnAnalysisClient({ users }: { users: User[] }) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ChurnRiskAnalysisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async (user: User) => {
    setSelectedUser(user);
    setIsLoading(true);
    setAnalysisResult(null);

    const result = await runChurnAnalysis(user);
    setAnalysisResult(result);
    setIsLoading(false);
  };

  // Sort users: at-risk & churned first, then by risk score desc
  const sortedUsers = [...users].sort((a, b) => {
    const stateOrder: Record<string, number> = {
      Churned: 0, AtRisk: 1, Trial: 2, Activated: 3,
      Reactivated: 4, PowerUser: 5, ExpansionReady: 6, Lead: 7,
    };
    const sa = stateOrder[a.lifecycleState] ?? 9;
    const sb = stateOrder[b.lifecycleState] ?? 9;
    if (sa !== sb) return sa - sb;
    return (b.churnRiskScore ?? 0) - (a.churnRiskScore ?? 0);
  });

  return (
    <>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="hidden md:table-cell">Account</TableHead>
              <TableHead className="hidden sm:table-cell">State</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead className="text-right">MRR</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="hidden h-9 w-9 sm:flex">
                      <AvatarFallback>{user.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {user.account.name}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline" className={cn(stateClasses[user.lifecycleState])}>
                    {user.lifecycleState}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={cn(
                    'text-sm font-medium tabular-nums',
                    (user.churnRiskScore ?? 0) >= 60 ? 'text-red-600' :
                      (user.churnRiskScore ?? 0) >= 30 ? 'text-amber-600' : 'text-green-600',
                  )}>
                    {user.churnRiskScore ?? '—'}%
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${user.mrr.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="outline" size="sm" onClick={() => handleAnalyze(user)}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Analyze
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Churn Risk Analysis: {selectedUser?.name}</SheetTitle>
            <SheetDescription>
              Deep risk assessment with actionable recommendations
            </SheetDescription>
          </SheetHeader>
          <div className="py-6">
            {isLoading && <AnalysisLoadingSkeleton />}
            {analysisResult && (
              <div className="space-y-6">
                {/* Score + Tier */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">
                      Risk Score:{' '}
                      <span className={cn(
                        'font-bold',
                        analysisResult.riskScore >= 70 ? 'text-destructive' :
                          analysisResult.riskScore >= 40 ? 'text-yellow-500' : 'text-green-500',
                      )}>
                        {analysisResult.riskScore}/100
                      </span>
                    </h3>
                    <Badge variant={
                      analysisResult.riskTier === 'Critical' ? 'destructive' :
                        analysisResult.riskTier === 'High' ? 'destructive' : 'secondary'
                    }>
                      {analysisResult.riskTier}
                    </Badge>
                  </div>
                  <Progress
                    value={analysisResult.riskScore}
                    className="h-2.5"
                  />
                </div>

                {/* MRR at Risk */}
                {analysisResult.estimatedMrrAtRisk > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-900/20">
                    <DollarSign className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      ${analysisResult.estimatedMrrAtRisk.toLocaleString()}/mo MRR at risk
                    </span>
                  </div>
                )}

                {/* Explanation */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Analysis</h3>
                  <p className="text-sm text-muted-foreground">{analysisResult.explanation}</p>
                </div>

                {/* Risk Factors */}
                {analysisResult.factors.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Risk Factors ({analysisResult.factors.length})
                    </h3>
                    <div className="space-y-2">
                      {analysisResult.factors.map((factor, i) => (
                        <div key={i} className="flex items-start gap-2 rounded border p-2">
                          <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                            {factor.category}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{factor.signal}</p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            +{factor.weight}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Recommendations */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Recommendations ({analysisResult.recommendations.length})
                  </h3>
                  {analysisResult.recommendations.map((rec, i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={cn('text-xs font-medium', priorityColors[rec.priority] || 'text-muted-foreground')}>
                          {rec.priority} Priority
                        </span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Effort: {rec.effort}</span>
                          <span>&middot;</span>
                          <span>Impact: {rec.expectedImpact}</span>
                        </div>
                      </div>
                      <p className="text-sm">{rec.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function AnalysisLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-6 w-1/2 mb-2" />
        <Skeleton className="h-2.5 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-12 w-full mb-1" />
        <Skeleton className="h-12 w-full mb-1" />
        <Skeleton className="h-12 w-2/3" />
      </div>
    </div>
  );
}
