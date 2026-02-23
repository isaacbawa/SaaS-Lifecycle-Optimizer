import Link from 'next/link';
import Image from 'next/image';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { MarketingFooter } from '@/components/layout/marketing-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle, Rocket, Heart, TrendingUp, Zap, Target, Gauge } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const heroImage = PlaceHolderImages.find(p => p.id === 'hero-dashboard');
const activationImage = PlaceHolderImages.find(p => p.id === 'feature-activation');
const retentionImage = PlaceHolderImages.find(p => p.id === 'feature-retention');
const expansionImage = PlaceHolderImages.find(p => p.id === 'feature-expansion');

const testimonial1 = PlaceHolderImages.find(p => p.id === 'testimonial-1');
const testimonial2 = PlaceHolderImages.find(p => p.id === 'testimonial-2');
const testimonial3 = PlaceHolderImages.find(p => p.id === 'testimonial-3');


export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container grid lg:grid-cols-2 gap-12 items-center py-20 md:py-32">
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter">
              Your SaaS is leaking revenue. We help you plug the holes.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              SaaS Optimizer gives you a complete, actionable view of your customer lifecycle. Go beyond pageviews to understand user activation, pinpoint churn risk, and uncover expansion opportunities. Stop guessing, start growing.
            </p>
            <div className="flex gap-4">
              <Button size="lg" asChild>
                <Link href="/dashboard">Start Your Free Trial</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
          <div className="hidden lg:block">
            {heroImage && (
              <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                width={1200}
                height={800}
                className="rounded-lg shadow-2xl"
                data-ai-hint={heroImage.imageHint}
              />
            )}
          </div>
        </section>

        {/* Features / Solution Section */}
        <section id="features" className="py-20 md:py-32 bg-secondary">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">The Growth Engine for Modern SaaS</h2>
              <p className="text-lg text-muted-foreground mt-4">
                Your analytics tools show you what's happening. We show you why, and what to do next. We connect user behavior to revenue, so you can focus on the actions that matter.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Rocket className="w-10 h-10 mb-4 text-primary" />
                  <CardTitle>Drive User Activation</CardTitle>
                  <CardDescription>
                    Don't just hope new users stick around. Guide them to their "aha!" moment with targeted onboarding flows and see exactly where they get stuck. Turn more trials into lifelong customers.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Heart className="w-10 h-10 mb-4 text-primary" />
                  <CardTitle>Proactively Reduce Churn</CardTitle>
                  <CardDescription>
                    Our AI-powered analysis identifies at-risk users before they leave. Get actionable recommendations and trigger automated re-engagement campaigns to keep your customers happy and your revenue secure.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <TrendingUp className="w-10 h-10 mb-4 text-primary" />
                  <CardTitle>Unlock Expansion Revenue</CardTitle>
                  <CardDescription>
                    Your best new customers are the ones you already have. Pinpoint users and accounts ready for an upgrade. Uncover your most valuable features and drive strategic, data-informed expansion.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 md:py-32">
            <div className="container">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold">Trusted by Growing SaaS Teams</h2>
                </div>
                <div className="grid lg:grid-cols-3 gap-8">
                    <Card className="flex flex-col justify-between">
                        <CardContent className="pt-6">
                            <p className="text-lg">"For the first time, we can see the entire customer journey. We found our key activation metric in a week and cut churn by 22% in the first month."</p>
                        </CardContent>
                        <div className="p-6 bg-secondary/50">
                            <div className="flex items-center gap-4">
                                {testimonial1 && <Avatar>
                                    <AvatarImage src={testimonial1.imageUrl} alt="Sarah P." data-ai-hint={testimonial1.imageHint}/>
                                    <AvatarFallback>SP</AvatarFallback>
                                </Avatar>}
                                <div>
                                    <p className="font-semibold">Sarah P.</p>
                                    <p className="text-sm text-muted-foreground">Head of Growth, Metrics Inc.</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                     <Card className="flex flex-col justify-between">
                        <CardContent className="pt-6">
                            <p className="text-lg">"The expansion revenue insights are gold. We identified over $100k in upsell opportunities we were completely blind to before."</p>
                        </CardContent>
                        <div className="p-6 bg-secondary/50">
                            <div className="flex items-center gap-4">
                                {testimonial2 && <Avatar>
                                    <AvatarImage src={testimonial2.imageUrl} alt="Mike R." data-ai-hint={testimonial2.imageHint}/>
                                    <AvatarFallback>MR</AvatarFallback>
                                </Avatar>}
                                <div>
                                    <p className="font-semibold">Mike R.</p>
                                    <p className="text-sm text-muted-foreground">Founder, DevTools Co.</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                     <Card className="flex flex-col justify-between">
                        <CardContent className="pt-6">
                            <p className="text-lg">"It's like having a data scientist and a marketing automation expert on the team. Setup took minutes, and the value was immediate."</p>
                        </CardContent>
                        <div className="p-6 bg-secondary/50">
                            <div className="flex items-center gap-4">
                                {testimonial3 && <Avatar>
                                    <AvatarImage src={testimonial3.imageUrl} alt="Laura V." data-ai-hint={testimonial3.imageHint}/>
                                    <AvatarFallback>LV</AvatarFallback>
                                </Avatar>}
                                <div>
                                    <p className="font-semibold">Laura V.</p>
                                    <p className="text-sm text-muted-foreground">CEO, Connectly</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </section>


        {/* FAQ Section */}
        <section className="py-20 md:py-32 bg-secondary">
          <div className="container max-w-4xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
            </div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-lg font-semibold">Is this just another analytics tool?</AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground">
                  No. Analytics tools show you graphs. We connect those graphs to your revenue and give you the tools (like email flows) to act on those insights directly within the platform. We focus on the entire lifecycle—Activation, Retention, and Expansion—not just top-of-funnel metrics.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-lg font-semibold">How difficult is the setup?</AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground">
                  It's simple. You install our lightweight SDK and track a few key events. For many platforms, it takes less than 15 minutes to start seeing data flow in. We provide clear documentation and support to help you get started.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-lg font-semibold">Can this replace my email marketing tool?</AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground">
                  SaaS Optimizer is designed to complement your existing tools. While we have powerful lifecycle email capabilities (like our automated flows for churn prevention), you can also use our insights to make your existing campaigns in other tools much smarter by feeding our user segments into them.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-lg font-semibold">What kind of SaaS businesses is this for?</AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground">
                  Our platform is built for any B2B or B2C SaaS business that wants to grow more efficiently. If you have a free trial, a freemium model, or are focused on moving customers through different tiers, SaaS Optimizer will provide immense value.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 md:py-32">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">Ready to Grow Smarter?</h2>
            <p className="text-lg text-muted-foreground mt-4 mb-8 max-w-xl mx-auto">
              Stop the leaks and build a predictable growth engine. Start your free 14-day trial today. No credit card required.
            </p>
            <Button size="lg" asChild>
              <Link href="/dashboard">Claim Your Free Trial</Link>
            </Button>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}