'use client';
import type { User, ChurnRiskAnalysisOutput } from '@/lib/definitions';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { runChurnAnalysis } from '@/app/actions';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';

const stateClasses: Record<User['lifecycleState'], string> = {
    Trial: 'border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100/80 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/40',
    Activated: 'border-transparent bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/20 dark:text-green-300 dark:border-green-900/40',
    AtRisk: 'border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-900/40',
    ExpansionReady: 'border-transparent bg-purple-100 text-purple-800 hover:bg-purple-100/80 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-900/40',
    Churned: 'border-transparent bg-red-100 text-red-800 hover:bg-red-100/80 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40',
};

export function ChurnAnalysisClient({ users }: { users: User[] }) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [analysisResult, setAnalysisResult] =
    useState<ChurnRiskAnalysisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async (user: User) => {
    setSelectedUser(user);
    setIsLoading(true);
    setAnalysisResult(null);

    const result = await runChurnAnalysis(user);
    setAnalysisResult(result);
    setIsLoading(false);
  };

  return (
    <>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="hidden md:table-cell">Account</TableHead>
              <TableHead className="hidden sm:table-cell">
                Lifecycle State
              </TableHead>
              <TableHead className="text-right">MRR</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="hidden h-9 w-9 sm:flex">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
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
                <TableCell className="text-right">
                  ${user.mrr.toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAnalyze(user)}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Analyze Risk
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      >
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Churn Risk Analysis: {selectedUser?.name}</SheetTitle>
            <SheetDescription>
              AI-powered insights into user churn potential and mitigation
              strategies.
            </SheetDescription>
          </SheetHeader>
          <div className="py-6">
            {isLoading && <AnalysisLoadingSkeleton />}
            {analysisResult && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Risk Score:{' '}
                    <span
                      className={`font-bold ${
                        analysisResult.riskScore > 70
                          ? 'text-destructive'
                          : analysisResult.riskScore > 40
                          ? 'text-yellow-500'
                          : 'text-green-500'
                      }`}
                    >
                      {analysisResult.riskScore}/100
                    </span>
                  </h3>
                  <div className="w-full bg-secondary rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        analysisResult.riskScore > 70
                          ? 'bg-destructive'
                          : analysisResult.riskScore > 40
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${analysisResult.riskScore}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Explanation</h3>
                  <p className="text-sm text-muted-foreground">
                    {analysisResult.explanation}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    Recommendations
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {analysisResult.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
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
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
