'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Activity, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Activity className="h-6 w-6 text-primary" />
          <span className="font-bold">LifecycleOS</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/pricing"
            className="text-foreground/60 transition-colors hover:text-foreground/80"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="text-foreground/60 transition-colors hover:text-foreground/80"
          >
            Docs
          </Link>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center space-x-2">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Start free trial</Link>
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container py-4 flex flex-col gap-3">
            <Link
              href="/pricing"
              className="text-sm font-medium text-foreground/80 py-2"
              onClick={() => setMobileOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              className="text-sm font-medium text-foreground/80 py-2"
              onClick={() => setMobileOpen(false)}
            >
              Docs
            </Link>
            <div className="flex flex-col gap-2 pt-2 border-t">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard">Sign in</Link>
              </Button>
              <Button className="w-full" asChild>
                <Link href="/dashboard">Start free trial</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
