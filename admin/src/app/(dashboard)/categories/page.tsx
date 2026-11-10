'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import type { Category } from '@sirlawglobal/contracts';
import { PageHeader } from '@/components/page-header';
import { RequirePermission } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { createCategory, deleteCategory, listAdminCategories, updateCategory, type CategoryInput } from '@/lib/api/categories';

const schema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  slug: z.string().trim().min(2, 'Slug is required').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens'),
  emoji: z.string().trim().min(1, 'Pick an emoji').max(8),
  tint: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #DCFCE7'),
  parentId: z.string(),
});
type Values = z.infer<typeof schema>;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function CategoryForm({ category, categories, onClose }: { category: Category | null; categories: Category[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [slugTouched, setSlugTouched] = useState(!!category);
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '', emoji: '🛒', tint: '#DCFCE7', parentId: '' },
  });
  useEffect(() => {
    reset(category ? { name: category.name, slug: category.slug, emoji: category.emoji, tint: category.tint, parentId: category.parentId ?? '' } : { name: '', slug: '', emoji: '🛒', tint: '#DCFCE7', parentId: '' });
    setSlugTouched(!!category);
  }, [category, reset]);

  const save = useMutation({
    mutationFn: (v: CategoryInput) => (category ? updateCategory(category.id, v) : createCategory(v)),
    onSuccess: () => {
      toast.success(category ? 'Category updated' : 'Category created');
      for (const k of ['categories', 'products']) qc.invalidateQueries({ queryKey: [k] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const tint = watch('tint');

  return (
    <form id="category-form" noValidate onSubmit={handleSubmit((v) => save.mutate({ ...v, parentId: v.parentId || null }))} className="space-y-3">
      <Field label="Name" htmlFor="c-name" error={errors.name?.message}>
        <Input id="c-name" aria-invalid={!!errors.name} {...register('name', { onChange: (e) => { if (!slugTouched) setValue('slug', slugify(e.target.value)); } })} />
      </Field>
      <Field label="Slug" htmlFor="c-slug" error={errors.slug?.message}>
        <Input id="c-slug" aria-invalid={!!errors.slug} {...register('slug', { onChange: () => setSlugTouched(true) })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Emoji" htmlFor="c-emoji" error={errors.emoji?.message}><Input id="c-emoji" {...register('emoji')} /></Field>
        <Field label="Tile colour" htmlFor="c-tint" error={errors.tint?.message}>
          <div className="flex items-center gap-2">
            <span aria-hidden className="size-9 shrink-0 rounded-md border border-border" style={{ background: /^#[0-9a-fA-F]{6}$/.test(tint) ? tint : 'transparent' }} />
            <Input id="c-tint" aria-invalid={!!errors.tint} {...register('tint')} />
          </div>
        </Field>
      </div>
      <Field label="Parent category" htmlFor="c-parent" hint="Leave empty for a top-level category">
        <Select id="c-parent" {...register('parentId')}>
          <option value="">None (top level)</option>
          {categories.filter((c) => c.id !== category?.id && !c.parentId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  );
}

function Categories() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['categories'], queryFn: listAdminCategories });
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const del = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => { toast.success('Category deleted'); qc.invalidateQueries({ queryKey: ['categories'] }); setToDelete(null); },
    onError: (e: Error) => { toast.error(e.message); setToDelete(null); },
  });

  const tops = data?.filter((c) => !c.parentId) ?? [];
  const rows = tops.flatMap((t) => [{ c: t, depth: 0 }, ...(data?.filter((c) => c.parentId === t.id).map((c) => ({ c, depth: 1 })) ?? [])]);

  return (
    <div className="space-y-4">
      <PageHeader title="Categories" description="Organise categories and subcategories." actions={<Button onClick={() => setEditing('new')}><Plus /> New category</Button>} />
      <Card>
        {isLoading && <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>}
        {error && <ErrorState message={error.message} onRetry={() => refetch()} />}
        {data && rows.length === 0 && <EmptyState icon={Tags} title="No categories yet" description="Create your first category to start organising products." />}
        {data && rows.length > 0 && (
          <ul className="divide-y divide-border">
            {rows.map(({ c, depth }) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3" style={{ paddingLeft: depth ? '2.5rem' : undefined }}>
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-lg text-xl" style={{ background: c.tint }}>{c.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">/{c.slug} · {c.productCount} {c.productCount === 1 ? 'product' : 'products'}</p>
                </div>
                <Button size="icon" variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}><Pencil /></Button>
                <Button size="icon" variant="ghost" aria-label={`Delete ${c.name}`} onClick={() => setToDelete(c)}><Trash2 /></Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New category' : 'Edit category'}>
        {editing && <CategoryForm category={editing === 'new' ? null : editing} categories={data ?? []} onClose={() => setEditing(null)} />}
      </Dialog>
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
        title="Delete category?"
        description={`“${toDelete?.name}” will be removed. Categories that still contain products can’t be deleted.`}
        confirmLabel="Delete"
        destructive
        loading={del.isPending}
      />
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <RequirePermission permission="categories.write">
      <Categories />
    </RequirePermission>
  );
}
