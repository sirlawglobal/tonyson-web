import type { Paginated } from '@sirlawglobal/contracts';
import { db, paginate, simulate, type AuditEntry } from './db';

export interface AuditFilter {
  actor?: string;
  /** Prefix such as "staff." or "order.status_changed". */
  action?: string;
  /** yyyy-mm-dd, inclusive. */
  from?: string;
  to?: string;
}

export function listAuditEntries(filter: AuditFilter = {}, page = 1, pageSize = 15): Promise<Paginated<AuditEntry>> {
  return simulate(() => {
    const actor = filter.actor?.trim().toLowerCase();
    const action = filter.action?.trim().toLowerCase();
    const rows = [...db.auditLog]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter(
        (e) =>
          (!actor || e.actor.toLowerCase().includes(actor)) &&
          (!action || e.action.toLowerCase().startsWith(action)) &&
          (!filter.from || e.createdAt.slice(0, 10) >= filter.from) &&
          (!filter.to || e.createdAt.slice(0, 10) <= filter.to),
      );
    return paginate(rows, page, pageSize);
  });
}

export function listAuditActions(): Promise<string[]> {
  return simulate(() => [...new Set(db.auditLog.map((e) => e.action))].sort());
}
