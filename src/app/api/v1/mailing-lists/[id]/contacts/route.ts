/* ==========================================================================
 * GET/POST/DELETE /api/v1/mailing-lists/[id]/contacts - Manage List Contacts
 *
 * GET: List contacts in a mailing list
 * POST: Add contacts to a mailing list (single or bulk)
 * DELETE: Remove a contact from a mailing list
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getMailingList, addMailingListContacts, removeMailingListContact, getMailingListContacts } from '@/lib/db/operations';
import { requireDashboardAuth } from '@/lib/api/dashboard-auth';

const MAX_BULK_CONTACTS = 5000;

/** Sanitize DB errors - never leak SQL queries or internal details to the client. */
function safeError(err: unknown): { message: string; status: number } {
    console.error('[mailing-lists/contacts] API error:', err);
    return { message: 'An unexpected error occurred. Please try again.', status: 500 };
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;
        const { id } = await params;

        const list = await getMailingList(orgId, id);
        if (!list) return NextResponse.json({ success: false, error: 'Mailing list not found' }, { status: 404 });

        const { searchParams } = request.nextUrl;
        const limitParam = searchParams.get('limit');
        const offsetParam = searchParams.get('offset');
        const pagination = (limitParam || offsetParam) ? {
            limit: limitParam ? parseInt(limitParam, 10) : undefined,
            offset: offsetParam ? parseInt(offsetParam, 10) : undefined,
        } : undefined;

        const result = await getMailingListContacts(orgId, id, pagination);
        return NextResponse.json({
            success: true,
            data: result.items,
            pagination: { total: result.total, limit: result.limit, offset: result.offset, hasMore: result.hasMore },
        });
    } catch (err) {
        const { message, status } = safeError(err);
        return NextResponse.json({ success: false, error: message }, { status });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;
        const { id } = await params;

        const list = await getMailingList(orgId, id);
        if (!list) return NextResponse.json({ success: false, error: 'Mailing list not found' }, { status: 404 });

        const body = await request.json();
        const { contacts } = body;

        if (!Array.isArray(contacts) || contacts.length === 0) {
            return NextResponse.json({ success: false, error: 'Provide an array of contacts with at least an email field' }, { status: 400 });
        }

        if (contacts.length > MAX_BULK_CONTACTS) {
            return NextResponse.json({ success: false, error: `Maximum ${MAX_BULK_CONTACTS} contacts per request` }, { status: 400 });
        }

        // Validate and sanitize emails
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validContacts = contacts.filter(
            (c: { email?: string }) => c.email && typeof c.email === 'string' && emailRegex.test(c.email.trim()),
        ).map((c: { email: string; firstName?: string; lastName?: string; properties?: Record<string, unknown> }) => ({
            email: c.email.trim(),
            firstName: typeof c.firstName === 'string' ? c.firstName.trim().slice(0, 255) : undefined,
            lastName: typeof c.lastName === 'string' ? c.lastName.trim().slice(0, 255) : undefined,
            properties: (c.properties && typeof c.properties === 'object' && !Array.isArray(c.properties)) ? c.properties : undefined,
        }));

        if (validContacts.length === 0) {
            return NextResponse.json({ success: false, error: 'No valid email addresses provided' }, { status: 400 });
        }

        const result = await addMailingListContacts(orgId, id, validContacts);
        return NextResponse.json({
            success: true,
            data: { added: result.added, skipped: result.skipped, total: validContacts.length },
        }, { status: 201 });
    } catch (err) {
        const { message, status } = safeError(err);
        return NextResponse.json({ success: false, error: message }, { status });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;
        const { id } = await params;

        const { searchParams } = request.nextUrl;
        const contactId = searchParams.get('contactId');

        if (!contactId) {
            return NextResponse.json({ success: false, error: 'contactId query parameter is required' }, { status: 400 });
        }

        const ok = await removeMailingListContact(orgId, id, contactId);
        if (!ok) return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (err) {
        const { message, status } = safeError(err);
        return NextResponse.json({ success: false, error: message }, { status });
    }
}
