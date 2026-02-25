/* ==========================================================================
 * Email Builder — HTML Renderer
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
  Padding,
} from './types';

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

/* ── Social Icon SVGs (inline, email-safe) ───────────────────────────── */

const SOCIAL_ICONS: Record<string, string> = {
  twitter: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  instagram: 'M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z',
  youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
};

function renderSocialIcon(platform: string, color: string, size: number): string {
  const path = SOCIAL_ICONS[platform];
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
  const icons = c.links.map((link) => {
    const icon = renderSocialIcon(link.platform, c.color, c.iconSize);
    return `<a href="${esc(link.url)}" target="_blank" style="display:inline-block;margin:0 6px;text-decoration:none;" title="${esc(link.label)}">${icon}</a>`;
  }).join('');
  return `<tr><td style="padding:${padStr(c.padding)};${bgStyle(c.backgroundColor)}text-align:${c.align};">${icons}</td></tr>`;
}

function renderFooterBlock(c: FooterBlockContent): string {
  let html = `<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:${px(c.fontSize)};color:${c.color};text-align:${c.textAlign};line-height:1.5;">${c.html}</p>`;
  if (c.showUnsubscribe) {
    html += `<p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:${px(c.fontSize)};color:${c.color};text-align:${c.textAlign};"><a href="{{system.unsubscribeUrl}}" style="color:${c.color};text-decoration:underline;">${esc(c.unsubscribeText)}</a></p>`;
  }
  return `<tr><td style="padding:${padStr(c.padding)};${bgStyle(c.backgroundColor)}">${html}</td></tr>`;
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
