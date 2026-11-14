'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bell, MapPin, ShoppingBag, User } from 'lucide-react';
import { Logo } from '@/components/logo';
import { SearchBox } from '@/components/search-box';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { useCategories } from '@/lib/queries';

export function Header() {
  const cart = useCart();
  const { user, ready } = useAuth();
  const { data: categories } = useCategories();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="hidden bg-brand-deep text-xs text-white md:block dark:bg-brand-soft dark:text-brand-deep">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
          <span>🚚 Free delivery on orders over ₦25,000</span>
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden /> Delivering across Lagos</span>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-6">
        <Link href="/" aria-label="Tonyson home" className="shrink-0">
          <Logo className="md:h-10" />
        </Link>
        <SearchBox className="hidden flex-1 md:block" />
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link href="/account/notifications" className="hidden h-11 w-11 place-items-center rounded-full hover:bg-muted sm:grid" aria-label="Notifications"><Bell className="h-5 w-5" /></Link>
          <Link href={user ? '/account' : '/login'} className="hidden h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-muted sm:flex"><User className="h-5 w-5" aria-hidden />{ready && user ? user.name.split(' ')[0] : 'Log in'}</Link>
          <button
            onClick={() => cart.setDrawerOpen(true)}
            className="relative flex h-11 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover dark:text-[#2a0505]"
            aria-label={`Open cart, ${cart.count} items`}
          >
            <motion.span key={cart.pulse} initial={{ scale: 1 }} animate={{ scale: [1, 1.35, 1] }} transition={{ duration: 0.35 }} className="inline-flex">
              <ShoppingBag className="h-5 w-5" aria-hidden />
            </motion.span>
            <span className="hidden sm:inline">Cart</span>
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1.5 text-xs font-extrabold text-brand-deep tabular-nums">{cart.count}</span>
          </button>
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden"><SearchBox placeholder="Search groceries…" /></div>
      <nav aria-label="Categories" className="hidden border-t border-border md:block">
        <ul className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-1.5 text-sm font-medium">
          <li><Link href="/products" className="block whitespace-nowrap rounded-full px-3.5 py-2 font-semibold text-brand hover:bg-brand-soft">All products</Link></li>
          {categories?.map((c) => (
            <li key={c.id}>
              <Link href={`/products?category=${c.slug}`} className="block whitespace-nowrap rounded-full px-3.5 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                {c.emoji} {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
