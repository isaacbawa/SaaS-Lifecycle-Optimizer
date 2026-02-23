import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { accounts } from '@/lib/placeholder-data';
import { Building, CheckCircle, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const healthClasses: Record<typeof accounts[0]['health'], string> = {
  Good: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  Fair: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  Poor: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
};

export default function AccountsPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Accounts</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.filter(a => a.health === 'Good').length}</div>
            <p className="text-xs text-muted-foreground">75% of total accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. MRR/Account</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(accounts.reduce((sum, a) => sum + a.mrr, 0) / accounts.length).toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">+5% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Users/Account</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(accounts.reduce((sum, a) => sum + a.userCount, 0) / accounts.length).toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Stable from last month</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Accounts</CardTitle>
          <CardDescription>An overview of all customer accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Health</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={account.logo} alt={account.name} />
                        <AvatarFallback>{account.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{account.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{account.plan}</Badge>
                  </TableCell>
                  <TableCell>${account.mrr.toLocaleString()}</TableCell>
                  <TableCell>{account.userCount}</TableCell>
                  <TableCell>
                    <Badge className={cn('border-transparent', healthClasses[account.health])}>
                      {account.health}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
