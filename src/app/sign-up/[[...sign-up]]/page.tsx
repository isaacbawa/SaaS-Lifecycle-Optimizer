import { SignUp } from '@clerk/nextjs';
import { Activity, Users, TrendingUp, Workflow, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SignUpPage() {
    return (
        <div className="flex min-h-screen">
            {/* ── Left Panel — Brand + Social Proof ────────────────────────── */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-12 text-white">
                <div>
                    <Link href="/" className="flex items-center gap-2 mb-16">
                        <div className="h-9 w-9 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
                            <Activity className="h-5 w-5 text-emerald-400" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">LifecycleOS</span>
                    </Link>

                    <div className="max-w-md">
                        <h1 className="text-3xl font-bold tracking-tight mb-4">
                            Start converting users into revenue
                        </h1>
                        <p className="text-lg text-emerald-100/80 mb-12">
                            Most SaaS companies lose 40% of trial users before activation.
                            LifecycleOS gives you the intelligence and automation to change that — in under 15 minutes.
                        </p>

                        {/* ── Metrics Grid ─────────────────────────────────────── */}
                        <div className="grid grid-cols-2 gap-4 mb-12">
                            <MetricCard value="2.4×" label="Average increase in trial-to-paid conversion" />
                            <MetricCard value="38%" label="Reduction in net revenue churn" />
                            <MetricCard value="< 10 min" label="Time to first automation" />
                            <MetricCard value="99.99%" label="API uptime SLA" />
                        </div>

                        {/* ── What you get ────────────────────────────────────── */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-emerald-300 uppercase tracking-wide">
                                Everything you need on day one
                            </h3>
                            <CheckItem text="Behavioral event tracking via lightweight SDK" />
                            <CheckItem text="AI-powered churn risk & expansion scoring" />
                            <CheckItem text="Visual lifecycle automation builder" />
                            <CheckItem text="Revenue waterfall & cohort analytics" />
                            <CheckItem text="Team collaboration with role-based access" />
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                    <p className="text-sm text-emerald-200/60">
                        Free 14-day trial with full access. No credit card required.
                    </p>
                </div>
            </div>

            {/* ── Right Panel — Clerk Sign Up ──────────────────────────────── */}
            <div className="flex flex-1 flex-col items-center justify-center p-8 bg-white dark:bg-slate-950">
                <div className="w-full max-w-md">
                    <div className="mb-8 text-center lg:hidden">
                        <Link href="/" className="inline-flex items-center gap-2 mb-6">
                            <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Activity className="h-5 w-5 text-emerald-500" />
                            </div>
                            <span className="text-xl font-bold tracking-tight">LifecycleOS</span>
                        </Link>
                        <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            14-day free trial — no credit card needed
                        </p>
                    </div>

                    <SignUp
                        appearance={{
                            elements: {
                                rootBox: 'w-full',
                                cardBox: 'w-full shadow-none border-0',
                                card: 'w-full shadow-none border-0 p-0',
                                headerTitle: 'text-2xl font-bold hidden lg:block',
                                headerSubtitle: 'text-muted-foreground hidden lg:block',
                                formButtonPrimary:
                                    'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors',
                                formFieldInput:
                                    'border-slate-200 dark:border-slate-700 focus:ring-emerald-500 focus:border-emerald-500',
                                footerActionLink: 'text-emerald-600 hover:text-emerald-700 font-medium',
                                socialButtonsBlockButton:
                                    'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
                                dividerLine: 'bg-slate-200 dark:bg-slate-700',
                                dividerText: 'text-slate-400',
                            },
                        }}
                    />

                    <p className="mt-8 text-center text-xs text-muted-foreground">
                        By creating an account, you agree to our{' '}
                        <Link href="/terms" className="underline hover:text-foreground">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="underline hover:text-foreground">
                            Privacy Policy
                        </Link>
                        .
                    </p>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ value, label }: { value: string; label: string }) {
    return (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-2xl font-bold text-emerald-300">{value}</div>
            <div className="text-xs text-emerald-100/60 mt-1 leading-relaxed">{label}</div>
        </div>
    );
}

function CheckItem({ text }: { text: string }) {
    return (
        <div className="flex items-start gap-3">
            <ArrowRight className="h-4 w-4 mt-0.5 text-emerald-400 flex-shrink-0" />
            <span className="text-sm text-emerald-100/80">{text}</span>
        </div>
    );
}
