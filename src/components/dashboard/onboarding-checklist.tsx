/* ==========================================================================
 * Onboarding Checklist — Setup progress widget for the dashboard
 *
 * A polished, visually distinct card that guides new users through
 * initial configuration.  Fetches real completion data from the
 * onboarding API.  Auto-hides permanently once every step is done
 * (with a brief celebration).  Dismissible at any time.
 *
 * Design language:
 *  - Full-width banner with gradient accents
 *  - Horizontal step indicators on desktop, vertical on mobile
 *  - Each step is clickable with inline context + CTA
 *  - Animated circular progress ring as the centrepiece
 *  - Smooth transitions between states
 * ========================================================================== */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    CheckCircle2,
    ChevronRight,
    X,
    Key,
    Code2,
    ShieldCheck,
    Palette,
    UsersRound,
    GitBranch,
    Sparkles,
    ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

/* ── Types ───────────────────────────────────────────────────────────── */

interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    href: string;
    cta: string;
    detail?: string;
}

interface OnboardingStatus {
    steps: OnboardingStep[];
    completedCount: number;
    totalCount: number;
    allDone: boolean;
}

const SESSION_DISMISS_KEY_PREFIX = 'lcos_onboarding_dismissed_session_v2';
const DONE_DISMISS_KEY_PREFIX = 'lcos_onboarding_completed_dismissed_v2';

function getSessionDismissKey(userId?: string) {
    return `${SESSION_DISMISS_KEY_PREFIX}:${userId ?? 'anonymous'}`;
}

function getDoneDismissKey(userId?: string) {
    return `${DONE_DISMISS_KEY_PREFIX}:${userId ?? 'anonymous'}`;
}

/* ── Step Metadata ───────────────────────────────────────────────────── */

const stepMeta: Record<string, {
    icon: React.ElementType;
    gradient: string;
    ring: string;
    bg: string;
    number: string;
}> = {
    api_key: {
        icon: Key,
        gradient: 'from-amber-500 to-orange-500',
        ring: 'text-amber-500',
        bg: 'bg-amber-500/10',
        number: '01',
    },
    install_sdk: {
        icon: Code2,
        gradient: 'from-blue-500 to-cyan-500',
        ring: 'text-blue-500',
        bg: 'bg-blue-500/10',
        number: '02',
    },
    verify_domain: {
        icon: ShieldCheck,
        gradient: 'from-emerald-500 to-green-500',
        ring: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        number: '03',
    },
    create_template: {
        icon: Palette,
        gradient: 'from-violet-500 to-purple-500',
        ring: 'text-violet-500',
        bg: 'bg-violet-500/10',
        number: '04',
    },
    create_segment: {
        icon: UsersRound,
        gradient: 'from-pink-500 to-rose-500',
        ring: 'text-pink-500',
        bg: 'bg-pink-500/10',
        number: '05',
    },
    build_flow: {
        icon: GitBranch,
        gradient: 'from-indigo-500 to-blue-600',
        ring: 'text-indigo-500',
        bg: 'bg-indigo-500/10',
        number: '06',
    },
};

/* ── Circular Progress Ring ──────────────────────────────────────────── */

function ProgressRing({ completed, total, className }: { completed: number; total: number; className?: string }) {
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const pct = total > 0 ? completed / total : 0;
    const offset = circumference * (1 - pct);

    return (
        <div className={cn('relative flex items-center justify-center', className)}>
            <svg width="92" height="92" viewBox="0 0 92 92" className="-rotate-90">
                {/* Background track */}
                <circle
                    cx="46" cy="46" r={radius}
                    fill="none"
                    strokeWidth="5"
                    className="stroke-muted/40"
                />
                {/* Progress arc */}
                <circle
                    cx="46" cy="46" r={radius}
                    fill="none"
                    strokeWidth="5"
                    strokeLinecap="round"
                    className="stroke-primary transition-all duration-700 ease-out"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold tabular-nums">{completed}</span>
                <span className="text-[10px] text-muted-foreground font-medium">of {total}</span>
            </div>
        </div>
    );
}

/* ── Main Component ──────────────────────────────────────────────────── */

export function OnboardingChecklist() {
    const { user, isLoaded } = useUser();
    const [status, setStatus] = useState<OnboardingStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(false);
    const [activeStep, setActiveStep] = useState<string | null>(null);
    const [showCompletion, setShowCompletion] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const sessionDismissKey = getSessionDismissKey(user?.id);
    const doneDismissKey = getDoneDismissKey(user?.id);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/onboarding', { cache: 'no-store' });
            if (!res.ok) return;
            const json = await res.json();
            if (json.success) {
                const data = json.data as OnboardingStatus;
                setStatus(data);
                // Auto-select first incomplete step
                const next = data.steps.find(s => !s.completed);
                if (next) setActiveStep(next.id);
                return data;
            }
        } catch {
            // Non-critical
        }
        return null;
    }, []);

    useEffect(() => {
        if (!isLoaded) return;

        (async () => {
            const data = await fetchStatus();
            if (!data) {
                setLoading(false);
                return;
            }

            try {
                if (data.allDone) {
                    const alreadyDismissedDone = localStorage.getItem(doneDismissKey) === 'true';
                    if (alreadyDismissedDone) {
                        setDismissed(true);
                    } else {
                        setShowCompletion(true);
                        setDismissed(false);
                    }
                } else {
                    const sessionDismissed = sessionStorage.getItem(sessionDismissKey) === 'true';
                    setDismissed(sessionDismissed);
                    localStorage.removeItem(doneDismissKey);
                }
            } catch {
                setDismissed(false);
            } finally {
                setLoading(false);
            }
        })();
    }, [fetchStatus, isLoaded, doneDismissKey, sessionDismissKey]);

    const handleDismiss = useCallback(() => {
        setDismissed(true);
        try {
            if (status?.allDone) {
                localStorage.setItem(doneDismissKey, 'true');
            } else {
                sessionStorage.setItem(sessionDismissKey, 'true');
            }
        } catch { /* noop */ }
    }, [status?.allDone, doneDismissKey, sessionDismissKey]);

    useEffect(() => {
        if (!status?.allDone || dismissed) return;
        if (!showCompletion) return;

        const t = setTimeout(() => {
            handleDismiss();
        }, 6000);

        return () => clearTimeout(t);
    }, [status?.allDone, dismissed, showCompletion, handleDismiss]);

    // Don't render if loading, dismissed, or no data
    if (loading || dismissed || !status) return null;

    if (status.allDone && showCompletion) {
        return <CompletionCelebration onDismiss={handleDismiss} />;
    }
    if (status.allDone) return null;

    const currentStep = status.steps.find(s => s.id === activeStep);
    const currentMeta = activeStep ? stepMeta[activeStep] : null;
    const pct = Math.round((status.completedCount / status.totalCount) * 100);

    return (
        <div
            ref={containerRef}
            className="relative rounded-xl border bg-card overflow-hidden shadow-sm"
        >
            {/* Top accent gradient bar */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-violet-500 to-indigo-500 opacity-80" />

            <div className="p-5 sm:p-6">
                {/* ── Header Row ──────────────────────────────────────── */}
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                        <ProgressRing
                            completed={status.completedCount}
                            total={status.totalCount}
                            className="hidden sm:flex"
                        />
                        <div>
                            <h2 className="text-lg font-semibold tracking-tight">
                                Set up your workspace
                            </h2>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Complete these steps to start optimizing your SaaS lifecycle.
                                <span className="sm:hidden font-medium text-foreground ml-1">
                                    {pct}% done
                                </span>
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full shrink-0 -mt-1 -mr-1 border-2 shadow-sm text-foreground hover:bg-muted"
                        onClick={handleDismiss}
                        aria-label="Close onboarding checklist"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* ── Progress bar (mobile) ──────────────────────────── */}
                <div className="sm:hidden mb-4">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>

                {/* ── Step Cards Grid ────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                    {status.steps.map((step, i) => {
                        const meta = stepMeta[step.id];
                        const Icon = meta?.icon ?? Key;
                        const isActive = step.id === activeStep;
                        const isNext = !step.completed &&
                            status.steps.filter(s => !s.completed)[0]?.id === step.id;

                        return (
                            <button
                                key={step.id}
                                onClick={() => setActiveStep(isActive ? null : step.id)}
                                className={cn(
                                    'group relative flex flex-col items-center gap-2 rounded-lg border p-3 sm:p-4 transition-all duration-200 text-center',
                                    step.completed
                                        ? 'bg-muted/30 border-muted'
                                        : isActive
                                            ? 'border-primary/50 bg-primary/[0.04] shadow-sm shadow-primary/5'
                                            : 'border-transparent bg-muted/20 hover:bg-muted/40 hover:border-muted',
                                    isNext && !isActive && 'ring-1 ring-primary/20',
                                )}
                            >
                                {/* Step number */}
                                <span className={cn(
                                    'absolute top-1.5 right-2 text-[9px] font-mono font-bold tracking-wider',
                                    step.completed ? 'text-muted-foreground/40' : 'text-muted-foreground/50',
                                )}>
                                    {meta?.number ?? String(i + 1).padStart(2, '0')}
                                </span>

                                {/* Icon container */}
                                <div className={cn(
                                    'relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200',
                                    step.completed
                                        ? 'bg-primary/10'
                                        : meta?.bg ?? 'bg-muted',
                                )}>
                                    {step.completed ? (
                                        <CheckCircle2 className="h-5 w-5 text-primary" />
                                    ) : (
                                        <Icon className={cn(
                                            'h-4.5 w-4.5 transition-colors',
                                            isActive ? 'text-foreground' : 'text-muted-foreground',
                                        )} />
                                    )}
                                    {/* Pulse indicator for next step */}
                                    {isNext && !step.completed && (
                                        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40" />
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                                        </span>
                                    )}
                                </div>

                                {/* Title */}
                                <span className={cn(
                                    'text-xs font-medium leading-tight line-clamp-2',
                                    step.completed ? 'text-muted-foreground' : 'text-foreground',
                                )}>
                                    {step.title.replace(/^(Generate|Install|Authenticate|Design|Define|Build)\s/i, '')}
                                </span>

                                {/* Completed badge */}
                                {step.completed && step.detail && (
                                    <span className="text-[9px] text-primary/70 font-medium">
                                        {step.detail}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Expanded Step Detail ───────────────────────────── */}
                {currentStep && !currentStep.completed && currentMeta && (
                    <div className={cn(
                        'mt-4 flex items-center gap-4 rounded-lg border px-4 py-3.5 transition-all duration-300',
                        'bg-gradient-to-r from-muted/50 to-transparent border-muted',
                    )}>
                        <div className={cn(
                            'hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white',
                            currentMeta.gradient,
                        )}>
                            {(() => { const Icon = currentMeta.icon; return <Icon className="h-4 w-4" />; })()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{currentStep.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {currentStep.description}
                            </p>
                        </div>
                        <Link href={currentStep.href}>
                            <Button size="sm" className="h-8 gap-1.5 text-xs shrink-0 shadow-sm">
                                {currentStep.cta}
                                <ArrowRight className="h-3 w-3" />
                            </Button>
                        </Link>
                    </div>
                )}

                {/* Completed step detail */}
                {currentStep && currentStep.completed && (
                    <div className="mt-4 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/[0.03] px-4 py-3">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{currentStep.title}</span>
                            {currentStep.detail && (
                                <> — <span className="text-primary">{currentStep.detail}</span></>
                            )}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Completion Celebration ──────────────────────────────────────────── */

function CompletionCelebration({ onDismiss }: { onDismiss: () => void }) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 6000);
        return () => clearTimeout(t);
    }, [onDismiss]);

    return (
        <div className="relative rounded-xl border overflow-hidden shadow-sm bg-card">
            {/* Rainbow gradient bar */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-emerald-500 to-violet-500" />

            <div className="px-6 py-5 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                    <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <div className="flex-1">
                    <p className="text-base font-semibold tracking-tight">
                        You&apos;re all set!
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Your workspace is fully configured. Your lifecycle optimization engine is live.
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                    onClick={onDismiss}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
