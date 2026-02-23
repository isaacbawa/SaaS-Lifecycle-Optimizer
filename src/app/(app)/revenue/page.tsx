'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ArrowUpRight } from 'lucide-react';
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { revenueData } from '@/lib/placeholder-data';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { accounts } from '@/lib/placeholder-data';

const mrrChartConfig = {
  total: {
    label: 'MRR',
    color: 'hsl(var(--chart-1))',
  },
};

const planRevenue = accounts.reduce((acc, account) => {
    if (!acc[account.plan]) {
        acc[account.plan] = { name: account.plan, revenue: 0 };
    }
    acc[account.plan].revenue += account.mrr;
    return acc;
}, {} as Record<string, {name: string, revenue: number}>);

const planRevenueData = Object.values(planRevenue);

const planChartConfig = {
    revenue: {
        label: 'Revenue',
        color: 'hsl(var(--chart-2))',
    },
}

export default function RevenuePage() {
  const latestMrr = revenueData[revenueData.length - 1]?.total || 0;
  const previousMrr = revenueData[revenueData.length - 2]?.total || 0;
  const mrrChange = latestMrr - previousMrr;
  const mrrChangePercentage = previousMrr > 0 ? (mrrChange / previousMrr) * 100 : 0;

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Recurring Revenue (ARR)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(latestMrr * 12).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Based on current MRR</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New MRR (This Month)</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+${mrrChange.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {mrrChangePercentage.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>MRR Growth</CardTitle>
                <CardDescription>Monthly recurring revenue over time.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={mrrChartConfig} className="min-h-[200px] w-full h-80">
                    <LineChart data={revenueData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `$${Number(value) / 1000}k`} tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} dot={false} />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Revenue by Plan</CardTitle>
                <CardDescription>Breakdown of MRR by subscription plan.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={planChartConfig} className="min-h-[200px] w-full h-80">
                    <BarChart data={planRevenueData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid horizontal={false} />
                        <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={80} />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `$${Number(value) / 1000}k`} tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="revenue" layout="vertical" fill="var(--color-revenue)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
