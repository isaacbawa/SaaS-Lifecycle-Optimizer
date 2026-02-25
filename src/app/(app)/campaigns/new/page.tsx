'use client';

/* ==========================================================================
 * Campaign Builder — Professional Full-Page Campaign Creation
 *
 * Handles both Create and Edit modes (via ?id=xxx query param).
 * Sections:
 *  1. Campaign Details (name, description)
 *  2. Email Content (template selection with visual cards)
 *  3. Audience Targeting (segment selection with estimated reach)
 *  4. Subject & Personalization (subject override + variable inserter)
 *  5. Sender Settings (from name, from email, reply-to)
 *  6. Schedule (send now / schedule for later)
 * ========================================================================== */

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
    ArrowLeft, Send, Save, Clock, Users, Mail, FileText,
    Variable, Check, PlusCircle, Sparkles, Eye,
    AlertCircle, Loader2, Calendar as CalendarIcon, Layers,
    AtSign, User, Building2, ShieldAlert, ShieldCheck, ExternalLink,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VARIABLE_CATEGORIES } from '@/components/email-builder/types';
import type { TemplateVariable } from '@/components/email-builder/types';

/* ── Types ──────────────────────────────────────────────────────────── */

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    previewText: string | null;
    bodyHtml: string;
    status: string;
    category: string | null;
    sendCount: number;
    openCount: number;
    clickCount: number;
    variables: Array<{ key: string; label: string; source: string; fallback: string }>;
    createdAt: string;
}

interface Segment {
    id: string;
    name: string;
    description?: string;
    status?: string;
    memberCount?: number;
    userCount?: number;
    filters?: unknown;
}

interface ExistingCampaign {
    id: string;
    name: string;
    description?: string;
    type: string;
    templateId: string | null;
    segmentId: string | null;
    triggerEvent: string | null;
    subjectOverride: string | null;
    fromName: string | null;
    fromEmail: string | null;
    replyTo: string | null;
    scheduledAt: string | null;
    status: string;
}

/* ── Variable Inserter Component ─────────────────────────────────────── */

function VariableInserter({ onInsert }: { onInsert: (variable: string) => void }) {
    const [search, setSearch] = useState('');

    const filtered = VARIABLE_CATEGORIES.map((cat) => ({
        ...cat,
        variables: cat.variables.filter(
            (v) =>
                v.key.toLowerCase().includes(search.toLowerCase()) ||
                v.label.toLowerCase().includes(search.toLowerCase()),
        ),
    })).filter((cat) => cat.variables.length > 0);

    const categoryIcons: Record<string, React.ElementType> = {
        Contact: User,
        Account: Building2,
        Lifecycle: Sparkles,
        System: AtSign,
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    <Variable className="h-3.5 w-3.5" />
                    Insert Variable
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b">
                    <Input
                        placeholder="Search variables..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-8 text-xs"
                    />
                </div>
                <ScrollArea className="h-64">
                    <div className="p-2 space-y-3">
                        {filtered.map((cat) => {
                            const Icon = categoryIcons[cat.name] ?? Variable;
                            return (
                                <div key={cat.name}>
                                    <div className="flex items-center gap-1.5 px-2 py-1">
                                        <Icon className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            {cat.name}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 mt-1">
                                        {cat.variables.map((v) => (
                                            <button
                                                key={v.key}
                                                onClick={() => onInsert(`{{${v.key}}}`)}
                                                className="flex flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
                                            >
                                                <code className="text-[11px] font-mono text-primary">{`{{${v.key}}}`}</code>
                                                <span className="text-[10px] text-muted-foreground">{v.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        {filtered.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">No variables match your search.</p>
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}

/* ── Section Header ──────────────────────────────────────────────────── */

function SectionHeader({ step, title, description }: { step: number; title: string; description: string }) {
    return (
        <div className="flex items-start gap-3 mb-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {step}
            </div>
            <div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
        </div>
    );
}

/* ── Main Component (wrapped in Suspense) ────────────────────────────── */

function CampaignBuilderInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');

    /* ── State ──────────────────────────────────────── */
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sendingNow, setSendingNow] = useState(false);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [segments, setSegments] = useState<Segment[]>([]);

    // Campaign fields
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [segmentId, setSegmentId] = useState<string | null>(null);
    const [subjectOverride, setSubjectOverride] = useState('');
    const [previewTextOverride, setPreviewTextOverride] = useState('');
    const [fromName, setFromName] = useState('');
    const [fromEmail, setFromEmail] = useState('');
    const [replyTo, setReplyTo] = useState('');
    const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('09:00');

    // Validation
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Domain authentication warning
    const [domainWarning, setDomainWarning] = useState<{
        authenticated: boolean;
        domain: string;
        registered: boolean;
        warnings: string[];
        score?: number;
        spf?: boolean;
        dkim?: boolean;
        dmarc?: boolean;
    } | null>(null);
    const [checkingDomain, setCheckingDomain] = useState(false);

    // Refs for variable insertion
    const subjectRef = useRef<HTMLInputElement>(null);
    const previewRef = useRef<HTMLInputElement>(null);
    const [activeField, setActiveField] = useState<'subject' | 'preview'>('subject');

    /* ── Fetch data ─────────────────────────────────── */
    const fetchData = useCallback(async () => {
        try {
            const [tRes, sRes] = await Promise.all([
                fetch('/api/v1/email-templates'),
                fetch('/api/v1/segments'),
            ]);
            if (tRes.ok) { const j = await tRes.json(); setTemplates(j.data ?? []); }
            if (sRes.ok) { const j = await sRes.json(); setSegments(j.data ?? []); }

            // Load existing campaign if editing
            if (editId) {
                const cRes = await fetch('/api/v1/email-campaigns');
                if (cRes.ok) {
                    const j = await cRes.json();
                    const campaign = (j.data ?? []).find((c: ExistingCampaign) => c.id === editId);
                    if (campaign) {
                        setName(campaign.name);
                        setDescription(campaign.description ?? '');
                        setTemplateId(campaign.templateId);
                        setSegmentId(campaign.segmentId);
                        setSubjectOverride(campaign.subjectOverride ?? '');
                        setFromName(campaign.fromName ?? '');
                        setFromEmail(campaign.fromEmail ?? '');
                        setReplyTo(campaign.replyTo ?? '');
                        if (campaign.scheduledAt) {
                            setScheduleType('later');
                            const d = new Date(campaign.scheduledAt);
                            setScheduledDate(d.toISOString().split('T')[0]);
                            setScheduledTime(d.toTimeString().slice(0, 5));
                        }
                    }
                }
            }
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    }, [editId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── Variable insertion ─────────────────────────── */
    const insertVariable = useCallback((variable: string) => {
        if (activeField === 'subject') {
            const input = subjectRef.current;
            if (input) {
                const start = input.selectionStart ?? subjectOverride.length;
                const end = input.selectionEnd ?? subjectOverride.length;
                const newVal = subjectOverride.slice(0, start) + variable + subjectOverride.slice(end);
                setSubjectOverride(newVal);
                setTimeout(() => {
                    input.focus();
                    input.setSelectionRange(start + variable.length, start + variable.length);
                }, 0);
            } else {
                setSubjectOverride((prev) => prev + variable);
            }
        } else {
            const input = previewRef.current;
            if (input) {
                const start = input.selectionStart ?? previewTextOverride.length;
                const end = input.selectionEnd ?? previewTextOverride.length;
                const newVal = previewTextOverride.slice(0, start) + variable + previewTextOverride.slice(end);
                setPreviewTextOverride(newVal);
                setTimeout(() => {
                    input.focus();
                    input.setSelectionRange(start + variable.length, start + variable.length);
                }, 0);
            } else {
                setPreviewTextOverride((prev) => prev + variable);
            }
        }
    }, [activeField, subjectOverride, previewTextOverride]);

    /* ── Domain auth check on fromEmail change ──────── */
    useEffect(() => {
        if (!fromEmail || !fromEmail.includes('@')) {
            setDomainWarning(null);
            return;
        }
        const timer = setTimeout(async () => {
            setCheckingDomain(true);
            try {
                const res = await fetch(`/api/v1/domains/check?email=${encodeURIComponent(fromEmail)}`);
                if (res.ok) {
                    const data = await res.json();
                    setDomainWarning(data);
                }
            } catch { /* silent */ } finally {
                setCheckingDomain(false);
            }
        }, 800); // debounce 800ms
        return () => clearTimeout(timer);
    }, [fromEmail]);

    /* ── Validation ─────────────────────────────────── */
    const validate = useCallback(() => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = 'Campaign name is required';
        if (!templateId) errs.template = 'Select an email template';
        if (scheduleType === 'later' && !scheduledDate) errs.schedule = 'Select a scheduled date';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }, [name, templateId, scheduleType, scheduledDate]);

    /* ── Save Campaign ──────────────────────────────── */
    const saveCampaign = useCallback(async (status: 'draft' | 'scheduled' | 'sending') => {
        if (!validate()) return;
        const isSending = status === 'sending';
        if (isSending) setSendingNow(true); else setSaving(true);

        try {
            const payload: Record<string, unknown> = {
                name,
                description: description || null,
                type: 'one_time',
                templateId,
                segmentId: segmentId || null,
                subjectOverride: subjectOverride || null,
                fromName: fromName || null,
                fromEmail: fromEmail || null,
                replyTo: replyTo || null,
                status: status === 'sending' ? 'draft' : status,
            };

            if (scheduleType === 'later' && scheduledDate) {
                payload.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
                payload.status = 'scheduled';
            }

            if (editId) payload.id = editId;

            // Create/update campaign
            const res = await fetch('/api/v1/email-campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Failed to save campaign');
            const result = await res.json();

            // If sending now, trigger the send action
            if (isSending && result.data?.id) {
                await fetch('/api/v1/email-campaigns', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'send', id: result.data.id }),
                });
            }

            router.push('/email');
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
            setSendingNow(false);
        }
    }, [
        name, description, templateId, segmentId, subjectOverride,
        fromName, fromEmail, replyTo, scheduleType, scheduledDate,
        scheduledTime, editId, validate, router,
    ]);

    /* ── Computed ───────────────────────────────────── */
    const selectedTemplate = templates.find((t) => t.id === templateId);
    const selectedSegment = segments.find((s) => s.id === segmentId);
    const estimatedReach = selectedSegment
        ? (selectedSegment.memberCount ?? selectedSegment.userCount ?? 0)
        : 0;
    const canSend = name.trim() && templateId;

    /* ── Render ─────────────────────────────────────── */
    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/20">
            {/* ═══ Top Action Bar ══════════════════════════════════════════ */}
            <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/email">
                                <ArrowLeft className="h-4 w-4 mr-1" /> Back
                            </Link>
                        </Button>
                        <Separator orientation="vertical" className="h-6" />
                        <div>
                            <h1 className="text-sm font-semibold">{editId ? 'Edit Campaign' : 'Create Campaign'}</h1>
                            <p className="text-xs text-muted-foreground">
                                {editId ? 'Update your campaign settings' : 'Build and send a targeted email campaign'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => saveCampaign('draft')}
                            disabled={saving || sendingNow || !name.trim()}
                        >
                            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                            Save Draft
                        </Button>
                        {scheduleType === 'later' ? (
                            <Button
                                size="sm"
                                onClick={() => saveCampaign('scheduled')}
                                disabled={saving || sendingNow || !canSend || !scheduledDate}
                            >
                                <Clock className="h-3.5 w-3.5 mr-1" /> Schedule
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                onClick={() => saveCampaign('sending')}
                                disabled={saving || sendingNow || !canSend}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {sendingNow ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                                Send Now
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ Main Form ═══════════════════════════════════════════════ */}
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

                {/* ── 1. Campaign Details ─────────────────────────── */}
                <Card>
                    <CardContent className="pt-6">
                        <SectionHeader
                            step={1}
                            title="Campaign Details"
                            description="Give your campaign a clear name and optional description."
                        />
                        <div className="grid gap-4 pl-10">
                            <div className="space-y-1.5">
                                <Label htmlFor="campaign-name" className="text-xs font-medium">
                                    Campaign Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="campaign-name"
                                    value={name}
                                    onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: '' })); }}
                                    placeholder="e.g. Q1 Re-engagement — Churning Users"
                                    className={cn('h-10', errors.name && 'border-destructive')}
                                    autoFocus
                                />
                                {errors.name && (
                                    <p className="text-xs text-destructive flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> {errors.name}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="campaign-desc" className="text-xs font-medium">Description</Label>
                                <Textarea
                                    id="campaign-desc"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description of this campaign's goal and target audience..."
                                    rows={2}
                                    className="text-sm resize-none"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── 2. Email Content (Template Selection) ───────── */}
                <Card>
                    <CardContent className="pt-6">
                        <SectionHeader
                            step={2}
                            title="Email Content"
                            description="Select an existing email template or create a new one in the email builder."
                        />
                        <div className="pl-10 space-y-4">
                            {errors.template && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> {errors.template}
                                </p>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {/* Create New template card */}
                                <button
                                    onClick={() => router.push('/email-builder?context=campaign')}
                                    className="group flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-all hover:border-primary hover:bg-primary/5"
                                >
                                    <div className="rounded-full bg-primary/10 p-3">
                                        <PlusCircle className="h-5 w-5 text-primary" />
                                    </div>
                                    <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">
                                        Create New Email
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        Opens the email builder
                                    </span>
                                </button>

                                {/* Template cards */}
                                {templates.map((t) => {
                                    const isSelected = templateId === t.id;
                                    const openRate = t.sendCount > 0
                                        ? ((t.openCount / t.sendCount) * 100).toFixed(0)
                                        : null;
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => {
                                                setTemplateId(t.id);
                                                setErrors((prev) => ({ ...prev, template: '' }));
                                            }}
                                            className={cn(
                                                'relative flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all hover:shadow-sm',
                                                isSelected
                                                    ? 'border-primary bg-primary/5 shadow-sm'
                                                    : 'border-muted hover:border-muted-foreground/40',
                                            )}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 rounded-full bg-primary p-0.5">
                                                    <Check className="h-3 w-3 text-primary-foreground" />
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    'rounded-md p-1.5',
                                                    isSelected ? 'bg-primary/20' : 'bg-muted',
                                                )}>
                                                    <FileText className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                                                </div>
                                                <span className="text-sm font-medium line-clamp-1">{t.name}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1 w-full">
                                                {t.subject || 'No subject line'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-auto">
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {t.status}
                                                </Badge>
                                                {t.sendCount > 0 && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {t.sendCount.toLocaleString()} sent
                                                    </span>
                                                )}
                                                {openRate && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {openRate}% opens
                                                    </span>
                                                )}
                                            </div>
                                            {(t.variables?.length ?? 0) > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {(t.variables ?? []).slice(0, 3).map((v) => (
                                                        <Badge key={v.key} variant="outline" className="text-[9px] font-mono py-0 h-4">
                                                            {`{{${v.key}}}`}
                                                        </Badge>
                                                    ))}
                                                    {(t.variables?.length ?? 0) > 3 && (
                                                        <Badge variant="outline" className="text-[9px] py-0 h-4">
                                                            +{(t.variables?.length ?? 0) - 3}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            {templates.length === 0 && (
                                <div className="rounded-lg border bg-muted/30 p-8 text-center">
                                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">No templates yet.</p>
                                    <p className="text-xs text-muted-foreground mt-1">Create one in the email builder first.</p>
                                </div>
                            )}

                            {/* Selected template preview */}
                            {selectedTemplate && (
                                <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-xs font-medium">Selected: {selectedTemplate.name}</span>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                                            <Link href={`/email-builder?id=${selectedTemplate.id}`}>
                                                Edit in Builder
                                            </Link>
                                        </Button>
                                    </div>
                                    <div className="rounded border bg-background p-3">
                                        <p className="text-xs text-muted-foreground mb-1">Subject</p>
                                        <p className="text-sm font-medium">{selectedTemplate.subject || 'No subject'}</p>
                                        {selectedTemplate.previewText && (
                                            <>
                                                <p className="text-xs text-muted-foreground mt-2 mb-1">Preview Text</p>
                                                <p className="text-xs text-muted-foreground">{selectedTemplate.previewText}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ── 3. Audience Targeting ───────────────────────── */}
                <Card>
                    <CardContent className="pt-6">
                        <SectionHeader
                            step={3}
                            title="Audience"
                            description="Choose which segment of users will receive this campaign."
                        />
                        <div className="pl-10 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* All Users option */}
                                <button
                                    onClick={() => setSegmentId(null)}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all',
                                        segmentId === null
                                            ? 'border-primary bg-primary/5'
                                            : 'border-muted hover:border-muted-foreground/40',
                                    )}
                                >
                                    <div className={cn(
                                        'rounded-full p-2',
                                        segmentId === null ? 'bg-primary/20' : 'bg-muted',
                                    )}>
                                        <Users className={cn('h-4 w-4', segmentId === null ? 'text-primary' : 'text-muted-foreground')} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">All Users</p>
                                        <p className="text-xs text-muted-foreground">Send to every tracked user</p>
                                    </div>
                                    {segmentId === null && (
                                        <div className="rounded-full bg-primary p-0.5">
                                            <Check className="h-3 w-3 text-primary-foreground" />
                                        </div>
                                    )}
                                </button>

                                {/* Segment options */}
                                {segments.map((seg) => {
                                    const isSelected = segmentId === seg.id;
                                    const count = seg.memberCount ?? seg.userCount ?? 0;
                                    return (
                                        <button
                                            key={seg.id}
                                            onClick={() => setSegmentId(seg.id)}
                                            className={cn(
                                                'flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all',
                                                isSelected
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-muted hover:border-muted-foreground/40',
                                            )}
                                        >
                                            <div className={cn(
                                                'rounded-full p-2',
                                                isSelected ? 'bg-primary/20' : 'bg-muted',
                                            )}>
                                                <Layers className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium">{seg.name}</p>
                                                {seg.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1">{seg.description}</p>
                                                )}
                                                {count > 0 && (
                                                    <p className="text-xs text-primary font-medium mt-0.5">
                                                        {count.toLocaleString()} users
                                                    </p>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <div className="rounded-full bg-primary p-0.5">
                                                    <Check className="h-3 w-3 text-primary-foreground" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {segments.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    No segments defined. <Link href="/segments" className="text-primary underline">Create segments</Link> to target specific users.
                                </p>
                            )}

                            {/* Estimated reach */}
                            {segmentId && estimatedReach > 0 && (
                                <div className="flex items-center gap-2 rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-4 py-2.5">
                                    <Users className="h-4 w-4 text-emerald-600" />
                                    <span className="text-sm text-emerald-700 dark:text-emerald-400">
                                        Estimated reach: <strong>{estimatedReach.toLocaleString()}</strong> users
                                    </span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ── 4. Subject & Personalization ─────────────────── */}
                <Card>
                    <CardContent className="pt-6">
                        <SectionHeader
                            step={4}
                            title="Subject & Personalization"
                            description="Override the template subject line and personalize with merge variables."
                        />
                        <div className="pl-10 space-y-4">
                            {selectedTemplate && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
                                    <Mail className="h-3.5 w-3.5" />
                                    Template subject: <span className="font-mono text-foreground">{selectedTemplate.subject}</span>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-medium">
                                        Subject Line Override
                                        <span className="text-muted-foreground font-normal ml-1">(optional — overrides template subject)</span>
                                    </Label>
                                    <VariableInserter onInsert={insertVariable} />
                                </div>
                                <Input
                                    ref={subjectRef}
                                    value={subjectOverride}
                                    onChange={(e) => setSubjectOverride(e.target.value)}
                                    onFocus={() => setActiveField('subject')}
                                    placeholder="Leave blank to use the template's subject line"
                                    className="h-10 font-mono text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">
                                    Preview Text Override
                                    <span className="text-muted-foreground font-normal ml-1">(shown in inbox preview)</span>
                                </Label>
                                <Input
                                    ref={previewRef}
                                    value={previewTextOverride}
                                    onChange={(e) => setPreviewTextOverride(e.target.value)}
                                    onFocus={() => setActiveField('preview')}
                                    placeholder="Optional inbox preview text"
                                    className="h-10 text-sm"
                                />
                            </div>

                            {/* Quick variable reference */}
                            <div className="space-y-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                    Popular Variables — click to insert
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { key: 'user.firstName', label: 'First Name' },
                                        { key: 'user.name', label: 'Full Name' },
                                        { key: 'account.name', label: 'Account' },
                                        { key: 'user.plan', label: 'Plan' },
                                        { key: 'company.name', label: 'Company' },
                                        { key: 'user.seatCount', label: 'Seats Used' },
                                        { key: 'user.mrr', label: 'MRR' },
                                        { key: 'user.daysUntilRenewal', label: 'Days to Renewal' },
                                        { key: 'user.npsScore', label: 'NPS Score' },
                                        { key: 'user.lifecycleState', label: 'Lifecycle Stage' },
                                    ].map((v) => (
                                        <button
                                            key={v.key}
                                            onClick={() => insertVariable(`{{${v.key}}}`)}
                                            className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-[11px] font-mono transition-colors hover:bg-primary/10 hover:border-primary hover:text-primary"
                                        >
                                            <Sparkles className="h-2.5 w-2.5" />
                                            {`{{${v.key}}}`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── 5. Sender Settings ──────────────────────────── */}
                <Card>
                    <CardContent className="pt-6">
                        <SectionHeader
                            step={5}
                            title="Sender Settings"
                            description="Configure who the email appears to come from. Leave blank to use system defaults."
                        />
                        <div className="pl-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">From Name</Label>
                                <Input
                                    value={fromName}
                                    onChange={(e) => setFromName(e.target.value)}
                                    placeholder="e.g. Sarah from LifecycleOS"
                                    className="h-10 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">From Email</Label>
                                <Input
                                    value={fromEmail}
                                    onChange={(e) => setFromEmail(e.target.value)}
                                    placeholder="e.g. sarah@company.com"
                                    type="email"
                                    className="h-10 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Reply-To</Label>
                                <Input
                                    value={replyTo}
                                    onChange={(e) => setReplyTo(e.target.value)}
                                    placeholder="e.g. support@company.com"
                                    type="email"
                                    className="h-10 text-sm"
                                />
                            </div>
                        </div>

                        {/* Domain Authentication Warning */}
                        {checkingDomain && (
                            <div className="pl-10 mt-4">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Checking domain authentication…
                                </div>
                            </div>
                        )}
                        {domainWarning && !checkingDomain && !domainWarning.authenticated && (
                            <div className="pl-10 mt-4">
                                <Alert variant="destructive" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 [&>svg]:text-amber-600">
                                    <ShieldAlert className="h-4 w-4" />
                                    <AlertDescription className="space-y-2">
                                        <p className="font-medium text-sm">
                                            Domain <span className="font-mono font-semibold">{domainWarning.domain}</span> is not fully authenticated
                                        </p>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium border', domainWarning.spf ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400')}>
                                                {domainWarning.spf ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />} SPF
                                            </span>
                                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium border', domainWarning.dkim ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400')}>
                                                {domainWarning.dkim ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />} DKIM
                                            </span>
                                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium border', domainWarning.dmarc ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400')}>
                                                {domainWarning.dmarc ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />} DMARC
                                            </span>
                                            {domainWarning.score !== undefined && (
                                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium border bg-muted text-muted-foreground">
                                                    Score: {domainWarning.score}/100
                                                </span>
                                            )}
                                        </div>
                                        {domainWarning.warnings.length > 0 && (
                                            <ul className="text-xs space-y-0.5 list-disc pl-4">
                                                {domainWarning.warnings.map((w, i) => <li key={i}>{w}</li>)}
                                            </ul>
                                        )}
                                        <p className="text-xs">
                                            Emails sent from unauthenticated domains may land in spam.
                                            <Link href="/deliverability" className="ml-1 inline-flex items-center gap-0.5 font-medium text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900">
                                                Configure DNS <ExternalLink className="h-3 w-3" />
                                            </Link>
                                        </p>
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}
                        {domainWarning && !checkingDomain && domainWarning.authenticated && (
                            <div className="pl-10 mt-4">
                                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span className="font-medium">Domain <span className="font-mono">{domainWarning.domain}</span> is fully authenticated (Score: {domainWarning.score ?? 100}/100)</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── 6. Schedule ─────────────────────────────────── */}
                <Card>
                    <CardContent className="pt-6">
                        <SectionHeader
                            step={6}
                            title="Schedule"
                            description="Send immediately or schedule for a specific date and time."
                        />
                        <div className="pl-10 space-y-4">
                            <RadioGroup
                                value={scheduleType}
                                onValueChange={(v) => setScheduleType(v as 'now' | 'later')}
                                className="space-y-3"
                            >
                                <label
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all',
                                        scheduleType === 'now'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-muted hover:border-muted-foreground/40',
                                    )}
                                >
                                    <RadioGroupItem value="now" />
                                    <div className="flex items-center gap-2 flex-1">
                                        <Send className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Send Immediately</p>
                                            <p className="text-xs text-muted-foreground">Campaign will be sent as soon as you click &quot;Send Now&quot;</p>
                                        </div>
                                    </div>
                                </label>

                                <label
                                    className={cn(
                                        'flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all',
                                        scheduleType === 'later'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-muted hover:border-muted-foreground/40',
                                    )}
                                >
                                    <RadioGroupItem value="later" className="mt-0.5" />
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">Schedule for Later</p>
                                                <p className="text-xs text-muted-foreground">Pick a date and time to send</p>
                                            </div>
                                        </div>
                                        {scheduleType === 'later' && (
                                            <div className="flex items-center gap-3 pt-1">
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Date</Label>
                                                    <Input
                                                        type="date"
                                                        value={scheduledDate}
                                                        onChange={(e) => { setScheduledDate(e.target.value); setErrors((prev) => ({ ...prev, schedule: '' })); }}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        className={cn('h-9 w-44 text-sm', errors.schedule && 'border-destructive')}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Time</Label>
                                                    <Input
                                                        type="time"
                                                        value={scheduledTime}
                                                        onChange={(e) => setScheduledTime(e.target.value)}
                                                        className="h-9 w-32 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </label>
                            </RadioGroup>
                            {errors.schedule && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> {errors.schedule}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ── Campaign Summary ────────────────────────────── */}
                <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="pt-6">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                            <Eye className="h-4 w-4" /> Campaign Summary
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Campaign</p>
                                <p className="text-sm font-medium">{name || '—'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Template</p>
                                <p className="text-sm font-medium">{selectedTemplate?.name ?? '—'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Audience</p>
                                <p className="text-sm font-medium">
                                    {selectedSegment ? selectedSegment.name : segmentId === null ? 'All Users' : '—'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Schedule</p>
                                <p className="text-sm font-medium">
                                    {scheduleType === 'now'
                                        ? 'Immediately'
                                        : scheduledDate
                                            ? `${scheduledDate} at ${scheduledTime}`
                                            : '—'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bottom spacing */}
                <div className="h-12" />
            </div>
        </div>
    );
}

/* ── Page export with Suspense boundary ──────────────────────────────── */

export default function CampaignBuilderPage() {
    return (
        <Suspense fallback={
            <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        }>
            <CampaignBuilderInner />
        </Suspense>
    );
}
