'use client';

import Link from 'next/link';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { MarketingFooter } from '@/components/layout/marketing-footer';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Mail,
    Send,
    Shield,
    Database,
    Zap,
    BarChart3,
    ArrowRight,
    ArrowDown,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Eye,
    MousePointerClick,
    UserX,
    AlertTriangle,
    Globe,
    Lock,
    Server,
    Layers,
    Clock,
    Target,
    FileText,
    Variable,
    Inbox,
    ChevronRight,
    Star,
    DollarSign,
    Gauge,
    Code2,
    BrainCircuit,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════
   Email Sending Architecture - Visual Sketch & SMTP Recommendation
   ═══════════════════════════════════════════════════════════════════════ */

// ─── Architecture Nodes ────────────────────────────────────────────────

interface ArchNodeProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    badge?: string;
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
}

function ArchNode({ icon, title, description, badge, badgeVariant = 'secondary', className = '' }: ArchNodeProps) {
    return (
        <div className={`relative flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${className}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm">{title}</h4>
                    {badge && <Badge variant={badgeVariant} className="text-[10px] px-1.5 py-0">{badge}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

// ─── Flow Arrow ────────────────────────────────────────────────────────

function FlowArrow({ label, direction = 'down', dashed = false }: { label?: string; direction?: 'down' | 'right'; dashed?: boolean }) {
    if (direction === 'right') {
        return (
            <div className="flex items-center gap-1 px-2">
                <div className={`h-0.5 w-8 ${dashed ? 'border-t border-dashed border-muted-foreground/40' : 'bg-primary/30'}`} />
                <ArrowRight className="h-3.5 w-3.5 text-primary/50" />
                {label && <span className="text-[10px] text-muted-foreground whitespace-nowrap">{label}</span>}
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center gap-0.5 py-1">
            <div className={`w-0.5 h-6 ${dashed ? 'border-l border-dashed border-muted-foreground/40' : 'bg-primary/30'}`} />
            <ArrowDown className="h-3.5 w-3.5 text-primary/50" />
            {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
        </div>
    );
}

// ─── Section Wrapper ───────────────────────────────────────────────────

function ArchSection({ title, subtitle, color, children }: { title: string; subtitle: string; color: string; children: React.ReactNode }) {
    const colorMap: Record<string, string> = {
        blue: 'border-blue-500/30 bg-blue-500/5',
        purple: 'border-purple-500/30 bg-purple-500/5',
        green: 'border-green-500/30 bg-green-500/5',
        amber: 'border-amber-500/30 bg-amber-500/5',
        red: 'border-red-500/30 bg-red-500/5',
        sky: 'border-sky-500/30 bg-sky-500/5',
        slate: 'border-slate-500/30 bg-slate-500/5',
    };
    const labelColorMap: Record<string, string> = {
        blue: 'text-blue-600 dark:text-blue-400',
        purple: 'text-purple-600 dark:text-purple-400',
        green: 'text-green-600 dark:text-green-400',
        amber: 'text-amber-600 dark:text-amber-400',
        red: 'text-red-600 dark:text-red-400',
        sky: 'text-sky-600 dark:text-sky-400',
        slate: 'text-slate-600 dark:text-slate-400',
    };
    return (
        <div className={`rounded-2xl border-2 p-5 ${colorMap[color] ?? ''}`}>
            <div className="mb-4">
                <h3 className={`text-sm font-bold uppercase tracking-widest ${labelColorMap[color] ?? ''}`}>{title}</h3>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            {children}
        </div>
    );
}

// ─── SMTP Comparison Table ─────────────────────────────────────────────

const smtpProviders = [
    {
        rank: 1,
        name: 'Amazon SES',
        tagline: 'Best for scale & cost',
        cost: '$0.10 / 1,000 emails',
        freeQuota: '3,000/month (12-month trial)',
        deliverability: '95–99%',
        speed: '~200 emails/sec',
        features: [
            'DKIM, SPF, DMARC built-in',
            'Bounce & complaint webhooks',
            'Sending statistics dashboard',
            'Dedicated IPs available ($24.95/mo)',
            'Suppression list management',
            'Configuration sets for tracking',
        ],
        pros: ['Extremely cheap at scale', 'AWS ecosystem integration', 'Battle-tested reliability', 'Pay only for what you send'],
        cons: ['Initial sandbox mode (manual approval)', 'Steeper learning curve', 'No built-in templates'],
        bestFor: 'SaaS platforms sending 50K+ emails/month that need rock-solid infrastructure at minimal cost.',
        recommended: true,
    },
    {
        rank: 2,
        name: 'Postmark',
        tagline: 'Best deliverability',
        cost: '$1.25 / 1,000 emails',
        freeQuota: '100 emails/month',
        deliverability: '98–99%+',
        speed: '~50 emails/sec',
        features: [
            'Transactional-first architecture',
            'Message streams (transactional vs marketing)',
            'DKIM auto-rotation',
            'Bounce classification API',
            'Inbound email processing',
            '45-day message retention',
        ],
        pros: ['Industry-best inbox placement', 'Separated transactional/marketing streams', 'Excellent bounce handling', 'Great API & documentation'],
        cons: ['Higher cost per email', 'Anti-spam policy strict', 'No free tier at scale'],
        bestFor: 'Products where every email MUST reach the inbox - onboarding flows, password resets, and lifecycle campaigns.',
        recommended: false,
    },
    {
        rank: 3,
        name: 'Resend',
        tagline: 'Best developer experience',
        cost: '$0 → $0.28 / 1,000 emails',
        freeQuota: '3,000/month (free forever)',
        deliverability: '95–98%',
        speed: '~100 emails/sec',
        features: [
            'React Email integration',
            'Modern REST API',
            'Webhook events',
            'Domain verification',
            'Batch sending API',
            'Built-in analytics',
        ],
        pros: ['Built for modern stacks (Next.js, React)', 'Generous free tier', 'Clean API & SDKs', 'Founded by ex-Vercel team'],
        cons: ['Newer platform (less track record)', 'Fewer enterprise features', 'Rate limits on free tier'],
        bestFor: 'Startups and indie makers using Next.js who want to get started fast with a modern email API.',
        recommended: false,
    },
    {
        rank: 4,
        name: 'SendGrid (Twilio)',
        tagline: 'Most popular & full-featured',
        cost: '$0 → $0.35 / 1,000 emails',
        freeQuota: '100/day forever',
        deliverability: '93–97%',
        speed: '~100 emails/sec',
        features: [
            'Email validation API',
            'Dynamic templates',
            'SMTP relay & Web API',
            'Marketing campaigns built-in',
            'Dedicated IP pools',
            'Expert deliverability services',
        ],
        pros: ['Huge ecosystem & community', 'Both SMTP and API modes', 'Marketing + transactional in one', 'Extensive documentation'],
        cons: ['Deliverability has declined (shared IPs)', 'Pricing can be complex', 'Support slow on free/low tiers', 'Account suspensions common'],
        bestFor: 'Teams that want a proven, full-featured platform with both marketing and transactional email support.',
        recommended: false,
    },
    {
        rank: 5,
        name: 'Mailgun (Sinch)',
        tagline: 'Developer-friendly APIs',
        cost: '$0.80 / 1,000 emails',
        freeQuota: '100/day (trial month)',
        deliverability: '94–97%',
        speed: '~150 emails/sec',
        features: [
            'Powerful email validation',
            'Inbound routing engine',
            'Mailing list management',
            'A/B testing built-in',
            'Tagging & analytics',
            'EU region available',
        ],
        pros: ['Great API documentation', 'Flexible routing rules', 'EU data residency option', 'Good email validation'],
        cons: ['Free tier very limited', 'UI dashboard basic', 'Pricing increased recently'],
        bestFor: 'Developer teams that need powerful inbound processing alongside outbound sending.',
        recommended: false,
    },
];

// ─── Main Page ─────────────────────────────────────────────────────────

export default function EmailArchitecturePage() {
    return (
        <div className="flex min-h-screen flex-col">
            <MarketingHeader />

            <main className="flex-1">
                {/* ── Hero ── */}
                <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/30 py-16 lg:py-24">
                    <div className="absolute inset-0 gradient-mesh pointer-events-none" />
                    <div className="container mx-auto max-w-5xl px-4 relative">
                        <Badge variant="outline" className="mb-4">Architecture Reference</Badge>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                            Email Sending Architecture
                        </h1>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
                            A complete visual walkthrough of how emails travel from campaign trigger to inbox delivery,
                            including our queue system, SMTP transport, tracking pipeline, and feedback loops.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link href="/docs" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                <ChevronRight className="h-3.5 w-3.5" /> Back to API Docs
                            </Link>
                            <Link href="#smtp-recommendation" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                <ChevronRight className="h-3.5 w-3.5" /> Skip to SMTP Recommendations
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ── Full Architecture Flow ── */}
                <section className="py-16 lg:py-20">
                    <div className="container mx-auto max-w-5xl px-4">
                        <div className="text-center mb-12">
                            <Badge className="mb-3">End-to-End Flow</Badge>
                            <h2 className="text-2xl sm:text-3xl font-bold">How an Email Gets Delivered</h2>
                            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
                                From the moment a user triggers a campaign to the final delivery confirmation - every step visualized.
                            </p>
                        </div>

                        {/* Step 1: Trigger Sources */}
                        <ArchSection title="Step 1 - Trigger Sources" subtitle="Where email sends originate from" color="blue">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <ArchNode
                                    icon={<Mail className="h-5 w-5" />}
                                    title="Campaign Send"
                                    description="One-time or recurring bulk campaigns targeting segments or mailing lists."
                                    badge="Most Common"
                                    badgeVariant="default"
                                />
                                <ArchNode
                                    icon={<Zap className="h-5 w-5" />}
                                    title="Flow Engine"
                                    description="Automated send_email nodes in lifecycle flows triggered by user events."
                                    badge="Automated"
                                />
                                <ArchNode
                                    icon={<Code2 className="h-5 w-5" />}
                                    title="REST API"
                                    description="POST /api/v1/email-campaigns - programmatic sending from external integrations."
                                />
                                <ArchNode
                                    icon={<Send className="h-5 w-5" />}
                                    title="Test Send"
                                    description="POST /api/v1/email/status - single email test from the dashboard."
                                />
                            </div>
                        </ArchSection>

                        <FlowArrow label="Trigger event received" />

                        {/* Step 2: Pre-Flight Checks */}
                        <ArchSection title="Step 2 - Pre-Flight Checks" subtitle="Validate recipients, domain, and suppression status" color="sky">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <ArchNode
                                    icon={<Target className="h-5 w-5" />}
                                    title="Resolve Recipients"
                                    description="Query segment rules or mailing list memberships. Resolves up to 10,000 recipients per batch."
                                    badge="Up to 10K"
                                />
                                <ArchNode
                                    icon={<Shield className="h-5 w-5" />}
                                    title="Suppression Check"
                                    description="Cross-reference emailSuppressions table for bounces, complaints, and prior unsubscribes."
                                    badge="Required"
                                    badgeVariant="destructive"
                                />
                                <ArchNode
                                    icon={<Globe className="h-5 w-5" />}
                                    title="Domain Verification"
                                    description="Verify DKIM, SPF, and DMARC records on the sending domain. Warns if misconfigured."
                                />
                            </div>
                            <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <span>Emails to suppressed addresses are silently dropped. Domain warnings are logged but don&apos;t block sending.</span>
                            </div>
                        </ArchSection>

                        <FlowArrow label="Validated recipients" />

                        {/* Step 3: Personalization */}
                        <ArchSection title="Step 3 - Personalization Engine" subtitle="Template resolution, variable injection, and tracking setup" color="purple">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <ArchNode
                                    icon={<FileText className="h-5 w-5" />}
                                    title="Template Resolution"
                                    description="Load subject, HTML body, and plain text from emailTemplates. Supports draft/active/archived states."
                                />
                                <ArchNode
                                    icon={<Variable className="h-5 w-5" />}
                                    title="Variable Injection"
                                    description="Replace {{user.name}}, {{account.plan}} etc. Process conditional blocks based on segment rules."
                                    badge="Dynamic"
                                />
                                <ArchNode
                                    icon={<Eye className="h-5 w-5" />}
                                    title="Tracking Injection"
                                    description="Embed 1x1 open pixel, wrap all links for click tracking, add RFC 8058 one-click unsubscribe headers."
                                />
                            </div>
                            <div className="mt-4 rounded-lg bg-card border p-4">
                                <p className="text-xs font-semibold text-muted-foreground mb-2">EXAMPLE PERSONALIZATION</p>
                                <div className="font-mono text-xs space-y-1">
                                    <div><span className="text-muted-foreground">Subject:</span> <span className="text-primary">{`Hey {{user.firstName}}`}</span>, your trial ends in <span className="text-primary">{`{{daysLeft}}`}</span> days</div>
                                    <div><span className="text-muted-foreground">Body:</span> Hi <span className="text-primary">{`{{user.firstName}}`}</span>, we noticed you haven&apos;t set up <span className="text-primary">{`{{account.name}}`}</span>&apos;s integration yet...</div>
                                    <div><span className="text-muted-foreground">Condition:</span> <span className="text-amber-600">{`{{#if user.plan == 'trial'}}`}</span> Show upgrade CTA <span className="text-amber-600">{`{{/if}}`}</span></div>
                                </div>
                            </div>
                        </ArchSection>

                        <FlowArrow label="Personalized & tracked email HTML" />

                        {/* Step 4: Queue System */}
                        <ArchSection title="Step 4 - Queue System (PostgreSQL-Backed)" subtitle="Rate-limited, retryable email queue that survives serverless cold starts" color="blue">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-3">
                                    <ArchNode
                                        icon={<Database className="h-5 w-5" />}
                                        title="emailQueue Table"
                                        description="Each email becomes a queue record: queued → sending → sent. Persisted in PostgreSQL for durability."
                                    />
                                    <ArchNode
                                        icon={<Clock className="h-5 w-5" />}
                                        title="Rate Limiter"
                                        description="Token-bucket algorithm throttles at 10 emails/second by default. Configurable via EMAIL_RATE_LIMIT."
                                    />
                                </div>
                                <div className="space-y-3">
                                    <ArchNode
                                        icon={<RefreshCw className="h-5 w-5" />}
                                        title="Tick Processor"
                                        description="200ms interval loop picks up queued items, respects rate limit, dispatches to SMTP transport."
                                    />
                                    <ArchNode
                                        icon={<AlertTriangle className="h-5 w-5" />}
                                        title="Retry & DLQ"
                                        description="3 retry attempts with exponential backoff (1s → 2s → 4s + jitter). Failed items move to Dead Letter Queue."
                                        badge="Fault-tolerant"
                                    />
                                </div>
                            </div>
                            {/* Queue Status Flow */}
                            <div className="mt-5 flex items-center justify-center flex-wrap gap-2 text-xs">
                                <span className="rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 px-3 py-1 font-medium">queued</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 px-3 py-1 font-medium">sending</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="rounded-full bg-green-500/20 text-green-700 dark:text-green-300 px-3 py-1 font-medium">sent</span>
                                <span className="mx-3 text-muted-foreground">or</span>
                                <span className="rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 px-3 py-1 font-medium">sending</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="rounded-full bg-red-500/20 text-red-700 dark:text-red-300 px-3 py-1 font-medium">retry</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="rounded-full bg-red-500/20 text-red-700 dark:text-red-300 px-3 py-1 font-medium">DLQ</span>
                            </div>
                        </ArchSection>

                        <FlowArrow label="Rate-limited dispatch" />

                        {/* Step 5: SMTP Transport */}
                        <ArchSection title="Step 5 - SMTP Transport (Nodemailer)" subtitle="Connection pooling, DKIM signing, and encrypted delivery" color="green">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <ArchNode
                                    icon={<Layers className="h-5 w-5" />}
                                    title="Connection Pool"
                                    description="Maintains 5 persistent SMTP connections (SMTP_POOL_SIZE). Reuses connections across sends."
                                    badge="5 concurrent"
                                />
                                <ArchNode
                                    icon={<Lock className="h-5 w-5" />}
                                    title="DKIM Signing"
                                    description="Signs every outgoing email with your DKIM_PRIVATE_KEY. Proves domain authenticity to receiving servers."
                                />
                                <ArchNode
                                    icon={<Shield className="h-5 w-5" />}
                                    title="TLS / STARTTLS"
                                    description="All connections encrypted. Negotiates TLS with the SMTP provider for secure transmission."
                                />
                            </div>
                            <div className="mt-4 rounded-lg bg-card border p-4">
                                <p className="text-xs font-semibold text-muted-foreground mb-2">REQUIRED ENVIRONMENT VARIABLES</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs">
                                    <div><span className="text-green-600">SMTP_HOST</span>=<span className="text-muted-foreground">email-smtp.us-east-1.amazonaws.com</span></div>
                                    <div><span className="text-green-600">SMTP_PORT</span>=<span className="text-muted-foreground">587</span></div>
                                    <div><span className="text-green-600">SMTP_USER</span>=<span className="text-muted-foreground">AKIA...</span></div>
                                    <div><span className="text-green-600">SMTP_PASS</span>=<span className="text-muted-foreground">••••••••</span></div>
                                    <div><span className="text-green-600">SMTP_SECURE</span>=<span className="text-muted-foreground">false (STARTTLS)</span></div>
                                    <div><span className="text-green-600">SMTP_POOL_SIZE</span>=<span className="text-muted-foreground">5</span></div>
                                    <div><span className="text-green-600">DKIM_DOMAIN</span>=<span className="text-muted-foreground">yourdomain.com</span></div>
                                    <div><span className="text-green-600">DKIM_SELECTOR</span>=<span className="text-muted-foreground">ses</span></div>
                                    <div><span className="text-green-600">DKIM_PRIVATE_KEY</span>=<span className="text-muted-foreground">-----BEGIN RSA...</span></div>
                                    <div><span className="text-green-600">EMAIL_FROM</span>=<span className="text-muted-foreground">noreply@yourdomain.com</span></div>
                                </div>
                            </div>
                        </ArchSection>

                        <FlowArrow label="Signed & encrypted email" />

                        {/* Step 6: SMTP Provider → MX */}
                        <ArchSection title="Step 6 - Provider Relay & MX Delivery" subtitle="Your SMTP provider routes the email to the recipient's mail server" color="amber">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="flex-1">
                                    <ArchNode
                                        icon={<Server className="h-5 w-5" />}
                                        title="SMTP Provider"
                                        description="Amazon SES, Postmark, Resend, or SendGrid receives the message and handles IP reputation, throttling, and delivery retry."
                                    />
                                </div>
                                <FlowArrow direction="right" label="MX lookup" />
                                <div className="flex-1">
                                    <ArchNode
                                        icon={<Globe className="h-5 w-5" />}
                                        title="Recipient MX Server"
                                        description="Gmail, Outlook, Yahoo, corporate mail servers. Validates SPF/DKIM/DMARC before accepting."
                                    />
                                </div>
                                <FlowArrow direction="right" label="Accepted" />
                                <div className="flex-1">
                                    <ArchNode
                                        icon={<Inbox className="h-5 w-5" />}
                                        title="User's Inbox"
                                        description="Email lands in the recipient's inbox (or spam folder based on reputation and content scoring)."
                                        badge="Delivered!"
                                        badgeVariant="default"
                                    />
                                </div>
                            </div>
                        </ArchSection>

                        <FlowArrow label="User opens / clicks / unsubscribes" />

                        {/* Step 7: Tracking & Feedback */}
                        <ArchSection title="Step 7 - Tracking & Feedback Loop" subtitle="Real-time engagement tracking and automatic list hygiene" color="purple">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <ArchNode
                                    icon={<Eye className="h-5 w-5" />}
                                    title="Open Tracking"
                                    description="1x1 transparent GIF loaded from /api/v1/email/track. Records open event with HMAC-verified token."
                                />
                                <ArchNode
                                    icon={<MousePointerClick className="h-5 w-5" />}
                                    title="Click Tracking"
                                    description="Wrapped URLs redirect through /api/v1/email/track, record click event, then 302 redirect to original URL."
                                />
                                <ArchNode
                                    icon={<UserX className="h-5 w-5" />}
                                    title="Unsubscribe"
                                    description="RFC 8058 one-click POST + confirmation page at /api/v1/email/unsubscribe. Adds to suppression list."
                                    badge="RFC 8058"
                                />
                                <ArchNode
                                    icon={<AlertTriangle className="h-5 w-5" />}
                                    title="Bounce Handler"
                                    description="POST /api/v1/email/bounce processes SMTP bounces and ISP complaints. Classifies hard vs soft bounces."
                                    badge="Automatic"
                                />
                            </div>
                        </ArchSection>

                        <FlowArrow label="Events persisted" />

                        {/* Step 8: Data Layer */}
                        <ArchSection title="Step 8 - Data Layer (PostgreSQL)" subtitle="All email activity stored for analytics, auditing, and list management" color="slate">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Database className="h-4 w-4 text-primary" />
                                            emailSends
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs text-muted-foreground">
                                        One record per recipient per campaign. Tracks delivery status: <span className="font-mono text-green-600">delivered</span>, <span className="font-mono text-red-600">bounced</span>, <span className="font-mono text-amber-600">pending</span>.
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <BarChart3 className="h-4 w-4 text-primary" />
                                            emailTrackingEvents
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs text-muted-foreground">
                                        Open, click, and unsubscribe events with timestamps, IP metadata, and user agent. Feeds into campaign analytics.
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-destructive" />
                                            emailSuppressions
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs text-muted-foreground">
                                        Bounce, complaint, and unsubscribe records. Pre-flight check blocks sends to these addresses. Supports expiry for soft bounces.
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-primary" />
                                            emailTemplates
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs text-muted-foreground">
                                        Reusable templates with subject, HTML/text body, variables, conditional blocks. States: draft → active → archived.
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Layers className="h-4 w-4 text-primary" />
                                            emailQueue
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs text-muted-foreground">
                                        DB-backed queue persisting all items. Survives Vercel serverless cold starts. Status: queued → sending → sent or DLQ.
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Globe className="h-4 w-4 text-primary" />
                                            sendingDomains
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs text-muted-foreground">
                                        Verified sending domains with DKIM, SPF, and DMARC status. Domain health checked before campaign sends.
                                    </CardContent>
                                </Card>
                            </div>
                        </ArchSection>
                    </div>
                </section>

                <Separator />

                {/* ── Mermaid Diagram ── */}
                <section className="py-16 lg:py-20 bg-muted/30">
                    <div className="container mx-auto max-w-5xl px-4">
                        <div className="text-center mb-10">
                            <Badge variant="outline" className="mb-3">Technical Diagram</Badge>
                            <h2 className="text-2xl sm:text-3xl font-bold">Complete System Diagram</h2>
                            <p className="text-muted-foreground mt-2">Machine-readable architecture for engineering docs and system reviews.</p>
                        </div>
                        <Card>
                            <CardContent className="p-6">
                                <pre className="text-xs overflow-x-auto whitespace-pre leading-relaxed font-mono text-muted-foreground">
                                    {`flowchart TB
  subgraph Triggers["🎯 Trigger Sources"]
    Campaign["📧 Campaign Send"] 
    FlowEngine["🔄 Flow Engine (send_email node)"]
    API["🔌 REST API (POST /api/v1/email-campaigns)"]
    TestSend["🧪 Test Send"]
  end

  subgraph PreFlight["✅ Pre-Flight"]
    Recipients["📋 Resolve Recipients (Segments / Lists, ≤10K)"]
    Suppression["🚫 Suppression Check (bounces, complaints, unsubs)"]
    Domain["🌐 Domain Verify (DKIM / SPF / DMARC)"]
  end

  subgraph Personalize["🎨 Personalization"]
    Template["📝 Template Resolution (subject + HTML + text)"]
    Variables["🔤 Variable Injection ({{user.name}}, conditionals)"]
    Tracking["📊 Tracking Injection (pixel + click wraps + unsub)"]
  end

  subgraph Queue["📤 Queue (PostgreSQL)"]
    QueueTable["emailQueue: queued → sending → sent"]
    RateLimiter["⏱ Token Bucket Rate Limiter (10/sec)"]
    TickLoop["🔁 Tick Processor (200ms interval)"]
    RetryLogic["♻️ Retry (3x, exponential backoff)"]
    DLQ["💀 Dead Letter Queue"]
  end

  subgraph Transport["📡 SMTP (Nodemailer)"]
    Pool["Connection Pool (5 concurrent)"]
    DKIM["DKIM Signing"]
    TLS["TLS/STARTTLS Encryption"]
  end

  subgraph Provider["🏢 SMTP Provider"]
    SES["Amazon SES / Postmark / Resend / SendGrid"]
  end

  subgraph Delivery["📬 Delivery"]
    MX["Recipient MX Server"]
    Inbox["📥 User's Inbox"]
  end

  subgraph FeedbackLoop["🔄 Feedback"]
    Opens["👁 Open Tracking (1x1 GIF)"]
    Clicks["🖱 Click Tracking (redirect)"]
    Unsubs["🚪 Unsubscribe (RFC 8058)"]
    Bounces["⚠️ Bounce Handler"]
  end

  subgraph DataLayer["💾 PostgreSQL"]
    emailSends & emailTrackingEvents & emailSuppressions
  end

  Campaign & FlowEngine & API --> Recipients
  TestSend --> Template
  Recipients --> Suppression --> Domain --> Template
  Template --> Variables --> Tracking
  Tracking --> QueueTable --> RateLimiter --> TickLoop
  TickLoop --> Pool --> DKIM --> TLS --> SES --> MX --> Inbox
  TickLoop -.-> RetryLogic -.-> DLQ
  RetryLogic --> QueueTable
  Inbox --> Opens & Clicks & Unsubs
  MX -.-> Bounces
  Opens & Clicks --> emailTrackingEvents
  Unsubs & Bounces --> emailSuppressions
  Tracking --> emailSends`}
                                </pre>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <Separator />

                {/* ── SMTP Recommendation ── */}
                <section id="smtp-recommendation" className="py-16 lg:py-20">
                    <div className="container mx-auto max-w-5xl px-4">
                        <div className="text-center mb-12">
                            <Badge className="mb-3">SMTP Provider Analysis</Badge>
                            <h2 className="text-2xl sm:text-3xl font-bold">Recommended SMTP Providers</h2>
                            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                                Your system uses Nodemailer with standard SMTP, so it works with <strong>any</strong> SMTP provider.
                                Here&apos;s our analysis of the best options ranked by fit for SaaS lifecycle email delivery.
                            </p>
                        </div>

                        {/* Top Recommendation Banner */}
                        <div className="mb-8 rounded-2xl gradient-dark-card border border-primary/20 p-6 lg:p-8 text-white">
                            <div className="flex flex-col lg:flex-row items-start gap-6">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/20">
                                    <Star className="h-8 w-8 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold">Our #1 Recommendation: Amazon SES</h3>
                                        <Badge className="bg-primary/30 text-primary border-primary/40">Best Overall</Badge>
                                    </div>
                                    <p className="text-sm text-white/70 leading-relaxed max-w-2xl">
                                        For a SaaS lifecycle optimization platform where users send onboarding sequences, churn prevention campaigns,
                                        and expansion emails to their own users - <strong className="text-white">Amazon SES provides unbeatable cost efficiency at scale</strong> ($0.10/1,000 emails),
                                        excellent deliverability with dedicated IPs, native DKIM/SPF, and battle-tested infrastructure that handles
                                        millions of emails daily. Combined with your existing Nodemailer transport and PostgreSQL queue,
                                        it&apos;s the ideal backend.
                                    </p>
                                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div>
                                            <div className="text-2xl font-bold text-primary">$0.10</div>
                                            <div className="text-xs text-white/50">per 1,000 emails</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-primary">99%+</div>
                                            <div className="text-xs text-white/50">uptime SLA</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-primary">200/sec</div>
                                            <div className="text-xs text-white/50">sending rate</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-primary">DKIM</div>
                                            <div className="text-xs text-white/50">built-in signing</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Provider Comparison Cards */}
                        <div className="space-y-6">
                            {smtpProviders.map((provider) => (
                                <Card key={provider.name} className={`overflow-hidden ${provider.recommended ? 'ring-2 ring-primary' : ''}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-lg">
                                                    #{provider.rank}
                                                </div>
                                                <div>
                                                    <CardTitle className="flex items-center gap-2">
                                                        {provider.name}
                                                        {provider.recommended && <Badge>Recommended</Badge>}
                                                    </CardTitle>
                                                    <CardDescription>{provider.tagline}</CardDescription>
                                                </div>
                                            </div>
                                            <div className="sm:ml-auto flex gap-4 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <DollarSign className="h-4 w-4 text-green-600" />
                                                    <span className="font-medium">{provider.cost}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Gauge className="h-4 w-4 text-primary" />
                                                    <span className="font-medium">{provider.deliverability}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {/* Features */}
                                            <div>
                                                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Key Features</h4>
                                                <ul className="space-y-1">
                                                    {provider.features.map((f, i) => (
                                                        <li key={i} className="flex items-start gap-1.5 text-xs">
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                                            <span>{f}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Pros */}
                                            <div>
                                                <h4 className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-2">Pros</h4>
                                                <ul className="space-y-1">
                                                    {provider.pros.map((p, i) => (
                                                        <li key={i} className="flex items-start gap-1.5 text-xs">
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                                                            <span>{p}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <h4 className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-2 mt-3">Cons</h4>
                                                <ul className="space-y-1">
                                                    {provider.cons.map((c, i) => (
                                                        <li key={i} className="flex items-start gap-1.5 text-xs">
                                                            <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                                                            <span>{c}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Best For */}
                                            <div>
                                                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Best For</h4>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{provider.bestFor}</p>
                                                <div className="mt-3 space-y-1.5">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-muted-foreground">Free Quota</span>
                                                        <span className="font-medium">{provider.freeQuota}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-muted-foreground">Send Speed</span>
                                                        <span className="font-medium">{provider.speed}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Decision Matrix */}
                        <div className="mt-12">
                            <h3 className="text-xl font-bold mb-6 text-center">Quick Decision Matrix</h3>
                            <Card>
                                <CardContent className="p-0 overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="text-left p-3 font-semibold">If you need...</th>
                                                <th className="text-left p-3 font-semibold">Choose</th>
                                                <th className="text-left p-3 font-semibold">Why</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b">
                                                <td className="p-3 text-muted-foreground">Lowest cost at 100K+ emails/mo</td>
                                                <td className="p-3 font-medium">Amazon SES</td>
                                                <td className="p-3 text-muted-foreground">$0.10/1K - 10x cheaper than alternatives at scale</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="p-3 text-muted-foreground">Maximum inbox placement rate</td>
                                                <td className="p-3 font-medium">Postmark</td>
                                                <td className="p-3 text-muted-foreground">98-99%+ delivery, transactional-first architecture</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="p-3 text-muted-foreground">Fastest setup with Next.js</td>
                                                <td className="p-3 font-medium">Resend</td>
                                                <td className="p-3 text-muted-foreground">Modern API, React Email, free 3K/month</td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="p-3 text-muted-foreground">All-in-one platform</td>
                                                <td className="p-3 font-medium">SendGrid</td>
                                                <td className="p-3 text-muted-foreground">Marketing + transactional + validation in one</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 text-muted-foreground">EU data residency</td>
                                                <td className="p-3 font-medium">Mailgun</td>
                                                <td className="p-3 text-muted-foreground">EU region available, GDPR-ready infrastructure</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Implementation Note */}
                        <div className="mt-12 rounded-2xl border bg-card p-6 lg:p-8">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <BrainCircuit className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-2">Implementation Notes</h3>
                                    <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
                                        <p>
                                            <strong>Your system is SMTP-provider agnostic.</strong> The Nodemailer transport in{' '}
                                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/lib/engine/email/transport.ts</code>{' '}
                                            connects to any standard SMTP server via environment variables. Switching providers is a config change, not a code change.
                                        </p>
                                        <p>
                                            <strong>For production deployment,</strong> we recommend starting with <strong>Amazon SES</strong> for these reasons:
                                        </p>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>Your queue system already handles rate limiting (SES has its own too, providing double protection)</li>
                                            <li>DKIM signing is already implemented in your transport - SES adds a second DKIM layer</li>
                                            <li>SES bounce/complaint notifications can POST to your <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/api/v1/email/bounce</code> endpoint via SNS webhooks</li>
                                            <li>At 100K emails/month, SES costs ~$10 vs Postmark&apos;s ~$125 or SendGrid&apos;s ~$35</li>
                                            <li>Dedicated IPs ($24.95/mo) give you full reputation control</li>
                                        </ul>
                                        <p>
                                            <strong>For development/testing,</strong> use <strong>Resend</strong> (free 3,000/month) or a local tool like <strong>Mailpit</strong> to capture emails without actually sending.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <MarketingFooter />
        </div>
    );
}
