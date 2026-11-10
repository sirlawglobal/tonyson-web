'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Tag } from 'lucide-react';
import { formatNaira } from '@sirlawglobal/contracts';
import { useSuggestions } from '@/lib/queries';
import { cn } from '@/lib/utils';

/** Search input with typeahead. Keyboard: arrows to move, Enter to open, Esc to close. */
export function SearchBox({ className, placeholder }: { className?: string; placeholder?: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => !wrapRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const { data: suggestions = [], isFetching } = useSuggestions(debounced);
  const show = open && q.trim().length >= 2;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = suggestions[active];
    if (s) return go(s.href);
    go(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products');
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
  };

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <form onSubmit={submit} role="search" className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-label="Search products"
          autoComplete="off"
          placeholder={placeholder ?? 'Search for tomatoes, rice, milk…'}
          className="h-12 w-full rounded-full border border-border bg-surface pl-12 pr-4 text-base transition-shadow focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
        />
      </form>
      {show && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-14 z-50 overflow-hidden rounded-3xl border border-border bg-surface py-2 shadow-pop">
          {suggestions.length === 0 ? (
            <li className="px-5 py-4 text-sm text-muted-foreground">{isFetching ? 'Searching…' : `No matches for “${q}”. Press Enter to search anyway.`}</li>
          ) : (
            suggestions.map((s, i) => (
              <li key={s.href} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(s.href)} className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left', i === active && 'bg-muted')}>
                  {s.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image} alt="" className="h-10 w-10 rounded-lg bg-muted object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand-deep"><Tag className="h-4 w-4" aria-hidden /></span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{s.label}</span>
                  {s.price !== undefined && <span className="text-sm font-bold">{formatNaira(s.price)}</span>}
                  {s.type === 'category' && <span className="text-xs text-muted-foreground">Category</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
