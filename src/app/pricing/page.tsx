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
import { Check, ArrowRight } from 'lucide-react';

const tiers = [
  {
    name: 'Starter',
    price: '$49',
    pricePeriod: '/ month',
    description:
      'For early-stage SaaS teams setting up lifecycle infrastructure for the first time. Get the foundation right before you scale.',
    features: [
      'Up to 1,000 tracked users',
      'JavaScript & Python SDK',
      'Lifecycle state engine',
      'Activation funnel analytics',
      '3 automated email flows',
      'Basic deliverability monitoring',
      'Community support',
    ],
    cta: 'Start free trial',
    popular: false,
  },
  {
    name: 'Growth',
    price: '$149',
    pricePeriod: '/ month',
    description:
      'For SaaS teams with product-market fit ready to reduce churn, accelerate activation, and unlock expansion revenue.',
    features: [
      'Up to 10,000 tracked users',
      'Everything in Starter, plus:',
      'Churn risk scoring (user & account)',
      'Unlimited automated flows',
      'Expansion opportunity detection',
      'Revenue attribution (MRR/ARR)',
      'Dedicated IP for email sending',
      'Priority email support',
    ],
    cta: 'Start free trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    pricePeriod: '',
    description:
      'For scaling SaaS companies that need enterprise security, custom integrations, and dedicated lifecycle strategy support.',
    features: [
      'Unlimited tracked users',
      'Everything in Growth, plus:',
      'SSO / SAML authentication',
      'Custom Stripe & billing integrations',
      'Multi-tenant data isolation',
      'Dedicated account manager',
      'Quarterly lifecycle strategy review',
      '99.99% SLA with 24/7 support',
    ],
    cta: 'Talk to us',
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />
      <main className="flex-1">
        {/* Pricing Hero */}
        <section className="py-20 md:py-28">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                One price. Full lifecycle infrastructure.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mt-4 leading-relaxed">
                No per-email charges. No hidden fees for &ldquo;premium&rdquo; features. Every plan includes the SDK, event streaming, lifecycle engine, email infrastructure, and revenue attribution. Pick the scale that fits.
              </p>
              <p className="text-sm text-muted-foreground mt-3">
                Every plan starts with a 14-day trial &mdash; full platform access, no charge until day 15.
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid gap-6 sm:gap-8 lg:grid-cols-3 items-start">
              {tiers.map((tier) => (
                <Card
                  key={tier.name}
                  className={
                    tier.popular
                      ? 'border-primary shadow-2xl relative'
                      : 'relative'
                  }
                >
                  <CardHeader>
                    {tier.popular && (
                      <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold rounded-full">
                        Most Popular
                      </div>
                    )}
                    <CardTitle className="text-3xl font-bold">
                      {tier.name}
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed min-h-[3rem]">
                      {tier.description}
                    </CardDescription>
                    <div className="flex items-baseline pt-4">
                      <span className="text-4xl font-bold tracking-tighter">
                        {tier.price}
                      </span>
                      {tier.pricePeriod && (
                        <span className="text-muted-foreground ml-1">
                          {tier.pricePeriod}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col h-full">
                    <ul className="space-y-3 text-muted-foreground flex-1 mb-8">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      size="lg"
                      variant={tier.popular ? 'default' : 'outline'}
                      asChild
                    >
                      <Link href="/dashboard">
                        {tier.cta}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* What Every Plan Includes */}
        <section className="py-16 bg-secondary/50">
          <div className="container">
            <h2 className="text-2xl font-bold text-center mb-10">
              Included in every plan
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
              {[
                {
                  title: 'Event SDK',
                  desc: 'JavaScript & Python with auto-batching, retry logic, and schema validation',
                },
                {
                  title: 'Lifecycle Engine',
                  desc: 'Automatic user classification: Trial, Activated, Power User, At Risk, Churned',
                },
                {
                  title: 'Email Infrastructure',
                  desc: 'AWS SES sending with bounce handling, suppression, and domain verification',
                },
                {
                  title: 'Revenue Dashboard',
                  desc: 'MRR, ARR, activation rates, churn rates, and expansion metrics in one view',
                },
              ].map((item) => (
                <div key={item.title} className="text-center">
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing FAQ */}
        <section className="py-20 md:py-28">
          <div className="container max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
              Pricing questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="p-1">
                <AccordionTrigger className="text-base font-semibold text-left">
                  What counts as a &ldquo;tracked user&rdquo;?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  A tracked user is any unique user identified through the SDK via <code className="bg-muted px-1.5 py-0.5 rounded text-sm">lifecycle.identify()</code>. Anonymous events before identification don&apos;t count. Users who haven&apos;t been active in the last 90 days are automatically archived and stop counting toward your limit.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="p-2">
                <AccordionTrigger className="text-base font-semibold text-left">
                  Do you charge per email sent?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  No. Email sending is included in every plan with generous limits — Starter includes 10,000 emails/month, Growth includes 100,000, and Enterprise is unlimited. We want you to send the right emails at the right time without worrying about per-send costs.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="p-3">
                <AccordionTrigger className="text-base font-semibold text-left">
                  Can I switch plans or cancel anytime?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Yes. No annual contracts, no cancellation fees. Upgrade or downgrade at any time — changes are prorated to the day. If you cancel, your data is retained for 30 days so you can export or re-activate easily.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="p-4">
                <AccordionTrigger className="text-base font-semibold text-left">
                  What happens when I hit my tracked user limit?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  We&apos;ll notify you at 80% and 100% of your limit. You can upgrade instantly from the dashboard. We never stop tracking your users or pausing your flows — you&apos;ll get a 7-day grace period to upgrade before any overage charges apply.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="p-5">
                <AccordionTrigger className="text-base font-semibold text-left">
                  Is there a discount for annual billing?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Yes — annual billing saves 20% on Starter and Growth plans. Contact us for Enterprise annual pricing. Annual plans also include a complimentary onboarding session with our lifecycle strategy team.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 md:py-20 bg-secondary/50">
          <div className="container text-center max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Not sure which plan? Start with Growth.
            </h2>
            <p className="text-muted-foreground mt-3 mb-6 leading-relaxed">
              Every trial starts with full Growth features for 14 days. Experience churn scoring, expansion detection, and unlimited flows — then pick the plan that fits.
            </p>
            <Button size="lg" asChild>
              <Link href="/dashboard">
                Start your free trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
