'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
    PlusCircle, MoreHorizontal, Users, Upload, Trash2,
    Pencil, MailPlus, ContactRound, UserPlus, Download,
    AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────── */

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

interface MailingListContact {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    properties: Record<string, unknown>;
    unsubscribed: boolean;
    createdAt: string;
}

/* ── Constants ──────────────────────────────────────────────────────── */

const statusStyles: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    archived: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

/* ── Component ──────────────────────────────────────────────────────── */

export default function MailingListsPage() {
    const [lists, setLists] = useState<MailingList[]>([]);
    const [loading, setLoading] = useState(true);

    // List create/edit dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<MailingList | null>(null);
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [saving, setSaving] = useState(false);

    // Contacts dialog
    const [contactsOpen, setContactsOpen] = useState(false);
    const [activeList, setActiveList] = useState<MailingList | null>(null);
    const [contacts, setContacts] = useState<MailingListContact[]>([]);
    const [contactsLoading, setContactsLoading] = useState(false);

    // Add contacts
    const [addContactOpen, setAddContactOpen] = useState(false);
    const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
    const [singleEmail, setSingleEmail] = useState('');
    const [singleFirstName, setSingleFirstName] = useState('');
    const [singleLastName, setSingleLastName] = useState('');
    const [bulkText, setBulkText] = useState('');
    const [addingContacts, setAddingContacts] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Delete
    const [deleteTarget, setDeleteTarget] = useState<MailingList | null>(null);

    /* ── Fetch lists ────────────────────────────────── */
    const fetchLists = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/mailing-lists');
            if (res.ok) {
                const json = await res.json();
                setLists(json.data ?? []);
            }
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLists(); }, [fetchLists]);

    /* ── Fetch contacts for a list ──────────────────── */
    const fetchContacts = useCallback(async (listId: string) => {
        setContactsLoading(true);
        try {
            const res = await fetch(`/api/v1/mailing-lists/${listId}/contacts?limit=200`);
            if (res.ok) {
                const json = await res.json();
                setContacts(json.data ?? []);
            }
        } catch { /* ignore */ } finally {
            setContactsLoading(false);
        }
    }, []);

    /* ── Save list ──────────────────────────────────── */
    const saveList = async () => {
        if (!formName.trim()) return;
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                name: formName,
                description: formDesc,
                status: 'active',
            };
            if (editing) payload.id = editing.id;

            const res = await fetch('/api/v1/mailing-lists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setDialogOpen(false);
                fetchLists();
                toast({ title: editing ? 'List updated' : 'Mailing list created' });
            } else {
                const json = await res.json();
                toast({ title: 'Error', description: json.error ?? 'Failed to save list', variant: 'destructive' });
            }
        } finally {
            setSaving(false);
        }
    };

    /* ── Delete list ────────────────────────────────── */
    const handleDelete = async () => {
        if (!deleteTarget) return;
        const res = await fetch(`/api/v1/mailing-lists/${deleteTarget.id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchLists();
            toast({ title: 'Mailing list deleted' });
        }
        setDeleteTarget(null);
    };

    /* ── Add contacts ───────────────────────────────── */
    const handleAddContacts = async () => {
        if (!activeList) return;
        setAddingContacts(true);
        try {
            let contactsToAdd: Array<{ email: string; firstName?: string; lastName?: string }> = [];

            if (addMode === 'single') {
                if (!singleEmail.includes('@')) {
                    toast({ title: 'Invalid email', variant: 'destructive' });
                    return;
                }
                contactsToAdd = [{ email: singleEmail, firstName: singleFirstName || undefined, lastName: singleLastName || undefined }];
            } else {
                // Parse bulk text — one email per line, or CSV: email,firstName,lastName
                const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
                for (const line of lines) {
                    const parts = line.split(',').map(p => p.trim());
                    if (parts[0] && parts[0].includes('@')) {
                        contactsToAdd.push({
                            email: parts[0],
                            firstName: parts[1] || undefined,
                            lastName: parts[2] || undefined,
                        });
                    }
                }
            }

            if (contactsToAdd.length === 0) {
                toast({ title: 'No valid contacts to add', variant: 'destructive' });
                return;
            }

            const res = await fetch(`/api/v1/mailing-lists/${activeList.id}/contacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contacts: contactsToAdd }),
            });

            if (res.ok) {
                const json = await res.json();
                const d = json.data;
                toast({ title: `Added ${d.added} contact${d.added !== 1 ? 's' : ''}${d.skipped > 0 ? ` (${d.skipped} duplicates skipped)` : ''}` });
                setAddContactOpen(false);
                setSingleEmail('');
                setSingleFirstName('');
                setSingleLastName('');
                setBulkText('');
                fetchContacts(activeList.id);
                fetchLists(); // refresh counts
            } else {
                const json = await res.json();
                toast({ title: 'Error', description: json.error ?? 'Failed to add contacts', variant: 'destructive' });
            }
        } finally {
            setAddingContacts(false);
        }
    };

    /* ── Remove contact ─────────────────────────────── */
    const removeContact = async (contactId: string) => {
        if (!activeList) return;
        const res = await fetch(`/api/v1/mailing-lists/${activeList.id}/contacts?contactId=${contactId}`, { method: 'DELETE' });
        if (res.ok) {
            toast({ title: 'Contact removed' });
            fetchContacts(activeList.id);
            fetchLists();
        }
    };

    /* ── CSV file upload ────────────────────────────── */
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            if (text) {
                // Strip CSV header if it looks like one
                const lines = text.split('\n');
                const firstLine = lines[0]?.toLowerCase() ?? '';
                if (firstLine.includes('email') && (firstLine.includes('first') || firstLine.includes('name'))) {
                    setBulkText(lines.slice(1).join('\n'));
                } else {
                    setBulkText(text);
                }
                setAddMode('bulk');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    /* ── Open edit dialog ───────────────────────────── */
    const openEdit = (list: MailingList) => {
        setEditing(list);
        setFormName(list.name);
        setFormDesc(list.description ?? '');
        setDialogOpen(true);
    };

    const openCreate = () => {
        setEditing(null);
        setFormName('');
        setFormDesc('');
        setDialogOpen(true);
    };

    const openContacts = (list: MailingList) => {
        setActiveList(list);
        setContactsOpen(true);
        fetchContacts(list.id);
    };

    /* ── Render ─────────────────────────────────────── */
    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Mailing Lists</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage external contact lists for campaigns — newsletter subscribers, leads, and contacts outside your product.
                    </p>
                </div>
                <Button onClick={openCreate}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New List
                </Button>
            </div>

            {/* Lists Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ContactRound className="h-5 w-5 text-primary" />
                        Your Mailing Lists
                    </CardTitle>
                    <CardDescription>
                        External contact lists you can target when sending campaigns.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : lists.length === 0 ? (
                        <div className="text-center py-12">
                            <ContactRound className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                            <h3 className="text-lg font-medium">No mailing lists yet</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                                Create a mailing list to send campaigns to contacts who aren&apos;t users of your product — newsletters, leads, event attendees, etc.
                            </p>
                            <Button onClick={openCreate} className="mt-4">
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Create Your First List
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Contacts</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="w-[60px]" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lists.map((list) => (
                                    <TableRow key={list.id} className="cursor-pointer" onClick={() => openContacts(list)}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{list.name}</p>
                                                {list.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1">{list.description}</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="font-medium">{list.contactCount.toLocaleString()}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={cn('text-xs capitalize', statusStyles[list.status])}>
                                                {list.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(list.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openContacts(list)}>
                                                        <Users className="h-4 w-4 mr-2" />
                                                        View Contacts
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openEdit(list)}>
                                                        <Pencil className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(list)}>
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Mailing List' : 'Create Mailing List'}</DialogTitle>
                        <DialogDescription>
                            {editing ? 'Update the list details.' : 'Create a new list to manage external contacts.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>List Name</Label>
                            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Newsletter Subscribers" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                            <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Describe who this list contains..." rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={saveList} disabled={!formName.trim() || saving}>
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            {editing ? 'Save Changes' : 'Create List'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Contacts Dialog */}
            <Dialog open={contactsOpen} onOpenChange={setContactsOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ContactRound className="h-5 w-5 text-primary" />
                            {activeList?.name ?? 'Contacts'}
                        </DialogTitle>
                        <DialogDescription>
                            {activeList?.description || 'Manage contacts in this mailing list.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-between py-2">
                        <p className="text-sm text-muted-foreground">
                            {activeList?.contactCount ?? 0} contact{(activeList?.contactCount ?? 0) !== 1 ? 's' : ''}
                        </p>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setAddMode('single'); setAddContactOpen(true); }}>
                                <UserPlus className="h-4 w-4 mr-1.5" />
                                Add Contact
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setAddMode('bulk'); setAddContactOpen(true); }}>
                                <Upload className="h-4 w-4 mr-1.5" />
                                Import
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto border rounded-md">
                        {contactsLoading ? (
                            <div className="p-8 space-y-3">
                                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                            </div>
                        ) : contacts.length === 0 ? (
                            <div className="text-center py-12">
                                <MailPlus className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">No contacts in this list yet.</p>
                                <Button size="sm" className="mt-3" onClick={() => { setAddMode('single'); setAddContactOpen(true); }}>
                                    <UserPlus className="h-4 w-4 mr-1.5" />
                                    Add First Contact
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Added</TableHead>
                                        <TableHead className="w-[40px]" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {contacts.map((c) => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-mono text-sm">{c.email}</TableCell>
                                            <TableCell className="text-sm">
                                                {[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}
                                            </TableCell>
                                            <TableCell>
                                                {c.unsubscribed ? (
                                                    <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Unsubscribed</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Subscribed</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(c.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeContact(c.id)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Add Contacts Dialog */}
            <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{addMode === 'single' ? 'Add Contact' : 'Import Contacts'}</DialogTitle>
                        <DialogDescription>
                            {addMode === 'single'
                                ? 'Add a single contact to your mailing list.'
                                : 'Paste email addresses or upload a CSV file.'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Mode tabs */}
                    <div className="flex gap-2 border-b pb-3">
                        <Button
                            variant={addMode === 'single' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAddMode('single')}
                        >
                            <UserPlus className="h-4 w-4 mr-1.5" />
                            Single
                        </Button>
                        <Button
                            variant={addMode === 'bulk' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAddMode('bulk')}
                        >
                            <Upload className="h-4 w-4 mr-1.5" />
                            Bulk Import
                        </Button>
                    </div>

                    {addMode === 'single' ? (
                        <div className="space-y-3 py-2">
                            <div className="space-y-1.5">
                                <Label>Email <span className="text-red-500">*</span></Label>
                                <Input value={singleEmail} onChange={(e) => setSingleEmail(e.target.value)} type="email" placeholder="contact@example.com" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>First Name</Label>
                                    <Input value={singleFirstName} onChange={(e) => setSingleFirstName(e.target.value)} placeholder="John" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Last Name</Label>
                                    <Input value={singleLastName} onChange={(e) => setSingleLastName(e.target.value)} placeholder="Doe" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 py-2">
                            <div className="space-y-1.5">
                                <Label>Paste contacts <span className="text-muted-foreground font-normal">(one per line: email or email,firstName,lastName)</span></Label>
                                <Textarea
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    placeholder={"john@example.com,John,Doe\njane@example.com,Jane,Smith\nlead@company.com"}
                                    rows={8}
                                    className="font-mono text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                    <Download className="h-4 w-4 mr-1.5" />
                                    Upload CSV
                                </Button>
                                <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
                                <span className="text-xs text-muted-foreground">
                                    CSV format: email,firstName,lastName
                                </span>
                            </div>
                            {bulkText && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                    {bulkText.split('\n').filter(l => l.trim() && l.includes('@')).length} valid email{bulkText.split('\n').filter(l => l.trim() && l.includes('@')).length !== 1 ? 's' : ''} detected
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddContactOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddContacts} disabled={addingContacts}>
                            {addingContacts ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            {addMode === 'single' ? 'Add Contact' : 'Import Contacts'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
                title="Delete Mailing List"
                description={`Are you sure you want to delete "${deleteTarget?.name}"? This will remove all contacts in this list. This action cannot be undone.`}
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={handleDelete}
            />
        </div>
    );
}
