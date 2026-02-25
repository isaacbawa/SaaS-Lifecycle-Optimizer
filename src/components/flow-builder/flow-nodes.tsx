/* ==========================================================================
 * Flow Builder — Custom Node Components
 *
 * Each node type gets its own styled React Flow node with handles for
 * connecting edges. Nodes display their label, type icon, and a brief
 * summary of their configuration.
 * ========================================================================== */

'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { useIntegrationWarning } from './integration-context';
import {
    Zap, Mail, Clock, GitBranch, Split, Filter, CornerDownRight,
    XCircle, Bell, Webhook, Tag, UserCog, Variable, Server,
} from 'lucide-react';

/* ── Shared Styles ───────────────────────────────────────────────────── */

const nodeBase = 'rounded-xl border-2 bg-card text-card-foreground shadow-md transition-all hover:shadow-lg min-w-[200px] max-w-[260px]';

const typeConfig: Record<string, { icon: React.ReactNode; color: string; borderColor: string; bgColor: string }> = {
    trigger: { icon: <Zap className="h-4 w-4" />, color: 'text-amber-600 dark:text-amber-400', borderColor: 'border-amber-400 dark:border-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/30' },
    action: { icon: <Mail className="h-4 w-4" />, color: 'text-blue-600 dark:text-blue-400', borderColor: 'border-blue-400 dark:border-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/30' },
    condition: { icon: <GitBranch className="h-4 w-4" />, color: 'text-purple-600 dark:text-purple-400', borderColor: 'border-purple-400 dark:border-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-950/30' },
    delay: { icon: <Clock className="h-4 w-4" />, color: 'text-gray-600 dark:text-gray-400', borderColor: 'border-gray-400 dark:border-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-900/30' },
    split: { icon: <Split className="h-4 w-4" />, color: 'text-teal-600 dark:text-teal-400', borderColor: 'border-teal-400 dark:border-teal-600', bgColor: 'bg-teal-50 dark:bg-teal-950/30' },
    filter: { icon: <Filter className="h-4 w-4" />, color: 'text-orange-600 dark:text-orange-400', borderColor: 'border-orange-400 dark:border-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950/30' },
    goto: { icon: <CornerDownRight className="h-4 w-4" />, color: 'text-indigo-600 dark:text-indigo-400', borderColor: 'border-indigo-400 dark:border-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-950/30' },
    exit: { icon: <XCircle className="h-4 w-4" />, color: 'text-red-600 dark:text-red-400', borderColor: 'border-red-400 dark:border-red-600', bgColor: 'bg-red-50 dark:bg-red-950/30' },
};

/* Action sub-icons */
function getActionIcon(kind?: string) {
    switch (kind) {
        case 'send_email': return <Mail className="h-3.5 w-3.5" />;
        case 'send_webhook': return <Webhook className="h-3.5 w-3.5" />;
        case 'add_tag': case 'remove_tag': return <Tag className="h-3.5 w-3.5" />;
        case 'update_user': return <UserCog className="h-3.5 w-3.5" />;
        case 'set_variable': return <Variable className="h-3.5 w-3.5" />;
        case 'send_notification': return <Bell className="h-3.5 w-3.5" />;
        case 'api_call': return <Server className="h-3.5 w-3.5" />;
        default: return <Mail className="h-3.5 w-3.5" />;
    }
}

/* ── Summary Text Generator ──────────────────────────────────────────── */

function getNodeSummary(data: FlowNodeData): string {
    switch (data.nodeType) {
        case 'trigger': {
            const cfg = data.triggerConfig;
            if (!cfg) return 'Configure trigger';
            switch (cfg.kind) {
                case 'lifecycle_change': return `State → ${cfg.lifecycleTo?.join(', ') ?? 'any'}`;
                case 'event_received': return `Event: ${cfg.eventName ?? 'any'}`;
                case 'schedule': return `Cron: ${cfg.cronExpression ?? '—'}`;
                case 'manual': return 'Manual trigger';
                case 'segment_entry': return `Segment: ${cfg.segmentId ?? '—'}`;
                case 'webhook_received': return 'Incoming webhook';
                case 'date_property': return `${cfg.dateProperty ?? 'date'} ± ${cfg.dateOffsetDays ?? 0}d`;
                default: return 'Configure trigger';
            }
        }
        case 'action': {
            const cfg = data.actionConfig;
            if (!cfg) return 'Configure action';
            switch (cfg.kind) {
                case 'send_email': return cfg.emailSubject ? truncate(cfg.emailSubject, 40) : 'Configure email';
                case 'send_webhook': return cfg.webhookUrl ? truncate(cfg.webhookUrl, 40) : 'Configure webhook';
                case 'add_tag': return `Add: ${cfg.tag ?? '—'}`;
                case 'remove_tag': return `Remove: ${cfg.tag ?? '—'}`;
                case 'update_user': return `Update ${Object.keys(cfg.userProperties ?? {}).length} properties`;
                case 'set_variable': return `${cfg.variableKey ?? '—'} = ${truncate(String(cfg.variableValue ?? ''), 20)}`;
                case 'create_task': return cfg.taskTitle ? truncate(cfg.taskTitle, 40) : 'Configure task';
                case 'api_call': return cfg.apiUrl ? truncate(cfg.apiUrl, 40) : 'Configure API call';
                case 'send_notification': return cfg.notificationTitle ? truncate(cfg.notificationTitle, 40) : 'Configure notification';
                default: return 'Configure action';
            }
        }
        case 'condition': {
            const cfg = data.conditionConfig;
            if (!cfg?.rules?.length) return 'Configure condition';
            const r = cfg.rules[0];
            return `${r.field} ${r.operator} ${r.value ?? ''}`;
        }
        case 'delay': {
            const cfg = data.delayConfig;
            if (!cfg) return 'Configure delay';
            switch (cfg.kind) {
                case 'fixed_duration': return formatDuration(cfg.durationMinutes ?? 0);
                case 'until_event': return `Wait for: ${cfg.waitForEvent ?? '—'}`;
                case 'until_date': return `Until: ${cfg.untilDate ?? '—'}`;
                case 'until_time_of_day': return `At: ${cfg.untilTime ?? '—'}`;
                case 'smart_send_time': return `Smart: ${cfg.sendWindowStart ?? '09:00'}–${cfg.sendWindowEnd ?? '17:00'}`;
                default: return 'Configure delay';
            }
        }
        case 'split': {
            const cfg = data.splitConfig;
            if (!cfg?.variants?.length) return 'Configure A/B test';
            return cfg.variants.map((v) => `${v.label}: ${v.percentage}%`).join(' / ');
        }
        case 'filter': {
            const cfg = data.filterConfig;
            if (!cfg?.rules?.length) return 'Configure filter';
            return `${cfg.rules.length} rule(s), ${cfg.logic}`;
        }
        case 'goto': return data.goToConfig?.targetNodeId ? `→ ${data.goToConfig.targetNodeId}` : 'Set target';
        case 'exit': return data.exitConfig?.reason ?? 'Flow ends here';
        default: return '';
    }
}

function truncate(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${(minutes / 60).toFixed(0)}h`;
    return `${(minutes / 1440).toFixed(0)}d`;
}

/* ── Metric Badge ────────────────────────────────────────────────────── */

function MetricBadge({ entered, completed }: { entered: number; completed: number }) {
    if (!entered) return null;
    const rate = entered > 0 ? Math.round((completed / entered) * 100) : 0;
    return (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
            <span>{entered.toLocaleString()} entered</span>
            <span>·</span>
            <span className={rate >= 95 ? 'text-green-600' : rate >= 80 ? 'text-yellow-600' : 'text-red-600'}>
                {rate}% complete
            </span>
        </div>
    );
}

/* ── Handle Styles ───────────────────────────────────────────────────── */

const handleClass = '!w-3 !h-3 !bg-background !border-2 !border-muted-foreground/50 hover:!border-primary !rounded-full transition-colors';

/* ── Base Node Renderer ──────────────────────────────────────────────── */

interface FlowNodeProps {
    id: string;
    data: FlowNodeData;
    selected?: boolean;
}

function BaseFlowNode({ id, data, selected }: FlowNodeProps) {
    const config = typeConfig[data.nodeType] ?? typeConfig.action;
    const summary = getNodeSummary(data);
    const integrationWarning = useIntegrationWarning(id);

    return (
        <div className={cn(
            nodeBase, config.borderColor, config.bgColor,
            selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
            integrationWarning && 'border-orange-400 dark:border-orange-600',
        )}>
            {/* Top handle — not for triggers */}
            {data.nodeType !== 'trigger' && (
                <Handle type="target" position={Position.Top} className={handleClass} />
            )}

            {/* Node body */}
            <div className="px-3 py-2.5">
                {/* Header Row */}
                <div className="flex items-center gap-2">
                    <div className={cn('flex items-center justify-center w-7 h-7 rounded-lg', config.bgColor, config.color)}>
                        {data.nodeType === 'action' ? getActionIcon(data.actionConfig?.kind) : config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight truncate">{data.label}</p>
                        <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                            {data.nodeType}{data.nodeType === 'action' && data.actionConfig ? ` · ${data.actionConfig.kind.replace(/_/g, ' ')}` : ''}
                        </p>
                    </div>
                </div>

                {/* Summary */}
                {summary && (
                    <p className="mt-1.5 text-xs text-muted-foreground leading-snug line-clamp-2">
                        {summary}
                    </p>
                )}

                {/* Metrics */}
                {data.metrics && <MetricBadge entered={data.metrics.entered} completed={data.metrics.completed} />}

                {/* Integration Warning */}
                {integrationWarning && (
                    <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 px-2 py-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mt-0.5 shrink-0 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                        <span className="text-[10px] leading-tight text-orange-700 dark:text-orange-300">{integrationWarning}</span>
                    </div>
                )}
            </div>

            {/* Bottom handle(s) */}
            {data.nodeType === 'condition' ? (
                <>
                    <Handle type="source" position={Position.Bottom} id="yes" className={cn(handleClass, '!-left-0 !translate-x-[60px]')} style={{ left: '30%' }} />
                    <Handle type="source" position={Position.Bottom} id="no" className={cn(handleClass, '!-right-0 !-translate-x-[60px]')} style={{ left: '70%' }} />
                    <div className="flex justify-between px-6 pb-1 text-[9px] font-medium text-muted-foreground">
                        <span className="text-green-600">YES</span>
                        <span className="text-red-500">NO</span>
                    </div>
                </>
            ) : data.nodeType === 'split' ? (
                <>
                    {(data.splitConfig?.variants ?? []).map((v, i) => (
                        <Handle
                            key={v.id}
                            type="source"
                            position={Position.Bottom}
                            id={`variant-${v.id}`}
                            className={handleClass}
                            style={{ left: `${((i + 1) / ((data.splitConfig?.variants?.length ?? 1) + 1)) * 100}%` }}
                        />
                    ))}
                    <div className="flex justify-around px-2 pb-1 text-[9px] font-medium text-muted-foreground">
                        {(data.splitConfig?.variants ?? []).map((v) => (
                            <span key={v.id}>{v.label}</span>
                        ))}
                    </div>
                </>
            ) : data.nodeType !== 'exit' ? (
                <Handle type="source" position={Position.Bottom} className={handleClass} />
            ) : null}
        </div>
    );
}

/* ── Memoized Exports (registered as React Flow node types) ──────────── */

export const TriggerNode = memo(({ id, data, selected }: NodeProps) => (
    <BaseFlowNode id={id} data={data as unknown as FlowNodeData} selected={selected} />
));
TriggerNode.displayName = 'TriggerNode';

export const ActionNode = memo(({ id, data, selected }: NodeProps) => (
    <BaseFlowNode id={id} data={data as unknown as FlowNodeData} selected={selected} />
));
ActionNode.displayName = 'ActionNode';

export const ConditionNode = memo(({ id, data, selected }: NodeProps) => (
    <BaseFlowNode id={id} data={data as unknown as FlowNodeData} selected={selected} />
));
ConditionNode.displayName = 'ConditionNode';

export const DelayNode = memo(({ id, data, selected }: NodeProps) => (
    <BaseFlowNode id={id} data={data as unknown as FlowNodeData} selected={selected} />
));
DelayNode.displayName = 'DelayNode';

export const SplitNode = memo(({ id, data, selected }: NodeProps) => (
    <BaseFlowNode id={id} data={data as unknown as FlowNodeData} selected={selected} />
));
SplitNode.displayName = 'SplitNode';

export const FilterNode = memo(({ id, data, selected }: NodeProps) => (
    <BaseFlowNode id={id} data={data as unknown as FlowNodeData} selected={selected} />
));
FilterNode.displayName = 'FilterNode';

export const GoToNode = memo(({ id, data, selected }: NodeProps) => (
    <BaseFlowNode id={id} data={data as unknown as FlowNodeData} selected={selected} />
));
GoToNode.displayName = 'GoToNode';

export const ExitNode = memo(({ id, data, selected }: NodeProps) => (
    <BaseFlowNode id={id} data={data as unknown as FlowNodeData} selected={selected} />
));
ExitNode.displayName = 'ExitNode';

/* ── Node Type Registry ──────────────────────────────────────────────── */

export const flowNodeTypes = {
    trigger: TriggerNode,
    action: ActionNode,
    condition: ConditionNode,
    delay: DelayNode,
    split: SplitNode,
    filter: FilterNode,
    goto: GoToNode,
    exit: ExitNode,
};
