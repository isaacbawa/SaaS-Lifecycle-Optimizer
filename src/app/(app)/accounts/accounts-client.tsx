'use client';

import { useState, useMemo } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import type { Account, User, LifecycleState } from '@/lib/definitions';
import {
  Building, CheckCircle, DollarSign, Users as UsersIcon,
  Search, AlertTriangle, ArrowUpRight, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Health badge styles ────────────────────────────────────────────── */

const healthClasses: Record<string, string> = {
  Good: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  Fair: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  Poor: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
};

const stateColor: Record<LifecycleState, string> = {
  Lead: 'bg-slate-500', Trial: 'bg-blue-500', Activated: 'bg-green-500',
  PowerUser: 'bg-emerald-600', AtRisk: 'bg-amber-500',
  ExpansionReady: 'bg-purple-500', Churned: 'bg-red-500', Reactivated: 'bg-teal-500',
};

/* ── Component ──────────────────────────────────────────────────────── */

interface AccountsClientProps {
  accounts: Account[];
  users: User[];
}

export function AccountsClient({ accounts, users }: AccountsClientProps) {
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Account | null>(null);

  // Computed KPIs
  const totalMRR = accounts.reduce((s, a) => s + a.mrr, 0);
  const totalARR = accounts.reduce((s, a) => s + a.arr, 0);
  const healthyCount = accounts.filter((a) => a.health === 'Good').length;
  const totalUsers = accounts.reduce((s, a) => s + a.userCount, 0);
  const avgMrr = accounts.length > 0 ? totalMRR / accounts.length : 0;
  const payingAccounts = accounts.filter((a) => a.mrr > 0);

  // Filter
  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      const matchSearch =
        !search ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.domain && a.domain.toLowerCase().includes(search.toLowerCase())) ||
        (a.industry && a.industry.toLowerCase().includes(search.toLowerCase()));
      const matchHealth = healthFilter === 'all' || a.health === healthFilter;
      const matchPlan = planFilter === 'all' || a.plan === planFilter;
      return matchSearch && matchHealth && matchPlan;
    });
  }, [search, healthFilter, planFilter]);

  // Account users for detail panel
  const accountUsers = (accountId: string) =>
    users.filter((u) => u.account.id === accountId);

  return (
    <div className="grid gap-6">
      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">
              {payingAccounts.length} paying &middot; {accounts.length - payingAccounts.length} trial/churned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Accounts</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthyCount}</div>
            <Progress value={(healthyCount / accounts.length) * 100} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total ARR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalARR.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg ${avgMrr.toFixed(0)}/mo per account
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Avg {(totalUsers / accounts.length).toFixed(1)} per account
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters + Table ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Accounts</CardTitle>
              <CardDescription className="mt-1">
                {filtered.length} of {accounts.length} accounts
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, domain, industry..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={healthFilter} onValueChange={setHealthFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Health" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Health</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="Trial">Trial</SelectItem>
                  <SelectItem value="Starter">Starter</SelectItem>
                  <SelectItem value="Growth">Growth</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>Users / Seats</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Churn Risk</TableHead>
                <TableHead>Expansion</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((account) => {
                const seatUtil =
                  account.seatLimit > 0
                    ? (account.userCount / account.seatLimit) * 100
                    : 0;
                return (
                  <TableRow key={account.id} className="cursor-pointer" onClick={() => setSelected(account)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{account.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-xs text-muted-foreground">{account.industry || '—'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{account.plan}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${account.mrr.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{account.userCount}/{account.seatLimit}</span>
                        <Progress value={seatUtil} className="h-1.5 w-16" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('border-transparent', healthClasses[account.health])}>
                        {account.health}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'text-sm font-medium tabular-nums',
                        account.churnRiskScore >= 60 ? 'text-red-600' :
                          account.churnRiskScore >= 30 ? 'text-amber-600' : 'text-green-600',
                      )}>
                        {account.churnRiskScore}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'text-sm font-medium tabular-nums',
                        account.expansionScore >= 60 ? 'text-purple-600' :
                          account.expansionScore >= 30 ? 'text-blue-600' : 'text-muted-foreground',
                      )}>
                        {account.expansionScore}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelected(account); }}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No accounts match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Account Detail Sheet ───────────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{selected.initials}</AvatarFallback>
                  </Avatar>
                  {selected.name}
                </SheetTitle>
                <SheetDescription>
                  {selected.industry || 'No industry'} &middot; {selected.domain || 'No domain'}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Plan & Revenue */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Plan</p>
                    <p className="text-sm font-medium">{selected.plan}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">MRR / ARR</p>
                    <p className="text-sm font-medium">${selected.mrr.toLocaleString()} / ${selected.arr.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Health</p>
                    <Badge className={cn('border-transparent', healthClasses[selected.health])}>
                      {selected.health}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sign-up Date</p>
                    <p className="text-sm font-medium">{selected.signupDate || '—'}</p>
                  </div>
                </div>

                <Separator />

                {/* Risk & Expansion Scores */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Churn Risk
                    </p>
                    <div className="mt-1.5">
                      <span className={cn(
                        'text-lg font-bold',
                        selected.churnRiskScore >= 60 ? 'text-red-600' :
                          selected.churnRiskScore >= 30 ? 'text-amber-600' : 'text-green-600',
                      )}>
                        {selected.churnRiskScore}%
                      </span>
                      <Progress
                        value={selected.churnRiskScore}
                        className="mt-1 h-1.5"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" /> Expansion Score
                    </p>
                    <div className="mt-1.5">
                      <span className="text-lg font-bold text-purple-600">
                        {selected.expansionScore}%
                      </span>
                      <Progress
                        value={selected.expansionScore}
                        className="mt-1 h-1.5"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Seat Utilization */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Seat Utilization: {selected.userCount} of {selected.seatLimit} ({selected.seatLimit > 0 ? ((selected.userCount / selected.seatLimit) * 100).toFixed(0) : 0}%)
                  </p>
                  <Progress
                    value={selected.seatLimit > 0 ? (selected.userCount / selected.seatLimit) * 100 : 0}
                    className="h-2"
                  />
                </div>

                {/* Lifecycle Distribution */}
                {selected.lifecycleDistribution && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-3">Lifecycle Distribution</p>
                      <div className="space-y-2">
                        {(Object.entries(selected.lifecycleDistribution) as [LifecycleState, number][]).map(
                          ([state, count]) => (
                            <div key={state} className="flex items-center gap-2">
                              <div className={cn('h-2.5 w-2.5 rounded-full', stateColor[state])} />
                              <span className="text-sm flex-1">{state}</span>
                              <span className="text-sm font-medium tabular-nums">{count}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Users in Account */}
                <div>
                  <p className="text-xs text-muted-foreground mb-3">Users ({accountUsers(selected.id).length})</p>
                  <div className="space-y-3">
                    {accountUsers(selected.id).map((u) => (
                      <div key={u.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {u.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{u.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {u.lifecycleState}
                        </Badge>
                      </div>
                    ))}
                    {accountUsers(selected.id).length === 0 && (
                      <p className="text-sm text-muted-foreground">No tracked users.</p>
                    )}
                  </div>
                </div>

                {/* Tags & Meta */}
                {selected.tags && selected.tags.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selected.contractRenewalDate && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Renewal:</span>
                      <span className="font-medium">{selected.contractRenewalDate}</span>
                    </div>
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
