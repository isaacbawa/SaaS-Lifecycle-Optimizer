/* ==========================================================================
 * Flow Builder — Node Property Panel
 *
 * Right sidebar showing configuration form for the selected node.
 * Updates node data in real-time as the user edits fields.
 * ========================================================================== */

'use client';

import React, { useState, useEffect } from 'react';
import type {
    FlowNodeData,
    FlowNodeType,
    TriggerNodeConfig,
    ActionNodeConfig,
    ConditionNodeConfig,
    ConditionRule,
    DelayNodeConfig,
    SplitNodeConfig,
    SplitVariant,
    FilterNodeConfig,
    GoToNodeConfig,
    ExitNodeConfig,
    ConditionOperator,
    TriggerKind,
    ActionKind,
    DelayKind,
    FlowNodeDef,
} from '@/lib/definitions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, X, FileText, Pencil, Loader2, ExternalLink } from 'lucide-react';

/* ── Types ───────────────────────────────────────────────────────────── */

interface PropertyPanelProps {
    node: FlowNodeDef | null;
    allNodes: FlowNodeDef[];
    onUpdate: (nodeId: string, data: Partial<FlowNodeData>) => void;
    onDelete: (nodeId: string) => void;
    onClose: () => void;
}

/* ── Main Component ──────────────────────────────────────────────────── */

export function PropertyPanel({ node, allNodes, onUpdate, onDelete, onClose }: PropertyPanelProps) {
    if (!node) {
        return (
            <div className="w-80 border-l bg-card flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Select a node to configure</p>
            </div>
        );
    }

    const { data } = node;

    const update = (partial: Partial<FlowNodeData>) => {
        onUpdate(node.id, partial);
    };

    return (
        <div className="w-80 border-l bg-card flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <div>
                    <h3 className="text-sm font-semibold">Node Properties</h3>
                    <Badge variant="outline" className="text-[10px] mt-0.5">{data.nodeType}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {/* Label & Description (shared) */}
                    <div className="space-y-2">
                        <div>
                            <Label className="text-xs">Label</Label>
                            <Input
                                value={data.label}
                                onChange={(e) => update({ label: e.target.value })}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Description</Label>
                            <Textarea
                                value={data.description ?? ''}
                                onChange={(e) => update({ description: e.target.value })}
                                className="text-sm min-h-[60px]"
                                rows={2}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Type-specific config */}
                    {data.nodeType === 'trigger' && (
                        <TriggerConfig
                            config={data.triggerConfig ?? { kind: 'lifecycle_change', allowReEntry: false }}
                            onChange={(c) => update({ triggerConfig: c })}
                        />
                    )}
                    {data.nodeType === 'action' && (
                        <ActionConfig
                            config={data.actionConfig ?? { kind: 'send_email' }}
                            onChange={(c) => update({ actionConfig: c })}
                        />
                    )}
                    {data.nodeType === 'condition' && (
                        <ConditionConfig
                            config={data.conditionConfig ?? { logic: 'AND', rules: [] }}
                            onChange={(c) => update({ conditionConfig: c })}
                        />
                    )}
                    {data.nodeType === 'delay' && (
                        <DelayConfig
                            config={data.delayConfig ?? { kind: 'fixed_duration', durationMinutes: 60 }}
                            onChange={(c) => update({ delayConfig: c })}
                        />
                    )}
                    {data.nodeType === 'split' && (
                        <SplitConfig
                            config={data.splitConfig ?? { variants: [{ id: 'a', label: 'A', percentage: 50 }, { id: 'b', label: 'B', percentage: 50 }] }}
                            onChange={(c) => update({ splitConfig: c })}
                        />
                    )}
                    {data.nodeType === 'filter' && (
                        <FilterConfig
                            config={data.filterConfig ?? { logic: 'AND', rules: [] }}
                            onChange={(c) => update({ filterConfig: c })}
                        />
                    )}
                    {data.nodeType === 'goto' && (
                        <GoToConfig
                            config={data.goToConfig ?? { targetNodeId: '' }}
                            allNodes={allNodes}
                            currentId={node.id}
                            onChange={(c) => update({ goToConfig: c })}
                        />
                    )}
                    {data.nodeType === 'exit' && (
                        <ExitConfig
                            config={data.exitConfig ?? {}}
                            onChange={(c) => update({ exitConfig: c })}
                        />
                    )}

                    <Separator />

                    {/* Delete */}
                    <Button variant="destructive" size="sm" className="w-full" onClick={() => onDelete(node.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Delete Node
                    </Button>
                </div>
            </ScrollArea>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
 * Type-Specific Config Sections
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── Trigger ─────────────────────────────────────────────────────────── */

function TriggerConfig({ config, onChange }: { config: TriggerNodeConfig; onChange: (c: TriggerNodeConfig) => void }) {
    const kinds: { value: TriggerKind; label: string }[] = [
        { value: 'lifecycle_change', label: 'Lifecycle Change' },
        { value: 'event_received', label: 'Event Received' },
        { value: 'schedule', label: 'Schedule (Cron)' },
        { value: 'manual', label: 'Manual / API' },
        { value: 'segment_entry', label: 'Segment Entry' },
        { value: 'webhook_received', label: 'Webhook Received' },
        { value: 'date_property', label: 'Date Property' },
    ];

    const states = ['Lead', 'Trial', 'Activated', 'PowerUser', 'ExpansionReady', 'AtRisk', 'Churned', 'Reactivated'] as const;

    return (
        <div className="space-y-3">
            <div>
                <Label className="text-xs">Trigger Type</Label>
                <Select value={config.kind} onValueChange={(v) => onChange({ ...config, kind: v as TriggerKind })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {kinds.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {config.kind === 'lifecycle_change' && (
                <>
                    <div>
                        <Label className="text-xs">To State(s)</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {states.map((s) => (
                                <Badge
                                    key={s}
                                    variant={config.lifecycleTo?.includes(s) ? 'default' : 'outline'}
                                    className="cursor-pointer text-[10px]"
                                    onClick={() => {
                                        const current = config.lifecycleTo ?? [];
                                        const next = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
                                        onChange({ ...config, lifecycleTo: next as typeof config.lifecycleTo });
                                    }}
                                >
                                    {s}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {config.kind === 'event_received' && (
                <div>
                    <Label className="text-xs">Event Name</Label>
                    <Input
                        value={config.eventName ?? ''}
                        onChange={(e) => onChange({ ...config, eventName: e.target.value })}
                        placeholder="e.g. user.signed_up or user.*"
                        className="h-8 text-sm"
                    />
                </div>
            )}

            {config.kind === 'schedule' && (
                <div>
                    <Label className="text-xs">Cron Expression</Label>
                    <Input
                        value={config.cronExpression ?? ''}
                        onChange={(e) => onChange({ ...config, cronExpression: e.target.value })}
                        placeholder="0 9 * * 1 (Mon 9am)"
                        className="h-8 text-sm font-mono"
                    />
                </div>
            )}

            {config.kind === 'date_property' && (
                <>
                    <div>
                        <Label className="text-xs">Date Field</Label>
                        <Input
                            value={config.dateProperty ?? ''}
                            onChange={(e) => onChange({ ...config, dateProperty: e.target.value })}
                            placeholder="contractRenewalDate"
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Offset (days)</Label>
                        <Input
                            type="number"
                            value={config.dateOffsetDays ?? 0}
                            onChange={(e) => onChange({ ...config, dateOffsetDays: Number(e.target.value) })}
                            className="h-8 text-sm"
                        />
                    </div>
                </>
            )}

            <div className="flex items-center justify-between">
                <Label className="text-xs">Allow Re-entry</Label>
                <Switch
                    checked={config.allowReEntry}
                    onCheckedChange={(v) => onChange({ ...config, allowReEntry: v })}
                />
            </div>

            {config.allowReEntry && (
                <div className="space-y-2">
                    <Label className="text-xs">Re-entry Cooldown</Label>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <Input
                                type="number"
                                min={0}
                                value={Math.floor((config.reEntryCooldownMinutes ?? 0) / 1440)}
                                onChange={(e) => {
                                    const days = Number(e.target.value) || 0;
                                    const total = config.reEntryCooldownMinutes ?? 0;
                                    const hours = Math.floor((total % 1440) / 60);
                                    const minutes = total % 60;
                                    onChange({ ...config, reEntryCooldownMinutes: (days * 1440) + (hours * 60) + minutes });
                                }}
                                className="h-8 text-sm"
                            />
                            <p className="text-[10px] text-muted-foreground mt-0.5">days</p>
                        </div>
                        <div>
                            <Input
                                type="number"
                                min={0}
                                max={23}
                                value={Math.floor(((config.reEntryCooldownMinutes ?? 0) % 1440) / 60)}
                                onChange={(e) => {
                                    const hours = Math.min(Number(e.target.value) || 0, 23);
                                    const total = config.reEntryCooldownMinutes ?? 0;
                                    const days = Math.floor(total / 1440);
                                    const minutes = total % 60;
                                    onChange({ ...config, reEntryCooldownMinutes: (days * 1440) + (hours * 60) + minutes });
                                }}
                                className="h-8 text-sm"
                            />
                            <p className="text-[10px] text-muted-foreground mt-0.5">hours</p>
                        </div>
                        <div>
                            <Input
                                type="number"
                                min={0}
                                max={59}
                                value={(config.reEntryCooldownMinutes ?? 0) % 60}
                                onChange={(e) => {
                                    const minutes = Math.min(Number(e.target.value) || 0, 59);
                                    const total = config.reEntryCooldownMinutes ?? 0;
                                    const days = Math.floor(total / 1440);
                                    const hours = Math.floor((total % 1440) / 60);
                                    onChange({ ...config, reEntryCooldownMinutes: (days * 1440) + (hours * 60) + minutes });
                                }}
                                className="h-8 text-sm"
                            />
                            <p className="text-[10px] text-muted-foreground mt-0.5">mins</p>
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        = {formatDuration(config.reEntryCooldownMinutes ?? 0)}
                    </p>
                </div>
            )}
        </div>
    );
}

/* ── Action ──────────────────────────────────────────────────────────── */

interface EmailTemplateOption {
    id: string;
    name: string;
    subject: string;
    status: string;
    category: string | null;
}

function ActionConfig({ config, onChange }: { config: ActionNodeConfig; onChange: (c: ActionNodeConfig) => void }) {
    const [emailMode, setEmailMode] = useState<'template' | 'custom'>(
        config.emailTemplateId ? 'template' : 'custom'
    );
    const [templates, setTemplates] = useState<EmailTemplateOption[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    // Fetch templates when mode is 'template' and kind is 'send_email'
    useEffect(() => {
        if (config.kind === 'send_email' && emailMode === 'template' && templates.length === 0) {
            setLoadingTemplates(true);
            fetch('/api/v1/email-templates')
                .then(r => r.ok ? r.json() : { data: [] })
                .then(j => setTemplates(j.data ?? []))
                .catch(() => { })
                .finally(() => setLoadingTemplates(false));
        }
    }, [config.kind, emailMode, templates.length]);

    const selectedTemplate = templates.find(t => t.id === config.emailTemplateId);

    const kinds: { value: ActionKind; label: string }[] = [
        { value: 'send_email', label: 'Send Email' },
        { value: 'send_webhook', label: 'Send Webhook' },
        { value: 'update_user', label: 'Update User' },
        { value: 'add_tag', label: 'Add Tag' },
        { value: 'remove_tag', label: 'Remove Tag' },
        { value: 'set_variable', label: 'Set Variable' },
        { value: 'api_call', label: 'API Call' },
        { value: 'create_task', label: 'Create Task' },
        { value: 'send_notification', label: 'Notification' },
    ];

    return (
        <div className="space-y-3">
            <div>
                <Label className="text-xs">Action Type</Label>
                <Select value={config.kind} onValueChange={(v) => onChange({ ...config, kind: v as ActionKind })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {kinds.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {config.kind === 'send_email' && (
                <>
                    {/* Mode Toggle: Template vs Custom */}
                    <div className="space-y-2">
                        <Label className="text-xs">Email Source</Label>
                        <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg border bg-muted/30">
                            <button
                                type="button"
                                onClick={() => {
                                    setEmailMode('template');
                                    if (templates.length === 0) {
                                        setLoadingTemplates(true);
                                        fetch('/api/v1/email-templates')
                                            .then(r => r.ok ? r.json() : { data: [] })
                                            .then(j => setTemplates(j.data ?? []))
                                            .catch(() => { })
                                            .finally(() => setLoadingTemplates(false));
                                    }
                                }}
                                className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${emailMode === 'template'
                                        ? 'bg-background shadow-sm text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <FileText className="h-3 w-3" />
                                Use Template
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEmailMode('custom');
                                    // Clear template selection when switching to custom
                                    if (config.emailTemplateId) {
                                        onChange({ ...config, emailTemplateId: undefined });
                                    }
                                }}
                                className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${emailMode === 'custom'
                                        ? 'bg-background shadow-sm text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Pencil className="h-3 w-3" />
                                Custom Email
                            </button>
                        </div>
                    </div>

                    {emailMode === 'template' && (
                        <div className="space-y-2">
                            <Label className="text-xs">Select Template</Label>
                            {loadingTemplates ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading templates...
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="text-xs text-muted-foreground py-2 space-y-1">
                                    <p>No email templates found.</p>
                                    <a href="/email-builder" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                        Create one <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            ) : (
                                <>
                                    <Select
                                        value={config.emailTemplateId ?? ''}
                                        onValueChange={(v) => {
                                            const tpl = templates.find(t => t.id === v);
                                            onChange({
                                                ...config,
                                                emailTemplateId: v,
                                                emailSubject: tpl?.subject ?? config.emailSubject,
                                            });
                                        }}
                                    >
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue placeholder="Choose an email template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map((t) => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{t.name}</span>
                                                        {t.category && (
                                                            <span className="text-[9px] text-muted-foreground capitalize">({t.category})</span>
                                                        )}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {selectedTemplate && (
                                        <div className="rounded-md border p-2 bg-muted/30 space-y-1">
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Selected Template</p>
                                            <p className="text-xs font-medium">{selectedTemplate.name}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{selectedTemplate.subject}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {emailMode === 'custom' && (
                        <>
                            <div>
                                <Label className="text-xs">Subject</Label>
                                <Input
                                    value={config.emailSubject ?? ''}
                                    onChange={(e) => onChange({ ...config, emailSubject: e.target.value })}
                                    placeholder="Email subject line"
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Body</Label>
                                <Textarea
                                    value={config.emailBody ?? ''}
                                    onChange={(e) => onChange({ ...config, emailBody: e.target.value })}
                                    placeholder={'Email body (supports {{variables}})'}
                                    className="text-sm min-h-[80px]"
                                    rows={4}
                                />
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs">From Name</Label>
                            <Input
                                value={config.emailFromName ?? ''}
                                onChange={(e) => onChange({ ...config, emailFromName: e.target.value })}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Reply-To</Label>
                            <Input
                                value={config.emailReplyTo ?? ''}
                                onChange={(e) => onChange({ ...config, emailReplyTo: e.target.value })}
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>
                </>
            )}

            {config.kind === 'send_webhook' && (
                <>
                    <div>
                        <Label className="text-xs">URL</Label>
                        <Input
                            value={config.webhookUrl ?? ''}
                            onChange={(e) => onChange({ ...config, webhookUrl: e.target.value })}
                            placeholder="https://..."
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Method</Label>
                        <Select value={config.webhookMethod ?? 'POST'} onValueChange={(v) => onChange({ ...config, webhookMethod: v as 'POST' | 'PUT' | 'PATCH' })}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="POST">POST</SelectItem>
                                <SelectItem value="PUT">PUT</SelectItem>
                                <SelectItem value="PATCH">PATCH</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-xs">Payload (JSON)</Label>
                        <Textarea
                            value={config.webhookPayload ?? ''}
                            onChange={(e) => onChange({ ...config, webhookPayload: e.target.value })}
                            placeholder='{"key":"{{user.id}}"}'
                            className="text-sm min-h-[60px] font-mono"
                            rows={3}
                        />
                    </div>
                </>
            )}

            {(config.kind === 'add_tag' || config.kind === 'remove_tag') && (
                <div>
                    <Label className="text-xs">Tag</Label>
                    <Input
                        value={config.tag ?? ''}
                        onChange={(e) => onChange({ ...config, tag: e.target.value })}
                        placeholder="tag-name"
                        className="h-8 text-sm"
                    />
                </div>
            )}

            {config.kind === 'set_variable' && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label className="text-xs">Variable</Label>
                        <Input
                            value={config.variableKey ?? ''}
                            onChange={(e) => onChange({ ...config, variableKey: e.target.value })}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Value</Label>
                        <Input
                            value={config.variableValue ?? ''}
                            onChange={(e) => onChange({ ...config, variableValue: e.target.value })}
                            className="h-8 text-sm"
                        />
                    </div>
                </div>
            )}

            {config.kind === 'create_task' && (
                <>
                    <div>
                        <Label className="text-xs">Task Title</Label>
                        <Input
                            value={config.taskTitle ?? ''}
                            onChange={(e) => onChange({ ...config, taskTitle: e.target.value })}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs">Assignee</Label>
                            <Input
                                value={config.taskAssignee ?? ''}
                                onChange={(e) => onChange({ ...config, taskAssignee: e.target.value })}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Priority</Label>
                            <Select value={config.taskPriority ?? 'medium'} onValueChange={(v) => onChange({ ...config, taskPriority: v as 'low' | 'medium' | 'high' | 'critical' })}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </>
            )}

            {config.kind === 'api_call' && (
                <>
                    <div>
                        <Label className="text-xs">URL</Label>
                        <Input
                            value={config.apiUrl ?? ''}
                            onChange={(e) => onChange({ ...config, apiUrl: e.target.value })}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Method</Label>
                        <Select value={config.apiMethod ?? 'POST'} onValueChange={(v) => onChange({ ...config, apiMethod: v as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' })}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-xs">Body Template (JSON)</Label>
                        <Textarea
                            value={config.apiBodyTemplate ?? ''}
                            onChange={(e) => onChange({ ...config, apiBodyTemplate: e.target.value })}
                            className="text-sm min-h-[60px] font-mono"
                            rows={3}
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Store Response In Variable</Label>
                        <Input
                            value={config.apiResponseVariable ?? ''}
                            onChange={(e) => onChange({ ...config, apiResponseVariable: e.target.value })}
                            placeholder="api_result"
                            className="h-8 text-sm"
                        />
                    </div>
                </>
            )}

            {config.kind === 'send_notification' && (
                <>
                    <div>
                        <Label className="text-xs">Channel</Label>
                        <Select value={config.notificationChannel ?? 'in_app'} onValueChange={(v) => onChange({ ...config, notificationChannel: v as 'in_app' | 'push' | 'sms' })}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="in_app">In-App</SelectItem>
                                <SelectItem value="push">Push</SelectItem>
                                <SelectItem value="sms">SMS</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-xs">Title</Label>
                        <Input
                            value={config.notificationTitle ?? ''}
                            onChange={(e) => onChange({ ...config, notificationTitle: e.target.value })}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Body</Label>
                        <Textarea
                            value={config.notificationBody ?? ''}
                            onChange={(e) => onChange({ ...config, notificationBody: e.target.value })}
                            className="text-sm min-h-[60px]"
                            rows={2}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

/* ── Condition ───────────────────────────────────────────────────────── */

const operators: { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'not contains' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'greater_than', label: '>' },
    { value: 'less_than', label: '<' },
    { value: 'greater_or_equal', label: '>=' },
    { value: 'less_or_equal', label: '<=' },
    { value: 'is_set', label: 'is set' },
    { value: 'is_not_set', label: 'is not set' },
    { value: 'in_list', label: 'in list' },
    { value: 'not_in_list', label: 'not in list' },
    { value: 'matches_regex', label: 'matches regex' },
];

function RuleEditor({ rule, onChange, onDelete }: { rule: ConditionRule; onChange: (r: ConditionRule) => void; onDelete: () => void }) {
    const needsValue = !['is_set', 'is_not_set'].includes(rule.operator);

    return (
        <div className="flex flex-col gap-1.5 p-2 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-1">
                <Input
                    value={rule.field}
                    onChange={(e) => onChange({ ...rule, field: e.target.value })}
                    placeholder="user.lifecycleState"
                    className="h-7 text-xs flex-1"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onDelete}>
                    <Trash2 className="h-3 w-3" />
                </Button>
            </div>
            <Select value={rule.operator} onValueChange={(v) => onChange({ ...rule, operator: v as ConditionOperator })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {operators.map((op) => <SelectItem key={op.value} value={op.value} className="text-xs">{op.label}</SelectItem>)}
                </SelectContent>
            </Select>
            {needsValue && (
                <Input
                    value={String(rule.value ?? '')}
                    onChange={(e) => onChange({ ...rule, value: e.target.value })}
                    placeholder="value"
                    className="h-7 text-xs"
                />
            )}
        </div>
    );
}

function ConditionConfig({ config, onChange }: { config: ConditionNodeConfig; onChange: (c: ConditionNodeConfig) => void }) {
    const addRule = () => {
        onChange({
            ...config,
            rules: [...config.rules, { field: '', operator: 'equals', value: '' }],
        });
    };

    const updateRule = (i: number, rule: ConditionRule) => {
        const rules = [...config.rules];
        rules[i] = rule;
        onChange({ ...config, rules });
    };

    const deleteRule = (i: number) => {
        onChange({ ...config, rules: config.rules.filter((_, idx) => idx !== i) });
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-xs">Logic</Label>
                <Select value={config.logic} onValueChange={(v) => onChange({ ...config, logic: v as 'AND' | 'OR' })}>
                    <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="AND">AND</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                {config.rules.map((rule, i) => (
                    <RuleEditor key={i} rule={rule} onChange={(r) => updateRule(i, r)} onDelete={() => deleteRule(i)} />
                ))}
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={addRule}>
                <Plus className="h-3 w-3 mr-1" />
                Add Rule
            </Button>
        </div>
    );
}

/* ── Delay ───────────────────────────────────────────────────────────── */

function DelayConfig({ config, onChange }: { config: DelayNodeConfig; onChange: (c: DelayNodeConfig) => void }) {
    const kinds: { value: DelayKind; label: string }[] = [
        { value: 'fixed_duration', label: 'Fixed Duration' },
        { value: 'until_event', label: 'Until Event' },
        { value: 'until_date', label: 'Until Date' },
        { value: 'until_time_of_day', label: 'Until Time of Day' },
        { value: 'smart_send_time', label: 'Smart Send Time' },
    ];

    return (
        <div className="space-y-3">
            <div>
                <Label className="text-xs">Delay Type</Label>
                <Select value={config.kind} onValueChange={(v) => onChange({ ...config, kind: v as DelayKind })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {kinds.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {config.kind === 'fixed_duration' && (
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <Label className="text-xs">Days</Label>
                            <Input
                                type="number"
                                min={0}
                                value={Math.floor((config.durationMinutes ?? 0) / 1440)}
                                onChange={(e) => {
                                    const days = Number(e.target.value) || 0;
                                    const totalCurrent = config.durationMinutes ?? 0;
                                    const hours = Math.floor((totalCurrent % 1440) / 60);
                                    const minutes = totalCurrent % 60;
                                    onChange({ ...config, durationMinutes: (days * 1440) + (hours * 60) + minutes });
                                }}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Hours</Label>
                            <Input
                                type="number"
                                min={0}
                                max={23}
                                value={Math.floor(((config.durationMinutes ?? 0) % 1440) / 60)}
                                onChange={(e) => {
                                    const hours = Math.min(Number(e.target.value) || 0, 23);
                                    const totalCurrent = config.durationMinutes ?? 0;
                                    const days = Math.floor(totalCurrent / 1440);
                                    const minutes = totalCurrent % 60;
                                    onChange({ ...config, durationMinutes: (days * 1440) + (hours * 60) + minutes });
                                }}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Minutes</Label>
                            <Input
                                type="number"
                                min={0}
                                max={59}
                                value={(config.durationMinutes ?? 0) % 60}
                                onChange={(e) => {
                                    const minutes = Math.min(Number(e.target.value) || 0, 59);
                                    const totalCurrent = config.durationMinutes ?? 0;
                                    const days = Math.floor(totalCurrent / 1440);
                                    const hours = Math.floor((totalCurrent % 1440) / 60);
                                    onChange({ ...config, durationMinutes: (days * 1440) + (hours * 60) + minutes });
                                }}
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        = {formatDuration(config.durationMinutes ?? 0)}
                    </p>
                </div>
            )}

            {config.kind === 'until_event' && (
                <>
                    <div>
                        <Label className="text-xs">Wait for Event</Label>
                        <Input
                            value={config.waitForEvent ?? ''}
                            onChange={(e) => onChange({ ...config, waitForEvent: e.target.value })}
                            placeholder="e.g. purchase_completed"
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Timeout</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Input
                                    type="number"
                                    min={0}
                                    value={Math.floor((config.waitTimeoutMinutes ?? 1440) / 1440)}
                                    onChange={(e) => {
                                        const days = Number(e.target.value) || 0;
                                        const totalCurrent = config.waitTimeoutMinutes ?? 1440;
                                        const remainderHours = Math.floor((totalCurrent % 1440) / 60);
                                        onChange({ ...config, waitTimeoutMinutes: (days * 1440) + (remainderHours * 60) });
                                    }}
                                    className="h-8 text-sm"
                                />
                                <p className="text-[10px] text-muted-foreground mt-0.5">days</p>
                            </div>
                            <div>
                                <Input
                                    type="number"
                                    min={0}
                                    max={23}
                                    value={Math.floor(((config.waitTimeoutMinutes ?? 1440) % 1440) / 60)}
                                    onChange={(e) => {
                                        const hours = Math.min(Number(e.target.value) || 0, 23);
                                        const totalCurrent = config.waitTimeoutMinutes ?? 1440;
                                        const days = Math.floor(totalCurrent / 1440);
                                        onChange({ ...config, waitTimeoutMinutes: (days * 1440) + (hours * 60) });
                                    }}
                                    className="h-8 text-sm"
                                />
                                <p className="text-[10px] text-muted-foreground mt-0.5">hours</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            = {formatDuration(config.waitTimeoutMinutes ?? 1440)}
                        </p>
                    </div>
                </>
            )}

            {config.kind === 'until_time_of_day' && (
                <div>
                    <Label className="text-xs">Time (HH:mm)</Label>
                    <Input
                        value={config.untilTime ?? '09:00'}
                        onChange={(e) => onChange({ ...config, untilTime: e.target.value })}
                        className="h-8 text-sm"
                    />
                </div>
            )}

            {config.kind === 'until_date' && (
                <div>
                    <Label className="text-xs">Date (ISO or variable)</Label>
                    <Input
                        value={config.untilDate ?? ''}
                        onChange={(e) => onChange({ ...config, untilDate: e.target.value })}
                        placeholder="2025-12-31 or {{var.date}}"
                        className="h-8 text-sm"
                    />
                </div>
            )}

            {config.kind === 'smart_send_time' && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label className="text-xs">Window Start</Label>
                        <Input
                            value={config.sendWindowStart ?? '09:00'}
                            onChange={(e) => onChange({ ...config, sendWindowStart: e.target.value })}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Window End</Label>
                        <Input
                            value={config.sendWindowEnd ?? '17:00'}
                            onChange={(e) => onChange({ ...config, sendWindowEnd: e.target.value })}
                            className="h-8 text-sm"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function formatDuration(minutes: number): string {
    if (minutes <= 0) return '0 minutes';
    const d = Math.floor(minutes / 1440);
    const h = Math.floor((minutes % 1440) / 60);
    const m = minutes % 60;
    const parts: string[] = [];
    if (d > 0) parts.push(`${d} day${d !== 1 ? 's' : ''}`);
    if (h > 0) parts.push(`${h} hour${h !== 1 ? 's' : ''}`);
    if (m > 0) parts.push(`${m} minute${m !== 1 ? 's' : ''}`);
    return parts.join(', ') || '0 minutes';
}

/* ── Split ───────────────────────────────────────────────────────────── */

function SplitConfig({ config, onChange }: { config: SplitNodeConfig; onChange: (c: SplitNodeConfig) => void }) {
    const addVariant = () => {
        const id = String.fromCharCode(97 + config.variants.length);
        const label = id.toUpperCase();
        onChange({
            ...config,
            variants: [...config.variants, { id, label, percentage: 0 }],
        });
    };

    const updateVariant = (i: number, updates: Partial<SplitVariant>) => {
        const variants = config.variants.map((v, idx) => idx === i ? { ...v, ...updates } : v);
        onChange({ ...config, variants });
    };

    const deleteVariant = (i: number) => {
        onChange({ ...config, variants: config.variants.filter((_, idx) => idx !== i) });
    };

    const total = config.variants.reduce((s, v) => s + v.percentage, 0);

    return (
        <div className="space-y-3">
            <Label className="text-xs">Variants {total !== 100 && <span className="text-red-500">(total: {total}%, must be 100%)</span>}</Label>
            {config.variants.map((v, i) => (
                <div key={v.id} className="flex items-center gap-2">
                    <Input
                        value={v.label}
                        onChange={(e) => updateVariant(i, { label: e.target.value })}
                        className="h-7 text-xs flex-1"
                    />
                    <Input
                        type="number"
                        value={v.percentage}
                        onChange={(e) => updateVariant(i, { percentage: Number(e.target.value) })}
                        className="h-7 text-xs w-16"
                        min={0}
                        max={100}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                    {config.variants.length > 2 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteVariant(i)}>
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            ))}
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={addVariant}>
                <Plus className="h-3 w-3 mr-1" />
                Add Variant
            </Button>

            <div>
                <Label className="text-xs">Winner Metric</Label>
                <Select value={config.winnerMetric ?? 'conversion_rate'} onValueChange={(v) => onChange({ ...config, winnerMetric: v as 'open_rate' | 'click_rate' | 'conversion_rate' })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="open_rate">Open Rate</SelectItem>
                        <SelectItem value="click_rate">Click Rate</SelectItem>
                        <SelectItem value="conversion_rate">Conversion Rate</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label className="text-xs">Auto-pick Winner After</Label>
                <Input
                    type="number"
                    value={config.autoPickAfter ?? 200}
                    onChange={(e) => onChange({ ...config, autoPickAfter: Number(e.target.value) })}
                    className="h-8 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">enrollees</p>
            </div>
        </div>
    );
}

/* ── Filter ──────────────────────────────────────────────────────────── */

function FilterConfig({ config, onChange }: { config: FilterNodeConfig; onChange: (c: FilterNodeConfig) => void }) {
    return (
        <ConditionConfig
            config={{ logic: config.logic, rules: config.rules }}
            onChange={(c) => onChange({ logic: c.logic, rules: c.rules })}
        />
    );
}

/* ── GoTo ─────────────────────────────────────────────────────────────── */

function GoToConfig({ config, allNodes, currentId, onChange }: { config: GoToNodeConfig; allNodes: FlowNodeDef[]; currentId: string; onChange: (c: GoToNodeConfig) => void }) {
    const targets = allNodes.filter((n) => n.id !== currentId);

    return (
        <div className="space-y-3">
            <div>
                <Label className="text-xs">Target Node</Label>
                <Select value={config.targetNodeId} onValueChange={(v) => onChange({ ...config, targetNodeId: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select target" /></SelectTrigger>
                    <SelectContent>
                        {targets.map((n) => (
                            <SelectItem key={n.id} value={n.id}>{n.data.label} ({n.id})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label className="text-xs">Max Loops</Label>
                <Input
                    type="number"
                    value={config.maxLoops ?? 3}
                    onChange={(e) => onChange({ ...config, maxLoops: Number(e.target.value) })}
                    className="h-8 text-sm"
                    min={1}
                    max={50}
                />
            </div>
        </div>
    );
}

/* ── Exit ─────────────────────────────────────────────────────────────── */

function ExitConfig({ config, onChange }: { config: ExitNodeConfig; onChange: (c: ExitNodeConfig) => void }) {
    return (
        <div>
            <Label className="text-xs">Exit Reason</Label>
            <Input
                value={config.reason ?? ''}
                onChange={(e) => onChange({ ...config, reason: e.target.value })}
                placeholder="Flow completed"
                className="h-8 text-sm"
            />
        </div>
    );
}
