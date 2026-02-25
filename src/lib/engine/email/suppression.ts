/* ═══════════════════════════════════════════════════════════════════════
 * Email Suppression System — Bounce, Unsubscribe & Complaint Management
 *
 * Tracks addresses that must NOT receive email:
 *   • Hard bounces  → permanent suppression
 *   • Soft bounces  → temporary suppression (auto-clears after cooldown)
 *   • Complaints    → permanent suppression (ISP feedback loops)
 *   • Unsubscribes  → permanent until manually re-subscribed
 *   • Manual blocks  → admin-added suppression
 *
 * The suppression list is stored in-memory on globalThis so it persists
 * across hot-reloads in development. In production, this works as a
 * singleton for the lifetime of the process.
 *
 * Suppression check is O(1) — Map-based lookup before every send.
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── Types ──────────────────────────────────────────────────────────── */

export type SuppressionReason =
    | 'hard_bounce'
    | 'soft_bounce'
    | 'complaint'
    | 'unsubscribe'
    | 'manual_block'
    | 'invalid_address';

export interface SuppressionEntry {
    email: string;
    reason: SuppressionReason;
    addedAt: string;
    expiresAt?: string; // Only for soft bounces
    bounceCount: number;
    source: string; // Where the suppression came from (e.g., 'bounce_webhook', 'manual')
    metadata?: Record<string, unknown>;
}

export interface SuppressionStats {
    total: number;
    hardBounces: number;
    softBounces: number;
    complaints: number;
    unsubscribes: number;
    manualBlocks: number;
    invalidAddresses: number;
}

/* ── Constants ──────────────────────────────────────────────────────── */

const SOFT_BOUNCE_COOLDOWN_MS = 72 * 60 * 60 * 1000; // 72 hours
const SOFT_BOUNCE_THRESHOLD = 3; // After 3 soft bounces → hard bounce
const MAX_SUPPRESSION_LIST_SIZE = 100_000; // Memory guard

/* ── Suppression Store (Singleton) ──────────────────────────────────── */

const globalKey = '__lifecycleos_suppression_store__';

interface SuppressionStore {
    entries: Map<string, SuppressionEntry>;
}

function getStore(): SuppressionStore {
    const g = globalThis as unknown as Record<string, SuppressionStore>;
    if (!g[globalKey]) {
        g[globalKey] = { entries: new Map() };
    }
    return g[globalKey];
}

/* ── Core Functions ─────────────────────────────────────────────────── */

/**
 * Normalize email for consistent lookup (lowercase, trimmed).
 */
function normalize(email: string): string {
    return email.trim().toLowerCase();
}

/**
 * Check if an email address is suppressed (should NOT receive email).
 * Automatically clears expired soft bounces.
 */
export function isSuppressed(email: string): boolean {
    const key = normalize(email);
    const store = getStore();
    const entry = store.entries.get(key);

    if (!entry) return false;

    // Check if soft bounce has expired
    if (entry.reason === 'soft_bounce' && entry.expiresAt) {
        if (new Date(entry.expiresAt) < new Date()) {
            store.entries.delete(key);
            return false;
        }
    }

    return true;
}

/**
 * Get suppression entry for an email (or null if not suppressed).
 */
export function getSuppressionEntry(email: string): SuppressionEntry | null {
    const key = normalize(email);
    const entry = getStore().entries.get(key);
    if (!entry) return null;

    // Clear expired soft bounces
    if (entry.reason === 'soft_bounce' && entry.expiresAt) {
        if (new Date(entry.expiresAt) < new Date()) {
            getStore().entries.delete(key);
            return null;
        }
    }

    return entry;
}

/**
 * Add an email to the suppression list.
 */
export function addSuppression(
    email: string,
    reason: SuppressionReason,
    source: string,
    metadata?: Record<string, unknown>,
): SuppressionEntry {
    const key = normalize(email);
    const store = getStore();

    // Memory guard
    if (store.entries.size >= MAX_SUPPRESSION_LIST_SIZE) {
        // Evict oldest soft bounces first
        const sortedSoftBounces = [...store.entries.entries()]
            .filter(([, e]) => e.reason === 'soft_bounce')
            .sort((a, b) => new Date(a[1].addedAt).getTime() - new Date(b[1].addedAt).getTime());

        const toEvict = Math.max(1, Math.floor(MAX_SUPPRESSION_LIST_SIZE * 0.1));
        for (let i = 0; i < Math.min(toEvict, sortedSoftBounces.length); i++) {
            store.entries.delete(sortedSoftBounces[i][0]);
        }
    }

    const existing = store.entries.get(key);
    const bounceCount = (existing?.bounceCount ?? 0) + (reason.includes('bounce') ? 1 : 0);

    // Upgrade soft bounce to hard bounce after threshold
    const effectiveReason =
        reason === 'soft_bounce' && bounceCount >= SOFT_BOUNCE_THRESHOLD ? 'hard_bounce' : reason;

    const now = new Date().toISOString();
    const entry: SuppressionEntry = {
        email: key,
        reason: effectiveReason,
        addedAt: now,
        bounceCount,
        source,
        metadata,
        ...(effectiveReason === 'soft_bounce'
            ? { expiresAt: new Date(Date.now() + SOFT_BOUNCE_COOLDOWN_MS).toISOString() }
            : {}),
    };

    store.entries.set(key, entry);

    console.log(
        `[suppression] ${effectiveReason}: ${key} (source: ${source}, count: ${bounceCount})`,
    );

    return entry;
}

/**
 * Record a bounce event. Automatically classifies as soft or hard.
 */
export function recordBounce(
    email: string,
    bounceType: 'hard' | 'soft' | 'undetermined',
    diagnosticCode?: string,
    source = 'bounce_processor',
): SuppressionEntry {
    const reason: SuppressionReason =
        bounceType === 'hard' ? 'hard_bounce' : 'soft_bounce';

    return addSuppression(email, reason, source, {
        bounceType,
        diagnosticCode,
    });
}

/**
 * Record a spam complaint (ISP feedback loop).
 */
export function recordComplaint(
    email: string,
    feedbackType?: string,
    source = 'complaint_webhook',
): SuppressionEntry {
    return addSuppression(email, 'complaint', source, { feedbackType });
}

/**
 * Record an unsubscribe.
 */
export function recordUnsubscribe(
    email: string,
    source = 'unsubscribe_link',
    campaignId?: string,
): SuppressionEntry {
    return addSuppression(email, 'unsubscribe', source, { campaignId });
}

/**
 * Remove an email from the suppression list (manual re-enable).
 * Returns true if the entry was found and removed.
 */
export function removeSuppression(email: string): boolean {
    const key = normalize(email);
    return getStore().entries.delete(key);
}

/**
 * Batch check: filter out suppressed addresses from a list.
 * Returns only the addresses that ARE allowed to receive email.
 */
export function filterSuppressed(emails: string[]): string[] {
    return emails.filter((e) => !isSuppressed(e));
}

/**
 * Get all suppression entries (for admin UI).
 */
export function getAllSuppressions(): SuppressionEntry[] {
    return [...getStore().entries.values()];
}

/**
 * Get suppression statistics.
 */
export function getSuppressionStats(): SuppressionStats {
    const entries = [...getStore().entries.values()];
    return {
        total: entries.length,
        hardBounces: entries.filter((e) => e.reason === 'hard_bounce').length,
        softBounces: entries.filter((e) => e.reason === 'soft_bounce').length,
        complaints: entries.filter((e) => e.reason === 'complaint').length,
        unsubscribes: entries.filter((e) => e.reason === 'unsubscribe').length,
        manualBlocks: entries.filter((e) => e.reason === 'manual_block').length,
        invalidAddresses: entries.filter((e) => e.reason === 'invalid_address').length,
    };
}

/**
 * Clear all suppressions (use with caution — mainly for testing).
 */
export function clearAllSuppressions(): void {
    getStore().entries.clear();
}
