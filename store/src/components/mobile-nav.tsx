'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Grid2x2, Home, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const path = usePathname();
  const cart = useCart();
  const items = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/products', label: 'Shop', icon: Grid2x2 },
    { href: '/cart', label: 'Cart', icon: ShoppingBag, badge: cart.count },
    { href: '/account', label: 'Account', icon: User },
  ];
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-label={badge ? `${label}, ${badge} items` : undefined} aria-current={active ? 'page' : undefined} className={cn('relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold', active ? 'text-brand' : 'text-muted-foreground')}>
                <span className={cn('relative grid h-8 w-14 place-items-center rounded-full transition-colors', active && 'bg-brand-soft')}>
                  <Icon className="h-5 w-5" aria-hidden />
                  {!!badge && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">{badge}</span>}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
