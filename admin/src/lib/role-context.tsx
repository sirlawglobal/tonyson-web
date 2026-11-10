'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { hasPermission, Role, type Permission } from '@sirlawglobal/contracts';

import { db, setActor } from '@/lib/api/db';

const STORAGE_KEY = 'tonyson-admin-dev-role';

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  can: (permission: Permission) => boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

/**
 * Dev-only role switcher state. UI visibility only: the backend enforces real authorisation.
 * Initial render is always SUPER_ADMIN (matches SSR); the stored role is applied after mount.
 */
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>('SUPER_ADMIN');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = Role.safeParse(stored);
      if (parsed.success && parsed.data !== 'CUSTOMER') setRoleState(parsed.data);
    } catch {
      /* storage unavailable: keep default */
    }
  }, []);

  useEffect(() => {
    const who = db.staff.find((s) => s.role === role);
    setActor(who?.name ?? 'Dev user', role);
  }, [role]);

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<RoleContextValue>(
    () => ({ role, setRole, can: (p) => hasPermission(role, p) }),
    [role, setRole],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
