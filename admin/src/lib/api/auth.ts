/**
 * Staff authentication against the real API (API_CONTRACT 3.1, /admin/auth/*).
 * The role comes from the server only: the old dev role switcher is gone (it survives behind NEXT_PUBLIC_DEV_TOOLS
 * as a UI-preview toy that cannot grant anything, because the API enforces every permission itself).
 */
import type { AuthResponse, LoginInput, User } from '@sirlawglobal/contracts';
import { http, refreshSession, session } from './client';

export async function login(input: LoginInput): Promise<User> {
  const auth = await http.post<AuthResponse>('/admin/auth/login', input, { auth: false });
  session.adopt(auth);
  return auth.user;
}

/** Ends the session on the server (best effort) and always forgets it locally. */
export async function logout(): Promise<void> {
  try {
    await http.post<void>('/admin/auth/logout', undefined, { auth: false });
  } catch {
    /* offline or already expired: signing out locally is what matters */
  } finally {
    session.clear();
  }
}

/** Restores the signed-in staff member on page load (and when the tab regains focus). Null when signed out. */
export async function getSession(): Promise<User | null> {
  if (!session.mightHaveSession()) return null;
  if (!session.hasToken() && !(await refreshSession())) return null;
  try {
    return await http.get<User>('/admin/auth/me');
  } catch {
    return null;
  }
}

/** Accepts a staff invite (or an admin-issued link): chooses a password. */
export async function setPassword(token: string, password: string): Promise<void> {
  await http.post<void>('/admin/auth/set-password', { token, password }, { auth: false });
}
