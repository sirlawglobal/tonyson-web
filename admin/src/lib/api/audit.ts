/** Audit log against the real API (GET /admin/audit, /admin/audit/actions). Append-only on the server. */
import type { AuditEntry, Paginated } from '@sirlawglobal/contracts';
import { http } from './client';

export interface AuditFilter {
  /** Case-insensitive "contains" on the actor's name. */
  actor?: string;
  /** Prefix such as "staff." or "order.status_changed". */
  action?: string;
  /** yyyy-mm-dd, inclusive. Days are Africa/Lagos calendar days. */
  from?: string;
  to?: string;
}

export function listAuditEntries(filter: AuditFilter = {}, page = 1, pageSize = 15): Promise<Paginated<AuditEntry>> {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  for (const key of ['actor', 'action', 'from', 'to'] as const) {
    const value = filter[key]?.trim();
    if (value) qs.set(key, value);
  }
  return http.get<Paginated<AuditEntry>>(`/admin/audit?${qs}`);
}

export const listAuditActions = (): Promise<string[]> => http.get<string[]>('/admin/audit/actions');
