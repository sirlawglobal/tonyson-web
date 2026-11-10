'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Provide to make the column sortable (sorts the rows currently loaded). */
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right';
  className?: string;
  /** Hide below the md breakpoint to keep the table usable on phones. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  skeletonRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  caption?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  skeletonRows = 8,
  emptyTitle = 'No results',
  emptyDescription = 'Try adjusting your filters.',
  caption,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const sorted = useMemo(() => {
    if (!rows || !sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));

  if (error) return <ErrorState message={error.message} onRetry={onRetry} />;

  const cellClass = (c: Column<T>) =>
    cn('px-3 py-2.5', c.align === 'right' && 'text-right', c.hideOnMobile && 'hidden md:table-cell', c.className);

  return (
    <div className="overflow-x-auto" aria-busy={loading || undefined}>
      <table className="w-full border-collapse text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn('px-3 py-2 font-medium', c.align === 'right' && 'text-right', c.hideOnMobile && 'hidden md:table-cell')}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={cn('inline-flex items-center gap-1 rounded hover:text-foreground', c.align === 'right' && 'flex-row-reverse')}
                    >
                      {c.header}
                      {active ? (
                        sort.dir === 'asc' ? <ArrowUp aria-hidden className="size-3" /> : <ArrowDown aria-hidden className="size-3" />
                      ) : (
                        <ChevronsUpDown aria-hidden className="size-3 opacity-60" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: skeletonRows }, (_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {columns.map((c) => (
                  <td key={c.key} className={cellClass(c)}>
                    <Skeleton className={cn('h-4', c.align === 'right' ? 'ml-auto w-16' : 'w-24')} />
                  </td>
                ))}
              </tr>
            ))}
          {!loading &&
            sorted?.map((row) => (
              <tr key={rowKey(row)} className="border-b border-border last:border-0 hover:bg-muted/40">
                {columns.map((c) => (
                  <td key={c.key} className={cellClass(c)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
      {!loading && sorted && sorted.length === 0 && (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}
    </div>
  );
}
