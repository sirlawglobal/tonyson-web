'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { OrderStatus } from '@sirlawglobal/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input, Label } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet } from '@/components/ui/sheet';
import { KpiCard } from '@/components/kpi-card';
import { StatusBadge } from '@/components/status-badge';

interface Row {
  id: string;
  name: string;
  qty: number;
}
const rows: Row[] = [
  { id: '1', name: 'Fresh Tomatoes', qty: 120 },
  { id: '2', name: 'Long Grain Rice', qty: 14 },
  { id: '3', name: 'Farm Eggs (Crate)', qty: 62 },
];
const cols: Column<Row>[] = [
  { key: 'name', header: 'Product', sortValue: (r) => r.name, cell: (r) => r.name },
  { key: 'qty', header: 'Stock', align: 'right', sortValue: (r) => r.qty, cell: (r) => r.qty },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function StylePage() {
  const [page, setPage] = useState(1);
  const [sheet, setSheet] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Style guide</h1>
        <p className="text-sm text-muted-foreground">Every admin component in one place.</p>
      </div>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Add">
            <Plus />
          </Button>
          <Button disabled>Disabled</Button>
          <Button onClick={() => toast.success('Saved', { description: 'Toast notification example.' })}>Show toast</Button>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="s-input">Input</Label>
            <Input id="s-input" placeholder="Type here" />
          </div>
          <div>
            <Label htmlFor="s-invalid">Invalid</Label>
            <Input id="s-invalid" aria-invalid defaultValue="oops" />
          </div>
          <div>
            <Label htmlFor="s-select">Select</Label>
            <Select id="s-select" defaultValue="b">
              <option value="a">Option A</option>
              <option value="b">Option B</option>
            </Select>
          </div>
        </div>
      </Section>

      <Section title="Badges and order statuses">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge variant="brand">Brand</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {OrderStatus.options.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </Section>

      <Section title="KPI cards">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard label="Total sales" value="₦48,200,000" deltaPct={8.4} series={[3, 5, 4, 6, 8, 7, 9, 12]} />
          <KpiCard label="Refunds" value="₦120,000" deltaPct={-2.1} series={[9, 8, 8, 6, 7, 5, 4, 4]} />
          <KpiCard label="Loading" loading />
        </div>
      </Section>

      <Section title="Data table, pagination">
        <div className="-mx-4 -mb-4">
          <DataTable columns={cols} rows={rows} rowKey={(r) => r.id} caption="Example" />
          <Pagination page={page} totalPages={5} total={48} pageSize={10} onPageChange={setPage} />
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Loading skeleton">
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
        </Section>
        <Section title="Sheet (mobile drawer)">
          <Button variant="outline" onClick={() => setSheet(true)}>
            Open sheet
          </Button>
          <Sheet open={sheet} onClose={() => setSheet(false)} label="Example sheet">
            <div className="p-6 pt-12 text-sm">Drawers close with Escape or a backdrop click.</div>
          </Sheet>
        </Section>
        <Section title="Empty state">
          <EmptyState title="No products yet" description="Add your first product to see it here." action={<Button size="sm">Add product</Button>} />
        </Section>
        <Section title="Error state">
          <ErrorState onRetry={() => toast.info('Retrying…')} />
        </Section>
      </div>
    </div>
  );
}
