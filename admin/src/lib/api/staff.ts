/** Staff management against the real API (API_CONTRACT 4.12). Every mutation is audited server-side. */
import type { ChangeStaffRoleInput, SetActiveInput, StaffInput as StaffInputBody, StaffRow as StaffRowBody } from '@sirlawglobal/contracts';
import { http } from './client';

export type StaffRow = StaffRowBody;
export type StaffInput = StaffInputBody;
type StaffRole = ChangeStaffRoleInput['role'];

export const listStaffRows = (): Promise<StaffRow[]> => http.get<StaffRow[]>('/admin/staff');

/** Creates the account and emails a set-password link (valid 72 hours). 409 if the email is taken. */
export const createStaff = (input: StaffInput): Promise<StaffRow> => http.post<StaffRow>('/admin/staff', input);

/** 409 if this would leave no active Super Admin. Takes effect on the person's next request. */
export const changeStaffRole = (id: string, role: StaffRole): Promise<StaffRow> =>
  http.patch<StaffRow>(`/admin/staff/${encodeURIComponent(id)}/role`, { role } satisfies ChangeStaffRoleInput);

/** Deactivating signs the person out everywhere. 409 if they are the last active Super Admin. */
export const setStaffActive = (id: string, active: boolean): Promise<StaffRow> =>
  http.patch<StaffRow>(`/admin/staff/${encodeURIComponent(id)}/active`, { active } satisfies SetActiveInput);

/** Sends a fresh set-password link (recovers an expired invite, or resets a forgotten password). */
export const resendInvite = (id: string): Promise<void> => http.post<void>(`/admin/staff/${encodeURIComponent(id)}/resend-invite`);
