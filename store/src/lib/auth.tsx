'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@sirlawglobal/contracts';
import * as authApi from '@/lib/api/auth';
import { session } from '@/lib/api/client';

interface AuthCtx {
  user: User | null;
  /** False until we know whether this browser has a signed-in session (it is restored from the refresh cookie). */
  ready: boolean;
  setUser: (u: User | null) => void;
  signOut: () => Promise<void>;
  /** True from the moment the user clicks sign out until someone signs in again. */
  signingOut: boolean;
}

const Ctx = React.createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = React.useState<User | null>(null);
  const [ready, setReady] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const setUser = React.useCallback((u: User | null) => {
    if (u) setSigningOut(false);
    setUserState(u);
  }, []);

  React.useEffect(() => {
    let alive = true;
    void authApi.getSession().then((u) => {
      if (!alive) return;
      setUser(u);
      setReady(true);
    });
    // The server ended the session (revoked, password reset, suspended): drop the user so protected pages redirect.
    const off = session.onLost(() => setUser(null));
    return () => {
      alive = false;
      off();
    };
  }, [setUser]);

  const value = React.useMemo<AuthCtx>(
    () => ({
      user,
      ready,
      setUser,
      signingOut,
      signOut: async () => {
        setSigningOut(true); // the page that called this decides where to go next, not the login guard
        await authApi.logout();
        setUserState(null);
      },
    }),
    [user, ready, signingOut, setUser],
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
  const { user, ready, signingOut } = useAuth();
  const router = useRouter();
  React.useEffect(() => {
    if (ready && !user && !signingOut) {
      const next = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/account';
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [ready, user, signingOut, router]);
  return { user, ready };
}
