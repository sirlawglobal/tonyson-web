'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@sirlawglobal/contracts';
import * as authApi from '@/lib/api/auth';
import { session } from '@/lib/api/client';

interface StaffAuth {
  user: User | null;
  /** False until we know whether this browser has a staff session (restored from the refresh cookie). */
  ready: boolean;
  signIn: (user: User) => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<StaffAuth | null>(null);

/** Re-check the account at most this often when the tab regains focus. */
const RECHECK_MS = 30_000;

export function StaffAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const lastCheck = useRef(0);

  useEffect(() => {
    let alive = true;
    void authApi.getSession().then((u) => {
      if (!alive) return;
      lastCheck.current = Date.now();
      setUser(u);
      setReady(true);
    });
    // The server ended the session (deactivated, signed out elsewhere): drop the user so protected pages redirect.
    const off = session.onLost(() => setUser(null));

    // Coming back to the tab re-reads the account, so a role change or a deactivation shows up without a reload.
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastCheck.current < RECHECK_MS) return;
      lastCheck.current = Date.now();
      void authApi.getSession().then((u) => alive && u && setUser(u));
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      off();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo<StaffAuth>(() => ({ user, ready, signIn: setUser, signOut }), [user, ready, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStaffAuth(): StaffAuth {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStaffAuth must be used within StaffAuthProvider');
  return ctx;
}

/**
 * Route protection for the dashboard. This is a convenience, not security: the access token lives in memory so the
 * server cannot see it on page navigations, and the API enforces authentication and every permission on every call.
 */
export function RequireStaff({ children }: { children: React.ReactNode }) {
  const { user, ready } = useStaffAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) {
      const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    }
  }, [ready, user, router, pathname]);

  if (!ready || !user) {
    return (
      <div role="status" aria-live="polite" className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
        {ready ? 'Redirecting to sign in…' : 'Loading…'}
      </div>
    );
  }
  return <>{children}</>;
}
