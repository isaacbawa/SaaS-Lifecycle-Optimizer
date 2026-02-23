import Link from 'next/link';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Activity className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block">
            SaaS Optimizer
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/pricing"
            className="text-foreground/60 transition-colors hover:text-foreground/80"
          >
            Pricing
          </Link>
          <Link
            href="/sdk"
            className="text-foreground/60 transition-colors hover:text-foreground/80"
          >
            Docs
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Sign In</Link>
            </Button>
            <Button asChild>
                <Link href="/dashboard">Start Free Trial</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
