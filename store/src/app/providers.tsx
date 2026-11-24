'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { shouldRetry } from '@/lib/api/client';
import { CartProvider } from '@/lib/cart';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider, useTheme } from '@/lib/theme';

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="top-center" richColors closeButton />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: shouldRetry, refetchOnWindowFocus: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider><AuthProvider><CartProvider>
        {children}
        <ThemedToaster />
      </CartProvider></AuthProvider></ThemeProvider>
    </QueryClientProvider>
  );
}
