'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Gift, LayoutDashboard, LogOut, MapPin, Package, ShieldCheck, Sparkles, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth, useRequireAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/account', label: 'Overview', icon: LayoutDashboard },
  { href: '/account/orders', label: 'Orders', icon: Package },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/rewards', label: 'Rewards', icon: Sparkles },
  { href: '/account/referrals', label: 'Referrals', icon: Gift },
  { href: '/account/notifications', label: 'Notifications', icon: Bell },
  { href: '/account/profile', label: 'Profile', icon: UserIcon },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useRequireAuth();
  const { signOut } = useAuth();
  const path = usePathname();
  const router = useRouter();

  if (!ready || !user) {
    // Guests are redirected by useRequireAuth; render only a skeleton meanwhile.
    return (
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[260px_1fr]" aria-busy="true">
        <Skeleton className="hidden h-96 lg:block" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const isActive = (href: string) => (href === '/account' ? path === href : path.startsWith(href));
  const out = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      {!user.verified && (
        <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent-soft p-4 text-sm text-accent">
          <span className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5" aria-hidden />Verify your account to unlock rewards and faster checkout.</span>
          <Link href="/verify" className="rounded-full bg-accent px-4 py-2 font-bold text-white dark:text-[#2a1000]">Verify now</Link>
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
        <aside className="min-w-0">
          <div className="mb-4 flex items-center gap-3 rounded-3xl border border-border bg-surface p-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-lg font-extrabold text-white dark:text-[#06210f]" aria-hidden>{user.name.charAt(0).toUpperCase()}</span>
            <div className="min-w-0">
              <p className="truncate font-display font-bold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              {user.verified && <Badge tone="brand" className="mt-1"><ShieldCheck className="h-3 w-3" aria-hidden />Verified</Badge>}
            </div>
          </div>
          <nav aria-label="Account" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined} className={cn('flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-colors lg:rounded-2xl', isActive(href) ? 'bg-brand text-white dark:text-[#06210f]' : 'bg-muted text-muted-foreground hover:text-foreground lg:bg-transparent lg:hover:bg-muted')}>
                <Icon className="h-4 w-4" aria-hidden />{label}
              </Link>
            ))}
            <button type="button" onClick={out} className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-muted px-4 py-2.5 text-left text-sm font-semibold text-danger hover:bg-muted/70 lg:rounded-2xl lg:bg-transparent lg:hover:bg-muted"><LogOut className="h-4 w-4" aria-hidden />Sign out</button>
          </nav>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
