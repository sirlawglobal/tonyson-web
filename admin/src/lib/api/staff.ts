import type { Role, User } from '@sirlawglobal/contracts';
import { ApiError, audit, db, nowIso, simulate, uid } from './db';

export type StaffRow = User & { active: boolean };

const inactive = new Set<string>();
const toRow = (u: User): StaffRow => ({ ...u, active: !inactive.has(u.id) });

const activeSuperAdmins = () => db.staff.filter((s) => s.role === 'SUPER_ADMIN' && !inactive.has(s.id));

export function listStaffRows(): Promise<StaffRow[]> {
  return simulate(() => db.staff.map(toRow));
}

export interface StaffInput {
  name: string;
  email: string;
  phone: string;
  role: Exclude<Role, 'CUSTOMER'>;
}

export function createStaff(input: StaffInput): Promise<StaffRow> {
  return simulate(() => {
    if (db.staff.some((s) => s.email.toLowerCase() === input.email.toLowerCase())) {
      throw new ApiError('A staff member with this email already exists', 409);
    }
    const user: User = { id: uid('stf'), ...input, verified: false, createdAt: nowIso() };
    db.staff.push(user);
    audit('staff.invited', user.name, `${user.email} as ${user.role}`);
    return toRow(user);
  });
}

export function changeStaffRole(id: string, role: Exclude<Role, 'CUSTOMER'>): Promise<StaffRow> {
  return simulate(() => {
    const u = db.staff.find((s) => s.id === id);
    if (!u) throw new ApiError('Staff member not found', 404);
    if (u.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN' && activeSuperAdmins().length <= 1 && !inactive.has(u.id)) {
      throw new ApiError('You cannot demote the last Super Admin', 400);
    }
    const before = u.role;
    u.role = role;
    audit('staff.role_changed', u.name, `${before} → ${role}`);
    return toRow(u);
  });
}

export function setStaffActive(id: string, active: boolean): Promise<StaffRow> {
  return simulate(() => {
    const u = db.staff.find((s) => s.id === id);
    if (!u) throw new ApiError('Staff member not found', 404);
    if (!active && u.role === 'SUPER_ADMIN' && activeSuperAdmins().length <= 1) {
      throw new ApiError('You cannot deactivate the last Super Admin', 400);
    }
    if (active) inactive.delete(id);
    else inactive.add(id);
    audit(active ? 'staff.reactivated' : 'staff.deactivated', u.name, u.email);
    return toRow(u);
  });
}
