import Link from 'next/link';
import { Check } from 'lucide-react';
import { Logo } from '@/components/logo';

const perks = ['Free delivery over ₦25,000', 'Earn points on every order', 'Track orders in real time'];

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:py-14 lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden rounded-[2rem] bg-brand-deep p-10 text-white lg:flex lg:flex-col lg:justify-between dark:bg-brand-soft dark:text-brand-deep">
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <span aria-hidden className="absolute -bottom-6 -right-4 text-[14rem] leading-none opacity-30">🛒</span>
        <Link href="/" aria-label="Tonyson home" className="relative w-fit"><Logo variant="onDark" className="h-12" /></Link>
        <div className="relative">
          <h2 className="font-display text-4xl font-extrabold leading-tight">Fresh groceries, one tap away.</h2>
          <ul className="mt-6 space-y-3">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-white/20"><Check className="h-4 w-4" aria-hidden /></span>{p}</li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="mx-auto w-full max-w-md self-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
        <div className="mt-7">{children}</div>
        {footer && <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link href="/" className="underline">Back to shop</Link>
        </p>
      </div>
    </div>
  );
}

/** Password input with show/hide toggle. */
export { PasswordInput } from './password-input';
