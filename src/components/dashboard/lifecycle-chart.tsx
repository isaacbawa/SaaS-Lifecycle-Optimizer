'use client';

import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const chartData = [
  { stage: 'Lead', users: 186, fill: 'var(--color-lead)' },
  { stage: 'Trial', users: 305, fill: 'var(--color-trial)' },
  { stage: 'Activated', users: 237, fill: 'var(--color-activated)' },
  { stage: 'PowerUser', users: 73, fill: 'var(--color-poweruser)' },
  { stage: 'AtRisk', users: 209, fill: 'var(--color-atrisk)' },
  { stage: 'Churned', users: 114, fill: 'var(--color-churned)' },
];

const chartConfig = {
  users: {
    label: 'Users',
  },
  lead: {
    label: 'Lead',
    color: 'hsl(var(--chart-5))',
  },
  trial: {
    label: 'Trial',
    color: 'hsl(var(--chart-4))',
  },
  activated: {
    label: 'Activated',
    color: 'hsl(var(--chart-1))',
  },
  poweruser: {
    label: 'Power User',
    color: 'hsl(var(--chart-2))',
  },
  atrisk: {
    label: 'At Risk',
    color: 'hsl(var(--chart-3))',
  },
  churned: {
    label: 'Churned',
    color: 'hsl(var(--destructive))',
  },
};

export function LifecycleChart() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-80">
      <BarChart
        accessibilityLayer
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <XAxis
          dataKey="stage"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <Bar dataKey="users" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
