/* ==========================================================================
 * Flow Builder — Main Canvas Component
 *
 * Wraps @xyflow/react with the custom node types, drag-and-drop from the
 * palette, the property panel, and flow-level toolbar (save, activate,
 * etc.).  All flow state is managed locally via React state and
 * persisted to the store on save.
 * ========================================================================== */

'use client';

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Panel,
    useNodesState,
    useEdgesState,
    addEdge,
    type Connection,
    type Edge,
    type Node,
    type ReactFlowInstance,
    BackgroundVariant,
    MarkerType,
    ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type {
    FlowDefinition,
    FlowNodeData,
    FlowNodeType,
    FlowNodeDef,
    FlowEdgeDef,
    FlowBuilderStatus,
    TriggerKind,
    ActionKind,
    DelayKind,
} from '@/lib/definitions';
import { flowNodeTypes } from './flow-nodes';
import { NodePalette } from './node-palette';
import { PropertyPanel } from './property-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Save, Play, Pause, RotateCcw, ArrowLeft, Check,
    Settings2, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIntegrationStatus } from '@/hooks/use-integration-status';
import { IntegrationWarningsProvider } from './integration-context';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader,
    DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

/* ── Props ───────────────────────────────────────────────────────────── */

interface FlowBuilderCanvasProps {
    flow: FlowDefinition;
    onSave: (flow: FlowDefinition) => Promise<void>;
    onBack: () => void;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

let nodeCounter = 0;
function newNodeId(): string {
    nodeCounter += 1;
    return `node_${Date.now().toString(36)}_${nodeCounter}`;
}

function newEdgeId(): string {
    return `edge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Build default FlowNodeData for a given node type */
function defaultNodeData(
    nodeType: FlowNodeType,
    label: string,
    defaultKind?: string,
): FlowNodeData {
    const base: FlowNodeData = { label, nodeType };

    switch (nodeType) {
        case 'trigger':
            base.triggerConfig = {
                kind: (defaultKind as TriggerKind) ?? 'lifecycle_change',
                allowReEntry: false,
            };
            break;
        case 'action':
            base.actionConfig = { kind: (defaultKind as ActionKind) ?? 'send_email' };
            break;
        case 'condition':
            base.conditionConfig = { logic: 'AND', rules: [] };
            break;
        case 'delay':
            base.delayConfig = { kind: (defaultKind as DelayKind) ?? 'fixed_duration', durationMinutes: 60 };
            break;
        case 'split':
            base.splitConfig = {
                variants: [
                    { id: 'a', label: 'A', percentage: 50 },
                    { id: 'b', label: 'B', percentage: 50 },
                ],
                winnerMetric: 'conversion_rate',
                autoPickAfter: 200,
            };
            break;
        case 'filter':
            base.filterConfig = { logic: 'AND', rules: [] };
            break;
        case 'goto':
            base.goToConfig = { targetNodeId: '', maxLoops: 3 };
            break;
        case 'exit':
            base.exitConfig = { reason: '' };
            break;
    }

    return base;
}

/** Convert FlowDefinition edges to React Flow edges */
function toReactFlowEdges(edges: FlowEdgeDef[]): Edge[] {
    return edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: e.label,
        animated: e.animated ?? false,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        style: { strokeWidth: 2 },
    }));
}

/** Convert React Flow edges back to FlowEdgeDef */
function toFlowEdges(edges: Edge[]): FlowEdgeDef[] {
    return edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
        label: typeof e.label === 'string' ? e.label : undefined,
        animated: e.animated,
    }));
}

/* ── Status Badge ────────────────────────────────────────────────────── */

const statusStyles: Record<FlowBuilderStatus, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    archived: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

/* ── Validation ──────────────────────────────────────────────────────── */

interface ValidationIssue {
    severity: 'error' | 'warning' | 'integration';
    message: string;
    nodeId?: string;
}

function validateFlow(nodes: Node[], edges: Edge[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Must have exactly 1 trigger
    const triggers = nodes.filter((n) => n.type === 'trigger');
    if (triggers.length === 0) issues.push({ severity: 'error', message: 'Flow must have a trigger node' });
    if (triggers.length > 1) issues.push({ severity: 'error', message: 'Flow can only have one trigger node' });

    // Must have at least one exit
    const exits = nodes.filter((n) => n.type === 'exit');
    if (exits.length === 0) issues.push({ severity: 'warning', message: 'Flow has no exit node — users will complete when no outgoing edges remain' });

    // Check for disconnected nodes (no incoming or outgoing edges, except trigger/exit)
    for (const node of nodes) {
        const hasIn = edges.some((e) => e.target === node.id);
        const hasOut = edges.some((e) => e.source === node.id);
        const data = node.data as unknown as FlowNodeData;
        if (node.type !== 'trigger' && !hasIn) {
            issues.push({ severity: 'error', nodeId: node.id, message: `"${data.label}" has no incoming connections` });
        }
        if (node.type !== 'exit' && !hasOut) {
            issues.push({ severity: 'warning', nodeId: node.id, message: `"${data.label}" has no outgoing connections` });
        }
    }

    return issues;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Canvas Component
 * ═══════════════════════════════════════════════════════════════════════ */

export function FlowBuilderCanvas({ flow, onSave, onBack }: FlowBuilderCanvasProps) {
    /* ── Integration Status ───────────────────────────────── */
    const integration = useIntegrationStatus();
    const [integrationBannerDismissed, setIntegrationBannerDismissed] = useState(false);

    /* ── State ───────────────────────────────────────────────── */
    const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes as unknown as Node[]);
    const [edges, setEdges, onEdgesChange] = useEdgesState(toReactFlowEdges(flow.edges));
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [flowName, setFlowName] = useState(flow.name);
    const [flowDescription, setFlowDescription] = useState(flow.description);
    const [flowStatus, setFlowStatus] = useState<FlowBuilderStatus>(flow.status);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [flowSettings, setFlowSettings] = useState(flow.settings);
    const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

    const rfInstance = useRef<ReactFlowInstance | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Mark dirty whenever nodes/edges change
    useEffect(() => {
        setDirty(true);
        const issues = validateFlow(nodes, edges);
        setValidationIssues(issues);
    }, [nodes, edges]);

    // Compute integration warnings separately (no setNodes — avoids render loops)
    const integrationWarningsMap = useMemo<Map<string, string>>(() => {
        const map = new Map<string, string>();
        if (integration.loading) return map;

        for (const node of nodes) {
            const data = node.data as unknown as FlowNodeData;
            let nodeKey: string | null = null;

            if (data.nodeType === 'trigger' && data.triggerConfig?.kind) {
                nodeKey = `trigger:${data.triggerConfig.kind}`;
            } else if (data.nodeType === 'action' && data.actionConfig?.kind) {
                nodeKey = `action:${data.actionConfig.kind}`;
            } else if (data.nodeType === 'condition' && data.conditionConfig?.rules?.length) {
                const firstField = data.conditionConfig.rules[0]?.field ?? '';
                if (firstField.startsWith('account.')) {
                    nodeKey = 'condition:account_property';
                } else if (firstField.startsWith('event.')) {
                    nodeKey = 'condition:event_count';
                } else {
                    nodeKey = 'condition:user_property';
                }
            }

            if (nodeKey) {
                const missing = integration.getMissingRequirements(nodeKey);
                if (missing) {
                    map.set(node.id, `Requires ${missing.category} integration`);
                }
            }
        }
        return map;
    }, [nodes, integration]);

    // Merge integration issues into validationIssues for toolbar badges
    const allIssues = useMemo(() => {
        const intIssues: ValidationIssue[] = [];
        for (const node of nodes) {
            const warning = integrationWarningsMap.get(node.id);
            if (warning) {
                const data = node.data as unknown as FlowNodeData;
                const missing = (() => {
                    let nodeKey: string | null = null;
                    if (data.nodeType === 'trigger' && data.triggerConfig?.kind) nodeKey = `trigger:${data.triggerConfig.kind}`;
                    else if (data.nodeType === 'action' && data.actionConfig?.kind) nodeKey = `action:${data.actionConfig.kind}`;
                    if (nodeKey) return integration.getMissingRequirements(nodeKey);
                    return null;
                })();
                intIssues.push({
                    severity: 'integration',
                    nodeId: node.id,
                    message: `"${data.label}": ${missing?.description ?? warning}`,
                });
            }
        }
        return [...validationIssues, ...intIssues];
    }, [validationIssues, integrationWarningsMap, nodes, integration]);

    /* ── Selected Node ──────────────────────────────────────── */
    const selectedNode = useMemo(
        () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) as FlowNodeDef | undefined : null),
        [nodes, selectedNodeId],
    );

    /* ── Callbacks ──────────────────────────────────────────── */

    const onConnect = useCallback((conn: Connection) => {
        setEdges((eds) => addEdge({
            ...conn,
            id: newEdgeId(),
            type: 'smoothstep',
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
            style: { strokeWidth: 2 },
        }, eds));
    }, [setEdges]);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
    }, []);

    /** Update a specific node's data */
    const updateNodeData = useCallback((nodeId: string, partial: Partial<FlowNodeData>) => {
        setNodes((nds) =>
            nds.map((n) =>
                n.id === nodeId ? { ...n, data: { ...n.data, ...partial } } : n,
            ),
        );
    }, [setNodes]);

    /** Delete a node and its connected edges */
    const deleteNode = useCallback((nodeId: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
        setSelectedNodeId(null);
    }, [setNodes, setEdges]);

    /* ── Drag & Drop from Palette ──────────────────────────── */

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const raw = event.dataTransfer.getData('application/reactflow');
            if (!raw || !rfInstance.current) return;

            const { nodeType, label, defaultKind } = JSON.parse(raw) as {
                nodeType: FlowNodeType;
                label: string;
                defaultKind?: string;
            };

            // Prevent multiple triggers
            if (nodeType === 'trigger' && nodes.some((n) => n.type === 'trigger')) {
                return; // silently ignore
            }

            const position = rfInstance.current.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode = {
                id: newNodeId(),
                type: nodeType,
                position,
                data: defaultNodeData(nodeType, label, defaultKind) as unknown as Record<string, unknown>,
            } satisfies Node;

            setNodes((nds) => [...nds, newNode]);
        },
        [nodes, setNodes],
    );

    /* ── Save ──────────────────────────────────────────────── */

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            const updated: FlowDefinition = {
                ...flow,
                name: flowName,
                description: flowDescription,
                status: flowStatus,
                version: flow.version + 1,
                nodes: nodes as unknown as FlowNodeDef[],
                edges: toFlowEdges(edges),
                settings: flowSettings,
                updatedAt: new Date().toISOString(),
                publishedAt: flowStatus === 'active' ? new Date().toISOString() : flow.publishedAt,
            };
            await onSave(updated);
            setDirty(false);
        } finally {
            setSaving(false);
        }
    }, [flow, flowName, flowDescription, flowStatus, flowSettings, nodes, edges, onSave]);

    const toggleStatus = useCallback(() => {
        setFlowStatus((s) => (s === 'active' ? 'paused' : 'active'));
        setDirty(true);
    }, []);

    /* ── Minimap Colors ────────────────────────────────────── */
    const minimapNodeColor = useCallback((node: Node) => {
        switch (node.type) {
            case 'trigger': return '#f59e0b';
            case 'action': return '#3b82f6';
            case 'condition': return '#8b5cf6';
            case 'delay': return '#6b7280';
            case 'split': return '#14b8a6';
            case 'filter': return '#f97316';
            case 'goto': return '#6366f1';
            case 'exit': return '#ef4444';
            default: return '#64748b';
        }
    }, []);

    const errors = allIssues.filter((v) => v.severity === 'error');
    const warnings = allIssues.filter((v) => v.severity === 'warning');
    const integrationIssues = allIssues.filter((v) => v.severity === 'integration');
    const hasIntegrationIssues = integrationIssues.length > 0;
    const showIntegrationBanner = !integration.loading && !integration.sdkConnected && !integrationBannerDismissed;

    return (
        <div className="flex h-full w-full">
            {/* Left: Node Palette */}
            <NodePalette />

            {/* Center: Canvas */}
            <div className="flex-1 flex flex-col relative">
                {/* Integration Warning Banner */}
                {showIntegrationBanner && (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800 text-sm">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <div className="flex-1">
                            <span className="font-medium text-amber-800 dark:text-amber-300">SDK not connected.</span>
                            <span className="text-amber-700 dark:text-amber-400 ml-1">
                                Install the SDK and send your first event from <a href="/sdk" className="underline font-medium">SDK Setup</a> to enable real-time user data, events, and lifecycle tracking in your flows.
                            </span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setIntegrationBannerDismissed(true)} className="shrink-0 text-amber-700">
                            Dismiss
                        </Button>
                    </div>
                )}
                {/* Integration Issues Detail Banner */}
                {hasIntegrationIssues && integrationBannerDismissed && (
                    <div className="px-4 py-2 bg-orange-50 dark:bg-orange-950/20 border-b border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-2 text-xs text-orange-800 dark:text-orange-300">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-medium">{integrationIssues.length} node{integrationIssues.length > 1 ? 's' : ''} require{integrationIssues.length === 1 ? 's' : ''} integration setup:</span>
                            <span className="text-orange-600 dark:text-orange-400 truncate">
                                {integrationIssues.slice(0, 3).map(i => i.message.split(':')[0]).join(', ')}{integrationIssues.length > 3 ? ` +${integrationIssues.length - 3} more` : ''}
                            </span>
                        </div>
                    </div>
                )}
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-b bg-card z-10">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back
                        </Button>
                        <Input
                            value={flowName}
                            onChange={(e) => { setFlowName(e.target.value); setDirty(true); }}
                            className="h-8 w-64 text-sm font-semibold border-transparent hover:border-input focus:border-input"
                        />
                        <Badge className={cn('border-transparent text-[10px]', statusStyles[flowStatus])}>
                            {flowStatus}
                        </Badge>
                        {dirty && (
                            <Badge variant="outline" className="text-[10px] text-amber-600">
                                Unsaved
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Validation Indicator */}
                        {errors.length > 0 && (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {errors.length} error{errors.length > 1 ? 's' : ''}
                            </Badge>
                        )}
                        {errors.length === 0 && warnings.length > 0 && (
                            <Badge variant="outline" className="text-[10px] text-yellow-600 gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {warnings.length}
                            </Badge>
                        )}
                        {errors.length === 0 && warnings.length === 0 && !hasIntegrationIssues && nodes.length > 0 && (
                            <Badge variant="outline" className="text-[10px] text-green-600 gap-1">
                                <Check className="h-3 w-3" />
                                Valid
                            </Badge>
                        )}
                        {hasIntegrationIssues && (
                            <Badge variant="outline" className="text-[10px] text-orange-600 gap-1 cursor-help" title={integrationIssues.map(i => i.message).join('\n')}>
                                <AlertTriangle className="h-3 w-3" />
                                {integrationIssues.length} integration{integrationIssues.length > 1 ? 's' : ''}
                            </Badge>
                        )}

                        <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
                            <Settings2 className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleStatus}
                            disabled={flowStatus !== 'active' && hasIntegrationIssues}
                            title={hasIntegrationIssues && flowStatus !== 'active' ? 'Connect required integrations before activating' : undefined}
                        >
                            {flowStatus === 'active' ? <Pause className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                            {flowStatus === 'active' ? 'Pause' : 'Activate'}
                        </Button>

                        <Button size="sm" onClick={handleSave} disabled={saving}>
                            {saving ? <RotateCcw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                            Save
                        </Button>
                    </div>
                </div>

                {/* React Flow Canvas */}
                <div ref={canvasRef} className="flex-1">
                    <IntegrationWarningsProvider value={integrationWarningsMap}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        onInit={(inst) => { rfInstance.current = inst; }}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        nodeTypes={flowNodeTypes}
                        connectionMode={ConnectionMode.Loose}
                        defaultEdgeOptions={{
                            type: 'smoothstep',
                            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
                            style: { strokeWidth: 2 },
                        }}
                        proOptions={{ hideAttribution: true }}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                        snapToGrid
                        snapGrid={[20, 20]}
                        deleteKeyCode="Delete"
                        className="bg-dots-pattern"
                    >
                        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                        <Controls showInteractive={false} />
                        <MiniMap
                            nodeColor={minimapNodeColor}
                            maskColor="rgba(0,0,0,0.08)"
                            className="!bg-card !border"
                            pannable
                            zoomable
                        />

                        {/* Stats Panel */}
                        <Panel position="bottom-left" className="!m-3">
                            <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-card border text-xs text-muted-foreground shadow-sm">
                                <span>{nodes.length} nodes</span>
                                <span>·</span>
                                <span>{edges.length} edges</span>
                                {flow.metrics.totalEnrolled > 0 && (
                                    <>
                                        <span>·</span>
                                        <span>{flow.metrics.totalEnrolled.toLocaleString()} enrolled</span>
                                        <span>·</span>
                                        <span>{flow.metrics.currentlyActive.toLocaleString()} active</span>
                                    </>
                                )}
                            </div>
                        </Panel>
                    </ReactFlow>
                    </IntegrationWarningsProvider>
                </div>
            </div>

            {/* Right: Property Panel */}
            <PropertyPanel
                node={selectedNode ?? null}
                allNodes={nodes as unknown as FlowNodeDef[]}
                onUpdate={updateNodeData}
                onDelete={deleteNode}
                onClose={() => setSelectedNodeId(null)}
            />

            {/* Settings Dialog */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Flow Settings</DialogTitle>
                        <DialogDescription>Configure flow-level behavior and limits</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label className="text-xs">Description</Label>
                            <Textarea
                                value={flowDescription}
                                onChange={(e) => { setFlowDescription(e.target.value); setDirty(true); }}
                                className="text-sm"
                                rows={2}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Enrollment Cap (0 = unlimited)</Label>
                                <Input
                                    type="number"
                                    value={flowSettings.enrollmentCap}
                                    onChange={(e) => { setFlowSettings((s) => ({ ...s, enrollmentCap: Number(e.target.value) })); setDirty(true); }}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Max Concurrent</Label>
                                <Input
                                    type="number"
                                    value={flowSettings.maxConcurrentEnrollments}
                                    onChange={(e) => { setFlowSettings((s) => ({ ...s, maxConcurrentEnrollments: Number(e.target.value) })); setDirty(true); }}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Auto-Exit After (days)</Label>
                                <Input
                                    type="number"
                                    value={flowSettings.autoExitDays}
                                    onChange={(e) => { setFlowSettings((s) => ({ ...s, autoExitDays: Number(e.target.value) })); setDirty(true); }}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Priority (1–10)</Label>
                                <Input
                                    type="number"
                                    value={flowSettings.priority}
                                    onChange={(e) => { setFlowSettings((s) => ({ ...s, priority: Number(e.target.value) })); setDirty(true); }}
                                    className="h-8 text-sm"
                                    min={1}
                                    max={10}
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs">Goal Event</Label>
                            <Input
                                value={flowSettings.goalEvent ?? ''}
                                onChange={(e) => { setFlowSettings((s) => ({ ...s, goalEvent: e.target.value || undefined })); setDirty(true); }}
                                placeholder="e.g. subscription_started"
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-xs">Respect Quiet Hours</Label>
                            <Switch
                                checked={flowSettings.respectQuietHours}
                                onCheckedChange={(v) => { setFlowSettings((s) => ({ ...s, respectQuietHours: v })); setDirty(true); }}
                            />
                        </div>
                        {flowSettings.respectQuietHours && (
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <Label className="text-xs">Start</Label>
                                    <Input
                                        value={flowSettings.quietHoursStart ?? '22:00'}
                                        onChange={(e) => { setFlowSettings((s) => ({ ...s, quietHoursStart: e.target.value })); setDirty(true); }}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">End</Label>
                                    <Input
                                        value={flowSettings.quietHoursEnd ?? '08:00'}
                                        onChange={(e) => { setFlowSettings((s) => ({ ...s, quietHoursEnd: e.target.value })); setDirty(true); }}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Timezone</Label>
                                    <Input
                                        value={flowSettings.quietHoursTimezone ?? 'UTC'}
                                        onChange={(e) => { setFlowSettings((s) => ({ ...s, quietHoursTimezone: e.target.value })); setDirty(true); }}
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setSettingsOpen(false)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
