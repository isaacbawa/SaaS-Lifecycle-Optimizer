'use client';

import { useMemo } from 'react';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { LifecycleState } from '@/lib/definitions';

/* Ordered lifecycle stages for chart display */
const orderedStages: LifecycleState[] = [
  'Lead', 'Trial', 'Activated', 'PowerUser', 'ExpansionReady', 'AtRisk', 'Churned', 'Reactivated',
];

const chartConfig: Record<string, { label: string; color?: string }> = {
  users: { label: 'Users' },
  lead: { label: 'Lead', color: 'hsl(var(--chart-5))' },
  trial: { label: 'Trial', color: 'hsl(var(--chart-4))' },
  activated: { label: 'Activated', color: 'hsl(var(--chart-1))' },
  poweruser: { label: 'Power User', color: 'hsl(var(--chart-2))' },
  expansionready: { label: 'Expansion Ready', color: 'hsl(260 60% 55%)' },
  atrisk: { label: 'At Risk', color: 'hsl(var(--chart-3))' },
  churned: { label: 'Churned', color: 'hsl(var(--destructive))' },
  reactivated: { label: 'Reactivated', color: 'hsl(170 60% 45%)' },
};

interface LifecycleChartProps {
  /** Map of lifecycle stage → user count (from live store data) */
  lifecycleCounts?: Record<string, number>;
}

export function LifecycleChart({ lifecycleCounts = {} }: LifecycleChartProps) {
  const chartData = useMemo(() =>
    orderedStages
      .filter((s) => (lifecycleCounts[s] || 0) > 0)
      .map((stage) => ({
        stage,
        users: lifecycleCounts[stage] || 0,
        fill: `var(--color-${stage.toLowerCase().replace(/\s/g, '')})`,
      })),
    [lifecycleCounts],
  );
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
