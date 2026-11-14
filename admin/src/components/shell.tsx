'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Menu, ShieldOff } from 'lucide-react';
import { Role, type Permission } from '@sirlawglobal/contracts';
import { NAV, NAV_GROUPS, isNavActive, type NavItem } from '@/lib/nav';
import { apiDevtools, getDashboardSummary } from '@/lib/api';
import { useRole } from '@/lib/role-context';
import { cn } from '@/lib/utils';
import { Sheet } from './ui/sheet';
import { Select } from './ui/select';
import { Button } from './ui/button';
import { EmptyState } from './ui/empty-state';

const COLLAPSE_KEY = 'tonyson-admin-nav-collapsed';

function SidebarContent() {
  const pathname = usePathname();
  const { can } = useRole();
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const { data: summary } = useQuery({ queryKey: ['dashboard', 'summary'], queryFn: getDashboardSummary });

  // Applied after mount so server and first client render match.
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? '[]');
      if (Array.isArray(raw)) setCollapsed(raw.filter((x): x is string => typeof x === 'string'));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.slugs.map((s) => NAV.find((n) => n.slug === s)).filter((i): i is NavItem => !!i && can(i.permission)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="" aria-hidden width={256} height={286} className="h-8 w-auto" />
        <span className="ml-2 text-base font-bold tracking-tight">Tonyson</span>
        <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
          Admin
        </span>
      </div>
      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-2">
        {groups.map((g) => {
          const hasActive = g.items.some((i) => isNavActive(i.href, pathname));
          // The group holding the current page is never hidden.
          const open = hasActive || !collapsed.includes(g.id);
          const panelId = `nav-group-${g.id}`;
          return (
            <section key={g.id} aria-labelledby={`${panelId}-h`}>
              <h2 id={`${panelId}-h`}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => toggle(g.id)}
                  disabled={hasActive}
                  className="group flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:cursor-default disabled:hover:text-muted-foreground"
                >
                  {g.label}
                  <ChevronDown aria-hidden className={cn('size-3.5 transition-transform', !open && '-rotate-90', hasActive && 'opacity-40')} />
                </button>
              </h2>
              <ul id={panelId} hidden={!open} className="mt-0.5 space-y-0.5">
                {g.items.map(({ href, label, icon: Icon, slug }) => {
                  const active = isNavActive(href, pathname);
                  const badge = slug === 'orders' ? summary?.pendingOrders : undefined;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium',
                          active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <Icon aria-hidden className="size-4 shrink-0" />
                        <span className="flex-1">{label}</span>
                        {!!badge && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary-foreground">
                            <span className="sr-only">{badge} awaiting action, </span>
                            {badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </nav>
    </div>
  );
}

const STAFF_ROLES = Role.options.filter((r) => r !== 'CUSTOMER');

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { role, setRole } = useRole();
  const qc = useQueryClient();
  const [failing, setFailing] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={onMenu}>
        <Menu />
      </Button>
      <div className="ml-auto flex items-center gap-3">
        <label className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <input
            type="checkbox"
            checked={failing}
            onChange={(e) => {
              setFailing(e.target.checked);
              apiDevtools.setFailing(e.target.checked);
              qc.invalidateQueries();
            }}
          />
          Simulate API error
        </label>
        <div className="flex items-center gap-1.5">
          <label htmlFor="dev-role" className="hidden text-xs text-muted-foreground md:block">
            Dev role
          </label>
          <Select id="dev-role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="h-8 w-48 text-xs">
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, ' ').toLowerCase().replace(/^\w|\s\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </header>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh border-r border-border bg-card lg:block">
        <SidebarContent />
      </aside>
      <Sheet open={open} onClose={() => setOpen(false)} label="Navigation">
        <SidebarContent />
      </Sheet>
      <div className="flex min-w-0 flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main id="main" className="min-w-0 flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

/** UI-only guard: hides content for roles without the permission. Backend still enforces. */
export function RequirePermission({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { can } = useRole();
  if (can(permission)) return <>{children}</>;
  const first = NAV.find((n) => can(n.permission));
  return (
    <EmptyState
      icon={ShieldOff}
      title="You don't have access to this section"
      description="Your role doesn't include the required permission. Switch the dev role in the top bar to preview other roles."
      action={
        first && (
          <Button asChild variant="outline" size="sm">
            <Link href={first.href}>Go to {first.label}</Link>
          </Button>
        )
      }
    />
  );
}
