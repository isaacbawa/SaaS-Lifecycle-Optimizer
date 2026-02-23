import Link from 'next/link';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { MarketingFooter } from '@/components/layout/marketing-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check } from 'lucide-react';

const tiers = [
  {
    name: 'Starter',
    price: '$49',
    pricePeriod: '/ month',
    description: 'For early-stage startups ready to find product-market fit.',
    features: [
      'Up to 1,000 tracked users',
      'Core Lifecycle Analytics',
      'Activation Funnels',
      'Community Support',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Growth',
    price: '$149',
    pricePeriod: '/ month',
    description: 'For growing businesses ready to scale their revenue.',
    features: [
      'Up to 10,000 tracked users',
      'Everything in Starter, plus:',
      'AI Churn Prediction',
      'Automated Email Flows',
      'Expansion Revenue Insights',
      'Priority Email Support',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    pricePeriod: '',
    description: 'For large-scale companies needing advanced security and support.',
    features: [
      'Unlimited tracked users',
      'Everything in Growth, plus:',
      'Single Sign-On (SSO)',
      'Custom Integrations',
      'Dedicated Account Manager',
      '24/7 Priority Support',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />
      <main className="flex-1">
        <section className="py-20 md:py-32">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">Pricing that scales with you</h1>
              <p className="text-lg md:text-xl text-muted-foreground mt-4">
                Choose a plan that fits your stage of growth. All plans start with a 14-day free trial of our Growth features.
              </p>
            </div>
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              {tiers.map((tier) => (
                <Card key={tier.name} className={tier.popular ? 'border-primary shadow-2xl' : ''}>
                  <CardHeader className="relative">
                    {tier.popular && <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold rounded-full">Most Popular</div>}
                    <CardTitle className="text-3xl font-bold">{tier.name}</CardTitle>
                    <CardDescription>{tier.description}</CardDescription>
                    <div className="flex items-baseline pt-4">
                        <span className="text-4xl font-bold tracking-tighter">{tier.price}</span>
                        {tier.pricePeriod && <span className="text-muted-foreground">{tier.pricePeriod}</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col h-full">
                    <ul className="space-y-4 text-muted-foreground flex-1 mb-8">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full" size="lg" variant={tier.popular ? 'default' : 'outline'}>
                      <Link href="/dashboard">{tier.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
