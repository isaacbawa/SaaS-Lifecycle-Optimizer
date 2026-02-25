/* ==========================================================================
 * Email Builder — Type System
 *
 * Defines all block types, content models, template structure, and the
 * personalization variable catalogue available from the SaaS platform.
 * ========================================================================== */

/* ── Primitives ──────────────────────────────────────────────────────── */

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type Align = 'left' | 'center' | 'right';

export type BlockType =
  | 'text'
  | 'heading'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'columns'
  | 'social'
  | 'footer';

/* ── Per-block Content Models ────────────────────────────────────────── */

export interface TextBlockContent {
  html: string;
  textAlign: Align;
  fontSize: number;
  lineHeight: number;
  color: string;
  fontFamily: string;
  padding: Padding;
  backgroundColor: string;
}

export interface HeadingBlockContent {
  text: string;
  level: 1 | 2 | 3;
  textAlign: Align;
  color: string;
  fontFamily: string;
  padding: Padding;
  backgroundColor: string;
}

export interface ImageBlockContent {
  src: string;
  alt: string;
  href: string;
  width: number;
  align: Align;
  padding: Padding;
  backgroundColor: string;
  borderRadius: number;
}

export interface ButtonBlockContent {
  text: string;
  href: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontSize: number;
  paddingV: number;
  paddingH: number;
  align: Align;
  fullWidth: boolean;
  fontFamily: string;
  containerPadding: Padding;
  containerBg: string;
}

export interface DividerBlockContent {
  color: string;
  thickness: number;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
  padding: Padding;
  backgroundColor: string;
}

export interface SpacerBlockContent {
  height: number;
  backgroundColor: string;
}

export interface ColumnCell {
  imageUrl: string;
  imageAlt: string;
  heading: string;
  text: string;
  buttonLabel: string;
  buttonUrl: string;
  buttonColor: string;
}

export interface ColumnsBlockContent {
  cells: ColumnCell[];
  layout: '1-1' | '1-2' | '2-1' | '1-1-1';
  gap: number;
  padding: Padding;
  backgroundColor: string;
  verticalAlign: 'top' | 'middle' | 'bottom';
}

export interface SocialLink {
  platform: string;
  url: string;
  label: string;
}

export interface SocialBlockContent {
  links: SocialLink[];
  iconSize: number;
  align: Align;
  color: string;
  padding: Padding;
  backgroundColor: string;
}

export interface FooterBlockContent {
  html: string;
  textAlign: Align;
  fontSize: number;
  color: string;
  showUnsubscribe: boolean;
  unsubscribeText: string;
  padding: Padding;
  backgroundColor: string;
}

/* ── Block Discriminated Union ───────────────────────────────────────── */

export type EmailBlock =
  | { id: string; type: 'text'; content: TextBlockContent }
  | { id: string; type: 'heading'; content: HeadingBlockContent }
  | { id: string; type: 'image'; content: ImageBlockContent }
  | { id: string; type: 'button'; content: ButtonBlockContent }
  | { id: string; type: 'divider'; content: DividerBlockContent }
  | { id: string; type: 'spacer'; content: SpacerBlockContent }
  | { id: string; type: 'columns'; content: ColumnsBlockContent }
  | { id: string; type: 'social'; content: SocialBlockContent }
  | { id: string; type: 'footer'; content: FooterBlockContent };

/* ── Global Style Settings ───────────────────────────────────────────── */

export interface GlobalStyles {
  backgroundColor: string;
  contentBg: string;
  fontFamily: string;
  contentWidth: number;
  borderRadius: number;
}

/* ── Email Template ──────────────────────────────────────────────────── */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  preheaderText: string;
  blocks: EmailBlock[];
  globalStyles: GlobalStyles;
}

/* ── Personalization Variables ────────────────────────────────────────── */

export interface TemplateVariable {
  key: string;
  label: string;
  example: string;
}

export interface VariableCategory {
  name: string;
  variables: TemplateVariable[];
}

/* Variables pulled from the SaaS platform data model (User, Account, etc.) */
export const VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    name: 'Contact',
    variables: [
      { key: 'user.name', label: 'Full Name', example: 'Jane Cooper' },
      { key: 'user.firstName', label: 'First Name', example: 'Jane' },
      { key: 'user.email', label: 'Email Address', example: 'jane@acme.io' },
      { key: 'user.plan', label: 'Current Plan', example: 'Growth' },
      { key: 'user.mrr', label: 'MRR', example: '$299' },
      { key: 'user.seatCount', label: 'Seats Used', example: '12' },
      { key: 'user.seatLimit', label: 'Seat Limit', example: '15' },
      { key: 'user.signupDate', label: 'Signup Date', example: 'Jan 15, 2026' },
      { key: 'user.npsScore', label: 'NPS Score', example: '8' },
    ],
  },
  {
    name: 'Account',
    variables: [
      { key: 'account.name', label: 'Company Name', example: 'Acme Inc.' },
      { key: 'account.plan', label: 'Account Plan', example: 'Business' },
      { key: 'account.mrr', label: 'Account MRR', example: '$2,400' },
      { key: 'account.arr', label: 'Account ARR', example: '$28,800' },
      { key: 'account.health', label: 'Health Score', example: 'Good' },
      { key: 'account.userCount', label: 'Total Users', example: '34' },
      { key: 'account.industry', label: 'Industry', example: 'Technology' },
      { key: 'account.domain', label: 'Domain', example: 'acme.io' },
      { key: 'account.primaryContact', label: 'Primary Contact', example: 'Jane Cooper' },
    ],
  },
  {
    name: 'Lifecycle',
    variables: [
      { key: 'user.lifecycleState', label: 'Current Stage', example: 'Activated' },
      { key: 'user.churnRiskScore', label: 'Churn Risk Score', example: '23' },
      { key: 'user.expansionScore', label: 'Expansion Score', example: '78' },
      { key: 'user.lastLoginDaysAgo', label: 'Days Since Last Login', example: '2' },
      { key: 'user.loginFrequencyLast7Days', label: 'Logins (7d)', example: '5' },
      { key: 'user.loginFrequencyLast30Days', label: 'Logins (30d)', example: '18' },
      { key: 'user.daysUntilRenewal', label: 'Days Until Renewal', example: '45' },
    ],
  },
  {
    name: 'System',
    variables: [
      { key: 'system.unsubscribeUrl', label: 'Unsubscribe Link', example: '#unsubscribe' },
      { key: 'system.preferencesUrl', label: 'Preferences Link', example: '#preferences' },
      { key: 'system.viewInBrowserUrl', label: 'View in Browser', example: '#browser' },
      { key: 'system.currentYear', label: 'Current Year', example: '2026' },
      { key: 'company.name', label: 'Your Company Name', example: 'LifecycleOS' },
      { key: 'company.address', label: 'Company Address', example: '123 Main St, SF, CA' },
      { key: 'company.website', label: 'Company Website', example: 'https://lifecycleos.com' },
    ],
  },
];

/* ── Default Values ──────────────────────────────────────────────────── */

export const DEFAULT_GLOBAL_STYLES: GlobalStyles = {
  backgroundColor: '#f4f4f5',
  contentBg: '#ffffff',
  fontFamily: 'Arial, Helvetica, sans-serif',
  contentWidth: 600,
  borderRadius: 0,
};

const pad = (v: number): Padding => ({ top: v, right: v, bottom: v, left: v });

const FONT_FAMILY = 'Arial, Helvetica, sans-serif';

/** Factory functions for creating blocks with sensible defaults */
export const BLOCK_DEFAULTS: Record<BlockType, () => EmailBlock> = {
  text: () => ({
    id: uid(),
    type: 'text',
    content: {
      html: 'Write your content here. Use <b>bold</b>, <i>italic</i>, and <a href="#">links</a> in your text.',
      textAlign: 'left',
      fontSize: 16,
      lineHeight: 1.6,
      color: '#374151',
      fontFamily: FONT_FAMILY,
      padding: { top: 16, right: 32, bottom: 16, left: 32 },
      backgroundColor: 'transparent',
    },
  }),
  heading: () => ({
    id: uid(),
    type: 'heading',
    content: {
      text: 'Your Heading',
      level: 1,
      textAlign: 'left',
      color: '#111827',
      fontFamily: FONT_FAMILY,
      padding: { top: 24, right: 32, bottom: 8, left: 32 },
      backgroundColor: 'transparent',
    },
  }),
  image: () => ({
    id: uid(),
    type: 'image',
    content: {
      src: '',
      alt: 'Image description',
      href: '',
      width: 100,
      align: 'center',
      padding: { top: 16, right: 32, bottom: 16, left: 32 },
      backgroundColor: 'transparent',
      borderRadius: 0,
    },
  }),
  button: () => ({
    id: uid(),
    type: 'button',
    content: {
      text: 'Click Here',
      href: 'https://',
      backgroundColor: '#2563eb',
      textColor: '#ffffff',
      borderRadius: 6,
      fontSize: 16,
      paddingV: 14,
      paddingH: 32,
      align: 'center',
      fullWidth: false,
      fontFamily: FONT_FAMILY,
      containerPadding: { top: 16, right: 32, bottom: 16, left: 32 },
      containerBg: 'transparent',
    },
  }),
  divider: () => ({
    id: uid(),
    type: 'divider',
    content: {
      color: '#e5e7eb',
      thickness: 1,
      width: 100,
      style: 'solid',
      padding: { top: 16, right: 32, bottom: 16, left: 32 },
      backgroundColor: 'transparent',
    },
  }),
  spacer: () => ({
    id: uid(),
    type: 'spacer',
    content: { height: 32, backgroundColor: 'transparent' },
  }),
  columns: () => ({
    id: uid(),
    type: 'columns',
    content: {
      cells: [
        { imageUrl: '', imageAlt: '', heading: 'Column 1', text: 'Describe your first item here.', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
        { imageUrl: '', imageAlt: '', heading: 'Column 2', text: 'Describe your second item here.', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
      ],
      layout: '1-1' as const,
      gap: 16,
      padding: { top: 16, right: 32, bottom: 16, left: 32 },
      backgroundColor: 'transparent',
      verticalAlign: 'top' as const,
    },
  }),
  social: () => ({
    id: uid(),
    type: 'social',
    content: {
      links: [
        { platform: 'twitter', url: 'https://twitter.com/', label: 'Twitter' },
        { platform: 'linkedin', url: 'https://linkedin.com/', label: 'LinkedIn' },
        { platform: 'facebook', url: 'https://facebook.com/', label: 'Facebook' },
      ],
      iconSize: 24,
      align: 'center',
      color: '#6b7280',
      padding: { top: 16, right: 32, bottom: 16, left: 32 },
      backgroundColor: 'transparent',
    },
  }),
  footer: () => ({
    id: uid(),
    type: 'footer',
    content: {
      html: '{{company.name}} · {{company.address}}',
      textAlign: 'center',
      fontSize: 12,
      color: '#9ca3af',
      showUnsubscribe: true,
      unsubscribeText: 'Unsubscribe from these emails',
      padding: { top: 24, right: 32, bottom: 24, left: 32 },
      backgroundColor: '#f9fafb',
    },
  }),
};

/* ── Block Palette Metadata ──────────────────────────────────────────── */

export interface BlockPaletteItem {
  type: BlockType;
  label: string;
  description: string;
  category: 'content' | 'layout' | 'compliance';
}

export const PALETTE_ITEMS: BlockPaletteItem[] = [
  { type: 'heading', label: 'Heading', description: 'Section title or headline', category: 'content' },
  { type: 'text', label: 'Text', description: 'Paragraph with formatting', category: 'content' },
  { type: 'image', label: 'Image', description: 'Full-width or inline image', category: 'content' },
  { type: 'button', label: 'Button', description: 'Call-to-action button', category: 'content' },
  { type: 'columns', label: 'Columns', description: '2 or 3 column layout', category: 'layout' },
  { type: 'divider', label: 'Divider', description: 'Horizontal separator line', category: 'layout' },
  { type: 'spacer', label: 'Spacer', description: 'Vertical whitespace', category: 'layout' },
  { type: 'social', label: 'Social Links', description: 'Social media icons', category: 'compliance' },
  { type: 'footer', label: 'Footer', description: 'Company info & unsubscribe', category: 'compliance' },
];

/* ── Utilities ───────────────────────────────────────────────────────── */

function uid(): string {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createBlock(type: BlockType): EmailBlock {
  return BLOCK_DEFAULTS[type]();
}
