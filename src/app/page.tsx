import Link from 'next/link';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { MarketingFooter } from '@/components/layout/marketing-footer';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  TrendingUp,
  Zap,
  Target,
  BarChart3,
  Code,
  Shield,
  ArrowRight,
  Mail,
  Activity,
  AlertTriangle,
  Users,
  Sparkles,
  UserCheck,
  Send,
  Eye,
  Bell,
  Timer,
  Check,
  Layers,
  MousePointerClick,
  ChevronRight,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />
      <main className="flex-1">
        {/* ================================================================
            HERO — Mock dashboard with floating callout badges
            ================================================================ */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 gradient-mesh" />
          <div className="container relative py-12 md:py-16 lg:py-20">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="flex flex-col gap-6">
                <Badge variant="secondary" className="w-fit text-sm font-medium px-4 py-1.5 gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  The SaaS Email Marketing Platform
                </Badge>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
                  Turn product usage into{' '}
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    recurring revenue
                  </span>
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                  LifecycleOS connects your product data to automated email flows
                  that activate trials, prevent churn, and expand accounts — all
                  driven by real user behavior, not guesswork.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button size="lg" className="text-base uppercase tracking-wide font-semibold" asChild>
                    <Link href="/sign-up">
                      Get Started For Free <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="text-base" asChild>
                    <Link href="/docs">View SDK docs</Link>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  14-day trial &middot; Full platform access &middot; No credit card required
                </p>
              </div>

              {/* Mock Dashboard UI with floating callout badges */}
              <div className="relative mt-8 lg:mt-0">
                {/* Floating callouts */}
                <div className="absolute -top-4 -left-4 z-20 animate-float">
                  <div className="flex items-center gap-2 rounded-full bg-green-500 text-white px-4 py-2 text-sm font-semibold shadow-lg shadow-green-500/20">
                    <UserCheck className="h-4 w-4" />
                    Lifecycle Stage
                  </div>
                </div>
                <div className="absolute top-16 -right-6 z-20 animate-float-delayed">
                  <div className="flex items-center gap-2 rounded-full bg-destructive text-white px-4 py-2 text-sm font-semibold shadow-lg shadow-destructive/20">
                    <AlertTriangle className="h-4 w-4" />
                    Churn Risk
                  </div>
                </div>
                <div className="absolute bottom-28 -left-8 z-20 animate-float-slow">
                  <div className="flex items-center gap-2 rounded-full bg-primary text-white px-4 py-2 text-sm font-semibold shadow-lg shadow-primary/20">
                    <TrendingUp className="h-4 w-4" />
                    Revenue
                  </div>
                </div>
                <div className="absolute -bottom-2 right-8 z-20 animate-float-delayed">
                  <div className="flex items-center gap-2 rounded-full bg-accent text-white px-4 py-2 text-sm font-semibold shadow-lg shadow-accent/20">
                    <Mail className="h-4 w-4" />
                    Auto Emails
                  </div>
                </div>

                {/* Dashboard panel */}
                <div className="rounded-xl border bg-card shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">LifecycleOS</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="px-2 py-1 bg-muted rounded font-medium">Dashboard</span>
                      <span>Flows</span>
                      <span>Analytics</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-0 border-b">
                    {[
                      { label: 'Active Users', value: '2,847', change: '+12%', color: 'text-primary' },
                      { label: 'Activation', value: '68.4%', change: '+5.2%', color: 'text-green-600' },
                      { label: 'At Risk', value: '142', change: '-18%', color: 'text-destructive' },
                      { label: 'MRR', value: '$84.2K', change: '+$3.1K', color: 'text-accent' },
                    ].map((stat, i) => (
                      <div key={i} className={`p-3 text-center ${i < 3 ? 'border-r' : ''}`}>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-[10px] text-green-600 font-medium">{stat.change}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 flex items-center px-3 rounded-md border text-xs text-muted-foreground bg-background flex-1">
                        Search users...
                      </div>
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">
                        <Sparkles className="h-3 w-3" /> AI Insights
                      </div>
                    </div>
                    <div className="rounded-lg border overflow-hidden">
                      <div className="grid grid-cols-5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 px-3 py-2 border-b">
                        <span>User</span><span>Lifecycle</span><span>Risk</span><span>Active</span><span>MRR</span>
                      </div>
                      {[
                        { name: 'Sarah Chen', email: 'sarah@techflow.io', state: 'Power User', risk: 'Low', riskColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', active: '2m ago', mrr: '$299' },
                        { name: 'James Wilson', email: 'james@scalehq.com', state: 'At Risk', risk: 'High', riskColor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', active: '5d ago', mrr: '$149' },
                        { name: 'Priya Patel', email: 'priya@cloudnova.io', state: 'Activated', risk: 'Medium', riskColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', active: '1h ago', mrr: '$149' },
                        { name: 'Alex Rivera', email: 'alex@datawise.co', state: 'Trial', risk: 'Low', riskColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', active: 'Now', mrr: '$0' },
                        { name: 'Mia Thompson', email: 'mia@growthlab.io', state: 'Expansion', risk: 'Low', riskColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', active: '30m', mrr: '$349' },
                      ].map((user, i) => (
                        <div key={i} className={`grid grid-cols-5 px-3 py-2.5 text-xs items-center ${i < 4 ? 'border-b' : ''} hover:bg-muted/20`}>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-[10px] text-muted-foreground">{user.email}</p>
                          </div>
                          <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">{user.state}</span>
                          <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-medium ${user.riskColor}`}>{user.risk}</span>
                          <span className="text-muted-foreground">{user.active}</span>
                          <span className="font-medium">{user.mrr}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SOCIAL PROOF — Metrics banner
            ================================================================ */}
        <section className="border-y bg-muted/30">
          <div className="container py-10">
            <p className="text-center text-sm font-medium text-muted-foreground mb-6">
              Trusted by 500+ SaaS teams driving lifecycle revenue
            </p>
            <div className="flex flex-wrap justify-center gap-x-8 sm:gap-x-12 gap-y-4 opacity-60 mb-8">
              {['TechFlow', 'ScaleHQ', 'CloudNova', 'DataWise', 'GrowthLab', 'ShipFast'].map(
                (name) => (
                  <span key={name} className="text-lg font-semibold tracking-tight">
                    {name}
                  </span>
                ),
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10 pt-6 border-t">
              {[
                { value: '200M+', label: 'Events processed monthly' },
                { value: '99.3%', label: 'Email delivery rate' },
                { value: '+34%', label: 'Avg. activation lift' },
                { value: '-28%', label: 'Avg. churn reduction' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            HOW IT WORKS — Visual flow with connecting arrows
            ================================================================ */}
        <section id="how-it-works" className="container py-20 md:py-28">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              From raw product data to automated revenue growth
            </h2>
            <p className="text-muted-foreground text-lg">
              Three steps. No data team required. Works with your existing stack.
            </p>
          </div>

          <div className="grid md:grid-cols-[1fr,auto,1fr,auto,1fr] gap-4 md:gap-6 items-start">
            {/* Step 1 */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-4 right-4 text-6xl font-black text-muted/20">01</div>
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Code className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Connect your product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Install our lightweight SDK. We automatically track events, identify users, and sync with billing.
                </p>
                <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono text-muted-foreground">
                  <p className="text-primary">import</p>
                  <p>&nbsp;&nbsp;{'{ createClient }'}</p>
                  <p className="text-primary">from</p>
                  <p>&nbsp;&nbsp;{`'@lifecycleos/sdk'`}</p>
                  <p className="mt-1 text-green-600">{'// 10 lines of code'}</p>
                </div>
              </CardContent>
            </Card>

            <div className="hidden md:flex items-center justify-center pt-24">
              <div className="flex items-center gap-1">
                <div className="h-0.5 w-8 bg-gradient-to-r from-primary/40 to-primary/20" />
                <ChevronRight className="h-5 w-5 text-primary/40" />
              </div>
            </div>

            {/* Step 2 */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-4 right-4 text-6xl font-black text-muted/20">02</div>
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Engine classifies users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Our lifecycle engine scores behavior in real-time to assign states and risk levels.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { state: 'Trial', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                    { state: 'Activated', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
                    { state: 'At Risk', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
                    { state: 'Power User', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
                  ].map((s) => (
                    <span key={s.state} className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${s.color}`}>
                      {s.state}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="hidden md:flex items-center justify-center pt-24">
              <div className="flex items-center gap-1">
                <div className="h-0.5 w-8 bg-gradient-to-r from-primary/40 to-primary/20" />
                <ChevronRight className="h-5 w-5 text-primary/40" />
              </div>
            </div>

            {/* Step 3 */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-4 right-4 text-6xl font-black text-muted/20">03</div>
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Flows drive revenue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Pre-built email flows trigger on lifecycle transitions. Every message is timed to convert.
                </p>
                <div className="space-y-1.5">
                  {[
                    { flow: 'Onboarding sequence', sends: '2.4K sent' },
                    { flow: 'Churn intervention', sends: '891 sent' },
                    { flow: 'Upgrade prompt', sends: '1.2K sent' },
                  ].map((f) => (
                    <div key={f.flow} className="flex items-center justify-between text-xs rounded-md bg-muted/50 px-3 py-1.5">
                      <span className="font-medium">{f.flow}</span>
                      <span className="text-green-600 font-medium">{f.sends}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ================================================================
            FEATURE DEEP-DIVE 1: Lifecycle Engine — Mock user classification panel
            ================================================================ */}
        <section id="features" className="border-t bg-muted/30 py-20 md:py-28">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="flex flex-col gap-5">
                <Badge variant="outline" className="w-fit">Lifecycle Engine</Badge>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Classify every user{' '}
                  <span className="text-primary">automatically</span>
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Our AI-powered lifecycle engine analyzes product usage, billing
                  data, and engagement patterns to assign each user a real-time
                  lifecycle state — no manual tagging or guesswork.
                </p>
                <ul className="space-y-3">
                  {[
                    'Real-time state assignment across 6 lifecycle stages',
                    'Account-level roll-up for B2B team insights',
                    'Custom rules and machine-learned risk models',
                    'Automatic sync with Stripe, Segment, and Salesforce',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-fit mt-2" variant="outline" asChild>
                  <Link href="/activation">
                    Explore activation engine <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* Mock: User segments panel */}
              <div className="relative">
                <div className="absolute -top-3 right-4 z-10 animate-float">
                  <div className="flex items-center gap-1.5 rounded-full bg-accent text-white px-3 py-1.5 text-xs font-semibold shadow-lg">
                    <Sparkles className="h-3 w-3" /> AI-Powered
                  </div>
                </div>
                <Card className="shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                    <span className="text-sm font-semibold">User Segments</span>
                    <Badge variant="secondary" className="text-xs">Live</Badge>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    {[
                      { segment: 'Power Users', count: 847, pct: 30, color: 'bg-primary' },
                      { segment: 'Activated', count: 1204, pct: 42, color: 'bg-green-500' },
                      { segment: 'Trial', count: 423, pct: 15, color: 'bg-blue-400' },
                      { segment: 'At Risk', count: 142, pct: 5, color: 'bg-destructive' },
                      { segment: 'Expansion Ready', count: 231, pct: 8, color: 'bg-accent' },
                    ].map((seg) => (
                      <div key={seg.segment} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{seg.segment}</span>
                          <span className="text-muted-foreground">{seg.count.toLocaleString()} users</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${seg.color}`} style={{ width: `${seg.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            FEATURE SHOWCASE: Churn Prevention — Dark gradient banner
            ================================================================ */}
        <section className="py-20 md:py-28">
          <div className="container">
            <div className="relative rounded-3xl gradient-dark-card overflow-hidden px-8 py-16 md:px-16 md:py-24">
              {/* Decorative floating icons */}
              <div className="absolute top-8 left-8 w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center animate-float">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="absolute top-12 right-16 w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center animate-float-delayed">
                <Heart className="h-5 w-5 text-green-400" />
              </div>
              <div className="absolute bottom-16 left-20 w-11 h-11 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center animate-float-slow">
                <Bell className="h-5 w-5 text-amber-400" />
              </div>
              <div className="absolute bottom-12 right-12 w-13 h-13 rounded-full bg-accent/20 border-2 border-accent/40 flex items-center justify-center animate-float">
                <Shield className="h-5 w-5 text-purple-400" />
              </div>
              <div className="absolute top-1/2 left-1/4 w-10 h-10 rounded-full bg-destructive/20 border-2 border-destructive/40 flex items-center justify-center animate-float-delayed">
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
              <div className="absolute bottom-1/3 right-1/4 w-10 h-10 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center animate-float-slow">
                <Eye className="h-4 w-4 text-blue-400" />
              </div>

              <div className="relative z-10 text-center max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
                  Catch every at-risk customer
                </h2>
                <h3 className="text-2xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-6">
                  Before they churn
                </h3>
                <p className="text-white/70 text-lg md:text-xl leading-relaxed mb-8 max-w-2xl mx-auto">
                  We analyze login frequency, feature adoption, support tickets, billing
                  patterns, and 15+ behavioral signals. Our churn risk engine catches
                  disengaging users days before they cancel — so your team can intervene.
                </p>
                <Button size="lg" className="text-base" asChild>
                  <Link href="/retention">
                    Explore churn prevention <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            FEATURE DEEP-DIVE 2: Email Flow Builder — Mock flow panel
            ================================================================ */}
        <section className="border-t bg-muted/30 py-20 md:py-28">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Mock: Flow builder panel */}
              <div className="relative order-2 lg:order-1">
                <div className="absolute -top-3 left-4 z-10 animate-float-delayed">
                  <div className="flex items-center gap-1.5 rounded-full bg-green-500 text-white px-3 py-1.5 text-xs font-semibold shadow-lg">
                    <Zap className="h-3 w-3" /> Auto-triggered
                  </div>
                </div>
                <Card className="shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                    <span className="text-sm font-semibold">Flow Builder</span>
                    <Badge variant="secondary" className="text-xs">Onboarding Flow</Badge>
                  </div>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Row 1: Trigger → Wait → Send */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 text-xs font-medium">
                          <Zap className="h-3 w-3" /> Trial Started
                        </div>
                        <div className="h-0.5 w-6 bg-border" />
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 text-xs font-medium">
                          <Timer className="h-3 w-3" /> Wait 2 days
                        </div>
                        <div className="h-0.5 w-6 bg-border" />
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-primary text-xs font-medium">
                          <Mail className="h-3 w-3" /> Welcome Email
                        </div>
                      </div>

                      {/* Vertical connector */}
                      <div className="ml-[60%] w-0.5 h-3 bg-border" />

                      {/* Row 2: Condition check */}
                      <div className="flex items-center gap-2 ml-8">
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400 text-xs font-medium">
                          <Eye className="h-3 w-3" /> Core Feature Used?
                        </div>
                      </div>

                      {/* Branch */}
                      <div className="flex items-start gap-6 ml-12">
                        <div className="text-center">
                          <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold mb-1.5">Yes</p>
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 text-xs font-medium">
                            <Send className="h-3 w-3" /> Power Tips
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-destructive font-semibold mb-1.5">No</p>
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 text-xs font-medium">
                            <Bell className="h-3 w-3" /> Nudge Email
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col gap-5 order-1 lg:order-2">
                <Badge variant="outline" className="w-fit">Visual Flow Builder</Badge>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Automated flows{' '}
                  <span className="text-primary">that convert</span>
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Build multi-step email sequences that trigger on lifecycle state
                  changes, user events, or time-based schedules. Branch on conditions,
                  personalize with product data, and measure every step.
                </p>
                <ul className="space-y-3">
                  {[
                    'Drag-and-drop visual builder with live preview',
                    'Branch logic: conditions, A/B splits, and time delays',
                    'Dynamic variables from product usage data',
                    'Pre-built templates for onboarding, churn, and expansion',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-fit mt-2" variant="outline" asChild>
                  <Link href="/flows">
                    Explore flow builder <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            FEATURE DEEP-DIVE 3: Expansion Intelligence — Mock usage panel
            ================================================================ */}
        <section className="py-20 md:py-28">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="flex flex-col gap-5">
                <Badge variant="outline" className="w-fit">Expansion Intelligence</Badge>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Detect upgrade opportunities{' '}
                  <span className="text-primary">automatically</span>
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  LifecycleOS monitors seat limits, API calls, storage usage, and
                  feature adoption to surface accounts ready to expand. Trigger
                  personalized upgrade flows at the perfect moment.
                </p>
                <ul className="space-y-3">
                  {[
                    'Usage threshold detection across any metric',
                    'Account-level expansion scoring and ranking',
                    'Automatic upgrade email flows with contextual data',
                    'Revenue attribution for every expansion event',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-fit mt-2" variant="outline" asChild>
                  <Link href="/expansion">
                    Explore expansion tools <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* Mock: Account usage panel */}
              <div className="relative">
                <div className="absolute -top-3 right-8 z-10 animate-float">
                  <div className="flex items-center gap-1.5 rounded-full bg-amber-500 text-white px-3 py-1.5 text-xs font-semibold shadow-lg">
                    <TrendingUp className="h-3 w-3" /> Expansion Signal
                  </div>
                </div>
                <Card className="shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold">Acme Corp</span>
                      <span className="text-xs text-muted-foreground ml-2">Growth Plan</span>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">Expansion Ready</Badge>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    {[
                      { metric: 'Active Seats', current: 47, limit: 50, pct: 94, color: 'bg-destructive' },
                      { metric: 'API Calls / mo', current: 920000, limit: 1000000, pct: 92, color: 'bg-amber-500' },
                      { metric: 'Storage Used', current: 4.2, limit: 5, pct: 84, color: 'bg-amber-400' },
                      { metric: 'Feature Adoption', current: 89, limit: 100, pct: 89, color: 'bg-green-500' },
                    ].map((m) => (
                      <div key={m.metric} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{m.metric}</span>
                          <span className="text-muted-foreground text-xs">
                            {typeof m.current === 'number' && m.current > 1000 ? `${(m.current / 1000).toFixed(0)}K` : m.current}
                            {' / '}
                            {typeof m.limit === 'number' && m.limit > 1000 ? `${(m.limit / 1000).toFixed(0)}K` : m.limit}
                            {m.metric === 'Storage Used' ? ' GB' : m.metric === 'Feature Adoption' ? '%' : ''}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.pct}%` }} />
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                      <MousePointerClick className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        Upgrade flow triggered automatically — email sent to admin
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            EVERYTHING YOU NEED — Platform summary with mock UI
            ================================================================ */}
        <section className="border-t bg-muted/30 py-20 md:py-28">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="flex flex-col gap-5">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Everything you need{' '}
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    in one platform
                  </span>
                </h2>
                <ul className="space-y-4 text-muted-foreground">
                  {[
                    { num: '6', label: 'Lifecycle Stages tracked automatically' },
                    { num: '15+', label: 'Behavioral Signals for churn risk' },
                    { num: '∞', label: 'Automated Email Flows (Growth+)' },
                    { num: '7', label: 'Integrations with your stack' },
                    { num: '99.3%', label: 'Email Inbox Placement rate' },
                    { num: '1', label: 'Platform to replace 3+ tools' },
                  ].map((item) => (
                    <li key={item.label} className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-primary min-w-[3rem]">{item.num}</span>
                      <span className="text-sm">{item.label}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" className="w-fit mt-2 text-base uppercase tracking-wide font-semibold" asChild>
                  <Link href="/sign-up">
                    Get Started For Free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* Mock: Multi-panel overview */}
              <div className="relative">
                <Card className="shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">LifecycleOS</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="px-2 py-1 bg-muted rounded font-medium">Revenue</span>
                      <span>Flows</span>
                      <span>Segments</span>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    {/* Mini MRR chart mockup */}
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold">MRR Growth</span>
                        <span className="text-xs text-green-600 font-medium">+12.4% this month</span>
                      </div>
                      <div className="flex items-end gap-1 h-16">
                        {[35, 42, 38, 52, 48, 55, 62, 58, 68, 72, 78, 84].map((h, i) => (
                          <div key={i} className="flex-1 rounded-t bg-primary/20 hover:bg-primary/40 transition-colors" style={{ height: `${h}%` }}>
                            {i === 11 && <div className="w-full h-full rounded-t bg-primary" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mini integration row */}
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-xs font-semibold">Integrations</span>
                      <div className="flex -space-x-1">
                        {['S', 'Se', 'Sl', 'SF', 'HB'].map((icon, i) => (
                          <div key={i} className="flex h-6 w-6 items-center justify-center rounded-full bg-muted border-2 border-card text-[9px] font-bold text-muted-foreground">
                            {icon}
                          </div>
                        ))}
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 border-2 border-card text-[9px] font-bold text-primary">
                          +2
                        </div>
                      </div>
                    </div>

                    {/* Mini flow status */}
                    <div className="rounded-lg border p-3 space-y-2">
                      <span className="text-xs font-semibold">Active Flows</span>
                      {[
                        { name: 'Trial → Activation', sent: '4.2K', rate: '34%' },
                        { name: 'At Risk → Retention', sent: '1.8K', rate: '62%' },
                        { name: 'Power User → Expansion', sent: '921', rate: '28%' },
                      ].map((f) => (
                        <div key={f.name} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{f.name}</span>
                          <div className="flex items-center gap-3">
                            <span>{f.sent} sent</span>
                            <span className="text-green-600 font-medium">{f.rate} conv.</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                {/* Integration floating badges */}
                <div className="absolute -bottom-4 -left-4 z-10 animate-float-slow">
                  <div className="flex items-center gap-1.5 rounded-full bg-primary text-white px-3 py-1.5 text-xs font-semibold shadow-lg">
                    <Layers className="h-3 w-3" /> All-in-one
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            METRICS / PROOF SECTION — Enhanced stats with visual treatment
            ================================================================ */}
        <section className="container py-20 md:py-28">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4">Results</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              The numbers speak for themselves
            </h2>
            <p className="text-muted-foreground text-lg">
              Across our customer base, LifecycleOS consistently delivers
              measurable improvements at every lifecycle stage.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Avg. activation rate improvement', value: '+34%', icon: Target, color: 'bg-primary/10 text-primary' },
              { label: 'Reduction in time-to-activate', value: '-52%', icon: Zap, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
              { label: 'At-risk users recovered', value: '62%', icon: Heart, color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
              { label: 'Avg. expansion revenue captured', value: '+$8.9K', icon: BarChart3, color: 'bg-accent/10 text-accent' },
            ].map((stat) => (
              <Card key={stat.label} className="text-center group hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl ${stat.color.split(' ')[0]} group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`h-6 w-6 ${stat.color.split(' ').slice(1).join(' ')}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-extrabold mb-2">{stat.value}</div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ================================================================
            TESTIMONIALS — Enhanced with real-world context
            ================================================================ */}
        <section className="border-t bg-muted/30 py-20 md:py-28">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <Badge variant="outline" className="mb-4">Customer Stories</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Real results from SaaS teams like yours
              </h2>
              <p className="text-muted-foreground text-lg">
                See how growth, product, and revenue teams use LifecycleOS to
                drive measurable business outcomes.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote:
                    'LifecycleOS replaced three tools and cut our churn by 28% in the first quarter. The lifecycle engine identified at-risk patterns we never would have caught manually.',
                  author: 'Maria Garcia',
                  role: 'VP Growth',
                  company: 'ScaleHQ',
                  metric: '-28% churn',
                  metricColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                },
                {
                  quote:
                    'We went from zero activation visibility to a fully automated onboarding funnel in under a day. Trial-to-paid conversions jumped 19% in the first month.',
                  author: 'David Park',
                  role: 'Head of Product',
                  company: 'CloudNova',
                  metric: '+19% conversion',
                  metricColor: 'bg-primary/10 text-primary',
                },
                {
                  quote:
                    'Expansion intelligence caught $24K in upgrade opportunities we were completely missing. The automated flows handled the outreach — ROI was instant.',
                  author: 'Patricia Williams',
                  role: 'CRO',
                  company: 'GrowthLab',
                  metric: '+$24K revenue',
                  metricColor: 'bg-accent/10 text-accent',
                },
              ].map((testimonial) => (
                <Card key={testimonial.author} className="flex flex-col">
                  <CardContent className="pt-6 flex-1 flex flex-col">
                    <Badge variant="secondary" className={`w-fit mb-4 text-xs ${testimonial.metricColor}`}>
                      {testimonial.metric}
                    </Badge>
                    <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 pt-4 border-t">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {testimonial.author.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{testimonial.author}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.role}, {testimonial.company}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            PRICING TEASER
            ================================================================ */}
        <section className="container py-20 md:py-28">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground text-lg">
              Predictable pricing at every stage. Pay only for the scale you need.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
            {[
              { plan: 'Starter', price: '$49', users: 'Up to 1,000 users', popular: false },
              { plan: 'Growth', price: '$149', users: 'Up to 10,000 users', popular: true },
              { plan: 'Business', price: '$349', users: 'Up to 50,000 users', popular: false },
            ].map((tier) => (
              <Card
                key={tier.plan}
                className={tier.popular ? 'border-primary shadow-md relative' : ''}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle>{tier.plan}</CardTitle>
                  <CardDescription>{tier.users}</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div>
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <Button
                    className="w-full"
                    variant={tier.popular ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href="/pricing">View details</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              See full pricing comparison <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>

        {/* ================================================================
            FAQ
            ================================================================ */}
        <section className="border-t bg-muted/30 py-20 md:py-28">
          <div className="container max-w-3xl">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">FAQ</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Frequently asked questions
              </h2>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {[
                {
                  q: 'How long does setup take?',
                  a: 'Most teams are up and running in under 30 minutes. Install the SDK (10 lines of code), connect your billing provider, and the lifecycle engine starts classifying users immediately.',
                },
                {
                  q: 'Do I need a data team to use LifecycleOS?',
                  a: 'No. The platform is designed for marketing and growth teams. Our lifecycle engine automatically handles user classification, risk scoring, and expansion signals — no SQL or data engineering required.',
                },
                {
                  q: 'How is this different from Intercom, Customer.io, or HubSpot?',
                  a: 'Those are general-purpose messaging tools. LifecycleOS is purpose-built for SaaS lifecycle revenue. Our engine understands activation milestones, churn risk signals, and expansion triggers natively — delivering context that generic tools cannot.',
                },
                {
                  q: 'What about email deliverability?',
                  a: 'We handle it end-to-end: automated DKIM/SPF/DMARC verification, IP warming schedules, and real-time inbox placement monitoring. Our average delivery rate is 99.3%.',
                },
                {
                  q: 'Can I connect my existing tools?',
                  a: 'Yes. LifecycleOS integrates with Stripe, Segment, Slack, Salesforce, and more via webhooks and our REST API. The SDK also supports custom event forwarding.',
                },
                {
                  q: 'How does the trial work?',
                  a: 'Every plan starts with a 14-day trial with full platform access. Add a card to begin, explore everything, and only pay if you decide to continue after day 14.',
                },
              ].map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ================================================================
            CTA — Enhanced with visual dashboard preview
            ================================================================ */}
        <section className="container py-20 md:py-28">
          <div className="relative rounded-3xl gradient-dark-card overflow-hidden">
            <div className="relative z-10 flex flex-col items-center text-center gap-4 sm:gap-6 py-12 sm:py-16 md:py-20 px-4 sm:px-8">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                Ready to turn product data into revenue?
              </h2>
              <p className="max-w-lg text-white/70 text-lg">
                Join 500+ SaaS teams using LifecycleOS to activate, retain,
                and expand their customer base — automatically.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button size="lg" className="text-base uppercase tracking-wide font-semibold" asChild>
                  <Link href="/sign-up">
                    Start free trial <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-base border-white/20 text-white hover:bg-white/10 hover:text-white" asChild>
                  <Link href="/pricing">View pricing</Link>
                </Button>
              </div>
              <p className="text-xs text-white/50 mt-2">
                14-day free trial &middot; No credit card required &middot; Setup in under 30 minutes
              </p>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
