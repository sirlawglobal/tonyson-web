'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/lib/use-focus-trap';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  label: string;
  side?: 'left' | 'right';
  children: React.ReactNode;
}

/** Minimal modal drawer: Escape to close, backdrop click, focus moves to the close button. */
export function Sheet({ open, onClose, label, side = 'left', children }: SheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          'absolute top-0 flex h-full w-72 max-w-[85vw] flex-col bg-card shadow-xl',
          side === 'left' ? 'left-0' : 'right-0',
        )}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="absolute right-2 top-2 rounded-md p-2 text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
