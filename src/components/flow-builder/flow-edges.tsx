/* ==========================================================================
 * Flow Builder - Professional Custom Edge
 *
 * Replaces the default smoothstep edges with smooth bezier curves that
 * follow the user's drag direction naturally. Features a wide invisible
 * hit-area for easy selection and a clear selected-state indicator.
 * ========================================================================== */

'use client';

import { memo } from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    type EdgeProps,
} from '@xyflow/react';

export const FlowEdge = memo(({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    label,
    selected,
    markerEnd,
}: EdgeProps) => {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature: 0.35,
    });

    return (
        <>
            {/* Wide transparent hit-area for easier click / selection */}
            <path d={edgePath} fill="none" stroke="transparent" strokeWidth={18} />

            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    stroke: selected ? '#6366f1' : '#94a3b8',
                    strokeWidth: selected ? 2.25 : 1.75,
                    transition: 'stroke 0.12s ease, stroke-width 0.12s ease',
                }}
            />

            {label && (
                <EdgeLabelRenderer>
                    <div
                        className="nodrag nopan absolute px-2 py-0.5 rounded-md text-[10px] font-medium bg-card border shadow-sm text-muted-foreground pointer-events-auto"
                        style={{ transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)` }}
                    >
                        {String(label)}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
});
FlowEdge.displayName = 'FlowEdge';

export const flowEdgeTypes = {
    flow: FlowEdge,
};
