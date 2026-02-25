'use client';

/* ==========================================================================
 * Email Builder — Canvas
 *
 * The central editing surface. Renders email blocks in a 600px container
 * with HTML5 drag-and-drop for reordering and palette drops. Blocks are
 * selectable, duplicatable, and deletable.
 * ========================================================================== */

import React, { useCallback, useRef, useState } from 'react';
import {
  GripVertical, Trash2, Copy, ChevronUp, ChevronDown,
  Type, Heading, ImageIcon, MousePointerClick, Minus,
  Space, Columns, Share2, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  EmailBlock, BlockType, GlobalStyles,
  TextBlockContent, HeadingBlockContent, ImageBlockContent,
  ButtonBlockContent, DividerBlockContent, SpacerBlockContent,
  ColumnsBlockContent, SocialBlockContent, FooterBlockContent,
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
};

/* ── Block Preview Renderers ─────────────────────────────────────────── */

function PreviewText({ c }: { c: TextBlockContent }) {
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

function PreviewHeading({ c }: { c: HeadingBlockContent }) {
  const sizes = { 1: 28, 2: 22, 3: 18 } as const;
  const Tag = `h${c.level}` as keyof JSX.IntrinsicElements;
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
        <div className="flex items-center justify-center bg-muted/60 text-muted-foreground text-sm rounded"
          style={{ width: '100%', height: 180 }}>
          <ImageIcon className="mr-2 h-5 w-5" /> Drop an image URL
        </div>
      )}
    </div>
  );
}

function PreviewButton({ c }: { c: ButtonBlockContent }) {
  return (
    <div style={{
      padding: `${c.containerPadding.top}px ${c.containerPadding.right}px ${c.containerPadding.bottom}px ${c.containerPadding.left}px`,
      backgroundColor: c.containerBg === 'transparent' ? undefined : c.containerBg,
      textAlign: c.align,
    }}>
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

function PreviewSocial({ c }: { c: SocialBlockContent }) {
  return (
    <div style={{
      padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
      backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
      textAlign: c.align,
    }}>
      {c.links.map((link, i) => (
        <span key={i} className="inline-block mx-1.5" style={{ color: c.color }}>
          <span className="text-xs font-medium uppercase tracking-wide">{link.label}</span>
        </span>
      ))}
    </div>
  );
}

function PreviewFooter({ c }: { c: FooterBlockContent }) {
  return (
    <div style={{
      padding: `${c.padding.top}px ${c.padding.right}px ${c.padding.bottom}px ${c.padding.left}px`,
      backgroundColor: c.backgroundColor === 'transparent' ? undefined : c.backgroundColor,
    }}>
      <p style={{ margin: '0 0 8px', fontSize: c.fontSize, color: c.color, textAlign: c.textAlign, lineHeight: 1.5 }}>
        {c.html}
      </p>
      {c.showUnsubscribe && (
        <p style={{ margin: 0, fontSize: c.fontSize, color: c.color, textAlign: c.textAlign }}>
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>{c.unsubscribeText}</span>
        </p>
      )}
    </div>
  );
}

/* ── Block Preview Dispatcher ────────────────────────────────────────── */

function BlockPreview({ block }: { block: EmailBlock }) {
  switch (block.type) {
    case 'text': return <PreviewText c={block.content} />;
    case 'heading': return <PreviewHeading c={block.content} />;
    case 'image': return <PreviewImage c={block.content} />;
    case 'button': return <PreviewButton c={block.content} />;
    case 'divider': return <PreviewDivider c={block.content} />;
    case 'spacer': return <PreviewSpacer c={block.content} />;
    case 'columns': return <PreviewColumns c={block.content} />;
    case 'social': return <PreviewSocial c={block.content} />;
    case 'footer': return <PreviewFooter c={block.content} />;
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
}: CanvasProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItemIndex = useRef<number | null>(null);
  const dragIsPalette = useRef(false);
  const dragPaletteType = useRef<BlockType | null>(null);

  /* ── Canvas-level drop handling ─── */

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // If dragging over empty canvas, show drop indicator at end
    if (blocks.length === 0) {
      setDragOverIndex(0);
    }
  }, [blocks.length]);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const paletteType = e.dataTransfer.getData('application/x-block-type') as BlockType;
    if (paletteType && dragOverIndex !== null) {
      onDropNewBlock(paletteType, dragOverIndex);
    }
    setDragOverIndex(null);
    dragItemIndex.current = null;
    dragIsPalette.current = false;
    dragPaletteType.current = null;
  }, [dragOverIndex, onDropNewBlock]);

  /* ── Block-level drag handlers ─── */

  const handleBlockDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragItemIndex.current = index;
    dragIsPalette.current = false;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleBlockDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  }, []);

  const handleBlockDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const paletteType = e.dataTransfer.getData('application/x-block-type') as BlockType;
    if (paletteType) {
      onDropNewBlock(paletteType, targetIndex);
    } else if (dragItemIndex.current !== null && dragItemIndex.current !== targetIndex) {
      onReorderBlock(dragItemIndex.current, targetIndex);
    }
    setDragOverIndex(null);
    dragItemIndex.current = null;
  }, [onDropNewBlock, onReorderBlock]);

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
    dragItemIndex.current = null;
  }, []);

  const canvasWidth = device === 'desktop' ? globalStyles.contentWidth : 375;

  return (
    <div
      className="flex-1 overflow-y-auto bg-muted/30 p-6 sm:p-8"
      onClick={() => onSelectBlock(null)}
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
        {/* Content area */}
        <div
          className="mx-auto shadow-sm"
          style={{
            maxWidth: globalStyles.contentWidth,
            backgroundColor: globalStyles.contentBg,
            borderRadius: globalStyles.borderRadius,
          }}
        >
          {blocks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground select-none">
              <div className="text-lg font-medium mb-2">Drop blocks here</div>
              <div className="text-sm">Drag content blocks from the left panel to start building</div>
            </div>
          )}

          {blocks.map((block, index) => {
            const isSelected = block.id === selectedBlockId;
            const Icon = BLOCK_ICONS[block.type];

            return (
              <React.Fragment key={block.id}>
                {/* Drop indicator line */}
                {dragOverIndex === index && (
                  <div className="h-0.5 bg-blue-500 mx-4 rounded-full" />
                )}

                <div
                  className={cn(
                    'group relative border-2 border-transparent transition-colors',
                    isSelected && 'border-blue-500',
                    !isSelected && 'hover:border-blue-200 dark:hover:border-blue-800',
                  )}
                  onClick={(e) => { e.stopPropagation(); onSelectBlock(block.id); }}
                  draggable
                  onDragStart={(e) => handleBlockDragStart(e, index)}
                  onDragOver={(e) => handleBlockDragOver(e, index)}
                  onDrop={(e) => handleBlockDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  {/* Block toolbar (shown on hover / selection) */}
                  <div className={cn(
                    'absolute -top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 rounded-md bg-background border shadow-sm px-1 py-0.5 transition-opacity',
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                  )}>
                    <button
                      className="p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
                      title="Drag to reorder"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-1 select-none flex items-center gap-1">
                      <Icon className="h-3 w-3" />
                      {block.type}
                    </span>
                    <div className="w-px h-4 bg-border mx-0.5" />
                    <button
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Move up"
                      onClick={(e) => { e.stopPropagation(); onMoveBlock(block.id, 'up'); }}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Move down"
                      onClick={(e) => { e.stopPropagation(); onMoveBlock(block.id, 'down'); }}
                      disabled={index === blocks.length - 1}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px h-4 bg-border mx-0.5" />
                    <button
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Duplicate"
                      onClick={(e) => { e.stopPropagation(); onDuplicateBlock(block.id); }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); onDeleteBlock(block.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Block visual preview */}
                  <BlockPreview block={block} />
                </div>
              </React.Fragment>
            );
          })}

          {/* Final drop zone after all blocks */}
          {blocks.length > 0 && dragOverIndex === blocks.length && (
            <div className="h-0.5 bg-blue-500 mx-4 rounded-full" />
          )}

          {/* Bottom drop area (always present when dragging) */}
          {blocks.length > 0 && (
            <div
              className="h-12"
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverIndex(blocks.length); }}
              onDrop={(e) => handleBlockDrop(e, blocks.length)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
