'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listAuditActions, listAuditEntries } from '@/lib/api/audit';
import type { AuditEntry } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { RequirePermission } from '@/components/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { formatDateTime } from '@/lib/utils';

const PAGE_SIZE = 15;

const columns: Column<AuditEntry>[] = [
  { key: 'when', header: 'When', sortValue: (e) => e.createdAt, cell: (e) => <span className="whitespace-nowrap">{formatDateTime(e.createdAt)}</span> },
  {
    key: 'actor',
    header: 'Actor',
    sortValue: (e) => e.actor,
    cell: (e) => (
      <div>
        <p className="font-medium">{e.actor}</p>
        <p className="text-xs text-muted-foreground">{e.actorRole.toLowerCase().replaceAll('_', ' ')}</p>
      </div>
    ),
  },
  { key: 'action', header: 'Action', sortValue: (e) => e.action, cell: (e) => <Badge variant="info" className="font-mono">{e.action}</Badge> },
  { key: 'target', header: 'Target', cell: (e) => e.target },
  { key: 'detail', header: 'Detail', hideOnMobile: true, cell: (e) => <span className="text-muted-foreground">{e.detail ?? '–'}</span> },
];

function AuditLog() {
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const filter = { actor, action, from, to };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['audit', filter, page],
    queryFn: () => listAuditEntries(filter, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
  const { data: actions } = useQuery({ queryKey: ['audit-actions'], queryFn: listAuditActions });

  const reset = () => {
    setActor('');
    setAction('');
    setFrom('');
    setTo('');
    setPage(1);
  };
  const dirty = !!(actor || action || from || to);
  const onChange = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    set(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Audit log" description="A record of sensitive administrative actions. Entries cannot be edited or deleted." />
      <Card>
        <div className="flex flex-wrap items-end gap-3 p-3">
          <div className="w-full sm:w-48">
            <label htmlFor="audit-actor" className="mb-1 block text-xs font-medium">Actor</label>
            <Input id="audit-actor" type="search" placeholder="Staff name" value={actor} onChange={onChange(setActor)} />
          </div>
          <div className="w-full sm:w-56">
            <label htmlFor="audit-action" className="mb-1 block text-xs font-medium">Action</label>
            <Select id="audit-action" value={action} onChange={onChange(setAction)}>
              <option value="">All actions</option>
              {actions?.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </div>
          <div className="w-[calc(50%-0.375rem)] sm:w-40">
            <label htmlFor="audit-from" className="mb-1 block text-xs font-medium">From</label>
            <Input id="audit-from" type="date" value={from} max={to || undefined} onChange={onChange(setFrom)} />
          </div>
          <div className="w-[calc(50%-0.375rem)] sm:w-40">
            <label htmlFor="audit-to" className="mb-1 block text-xs font-medium">To</label>
            <Input id="audit-to" type="date" value={to} min={from || undefined} onChange={onChange(setTo)} />
          </div>
          {dirty && <Button variant="ghost" onClick={reset}>Clear filters</Button>}
        </div>
        <DataTable
          caption="Audit log"
          columns={columns}
          rows={data?.items}
          rowKey={(e) => e.id}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          skeletonRows={8}
          emptyTitle="No matching entries"
          emptyDescription="Try widening the date range or clearing the filters."
        />
        {data && !error && (
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} disabled={isFetching} />
        )}
      </Card>
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <RequirePermission permission="audit.view">
      <AuditLog />
    </RequirePermission>
  );
}
