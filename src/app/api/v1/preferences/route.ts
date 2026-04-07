/* ==========================================================================
 * User Preferences API - /api/v1/preferences
 *
 * DB-backed per-user preferences (notification settings, alert rules,
 * timezone, onboarding dismiss state, email builder drafts, etc.).
 *
 * GET  - returns all preferences for the authenticated user
 * PUT  - upsert a single preference by key
 * DELETE - delete a single preference by key
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { requireDashboardAuth } from '@/lib/api/dashboard-auth';
import {
    getAllUserPreferences,
    setUserPreference,
    deleteUserPreference,
    getInternalUserId,
} from '@/lib/db/operations';

/** Allowed preference keys (whitelist to prevent abuse) */
const ALLOWED_KEYS = new Set([
    'notifications',       // { emailNotifications, slackNotifications }
    'alert_rules',         // { rules: [...] }
    'timezone',            // { timezone: string }
    'onboarding_dismiss',  // { dismissed: boolean, permanentlyDismissed: boolean }
    'email_builder_draft', // { blocks, subject, preheader, ... }
]);

function isValidKey(key: unknown): key is string {
    return typeof key === 'string' && ALLOWED_KEYS.has(key);
}

/* ── GET /api/v1/preferences ─────────────────────────────────────────── */

export async function GET() {
    const authResult = await requireDashboardAuth();
    if (!authResult.success) return authResult.response;

    const internalUserId = await getInternalUserId(authResult.userId);
    if (!internalUserId) {
        return NextResponse.json(
            { success: true, data: {} },
            { status: 200 },
        );
    }

    const prefs = await getAllUserPreferences(internalUserId);
    return NextResponse.json({ success: true, data: prefs });
}

/* ── PUT /api/v1/preferences ─────────────────────────────────────────── */

export async function PUT(request: NextRequest) {
    const authResult = await requireDashboardAuth();
    if (!authResult.success) return authResult.response;

    const internalUserId = await getInternalUserId(authResult.userId);
    if (!internalUserId) {
        return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 },
        );
    }

    let body: { key?: unknown; value?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid JSON body' },
            { status: 400 },
        );
    }

    if (!isValidKey(body.key)) {
        return NextResponse.json(
            { success: false, error: `Invalid preference key. Allowed: ${[...ALLOWED_KEYS].join(', ')}` },
            { status: 400 },
        );
    }

    if (!body.value || typeof body.value !== 'object' || Array.isArray(body.value)) {
        return NextResponse.json(
            { success: false, error: 'Value must be a non-null JSON object' },
            { status: 400 },
        );
    }

    const row = await setUserPreference(internalUserId, body.key, body.value as Record<string, unknown>);
    return NextResponse.json({ success: true, data: row });
}

/* ── DELETE /api/v1/preferences ──────────────────────────────────────── */

export async function DELETE(request: NextRequest) {
    const authResult = await requireDashboardAuth();
    if (!authResult.success) return authResult.response;

    const internalUserId = await getInternalUserId(authResult.userId);
    if (!internalUserId) {
        return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 },
        );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!isValidKey(key)) {
        return NextResponse.json(
            { success: false, error: `Invalid preference key. Allowed: ${[...ALLOWED_KEYS].join(', ')}` },
            { status: 400 },
        );
    }

    const deleted = await deleteUserPreference(internalUserId, key);
    return NextResponse.json({ success: true, deleted });
}
