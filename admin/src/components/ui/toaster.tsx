'use client';

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: '!bg-card !text-foreground !border !border-border',
          description: '!text-muted-foreground',
        },
      }}
    />
  );
}
