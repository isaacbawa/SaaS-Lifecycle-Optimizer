/* ==========================================================================
 * Flow Builder Page — /flows/builder/[id]
 *
 * Full-screen visual flow builder. Loads the FlowDefinition from the
 * store, renders the canvas, and handles persistence.
 * ========================================================================== */

'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { FlowBuilderCanvas } from '@/components/flow-builder';
import type { FlowDefinition } from '@/lib/definitions';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function FlowBuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [flow, setFlow] = useState<FlowDefinition | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /* ── Load Flow ──────────────────────────────────────────── */
    useEffect(() => {
        async function loadFlow() {
            try {
                const res = await fetch(`/api/v1/flow-definitions/${id}`);
                if (!res.ok) {
                    if (res.status === 404) {
                        setError('Flow not found');
                    } else {
                        setError(`Failed to load flow: ${res.status}`);
                    }
                    return;
                }
                const json = await res.json();
                setFlow(json.data);
            } catch {
                setError('Failed to load flow');
            } finally {
                setLoading(false);
            }
        }
        loadFlow();
    }, [id]);

    /* ── Save Flow ──────────────────────────────────────────── */
    const handleSave = useCallback(async (updated: FlowDefinition) => {
        const res = await fetch(`/api/v1/flow-definitions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
        });
        if (!res.ok) throw new Error('Save failed');
        const json = await res.json();
        setFlow(json.data);
    }, [id]);

    /* ── Back Navigation ────────────────────────────────────── */
    const handleBack = useCallback(() => {
        router.push('/flows');
    }, [router]);

    /* ── Loading/Error States ───────────────────────────────── */
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading flow builder...</p>
                </div>
            </div>
        );
    }

    if (error || !flow) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-lg font-semibold text-destructive">{error ?? 'Flow not found'}</p>
                    <button
                        onClick={handleBack}
                        className="text-sm text-primary hover:underline"
                    >
                        ← Back to flows
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-hidden">
            <FlowBuilderCanvas
                flow={flow}
                onSave={handleSave}
                onBack={handleBack}
            />
        </div>
    );
}
