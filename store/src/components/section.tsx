import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function Section({
  title,
  eyebrow,
  href,
  children,
}: {
  title: string;
  eyebrow?: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 md:mt-16">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="text-xs font-bold uppercase tracking-wider text-accent">{eyebrow}</p>}
          <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            See all <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
