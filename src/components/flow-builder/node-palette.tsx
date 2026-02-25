/* ==========================================================================
 * Flow Builder — Node Palette
 *
 * Draggable sidebar listing all available node types. Users drag nodes
 * from here onto the canvas to add them to the flow.
 * ========================================================================== */

'use client';

import React from 'react';
import type { FlowNodeType } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Zap, Mail, Clock, GitBranch, Split, Filter,
    CornerDownRight, XCircle, Webhook, Tag, UserCog,
    Variable, Bell, Server, ListTodo,
} from 'lucide-react';

/* ── Palette Item Definition ─────────────────────────────────────────── */

export interface PaletteItem {
    nodeType: FlowNodeType;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    category: 'triggers' | 'actions' | 'logic' | 'timing' | 'control';
    /** Default sub-kind (for action nodes) */
    defaultKind?: string;
}

const paletteItems: PaletteItem[] = [
    /* Triggers */
    { nodeType: 'trigger', label: 'Lifecycle Change', description: 'User enters a lifecycle state', icon: <Zap className="h-4 w-4" />, color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400', category: 'triggers', defaultKind: 'lifecycle_change' },
    { nodeType: 'trigger', label: 'Event Received', description: 'Specific event is tracked', icon: <Zap className="h-4 w-4" />, color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400', category: 'triggers', defaultKind: 'event_received' },
    { nodeType: 'trigger', label: 'Scheduled', description: 'Run on a cron schedule', icon: <Clock className="h-4 w-4" />, color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400', category: 'triggers', defaultKind: 'schedule' },
    { nodeType: 'trigger', label: 'Manual', description: 'Triggered manually or via API', icon: <Zap className="h-4 w-4" />, color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400', category: 'triggers', defaultKind: 'manual' },

    /* Actions */
    { nodeType: 'action', label: 'Send Email', description: 'Send an email message', icon: <Mail className="h-4 w-4" />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400', category: 'actions', defaultKind: 'send_email' },
    { nodeType: 'action', label: 'Send Webhook', description: 'Call an external URL', icon: <Webhook className="h-4 w-4" />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400', category: 'actions', defaultKind: 'send_webhook' },
    { nodeType: 'action', label: 'Update User', description: 'Set user properties', icon: <UserCog className="h-4 w-4" />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400', category: 'actions', defaultKind: 'update_user' },
    { nodeType: 'action', label: 'Add Tag', description: 'Tag the user', icon: <Tag className="h-4 w-4" />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400', category: 'actions', defaultKind: 'add_tag' },
    { nodeType: 'action', label: 'Remove Tag', description: 'Remove a user tag', icon: <Tag className="h-4 w-4" />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400', category: 'actions', defaultKind: 'remove_tag' },
    { nodeType: 'action', label: 'Set Variable', description: 'Set a flow variable', icon: <Variable className="h-4 w-4" />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400', category: 'actions', defaultKind: 'set_variable' },
    { nodeType: 'action', label: 'API Call', description: 'Call any REST API', icon: <Server className="h-4 w-4" />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400', category: 'actions', defaultKind: 'api_call' },
    { nodeType: 'action', label: 'Create Task', description: 'Create a team task', icon: <ListTodo className="h-4 w-4" />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400', category: 'actions', defaultKind: 'create_task' },
    { nodeType: 'action', label: 'Notification', description: 'In-app / push / SMS', icon: <Bell className="h-4 w-4" />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400', category: 'actions', defaultKind: 'send_notification' },

    /* Logic */
    { nodeType: 'condition', label: 'If / Else', description: 'Branch based on rules', icon: <GitBranch className="h-4 w-4" />, color: 'text-purple-600 bg-purple-100 dark:bg-purple-950/40 dark:text-purple-400', category: 'logic' },
    { nodeType: 'split', label: 'A/B Split', description: 'Split traffic by percentage', icon: <Split className="h-4 w-4" />, color: 'text-teal-600 bg-teal-100 dark:bg-teal-950/40 dark:text-teal-400', category: 'logic' },
    { nodeType: 'filter', label: 'Filter', description: 'Continue only if rules match', icon: <Filter className="h-4 w-4" />, color: 'text-orange-600 bg-orange-100 dark:bg-orange-950/40 dark:text-orange-400', category: 'logic' },

    /* Timing */
    { nodeType: 'delay', label: 'Wait Duration', description: 'Wait a fixed amount of time', icon: <Clock className="h-4 w-4" />, color: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400', category: 'timing', defaultKind: 'fixed_duration' },
    { nodeType: 'delay', label: 'Wait for Event', description: 'Wait until an event fires', icon: <Clock className="h-4 w-4" />, color: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400', category: 'timing', defaultKind: 'until_event' },
    { nodeType: 'delay', label: 'Wait Until Time', description: 'Wait until a specific time', icon: <Clock className="h-4 w-4" />, color: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400', category: 'timing', defaultKind: 'until_time_of_day' },
    { nodeType: 'delay', label: 'Smart Send Time', description: 'AI-optimized delivery window', icon: <Clock className="h-4 w-4" />, color: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400', category: 'timing', defaultKind: 'smart_send_time' },

    /* Control */
    { nodeType: 'goto', label: 'Go To', description: 'Jump to another node', icon: <CornerDownRight className="h-4 w-4" />, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400', category: 'control' },
    { nodeType: 'exit', label: 'Exit', description: 'End the flow for this user', icon: <XCircle className="h-4 w-4" />, color: 'text-red-600 bg-red-100 dark:bg-red-950/40 dark:text-red-400', category: 'control' },
];

const categories = [
    { key: 'triggers' as const, label: 'Triggers' },
    { key: 'actions' as const, label: 'Actions' },
    { key: 'logic' as const, label: 'Logic' },
    { key: 'timing' as const, label: 'Timing' },
    { key: 'control' as const, label: 'Control' },
];

/* ── Draggable Palette Item ──────────────────────────────────────────── */

function DraggablePaletteItem({ item }: { item: PaletteItem }) {
    const onDragStart = (event: React.DragEvent) => {
        const payload = JSON.stringify({
            nodeType: item.nodeType,
            label: item.label,
            defaultKind: item.defaultKind,
        });
        event.dataTransfer.setData('application/reactflow', payload);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-colors group"
            draggable
            onDragStart={onDragStart}
        >
            <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0', item.color)}>
                {item.icon}
            </div>
            <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{item.label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{item.description}</p>
            </div>
        </div>
    );
}

/* ── Node Palette Component ──────────────────────────────────────────── */

export function NodePalette() {
    return (
        <div className="w-64 border-r bg-card flex flex-col h-full">
            <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-semibold">Node Palette</h3>
                <p className="text-[11px] text-muted-foreground">Drag nodes onto the canvas</p>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {categories.map((cat, ci) => {
                        const items = paletteItems.filter((p) => p.category === cat.key);
                        return (
                            <div key={cat.key}>
                                {ci > 0 && <Separator className="my-2" />}
                                <p className="px-3 py-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                                    {cat.label}
                                </p>
                                {items.map((item, i) => (
                                    <DraggablePaletteItem key={`${item.nodeType}-${item.label}-${i}`} item={item} />
                                ))}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
