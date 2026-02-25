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
  Rocket,
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
  GitFork,
  DollarSign,
  AlertTriangle,
  Users,
  CheckCircle,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />
      <main className="flex-1">
        {/* ================================================================
            HERO — Lead with the outcome they want, not the product feature
            ================================================================ */}
        <section className="container py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="flex flex-col gap-6">
              <Badge variant="secondary" className="w-fit text-sm font-medium px-4 py-1.5">
                Built exclusively for SaaS companies
              </Badge>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
                Turn product usage into{' '}
                <span className="text-primary">recurring revenue</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                LifecycleOS connects your product data to automated email flows
                that activate trials, prevent churn, and expand accounts — all
                driven by real user behavior, not guesswork.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button size="lg" asChild>
                  <Link href="/dashboard">
                    Start free trial <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/sdk">View SDK docs</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                14-day trial &middot; Full platform access &middot; Cancel before you&rsquo;re charged
              </p>
            </div>

            {/* Hero stats panel */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Card className="bg-primary/5 border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Activation Rate Lift
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">+34%</div>
                  <p className="text-xs text-muted-foreground mt-1">avg. across all customers</p>
                </CardContent>
              </Card>
              <Card className="bg-green-500/5 border-green-500/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Churn Reduction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">-28%</div>
                  <p className="text-xs text-muted-foreground mt-1">within first 90 days</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-500/5 border-purple-500/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Expansion Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">+$4.1K</div>
                  <p className="text-xs text-muted-foreground mt-1">avg. monthly per account</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-500/5 border-amber-500/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Email Deliverability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-600">99.3%</div>
                  <p className="text-xs text-muted-foreground mt-1">inbox placement rate</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ================================================================
            SOCIAL PROOF
            ================================================================ */}
        <section className="border-y bg-muted/30">
          <div className="container py-10">
            <p className="text-center text-sm font-medium text-muted-foreground mb-6">
              Trusted by fast-growing SaaS teams
            </p>
            <div className="flex flex-wrap justify-center gap-x-8 sm:gap-x-12 gap-y-4 opacity-60">
              {['Innovate Inc.', 'Solutions LLC', 'Synergy Corp', 'CloudPeak', 'Quantum Leap', 'FormFlow'].map(
                (name) => (
                  <span key={name} className="text-lg font-semibold tracking-tight">
                    {name}
                  </span>
                ),
              )}
            </div>
          </div>
        </section>

        {/* ================================================================
            HOW IT WORKS
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
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Code,
                title: 'Connect your product',
                description:
                  'Install our lightweight SDK (10 lines of code). We automatically track events, identify users, and sync with your billing provider.',
              },
              {
                step: '02',
                icon: Activity,
                title: 'Engine classifies users',
                description:
                  'Our lifecycle engine analyzes behavior in real-time to assign states: Trial, Activated, Power User, At Risk, Expansion Ready, and more.',
              },
              {
                step: '03',
                icon: Mail,
                title: 'Automated flows drive revenue',
                description:
                  'Pre-built and custom email flows trigger on lifecycle transitions. Every message is contextual, personalized, and timed to convert.',
              },
            ].map((item) => (
              <Card key={item.step} className="relative overflow-hidden">
                <div className="absolute top-4 right-4 text-6xl font-black text-muted/20">
                  {item.step}
                </div>
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ================================================================
            FEATURES GRID
            ================================================================ */}
        <section id="features" className="border-t bg-muted/30 py-20 md:py-28">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <Badge variant="outline" className="mb-4">Platform</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Every lever for SaaS lifecycle revenue
              </h2>
              <p className="text-muted-foreground text-lg">
                Purpose-built modules that work together to optimize every stage
                from first touch to expansion.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Rocket,
                  title: 'Activation Engine',
                  description:
                    'Track setup milestones, aha moments, and conversion events. Automatically nudge users who stall with targeted email flows.',
                  href: '/activation',
                },
                {
                  icon: Heart,
                  title: 'Retention & Churn Prevention',
                  description:
                    'AI-driven churn risk scoring with automated intervention flows. Catch at-risk users before they leave.',
                  href: '/retention',
                },
                {
                  icon: TrendingUp,
                  title: 'Expansion Intelligence',
                  description:
                    'Detect seat limits, API throttles, and heavy usage. Trigger upgrade flows with contextual, data-driven messaging.',
                  href: '/expansion',
                },
                {
                  icon: GitFork,
                  title: 'Lifecycle Email Flows',
                  description:
                    'Visual builder for multi-step email sequences triggered by lifecycle state changes, events, or schedules.',
                  href: '/flows',
                },
                {
                  icon: DollarSign,
                  title: 'Revenue Analytics',
                  description:
                    'MRR waterfall, cohort analysis, plan-level breakdowns, and direct attribution from email flows to revenue.',
                  href: '/revenue',
                },
                {
                  icon: Shield,
                  title: 'Deliverability Suite',
                  description:
                    'DKIM/SPF/DMARC automation, IP warming, and real-time monitoring. Ensure every email reaches the inbox.',
                  href: '/deliverability',
                },
              ].map((feature) => (
                <Link key={feature.title} href={feature.href}>
                  <Card className="h-full transition-colors hover:border-primary/40 group">
                    <CardHeader>
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            METRICS / PROOF SECTION
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
              { label: 'Avg. activation rate improvement', value: '+34%', icon: Target },
              { label: 'Reduction in time-to-activate', value: '-52%', icon: Zap },
              { label: 'At-risk users recovered', value: '62%', icon: AlertTriangle },
              { label: 'Expansion revenue captured', value: '+$8.9K', icon: BarChart3 },
            ].map((stat) => (
              <Card key={stat.label} className="text-center">
                <CardHeader className="pb-2">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ================================================================
            TESTIMONIALS
            ================================================================ */}
        <section className="border-t bg-muted/30 py-20 md:py-28">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <Badge variant="outline" className="mb-4">Customer Stories</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Loved by SaaS teams everywhere
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote:
                    'LifecycleOS replaced three tools and cut our churn by 28% in the first quarter. The lifecycle engine is incredibly accurate.',
                  author: 'Maria Garcia',
                  role: 'VP Growth, Solutions LLC',
                },
                {
                  quote:
                    'We went from zero visibility into activation to a fully automated funnel in under a day. Trial conversions jumped 19%.',
                  author: 'David Park',
                  role: 'Head of Product, CloudPeak Systems',
                },
                {
                  quote:
                    'The expansion intelligence caught $24K in upgrade opportunities we were completely missing. ROI was instant.',
                  author: 'Patricia Williams',
                  role: 'CRO, Synergy Corp',
                },
              ].map((testimonial) => (
                <Card key={testimonial.author}>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground leading-relaxed mb-4 italic">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {testimonial.author.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{testimonial.author}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
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
            CTA
            ================================================================ */}
        <section className="container py-20 md:py-28">
          <Card className="bg-primary text-primary-foreground overflow-hidden">
            <CardContent className="flex flex-col items-center text-center gap-4 sm:gap-6 py-10 sm:py-12 md:py-16 px-4 sm:px-6">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Ready to turn product data into revenue?
              </h2>
              <p className="max-w-lg text-primary-foreground/80 text-lg">
                Join hundreds of SaaS teams using LifecycleOS to activate, retain,
                and expand their customer base — automatically.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/dashboard">
                    Start free trial <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10"
                  asChild
                >
                  <Link href="/pricing">View pricing</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
