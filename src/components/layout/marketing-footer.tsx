import Link from 'next/link';
import { Activity, Twitter, Github, Linkedin } from 'lucide-react';

export function MarketingFooter() {
  return (
    <footer className="border-t">
      <div className="container flex flex-col items-center justify-between gap-6 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <Activity className="h-6 w-6 text-primary" />
          <p className="text-center text-sm leading-loose md:text-left">
            Built by your AI assistant. The source code is available on{' '}
            <a
              href="https://github.com/isaacbawa/saas_email_system"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              GitHub
            </a>
            .
          </p>
        </div>
        <div className="flex items-center gap-4">
            <Link href="#" target="_blank" rel="noreferrer">
                <Twitter className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
            </Link>
            <Link href="https://github.com/isaacbawa/saas_email_system" target="_blank" rel="noreferrer">
                <Github className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
            </Link>
            <Link href="#" target="_blank" rel="noreferrer">
                <Linkedin className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
            </Link>
        </div>
      </div>
    </footer>
  );
}
