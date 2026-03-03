/* ==========================================================================
 * Flow Templates — Structural Integrity Tests
 *
 * Validates that all 22 flow templates have correct structure:
 *   - Valid categories
 *   - Non-empty nodes/edges arrays
 *   - Exactly one trigger node per flow
 *   - Edges reference valid node IDs
 *   - No orphan nodes (disconnected from graph)
 *   - Required fields present
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
    FLOW_TEMPLATES,
    FLOW_TEMPLATE_CATEGORIES,
    type FlowTemplateCategory,
} from '@/lib/flow-templates';

const validCategories = FLOW_TEMPLATE_CATEGORIES.map((c) => c.id) as string[];

describe('Flow Templates — Collection', () => {
    it('has at least 20 templates', () => {
        expect(FLOW_TEMPLATES.length).toBeGreaterThanOrEqual(20);
    });

    it('every template has a unique id', () => {
        const ids = FLOW_TEMPLATES.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('every template has a unique name', () => {
        const names = FLOW_TEMPLATES.map((t) => t.name);
        expect(new Set(names).size).toBe(names.length);
    });

    it('every category has at least one template', () => {
        for (const cat of validCategories) {
            const count = FLOW_TEMPLATES.filter((t) => t.category === cat).length;
            expect(count, `Category "${cat}" should have at least 1 template`).toBeGreaterThanOrEqual(1);
        }
    });
});

describe('Flow Templates — Individual Validation', () => {
    for (const template of FLOW_TEMPLATES) {
        describe(`Template: ${template.name} (${template.id})`, () => {
            it('has a valid category', () => {
                expect(validCategories).toContain(template.category);
            });

            it('has required string fields', () => {
                expect(template.id).toBeTruthy();
                expect(template.name).toBeTruthy();
                expect(template.description).toBeTruthy();
                expect(template.trigger).toBeTruthy();
            });

            it('has at least one tag', () => {
                expect(template.tags.length).toBeGreaterThanOrEqual(1);
            });

            it('has nodes and edges', () => {
                expect(template.nodes.length).toBeGreaterThanOrEqual(2);
                expect(template.edges.length).toBeGreaterThanOrEqual(1);
            });

            it('has exactly one trigger node', () => {
                const triggers = template.nodes.filter((n) => n.type === 'trigger');
                expect(triggers.length, 'Should have exactly 1 trigger node').toBe(1);
            });

            it('edges reference valid node IDs', () => {
                const nodeIds = new Set(template.nodes.map((n) => n.id));
                for (const edge of template.edges) {
                    expect(nodeIds.has(edge.source), `Edge source "${edge.source}" not found in nodes`).toBe(true);
                    expect(nodeIds.has(edge.target), `Edge target "${edge.target}" not found in nodes`).toBe(true);
                }
            });

            it('all non-trigger nodes are reachable from edges', () => {
                const targetNodeIds = new Set(template.edges.map((e) => e.target));
                const nonTriggerNodes = template.nodes.filter((n) => n.type !== 'trigger');
                for (const node of nonTriggerNodes) {
                    expect(
                        targetNodeIds.has(node.id),
                        `Node "${node.id}" (${node.type}) is not a target of any edge — orphan node`,
                    ).toBe(true);
                }
            });

            it('has valid flow settings', () => {
                expect(template.settings).toBeDefined();
                expect(typeof template.settings.maxConcurrentEnrollments).toBe('number');
            });

            it('nodes have valid positions', () => {
                for (const node of template.nodes) {
                    expect(node.position).toBeDefined();
                    expect(typeof node.position.x).toBe('number');
                    expect(typeof node.position.y).toBe('number');
                }
            });

            it('node IDs are unique within the template', () => {
                const ids = template.nodes.map((n) => n.id);
                expect(new Set(ids).size).toBe(ids.length);
            });
        });
    }
});

describe('Flow Template Categories', () => {
    it('has 9 categories', () => {
        expect(FLOW_TEMPLATE_CATEGORIES).toHaveLength(9);
    });

    it('each category has required fields', () => {
        for (const cat of FLOW_TEMPLATE_CATEGORIES) {
            expect(cat.id).toBeTruthy();
            expect(cat.label).toBeTruthy();
            expect(cat.description).toBeTruthy();
            expect(cat.color).toMatch(/^#[0-9a-f]{6}$/i);
            expect(cat.icon).toBeTruthy();
        }
    });
});
