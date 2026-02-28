'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Code,
  DollarSign,
  GitFork,
  Heart,
  Layers,
  LayoutDashboard,
  Mail,
  MailCheck,
  Megaphone,
  Rocket,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
  SidebarRail,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '../ui/avatar';

const menuItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/activation', icon: Rocket, label: 'Activation' },
  { href: '/retention', icon: Heart, label: 'Retention' },
  { href: '/expansion', icon: BarChart3, label: 'Expansion' },
  { href: '/accounts', icon: Users, label: 'Accounts' },
  { href: '/segments', icon: Layers, label: 'Segments' },
  { href: '/personalization', icon: Sparkles, label: 'Personalization' },
  { href: '/flows', icon: GitFork, label: 'Flows' },
  { href: '/email', icon: Mail, label: 'Email' },
  { href: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/revenue', icon: DollarSign, label: 'Revenue' },
];

const settingsItems = [
  { href: '/sdk', icon: Code, label: 'SDK Setup' },
  { href: '/deliverability', icon: MailCheck, label: 'Deliverability' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  const isActive = (href: string) => {
    if (href === '/email') return pathname === '/email' || pathname.startsWith('/email-builder');
    if (href === '/campaigns') return pathname.startsWith('/campaigns');
    return pathname === href;
  };

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="flex items-center gap-2 p-4">
        <Activity className="h-8 w-8 text-primary" />
        <span
          className={cn('text-lg font-semibold', state === 'collapsed' && 'hidden')}
        >
          LifecycleOS
        </span>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-2">
        <SidebarMenu className="flex flex-col gap-1">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                className="justify-start"
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu className="flex flex-col gap-1">
          {settingsItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                className="justify-start"
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <div className={cn('p-2', state === 'collapsed' && 'p-0')}>
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg p-2',
              state === 'collapsed' && 'p-2 justify-center'
            )}
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <div className={cn('flex flex-col', state === 'collapsed' && 'hidden')}>
              <span className="text-sm font-medium">Admin User</span>
              <span className="text-xs text-muted-foreground">
                admin@saasopt.com
              </span>
            </div>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
