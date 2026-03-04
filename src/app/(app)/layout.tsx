import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

/** All (app) routes require auth — skip static prerendering at build time */
export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="p-4 sm:px-6 sm:py-0">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
