'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
    PlusCircle, MoreHorizontal, Users, Upload, Trash2,
    Pencil, MailPlus, ContactRound, UserPlus, Download,
    AlertCircle, CheckCircle2, Loader2, Search, ArrowLeft,
    FileSpreadsheet, ChevronLeft, ChevronRight, X, FileUp,
    Mail, User,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════
 * Types
 * ═══════════════════════════════════════════════════════════════════════ */

interface MailingList {
    id: string;
    name: string;
    description: string | null;
    status: string;
    contactCount: number;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

interface Contact {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    properties: Record<string, unknown>;
    unsubscribed: boolean;
    createdAt: string;
}

interface Pagination {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

interface CsvRow {
    email: string;
    firstName?: string;
    lastName?: string;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Constants
 * ═══════════════════════════════════════════════════════════════════════ */

const STATUS_STYLES: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    archived: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const PAGE_SIZE = 50;

/* ═══════════════════════════════════════════════════════════════════════
 * CSV Parsing Utility
 * ═══════════════════════════════════════════════════════════════════════ */

function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') {
                current += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',' || ch === ';' || ch === '\t') {
                result.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
    }
    result.push(current.trim());
    return result;
}

function detectColumnMapping(headerCells: string[]): { emailIdx: number; firstNameIdx: number; lastNameIdx: number } {
    const lower = headerCells.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    let emailIdx = lower.findIndex(h => h === 'email' || h === 'emailaddress');
    let firstNameIdx = lower.findIndex(h => h === 'firstname' || h === 'first' || h === 'fname' || h === 'givenname');
    let lastNameIdx = lower.findIndex(h => h === 'lastname' || h === 'last' || h === 'lname' || h === 'surname' || h === 'familyname');

    // If no explicit email column, check for "name" column pattern fallback
    if (emailIdx === -1) {
        emailIdx = lower.findIndex(h => h.includes('email'));
    }
    if (firstNameIdx === -1 && lastNameIdx === -1) {
        const nameIdx = lower.findIndex(h => h === 'name' || h === 'fullname' || h === 'contactname');
        if (nameIdx !== -1) firstNameIdx = nameIdx; // treat full name as first name field
    }

    // Default ordering: email, firstName, lastName
    if (emailIdx === -1) emailIdx = 0;
    if (firstNameIdx === -1) firstNameIdx = emailIdx === 0 ? 1 : 0;
    if (lastNameIdx === -1) lastNameIdx = Math.max(emailIdx, firstNameIdx) + 1;

    return { emailIdx, firstNameIdx, lastNameIdx };
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseCsvText(text: string): { contacts: CsvRow[]; errors: number; hasHeader: boolean } {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return { contacts: [], errors: 0, hasHeader: false };

    const firstLineCells = parseCsvLine(lines[0]);
    const firstLower = firstLineCells.map(c => c.toLowerCase());
    const hasHeader = firstLower.some(c => c.includes('email') || c.includes('name') || c.includes('first') || c.includes('last'));

    const mapping = hasHeader
        ? detectColumnMapping(firstLineCells)
        : { emailIdx: 0, firstNameIdx: 1, lastNameIdx: 2 };

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const contacts: CsvRow[] = [];
    let errors = 0;

    for (const line of dataLines) {
        const cells = parseCsvLine(line);
        const email = cells[mapping.emailIdx]?.trim().toLowerCase();
        if (!email || !isValidEmail(email)) { errors++; continue; }

        const firstName = cells[mapping.firstNameIdx]?.trim() || undefined;
        const lastName = cells[mapping.lastNameIdx]?.trim() || undefined;
        contacts.push({ email, firstName, lastName });
    }

    return { contacts, errors, hasHeader };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Main Component
 * ═══════════════════════════════════════════════════════════════════════ */

export default function MailingListsPage() {

    /* ── View state ─────────────────────────────────── */
    const [view, setView] = useState<'lists' | 'detail'>('lists');

    /* ── Lists state ────────────────────────────────── */
    const [lists, setLists] = useState<MailingList[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    /* ── List create/edit ───────────────────────────── */
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<MailingList | null>(null);
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [saving, setSaving] = useState(false);

    /* ── Detail view (selected list) ────────────────── */
    const [activeList, setActiveList] = useState<MailingList | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [contactsPagination, setContactsPagination] = useState<Pagination | null>(null);
    const [contactsPage, setContactsPage] = useState(0);
    const [contactSearch, setContactSearch] = useState('');

    /* ── Add contacts ───────────────────────────────── */
    const [addContactOpen, setAddContactOpen] = useState(false);
    const [singleEmail, setSingleEmail] = useState('');
    const [singleFirstName, setSingleFirstName] = useState('');
    const [singleLastName, setSingleLastName] = useState('');
    const [bulkText, setBulkText] = useState('');
    const [addingContacts, setAddingContacts] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* ── Delete ──────────────────────────────────────── */
    const [deleteTarget, setDeleteTarget] = useState<MailingList | null>(null);
    const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

    /* ═══════════════════════════════════════════════════════════════════
     * KPI metrics
     * ═══════════════════════════════════════════════════════════════════ */
    const totalContacts = lists.reduce((sum, l) => sum + l.contactCount, 0);
    const activeLists = lists.filter(l => l.status === 'active').length;
    const archivedLists = lists.filter(l => l.status === 'archived').length;

    /* ═══════════════════════════════════════════════════════════════════
     * Filtered lists
     * ═══════════════════════════════════════════════════════════════════ */
    const filteredLists = useMemo(() => {
        if (statusFilter === 'all') return lists;
        return lists.filter(l => l.status === statusFilter);
    }, [lists, statusFilter]);

    /* ═══════════════════════════════════════════════════════════════════
     * Filtered contacts (client-side search)
     * ═══════════════════════════════════════════════════════════════════ */
    const filteredContacts = useMemo(() => {
        if (!contactSearch.trim()) return contacts;
        const q = contactSearch.toLowerCase();
        return contacts.filter(c =>
            c.email.toLowerCase().includes(q) ||
            (c.firstName && c.firstName.toLowerCase().includes(q)) ||
            (c.lastName && c.lastName.toLowerCase().includes(q))
        );
    }, [contacts, contactSearch]);

    /* ═══════════════════════════════════════════════════════════════════
     * CSV preview state
     * ═══════════════════════════════════════════════════════════════════ */
    const csvPreview = useMemo(() => {
        if (!bulkText.trim()) return null;
        return parseCsvText(bulkText);
    }, [bulkText]);

    /* ═══════════════════════════════════════════════════════════════════
     * Data Fetchers
     * ═══════════════════════════════════════════════════════════════════ */

    const fetchLists = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/mailing-lists');
            if (res.ok) {
                const json = await res.json();
                setLists(json.data ?? []);
            } else {
                toast({ title: 'Error', description: 'Failed to load mailing lists', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Network error loading lists', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLists(); }, [fetchLists]);

    const fetchContacts = useCallback(async (listId: string, page = 0) => {
        setContactsLoading(true);
        try {
            const res = await fetch(`/api/v1/mailing-lists/${listId}/contacts?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
            if (res.ok) {
                const json = await res.json();
                setContacts(json.data ?? []);
                setContactsPagination(json.pagination ?? null);
            }
        } catch {
            toast({ title: 'Error', description: 'Failed to load contacts', variant: 'destructive' });
        } finally {
            setContactsLoading(false);
        }
    }, []);

    /* ═══════════════════════════════════════════════════════════════════
     * List CRUD
     * ═══════════════════════════════════════════════════════════════════ */

    const saveList = async () => {
        if (!formName.trim()) return;
        setSaving(true);
        try {
            let res: Response;
            if (editing) {
                res = await fetch(`/api/v1/mailing-lists/${editing.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: formName.trim(), description: formDesc }),
                });
            } else {
                res = await fetch('/api/v1/mailing-lists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: formName.trim(), description: formDesc, status: 'active' }),
                });
            }
            if (res.ok) {
                const json = await res.json();
                setDialogOpen(false);
                await fetchLists();
                toast({ title: editing ? 'List updated' : 'List created successfully' });
                // If creating, navigate into the new list
                if (!editing && json.data) {
                    openListDetail(json.data);
                }
            } else {
                const json = await res.json();
                toast({ title: 'Error', description: json.error ?? 'Failed to save list', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteList = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/v1/mailing-lists/${deleteTarget.id}`, { method: 'DELETE' });
            if (res.ok) {
                // If viewing the list we're deleting, go back to list view
                if (activeList?.id === deleteTarget.id) { setView('lists'); setActiveList(null); }
                fetchLists();
                toast({ title: 'List deleted' });
            } else {
                const json = await res.json();
                toast({ title: 'Error', description: json.error ?? 'Failed to delete', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
        } finally {
            setDeleteTarget(null);
        }
    };

    /* ═══════════════════════════════════════════════════════════════════
     * Contact CRUD
     * ═══════════════════════════════════════════════════════════════════ */

    const handleAddContacts = async (mode: 'single' | 'bulk') => {
        if (!activeList) return;
        setAddingContacts(true);
        try {
            let contactsToAdd: CsvRow[] = [];

            if (mode === 'single') {
                if (!isValidEmail(singleEmail)) {
                    toast({ title: 'Invalid email address', description: 'Please enter a valid email.', variant: 'destructive' });
                    setAddingContacts(false);
                    return;
                }
                contactsToAdd = [{
                    email: singleEmail.trim().toLowerCase(),
                    firstName: singleFirstName.trim() || undefined,
                    lastName: singleLastName.trim() || undefined,
                }];
            } else {
                if (!csvPreview || csvPreview.contacts.length === 0) {
                    toast({ title: 'No valid contacts found', description: 'Check that your data contains valid email addresses.', variant: 'destructive' });
                    setAddingContacts(false);
                    return;
                }
                contactsToAdd = csvPreview.contacts;
            }

            const res = await fetch(`/api/v1/mailing-lists/${activeList.id}/contacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contacts: contactsToAdd }),
            });

            if (res.ok) {
                const json = await res.json();
                const d = json.data;
                toast({
                    title: 'Contacts added',
                    description: `${d.added} added${d.skipped > 0 ? `, ${d.skipped} duplicate${d.skipped !== 1 ? 's' : ''} skipped` : ''}`,
                });
                setAddContactOpen(false);
                resetAddForm();
                fetchContacts(activeList.id, contactsPage);
                fetchLists();
            } else {
                const json = await res.json();
                toast({ title: 'Error', description: json.error ?? 'Failed to add contacts', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
        } finally {
            setAddingContacts(false);
        }
    };

    const handleDeleteContact = async () => {
        if (!activeList || !deleteContactId) return;
        try {
            const res = await fetch(`/api/v1/mailing-lists/${activeList.id}/contacts?contactId=${deleteContactId}`, { method: 'DELETE' });
            if (res.ok) {
                toast({ title: 'Contact removed' });
                fetchContacts(activeList.id, contactsPage);
                fetchLists();
            } else {
                toast({ title: 'Error', description: 'Failed to remove contact', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
        } finally {
            setDeleteContactId(null);
        }
    };

    /* ═══════════════════════════════════════════════════════════════════
     * CSV File Upload
     * ═══════════════════════════════════════════════════════════════════ */

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast({ title: 'File too large', description: 'Maximum file size is 5 MB', variant: 'destructive' });
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            if (text) setBulkText(text);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    /* ═══════════════════════════════════════════════════════════════════
     * Export contacts to CSV
     * ═══════════════════════════════════════════════════════════════════ */

    const exportContacts = async () => {
        if (!activeList) return;
        try {
            const res = await fetch(`/api/v1/mailing-lists/${activeList.id}/contacts?limit=10000`);
            if (!res.ok) { toast({ title: 'Export failed', variant: 'destructive' }); return; }
            const json = await res.json();
            const rows = (json.data ?? []) as Contact[];

            const csvRows = ['Email,First Name,Last Name,Subscribed,Date Added'];
            for (const c of rows) {
                const esc = (s: string | null) => {
                    if (!s) return '';
                    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
                };
                csvRows.push([
                    esc(c.email),
                    esc(c.firstName),
                    esc(c.lastName),
                    c.unsubscribed ? 'No' : 'Yes',
                    new Date(c.createdAt).toLocaleDateString(),
                ].join(','));
            }

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${activeList.name.replace(/[^a-z0-9]/gi, '_')}_contacts.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: `Exported ${rows.length} contacts` });
        } catch {
            toast({ title: 'Export failed', variant: 'destructive' });
        }
    };

    /* ═══════════════════════════════════════════════════════════════════
     * Navigation helpers
     * ═══════════════════════════════════════════════════════════════════ */

    const openListDetail = (list: MailingList) => {
        setActiveList(list);
        setContactsPage(0);
        setContactSearch('');
        setView('detail');
        fetchContacts(list.id, 0);
    };

    const backToLists = () => {
        setView('lists');
        setActiveList(null);
        setContacts([]);
        setContactsPagination(null);
        setContactSearch('');
    };

    const openCreate = () => {
        setEditing(null);
        setFormName('');
        setFormDesc('');
        setDialogOpen(true);
    };

    const openEdit = (list: MailingList) => {
        setEditing(list);
        setFormName(list.name);
        setFormDesc(list.description ?? '');
        setDialogOpen(true);
    };

    const resetAddForm = () => {
        setSingleEmail('');
        setSingleFirstName('');
        setSingleLastName('');
        setBulkText('');
    };

    const openAddContact = () => {
        resetAddForm();
        setAddContactOpen(true);
    };

    const changePage = (newPage: number) => {
        if (!activeList) return;
        setContactsPage(newPage);
        fetchContacts(activeList.id, newPage);
    };

    /* ═══════════════════════════════════════════════════════════════════
     * Render: Lists View
     * ═══════════════════════════════════════════════════════════════════ */

    if (view === 'lists') return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Mailing Lists</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Build and manage your contact lists for email campaigns - subscribers, leads, prospects, and more.
                    </p>
                </div>
                <Button onClick={openCreate}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New List
                </Button>
            </div>

            {/* KPI Cards */}
            {!loading && lists.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-primary/10 p-2.5">
                                    <ContactRound className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{lists.length}</p>
                                    <p className="text-xs text-muted-foreground">Total Lists</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-emerald-500/10 p-2.5">
                                    <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{totalContacts.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">Total Contacts</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-blue-500/10 p-2.5">
                                    <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{activeLists}</p>
                                    <p className="text-xs text-muted-foreground">Active Lists{archivedLists > 0 && ` / ${archivedLists} archived`}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Lists Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ContactRound className="h-5 w-5 text-primary" />
                                Your Lists
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Click a list to view and manage its contacts.
                            </CardDescription>
                        </div>
                        {lists.length > 0 && (
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                        </div>
                    ) : lists.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="mx-auto rounded-full bg-primary/10 h-16 w-16 flex items-center justify-center mb-4">
                                <ContactRound className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold">Create your first mailing list</h3>
                            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                                A mailing list contains the email addresses and names of your contacts - subscribers, prospects, customers, event attendees, and anyone you want to reach via email campaigns.
                            </p>
                            <Button onClick={openCreate} className="mt-5">
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Create Mailing List
                            </Button>
                        </div>
                    ) : filteredLists.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-sm text-muted-foreground">No lists match the selected filter.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>List Name</TableHead>
                                    <TableHead className="w-[120px]">Contacts</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead className="w-[130px]">Last Updated</TableHead>
                                    <TableHead className="w-[50px]" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLists.map((list) => (
                                    <TableRow key={list.id} className="cursor-pointer group" onClick={() => openListDetail(list)}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium group-hover:text-primary transition-colors">{list.name}</p>
                                                {list.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{list.description}</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="font-medium tabular-nums">{list.contactCount.toLocaleString()}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={cn('text-xs capitalize', STATUS_STYLES[list.status])}>
                                                {list.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                                            {new Date(list.updatedAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openListDetail(list)}>
                                                        <Users className="h-4 w-4 mr-2" />
                                                        View Contacts
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openEdit(list)}>
                                                        <Pencil className="h-4 w-4 mr-2" />
                                                        Edit List
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(list)}>
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete List
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit List Dialog */}
            {renderListDialog()}

            {/* Delete confirmation */}
            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
                title="Delete Mailing List"
                description={`Permanently delete "${deleteTarget?.name}" and all ${deleteTarget?.contactCount ?? 0} contacts? This cannot be undone.`}
                confirmLabel="Delete List"
                variant="destructive"
                onConfirm={handleDeleteList}
            />
        </div>
    );

    /* ═══════════════════════════════════════════════════════════════════
     * Render: Detail View (contacts of a list)
     * ═══════════════════════════════════════════════════════════════════ */

    return (
        <div className="space-y-6 pb-12">
            {/* Back navigation + list header */}
            <div>
                <Button variant="ghost" size="sm" onClick={backToLists} className="mb-3 -ml-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Back to Lists
                </Button>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">{activeList?.name}</h1>
                        {activeList?.description && (
                            <p className="text-sm text-muted-foreground mt-1">{activeList.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                            <Badge variant="secondary" className={cn('text-xs capitalize', STATUS_STYLES[activeList?.status ?? 'active'])}>
                                {activeList?.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {contactsPagination?.total ?? activeList?.contactCount ?? 0} contacts
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={() => openEdit(activeList!)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit list details</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={exportContacts} disabled={(contactsPagination?.total ?? 0) === 0}>
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Export contacts as CSV</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <Button size="sm" onClick={openAddContact}>
                            <UserPlus className="h-4 w-4 mr-1.5" />
                            Add Contacts
                        </Button>
                    </div>
                </div>
            </div>

            {/* Contacts Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Contacts</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by email or name..."
                                value={contactSearch}
                                onChange={e => setContactSearch(e.target.value)}
                                className="pl-8 h-9"
                            />
                            {contactSearch && (
                                <button onClick={() => setContactSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {contactsLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : contacts.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="mx-auto rounded-full bg-muted h-14 w-14 flex items-center justify-center mb-4">
                                <MailPlus className="h-7 w-7 text-muted-foreground" />
                            </div>
                            <h3 className="text-base font-semibold">No contacts yet</h3>
                            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
                                Add contacts manually or import them from a CSV file to get started.
                            </p>
                            <div className="flex justify-center gap-3 mt-5">
                                <Button variant="outline" onClick={() => { resetAddForm(); setAddContactOpen(true); }}>
                                    <UserPlus className="h-4 w-4 mr-1.5" />
                                    Add Manually
                                </Button>
                                <Button onClick={() => { resetAddForm(); setAddContactOpen(true); }}>
                                    <FileUp className="h-4 w-4 mr-1.5" />
                                    Import CSV
                                </Button>
                            </div>
                        </div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="text-center py-10">
                            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No contacts match &ldquo;{contactSearch}&rdquo;</p>
                        </div>
                    ) : (
                        <>
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Email Address</TableHead>
                                            <TableHead>First Name</TableHead>
                                            <TableHead>Last Name</TableHead>
                                            <TableHead className="w-[110px]">Status</TableHead>
                                            <TableHead className="w-[110px]">Date Added</TableHead>
                                            <TableHead className="w-[50px]" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredContacts.map((c) => (
                                            <TableRow key={c.id}>
                                                <TableCell>
                                                    <span className="text-sm">{c.email}</span>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {c.firstName || <span className="text-muted-foreground">-</span>}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {c.lastName || <span className="text-muted-foreground">-</span>}
                                                </TableCell>
                                                <TableCell>
                                                    {c.unsubscribed ? (
                                                        <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Unsubscribed</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Subscribed</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground tabular-nums">
                                                    {new Date(c.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteContactId(c.id)}>
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Remove contact</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {contactsPagination && contactsPagination.total > PAGE_SIZE && !contactSearch && (
                                <div className="flex items-center justify-between pt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {contactsPage * PAGE_SIZE + 1}–{Math.min((contactsPage + 1) * PAGE_SIZE, contactsPagination.total)} of {contactsPagination.total.toLocaleString()}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={contactsPage === 0} onClick={() => changePage(contactsPage - 1)}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm text-muted-foreground px-2 tabular-nums">
                                            Page {contactsPage + 1} of {Math.ceil(contactsPagination.total / PAGE_SIZE)}
                                        </span>
                                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={!contactsPagination.hasMore} onClick={() => changePage(contactsPage + 1)}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Dialogs */}
            {renderListDialog()}
            {renderAddContactDialog()}

            {/* Delete contact confirmation */}
            <ConfirmDialog
                open={!!deleteContactId}
                onOpenChange={(open) => { if (!open) setDeleteContactId(null); }}
                title="Remove Contact"
                description="Remove this contact from the list? They can be re-added later."
                confirmLabel="Remove"
                variant="destructive"
                onConfirm={handleDeleteContact}
            />

            {/* Delete list confirmation */}
            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
                title="Delete Mailing List"
                description={`Permanently delete "${deleteTarget?.name}" and all ${deleteTarget?.contactCount ?? 0} contacts? This cannot be undone.`}
                confirmLabel="Delete List"
                variant="destructive"
                onConfirm={handleDeleteList}
            />
        </div>
    );

    /* ═══════════════════════════════════════════════════════════════════
     * Sub-Renders
     * ═══════════════════════════════════════════════════════════════════ */

    function renderListDialog() {
        return (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit List' : 'Create Mailing List'}</DialogTitle>
                        <DialogDescription>
                            {editing
                                ? 'Update the name and description for this list.'
                                : 'Give your list a name. You can add contacts after creating it.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="list-name">List Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="list-name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="e.g. Newsletter Subscribers, March Event Leads"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter' && formName.trim()) saveList(); }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="list-desc">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                            <Textarea
                                id="list-desc"
                                value={formDesc}
                                onChange={(e) => setFormDesc(e.target.value)}
                                placeholder="Describe who is in this list and what it's used for..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={saveList} disabled={!formName.trim() || saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editing ? 'Save Changes' : 'Create List'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    function renderAddContactDialog() {
        return (
            <Dialog open={addContactOpen} onOpenChange={(open) => { setAddContactOpen(open); if (!open) resetAddForm(); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Contacts to {activeList?.name}</DialogTitle>
                        <DialogDescription>
                            Add contacts individually or import a list from a CSV file.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="manual" className="mt-1">
                        <TabsList className="w-full">
                            <TabsTrigger value="manual" className="flex-1">
                                <UserPlus className="h-4 w-4 mr-1.5" />
                                Add Manually
                            </TabsTrigger>
                            <TabsTrigger value="import" className="flex-1">
                                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                                Import CSV
                            </TabsTrigger>
                        </TabsList>

                        {/* Manual entry tab */}
                        <TabsContent value="manual" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="contact-email">Email Address <span className="text-red-500">*</span></Label>
                                <Input
                                    id="contact-email"
                                    value={singleEmail}
                                    onChange={(e) => setSingleEmail(e.target.value)}
                                    type="email"
                                    placeholder="john@example.com"
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddContacts('single'); }}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="contact-fn">First Name</Label>
                                    <Input
                                        id="contact-fn"
                                        value={singleFirstName}
                                        onChange={(e) => setSingleFirstName(e.target.value)}
                                        placeholder="John"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact-ln">Last Name</Label>
                                    <Input
                                        id="contact-ln"
                                        value={singleLastName}
                                        onChange={(e) => setSingleLastName(e.target.value)}
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            <Separator />

                            <div className="flex justify-end">
                                <Button onClick={() => handleAddContacts('single')} disabled={addingContacts || !singleEmail.trim()}>
                                    {addingContacts && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Add Contact
                                </Button>
                            </div>
                        </TabsContent>

                        {/* Import CSV tab */}
                        <TabsContent value="import" className="space-y-4 mt-4">
                            {/* Upload area */}
                            <div
                                className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const file = e.dataTransfer.files[0];
                                    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => { if (ev.target?.result) setBulkText(ev.target.result as string); };
                                        reader.readAsText(file);
                                    } else {
                                        toast({ title: 'Invalid file', description: 'Please upload a .csv or .txt file', variant: 'destructive' });
                                    }
                                }}
                            >
                                <FileUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm font-medium">Drop a CSV file here or click to upload</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    CSV format: Email, First Name, Last Name (max 5 MB)
                                </p>
                            </div>
                            <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />

                            <div className="relative">
                                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
                                    <Separator />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-background px-2 text-xs text-muted-foreground">or paste directly</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Paste contacts</Label>
                                <Textarea
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    placeholder={"email,first_name,last_name\njohn@example.com,John,Doe\njane@example.com,Jane,Smith\nlead@company.com,Alex,"}
                                    rows={7}
                                    className="font-mono text-xs"
                                />
                            </div>

                            {/* Preview */}
                            {csvPreview && csvPreview.contacts.length > 0 && (
                                <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            <span className="text-sm font-medium">
                                                {csvPreview.contacts.length} valid contact{csvPreview.contacts.length !== 1 ? 's' : ''} found
                                            </span>
                                        </div>
                                        {csvPreview.errors > 0 && (
                                            <span className="text-xs text-amber-600 flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                {csvPreview.errors} invalid row{csvPreview.errors !== 1 ? 's' : ''} skipped
                                            </span>
                                        )}
                                    </div>
                                    {csvPreview.hasHeader && (
                                        <p className="text-xs text-muted-foreground">Header row detected and excluded from import.</p>
                                    )}
                                    {/* Preview first 5 rows */}
                                    <div className="border rounded-md overflow-hidden bg-background">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-xs h-8">Email</TableHead>
                                                    <TableHead className="text-xs h-8">First Name</TableHead>
                                                    <TableHead className="text-xs h-8">Last Name</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {csvPreview.contacts.slice(0, 5).map((c, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="text-xs py-1.5">{c.email}</TableCell>
                                                        <TableCell className="text-xs py-1.5">{c.firstName || <span className="text-muted-foreground">-</span>}</TableCell>
                                                        <TableCell className="text-xs py-1.5">{c.lastName || <span className="text-muted-foreground">-</span>}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        {csvPreview.contacts.length > 5 && (
                                            <div className="text-center py-1.5 text-xs text-muted-foreground border-t">
                                                +{csvPreview.contacts.length - 5} more contacts
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {csvPreview && csvPreview.contacts.length === 0 && bulkText.trim() && (
                                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-destructive">No valid contacts found</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Make sure each row contains a valid email address. Supported formats: CSV, TSV, or one email per line.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Separator />

                            <div className="flex justify-end">
                                <Button
                                    onClick={() => handleAddContacts('bulk')}
                                    disabled={addingContacts || !csvPreview || csvPreview.contacts.length === 0}
                                >
                                    {addingContacts && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Import {csvPreview && csvPreview.contacts.length > 0 ? `${csvPreview.contacts.length} Contact${csvPreview.contacts.length !== 1 ? 's' : ''}` : 'Contacts'}
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        );
    }
}
