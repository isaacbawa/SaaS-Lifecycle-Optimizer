import { SignIn } from '@clerk/nextjs';
import { Activity, BarChart3, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

export default function SignInPage() {
    return (
        <div className="flex min-h-screen">
            {/* ── Left Panel — Brand + Value Props ─────────────────────────── */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 text-white">
                <div>
                    <Link href="/" className="flex items-center gap-2 mb-16">
                        <div className="h-9 w-9 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
                            <Activity className="h-5 w-5 text-emerald-400" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">LifecycleOS</span>
                    </Link>

                    <div className="max-w-md">
                        <h1 className="text-3xl font-bold tracking-tight mb-4">
                            Welcome back
                        </h1>
                        <p className="text-lg text-slate-300 mb-12">
                            Your customer lifecycle data is waiting. Pick up where you left
                            off — every insight, every automation, exactly as you left it.
                        </p>

                        <div className="space-y-6">
                            <ValueProp
                                icon={<BarChart3 className="h-5 w-5 text-emerald-400" />}
                                title="Real-Time Revenue Intelligence"
                                description="Monitor MRR movements, expansion signals, and churn risk across your entire customer base in a single view."
                            />
                            <ValueProp
                                icon={<Zap className="h-5 w-5 text-amber-400" />}
                                title="Automated Lifecycle Flows"
                                description="Visual automation builder that triggers the right action at the right time — onboarding, re-engagement, expansion."
                            />
                            <ValueProp
                                icon={<Shield className="h-5 w-5 text-blue-400" />}
                                title="Enterprise-Grade Security"
                                description="SOC 2 compliant infrastructure with end-to-end encryption, role-based access, and complete audit trails."
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                    <p className="text-sm text-slate-400">
                        Trusted by product-led growth teams managing $100M+ in combined ARR.
                    </p>
                </div>
            </div>

            {/* ── Right Panel — Clerk Sign In ──────────────────────────────── */}
            <div className="flex flex-1 flex-col items-center justify-center p-8 bg-white dark:bg-slate-950">
                <div className="w-full max-w-md">
                    <div className="mb-8 text-center lg:hidden">
                        <Link href="/" className="inline-flex items-center gap-2 mb-6">
                            <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Activity className="h-5 w-5 text-emerald-500" />
                            </div>
                            <span className="text-xl font-bold tracking-tight">LifecycleOS</span>
                        </Link>
                        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Sign in to continue to your dashboard
                        </p>
                    </div>

                    <SignIn
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
                        By signing in, you agree to our{' '}
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

function ValueProp({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="flex gap-4">
            <div className="flex-shrink-0 mt-1 h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-sm mb-1">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
            </div>
        </div>
    );
}
