'use client';

/* ==========================================================================
 * Email Builder — Dual-Mode Professional Email Editor
 *
 * Modes:
 *   Visual  — Drag-and-drop block builder (palette + canvas + properties)
 *   Code    — Raw HTML editor with syntax-aware textarea + variable panel
 *   Preview — Rendered HTML in sandboxed iframe
 *
 * Features:
 *  - Undo/redo with Ctrl+Z / Ctrl+Y shortcuts
 *  - Template picker dialog (11 professional templates)
 *  - Desktop/mobile responsive preview
 *  - Personalization variable inserter (30 variables across 4 categories)
 *  - Save to server (POST /api/v1/email-templates)
 *  - Load from server (via templateId prop)
 *  - HTML export / download
 *  - localStorage auto-save
 *  - Global styles (background, fonts, width, border radius)
 *  - Context-aware: works standalone, in campaigns, or in flows
 * ========================================================================== */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowLeft, Monitor, Smartphone, Eye, Pencil,
  Undo2, Redo2, Download, Copy, Settings2,
  Type, Heading, ImageIcon, MousePointerClick,
  Minus, Space, Columns, Share2, FileText, Code,
  Save, Loader2, Check, Variable, User, Building2,
  Sparkles, AtSign, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EmailBlock, BlockType, GlobalStyles, EmailTemplate } from './types';
import { createBlock, PALETTE_ITEMS, DEFAULT_GLOBAL_STYLES, VARIABLE_CATEGORIES } from './types';
import { STARTER_TEMPLATES } from './templates';
import { renderEmailHtml } from './html-renderer';
import { BuilderCanvas } from './canvas';
import { BlockEditor } from './block-editor';

/* ── Props ───────────────────────────────────────────────────────────── */

interface EmailBuilderProps {
  /** Load an existing template by ID from the server */
  templateId?: string;
  /** Context the builder was opened from */
  context?: 'standalone' | 'campaign' | 'flow';
  /** Campaign ID when opened from a campaign builder */
  campaignId?: string;
}

/* ── Block palette icon map ──────────────────────────────────────────── */

const BLOCK_ICONS: Record<BlockType, React.ElementType> = {
  text: Type,
  heading: Heading,
  image: ImageIcon,
  button: MousePointerClick,
  divider: Minus,
  spacer: Space,
  columns: Columns,
  social: Share2,
  footer: FileText,
};

/* ── Category groups for the palette ─────────────────────────────────── */

const PALETTE_CATEGORIES: { label: string; types: BlockType[] }[] = [
  { label: 'Content', types: ['heading', 'text', 'image', 'button'] },
  { label: 'Layout', types: ['columns', 'divider', 'spacer'] },
  { label: 'Compliance', types: ['social', 'footer'] },
];

/* ── Local storage key ───────────────────────────────────────────────── */

const STORAGE_KEY = 'lifecycleos_email_builder';

/* ── Variable Inserter (reusable in Code mode + Subject bar) ─────────── */

function VariablePanel({ onInsert, compact }: { onInsert: (v: string) => void; compact?: boolean }) {
  const [search, setSearch] = useState('');

  const filtered = VARIABLE_CATEGORIES.map((cat) => ({
    ...cat,
    variables: cat.variables.filter(
      (v) =>
        v.key.toLowerCase().includes(search.toLowerCase()) ||
        v.label.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((cat) => cat.variables.length > 0);

  const categoryIcons: Record<string, React.ElementType> = {
    Contact: User,
    Account: Building2,
    Lifecycle: Sparkles,
    System: AtSign,
  };

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]">
            <Variable className="h-3 w-3" />
            Variables
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="end">
          <div className="p-2 border-b">
            <Input
              placeholder="Search variables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <ScrollArea className="h-56">
            <div className="p-1.5 space-y-2">
              {filtered.map((cat) => {
                const Icon = categoryIcons[cat.name] ?? Variable;
                return (
                  <div key={cat.name}>
                    <div className="flex items-center gap-1 px-1.5 py-0.5">
                      <Icon className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{cat.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-0.5 mt-0.5">
                      {cat.variables.map((v) => (
                        <button
                          key={v.key}
                          onClick={() => onInsert(`{{${v.key}}}`)}
                          className="rounded px-1.5 py-1 text-left hover:bg-muted transition-colors"
                        >
                          <code className="text-[10px] font-mono text-primary block">{`{{${v.key}}}`}</code>
                          <span className="text-[9px] text-muted-foreground">{v.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  }

  // Full panel for code mode sidebar
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="text-xs font-semibold mb-2">Personalization Variables</h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs pl-7"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {filtered.map((cat) => {
            const Icon = categoryIcons[cat.name] ?? Variable;
            return (
              <div key={cat.name}>
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{cat.name}</span>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {cat.variables.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => onInsert(`{{${v.key}}}`)}
                      className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted transition-colors group"
                    >
                      <div>
                        <code className="text-[11px] font-mono text-primary">{`{{${v.key}}}`}</code>
                        <p className="text-[10px] text-muted-foreground">{v.label}</p>
                      </div>
                      <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">click to insert</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No matching variables.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────── */

export default function EmailBuilder({ templateId, context, campaignId }: EmailBuilderProps) {
  const router = useRouter();

  /* ── State ─────────────────────────────────────────────── */
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [templateName, setTemplateName] = useState('Untitled Email');
  const [globalStyles, setGlobalStyles] = useState<GlobalStyles>({ ...DEFAULT_GLOBAL_STYLES });
  const [editorMode, setEditorMode] = useState<'visual' | 'code' | 'preview'>('visual');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [showHtmlDialog, setShowHtmlDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showStylesPanel, setShowStylesPanel] = useState(false);

  // Code mode state
  const [codeHtml, setCodeHtml] = useState('');
  const codeRef = useRef<HTMLTextAreaElement>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [serverTemplateId, setServerTemplateId] = useState<string | null>(templateId ?? null);
  const [loadingTemplate, setLoadingTemplate] = useState(!!templateId);

  /* ── History (undo / redo) ─────────────────────── */
  const [history, setHistory] = useState<EmailBlock[][]>([[]]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const isUndoRedo = useRef(false);

  const pushHistory = useCallback((newBlocks: EmailBlock[]) => {
    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIdx + 1);
      return [...trimmed, newBlocks].slice(-50);
    });
    setHistoryIdx((prev) => Math.min(prev + 1, 49));
  }, [historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    isUndoRedo.current = true;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    setBlocks(history[newIdx]);
    setSelectedBlockId(null);
  }, [history, historyIdx]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    isUndoRedo.current = true;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    setBlocks(history[newIdx]);
    setSelectedBlockId(null);
  }, [history, historyIdx]);

  /* ── Keyboard shortcuts ────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when typing in code editor
      if (editorMode === 'code' && e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if (e.key === 'Delete' && selectedBlockId && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        handleDeleteBlock(selectedBlockId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, selectedBlockId, editorMode]);

  /* ── Block operations ──────────────────────────── */

  const updateBlocks = useCallback((newBlocks: EmailBlock[]) => {
    setBlocks(newBlocks);
    pushHistory(newBlocks);
  }, [pushHistory]);

  const handleDropNewBlock = useCallback((type: BlockType, index: number) => {
    const block = createBlock(type);
    const newBlocks = [...blocks];
    newBlocks.splice(index, 0, block);
    updateBlocks(newBlocks);
    setSelectedBlockId(block.id);
  }, [blocks, updateBlocks]);

  const handleReorderBlock = useCallback((fromIndex: number, toIndex: number) => {
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved);
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  const handleDeleteBlock = useCallback((id: string) => {
    const newBlocks = blocks.filter((b) => b.id !== id);
    updateBlocks(newBlocks);
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [blocks, selectedBlockId, updateBlocks]);

  const handleDuplicateBlock = useCallback((id: string) => {
    const index = blocks.findIndex((b) => b.id === id);
    if (index === -1) return;
    const original = blocks[index];
    const copy: EmailBlock = {
      ...JSON.parse(JSON.stringify(original)),
      id: `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, copy);
    updateBlocks(newBlocks);
    setSelectedBlockId(copy.id);
  }, [blocks, updateBlocks]);

  const handleMoveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex((b) => b.id === id);
    if (index === -1) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[target]] = [newBlocks[target], newBlocks[index]];
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  const handleBlockChange = useCallback((updated: EmailBlock) => {
    const newBlocks = blocks.map((b) => (b.id === updated.id ? updated : b));
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  /* ── Template loading ──────────────────────────── */

  const loadTemplate = useCallback((template: EmailTemplate) => {
    const cloned: EmailBlock[] = JSON.parse(JSON.stringify(template.blocks));
    cloned.forEach((b) => { b.id = `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; });
    setBlocks(cloned);
    setSubject(template.subject);
    setPreheader(template.preheaderText);
    setTemplateName(template.name);
    setGlobalStyles({ ...template.globalStyles });
    setHistory([cloned]);
    setHistoryIdx(0);
    setSelectedBlockId(null);
    setShowTemplateDialog(false);
  }, []);

  /* ── Load template from server ─────────────────── */
  useEffect(() => {
    if (!templateId) {
      // Show template picker on first mount if no existing template
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) setShowTemplateDialog(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingTemplate(true);
        const res = await fetch(`/api/v1/email-templates/${templateId}`);
        if (res.ok && !cancelled) {
          const json = await res.json();
          const t = json.data;
          if (t) {
            setTemplateName(t.name ?? 'Untitled Email');
            setSubject(t.subject ?? '');
            setPreheader(t.previewText ?? '');
            // If bodyHtml exists, load into code mode
            if (t.bodyHtml) {
              setCodeHtml(t.bodyHtml);
            }
            setServerTemplateId(t.id);
          }
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoadingTemplate(false);
      }
    })();
    return () => { cancelled = true; };
  }, [templateId]);

  /* ── Mode switching ────────────────────────────── */
  const switchMode = useCallback((mode: 'visual' | 'code' | 'preview') => {
    if (mode === editorMode) return;

    // Visual → Code: render blocks to HTML
    if (editorMode === 'visual' && mode === 'code') {
      const html = renderEmailHtml(blocks, globalStyles, subject, preheader);
      setCodeHtml(html);
    }

    // Code → Visual: blocks stay as they were (code changes apply via save only)
    setEditorMode(mode);
    setSelectedBlockId(null);
  }, [editorMode, blocks, globalStyles, subject, preheader]);

  /* ── Auto-save to localStorage ─────────────────── */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (blocks.length > 0 || codeHtml) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          blocks, subject, preheader, templateName, globalStyles, codeHtml,
          serverTemplateId,
        }));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [blocks, subject, preheader, templateName, globalStyles, codeHtml, serverTemplateId]);

  /* ── Load saved state on mount (only if not loading from server) ── */
  useEffect(() => {
    if (templateId) return; // Skip localStorage if loading from server
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.blocks?.length > 0 || parsed.codeHtml) {
          setBlocks(parsed.blocks ?? []);
          setSubject(parsed.subject ?? '');
          setPreheader(parsed.preheader ?? '');
          setTemplateName(parsed.templateName ?? 'Untitled Email');
          setGlobalStyles(parsed.globalStyles ?? { ...DEFAULT_GLOBAL_STYLES });
          if (parsed.codeHtml) setCodeHtml(parsed.codeHtml);
          if (parsed.serverTemplateId) setServerTemplateId(parsed.serverTemplateId);
          setHistory([parsed.blocks ?? []]);
          if (parsed.blocks?.length > 0) setShowTemplateDialog(false);
        }
      }
    } catch { /* ignore */ }
  }, [templateId]);

  /* ── Save to server ────────────────────────────── */
  const saveToServer = useCallback(async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      // Generate HTML from blocks if in visual mode
      const bodyHtml = editorMode === 'code'
        ? codeHtml
        : renderEmailHtml(blocks, globalStyles, subject, preheader);

      // Extract variables used in the HTML
      const varRegex = /\{\{([^}]+)\}\}/g;
      const usedVars = new Set<string>();
      let match: RegExpExecArray | null;
      const scanText = `${subject} ${preheader} ${bodyHtml}`;
      while ((match = varRegex.exec(scanText)) !== null) {
        usedVars.add(match[1].trim());
      }

      // Map to variable definitions
      const allVars = VARIABLE_CATEGORIES.flatMap((c) => c.variables);
      const variables = Array.from(usedVars).map((key) => {
        const found = allVars.find((v) => v.key === key);
        return {
          key,
          label: found?.label ?? key,
          source: key.startsWith('account.') ? 'account'
            : key.startsWith('system.') || key.startsWith('company.') ? 'custom'
            : 'user',
          fallback: found?.example ?? '',
        };
      });

      const payload: Record<string, unknown> = {
        name: templateName,
        subject,
        previewText: preheader || null,
        bodyHtml,
        variables,
        status: 'active',
      };

      if (serverTemplateId) payload.id = serverTemplateId;

      const res = await fetch('/api/v1/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data?.id) setServerTemplateId(json.data.id);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);

        // If opened from campaign context, navigate back
        if (context === 'campaign') {
          setTimeout(() => router.push('/email'), 500);
        }
      }
    } catch (err) {
      console.error('Failed to save template:', err);
    } finally {
      setSaving(false);
    }
  }, [
    editorMode, codeHtml, blocks, globalStyles, subject, preheader,
    templateName, serverTemplateId, context, router,
  ]);

  /* ── Code mode variable insertion ──────────────── */
  const insertVariableInCode = useCallback((variable: string) => {
    const el = codeRef.current;
    if (!el) {
      setCodeHtml((prev) => prev + variable);
      return;
    }
    const start = el.selectionStart ?? codeHtml.length;
    const end = el.selectionEnd ?? codeHtml.length;
    const newVal = codeHtml.slice(0, start) + variable + codeHtml.slice(end);
    setCodeHtml(newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  }, [codeHtml]);

  /* ── Subject bar variable insertion ────────────── */
  const subjectRef = useRef<HTMLInputElement>(null);
  const preheaderRef = useRef<HTMLInputElement>(null);
  const [activeSubjectField, setActiveSubjectField] = useState<'subject' | 'preheader'>('subject');

  const insertVariableInSubject = useCallback((variable: string) => {
    if (activeSubjectField === 'subject') {
      const el = subjectRef.current;
      if (el) {
        const start = el.selectionStart ?? subject.length;
        const end = el.selectionEnd ?? subject.length;
        const newVal = subject.slice(0, start) + variable + subject.slice(end);
        setSubject(newVal);
        setTimeout(() => { el.focus(); el.setSelectionRange(start + variable.length, start + variable.length); }, 0);
      } else {
        setSubject((prev) => prev + variable);
      }
    } else {
      const el = preheaderRef.current;
      if (el) {
        const start = el.selectionStart ?? preheader.length;
        const end = el.selectionEnd ?? preheader.length;
        const newVal = preheader.slice(0, start) + variable + preheader.slice(end);
        setPreheader(newVal);
        setTimeout(() => { el.focus(); el.setSelectionRange(start + variable.length, start + variable.length); }, 0);
      } else {
        setPreheader((prev) => prev + variable);
      }
    }
  }, [activeSubjectField, subject, preheader]);

  /* ── HTML output ───────────────────────────────── */
  const htmlOutput = useMemo(() => {
    if (editorMode === 'code') return codeHtml;
    return renderEmailHtml(blocks, globalStyles, subject, preheader);
  }, [editorMode, codeHtml, blocks, globalStyles, subject, preheader]);

  const copyHtml = useCallback(() => {
    navigator.clipboard.writeText(htmlOutput);
  }, [htmlOutput]);

  const downloadHtml = useCallback(() => {
    const blob = new Blob([htmlOutput], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateName.toLowerCase().replace(/\s+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [htmlOutput, templateName]);

  /* ── Computed ──────────────────────────────────── */
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;

  // Loading state
  if (loadingTemplate) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading template...</p>
        </div>
      </div>
    );
  }

  /* ── Render ────────────────────────────────────── */
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden">
        {/* ═══ Top Toolbar ═══════════════════════════════════════════ */}
        <div className="flex items-center justify-between gap-3 border-b bg-background px-4 py-2">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => router.push(context === 'campaign' ? '/campaigns/new' : '/email')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to {context === 'campaign' ? 'Campaign' : 'Email'}</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6" />

            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="h-8 w-48 text-sm font-medium border-transparent hover:border-input focus:border-input"
            />

            {serverTemplateId && (
              <Badge variant="secondary" className="text-[10px]">
                Saved
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Undo / Redo (visual mode only) */}
            {editorMode === 'visual' && (
              <>
                <div className="flex items-center rounded-md border bg-muted/50">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={undo} disabled={historyIdx <= 0}>
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={redo} disabled={historyIdx >= history.length - 1}>
                        <Redo2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
                  </Tooltip>
                </div>
                <Separator orientation="vertical" className="h-6" />
              </>
            )}

            {/* Device toggle */}
            <div className="flex items-center rounded-md border bg-muted/50">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="sm"
                    className={cn('h-8 w-8 p-0', device === 'desktop' && 'bg-background shadow-sm')}
                    onClick={() => setDevice('desktop')}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Desktop</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="sm"
                    className={cn('h-8 w-8 p-0', device === 'mobile' && 'bg-background shadow-sm')}
                    onClick={() => setDevice('mobile')}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mobile</TooltipContent>
              </Tooltip>
            </div>

            {/* Mode toggle: Visual / Code / Preview */}
            <Tabs value={editorMode} onValueChange={(v) => switchMode(v as 'visual' | 'code' | 'preview')}>
              <TabsList className="h-8">
                <TabsTrigger value="visual" className="text-xs h-7 gap-1 px-3">
                  <Pencil className="h-3 w-3" /> Visual
                </TabsTrigger>
                <TabsTrigger value="code" className="text-xs h-7 gap-1 px-3">
                  <Code className="h-3 w-3" /> Code
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs h-7 gap-1 px-3">
                  <Eye className="h-3 w-3" /> Preview
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Separator orientation="vertical" className="h-6" />

            {/* Global styles (visual mode only) */}
            {editorMode === 'visual' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="sm"
                    className={cn('h-8 w-8 p-0', showStylesPanel && 'bg-muted')}
                    onClick={() => { setShowStylesPanel(!showStylesPanel); setSelectedBlockId(null); }}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Global Styles</TooltipContent>
              </Tooltip>
            )}

            {/* Save to server */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={saveSuccess ? 'default' : 'outline'}
                  className={cn(
                    'text-xs h-8 gap-1',
                    saveSuccess && 'bg-emerald-600 hover:bg-emerald-700 text-white',
                  )}
                  onClick={saveToServer}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : saveSuccess ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save template to server</TooltipContent>
            </Tooltip>

            {/* Export */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setShowHtmlDialog(true)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export as HTML</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ═══ Subject + Preheader Bar ═══════════════════════════════ */}
        {editorMode !== 'preview' && (
          <div className="flex items-center gap-3 border-b bg-muted/20 px-4 py-2">
            <div className="flex items-center gap-2 flex-1">
              <Label className="text-xs font-medium shrink-0 text-muted-foreground">Subject</Label>
              <Input
                ref={subjectRef}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onFocus={() => setActiveSubjectField('subject')}
                placeholder="Enter email subject line..."
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Label className="text-xs font-medium shrink-0 text-muted-foreground">Preheader</Label>
              <Input
                ref={preheaderRef}
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                onFocus={() => setActiveSubjectField('preheader')}
                placeholder="Preview text shown in inbox..."
                className="h-8 text-sm"
              />
            </div>
            <VariablePanel onInsert={insertVariableInSubject} compact />
          </div>
        )}

        {/* ═══ Main Content Area ═════════════════════════════════════ */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── VISUAL MODE ──────────────────────────────────── */}
          {editorMode === 'visual' && (
            <>
              {/* Left Panel: Block Palette */}
              <div className="w-56 border-r bg-background overflow-y-auto">
                <div className="p-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blocks</h3>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => setShowTemplateDialog(true)}
                    >
                      Templates
                    </Button>
                  </div>

                  {PALETTE_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">{cat.label}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {PALETTE_ITEMS.filter((p) => cat.types.includes(p.type)).map((item) => {
                          const Icon = BLOCK_ICONS[item.type];
                          return (
                            <div
                              key={item.type}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/x-block-type', item.type);
                                e.dataTransfer.effectAllowed = 'copy';
                              }}
                              className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-dashed border-transparent bg-muted/40 hover:bg-muted hover:border-muted-foreground/20 cursor-grab active:cursor-grabbing transition-colors select-none"
                            >
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Center: Canvas */}
              <BuilderCanvas
                blocks={blocks}
                selectedBlockId={selectedBlockId}
                globalStyles={globalStyles}
                device={device}
                onSelectBlock={setSelectedBlockId}
                onReorderBlock={handleReorderBlock}
                onDeleteBlock={handleDeleteBlock}
                onDuplicateBlock={handleDuplicateBlock}
                onMoveBlock={handleMoveBlock}
                onDropNewBlock={handleDropNewBlock}
              />

              {/* Right Panel: Block Editor / Global Styles */}
              {(selectedBlock || showStylesPanel) && (
                <div className="w-80 border-l bg-background overflow-hidden flex flex-col">
                  {showStylesPanel && !selectedBlock ? (
                    <ScrollArea className="flex-1">
                      <div className="p-4 space-y-4">
                        <h3 className="text-sm font-semibold">Global Styles</h3>
                        <Separator />
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Page Background</Label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={globalStyles.backgroundColor}
                                onChange={(e) => setGlobalStyles({ ...globalStyles, backgroundColor: e.target.value })}
                                className="w-8 h-8 rounded border cursor-pointer p-0.5"
                              />
                              <Input
                                value={globalStyles.backgroundColor}
                                onChange={(e) => setGlobalStyles({ ...globalStyles, backgroundColor: e.target.value })}
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Content Background</Label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={globalStyles.contentBg}
                                onChange={(e) => setGlobalStyles({ ...globalStyles, contentBg: e.target.value })}
                                className="w-8 h-8 rounded border cursor-pointer p-0.5"
                              />
                              <Input
                                value={globalStyles.contentBg}
                                onChange={(e) => setGlobalStyles({ ...globalStyles, contentBg: e.target.value })}
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Font Family</Label>
                            <Select value={globalStyles.fontFamily} onValueChange={(v) => setGlobalStyles({ ...globalStyles, fontFamily: v })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Arial, Helvetica, sans-serif">Arial</SelectItem>
                                <SelectItem value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica Neue</SelectItem>
                                <SelectItem value="Georgia, serif">Georgia</SelectItem>
                                <SelectItem value="'Times New Roman', Times, serif">Times New Roman</SelectItem>
                                <SelectItem value="Verdana, Geneva, sans-serif">Verdana</SelectItem>
                                <SelectItem value="Tahoma, Geneva, sans-serif">Tahoma</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Content Width</Label>
                            <Input
                              type="number"
                              value={globalStyles.contentWidth}
                              onChange={(e) => setGlobalStyles({ ...globalStyles, contentWidth: Number(e.target.value) })}
                              min={400} max={800}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Border Radius</Label>
                            <Input
                              type="number"
                              value={globalStyles.borderRadius}
                              onChange={(e) => setGlobalStyles({ ...globalStyles, borderRadius: Number(e.target.value) })}
                              min={0} max={24}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-muted-foreground">Actions</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => {
                              localStorage.removeItem(STORAGE_KEY);
                              setBlocks([]);
                              setSubject('');
                              setPreheader('');
                              setTemplateName('Untitled Email');
                              setGlobalStyles({ ...DEFAULT_GLOBAL_STYLES });
                              setCodeHtml('');
                              setServerTemplateId(null);
                              setHistory([[]]);
                              setHistoryIdx(0);
                              setSelectedBlockId(null);
                              setShowTemplateDialog(true);
                            }}
                          >
                            New Email (Clear All)
                          </Button>
                        </div>
                      </div>
                    </ScrollArea>
                  ) : selectedBlock ? (
                    <BlockEditor block={selectedBlock} onChange={handleBlockChange} />
                  ) : null}
                </div>
              )}
            </>
          )}

          {/* ── CODE MODE ────────────────────────────────────── */}
          {editorMode === 'code' && (
            <>
              {/* Code editor area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">HTML Source</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {codeHtml.length.toLocaleString()} chars
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost" size="sm" className="h-7 text-[11px]"
                      onClick={copyHtml}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden relative">
                  {/* Line numbers gutter */}
                  <div className="absolute inset-0 flex">
                    <div className="w-12 bg-muted/50 border-r overflow-hidden py-3 shrink-0">
                      <div className="text-right pr-2 select-none">
                        {codeHtml.split('\n').map((_, i) => (
                          <div key={i} className="text-[10px] leading-[1.65rem] text-muted-foreground/60 font-mono">
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                    <textarea
                      ref={codeRef}
                      value={codeHtml}
                      onChange={(e) => setCodeHtml(e.target.value)}
                      className="flex-1 resize-none bg-background font-mono text-[13px] leading-[1.65rem] p-3 outline-none focus:ring-0 border-0 text-foreground"
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                      wrap="off"
                      style={{ tabSize: 2 }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Panel: Variable Panel */}
              <div className="w-72 border-l bg-background overflow-hidden flex flex-col">
                <VariablePanel onInsert={insertVariableInCode} />

                <Separator />

                {/* Quick reference */}
                <div className="p-3 space-y-2 border-t">
                  <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Syntax</h4>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">
                      <code className="font-mono text-primary text-[10px] bg-muted px-1 rounded">{`{{user.firstName}}`}</code> — merge tag
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      <code className="font-mono text-primary text-[10px] bg-muted px-1 rounded">{`{{system.unsubscribeUrl}}`}</code> — unsubscribe
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      <code className="font-mono text-primary text-[10px] bg-muted px-1 rounded">{`{{company.name}}`}</code> — company
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── PREVIEW MODE ─────────────────────────────────── */}
          {editorMode === 'preview' && (
            <div className="flex-1 overflow-y-auto bg-muted/30 p-6 sm:p-8">
              <div className="mx-auto" style={{ width: device === 'desktop' ? (globalStyles.contentWidth + 48) : 375, maxWidth: '100%' }}>
                <iframe
                  srcDoc={htmlOutput}
                  className="w-full border rounded-lg shadow-sm bg-white"
                  style={{ height: 800, maxWidth: '100%' }}
                  sandbox="allow-same-origin"
                  title="Email Preview"
                />
              </div>
            </div>
          )}
        </div>

        {/* ═══ Template Picker Dialog ════════════════════════════════ */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Choose a Template</DialogTitle>
              <DialogDescription>
                Pick a starting point for your email. You can customize everything after.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2">
              {STARTER_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  className="group flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-muted/50"
                  onClick={() => loadTemplate(tpl)}
                >
                  <div className="flex items-center gap-2">
                    <div className="rounded-md bg-primary/10 p-1.5">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{tpl.name}</span>
                  </div>
                  {tpl.subject && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{tpl.subject}</p>
                  )}
                  <Badge variant="secondary" className="text-[10px]">
                    {tpl.blocks.length} blocks
                  </Badge>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setShowTemplateDialog(false)}>
                Skip — Start Empty
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══ HTML Export Dialog ════════════════════════════════════ */}
        <Dialog open={showHtmlDialog} onOpenChange={setShowHtmlDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Export HTML</DialogTitle>
              <DialogDescription>
                Production-ready email HTML compatible with Outlook, Gmail, Yahoo, and Apple Mail.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden rounded border bg-muted/30">
              <ScrollArea className="h-[400px]">
                <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">
                  {htmlOutput}
                </pre>
              </ScrollArea>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={copyHtml}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy to Clipboard
              </Button>
              <Button size="sm" onClick={downloadHtml}>
                <Download className="h-3.5 w-3.5 mr-1" /> Download .html
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
