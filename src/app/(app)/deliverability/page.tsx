'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MailCheck, MailOpen, MousePointerClick, AlertCircle } from 'lucide-react';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { deliverabilityData } from '@/lib/placeholder-data';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { format } from 'date-fns';

const chartConfig = {
  delivered: {
    label: 'Delivered',
    color: 'hsl(var(--chart-1))',
  },
  opened: {
    label: 'Opened',
    color: 'hsl(var(--chart-2))',
  },
  clicked: {
    label: 'Clicked',
    color: 'hsl(var(--chart-3))',
  },
};

export default function DeliverabilityPage() {
    const latestData = deliverabilityData[deliverabilityData.length - 1];
    const deliveryRate = latestData ? (latestData.delivered / latestData.sent) * 100 : 0;
    const openRate = latestData ? (latestData.opened / latestData.delivered) * 100 : 0;
    const clickRate = latestData ? (latestData.clicked / latestData.opened) * 100 : 0;
    const bounceRate = latestData ? (latestData.bounced / latestData.sent) * 100 : 0;

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <MailCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Emails successfully delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <MailOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Unique opens on delivered emails</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clickRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Unique clicks on opened emails</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bounceRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Emails that failed to deliver</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deliverability Trends (Last 7 Days)</CardTitle>
          <CardDescription>Monitor your email performance over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-80">
            <LineChart data={deliverabilityData}>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="date"
                    tickFormatter={(str) => format(new Date(str), 'MMM d')}
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `${Number(value) / 1000}k`} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="delivered" stroke="var(--color-delivered)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="opened" stroke="var(--color-opened)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clicked" stroke="var(--color-clicked)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
