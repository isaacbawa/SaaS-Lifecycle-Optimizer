/* ==========================================================================
 * Integration Warnings Context — Flow Builder
 *
 * Provides per-node integration warning data to flow node components
 * via React Context. This avoids mutating node.data (which would cause
 * re-render loops in the useEffect that depends on nodes).
 *
 * The FlowBuilderCanvas computes a Map<nodeId, warningText> and wraps
 * the ReactFlow tree with this provider. Individual node components
 * read their warning via useIntegrationWarning(nodeId).
 * ========================================================================== */

'use client';

import { createContext, useContext } from 'react';

/**
 * Map from React Flow nodeId → human-readable warning text.
 * Only present for nodes whose required integration is missing.
 */
const IntegrationWarningsContext = createContext<Map<string, string>>(new Map());

export const IntegrationWarningsProvider = IntegrationWarningsContext.Provider;

/** Read the integration warning for a specific node. Returns undefined if none. */
export function useIntegrationWarning(nodeId: string): string | undefined {
    const map = useContext(IntegrationWarningsContext);
    return map.get(nodeId);
}
