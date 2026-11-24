/**
 * Customer authentication against the real API (API_CONTRACT 3.1). No demo logins and no demo verification code:
 * every function here talks to /api/v1/auth/*.
 */
import type { AuthResponse, LoginInput, ProfileInput, RegisterInput, User } from '@sirlawglobal/contracts';
import { http, refreshSession, session } from './client';

/** Last user the API told us about. Lets code that is not async (the mock order functions) know who is signed in. */
let cachedUser: User | null = null;
export const getCachedUser = (): User | null => cachedUser;

const adopt = (auth: AuthResponse): User => {
  session.adopt(auth);
  cachedUser = auth.user;
  return auth.user;
};

export async function login(input: LoginInput): Promise<User> {
  return adopt(await http.post<AuthResponse>('/auth/login', input, { auth: false }));
}

export async function register(input: RegisterInput): Promise<User> {
  // An empty optional field must be omitted, not sent as "".
  const body: RegisterInput = { ...input, referralCode: input.referralCode?.trim() ? input.referralCode.trim() : undefined };
  return adopt(await http.post<AuthResponse>('/auth/register', body, { auth: false }));
}

export async function verifyAccount(code: string): Promise<User> {
  return adopt(await http.post<AuthResponse>('/auth/verify', { code }));
}

export async function resendVerification(): Promise<void> {
  await http.post<void>('/auth/verify/resend');
}

export async function requestPasswordReset(email: string): Promise<void> {
  await http.post<void>('/auth/forgot-password', { email }, { auth: false });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await http.post<void>('/auth/reset-password', { token, password }, { auth: false });
}

export async function updateProfile(input: ProfileInput): Promise<User> {
  cachedUser = await http.patch<User>('/auth/me', input);
  return cachedUser;
}

/** Ends the session on the server (best effort) and always forgets it locally. */
export async function logout(): Promise<void> {
  try {
    await http.post<void>('/auth/logout', undefined, { auth: false });
  } catch {
    /* offline or already expired: signing out locally is what matters */
  } finally {
    session.clear();
    cachedUser = null;
  }
}

/** Restores the signed-in user on page load, or null for a guest. Never throws for "not signed in". */
export async function getSession(): Promise<User | null> {
  if (!session.mightHaveSession()) return null;
  if (!session.hasToken() && !(await refreshSession())) return null;
  try {
    cachedUser = await http.get<User>('/auth/me');
    return cachedUser;
  } catch {
    cachedUser = null;
    return null;
  }
}
