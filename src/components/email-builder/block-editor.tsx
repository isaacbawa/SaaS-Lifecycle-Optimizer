'use client';

/* ==========================================================================
 * Email Builder — Block Editor (Properties Panel)
 *
 * Right-hand panel that shows block-specific settings when a block is
 * selected. Includes color pickers, alignment controls, padding editors,
 * text inputs, and the personalization variable inserter.
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
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type {
  EmailBlock, Padding, Align,
  ColumnsBlockContent, SocialLink,
} from './types';
import { VARIABLE_CATEGORIES } from './types';

/* ── Shared Sub-Editors ──────────────────────────────────────────────── */

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs w-24 shrink-0">{label}</Label>
      <div className="flex items-center gap-1.5 flex-1">
        <input
          type="color"
          value={value === 'transparent' ? '#ffffff' : value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border cursor-pointer p-0.5"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-xs font-mono"
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
      <Label className="text-xs w-24 shrink-0">{label}</Label>
      <div className="flex items-center gap-1 flex-1">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step ?? 1}
          className="h-8 text-xs"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function AlignField({ value, onChange }: { value: Align; onChange: (v: Align) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs w-24 shrink-0">Alignment</Label>
      <div className="flex border rounded-md overflow-hidden">
        {(['left', 'center', 'right'] as Align[]).map((a) => {
          const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
          return (
            <button
              key={a}
              onClick={() => onChange(a)}
              className={`p-1.5 transition-colors ${value === a ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
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
      <Label className="text-xs font-medium">Padding</Label>
      <div className="grid grid-cols-4 gap-1.5">
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <div key={side} className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground capitalize">{side}</span>
            <Input
              type="number"
              value={value[side]}
              onChange={(e) => onChange({ ...value, [side]: Number(e.target.value) })}
              min={0}
              className="h-7 text-xs"
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
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
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
                      className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors flex items-center justify-between group"
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
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      <div className="space-y-2">
        {children}
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
  /* Helper to update content immutably */
  const set = useCallback(<K extends string, V>(key: K, val: V) => {
    onChange({ ...block, content: { ...block.content, [key]: val } } as EmailBlock);
  }, [block, onChange]);

  /* Variable insertion into text fields */
  const insertVariable = useCallback((field: string, variable: string) => {
    const current = (block.content as Record<string, unknown>)[field];
    if (typeof current === 'string') {
      set(field, current + variable);
    }
  }, [block.content, set]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold capitalize">{block.type} Settings</h3>
          <VariableInserter onInsert={(v) => {
            // Insert into the primary text field of the block
            const field = block.type === 'heading' ? 'text'
              : block.type === 'button' ? 'text'
                : block.type === 'footer' ? 'html'
                  : 'html';
            insertVariable(field, v);
          }} />
        </div>

        <Separator />

        {/* ── Text Block ─────────────────────────────── */}
        {block.type === 'text' && (() => {
          const c = block.content;
          return (
            <>
              <Section title="Content">
                <div>
                  <Label className="text-xs">HTML Content</Label>
                  <Textarea
                    value={c.html}
                    onChange={(e) => set('html', e.target.value)}
                    rows={5}
                    className="mt-1 text-xs font-mono"
                    placeholder="Write your content..."
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Supports &lt;b&gt;, &lt;i&gt;, &lt;a href=&quot;...&quot;&gt;, &lt;br&gt;
                  </p>
                </div>
              </Section>
              <Separator />
              <Section title="Typography">
                <NumberField label="Font Size" value={c.fontSize} onChange={(v) => set('fontSize', v)} min={10} max={36} suffix="px" />
                <NumberField label="Line Height" value={c.lineHeight} onChange={(v) => set('lineHeight', v)} min={1} max={3} step={0.1} />
                <ColorField label="Text Color" value={c.color} onChange={(v) => set('color', v)} />
                <AlignField value={c.textAlign} onChange={(v) => set('textAlign', v)} />
              </Section>
              <Separator />
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
                  <Label className="text-xs">Heading Text</Label>
                  <Input
                    value={c.text}
                    onChange={(e) => set('text', e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-24">Level</Label>
                  <Select value={String(c.level)} onValueChange={(v) => set('level', Number(v))}>
                    <SelectTrigger className="h-8 text-xs">
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
              <Separator />
              <Section title="Style">
                <ColorField label="Color" value={c.color} onChange={(v) => set('color', v)} />
                <AlignField value={c.textAlign} onChange={(v) => set('textAlign', v)} />
              </Section>
              <Separator />
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
                  <Label className="text-xs">Image URL</Label>
                  <Input
                    value={c.src}
                    onChange={(e) => set('src', e.target.value)}
                    className="mt-1 text-xs"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label className="text-xs">Alt Text</Label>
                  <Input
                    value={c.alt}
                    onChange={(e) => set('alt', e.target.value)}
                    className="mt-1 text-xs"
                    placeholder="Describe this image"
                  />
                </div>
                <div>
                  <Label className="text-xs">Link URL</Label>
                  <Input
                    value={c.href}
                    onChange={(e) => set('href', e.target.value)}
                    className="mt-1 text-xs"
                    placeholder="https://... (optional)"
                  />
                </div>
              </Section>
              <Separator />
              <Section title="Layout">
                <NumberField label="Width" value={c.width} onChange={(v) => set('width', v)} min={10} max={100} suffix="%" />
                <NumberField label="Border Radius" value={c.borderRadius} onChange={(v) => set('borderRadius', v)} min={0} max={50} suffix="px" />
                <AlignField value={c.align} onChange={(v) => set('align', v)} />
              </Section>
              <Separator />
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
                  <Label className="text-xs">Label</Label>
                  <Input value={c.text} onChange={(e) => set('text', e.target.value)} className="mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">URL</Label>
                  <Input value={c.href} onChange={(e) => set('href', e.target.value)} className="mt-1 text-xs" placeholder="https://..." />
                </div>
              </Section>
              <Separator />
              <Section title="Style">
                <ColorField label="Button Color" value={c.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
                <ColorField label="Text Color" value={c.textColor} onChange={(v) => set('textColor', v)} />
                <NumberField label="Border Radius" value={c.borderRadius} onChange={(v) => set('borderRadius', v)} min={0} max={50} suffix="px" />
                <NumberField label="Font Size" value={c.fontSize} onChange={(v) => set('fontSize', v)} min={12} max={24} suffix="px" />
                <AlignField value={c.align} onChange={(v) => set('align', v)} />
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-24">Full Width</Label>
                  <Switch checked={c.fullWidth} onCheckedChange={(v) => set('fullWidth', v)} />
                </div>
              </Section>
              <Separator />
              <Section title="Button Padding">
                <NumberField label="Vertical" value={c.paddingV} onChange={(v) => set('paddingV', v)} min={4} max={32} suffix="px" />
                <NumberField label="Horizontal" value={c.paddingH} onChange={(v) => set('paddingH', v)} min={8} max={64} suffix="px" />
              </Section>
              <Separator />
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
                  <Label className="text-xs w-24">Style</Label>
                  <Select value={c.style} onValueChange={(v) => set('style', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="dashed">Dashed</SelectItem>
                      <SelectItem value="dotted">Dotted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Section>
              <Separator />
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
                  <Label className="text-xs w-24">Layout</Label>
                  <Select value={c.layout} onValueChange={(v) => set('layout', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                  <Separator />
                  <Section title={`Column ${i + 1}`}>
                    <div>
                      <Label className="text-xs">Heading</Label>
                      <Input value={cell.heading} onChange={(e) => updateCell(i, 'heading', e.target.value)} className="mt-1 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Text</Label>
                      <Textarea value={cell.text} onChange={(e) => updateCell(i, 'text', e.target.value)} rows={2} className="mt-1 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Image URL</Label>
                      <Input value={cell.imageUrl} onChange={(e) => updateCell(i, 'imageUrl', e.target.value)} className="mt-1 text-xs" placeholder="https://..." />
                    </div>
                    <div>
                      <Label className="text-xs">Button Label</Label>
                      <Input value={cell.buttonLabel} onChange={(e) => updateCell(i, 'buttonLabel', e.target.value)} className="mt-1 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Button URL</Label>
                      <Input value={cell.buttonUrl} onChange={(e) => updateCell(i, 'buttonUrl', e.target.value)} className="mt-1 text-xs" />
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
                  <Separator />
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={addColumn}>
                    <Plus className="h-3 w-3 mr-1" /> Add Column
                  </Button>
                </>
              )}

              <Separator />
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
              <Section title="Social Links">
                {c.links.map((link, i) => (
                  <div key={i} className="space-y-1.5 p-2 rounded border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Select value={link.platform} onValueChange={(v) => updateLink(i, 'platform', v)}>
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['twitter', 'linkedin', 'facebook', 'instagram', 'youtube', 'tiktok'].map((p) => (
                            <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button onClick={() => removeLink(i)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <Input value={link.url} onChange={(e) => updateLink(i, 'url', e.target.value)} className="h-7 text-xs" placeholder="URL" />
                    <Input value={link.label} onChange={(e) => updateLink(i, 'label', e.target.value)} className="h-7 text-xs" placeholder="Label" />
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={addLink}>
                  <Plus className="h-3 w-3 mr-1" /> Add Link
                </Button>
              </Section>
              <Separator />
              <Section title="Style">
                <ColorField label="Icon Color" value={c.color} onChange={(v) => set('color', v)} />
                <NumberField label="Icon Size" value={c.iconSize} onChange={(v) => set('iconSize', v)} min={16} max={40} suffix="px" />
                <AlignField value={c.align} onChange={(v) => set('align', v)} />
              </Section>
              <Separator />
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
              <Section title="Content">
                <div>
                  <Label className="text-xs">Footer Text</Label>
                  <Textarea
                    value={c.html}
                    onChange={(e) => set('html', e.target.value)}
                    rows={3}
                    className="mt-1 text-xs"
                    placeholder="{{company.name}} · {{company.address}}"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Show Unsubscribe</Label>
                  <Switch checked={c.showUnsubscribe} onCheckedChange={(v) => set('showUnsubscribe', v)} />
                </div>
                {c.showUnsubscribe && (
                  <div>
                    <Label className="text-xs">Unsubscribe Text</Label>
                    <Input value={c.unsubscribeText} onChange={(e) => set('unsubscribeText', e.target.value)} className="mt-1 text-xs" />
                  </div>
                )}
              </Section>
              <Separator />
              <Section title="Style">
                <ColorField label="Text Color" value={c.color} onChange={(v) => set('color', v)} />
                <NumberField label="Font Size" value={c.fontSize} onChange={(v) => set('fontSize', v)} min={10} max={16} suffix="px" />
                <AlignField value={c.textAlign} onChange={(v) => set('textAlign', v)} />
              </Section>
              <Separator />
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
