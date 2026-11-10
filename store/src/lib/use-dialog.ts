'use client';

import * as React from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

let locks = 0;
let prevOverflow = '';
function lockScroll() {
  if (locks++ === 0) {
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
}
function unlockScroll() {
  if (--locks === 0) document.body.style.overflow = prevOverflow;
}

/**
 * Shared modal behaviour for drawers, sheets and dialogs: moves focus in, traps Tab,
 * closes on Escape, locks body scroll (ref-counted so nested overlays are safe) and
 * returns focus to whatever opened it. Attach the returned ref to the dialog element.
 */
export function useDialog<T extends HTMLElement = HTMLElement>(open: boolean, onClose: () => void) {
  const ref = React.useRef<T>(null);
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;

  React.useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    lockScroll();
    const focusables = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    // Wait a frame so animated dialogs have mounted their content.
    const raf = requestAnimationFrame(() => (focusables()[0] ?? ref.current)?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      } else if (e.key === 'Tab') {
        const els = focusables();
        if (els.length === 0) return e.preventDefault();
        const first = els[0] as HTMLElement;
        const last = els[els.length - 1] as HTMLElement;
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !ref.current?.contains(active))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (active === last || !ref.current?.contains(active))) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      unlockScroll();
      opener?.focus?.();
    };
  }, [open]);

  return ref;
}
