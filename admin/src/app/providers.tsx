'use client';

import { useState } from 'react';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleProvider } from '@/lib/role-context';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => {
    const qc: QueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false } },
      // The dummy db is shared by every screen (refunds change dashboard + customers, orders free riders, ...),
      // so any successful write marks all cached reads stale. Cheap here; the real API will be more selective.
      mutationCache: new MutationCache({ onSuccess: () => { void qc.invalidateQueries(); } }),
    });
    return qc;
  });
  return (
    <QueryClientProvider client={client}>
      <RoleProvider>
        {children}
        <Toaster />
      </RoleProvider>
    </QueryClientProvider>
  );
}
