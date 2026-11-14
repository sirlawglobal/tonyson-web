import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Clock, Leaf, ShieldCheck, Truck } from 'lucide-react';

const perks = [
  { icon: Truck, title: 'Fast delivery', body: 'Under 2 hours in most areas' },
  { icon: Leaf, title: 'Farm fresh', body: 'Sourced daily, quality-checked' },
  { icon: ShieldCheck, title: 'Secure payment', body: 'Cards, transfer and USSD' },
  { icon: Clock, title: 'Open 7 days', body: 'Order any time, 24/7' },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-brand-deep text-white dark:bg-surface dark:text-foreground">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {perks.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10"><Icon className="h-5 w-5" aria-hidden /></div>
            <div><p className="font-semibold">{title}</p><p className="text-sm opacity-75">{body}</p></div>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Logo variant="onDark" className="h-10" />
            <p className="mt-2 text-sm opacity-75">Your virtual supermarket. Fresh groceries, fair prices, delivered to your door.</p>
          </div>
          {[
            { h: 'Shop', links: [['All products', '/products'], ['Special offers', '/products?onPromotion=true'], ['Best sellers', '/products?bestSeller=true']] },
            { h: 'Account', links: [['My orders', '/account/orders'], ['Rewards', '/account/rewards'], ['Refer a friend', '/account/referrals']] },
            // Help pages don't exist yet (content phase); shown as plain text rather than dead links.
            { h: 'Help', links: [['Delivery info'], ['Returns & refunds'], ['Contact us']] },
          ].map((col) => (
            <div key={col.h}>
              <p className="font-semibold">{col.h}</p>
              <ul className="mt-3 space-y-2 text-sm opacity-75">
                {col.links.map(([label, href]) => (<li key={label}>{href ? <Link href={href} className="inline-block py-1 hover:underline">{label}</Link> : <span>{label}</span>}</li>))}
              </ul>
            </div>
          ))}
        </div>
        <p className="border-t border-white/10 py-4 text-center text-xs opacity-75">© 2026 Tonyson Virtual Supermarket. Demo data only.</p>
      </div>
    </footer>
  );
}
