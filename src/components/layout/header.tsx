'use client';
import { UserButton } from '@clerk/nextjs';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { SidebarTrigger } from '../ui/sidebar';
import { Skeleton } from '../ui/skeleton';

const pageTitles: { [key: string]: string } = {
  '/dashboard': 'Dashboard',
  '/activation': 'Activation',
  '/retention': 'Retention',
  '/expansion': 'Expansion',
  '/accounts': 'Accounts',
  '/flows': 'Flows',
  '/revenue': 'Revenue',
  '/sdk': 'Developer SDK',
  '/deliverability': 'Deliverability',
  '/settings': 'Settings',
};

/* ── Search items ──────────────────────────────────────────────────── */
const searchItems = [
  { label: 'Dashboard', href: '/dashboard', keywords: ['home', 'overview', 'metrics', 'kpi'] },
  { label: 'Activation', href: '/activation', keywords: ['onboarding', 'trial', 'convert', 'signup'] },
  { label: 'Retention', href: '/retention', keywords: ['churn', 'risk', 'engagement', 'health'] },
  { label: 'Expansion', href: '/expansion', keywords: ['upsell', 'revenue', 'growth', 'upgrade'] },
  { label: 'Accounts', href: '/accounts', keywords: ['companies', 'organizations', 'customers'] },
  { label: 'Flows', href: '/flows', keywords: ['automations', 'workflows', 'sequences', 'triggers'] },
  { label: 'Flow Builder', href: '/flows', keywords: ['builder', 'visual', 'drag', 'nodes', 'automation'] },
  { label: 'Segments', href: '/segments', keywords: ['audiences', 'groups', 'filters', 'cohorts'] },
  { label: 'Email Templates', href: '/email', keywords: ['templates', 'design', 'html', 'builder'] },
  { label: 'Email Builder', href: '/email-builder', keywords: ['design', 'compose', 'drag', 'visual'] },
  { label: 'Campaigns', href: '/campaigns', keywords: ['send', 'broadcast', 'schedule', 'email'] },
  { label: 'New Campaign', href: '/campaigns/new', keywords: ['create', 'compose', 'send'] },
  { label: 'Personalization', href: '/personalization', keywords: ['rules', 'variants', 'dynamic', 'content'] },
  { label: 'Revenue', href: '/revenue', keywords: ['mrr', 'arr', 'income', 'billing', 'money'] },
  { label: 'Domain & Deliverability', href: '/deliverability', keywords: ['domains', 'dns', 'spf', 'dkim', 'reputation'] },
  { label: 'Developer SDK', href: '/sdk', keywords: ['integration', 'api', 'install', 'connect', 'keys'] },
  { label: 'Settings', href: '/settings', keywords: ['profile', 'team', 'api', 'notifications', 'billing'] },
  { label: 'API Keys', href: '/settings', keywords: ['api', 'keys', 'tokens', 'authentication'] },
  { label: 'Webhooks', href: '/settings', keywords: ['hooks', 'callbacks', 'events', 'notifications'] },
  { label: 'Docs', href: '/docs', keywords: ['documentation', 'api', 'reference', 'guide'] },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const title = pageTitles[pathname] || 'Dashboard';
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Cmd+K / Ctrl+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchOpen]);

  const filteredItems = searchQuery.trim().length > 0
    ? searchItems.filter(item => {
      const q = searchQuery.toLowerCase();
      return item.label.toLowerCase().includes(q) ||
        item.keywords.some(kw => kw.includes(q));
    })
    : [];

  const navigate = useCallback((href: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(href);
  }, [router]);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="w-full flex-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <div className="relative ml-auto flex-1 md:grow-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            placeholder="Search… (⌘K)"
            className="w-full rounded-lg bg-card pl-8 md:w-[200px] lg:w-[320px]"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim()) setSearchOpen(true);
              else setSearchOpen(false);
            }}
            onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
          />
          {searchOpen && filteredItems.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-popover shadow-lg z-50 max-h-64 overflow-auto"
            >
              {filteredItems.map((item) => (
                <button
                  key={item.href + item.label}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                  onClick={() => navigate(item.href)}
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{item.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{item.href}</span>
                </button>
              ))}
            </div>
          )}
          {searchOpen && searchQuery.trim().length > 0 && filteredItems.length === 0 && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-popover shadow-lg z-50 p-3 text-center text-sm text-muted-foreground"
            >
              No results for &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>
        {mounted ? (
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: 'h-9 w-9',
              },
            }}
          />
        ) : (
          <Skeleton className="h-9 w-9 rounded-full" />
        )}
      </div>
    </header>
  );
}
