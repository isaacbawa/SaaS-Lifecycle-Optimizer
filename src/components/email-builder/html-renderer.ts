/* ==========================================================================
 * Email Builder - HTML Renderer
 *
 * Generates production-quality, email-client-compatible HTML from the
 * block array. Follows industry best practices:
 *
 *   - Table-based layout (Outlook, Gmail, Yahoo, Apple Mail compatible)
 *   - All styles inlined
 *   - MSO conditionals for Outlook desktop
 *   - Responsive viewport meta
 *   - CAN-SPAM compliant with unsubscribe link support
 *   - Preheader text hidden correctly
 *   - role="presentation" on all layout tables
 * ========================================================================== */

import type {
  EmailBlock,
  GlobalStyles,
  TextBlockContent,
  HeadingBlockContent,
  ImageBlockContent,
  ButtonBlockContent,
  DividerBlockContent,
  SpacerBlockContent,
  ColumnsBlockContent,
  SocialBlockContent,
  FooterBlockContent,
  VideoBlockContent,
  QuoteBlockContent,
  ListBlockContent,
  Padding,
} from './types';
import {
  SOCIAL_SVG_PATHS,
  SOCIAL_BRAND_COLORS,
  PLATFORM_LABELS,
} from './social-icons';

/* ── Helpers ─────────────────────────────────────────────────────────── */

function px(n: number) { return `${n}px`; }
function padStr(p: Padding) { return `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`; }

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function bgAttr(bg: string): string {
  if (!bg || bg === 'transparent') return '';
  return ` bgcolor="${bg}"`;
}

function bgStyle(bg: string): string {
  if (!bg || bg === 'transparent') return '';
  return `background-color:${bg};`;
}

/* ── Social Icon SVGs - imported from social-icons.tsx ────────────────── */

function renderSocialIcon(platform: string, color: string, size: number): string {
  const path = SOCIAL_SVG_PATHS[platform];
  if (!path) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}"><path d="${path}"/></svg>`;
}

/* ── Block renderers ─────────────────────────────────────────────────── */

function renderTextBlock(c: TextBlockContent): string {
  return `<tr><td style="padding:${padStr(c.padding)};${bgStyle(c.backgroundColor)}font-family:${c.fontFamily};font-size:${px(c.fontSize)};line-height:${c.lineHeight};color:${c.color};text-align:${c.textAlign};">${c.html}</td></tr>`;
}

function renderHeadingBlock(c: HeadingBlockContent): string {
  const sizes: Record<number, number> = { 1: 28, 2: 22, 3: 18 };
  const fs = sizes[c.level] ?? 28;
  return `<tr><td style="padding:${padStr(c.padding)};${bgStyle(c.backgroundColor)}"><h${c.level} style="margin:0;font-family:${c.fontFamily};font-size:${px(fs)};font-weight:700;color:${c.color};text-align:${c.textAlign};line-height:1.3;">${esc(c.text)}</h${c.level}></td></tr>`;
}

function renderImageBlock(c: ImageBlockContent): string {
  if (!c.src) {
    return `<tr><td style="padding:${padStr(c.padding)};${bgStyle(c.backgroundColor)}text-align:${c.align};"><div style="width:100%;height:180px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-family:Arial,sans-serif;font-size:14px;">Image placeholder</div></td></tr>`;
  }
  const widthStyle = c.width < 100 ? `width:${c.width}%;` : 'width:100%;';
  const br = c.borderRadius > 0 ? `border-radius:${px(c.borderRadius)};` : '';
  const img = `<img src="${esc(c.src)}" alt="${esc(c.alt)}" style="${widthStyle}max-width:100%;height:auto;display:block;${br}" />`;
  const wrapped = c.href ? `<a href="${esc(c.href)}" target="_blank">${img}</a>` : img;
  return `<tr><td style="padding:${padStr(c.padding)};${bgStyle(c.backgroundColor)}text-align:${c.align};">${wrapped}</td></tr>`;
}

function renderButtonBlock(c: ButtonBlockContent): string {
  const widthAttr = c.fullWidth ? 'width:100%;' : '';
  const btn = `<a href="${esc(c.href)}" target="_blank" style="display:inline-block;${widthAttr}padding:${px(c.paddingV)} ${px(c.paddingH)};background-color:${c.backgroundColor};color:${c.textColor};font-family:${c.fontFamily};font-size:${px(c.fontSize)};font-weight:600;text-decoration:none;border-radius:${px(c.borderRadius)};text-align:center;box-sizing:border-box;mso-padding-alt:0;">${esc(c.text)}</a>`;
  return `<tr><td style="padding:${padStr(c.containerPadding)};${bgStyle(c.containerBg)}text-align:${c.align};">${btn}</td></tr>`;
}

function renderDividerBlock(c: DividerBlockContent): string {
  return `<tr><td style="padding:${padStr(c.padding)};${bgStyle(c.backgroundColor)}"><table role="presentation" width="${c.width}%" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="border-top:${px(c.thickness)} ${c.style} ${c.color};font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>`;
}

function renderSpacerBlock(c: SpacerBlockContent): string {
  return `<tr><td style="height:${px(c.height)};${bgStyle(c.backgroundColor)}font-size:1px;line-height:1px;">&nbsp;</td></tr>`;
}

function renderColumnsBlock(c: ColumnsBlockContent, contentWidth: number): string {
  const cols = c.cells;
  const colCount = cols.length;
  const ratios = c.layout === '1-2' ? [1, 2] : c.layout === '2-1' ? [2, 1] : Array(colCount).fill(1);
  const totalRatio = ratios.reduce((a, b) => a + b, 0);
  const usableWidth = contentWidth - c.padding.left - c.padding.right - (c.gap * (colCount - 1));

  const cellsHtml = cols.map((cell, i) => {
    const cellWidth = Math.floor((ratios[i] / totalRatio) * usableWidth);
    let inner = '';
    if (cell.imageUrl) {
      inner += `<img src="${esc(cell.imageUrl)}" alt="${esc(cell.imageAlt)}" style="width:100%;height:auto;display:block;margin-bottom:12px;" />`;
    }
    if (cell.heading) {
      inner += `<h3 style="margin:0 0 8px;font-size:16px;font-weight:700;color:#111827;">${esc(cell.heading)}</h3>`;
    }
    if (cell.text) {
      inner += `<p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#374151;">${esc(cell.text)}</p>`;
    }
    if (cell.buttonLabel && cell.buttonUrl) {
      inner += `<a href="${esc(cell.buttonUrl)}" style="display:inline-block;padding:10px 20px;background:${cell.buttonColor};color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:4px;">${esc(cell.buttonLabel)}</a>`;
    }
    const paddingRight = i < colCount - 1 ? `padding-right:${px(c.gap)};` : '';
    return `<td width="${cellWidth}" valign="${c.verticalAlign}" style="${paddingRight}vertical-align:${c.verticalAlign};">${inner}</td>`;
  }).join('');

  return `<tr><td style="padding:${padStr(c.padding)};${bgStyle(c.backgroundColor)}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cellsHtml}</tr></table></td></tr>`;
}

function renderSocialBlock(c: SocialBlockContent): string {
  const variant = c.variant ?? 'icons-only';
  const icons = c.links.map((link) => {
    const brandColor = SOCIAL_BRAND_COLORS[link.platform] ?? c.color;
    const useColor = (variant === 'colored-icons' || variant === 'pill-buttons' || variant === 'rounded-square') ? brandColor : c.color;
    const icon = renderSocialIcon(link.platform, variant === 'pill-buttons' ? '#ffffff' : useColor, c.iconSize);
    const label = PLATFORM_LABELS[link.platform] ?? link.label;

    if (variant === 'icons-with-labels') {
      return `<a href="${esc(link.url)}" target="_blank" style="display:inline-block;margin:0 8px;text-decoration:none;text-align:center;" title="${esc(link.label)}">${icon}<br><span style="font-size:11px;color:${c.color};font-family:Arial,sans-serif;">${esc(label)}</span></a>`;
    }
    if (variant === 'pill-buttons') {
      return `<a href="${esc(link.url)}" target="_blank" style="display:inline-block;margin:0 4px;padding:6px 14px;background-color:${brandColor};color:#ffffff;font-family:Arial,sans-serif;font-size:12px;font-weight:600;text-decoration:none;border-radius:20px;vertical-align:middle;" title="${esc(link.label)}">${icon}&nbsp;${esc(label)}</a>`;
    }
    if (variant === 'rounded-square') {
      return `<a href="${esc(link.url)}" target="_blank" style="display:inline-block;margin:0 4px;width:${c.iconSize + 12}px;height:${c.iconSize + 12}px;background-color:${brandColor}15;border-radius:6px;text-align:center;line-height:${c.iconSize + 12}px;text-decoration:none;" title="${esc(link.label)}">${icon}</a>`;
    }
    // icons-only or colored-icons
    return `<a href="${esc(link.url)}" target="_blank" style="display:inline-block;margin:0 6px;text-decoration:none;" title="${esc(link.label)}">${icon}</a>`;
  }).join('');
  return `<tr><td style="padding:${padStr(c.padding)};${bgStyle(c.backgroundColor)}text-align:${c.align};">${icons}</td></tr>`;
}

function renderFooterBlock(c: FooterBlockContent): string {
  const variant = c.variant ?? 'centered';
  let bgColor = c.backgroundColor;
  let textColor = c.color;
  let borderTop = '';

  if (variant === 'dark') {
    bgColor = bgColor === '#f9fafb' ? '#1f2937' : bgColor;
    textColor = '#d1d5db';
  } else if (variant === 'branded') {
    borderTop = 'border-top:3px solid #2563eb;';
  } else if (variant === 'detailed') {
    borderTop = 'border-top:1px solid #e5e7eb;';
  }

  let html = `<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:${px(c.fontSize)};color:${textColor};text-align:${c.textAlign};line-height:1.5;">${c.html}</p>`;

  if (variant === 'detailed') {
    html += `<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:${px(c.fontSize - 1)};color:${textColor};text-align:${c.textAlign};opacity:0.7;"><a href="{{system.preferencesUrl}}" style="color:${textColor};text-decoration:underline;">Email Preferences</a> &middot; <a href="{{system.viewInBrowserUrl}}" style="color:${textColor};text-decoration:underline;">View in Browser</a></p>`;
  }

  if (c.showUnsubscribe) {
    html += `<p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:${px(c.fontSize)};color:${textColor};text-align:${c.textAlign};"><a href="{{system.unsubscribeUrl}}" style="color:${textColor};text-decoration:underline;">${esc(c.unsubscribeText)}</a></p>`;
  }

  return `<tr><td style="padding:${padStr(c.padding)};${borderTop}${bgStyle(bgColor)}">${html}</td></tr>`;
}

/* ── New Block Renderers ─────────────────────────────────────────────── */

function renderVideoBlock(c: VideoBlockContent): string {
  const thumb = c.thumbnailUrl || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 600 340%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22600%22 height=%22340%22/%3E%3Ctext x=%22300%22 y=%22170%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2220%22 font-family=%22Arial%22%3EVideo Thumbnail%3C/text%3E%3C/svg%3E';
  const br = c.borderRadius > 0 ? `border-radius:${px(c.borderRadius)};` : '';
  const overlay = `<div style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;${br}">
    <div style="width:60px;height:60px;background:${c.overlayColor || 'rgba(0,0,0,0.35)'};border-radius:50%;display:flex;align-items:center;justify-content:center;">
      <div style="width:0;height:0;border-top:12px solid transparent;border-bottom:12px solid transparent;border-left:20px solid #ffffff;margin-left:4px;"></div>
    </div>
  </div>`;
  const content = `<a href="${esc(c.href)}" target="_blank" style="display:block;position:relative;text-decoration:none;">
    <img src="${esc(thumb)}" alt="${esc(c.alt)}" style="width:100%;height:auto;display:block;${br}" />
    <!--[if !mso]><!-->${overlay}<!--<![endif]-->
  </a>`;
  return `<tr><td style="padding:${padStr(c.padding)};${bgStyle(c.backgroundColor)}">${content}</td></tr>`;
}

function renderQuoteBlock(c: QuoteBlockContent): string {
  const style = c.style ?? 'border-left';
  let quoteHtml = '';

  if (style === 'border-left') {
    quoteHtml = `<div style="border-left:4px solid ${c.accentColor};padding-left:20px;">
      <p style="margin:0 0 12px;font-family:${c.fontFamily};font-size:${px(c.fontSize)};font-style:italic;color:${c.color};line-height:1.6;text-align:${c.textAlign};">${esc(c.text)}</p>
      <p style="margin:0;font-family:${c.fontFamily};font-size:14px;color:${c.accentColor};font-weight:600;">${esc(c.attribution)}</p>
      ${c.attributionTitle ? `<p style="margin:2px 0 0;font-family:${c.fontFamily};font-size:12px;color:#9ca3af;">${esc(c.attributionTitle)}</p>` : ''}
    </div>`;
  } else if (style === 'large-quote') {
    quoteHtml = `<div style="text-align:${c.textAlign};">
      <span style="font-size:48px;line-height:1;color:${c.accentColor};font-family:Georgia,serif;">&ldquo;</span>
      <p style="margin:0 0 12px;font-family:${c.fontFamily};font-size:${px(c.fontSize)};font-style:italic;color:${c.color};line-height:1.6;">${esc(c.text)}</p>
      <p style="margin:0;font-family:${c.fontFamily};font-size:14px;color:${c.accentColor};font-weight:600;">- ${esc(c.attribution)}</p>
      ${c.attributionTitle ? `<p style="margin:2px 0 0;font-family:${c.fontFamily};font-size:12px;color:#9ca3af;">${esc(c.attributionTitle)}</p>` : ''}
    </div>`;
  } else {
    // card style
    quoteHtml = `<div style="background:#f9fafb;border-radius:8px;padding:24px;border:1px solid #e5e7eb;">
      <p style="margin:0 0 12px;font-family:${c.fontFamily};font-size:${px(c.fontSize)};font-style:italic;color:${c.color};line-height:1.6;text-align:${c.textAlign};">&ldquo;${esc(c.text)}&rdquo;</p>
      <p style="margin:0;font-family:${c.fontFamily};font-size:14px;color:${c.accentColor};font-weight:600;text-align:${c.textAlign};">${esc(c.attribution)}</p>
      ${c.attributionTitle ? `<p style="margin:2px 0 0;font-family:${c.fontFamily};font-size:12px;color:#9ca3af;text-align:${c.textAlign};">${esc(c.attributionTitle)}</p>` : ''}
    </div>`;
  }

  return `<tr><td style="padding:${padStr(c.padding)};${bgStyle(c.backgroundColor)}">${quoteHtml}</td></tr>`;
}

function renderListBlock(c: ListBlockContent): string {
  const icons: Record<string, string> = {
    bullet: '&#8226;', numbered: '', check: '&#10003;', arrow: '&#8594;', star: '&#9733;',
  };
  const items = c.items.map((item, i) => {
    const marker = c.style === 'numbered' ? `${i + 1}.` : icons[c.style] ?? '&#8226;';
    return `<tr>
      <td style="padding:0 8px ${px(c.spacing)} 0;font-family:${c.fontFamily};font-size:${px(c.fontSize)};color:${c.iconColor};vertical-align:top;width:24px;text-align:center;">${marker}</td>
      <td style="padding:0 0 ${px(c.spacing)} 0;font-family:${c.fontFamily};font-size:${px(c.fontSize)};color:${c.color};line-height:1.5;">${esc(item.text)}</td>
    </tr>`;
  }).join('');
  return `<tr><td style="padding:${padStr(c.padding)};${bgStyle(c.backgroundColor)}"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${items}</table></td></tr>`;
}

/* ── Block Dispatch ──────────────────────────────────────────────────── */

function renderBlock(block: EmailBlock, contentWidth: number): string {
  switch (block.type) {
    case 'text': return renderTextBlock(block.content);
    case 'heading': return renderHeadingBlock(block.content);
    case 'image': return renderImageBlock(block.content);
    case 'button': return renderButtonBlock(block.content);
    case 'divider': return renderDividerBlock(block.content);
    case 'spacer': return renderSpacerBlock(block.content);
    case 'columns': return renderColumnsBlock(block.content, contentWidth);
    case 'social': return renderSocialBlock(block.content);
    case 'footer': return renderFooterBlock(block.content);
    case 'video': return renderVideoBlock(block.content);
    case 'quote': return renderQuoteBlock(block.content);
    case 'list': return renderListBlock(block.content);
    default: return '';
  }
}

/* ── Main Render Function ────────────────────────────────────────────── */

export function renderEmailHtml(
  blocks: EmailBlock[],
  globalStyles: GlobalStyles,
  subject: string,
  preheaderText: string,
): string {
  const w = globalStyles.contentWidth;
  const br = globalStyles.borderRadius > 0 ? `border-radius:${px(globalStyles.borderRadius)};` : '';

  const blocksHtml = blocks.map((b) => renderBlock(b, w)).join('\n          ');

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>${esc(subject)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    /* Responsive */
    @media only screen and (max-width: 640px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; }
      .stack-column-center { text-align: center !important; }
      .center-on-narrow { text-align: center !important; display: block !important; margin-left: auto !important; margin-right: auto !important; float: none !important; }
      table.center-on-narrow { display: inline-block !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;word-spacing:normal;background-color:${globalStyles.backgroundColor};">
  <!-- Preheader text (hidden) -->
  <div style="display:none;font-size:1px;color:${globalStyles.backgroundColor};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${esc(preheaderText)}${'&#847; &zwnj; &nbsp; '.repeat(20)}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${globalStyles.backgroundColor};">
    <tr>
      <td align="center" valign="top" style="padding:24px 16px;">
        <!--[if mso]><table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" width="${w}"><tr><td width="${w}" valign="top"><![endif]-->
        <table class="email-container" role="presentation" cellspacing="0" cellpadding="0" border="0" width="${w}" style="max-width:${px(w)};width:100%;margin:0 auto;background-color:${globalStyles.contentBg};${br}"${bgAttr(globalStyles.contentBg)}>
          ${blocksHtml}
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}
