'use client';

import * as React from 'react';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@sirlawglobal/contracts';
import { Badge } from '@/components/ui/badge';
import { useDialog } from '@/lib/use-dialog';
import { cn } from '@/lib/utils';

/** Fixed-locale, UTC formatting so server and client output match. */
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-NG', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-NG', { timeZone: 'UTC', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const TONE: Record<OrderStatus, 'brand' | 'warning' | 'danger' | 'neutral'> = {
  PENDING_PAYMENT: 'warning',
  PAID: 'brand',
  CONFIRMED: 'brand',
  PROCESSING: 'brand',
  PACKED: 'brand',
  READY_FOR_DISPATCH: 'brand',
  OUT_FOR_DELIVERY: 'warning',
  DELIVERED: 'brand',
  CANCELLED: 'danger',
  PAYMENT_FAILED: 'danger',
  REFUND_PENDING: 'warning',
  REFUNDED: 'neutral',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-3xl border border-border bg-surface p-5 md:p-6', className)} {...props} />;
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Modal dialog with focus on open, Esc to close and scroll lock. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useDialog<HTMLDivElement>(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-background p-5 shadow-pop outline-none sm:max-w-lg sm:rounded-[2rem] sm:p-7"
      >
        <h2 className="mb-4 font-display text-xl font-extrabold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
