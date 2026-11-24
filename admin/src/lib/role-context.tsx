'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { hasPermission, type Permission, type Role } from '@sirlawglobal/contracts';
import { setActor } from '@/lib/api/db';
import { useStaffAuth } from '@/lib/auth';

/** Dev preview only (NEXT_PUBLIC_DEV_TOOLS=true). Never grants anything real: the API enforces permissions itself. */
const DEV_TOOLS = process.env.NEXT_PUBLIC_DEV_TOOLS === 'true';

interface RoleContextValue {
  /** The signed-in staff member's role, from the server. */
  role: Role;
  /** Only does anything with NEXT_PUBLIC_DEV_TOOLS=true: previews the UI as another role. */
  setRole: (role: Role) => void;
  can: (permission: Permission) => boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

/**
 * Role and permissions for UI shaping (menu items, buttons). The role is the one the API returned for the signed-in
 * account. While signed out it falls back to the least-privileged role, so nothing sensitive can flash on screen.
 */
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useStaffAuth();
  const [preview, setPreview] = useState<Role | null>(null);
  const role: Role = (DEV_TOOLS && preview) || user?.role || 'DELIVERY_PERSONNEL';

  // Sections still on mock data attribute their (mock) audit lines to whoever is signed in.
  useEffect(() => {
    if (user) setActor(user.name, role);
  }, [user, role]);

  const setRole = useCallback((next: Role) => {
    if (DEV_TOOLS) setPreview(next);
  }, []);

  const value = useMemo<RoleContextValue>(() => ({ role, setRole, can: (p) => hasPermission(role, p) }), [role, setRole]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
