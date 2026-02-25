/* ═══════════════════════════════════════════════════════════════════════
 * Request Validation Layer
 *
 * Zod-like manual validation schemas for every API endpoint.
 * Provides deep type-safe validation with actionable error messages.
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── Validation Result ───────────────────────────────────────────────── */

export interface ValidationSuccess<T> {
    valid: true;
    data: T;
}

export interface ValidationError {
    valid: false;
    errors: FieldError[];
}

export interface FieldError {
    field: string;
    message: string;
    received?: unknown;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

/* ── Helper Utilities ────────────────────────────────────────────────── */

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
    return typeof v === 'string' && v.trim().length > 0;
}

function isEmail(v: unknown): boolean {
    if (typeof v !== 'string') return false;
    // RFC 5322 simplified — good enough for production SaaS
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

function isUrl(v: unknown): boolean {
    if (typeof v !== 'string') return false;
    try {
        const url = new URL(v);
        return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
        return false;
    }
}

function isISOTimestamp(v: unknown): boolean {
    if (typeof v !== 'string') return false;
    const d = new Date(v);
    return !isNaN(d.getTime());
}

/* ═══════════════════════════════════════════════════════════════════════
 * Valid Event Types
 * ═══════════════════════════════════════════════════════════════════════ */

export const VALID_WEBHOOK_EVENTS = new Set([
    'lifecycle_change',
    'risk_alert',
    'expansion_signal',
    'account_event',
    'flow_triggered',
    'user.identified',
    'user.lifecycle_changed',
    'user.risk_score_changed',
    'account.updated',
    'account.expansion_signal',
    'event.tracked',
    'flow.triggered',
    'flow.completed',
]);

export const VALID_PLAN_TIERS = new Set([
    'Trial', 'Starter', 'Growth', 'Business', 'Enterprise',
]);

export const VALID_KEY_ENVIRONMENTS = new Set([
    'production', 'staging', 'development',
]);

export const MUTABLE_USER_FIELDS = new Set([
    'name', 'email', 'plan', 'accountId', 'npsScore', 'seatLimit',
    'seatUsage', 'apiLimit', 'apiUsage', 'features',
]);

export const MUTABLE_ACCOUNT_FIELDS = new Set([
    'name', 'industry', 'plan', 'mrr', 'seats', 'health',
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Identify Endpoint Validator
 * ═══════════════════════════════════════════════════════════════════════ */

export interface IdentifyInput {
    userId: string;
    traits: Record<string, unknown>;
    timestamp?: string;
    messageId?: string;
}

export function validateIdentify(body: unknown): ValidationResult<IdentifyInput> {
    const errors: FieldError[] = [];

    if (!isObject(body)) {
        return { valid: false, errors: [{ field: 'body', message: 'Request body must be a JSON object' }] };
    }

    if (!isNonEmptyString(body.userId)) {
        errors.push({ field: 'userId', message: 'userId is required and must be a non-empty string', received: body.userId });
    }

    if (body.traits !== undefined && !isObject(body.traits)) {
        errors.push({ field: 'traits', message: 'traits must be a JSON object if provided', received: typeof body.traits });
    }

    const traits = isObject(body.traits) ? body.traits : {};

    // Validate specific traits
    if (traits.email !== undefined && !isEmail(traits.email)) {
        errors.push({ field: 'traits.email', message: 'Email must be a valid email address', received: traits.email });
    }

    if (traits.plan !== undefined && !VALID_PLAN_TIERS.has(traits.plan as string)) {
        errors.push({ field: 'traits.plan', message: `Plan must be one of: ${[...VALID_PLAN_TIERS].join(', ')}`, received: traits.plan });
    }

    if (traits.name !== undefined && typeof traits.name !== 'string') {
        errors.push({ field: 'traits.name', message: 'Name must be a string', received: typeof traits.name });
    }

    if (body.timestamp !== undefined && !isISOTimestamp(body.timestamp)) {
        errors.push({ field: 'timestamp', message: 'Timestamp must be a valid ISO 8601 date string', received: body.timestamp });
    }

    if (errors.length > 0) return { valid: false, errors };

    return {
        valid: true,
        data: {
            userId: (body.userId as string).trim(),
            traits: traits as Record<string, unknown>,
            timestamp: body.timestamp as string | undefined,
            messageId: body.messageId as string | undefined,
        },
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Events (Batch) Endpoint Validator
 * ═══════════════════════════════════════════════════════════════════════ */

export interface EventInput {
    event: string;
    properties: Record<string, unknown>;
    timestamp?: string;
    messageId?: string;
}

export interface EventsBatchInput {
    batch: EventInput[];
    sentAt?: string;
    messageId?: string;
}

export function validateEventsBatch(body: unknown): ValidationResult<EventsBatchInput> {
    const errors: FieldError[] = [];

    if (!isObject(body)) {
        return { valid: false, errors: [{ field: 'body', message: 'Request body must be a JSON object' }] };
    }

    if (!Array.isArray(body.batch)) {
        errors.push({ field: 'batch', message: 'batch is required and must be an array of events' });
        return { valid: false, errors };
    }

    if (body.batch.length === 0) {
        errors.push({ field: 'batch', message: 'batch must contain at least one event' });
        return { valid: false, errors };
    }

    if (body.batch.length > 100) {
        errors.push({ field: 'batch', message: 'batch cannot exceed 100 events per request', received: body.batch.length });
        return { valid: false, errors };
    }

    const cleanBatch: EventInput[] = [];

    for (let i = 0; i < body.batch.length; i++) {
        const ev = body.batch[i];
        if (!isObject(ev)) {
            errors.push({ field: `batch[${i}]`, message: 'Each event must be an object' });
            continue;
        }
        if (!isNonEmptyString(ev.event)) {
            errors.push({ field: `batch[${i}].event`, message: 'event name is required and must be a non-empty string' });
        }
        if (ev.properties !== undefined && !isObject(ev.properties)) {
            errors.push({ field: `batch[${i}].properties`, message: 'properties must be an object if provided' });
        }
        if (ev.timestamp !== undefined && !isISOTimestamp(ev.timestamp)) {
            errors.push({ field: `batch[${i}].timestamp`, message: 'timestamp must be a valid ISO 8601 date string' });
        }

        if (errors.length === 0) {
            cleanBatch.push({
                event: (ev.event as string).trim(),
                properties: (isObject(ev.properties) ? ev.properties : {}) as Record<string, unknown>,
                timestamp: ev.timestamp as string | undefined,
                messageId: ev.messageId as string | undefined,
            });
        }
    }

    if (body.sentAt !== undefined && !isISOTimestamp(body.sentAt)) {
        errors.push({ field: 'sentAt', message: 'sentAt must be a valid ISO 8601 date string' });
    }

    if (errors.length > 0) return { valid: false, errors };

    return {
        valid: true,
        data: {
            batch: cleanBatch,
            sentAt: body.sentAt as string | undefined,
            messageId: body.messageId as string | undefined,
        },
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Group Endpoint Validator
 * ═══════════════════════════════════════════════════════════════════════ */

export interface GroupInput {
    groupId: string;
    traits: Record<string, unknown>;
    timestamp?: string;
    messageId?: string;
}

export function validateGroup(body: unknown): ValidationResult<GroupInput> {
    const errors: FieldError[] = [];

    if (!isObject(body)) {
        return { valid: false, errors: [{ field: 'body', message: 'Request body must be a JSON object' }] };
    }

    if (!isNonEmptyString(body.groupId)) {
        errors.push({ field: 'groupId', message: 'groupId is required and must be a non-empty string', received: body.groupId });
    }

    if (body.traits !== undefined && !isObject(body.traits)) {
        errors.push({ field: 'traits', message: 'traits must be a JSON object if provided' });
    }

    const traits = isObject(body.traits) ? body.traits : {};

    if (traits.plan !== undefined && !VALID_PLAN_TIERS.has(traits.plan as string)) {
        errors.push({ field: 'traits.plan', message: `Plan must be one of: ${[...VALID_PLAN_TIERS].join(', ')}`, received: traits.plan });
    }
    if (traits.seats !== undefined && (typeof traits.seats !== 'number' || traits.seats < 0)) {
        errors.push({ field: 'traits.seats', message: 'seats must be a non-negative number', received: traits.seats });
    }
    if (traits.arr !== undefined && (typeof traits.arr !== 'number' || traits.arr < 0)) {
        errors.push({ field: 'traits.arr', message: 'arr must be a non-negative number', received: traits.arr });
    }

    if (body.timestamp !== undefined && !isISOTimestamp(body.timestamp)) {
        errors.push({ field: 'timestamp', message: 'Timestamp must be a valid ISO 8601 date string' });
    }

    if (errors.length > 0) return { valid: false, errors };

    return {
        valid: true,
        data: {
            groupId: (body.groupId as string).trim(),
            traits: traits as Record<string, unknown>,
            timestamp: body.timestamp as string | undefined,
            messageId: body.messageId as string | undefined,
        },
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Webhook Create Validator
 * ═══════════════════════════════════════════════════════════════════════ */

export interface WebhookCreateInput {
    url: string;
    events: string[];
    secret?: string;
}

export function validateWebhookCreate(body: unknown): ValidationResult<WebhookCreateInput> {
    const errors: FieldError[] = [];

    if (!isObject(body)) {
        return { valid: false, errors: [{ field: 'body', message: 'Request body must be a JSON object' }] };
    }

    if (!isUrl(body.url)) {
        errors.push({ field: 'url', message: 'url is required and must be a valid HTTP(S) URL', received: body.url });
    }

    if (!Array.isArray(body.events) || body.events.length === 0) {
        errors.push({ field: 'events', message: 'events is required and must be a non-empty array of event types' });
    } else {
        const invalid = (body.events as string[]).filter((e) => !VALID_WEBHOOK_EVENTS.has(e));
        if (invalid.length > 0) {
            errors.push({
                field: 'events',
                message: `Invalid event types: ${invalid.join(', ')}. Valid types: ${[...VALID_WEBHOOK_EVENTS].join(', ')}`,
                received: invalid,
            });
        }
    }

    if (errors.length > 0) return { valid: false, errors };

    return {
        valid: true,
        data: {
            url: (body.url as string).trim(),
            events: body.events as string[],
            secret: typeof body.secret === 'string' ? body.secret : undefined,
        },
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Webhook Update Validator
 * ═══════════════════════════════════════════════════════════════════════ */

export interface WebhookUpdateInput {
    url?: string;
    events?: string[];
    status?: 'active' | 'inactive';
}

export function validateWebhookUpdate(body: unknown): ValidationResult<WebhookUpdateInput> {
    const errors: FieldError[] = [];

    if (!isObject(body)) {
        return { valid: false, errors: [{ field: 'body', message: 'Request body must be a JSON object' }] };
    }

    const hasAtLeastOneField = body.url !== undefined || body.events !== undefined || body.status !== undefined;
    if (!hasAtLeastOneField) {
        errors.push({ field: 'body', message: 'At least one field (url, events, status) must be provided' });
        return { valid: false, errors };
    }

    if (body.url !== undefined && !isUrl(body.url)) {
        errors.push({ field: 'url', message: 'url must be a valid HTTP(S) URL' });
    }

    if (body.events !== undefined) {
        if (!Array.isArray(body.events) || body.events.length === 0) {
            errors.push({ field: 'events', message: 'events must be a non-empty array' });
        } else {
            const invalid = (body.events as string[]).filter((e) => !VALID_WEBHOOK_EVENTS.has(e));
            if (invalid.length > 0) {
                errors.push({ field: 'events', message: `Invalid event types: ${invalid.join(', ')}`, received: invalid });
            }
        }
    }

    if (body.status !== undefined && !['active', 'inactive'].includes(body.status as string)) {
        errors.push({ field: 'status', message: 'status must be "active" or "inactive"', received: body.status });
    }

    if (errors.length > 0) return { valid: false, errors };

    const data: WebhookUpdateInput = {};
    if (body.url !== undefined) data.url = (body.url as string).trim();
    if (body.events !== undefined) data.events = body.events as string[];
    if (body.status !== undefined) data.status = body.status as 'active' | 'inactive';

    return { valid: true, data };
}

/* ═══════════════════════════════════════════════════════════════════════
 * API Key Create Validator
 * ═══════════════════════════════════════════════════════════════════════ */

export interface KeyCreateInput {
    name: string;
    environment: 'production' | 'staging' | 'development';
    scopes?: string[];
}

export function validateKeyCreate(body: unknown): ValidationResult<KeyCreateInput> {
    const errors: FieldError[] = [];

    if (!isObject(body)) {
        return { valid: false, errors: [{ field: 'body', message: 'Request body must be a JSON object' }] };
    }

    if (!isNonEmptyString(body.name)) {
        errors.push({ field: 'name', message: 'name is required and must be a non-empty string', received: body.name });
    } else if ((body.name as string).length > 64) {
        errors.push({ field: 'name', message: 'name must be 64 characters or fewer', received: (body.name as string).length });
    }

    const env = body.environment as string;
    if (env !== undefined && !VALID_KEY_ENVIRONMENTS.has(env)) {
        errors.push({ field: 'environment', message: `environment must be one of: ${[...VALID_KEY_ENVIRONMENTS].join(', ')}`, received: env });
    }

    if (errors.length > 0) return { valid: false, errors };

    return {
        valid: true,
        data: {
            name: (body.name as string).trim(),
            environment: (VALID_KEY_ENVIRONMENTS.has(env) ? env : 'development') as KeyCreateInput['environment'],
            scopes: Array.isArray(body.scopes) ? body.scopes as string[] : undefined,
        },
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 * User Update Validator (safe allowlist)
 * ═══════════════════════════════════════════════════════════════════════ */

export interface UserUpdateInput {
    [key: string]: unknown;
}

export function validateUserUpdate(body: unknown): ValidationResult<UserUpdateInput> {
    const errors: FieldError[] = [];

    if (!isObject(body)) {
        return { valid: false, errors: [{ field: 'body', message: 'Request body must be a JSON object' }] };
    }

    const sanitized: UserUpdateInput = {};
    const rejected: string[] = [];

    for (const [key, value] of Object.entries(body)) {
        if (MUTABLE_USER_FIELDS.has(key)) {
            sanitized[key] = value;
        } else {
            rejected.push(key);
        }
    }

    if (rejected.length > 0) {
        errors.push({
            field: 'body',
            message: `Immutable or unknown fields cannot be updated: ${rejected.join(', ')}. Allowed: ${[...MUTABLE_USER_FIELDS].join(', ')}`,
            received: rejected,
        });
    }

    if (Object.keys(sanitized).length === 0 && rejected.length === 0) {
        errors.push({ field: 'body', message: 'At least one mutable field must be provided' });
    }

    // Validate specific fields
    if (sanitized.email !== undefined && !isEmail(sanitized.email)) {
        errors.push({ field: 'email', message: 'Email must be a valid email address' });
    }
    if (sanitized.plan !== undefined && !VALID_PLAN_TIERS.has(sanitized.plan as string)) {
        errors.push({ field: 'plan', message: `Plan must be one of: ${[...VALID_PLAN_TIERS].join(', ')}` });
    }
    if (sanitized.npsScore !== undefined && (typeof sanitized.npsScore !== 'number' || sanitized.npsScore < 0 || sanitized.npsScore > 10)) {
        errors.push({ field: 'npsScore', message: 'npsScore must be a number between 0 and 10' });
    }

    if (errors.length > 0) return { valid: false, errors };

    return { valid: true, data: sanitized };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Account Update Validator (safe allowlist)
 * ═══════════════════════════════════════════════════════════════════════ */

export interface AccountUpdateInput {
    [key: string]: unknown;
}

export function validateAccountUpdate(body: unknown): ValidationResult<AccountUpdateInput> {
    const errors: FieldError[] = [];

    if (!isObject(body)) {
        return { valid: false, errors: [{ field: 'body', message: 'Request body must be a JSON object' }] };
    }

    const sanitized: AccountUpdateInput = {};
    const rejected: string[] = [];

    for (const [key, value] of Object.entries(body)) {
        if (MUTABLE_ACCOUNT_FIELDS.has(key)) {
            sanitized[key] = value;
        } else {
            rejected.push(key);
        }
    }

    if (rejected.length > 0) {
        errors.push({
            field: 'body',
            message: `Immutable or unknown fields cannot be updated: ${rejected.join(', ')}. Allowed: ${[...MUTABLE_ACCOUNT_FIELDS].join(', ')}`,
            received: rejected,
        });
    }

    if (Object.keys(sanitized).length === 0 && rejected.length === 0) {
        errors.push({ field: 'body', message: 'At least one mutable field must be provided' });
    }

    if (sanitized.plan !== undefined && !VALID_PLAN_TIERS.has(sanitized.plan as string)) {
        errors.push({ field: 'plan', message: `Plan must be one of: ${[...VALID_PLAN_TIERS].join(', ')}` });
    }
    if (sanitized.mrr !== undefined && (typeof sanitized.mrr !== 'number' || sanitized.mrr < 0)) {
        errors.push({ field: 'mrr', message: 'mrr must be a non-negative number' });
    }
    if (sanitized.seats !== undefined && (typeof sanitized.seats !== 'number' || sanitized.seats < 0)) {
        errors.push({ field: 'seats', message: 'seats must be a non-negative number' });
    }

    if (errors.length > 0) return { valid: false, errors };

    return { valid: true, data: sanitized };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Pagination Helper
 * ═══════════════════════════════════════════════════════════════════════ */

export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
}

export function parsePagination(params: URLSearchParams, defaultLimit = 50, maxLimit = 200): PaginationParams {
    const rawPage = parseInt(params.get('page') ?? '1', 10);
    const rawLimit = parseInt(params.get('limit') ?? String(defaultLimit), 10);

    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const limit = Math.min(maxLimit, Math.max(1, isNaN(rawLimit) ? defaultLimit : rawLimit));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
}

export function paginate<T>(items: T[], pagination: PaginationParams): { data: T[]; total: number; page: number; limit: number; totalPages: number } {
    const total = items.length;
    const totalPages = Math.ceil(total / pagination.limit);
    const data = items.slice(pagination.offset, pagination.offset + pagination.limit);
    return { data, total, page: pagination.page, limit: pagination.limit, totalPages };
}
