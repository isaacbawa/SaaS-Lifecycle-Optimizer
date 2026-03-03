'use client';

/* ==========================================================================
 * Email Builder — Block Editor (Properties Panel)
 *
 * Right-hand panel that shows block-specific settings when a block is
 * selected. Includes color pickers, alignment controls, padding editors,
 * variant pickers for social/footer, and editors for all block types.
 * ========================================================================== */

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
    AlignLeft, AlignCenter, AlignRight, Plus, Trash2, Variable, ChevronDown,
    Share2, FileText,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SocialIcon, SOCIAL_BRAND_COLORS, ALL_SOCIAL_PLATFORMS, PLATFORM_LABELS } from './social-icons';
import type {
    EmailBlock, Padding, Align,
    ColumnsBlockContent, SocialLink, SocialVariant, FooterVariant,
    ListItem,
} from './types';
import { VARIABLE_CATEGORIES } from './types';

/* ── Shared Sub-Editors ──────────────────────────────────────────────── */

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center gap-2">
            <Label className="text-xs w-24 shrink-0 text-muted-foreground">{label}</Label>
            <div className="flex items-center gap-1.5 flex-1">
                <div className="relative">
                    <input
                        type="color"
                        value={value === 'transparent' ? '#ffffff' : value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-8 h-8 rounded-md border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5 bg-white"
                    />
                </div>
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-8 text-xs font-mono bg-muted/30"
                />
            </div>
        </div>
    );
}

function NumberField({ label, value, onChange, min, max, step, suffix }: {
    label: string; value: number; onChange: (v: number) => void;
    min?: number; max?: number; step?: number; suffix?: string;
}) {
    return (
        <div className="flex items-center gap-2">
            <Label className="text-xs w-24 shrink-0 text-muted-foreground">{label}</Label>
            <div className="flex items-center gap-1 flex-1">
                <Input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    min={min}
                    max={max}
                    step={step ?? 1}
                    className="h-8 text-xs bg-muted/30"
                />
                {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
            </div>
        </div>
    );
}

function AlignField({ value, onChange }: { value: Align; onChange: (v: Align) => void }) {
    return (
        <div className="flex items-center gap-2">
            <Label className="text-xs w-24 shrink-0 text-muted-foreground">Alignment</Label>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-muted/30">
                {(['left', 'center', 'right'] as Align[]).map((a) => {
                    const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
                    return (
                        <button
                            key={a}
                            onClick={() => onChange(a)}
                            className={`p-2 transition-colors ${value === a ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground'}`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function PaddingEditor({ value, onChange }: { value: Padding; onChange: (v: Padding) => void }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Padding</Label>
            <div className="grid grid-cols-4 gap-1.5">
                {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                    <div key={side} className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground/70 capitalize">{side}</span>
                        <Input
                            type="number"
                            value={value[side]}
                            onChange={(e) => onChange({ ...value, [side]: Number(e.target.value) })}
                            min={0}
                            className="h-7 text-xs bg-muted/30"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Variable Inserter ───────────────────────────────────────────────── */

function VariableInserter({ onInsert }: { onInsert: (variable: string) => void }) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 bg-muted/30 border-gray-200 dark:border-gray-700">
                    <Variable className="h-3 w-3" />
                    Insert Variable
                    <ChevronDown className="h-3 w-3" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start" side="left">
                <ScrollArea className="h-80">
                    <div className="p-3 space-y-3">
                        {VARIABLE_CATEGORIES.map((cat) => (
                            <div key={cat.name}>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{cat.name}</p>
                                <div className="space-y-0.5">
                                    {cat.variables.map((v) => (
                                        <button
                                            key={v.key}
                                            className="w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-muted transition-colors flex items-center justify-between group"
                                            onClick={() => { onInsert(`{{${v.key}}}`); setOpen(false); }}
                                        >
                                            <span className="font-medium">{v.label}</span>
                                            <Badge variant="secondary" className="text-[10px] font-mono opacity-60 group-hover:opacity-100">
                                                {`{{${v.key}}}`}
                                            </Badge>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}

/* ── Section Wrapper ─────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            <div className="space-y-2">
                {children}
            </div>
        </div>
    );
}

/* ── Social Variant Picker ───────────────────────────────────────────── */

const SOCIAL_VARIANT_META: { value: SocialVariant; label: string; desc: string }[] = [
    { value: 'icons-only', label: 'Icons Only', desc: 'Clean minimal icons' },
    { value: 'icons-with-labels', label: 'Icons + Labels', desc: 'Icons with text below' },
    { value: 'colored-icons', label: 'Brand Colors', desc: 'Platform brand colors' },
    { value: 'pill-buttons', label: 'Pill Buttons', desc: 'Colored pill badges' },
    { value: 'rounded-square', label: 'Rounded Square', desc: 'Icons in tinted boxes' },
];

function SocialVariantPicker({ value, onChange }: { value: SocialVariant; onChange: (v: SocialVariant) => void }) {
    return (
        <div className="space-y-2">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Display Style</Label>
            <div className="grid grid-cols-1 gap-1.5">
                {SOCIAL_VARIANT_META.map((v) => (
                    <button
                        key={v.value}
                        onClick={() => onChange(v.value)}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${value === v.value
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-muted/20'
                            }`}
                    >
                        {/* Mini preview */}
                        <div className="flex items-center gap-1 shrink-0">
                            {v.value === 'icons-only' && (
                                <div className="flex gap-1">
                                    <SocialIcon platform="twitter" size={14} color="#6b7280" />
                                    <SocialIcon platform="linkedin" size={14} color="#6b7280" />
                                </div>
                            )}
                            {v.value === 'icons-with-labels' && (
                                <div className="flex gap-1.5">
                                    <div className="flex flex-col items-center gap-0.5">
                                        <SocialIcon platform="twitter" size={12} color="#6b7280" />
                                        <span className="text-[6px] text-muted-foreground">X</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <SocialIcon platform="linkedin" size={12} color="#6b7280" />
                                        <span className="text-[6px] text-muted-foreground">In</span>
                                    </div>
                                </div>
                            )}
                            {v.value === 'colored-icons' && (
                                <div className="flex gap-1">
                                    <SocialIcon platform="twitter" size={14} color="#000000" />
                                    <SocialIcon platform="linkedin" size={14} color="#0A66C2" />
                                </div>
                            )}
                            {v.value === 'pill-buttons' && (
                                <div className="flex gap-1">
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black text-white text-[6px]">
                                        <SocialIcon platform="twitter" size={8} color="#fff" /> X
                                    </span>
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#0A66C2] text-white text-[6px]">
                                        <SocialIcon platform="linkedin" size={8} color="#fff" /> In
                                    </span>
                                </div>
                            )}
                            {v.value === 'rounded-square' && (
                                <div className="flex gap-1">
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 dark:bg-gray-700">
                                        <SocialIcon platform="twitter" size={10} color="#6b7280" />
                                    </span>
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 dark:bg-gray-700">
                                        <SocialIcon platform="linkedin" size={10} color="#6b7280" />
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium">{v.label}</p>
                            <p className="text-[10px] text-muted-foreground">{v.desc}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ── Footer Variant Picker ───────────────────────────────────────────── */

const FOOTER_VARIANT_META: { value: FooterVariant; label: string; desc: string }[] = [
    { value: 'minimal', label: 'Minimal', desc: 'Single line, compact' },
    { value: 'centered', label: 'Centered', desc: 'Classic centered footer' },
    { value: 'detailed', label: 'Detailed', desc: 'Full with extra links' },
    { value: 'dark', label: 'Dark', desc: 'Dark background footer' },
    { value: 'branded', label: 'Branded', desc: 'With brand color accent' },
];

function FooterVariantPicker({ value, onChange }: { value: FooterVariant; onChange: (v: FooterVariant) => void }) {
    return (
        <div className="space-y-2">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Footer Style</Label>
            <div className="grid grid-cols-1 gap-1.5">
                {FOOTER_VARIANT_META.map((v) => (
                    <button
                        key={v.value}
                        onClick={() => onChange(v.value)}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${value === v.value
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-muted/20'
                            }`}
                    >
                        {/* Mini preview */}
                        <div className="w-8 h-5 rounded-sm shrink-0 flex items-center justify-center" style={{
                            backgroundColor: v.value === 'dark' ? '#1f2937' : v.value === 'branded' ? '#eff6ff' : '#f9fafb',
                            borderTop: v.value === 'branded' ? '2px solid #2563eb' : v.value === 'detailed' ? '1px solid #e5e7eb' : 'none',
                        }}>
                            <FileText className="h-2.5 w-2.5" style={{
                                color: v.value === 'dark' ? '#d1d5db' : '#9ca3af',
                            }} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium">{v.label}</p>
                            <p className="text-[10px] text-muted-foreground">{v.desc}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ── Props ───────────────────────────────────────────────────────────── */

interface BlockEditorProps {
    block: EmailBlock;
    onChange: (updated: EmailBlock) => void;
}

/* ── Main Block Editor ───────────────────────────────────────────────── */

export function BlockEditor({ block, onChange }: BlockEditorProps) {
    const set = useCallback(<K extends string, V>(key: K, val: V) => {
        onChange({ ...block, content: { ...block.content, [key]: val } } as EmailBlock);
    }, [block, onChange]);

    const insertVariable = useCallback((field: string, variable: string) => {
        const current = (block.content as unknown as Record<string, unknown>)[field];
        if (typeof current === 'string') {
            set(field, current + variable);
        }
    }, [block.content, set]);

    return (
        <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-primary text-xs font-bold capitalize">{block.type[0]}</span>
                        </div>
                        <h3 className="text-sm font-semibold capitalize">{block.type} Settings</h3>
                    </div>
                    <VariableInserter onInsert={(v) => {
                        const field = block.type === 'heading' ? 'text'
                            : block.type === 'button' ? 'text'
                                : block.type === 'footer' ? 'html'
                                    : block.type === 'quote' ? 'text'
                                        : 'html';
                        insertVariable(field, v);
                    }} />
                </div>

                <Separator className="bg-gray-200 dark:bg-gray-700" />

                {/* ── Text Block ─────────────────────────────── */}
                {block.type === 'text' && (() => {
                    const c = block.content;
                    return (
                        <>
                            <Section title="Content">
                                <div>
                                    <Label className="text-xs text-muted-foreground">HTML Content</Label>
                                    <Textarea
                                        value={c.html}
                                        onChange={(e) => set('html', e.target.value)}
                                        rows={5}
                                        className="mt-1 text-xs font-mono bg-muted/30"
                                        placeholder="Write your content..."
                                    />
                                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                                        Supports &lt;b&gt;, &lt;i&gt;, &lt;a href=&quot;...&quot;&gt;, &lt;br&gt;
                                    </p>
                                </div>
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Typography">
                                <NumberField label="Font Size" value={c.fontSize} onChange={(v) => set('fontSize', v)} min={10} max={36} suffix="px" />
                                <NumberField label="Line Height" value={c.lineHeight} onChange={(v) => set('lineHeight', v)} min={1} max={3} step={0.1} />
                                <ColorField label="Text Color" value={c.color} onChange={(v) => set('color', v)} />
                                <AlignField value={c.textAlign} onChange={(v) => set('textAlign', v)} />
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Spacing">
                                <PaddingEditor value={c.padding} onChange={(v) => set('padding', v)} />
                                <ColorField label="Background" value={c.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
                            </Section>
                        </>
                    );
                })()}

                {/* ── Heading Block ──────────────────────────── */}
                {block.type === 'heading' && (() => {
                    const c = block.content;
                    return (
                        <>
                            <Section title="Content">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Heading Text</Label>
                                    <Input
                                        value={c.text}
                                        onChange={(e) => set('text', e.target.value)}
                                        className="mt-1 text-sm bg-muted/30"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs w-24 text-muted-foreground">Level</Label>
                                    <Select value={String(c.level)} onValueChange={(v) => set('level', Number(v))}>
                                        <SelectTrigger className="h-8 text-xs bg-muted/30">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">H1 — Large</SelectItem>
                                            <SelectItem value="2">H2 — Medium</SelectItem>
                                            <SelectItem value="3">H3 — Small</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Style">
                                <ColorField label="Color" value={c.color} onChange={(v) => set('color', v)} />
                                <AlignField value={c.textAlign} onChange={(v) => set('textAlign', v)} />
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Spacing">
                                <PaddingEditor value={c.padding} onChange={(v) => set('padding', v)} />
                                <ColorField label="Background" value={c.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
                            </Section>
                        </>
                    );
                })()}

                {/* ── Image Block ────────────────────────────── */}
                {block.type === 'image' && (() => {
                    const c = block.content;
                    return (
                        <>
                            <Section title="Image">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Image URL</Label>
                                    <Input value={c.src} onChange={(e) => set('src', e.target.value)} className="mt-1 text-xs bg-muted/30" placeholder="https://..." />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Alt Text</Label>
                                    <Input value={c.alt} onChange={(e) => set('alt', e.target.value)} className="mt-1 text-xs bg-muted/30" placeholder="Describe this image" />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Link URL</Label>
                                    <Input value={c.href} onChange={(e) => set('href', e.target.value)} className="mt-1 text-xs bg-muted/30" placeholder="https://... (optional)" />
                                </div>
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Layout">
                                <NumberField label="Width" value={c.width} onChange={(v) => set('width', v)} min={10} max={100} suffix="%" />
                                <NumberField label="Border Radius" value={c.borderRadius} onChange={(v) => set('borderRadius', v)} min={0} max={50} suffix="px" />
                                <AlignField value={c.align} onChange={(v) => set('align', v)} />
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Spacing">
                                <PaddingEditor value={c.padding} onChange={(v) => set('padding', v)} />
                                <ColorField label="Background" value={c.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
                            </Section>
                        </>
                    );
                })()}

                {/* ── Button Block ───────────────────────────── */}
                {block.type === 'button' && (() => {
                    const c = block.content;
                    return (
                        <>
                            <Section title="Button">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Label</Label>
                                    <Input value={c.text} onChange={(e) => set('text', e.target.value)} className="mt-1 text-sm bg-muted/30" />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">URL</Label>
                                    <Input value={c.href} onChange={(e) => set('href', e.target.value)} className="mt-1 text-xs bg-muted/30" placeholder="https://..." />
                                </div>
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Style">
                                <ColorField label="Button Color" value={c.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
                                <ColorField label="Text Color" value={c.textColor} onChange={(v) => set('textColor', v)} />
                                <NumberField label="Border Radius" value={c.borderRadius} onChange={(v) => set('borderRadius', v)} min={0} max={50} suffix="px" />
                                <NumberField label="Font Size" value={c.fontSize} onChange={(v) => set('fontSize', v)} min={12} max={24} suffix="px" />
                                <AlignField value={c.align} onChange={(v) => set('align', v)} />
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs w-24 text-muted-foreground">Full Width</Label>
                                    <Switch checked={c.fullWidth} onCheckedChange={(v) => set('fullWidth', v)} />
                                </div>
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Button Padding">
                                <NumberField label="Vertical" value={c.paddingV} onChange={(v) => set('paddingV', v)} min={4} max={32} suffix="px" />
                                <NumberField label="Horizontal" value={c.paddingH} onChange={(v) => set('paddingH', v)} min={8} max={64} suffix="px" />
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Container">
                                <PaddingEditor value={c.containerPadding} onChange={(v) => set('containerPadding', v)} />
                                <ColorField label="Background" value={c.containerBg} onChange={(v) => set('containerBg', v)} />
                            </Section>
                        </>
                    );
                })()}

                {/* ── Divider Block ──────────────────────────── */}
                {block.type === 'divider' && (() => {
                    const c = block.content;
                    return (
                        <>
                            <Section title="Divider">
                                <ColorField label="Color" value={c.color} onChange={(v) => set('color', v)} />
                                <NumberField label="Thickness" value={c.thickness} onChange={(v) => set('thickness', v)} min={1} max={8} suffix="px" />
                                <NumberField label="Width" value={c.width} onChange={(v) => set('width', v)} min={10} max={100} suffix="%" />
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs w-24 text-muted-foreground">Style</Label>
                                    <Select value={c.style} onValueChange={(v) => set('style', v)}>
                                        <SelectTrigger className="h-8 text-xs bg-muted/30"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="solid">Solid</SelectItem>
                                            <SelectItem value="dashed">Dashed</SelectItem>
                                            <SelectItem value="dotted">Dotted</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Spacing">
                                <PaddingEditor value={c.padding} onChange={(v) => set('padding', v)} />
                                <ColorField label="Background" value={c.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
                            </Section>
                        </>
                    );
                })()}

                {/* ── Spacer Block ───────────────────────────── */}
                {block.type === 'spacer' && (() => {
                    const c = block.content;
                    return (
                        <Section title="Spacer">
                            <NumberField label="Height" value={c.height} onChange={(v) => set('height', v)} min={4} max={120} suffix="px" />
                            <ColorField label="Background" value={c.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
                        </Section>
                    );
                })()}

                {/* ── Columns Block ──────────────────────────── */}
                {block.type === 'columns' && (() => {
                    const c = block.content;
                    const updateCell = (index: number, key: string, val: string) => {
                        const newCells = c.cells.map((cell, i) =>
                            i === index ? { ...cell, [key]: val } : cell,
                        );
                        set('cells', newCells);
                    };
                    const addColumn = () => {
                        if (c.cells.length >= 4) return;
                        const newCells = [...c.cells, { imageUrl: '', imageAlt: '', heading: `Column ${c.cells.length + 1}`, text: 'Content here.', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' }];
                        const newLayout = newCells.length === 3 ? '1-1-1' : c.layout;
                        onChange({ ...block, content: { ...c, cells: newCells, layout: newLayout } } as EmailBlock);
                    };
                    const removeColumn = (index: number) => {
                        if (c.cells.length <= 2) return;
                        const newCells = c.cells.filter((_, i) => i !== index);
                        const newLayout = newCells.length === 2 ? '1-1' : '1-1-1';
                        onChange({ ...block, content: { ...c, cells: newCells, layout: newLayout } } as EmailBlock);
                    };

                    return (
                        <>
                            <Section title="Layout">
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs w-24 text-muted-foreground">Layout</Label>
                                    <Select value={c.layout} onValueChange={(v) => set('layout', v)}>
                                        <SelectTrigger className="h-8 text-xs bg-muted/30"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1-1">Equal (50/50)</SelectItem>
                                            {c.cells.length === 2 && <SelectItem value="1-2">1/3 + 2/3</SelectItem>}
                                            {c.cells.length === 2 && <SelectItem value="2-1">2/3 + 1/3</SelectItem>}
                                            {c.cells.length === 3 && <SelectItem value="1-1-1">Equal (33/33/33)</SelectItem>}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <NumberField label="Gap" value={c.gap} onChange={(v) => set('gap', v)} min={0} max={32} suffix="px" />
                            </Section>

                            {c.cells.map((cell, i) => (
                                <React.Fragment key={i}>
                                    <Separator className="bg-gray-100 dark:bg-gray-800" />
                                    <Section title={`Column ${i + 1}`}>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Heading</Label>
                                            <Input value={cell.heading} onChange={(e) => updateCell(i, 'heading', e.target.value)} className="mt-1 text-xs bg-muted/30" />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Text</Label>
                                            <Textarea value={cell.text} onChange={(e) => updateCell(i, 'text', e.target.value)} rows={2} className="mt-1 text-xs bg-muted/30" />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Image URL</Label>
                                            <Input value={cell.imageUrl} onChange={(e) => updateCell(i, 'imageUrl', e.target.value)} className="mt-1 text-xs bg-muted/30" placeholder="https://..." />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Button Label</Label>
                                            <Input value={cell.buttonLabel} onChange={(e) => updateCell(i, 'buttonLabel', e.target.value)} className="mt-1 text-xs bg-muted/30" />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Button URL</Label>
                                            <Input value={cell.buttonUrl} onChange={(e) => updateCell(i, 'buttonUrl', e.target.value)} className="mt-1 text-xs bg-muted/30" />
                                        </div>
                                        {c.cells.length > 2 && (
                                            <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => removeColumn(i)}>
                                                <Trash2 className="h-3 w-3 mr-1" /> Remove Column
                                            </Button>
                                        )}
                                    </Section>
                                </React.Fragment>
                            ))}

                            {c.cells.length < 4 && (
                                <>
                                    <Separator className="bg-gray-100 dark:bg-gray-800" />
                                    <Button variant="outline" size="sm" className="w-full text-xs bg-muted/30" onClick={addColumn}>
                                        <Plus className="h-3 w-3 mr-1" /> Add Column
                                    </Button>
                                </>
                            )}

                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Spacing">
                                <PaddingEditor value={c.padding} onChange={(v) => set('padding', v)} />
                                <ColorField label="Background" value={c.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
                            </Section>
                        </>
                    );
                })()}

                {/* ── Social Block ───────────────────────────── */}
                {block.type === 'social' && (() => {
                    const c = block.content;
                    const updateLink = (index: number, key: keyof SocialLink, val: string) => {
                        const newLinks = c.links.map((link, i) =>
                            i === index ? { ...link, [key]: val } : link,
                        );
                        set('links', newLinks);
                    };
                    const addLink = () => {
                        set('links', [...c.links, { platform: 'instagram', url: 'https://instagram.com/', label: 'Instagram' }]);
                    };
                    const removeLink = (index: number) => {
                        set('links', c.links.filter((_, i) => i !== index));
                    };
                    return (
                        <>
                            {/* Variant Picker */}
                            <SocialVariantPicker
                                value={c.variant ?? 'icons-only'}
                                onChange={(v) => set('variant', v)}
                            />

                            <Separator className="bg-gray-100 dark:bg-gray-800" />

                            <Section title="Social Links">
                                {c.links.map((link, i) => (
                                    <div key={i} className="space-y-1.5 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-muted/20">
                                        <div className="flex items-center gap-2">
                                            {/* Platform icon */}
                                            <div className="w-7 h-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                                                <SocialIcon platform={link.platform} size={14} color={SOCIAL_BRAND_COLORS[link.platform] ?? '#6b7280'} />
                                            </div>
                                            <Select value={link.platform} onValueChange={(v) => {
                                                updateLink(i, 'platform', v);
                                                updateLink(i, 'label', PLATFORM_LABELS[v] ?? v);
                                            }}>
                                                <SelectTrigger className="h-7 text-xs flex-1 bg-white dark:bg-gray-900"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {ALL_SOCIAL_PLATFORMS.map((p) => (
                                                        <SelectItem key={p} value={p}>
                                                            <div className="flex items-center gap-2">
                                                                <SocialIcon platform={p} size={14} color={SOCIAL_BRAND_COLORS[p] ?? '#6b7280'} />
                                                                <span>{PLATFORM_LABELS[p] ?? p}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <button onClick={() => removeLink(i)} className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-destructive transition-colors">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <Input value={link.url} onChange={(e) => updateLink(i, 'url', e.target.value)} className="h-7 text-xs bg-white dark:bg-gray-900" placeholder="URL" />
                                        <Input value={link.label} onChange={(e) => updateLink(i, 'label', e.target.value)} className="h-7 text-xs bg-white dark:bg-gray-900" placeholder="Label" />
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" className="w-full text-xs bg-muted/30 border-dashed" onClick={addLink}>
                                    <Plus className="h-3 w-3 mr-1" /> Add Link
                                </Button>
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Style">
                                <ColorField label="Icon Color" value={c.color} onChange={(v) => set('color', v)} />
                                <NumberField label="Icon Size" value={c.iconSize} onChange={(v) => set('iconSize', v)} min={16} max={40} suffix="px" />
                                <AlignField value={c.align} onChange={(v) => set('align', v)} />
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Spacing">
                                <PaddingEditor value={c.padding} onChange={(v) => set('padding', v)} />
                                <ColorField label="Background" value={c.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
                            </Section>
                        </>
                    );
                })()}

                {/* ── Footer Block ───────────────────────────── */}
                {block.type === 'footer' && (() => {
                    const c = block.content;
                    return (
                        <>
                            {/* Variant Picker */}
                            <FooterVariantPicker
                                value={c.variant ?? 'centered'}
                                onChange={(v) => set('variant', v)}
                            />

                            <Separator className="bg-gray-100 dark:bg-gray-800" />

                            <Section title="Content">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Footer Text</Label>
                                    <Textarea
                                        value={c.html}
                                        onChange={(e) => set('html', e.target.value)}
                                        rows={3}
                                        className="mt-1 text-xs bg-muted/30"
                                        placeholder="{{company.name}} · {{company.address}}"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Show Unsubscribe</Label>
                                    <Switch checked={c.showUnsubscribe} onCheckedChange={(v) => set('showUnsubscribe', v)} />
                                </div>
                                {c.showUnsubscribe && (
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Unsubscribe Text</Label>
                                        <Input value={c.unsubscribeText} onChange={(e) => set('unsubscribeText', e.target.value)} className="mt-1 text-xs bg-muted/30" />
                                    </div>
                                )}
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Style">
                                <ColorField label="Text Color" value={c.color} onChange={(v) => set('color', v)} />
                                <NumberField label="Font Size" value={c.fontSize} onChange={(v) => set('fontSize', v)} min={10} max={16} suffix="px" />
                                <AlignField value={c.textAlign} onChange={(v) => set('textAlign', v)} />
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Spacing">
                                <PaddingEditor value={c.padding} onChange={(v) => set('padding', v)} />
                                <ColorField label="Background" value={c.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
                            </Section>
                        </>
                    );
                })()}

                {/* ── Video Block ────────────────────────────── */}
                {block.type === 'video' && (() => {
                    const c = block.content;
                    return (
                        <>
                            <Section title="Video">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Video URL</Label>
                                    <Input value={c.href} onChange={(e) => set('href', e.target.value)} className="mt-1 text-xs bg-muted/30" placeholder="https://youtube.com/watch?v=..." />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Thumbnail URL</Label>
                                    <Input value={c.thumbnailUrl} onChange={(e) => set('thumbnailUrl', e.target.value)} className="mt-1 text-xs bg-muted/30" placeholder="https://img.youtube.com/..." />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Alt Text</Label>
                                    <Input value={c.alt} onChange={(e) => set('alt', e.target.value)} className="mt-1 text-xs bg-muted/30" placeholder="Watch the video" />
                                </div>
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Style">
                                <NumberField label="Border Radius" value={c.borderRadius} onChange={(v) => set('borderRadius', v)} min={0} max={24} suffix="px" />
                                <ColorField label="Overlay" value={c.overlayColor} onChange={(v) => set('overlayColor', v)} />
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Spacing">
                                <PaddingEditor value={c.padding} onChange={(v) => set('padding', v)} />
                                <ColorField label="Background" value={c.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
                            </Section>
                        </>
                    );
                })()}

                {/* ── Quote Block ────────────────────────────── */}
                {block.type === 'quote' && (() => {
                    const c = block.content;
                    return (
                        <>
                            <Section title="Quote Style">
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs w-24 text-muted-foreground">Style</Label>
                                    <Select value={c.style} onValueChange={(v) => set('style', v)}>
                                        <SelectTrigger className="h-8 text-xs bg-muted/30"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="border-left">Border Left</SelectItem>
                                            <SelectItem value="large-quote">Large Quote Mark</SelectItem>
                                            <SelectItem value="card">Card Style</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Content">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Quote Text</Label>
                                    <Textarea
                                        value={c.text}
                                        onChange={(e) => set('text', e.target.value)}
                                        rows={3}
                                        className="mt-1 text-xs bg-muted/30"
                                        placeholder="Enter the quote..."
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Attribution</Label>
                                    <Input value={c.attribution} onChange={(e) => set('attribution', e.target.value)} className="mt-1 text-xs bg-muted/30" placeholder="Jane Cooper" />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Title / Role</Label>
                                    <Input value={c.attributionTitle} onChange={(e) => set('attributionTitle', e.target.value)} className="mt-1 text-xs bg-muted/30" placeholder="VP of Success, Acme" />
                                </div>
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Typography">
                                <NumberField label="Font Size" value={c.fontSize} onChange={(v) => set('fontSize', v)} min={14} max={28} suffix="px" />
                                <ColorField label="Text Color" value={c.color} onChange={(v) => set('color', v)} />
                                <ColorField label="Accent Color" value={c.accentColor} onChange={(v) => set('accentColor', v)} />
                                <AlignField value={c.textAlign} onChange={(v) => set('textAlign', v)} />
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Spacing">
                                <PaddingEditor value={c.padding} onChange={(v) => set('padding', v)} />
                                <ColorField label="Background" value={c.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
                            </Section>
                        </>
                    );
                })()}

                {/* ── List Block ─────────────────────────────── */}
                {block.type === 'list' && (() => {
                    const c = block.content;
                    const updateItem = (index: number, text: string) => {
                        const newItems = c.items.map((item, i) => i === index ? { ...item, text } : item);
                        set('items', newItems);
                    };
                    const addItem = () => {
                        set('items', [...c.items, { text: 'New list item' }]);
                    };
                    const removeItem = (index: number) => {
                        if (c.items.length <= 1) return;
                        set('items', c.items.filter((_, i) => i !== index));
                    };

                    return (
                        <>
                            <Section title="List Style">
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs w-24 text-muted-foreground">Style</Label>
                                    <Select value={c.style} onValueChange={(v) => set('style', v)}>
                                        <SelectTrigger className="h-8 text-xs bg-muted/30"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="check">\u2713 Checkmarks</SelectItem>
                                            <SelectItem value="bullet">\u2022 Bullets</SelectItem>
                                            <SelectItem value="numbered">1. Numbered</SelectItem>
                                            <SelectItem value="arrow">\u2192 Arrows</SelectItem>
                                            <SelectItem value="star">\u2605 Stars</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Items">
                                {c.items.map((item, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        <span className="text-xs text-muted-foreground w-4 shrink-0 text-center font-mono">{i + 1}</span>
                                        <Input
                                            value={item.text}
                                            onChange={(e) => updateItem(i, e.target.value)}
                                            className="h-8 text-xs bg-muted/30 flex-1"
                                        />
                                        <button
                                            onClick={() => removeItem(i)}
                                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-destructive transition-colors"
                                            disabled={c.items.length <= 1}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" className="w-full text-xs bg-muted/30 border-dashed" onClick={addItem}>
                                    <Plus className="h-3 w-3 mr-1" /> Add Item
                                </Button>
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Typography">
                                <NumberField label="Font Size" value={c.fontSize} onChange={(v) => set('fontSize', v)} min={12} max={24} suffix="px" />
                                <NumberField label="Spacing" value={c.spacing} onChange={(v) => set('spacing', v)} min={4} max={24} suffix="px" />
                                <ColorField label="Text Color" value={c.color} onChange={(v) => set('color', v)} />
                                <ColorField label="Icon Color" value={c.iconColor} onChange={(v) => set('iconColor', v)} />
                            </Section>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <Section title="Spacing">
                                <PaddingEditor value={c.padding} onChange={(v) => set('padding', v)} />
                                <ColorField label="Background" value={c.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
                            </Section>
                        </>
                    );
                })()}
            </div>
        </ScrollArea>
    );
}
