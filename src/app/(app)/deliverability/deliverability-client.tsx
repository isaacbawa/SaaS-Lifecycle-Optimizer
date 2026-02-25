'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  MailCheck, MailOpen, MousePointerClick, AlertCircle,
  Shield, Globe, CheckCircle2, XCircle, Clock, TrendingUp,
} from 'lucide-react';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import type { DeliverabilityData, SendingDomain, IPWarmingStatus } from '@/lib/definitions';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

/* ── Chart Config ───────────────────────────────────────────────────── */

const chartConfig = {
  delivered: { label: 'Delivered', color: 'hsl(var(--chart-1))' },
  opened: { label: 'Opened', color: 'hsl(var(--chart-2))' },
  clicked: { label: 'Clicked', color: 'hsl(var(--chart-3))' },
  bounced: { label: 'Bounced', color: 'hsl(var(--chart-4))' },
};

const authIcon = (ok: boolean) =>
  ok
    ? <CheckCircle2 className="h-4 w-4 text-green-600" />
    : <XCircle className="h-4 w-4 text-red-500" />;

const domainStatusBadge: Record<string, string> = {
  verified: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
};

/* ── Component ──────────────────────────────────────────────────────── */

interface DeliverabilityClientProps {
  deliverabilityData: DeliverabilityData[];
  sendingDomains: SendingDomain[];
  ipWarmingStatus: IPWarmingStatus[];
}

export function DeliverabilityClient({
  deliverabilityData, sendingDomains, ipWarmingStatus,
}: DeliverabilityClientProps) {
  /* ── Computed KPIs ──────────────────────────────────────────── */
  const totals = deliverabilityData.reduce(
    (a, d) => ({
      sent: a.sent + d.sent,
      delivered: a.delivered + d.delivered,
      opened: a.opened + d.opened,
      clicked: a.clicked + d.clicked,
      bounced: a.bounced + d.bounced,
      spam: a.spam + d.spam,
      unsubscribed: a.unsubscribed + d.unsubscribed,
    }),
    { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0 },
  );

  const deliveryRate = totals.sent > 0 ? (totals.delivered / totals.sent) * 100 : 0;
  const openRate = totals.delivered > 0 ? (totals.opened / totals.delivered) * 100 : 0;
  const clickRate = totals.opened > 0 ? (totals.clicked / totals.opened) * 100 : 0;
  const bounceRate = totals.sent > 0 ? (totals.bounced / totals.sent) * 100 : 0;
  const complaintRate = totals.delivered > 0 ? (totals.spam / totals.delivered) * 100 : 0;
  const unsubRate = totals.delivered > 0 ? (totals.unsubscribed / totals.delivered) * 100 : 0;
  return (
    <div className="grid gap-6">
      {/* ── KPI Row ─────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <MailCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              {totals.delivered.toLocaleString()} / {totals.sent.toLocaleString()} sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <MailOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">{totals.opened.toLocaleString()} unique opens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clickRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">{totals.clicked.toLocaleString()} unique clicks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bounceRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">{totals.bounced.toLocaleString()} bounced</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Trend Chart + Reputation Sidebar ───────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Deliverability Trends (Last 7 Days)</CardTitle>
            <CardDescription>Monitor volume and engagement over time</CardDescription>
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
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `${Number(v) / 1000}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="delivered" stroke="var(--color-delivered)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="opened" stroke="var(--color-opened)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clicked" stroke="var(--color-clicked)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="bounced" stroke="var(--color-bounced)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Suppression / Reputation Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle>Reputation Signals</CardTitle>
            <CardDescription>Key risk indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Complaint Rate</span>
                <span className={cn('font-medium', complaintRate > 0.1 ? 'text-red-600' : 'text-green-600')}>
                  {complaintRate.toFixed(3)}%
                </span>
              </div>
              <Progress value={Math.min(complaintRate * 1000, 100)} className="mt-1 h-1.5" />
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {complaintRate > 0.1 ? '⚠ Above 0.1% threshold' : '✓ Below 0.1% threshold'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Unsubscribe Rate</span>
                <span className={cn('font-medium', unsubRate > 0.5 ? 'text-amber-600' : 'text-green-600')}>
                  {unsubRate.toFixed(2)}%
                </span>
              </div>
              <Progress value={Math.min(unsubRate * 20, 100)} className="mt-1 h-1.5" />
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Bounce Rate</span>
                <span className={cn('font-medium', bounceRate > 2 ? 'text-red-600' : 'text-green-600')}>
                  {bounceRate.toFixed(2)}%
                </span>
              </div>
              <Progress value={Math.min(bounceRate * 10, 100)} className="mt-1 h-1.5" />
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {bounceRate > 2 ? '⚠ Above 2% threshold' : '✓ Below 2% threshold'}
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Suppressed</span>
              <span className="font-medium">{(totals.bounced + totals.spam + totals.unsubscribed).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Sending Domains ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Sending Domains
          </CardTitle>
          <CardDescription>Domain authentication and reputation status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>DKIM</TableHead>
                <TableHead>SPF</TableHead>
                <TableHead>DMARC</TableHead>
                <TableHead>Last Checked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sendingDomains.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.domain}</TableCell>
                  <TableCell>
                    <Badge className={cn('border-transparent', domainStatusBadge[d.status])}>
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{authIcon(d.dkimVerified)}</TableCell>
                  <TableCell>{authIcon(d.spfVerified)}</TableCell>
                  <TableCell>{authIcon(d.dmarcVerified)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.lastChecked}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── IP Warming ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            IP Warming Status
          </CardTitle>
          <CardDescription>Dedicated IP warming progress and scheduling</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {ipWarmingStatus.map((ip) => (
              <div key={ip.ip} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm font-medium">{ip.ip}</p>
                  <Badge variant={ip.phase < ip.totalPhases ? 'default' : 'secondary'}>
                    {ip.phase < ip.totalPhases ? 'Warming' : 'Complete'}
                  </Badge>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Phase {ip.phase} of {ip.totalPhases}</span>
                    <span>{Math.round((ip.phase / ip.totalPhases) * 100)}%</span>
                  </div>
                  <Progress value={(ip.phase / ip.totalPhases) * 100} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Daily Sent</span>
                    <p className="font-medium">{ip.currentDailySent.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Daily Limit</span>
                    <p className="font-medium">{ip.dailyLimit.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reputation</span>
                    <p className="font-medium">{ip.reputation}/100</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Start Date</span>
                    <p className="font-medium">{ip.startDate}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
