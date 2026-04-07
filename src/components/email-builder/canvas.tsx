'use client';

/* ==========================================================================
 * Email Builder - Canvas
 *
 * The central editing surface. Renders email blocks in a styled container
 * with HTML5 drag-and-drop for reordering and palette drops. Blocks are
 * selectable, duplicatable, and deletable. Supports all block types
 * including social variations, footer variations, video, quote, and list.
 * ========================================================================== */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    GripVertical, Trash2, Copy, ChevronUp, ChevronDown,
    Type, Heading, ImageIcon, MousePointerClick, Minus,
    Space, Columns, Share2, FileText, Play,
    Quote, ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SocialIcon, SOCIAL_BRAND_COLORS } from './social-icons';
import type {
    EmailBlock, BlockType, GlobalStyles,
    TextBlockContent, HeadingBlockContent, ImageBlockContent,
    ButtonBlockContent, DividerBlockContent, SpacerBlockContent,
    ColumnsBlockContent, SocialBlockContent, FooterBlockContent,
    VideoBlockContent, QuoteBlockContent, ListBlockContent,
} from './types';

/* ── Block type icons ────────────────────────────────────────────────── */

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
    video: Play,
    quote: Quote,
    list: ListChecks,
};

/* ── Block Preview Renderers ─────────────────────────────────────────── */

function PreviewText({
    c,
    isEditing,
    draftValue,
    onDraftChange,
    onCommit,
}: {
    c: TextBlockContent;
    isEditing?: boolean;
    draftValue?: string;
    onDraftChange?: (value: string) => void;
    onCommit?: () => void;
}) {
    const editableRef = useRef<HTMLDivElement>(null);

    const applyCommand = useCallback((command: string, value?: string) => {
        document.execCommand(command, false, value);
        const nextHtml = editableRef.current?.innerHTML ?? '';
        onDraftChange?.(nextHtml);
        editableRef.current?.focus();
    }, [onDraftChange]);

    useEffect(() => {
        if (!isEditing || !editableRef.current) return;
        const nextHtml = draftValue ?? c.html;
        if (editableRef.current.innerHTML !== nextHtml) {
            editableRef.current.innerHTML = nextHtml;
        }
        editableRef.current.focus();
    }, [isEditing, draftValue, c.html]);

    if (isEditing) {
        return (
            <div
                style={{
                    padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
                    backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
                    fontFamily: c.fontFamily,
                    fontSize: c.fontSize,
                    lineHeight: c.lineHeight,
                    color: c.color,
                    textAlign: c.textAlign,
                }}
            >
                <div className="mb-2 inline-flex items-center gap-1 rounded-md border bg-white/90 p-1">
                    <button
                        type="button"
                        className="rounded px-2 py-1 text-xs font-semibold hover:bg-muted"
                        title="Bold (Ctrl+B)"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyCommand('bold')}
                    >
                        B
                    </button>
                    <button
                        type="button"
                        className="rounded px-2 py-1 text-xs italic hover:bg-muted"
                        title="Italic (Ctrl+I)"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyCommand('italic')}
                    >
                        I
                    </button>
                    <button
                        type="button"
                        className="rounded px-2 py-1 text-xs underline hover:bg-muted"
                        title="Underline (Ctrl+U)"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyCommand('underline')}
                    >
                        U
                    </button>
                    <button
                        type="button"
                        className="rounded px-2 py-1 text-xs hover:bg-muted"
                        title="Insert link (Ctrl+K)"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            const url = window.prompt('Enter link URL (https://...)', 'https://');
                            if (url && url.trim()) applyCommand('createLink', url.trim());
                        }}
                    >
                        Link
                    </button>
                    <button
                        type="button"
                        className="rounded px-2 py-1 text-xs hover:bg-muted"
                        title="Bullet list"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyCommand('insertUnorderedList')}
                    >
                        • List
                    </button>
                </div>
                <div
                    ref={editableRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="min-h-[48px] rounded-md ring-2 ring-blue-500/40 px-1 outline-none"
                    onInput={(e) => onDraftChange?.((e.currentTarget as HTMLDivElement).innerHTML)}
                    onBlur={() => onCommit?.()}
                    onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                            e.preventDefault();
                            applyCommand('bold');
                            return;
                        }
                        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
                            e.preventDefault();
                            applyCommand('italic');
                            return;
                        }
                        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
                            e.preventDefault();
                            applyCommand('underline');
                            return;
                        }
                        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                            e.preventDefault();
                            const url = window.prompt('Enter link URL (https://...)', 'https://');
                            if (url && url.trim()) applyCommand('createLink', url.trim());
                            return;
                        }
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            onCommit?.();
                        }
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            onCommit?.();
                        }
                    }}
                />
            </div>
        );
    }

    return (
        <div
            style={{
                padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
                backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
                fontFamily: c.fontFamily,
                fontSize: c.fontSize,
                lineHeight: c.lineHeight,
                color: c.color,
                textAlign: c.textAlign,
            }}
            dangerouslySetInnerHTML={{ __html: c.html }}
        />
    );
}

function PreviewHeading({
    c,
    isEditing,
    draftValue,
    onDraftChange,
    onCommit,
}: {
    c: HeadingBlockContent;
    isEditing?: boolean;
    draftValue?: string;
    onDraftChange?: (value: string) => void;
    onCommit?: () => void;
}) {
    const sizes = { 1: 28, 2: 22, 3: 18 } as const;
    const Tag = `h${c.level}` as 'h1' | 'h2' | 'h3';

    if (isEditing) {
        return (
            <div style={{
                padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
                backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
            }}>
                <input
                    autoFocus
                    value={draftValue ?? c.text}
                    onChange={(e) => onDraftChange?.(e.target.value)}
                    onBlur={() => onCommit?.()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') {
                            e.preventDefault();
                            onCommit?.();
                        }
                    }}
                    className="w-full rounded-md ring-2 ring-blue-500/40 px-2 py-1 outline-none bg-transparent"
                    style={{
                        margin: 0,
                        fontFamily: c.fontFamily,
                        fontSize: sizes[c.level],
                        fontWeight: 700,
                        color: c.color,
                        textAlign: c.textAlign,
                        lineHeight: 1.3,
                    }}
                />
            </div>
        );
    }

    return (
        <div style={{
            padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
            backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
        }}>
            <Tag style={{
                margin: 0, fontFamily: c.fontFamily, fontSize: sizes[c.level],
                fontWeight: 700, color: c.color, textAlign: c.textAlign, lineHeight: 1.3,
            }}>
                {c.text}
            </Tag>
        </div>
    );
}

function PreviewImage({ c }: { c: ImageBlockContent }) {
    return (
        <div style={{
            padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
            backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
            textAlign: c.align,
        }}>
            {c.src ? (
                <img
                    src={c.src}
                    alt={c.alt}
                    style={{ width: `${c.width}%`, maxWidth: '100%', height: 'auto', display: 'inline-block', borderRadius: c.borderRadius }}
                />
            ) : (
                <div className="flex items-center justify-center bg-muted/60 text-muted-foreground text-sm rounded-lg border-2 border-dashed border-muted-foreground/20"
                    style={{ width: '100%', height: 180 }}>
                    <ImageIcon className="mr-2 h-5 w-5 opacity-40" /> Drop an image URL
                </div>
            )}
        </div>
    );
}

function PreviewImageEditable({
    c,
    draftValue,
    onDraftChange,
    onCommit,
}: {
    c: ImageBlockContent;
    draftValue?: string;
    onDraftChange?: (value: string) => void;
    onCommit?: () => void;
}) {
    const parsed = (() => {
        try {
            return draftValue ? JSON.parse(draftValue) as { src?: string; alt?: string; href?: string } : {};
        } catch {
            return {};
        }
    })();

    const next = {
        src: parsed.src ?? c.src,
        alt: parsed.alt ?? c.alt,
        href: parsed.href ?? c.href,
    };

    const update = (patch: Partial<typeof next>) => {
        onDraftChange?.(JSON.stringify({ ...next, ...patch }));
    };

    return (
        <div style={{
            padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
            backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
        }}>
            <div className="rounded-md border bg-white/90 p-2 space-y-2" onBlur={() => onCommit?.()}>
                <input
                    autoFocus
                    value={next.src}
                    onChange={(e) => update({ src: e.target.value })}
                    placeholder="Image URL"
                    className="w-full rounded border px-2 py-1 text-xs"
                />
                <input
                    value={next.alt}
                    onChange={(e) => update({ alt: e.target.value })}
                    placeholder="Alt text"
                    className="w-full rounded border px-2 py-1 text-xs"
                />
                <input
                    value={next.href}
                    onChange={(e) => update({ href: e.target.value })}
                    placeholder="Click-through URL"
                    className="w-full rounded border px-2 py-1 text-xs"
                />
            </div>
        </div>
    );
}

function PreviewButton({
    c,
    isEditing,
    draftValue,
    onDraftChange,
    onCommit,
}: {
    c: ButtonBlockContent;
    isEditing?: boolean;
    draftValue?: string;
    onDraftChange?: (value: string) => void;
    onCommit?: () => void;
}) {
    return (
        <div style={{
            padding: `${c.containerPadding.top}px ${c.containerPadding.right}px ${c.containerPadding.bottom}px ${c.containerPadding.left}px`,
            backgroundColor: c.containerBg === 'transparent' ? undefined : c.containerBg,
            textAlign: c.align,
        }}>
            {isEditing ? (
                <input
                    autoFocus
                    value={draftValue ?? c.text}
                    onChange={(e) => onDraftChange?.(e.target.value)}
                    onBlur={() => onCommit?.()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') {
                            e.preventDefault();
                            onCommit?.();
                        }
                    }}
                    style={{
                        display: 'inline-block',
                        width: c.fullWidth ? '100%' : undefined,
                        padding: `${c.paddingV}px ${c.paddingH}px`,
                        backgroundColor: c.backgroundColor,
                        color: c.textColor,
                        fontFamily: c.fontFamily,
                        fontSize: c.fontSize,
                        fontWeight: 600,
                        borderRadius: c.borderRadius,
                        textAlign: 'center',
                        border: 'none',
                        outline: '2px solid rgba(59,130,246,0.5)',
                    }}
                />
            ) : (
                <span style={{
                    display: 'inline-block',
                    width: c.fullWidth ? '100%' : undefined,
                    padding: `${c.paddingV}px ${c.paddingH}px`,
                    backgroundColor: c.backgroundColor,
                    color: c.textColor,
                    fontFamily: c.fontFamily,
                    fontSize: c.fontSize,
                    fontWeight: 600,
                    borderRadius: c.borderRadius,
                    textDecoration: 'none',
                    textAlign: 'center',
                    cursor: 'pointer',
                }}>
                    {c.text}
                </span>
            )}
        </div>
    );
}

function PreviewDivider({ c }: { c: DividerBlockContent }) {
    return (
        <div style={{
            padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
            backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
        }}>
            <hr style={{
                border: 'none',
                borderTop: `${c.thickness}px ${c.style} ${c.color}`,
                width: `${c.width}%`,
                margin: '0 auto',
            }} />
        </div>
    );
}

function PreviewDividerEditable({
    c,
    draftValue,
    onDraftChange,
    onCommit,
}: {
    c: DividerBlockContent;
    draftValue?: string;
    onDraftChange?: (value: string) => void;
    onCommit?: () => void;
}) {
    const parsed = (() => {
        try {
            return draftValue ? JSON.parse(draftValue) as { thickness?: number; width?: number; style?: 'solid' | 'dashed' | 'dotted'; color?: string } : {};
        } catch {
            return {};
        }
    })();

    const next = {
        thickness: parsed.thickness ?? c.thickness,
        width: parsed.width ?? c.width,
        style: parsed.style ?? c.style,
        color: parsed.color ?? c.color,
    };

    const update = (patch: Partial<typeof next>) => onDraftChange?.(JSON.stringify({ ...next, ...patch }));

    return (
        <div style={{
            padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
            backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
        }}>
            <div className="rounded-md border bg-white/90 p-2 space-y-2" onBlur={() => onCommit?.()}>
                <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={next.thickness} onChange={(e) => update({ thickness: Number(e.target.value) || 1 })} className="rounded border px-2 py-1 text-xs" />
                    <input type="number" value={next.width} onChange={(e) => update({ width: Number(e.target.value) || 100 })} className="rounded border px-2 py-1 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <select value={next.style} onChange={(e) => update({ style: e.target.value as 'solid' | 'dashed' | 'dotted' })} className="rounded border px-2 py-1 text-xs bg-white">
                        <option value="solid">solid</option>
                        <option value="dashed">dashed</option>
                        <option value="dotted">dotted</option>
                    </select>
                    <input value={next.color} onChange={(e) => update({ color: e.target.value })} className="rounded border px-2 py-1 text-xs" />
                </div>
            </div>
        </div>
    );
}

function PreviewSpacer({ c }: { c: SpacerBlockContent }) {
    return (
        <div style={{
            height: c.height,
            backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
        }} className="relative group/spacer">
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[10px] text-muted-foreground opacity-0 group-hover/spacer:opacity-100 transition-opacity">
                {c.height}px
            </span>
        </div>
    );
}

function PreviewSpacerEditable({
    c,
    draftValue,
    onDraftChange,
    onCommit,
}: {
    c: SpacerBlockContent;
    draftValue?: string;
    onDraftChange?: (value: string) => void;
    onCommit?: () => void;
}) {
    const parsedHeight = Number(draftValue ?? c.height);
    const height = Number.isFinite(parsedHeight) ? parsedHeight : c.height;

    return (
        <div style={{ backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor }} className="p-3">
            <div className="rounded-md border bg-white/90 p-2" onBlur={() => onCommit?.()}>
                <label className="text-[11px] text-muted-foreground">Spacer Height (px)</label>
                <input
                    autoFocus
                    type="number"
                    min={0}
                    value={height}
                    onChange={(e) => onDraftChange?.(e.target.value)}
                    className="mt-1 w-full rounded border px-2 py-1 text-xs"
                />
            </div>
        </div>
    );
}

function PreviewColumns({ c }: { c: ColumnsBlockContent }) {
    const ratios = c.layout === '1-2' ? [1, 2] : c.layout === '2-1' ? [2, 1] : Array(c.cells.length).fill(1);
    const total = ratios.reduce((a, b) => a + b, 0);
    return (
        <div style={{
            padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
            backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
        }}>
            <div style={{ display: 'flex', gap: c.gap }}>
                {c.cells.map((cell, i) => (
                    <div key={i} style={{ flex: ratios[i] / total, minWidth: 0, verticalAlign: c.verticalAlign }}>
                        {cell.imageUrl && (
                            <img src={cell.imageUrl} alt={cell.imageAlt} style={{ width: '100%', height: 'auto', marginBottom: 12, borderRadius: 4 }} />
                        )}
                        {cell.heading && (
                            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#111827' }}>{cell.heading}</h3>
                        )}
                        {cell.text && (
                            <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.5, color: '#374151' }}>{cell.text}</p>
                        )}
                        {cell.buttonLabel && (
                            <span style={{
                                display: 'inline-block', padding: '10px 20px',
                                background: cell.buttonColor, color: '#fff', fontSize: 14,
                                fontWeight: 600, borderRadius: 4, cursor: 'pointer',
                            }}>
                                {cell.buttonLabel}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function PreviewColumnsEditable({
    c,
    draftValue,
    onDraftChange,
    onCommit,
}: {
    c: ColumnsBlockContent;
    draftValue?: string;
    onDraftChange?: (value: string) => void;
    onCommit?: () => void;
}) {
    const parsed = (() => {
        try {
            return draftValue
                ? JSON.parse(draftValue) as { gap?: number; cells?: ColumnsBlockContent['cells'] }
                : {};
        } catch {
            return {};
        }
    })();

    const next = {
        gap: parsed.gap ?? c.gap,
        cells: parsed.cells ?? c.cells,
    };

    const update = (patch: Partial<typeof next>) => onDraftChange?.(JSON.stringify({ ...next, ...patch }));

    return (
        <div style={{
            padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
            backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
        }}>
            <div className="rounded-md border bg-white/90 p-2 space-y-2" onBlur={() => onCommit?.()}>
                <div className="flex items-center gap-2">
                    <label className="text-[11px] text-muted-foreground">Gap</label>
                    <input
                        type="number"
                        min={0}
                        className="w-20 rounded border px-2 py-1 text-xs"
                        value={next.gap}
                        onChange={(e) => update({ gap: Number(e.target.value) || 0 })}
                    />
                </div>
                {next.cells.map((cell, i) => (
                    <div key={i} className="rounded border p-2 space-y-1.5">
                        <input
                            className="w-full rounded border px-2 py-1 text-xs"
                            value={cell.heading}
                            placeholder={`Column ${i + 1} heading`}
                            onChange={(e) => {
                                const cells = [...next.cells];
                                cells[i] = { ...cells[i], heading: e.target.value };
                                update({ cells });
                            }}
                        />
                        <textarea
                            className="w-full min-h-[48px] rounded border px-2 py-1 text-xs"
                            value={cell.text}
                            placeholder={`Column ${i + 1} text`}
                            onChange={(e) => {
                                const cells = [...next.cells];
                                cells[i] = { ...cells[i], text: e.target.value };
                                update({ cells });
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Social Block Preview with Variants ──────────────────────────────── */

function PreviewSocial({ c }: { c: SocialBlockContent }) {
    const variant = c.variant ?? 'icons-only';

    return (
        <div style={{
            padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
            backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
            textAlign: c.align,
        }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: variant === 'pill-buttons' ? 8 : 12, flexWrap: 'wrap', justifyContent: c.align === 'center' ? 'center' : c.align === 'right' ? 'flex-end' : 'flex-start' }}>
                {c.links.map((link, i) => {
                    const brandColor = SOCIAL_BRAND_COLORS[link.platform] ?? c.color;

                    if (variant === 'icons-only') {
                        return (
                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <SocialIcon platform={link.platform} size={c.iconSize} color={c.color} />
                            </span>
                        );
                    }

                    if (variant === 'icons-with-labels') {
                        return (
                            <span key={i} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <SocialIcon platform={link.platform} size={c.iconSize} color={c.color} />
                                <span style={{ fontSize: 10, color: c.color, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {link.label}
                                </span>
                            </span>
                        );
                    }

                    if (variant === 'colored-icons') {
                        return (
                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <SocialIcon platform={link.platform} size={c.iconSize} color={brandColor} />
                            </span>
                        );
                    }

                    if (variant === 'pill-buttons') {
                        return (
                            <span key={i} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '6px 14px', borderRadius: 999,
                                backgroundColor: brandColor, color: '#ffffff',
                                fontSize: 12, fontWeight: 600,
                            }}>
                                <SocialIcon platform={link.platform} size={14} color="#ffffff" />
                                {link.label}
                            </span>
                        );
                    }

                    if (variant === 'rounded-square') {
                        return (
                            <span key={i} style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: c.iconSize + 16, height: c.iconSize + 16,
                                borderRadius: 8, backgroundColor: c.color + '18',
                            }}>
                                <SocialIcon platform={link.platform} size={c.iconSize} color={c.color} />
                            </span>
                        );
                    }

                    return (
                        <span key={i} style={{ display: 'inline-flex' }}>
                            <SocialIcon platform={link.platform} size={c.iconSize} color={c.color} />
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

function PreviewSocialEditable({
    c,
    draftValue,
    onDraftChange,
    onCommit,
}: {
    c: SocialBlockContent;
    draftValue?: string;
    onDraftChange?: (value: string) => void;
    onCommit?: () => void;
}) {
    const parsed = (() => {
        try {
            return draftValue
                ? JSON.parse(draftValue) as { iconSize?: number; links?: SocialBlockContent['links'] }
                : {};
        } catch {
            return {};
        }
    })();

    const next = {
        iconSize: parsed.iconSize ?? c.iconSize,
        links: parsed.links ?? c.links,
    };

    const update = (patch: Partial<typeof next>) => onDraftChange?.(JSON.stringify({ ...next, ...patch }));

    return (
        <div style={{
            padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
            backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
        }}>
            <div className="rounded-md border bg-white/90 p-2 space-y-2" onBlur={() => onCommit?.()}>
                <div className="flex items-center gap-2">
                    <label className="text-[11px] text-muted-foreground">Icon Size</label>
                    <input
                        type="number"
                        min={10}
                        max={48}
                        className="w-20 rounded border px-2 py-1 text-xs"
                        value={next.iconSize}
                        onChange={(e) => update({ iconSize: Number(e.target.value) || c.iconSize })}
                    />
                </div>
                {next.links.map((link, i) => (
                    <div key={`${link.platform}-${i}`} className="grid grid-cols-[96px_1fr] gap-1">
                        <input
                            className="rounded border px-2 py-1 text-xs"
                            value={link.label}
                            onChange={(e) => {
                                const links = [...next.links];
                                links[i] = { ...links[i], label: e.target.value };
                                update({ links });
                            }}
                        />
                        <input
                            className="rounded border px-2 py-1 text-xs"
                            value={link.url}
                            onChange={(e) => {
                                const links = [...next.links];
                                links[i] = { ...links[i], url: e.target.value };
                                update({ links });
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Footer Block Preview with Variants ──────────────────────────────── */

function PreviewFooter({
    c,
    isEditing,
    draftValue,
    onDraftChange,
    onCommit,
}: {
    c: FooterBlockContent;
    isEditing?: boolean;
    draftValue?: string;
    onDraftChange?: (value: string) => void;
    onCommit?: () => void;
}) {
    const variant = c.variant ?? 'centered';

    const footerMainText = draftValue ?? c.html;

    if (isEditing) {
        return (
            <div style={{
                padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
                backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
            }}>
                <textarea
                    autoFocus
                    value={footerMainText}
                    onChange={(e) => onDraftChange?.(e.target.value)}
                    onBlur={() => onCommit?.()}
                    className="w-full rounded-md px-2 py-1 outline-none"
                    style={{
                        margin: 0,
                        fontSize: c.fontSize,
                        color: c.color,
                        textAlign: c.textAlign,
                        lineHeight: 1.5,
                        border: 'none',
                        backgroundColor: 'transparent',
                        outline: '2px solid rgba(59,130,246,0.5)',
                    }}
                />
            </div>
        );
    }

    if (variant === 'minimal') {
        return (
            <div style={{
                padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
                backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
            }}>
                <p style={{ margin: 0, fontSize: c.fontSize, color: c.color, textAlign: c.textAlign, lineHeight: 1.5 }}>
                    {footerMainText}
                    {c.showUnsubscribe && (
                        <> &mdash; <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>{c.unsubscribeText}</span></>
                    )}
                </p>
            </div>
        );
    }

    if (variant === 'dark') {
        return (
            <div style={{
                padding: `${c.padding.top + 8}px ${c.padding.right}px ${c.padding.bottom + 8}px ${c.padding.left}px`,
                backgroundColor: '#1f2937',
            }}>
                <p style={{ margin: '0 0 8px', fontSize: c.fontSize, color: '#d1d5db', textAlign: c.textAlign, lineHeight: 1.5 }}>
                    {footerMainText}
                </p>
                {c.showUnsubscribe && (
                    <p style={{ margin: 0, fontSize: c.fontSize, color: '#9ca3af', textAlign: c.textAlign }}>
                        <span style={{ textDecoration: 'underline', cursor: 'pointer', color: '#9ca3af' }}>{c.unsubscribeText}</span>
                        {' \u00b7 '}
                        <span style={{ textDecoration: 'underline', cursor: 'pointer', color: '#9ca3af' }}>Preferences</span>
                    </p>
                )}
            </div>
        );
    }

    if (variant === 'detailed') {
        return (
            <div style={{
                padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
                backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
                borderTop: '1px solid #e5e7eb',
            }}>
                <div style={{ textAlign: c.textAlign, marginBottom: 12 }}>
                    <p style={{ margin: '0 0 4px', fontSize: c.fontSize + 1, color: '#6b7280', fontWeight: 600, lineHeight: 1.5 }}>
                        {'{{company.name}}'}
                    </p>
                    <p style={{ margin: 0, fontSize: c.fontSize, color: c.color, lineHeight: 1.5 }}>
                        {footerMainText}
                    </p>
                </div>
                <div style={{ textAlign: c.textAlign, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                    {c.showUnsubscribe && (
                        <p style={{ margin: 0, fontSize: c.fontSize, color: c.color }}>
                            <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>{c.unsubscribeText}</span>
                            {' \u00b7 '}
                            <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Update preferences</span>
                            {' \u00b7 '}
                            <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>View in browser</span>
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (variant === 'branded') {
        return (
            <div style={{
                padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
                backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
                borderTop: '3px solid #2563eb',
            }}>
                <p style={{ margin: '0 0 8px', fontSize: c.fontSize, color: c.color, textAlign: c.textAlign, lineHeight: 1.5 }}>
                    {footerMainText}
                </p>
                {c.showUnsubscribe && (
                    <p style={{ margin: 0, fontSize: c.fontSize, color: '#2563eb', textAlign: c.textAlign }}>
                        <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>{c.unsubscribeText}</span>
                    </p>
                )}
            </div>
        );
    }

    // 'centered' (default)
    return (
        <div style={{
            padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
            backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
        }}>
            <p style={{ margin: '0 0 8px', fontSize: c.fontSize, color: c.color, textAlign: c.textAlign, lineHeight: 1.5 }}>
                {footerMainText}
            </p>
            {c.showUnsubscribe && (
                <p style={{ margin: 0, fontSize: c.fontSize, color: c.color, textAlign: c.textAlign }}>
                    <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>{c.unsubscribeText}</span>
                </p>
            )}
        </div>
    );
}

/* ── Video Block Preview ─────────────────────────────────────────────── */

function PreviewVideo({ c }: { c: VideoBlockContent }) {
    return (
        <div style={{
            padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
            backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
        }}>
            <div style={{
                position: 'relative',
                borderRadius: c.borderRadius,
                overflow: 'hidden',
                cursor: 'pointer',
            }}>
                {c.thumbnailUrl ? (
                    <img src={c.thumbnailUrl} alt={c.alt} style={{ width: '100%', height: 'auto', display: 'block' }} />
                ) : (
                    <div style={{
                        width: '100%', height: 240,
                        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <span style={{ color: '#94a3b8', fontSize: 14 }}>Video Thumbnail</span>
                    </div>
                )}
                {/* Play button overlay */}
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: c.overlayColor,
                }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}>
                        <div style={{
                            width: 0, height: 0,
                            borderTop: '12px solid transparent',
                            borderBottom: '12px solid transparent',
                            borderLeft: '20px solid #111827',
                            marginLeft: 4,
                        }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function PreviewVideoEditable({
    c,
    draftValue,
    onDraftChange,
    onCommit,
}: {
    c: VideoBlockContent;
    draftValue?: string;
    onDraftChange?: (value: string) => void;
    onCommit?: () => void;
}) {
    const parsed = (() => {
        try {
            return draftValue ? JSON.parse(draftValue) as { thumbnailUrl?: string; href?: string; alt?: string } : {};
        } catch {
            return {};
        }
    })();

    const next = {
        thumbnailUrl: parsed.thumbnailUrl ?? c.thumbnailUrl,
        href: parsed.href ?? c.href,
        alt: parsed.alt ?? c.alt,
    };

    const update = (patch: Partial<typeof next>) => onDraftChange?.(JSON.stringify({ ...next, ...patch }));

    return (
        <div style={{
            padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
            backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
        }}>
            <div className="rounded-md border bg-white/90 p-2 space-y-2" onBlur={() => onCommit?.()}>
                <input autoFocus value={next.thumbnailUrl} onChange={(e) => update({ thumbnailUrl: e.target.value })} placeholder="Thumbnail URL" className="w-full rounded border px-2 py-1 text-xs" />
                <input value={next.href} onChange={(e) => update({ href: e.target.value })} placeholder="Video URL" className="w-full rounded border px-2 py-1 text-xs" />
                <input value={next.alt} onChange={(e) => update({ alt: e.target.value })} placeholder="Alt text" className="w-full rounded border px-2 py-1 text-xs" />
            </div>
        </div>
    );
}

/* ── Quote Block Preview ─────────────────────────────────────────────── */

function PreviewQuote({
    c,
    isEditing,
    draftValue,
    onDraftChange,
    onCommit,
}: {
    c: QuoteBlockContent;
    isEditing?: boolean;
    draftValue?: string;
    onDraftChange?: (value: string) => void;
    onCommit?: () => void;
}) {
    const quoteText = draftValue ?? c.text;

    if (c.style === 'large-quote') {
        return (
            <div style={{
                padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
                backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
                textAlign: c.textAlign,
            }}>
                <div style={{ fontSize: 48, lineHeight: 1, color: c.accentColor, fontFamily: 'Georgia, serif', marginBottom: -8 }}>&ldquo;</div>
                {isEditing ? (
                    <textarea
                        autoFocus
                        value={quoteText}
                        onChange={(e) => onDraftChange?.(e.target.value)}
                        onBlur={() => onCommit?.()}
                        className="w-full rounded-md px-2 py-1 outline-none"
                        style={{
                            margin: '0 0 12px',
                            fontFamily: c.fontFamily,
                            fontSize: c.fontSize,
                            fontStyle: 'italic',
                            lineHeight: 1.6,
                            color: c.color,
                            border: 'none',
                            backgroundColor: 'transparent',
                            outline: '2px solid rgba(59,130,246,0.5)',
                        }}
                    />
                ) : (
                    <p style={{
                        margin: '0 0 12px', fontFamily: c.fontFamily, fontSize: c.fontSize,
                        fontStyle: 'italic', lineHeight: 1.6, color: c.color,
                    }}>
                        {quoteText}
                    </p>
                )}
                {(c.attribution || c.attributionTitle) && (
                    <div>
                        {c.attribution && (
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: c.color }}>{c.attribution}</p>
                        )}
                        {c.attributionTitle && (
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>{c.attributionTitle}</p>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (c.style === 'card') {
        return (
            <div style={{
                padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
                backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
            }}>
                <div style={{
                    padding: '24px', borderRadius: 8,
                    backgroundColor: c.accentColor + '08',
                    border: `1px solid ${c.accentColor}20`,
                    textAlign: c.textAlign,
                }}>
                    {isEditing ? (
                        <textarea
                            autoFocus
                            value={quoteText}
                            onChange={(e) => onDraftChange?.(e.target.value)}
                            onBlur={() => onCommit?.()}
                            className="w-full rounded-md px-2 py-1 outline-none"
                            style={{
                                margin: '0 0 16px',
                                fontFamily: c.fontFamily,
                                fontSize: c.fontSize,
                                fontStyle: 'italic',
                                lineHeight: 1.6,
                                color: c.color,
                                border: 'none',
                                backgroundColor: 'transparent',
                                outline: '2px solid rgba(59,130,246,0.5)',
                            }}
                        />
                    ) : (
                        <p style={{
                            margin: '0 0 16px', fontFamily: c.fontFamily, fontSize: c.fontSize,
                            fontStyle: 'italic', lineHeight: 1.6, color: c.color,
                        }}>
                            &ldquo;{quoteText}&rdquo;
                        </p>
                    )}
                    {(c.attribution || c.attributionTitle) && (
                        <div style={{ borderTop: `1px solid ${c.accentColor}15`, paddingTop: 12 }}>
                            {c.attribution && (
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: c.accentColor }}>{c.attribution}</p>
                            )}
                            {c.attributionTitle && (
                                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>{c.attributionTitle}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 'border-left' (default)
    return (
        <div style={{
            padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
            backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
        }}>
            <div style={{
                borderLeft: `4px solid ${c.accentColor}`,
                paddingLeft: 20,
                textAlign: c.textAlign,
            }}>
                {isEditing ? (
                    <textarea
                        autoFocus
                        value={quoteText}
                        onChange={(e) => onDraftChange?.(e.target.value)}
                        onBlur={() => onCommit?.()}
                        className="w-full rounded-md px-2 py-1 outline-none"
                        style={{
                            margin: '0 0 12px',
                            fontFamily: c.fontFamily,
                            fontSize: c.fontSize,
                            fontStyle: 'italic',
                            lineHeight: 1.6,
                            color: c.color,
                            border: 'none',
                            backgroundColor: 'transparent',
                            outline: '2px solid rgba(59,130,246,0.5)',
                        }}
                    />
                ) : (
                    <p style={{
                        margin: '0 0 12px', fontFamily: c.fontFamily, fontSize: c.fontSize,
                        fontStyle: 'italic', lineHeight: 1.6, color: c.color,
                    }}>
                        &ldquo;{quoteText}&rdquo;
                    </p>
                )}
                {(c.attribution || c.attributionTitle) && (
                    <div>
                        {c.attribution && (
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: c.color }}>{c.attribution}</p>
                        )}
                        {c.attributionTitle && (
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>{c.attributionTitle}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── List Block Preview ──────────────────────────────────────────────── */

const LIST_ICONS: Record<string, string> = {
    bullet: '\u2022',
    check: '\u2713',
    arrow: '\u2192',
    star: '\u2605',
};

function PreviewList({ c }: { c: ListBlockContent }) {
    return (
        <div style={{
            padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
            backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
        }}>
            {c.items.map((item, i) => (
                <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    marginBottom: i < c.items.length - 1 ? c.spacing : 0,
                }}>
                    <span style={{
                        fontSize: c.style === 'numbered' ? c.fontSize : c.fontSize + 2,
                        color: c.iconColor,
                        fontWeight: 700,
                        lineHeight: 1.5,
                        minWidth: c.style === 'numbered' ? 20 : 16,
                        fontFamily: c.fontFamily,
                    }}>
                        {c.style === 'numbered' ? `${i + 1}.` : LIST_ICONS[c.style] ?? '\u2022'}
                    </span>
                    <span style={{
                        fontSize: c.fontSize, lineHeight: 1.5,
                        color: c.color, fontFamily: c.fontFamily,
                    }}>
                        {item.text}
                    </span>
                </div>
            ))}
        </div>
    );
}

function PreviewListEditable({
    c,
    draftValue,
    onDraftChange,
    onCommit,
}: {
    c: ListBlockContent;
    draftValue?: string;
    onDraftChange?: (value: string) => void;
    onCommit?: () => void;
}) {
    const value = draftValue ?? c.items.map((item) => item.text).join('\n');

    return (
        <div style={{
            padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
            backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
        }}>
            <textarea
                autoFocus
                value={value}
                onChange={(e) => onDraftChange?.(e.target.value)}
                onBlur={() => onCommit?.()}
                className="w-full rounded-md px-2 py-1 outline-none"
                style={{
                    minHeight: 120,
                    fontSize: c.fontSize,
                    lineHeight: 1.5,
                    color: c.color,
                    fontFamily: c.fontFamily,
                    border: 'none',
                    backgroundColor: 'transparent',
                    outline: '2px solid rgba(59,130,246,0.5)',
                }}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">One list item per line.</p>
        </div>
    );
}

/* ── Block Preview Dispatcher ────────────────────────────────────────── */

function BlockPreview({
    block,
    isEditing,
    draftValue,
    onDraftChange,
    onCommit,
}: {
    block: EmailBlock;
    isEditing?: boolean;
    draftValue?: string;
    onDraftChange?: (value: string) => void;
    onCommit?: () => void;
}) {
    switch (block.type) {
        case 'text': return <PreviewText c={block.content} isEditing={isEditing} draftValue={draftValue} onDraftChange={onDraftChange} onCommit={onCommit} />;
        case 'heading': return <PreviewHeading c={block.content} isEditing={isEditing} draftValue={draftValue} onDraftChange={onDraftChange} onCommit={onCommit} />;
        case 'image': return isEditing
            ? <PreviewImageEditable c={block.content} draftValue={draftValue} onDraftChange={onDraftChange} onCommit={onCommit} />
            : <PreviewImage c={block.content} />;
        case 'button': return <PreviewButton c={block.content} isEditing={isEditing} draftValue={draftValue} onDraftChange={onDraftChange} onCommit={onCommit} />;
        case 'divider': return isEditing
            ? <PreviewDividerEditable c={block.content} draftValue={draftValue} onDraftChange={onDraftChange} onCommit={onCommit} />
            : <PreviewDivider c={block.content} />;
        case 'spacer': return isEditing
            ? <PreviewSpacerEditable c={block.content} draftValue={draftValue} onDraftChange={onDraftChange} onCommit={onCommit} />
            : <PreviewSpacer c={block.content} />;
        case 'columns': return isEditing
            ? <PreviewColumnsEditable c={block.content} draftValue={draftValue} onDraftChange={onDraftChange} onCommit={onCommit} />
            : <PreviewColumns c={block.content} />;
        case 'social': return isEditing
            ? <PreviewSocialEditable c={block.content} draftValue={draftValue} onDraftChange={onDraftChange} onCommit={onCommit} />
            : <PreviewSocial c={block.content} />;
        case 'footer': return <PreviewFooter c={block.content} isEditing={isEditing} draftValue={draftValue} onDraftChange={onDraftChange} onCommit={onCommit} />;
        case 'video': return isEditing
            ? <PreviewVideoEditable c={block.content} draftValue={draftValue} onDraftChange={onDraftChange} onCommit={onCommit} />
            : <PreviewVideo c={block.content} />;
        case 'quote': return <PreviewQuote c={block.content} isEditing={isEditing} draftValue={draftValue} onDraftChange={onDraftChange} onCommit={onCommit} />;
        case 'list': return isEditing
            ? <PreviewListEditable c={block.content} draftValue={draftValue} onDraftChange={onDraftChange} onCommit={onCommit} />
            : <PreviewList c={block.content} />;
    }
}

/* ── Props ───────────────────────────────────────────────────────────── */

interface CanvasProps {
    blocks: EmailBlock[];
    selectedBlockId: string | null;
    globalStyles: GlobalStyles;
    device: 'desktop' | 'mobile';
    onSelectBlock: (id: string | null) => void;
    onReorderBlock: (fromIndex: number, toIndex: number) => void;
    onDeleteBlock: (id: string) => void;
    onDuplicateBlock: (id: string) => void;
    onMoveBlock: (id: string, direction: 'up' | 'down') => void;
    onDropNewBlock: (type: BlockType, index: number) => void;
    onInlineTextEdit: (blockId: string, field: 'html' | 'text', value: string) => void;
}

/* ── Canvas Component ────────────────────────────────────────────────── */

export function BuilderCanvas({
    blocks,
    selectedBlockId,
    globalStyles,
    device,
    onSelectBlock,
    onReorderBlock,
    onDeleteBlock,
    onDuplicateBlock,
    onMoveBlock,
    onDropNewBlock,
    onInlineTextEdit,
}: CanvasProps) {
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const dragOverIndexRef = useRef<number | null>(null);
    const dragItemIndex = useRef<number | null>(null);
    const dragIsPalette = useRef(false);
    const dragPaletteType = useRef<BlockType | null>(null);
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
    const [editingField, setEditingField] = useState<'html' | 'text' | null>(null);
    const [inlineDrafts, setInlineDrafts] = useState<Record<string, string>>({});

    const getEditableField = useCallback((block: EmailBlock): 'html' | 'text' | null => {
        if (block.type === 'text') return 'html';
        if (block.type === 'footer') return 'html';
        if (block.type === 'image') return 'text';
        if (block.type === 'divider') return 'text';
        if (block.type === 'spacer') return 'text';
        if (block.type === 'video') return 'text';
        if (block.type === 'columns') return 'text';
        if (block.type === 'social') return 'text';
        if (block.type === 'heading') return 'text';
        if (block.type === 'button' || block.type === 'quote' || block.type === 'list') return 'text';
        return null;
    }, []);

    const getInlineValue = useCallback((block: EmailBlock, field: 'html' | 'text'): string => {
        if (field === 'html' && block.type === 'text') return block.content.html;
        if (field === 'html' && block.type === 'footer') return block.content.html;
        if (field === 'text' && block.type === 'image') return JSON.stringify({ src: block.content.src, alt: block.content.alt, href: block.content.href });
        if (field === 'text' && block.type === 'divider') return JSON.stringify({ thickness: block.content.thickness, width: block.content.width, style: block.content.style, color: block.content.color });
        if (field === 'text' && block.type === 'spacer') return String(block.content.height);
        if (field === 'text' && block.type === 'video') return JSON.stringify({ thumbnailUrl: block.content.thumbnailUrl, href: block.content.href, alt: block.content.alt });
        if (field === 'text' && block.type === 'columns') return JSON.stringify({ gap: block.content.gap, cells: block.content.cells });
        if (field === 'text' && block.type === 'social') return JSON.stringify({ iconSize: block.content.iconSize, links: block.content.links });
        if (field === 'text' && (block.type === 'heading' || block.type === 'button' || block.type === 'quote')) return block.content.text;
        if (field === 'text' && block.type === 'list') return block.content.items.map((item) => item.text).join('\n');
        return '';
    }, []);

    const getDraftKey = useCallback((blockId: string, field: 'html' | 'text') => `${blockId}:${field}`, []);

    const beginInlineEdit = useCallback((block: EmailBlock) => {
        const field = getEditableField(block);
        if (!field) return;

        const draftKey = getDraftKey(block.id, field);
        const initialValue = getInlineValue(block, field);
        setEditingBlockId(block.id);
        setEditingField(field);
        setInlineDrafts((prev) => (prev[draftKey] !== undefined ? prev : { ...prev, [draftKey]: initialValue }));
        onSelectBlock(block.id);
    }, [getDraftKey, getEditableField, getInlineValue, onSelectBlock]);

    const commitInlineEdit = useCallback((block: EmailBlock) => {
        const field = editingField ?? getEditableField(block);
        if (!field) return;

        const draftKey = getDraftKey(block.id, field);
        const fallbackValue = getInlineValue(block, field);
        const nextValue = inlineDrafts[draftKey] ?? fallbackValue;

        if (nextValue !== fallbackValue) {
            onInlineTextEdit(block.id, field, nextValue);
        }

        setInlineDrafts((prev) => {
            const next = { ...prev };
            delete next[draftKey];
            return next;
        });
        setEditingBlockId(null);
        setEditingField(null);
    }, [editingField, getDraftKey, getEditableField, getInlineValue, inlineDrafts, onInlineTextEdit]);

    const updateDragOverIndex = useCallback((value: number | null) => {
        dragOverIndexRef.current = value;
        setDragOverIndex(value);
    }, []);

    const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (blocks.length === 0) {
            updateDragOverIndex(0);
        }
    }, [blocks.length, updateDragOverIndex]);

    const handleCanvasDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const paletteType = e.dataTransfer.getData('application/x-block-type') as BlockType;
        const idx = dragOverIndexRef.current;
        if (paletteType) {
            onDropNewBlock(paletteType, idx ?? blocks.length);
        }
        updateDragOverIndex(null);
        dragItemIndex.current = null;
        dragIsPalette.current = false;
        dragPaletteType.current = null;
    }, [onDropNewBlock, blocks.length, updateDragOverIndex]);

    const handleBlockDragStart = useCallback((e: React.DragEvent, index: number) => {
        dragItemIndex.current = index;
        dragIsPalette.current = false;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
    }, []);

    const handleBlockDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        updateDragOverIndex(index);
    }, [updateDragOverIndex]);

    const handleBlockDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        const paletteType = e.dataTransfer.getData('application/x-block-type') as BlockType;
        if (paletteType) {
            onDropNewBlock(paletteType, targetIndex);
        } else if (dragItemIndex.current !== null && dragItemIndex.current !== targetIndex) {
            onReorderBlock(dragItemIndex.current, targetIndex);
        }
        updateDragOverIndex(null);
        dragItemIndex.current = null;
    }, [onDropNewBlock, onReorderBlock, updateDragOverIndex]);

    const handleDragEnd = useCallback(() => {
        updateDragOverIndex(null);
        dragItemIndex.current = null;
    }, [updateDragOverIndex]);

    const canvasWidth = device === 'desktop' ? globalStyles.contentWidth : 375;

    return (
        <div
            className="flex-1 overflow-y-auto bg-[#f8f9fc] dark:bg-muted/20 p-6 sm:p-8"
            onClick={() => {
                setEditingBlockId(null);
                setEditingField(null);
                onSelectBlock(null);
            }}
            style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)',
                backgroundSize: '24px 24px',
            }}
        >
            <div
                className="mx-auto transition-all duration-200"
                style={{
                    width: canvasWidth,
                    maxWidth: '100%',
                    backgroundColor: globalStyles.backgroundColor,
                    minHeight: 400,
                }}
                onDragOver={handleCanvasDragOver}
                onDrop={handleCanvasDrop}
            >
                <div
                    className="mx-auto shadow-lg ring-1 ring-black/5"
                    style={{
                        maxWidth: globalStyles.contentWidth,
                        backgroundColor: globalStyles.contentBg,
                        borderRadius: globalStyles.borderRadius,
                    }}
                >
                    {blocks.length === 0 && (
                        <div
                            className={cn(
                                'flex flex-col items-center justify-center py-24 text-muted-foreground select-none pointer-events-none transition-colors',
                                dragOverIndex === 0 && 'bg-blue-50/60 dark:bg-blue-950/20 ring-2 ring-inset ring-blue-400/50 ring-dashed rounded-lg',
                            )}
                        >
                            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                                <ImageIcon className="h-7 w-7 opacity-40" />
                            </div>
                            <div className="text-base font-semibold mb-1 text-foreground/60">
                                {dragOverIndex === 0 ? 'Release to drop' : 'Drop blocks here'}
                            </div>
                            <div className="text-sm text-muted-foreground/70">Drag content blocks from the left panel to start building</div>
                        </div>
                    )}

                    {blocks.map((block, index) => {
                        const isSelected = block.id === selectedBlockId;
                        const editableField = getEditableField(block);
                        const isEditing = editingBlockId === block.id && !!editableField;
                        const draftKey = editableField ? getDraftKey(block.id, editableField) : null;
                        const Icon = BLOCK_ICONS[block.type];

                        return (
                            <React.Fragment key={block.id}>
                                {dragOverIndex === index && (
                                    <div className="h-0.5 bg-blue-500 mx-4 rounded-full transition-all" />
                                )}

                                <div
                                    className={cn(
                                        'group relative transition-all duration-150',
                                        isSelected && 'ring-2 ring-blue-500 ring-inset z-10',
                                        !isSelected && 'hover:ring-1 hover:ring-blue-300 dark:hover:ring-blue-700 hover:ring-inset',
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectBlock(block.id);
                                        if (editableField) {
                                            beginInlineEdit(block);
                                        }
                                    }}
                                    draggable={!isEditing}
                                    onDragStart={(e) => handleBlockDragStart(e, index)}
                                    onDragOver={(e) => handleBlockDragOver(e, index)}
                                    onDrop={(e) => handleBlockDrop(e, index)}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className={cn(
                                        'absolute -top-[14px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5',
                                        'rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                                        'shadow-md px-1.5 py-0.5 transition-all duration-150',
                                        isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100',
                                    )}>
                                        <button
                                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-grab active:cursor-grabbing transition-colors"
                                            title="Drag to reorder"
                                            onMouseDown={(e) => e.stopPropagation()}
                                        >
                                            <GripVertical className="h-3.5 w-3.5 text-gray-400" />
                                        </button>
                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider px-1.5 select-none flex items-center gap-1">
                                            <Icon className="h-3 w-3" />
                                            {block.type}
                                        </span>
                                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />
                                        <button
                                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                            title="Move up"
                                            onClick={(e) => { e.stopPropagation(); onMoveBlock(block.id, 'up'); }}
                                            disabled={index === 0}
                                        >
                                            <ChevronUp className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                            title="Move down"
                                            onClick={(e) => { e.stopPropagation(); onMoveBlock(block.id, 'down'); }}
                                            disabled={index === blocks.length - 1}
                                        >
                                            <ChevronDown className="h-3.5 w-3.5" />
                                        </button>
                                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />
                                        <button
                                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                            title="Duplicate"
                                            onClick={(e) => { e.stopPropagation(); onDuplicateBlock(block.id); }}
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
                                            title="Delete"
                                            onClick={(e) => { e.stopPropagation(); onDeleteBlock(block.id); }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    <BlockPreview
                                        block={block}
                                        isEditing={isEditing}
                                        draftValue={draftKey ? inlineDrafts[draftKey] : undefined}
                                        onDraftChange={(value) => {
                                            if (!editableField || !draftKey) return;
                                            setInlineDrafts((prev) => ({ ...prev, [draftKey]: value }));
                                        }}
                                        onCommit={() => commitInlineEdit(block)}
                                    />

                                    {editableField && isSelected && !isEditing && (
                                        <div className="pointer-events-none absolute bottom-1 right-2 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-white">
                                            Click to edit
                                        </div>
                                    )}
                                </div>
                            </React.Fragment>
                        );
                    })}

                    {blocks.length > 0 && dragOverIndex === blocks.length && (
                        <div className="h-0.5 bg-blue-500 mx-4 rounded-full" />
                    )}

                    {blocks.length > 0 && (
                        <div
                            className="h-12"
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); updateDragOverIndex(blocks.length); }}
                            onDrop={(e) => handleBlockDrop(e, blocks.length)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
