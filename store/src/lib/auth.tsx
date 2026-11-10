'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@sirlawglobal/contracts';
import * as account from '@/lib/api/account';

interface AuthCtx {
  user: User | null;
  /** False until the stored session has been read on the client. */
  ready: boolean;
  setUser: (u: User | null) => void;
  signOut: () => Promise<void>;
}

const Ctx = React.createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setUser(account.getSession());
    setReady(true);
  }, []);

  const value = React.useMemo<AuthCtx>(
    () => ({
      user,
      ready,
      setUser,
      signOut: async () => {
        await account.logout();
        setUser(null);
      },
    }),
    [user, ready],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Redirects guests to /login?next=... Returns the user once known. */
export function useRequireAuth(): { user: User | null; ready: boolean } {
  const { user, ready } = useAuth();
  const router = useRouter();
  React.useEffect(() => {
    if (ready && !user) {
      const next = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/account';
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [ready, user, router]);
  return { user, ready };
}
