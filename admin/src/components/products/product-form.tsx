'use client';

import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { ProductStatus, type Product } from '@sirlawglobal/contracts';
import { placeholderImage } from '@/mocks';
import { useQuery } from '@tanstack/react-query';
import { listAdminCategories } from '@/lib/api/categories';
import type { ProductInput } from '@/lib/api/products';
import { useRole } from '@/lib/role-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const naira = (label: string) => z.number({ invalid_type_error: `${label} is required` }).min(0, `${label} cannot be negative`);

const schema = z
  .object({
    name: z.string().trim().min(2, 'Name is required'),
    slug: z.string().trim().min(2, 'Slug is required').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens'),
    description: z.string().trim().min(1, 'Add a short description'),
    categoryId: z.string().min(1, 'Choose a category'),
    sku: z.string().trim().min(2, 'SKU is required'),
    unit: z.string().trim().min(1, 'Unit is required (e.g. 1 kg)'),
    price: naira('Price').refine((v) => v > 0, 'Price must be above 0'),
    previousPrice: z.number().min(0).optional().or(z.nan().transform(() => undefined)),
    costPrice: z.number().min(0).optional().or(z.nan().transform(() => undefined)),
    stock: z.number({ invalid_type_error: 'Stock is required' }).int('Whole numbers only').min(0),
    lowStockThreshold: z.number({ invalid_type_error: 'Required' }).int().min(0),
    status: ProductStatus,
    featured: z.boolean(),
    onPromotion: z.boolean(),
    bestSeller: z.boolean(),
    keywords: z.string(),
    variants: z.array(
      z.object({
        id: z.string(),
        label: z.string().trim().min(1, 'Label'),
        price: naira('Price').refine((v) => v > 0, 'Price'),
        sku: z.string().trim().min(2, 'SKU'),
        stock: z.number({ invalid_type_error: 'Stock' }).int().min(0),
      }),
    ),
  })
  .refine((v) => v.previousPrice === undefined || v.previousPrice > v.price, {
    path: ['previousPrice'],
    message: 'Previous price must be higher than the current price',
  });
type Values = z.infer<typeof schema>;

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const toKobo = (n: number) => Math.round(n * 100);
const EMOJI = ['🥬', '🍎', '🍗', '🥛', '🍞', '🥫', '🧴', '🍫', '🥤', '🛒'];

export function ProductForm({
  product,
  saving,
  onSubmit,
  onCancel,
}: {
  product?: Product;
  saving?: boolean;
  onSubmit: (input: ProductInput) => void;
  onCancel: () => void;
}) {
  const { can } = useRole();
  const canWrite = can('products.write');
  const canCost = can('products.cost.read');
  const categories = useQuery({ queryKey: ['categories'], queryFn: listAdminCategories });
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [imageUrl, setImageUrl] = useState('');
  const [slugTouched, setSlugTouched] = useState(!!product);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? {
          name: product.name,
          slug: product.slug,
          description: product.description,
          categoryId: product.categoryId,
          sku: product.sku,
          unit: product.unit,
          price: product.price / 100,
          previousPrice: product.previousPrice ? product.previousPrice / 100 : undefined,
          costPrice: product.costPrice ? product.costPrice / 100 : undefined,
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold,
          status: product.status,
          featured: product.featured,
          onPromotion: product.onPromotion,
          bestSeller: product.bestSeller,
          keywords: product.keywords.join(', '),
          variants: product.variants.map((v) => ({ ...v, price: v.price / 100 })),
        }
      : { name: '', slug: '', description: '', categoryId: '', sku: '', unit: '', stock: 0, lowStockThreshold: 10, status: 'DRAFT', featured: false, onPromotion: false, bestSeller: false, keywords: '', variants: [] },
  });
  const variants = useFieldArray({ control, name: 'variants' });
  const name = watch('name');
  const variantValues = watch('variants');
  const hasVariants = variantValues.length > 0;
  const variantStockTotal = variantValues.reduce((s, x) => s + (Number.isFinite(x.stock) ? x.stock : 0), 0);
  // Invariant: with variants, product stock is always the sum of variant stock.
  useEffect(() => {
    if (hasVariants) setValue('stock', variantStockTotal, { shouldValidate: false });
  }, [hasVariants, variantStockTotal, setValue]);
  const flags = watch(['featured', 'onPromotion', 'bestSeller']);

  const submit = handleSubmit((v) => {
    const cat = categories.data?.find((c) => c.id === v.categoryId);
    const input: ProductInput = {
      name: v.name,
      slug: v.slug,
      description: v.description,
      categoryId: v.categoryId,
      sku: v.sku.toUpperCase(),
      unit: v.unit,
      price: toKobo(v.price),
      previousPrice: v.previousPrice ? toKobo(v.previousPrice) : undefined,
      costPrice: canCost ? (v.costPrice ? toKobo(v.costPrice) : undefined) : product?.costPrice,
      stock: v.variants.length ? v.variants.reduce((s, x) => s + x.stock, 0) : v.stock,
      lowStockThreshold: v.lowStockThreshold,
      status: v.status,
      featured: v.featured,
      onPromotion: v.onPromotion,
      bestSeller: v.bestSeller,
      keywords: v.keywords.split(',').map((k) => k.trim()).filter(Boolean),
      images: images.length ? images : [placeholderImage('🛒', cat?.tint ?? '#E5E7EB')],
      variants: v.variants.map((x) => ({ ...x, sku: x.sku.toUpperCase(), price: toKobo(x.price) })),
      subcategory: product?.subcategory,
    };
    onSubmit(input);
  });

  const addImageUrl = () => {
    const u = imageUrl.trim();
    if (!u) return;
    setImages((i) => [...i, u]);
    setImageUrl('');
  };
  const move = (i: number, d: -1 | 1) =>
    setImages((arr) => {
      const next = [...arr];
      const j = i + d;
      if (j < 0 || j >= next.length) return arr;
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  const fieldset = !canWrite;
  const err = (k: keyof Values) => (errors[k] as { message?: string } | undefined)?.message;

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {fieldset && <p role="status" className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">You have read-only access to products.</p>}
      <fieldset disabled={fieldset} className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" htmlFor="p-name" error={err('name')} className="sm:col-span-2">
                <Input
                  id="p-name"
                  aria-invalid={!!errors.name}
                  {...register('name', {
                    onChange: (e) => { if (!slugTouched) setValue('slug', slugify(e.target.value), { shouldValidate: false }); },
                  })}
                />
              </Field>
              <Field label="Slug" htmlFor="p-slug" error={err('slug')} hint={name ? undefined : 'Generated from the name'}>
                <Input id="p-slug" aria-invalid={!!errors.slug} {...register('slug', { onChange: () => setSlugTouched(true) })} />
              </Field>
              <Field label="SKU" htmlFor="p-sku" error={err('sku')}>
                <Input id="p-sku" className="uppercase" aria-invalid={!!errors.sku} {...register('sku')} />
              </Field>
              <Field label="Category" htmlFor="p-cat" error={err('categoryId')}>
                <Select id="p-cat" aria-invalid={!!errors.categoryId} {...register('categoryId')}>
                  <option value="">Select a category…</option>
                  {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </Select>
              </Field>
              <Field label="Unit" htmlFor="p-unit" error={err('unit')} hint="e.g. 1 kg, 500 ml, 6 pcs">
                <Input id="p-unit" aria-invalid={!!errors.unit} {...register('unit')} />
              </Field>
              <Field label="Description" htmlFor="p-desc" error={err('description')} className="sm:col-span-2">
                <Textarea id="p-desc" aria-invalid={!!errors.description} {...register('description')} />
              </Field>
              <Field label="Search keywords" htmlFor="p-kw" hint="Comma separated" className="sm:col-span-2">
                <Input id="p-kw" {...register('keywords')} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Pricing & stock</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <Field label="Price (₦)" htmlFor="p-price" error={err('price')}>
                <Input id="p-price" type="number" step="0.01" inputMode="decimal" aria-invalid={!!errors.price} {...register('price', { valueAsNumber: true })} />
              </Field>
              <Field label="Previous price (₦)" htmlFor="p-prev" error={err('previousPrice')} hint="Shows a discount badge">
                <Input id="p-prev" type="number" step="0.01" inputMode="decimal" aria-invalid={!!errors.previousPrice} {...register('previousPrice', { valueAsNumber: true })} />
              </Field>
              {canCost && (
                <Field label="Cost price (₦)" htmlFor="p-cost" hint="Staff only">
                  <Input id="p-cost" type="number" step="0.01" inputMode="decimal" {...register('costPrice', { valueAsNumber: true })} />
                </Field>
              )}
              <Field label="Stock on hand" htmlFor="p-stock" error={err('stock')} hint={hasVariants ? 'Total of variant stock (edit the variants below)' : undefined}>
                <Input id="p-stock" type="number" inputMode="numeric" readOnly={hasVariants} aria-invalid={!!errors.stock} {...register('stock', { valueAsNumber: true })} />
              </Field>
              <Field label="Low-stock threshold" htmlFor="p-low" error={err('lowStockThreshold')}>
                <Input id="p-low" type="number" inputMode="numeric" aria-invalid={!!errors.lowStockThreshold} {...register('lowStockThreshold', { valueAsNumber: true })} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
              <Button size="sm" variant="outline" onClick={() => variants.append({ id: `var_${Date.now().toString(36)}`, label: '', price: 0, sku: '', stock: 0 })}>
                <Plus /> Add variant
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {variants.fields.length === 0 && <p className="text-sm text-muted-foreground">No variants. Add sizes such as Small, Regular or Family.</p>}
              {variants.fields.map((f, i) => {
                const ve = errors.variants?.[i];
                return (
                  <div key={f.id} className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 sm:grid-cols-[1.2fr_1fr_1fr_80px_auto]">
                    <Field label="Label" htmlFor={`v-l-${i}`} error={ve?.label?.message}><Input id={`v-l-${i}`} {...register(`variants.${i}.label`)} /></Field>
                    <Field label="Price (₦)" htmlFor={`v-p-${i}`} error={ve?.price?.message}><Input id={`v-p-${i}`} type="number" step="0.01" {...register(`variants.${i}.price`, { valueAsNumber: true })} /></Field>
                    <Field label="SKU" htmlFor={`v-s-${i}`} error={ve?.sku?.message}><Input id={`v-s-${i}`} className="uppercase" {...register(`variants.${i}.sku`)} /></Field>
                    <Field label="Stock" htmlFor={`v-t-${i}`} error={ve?.stock?.message}><Input id={`v-t-${i}`} type="number" {...register(`variants.${i}.stock`, { valueAsNumber: true })} /></Field>
                    <div className="flex items-end"><Button size="icon" variant="ghost" aria-label={`Remove variant ${i + 1}`} onClick={() => variants.remove(i)}><Trash2 /></Button></div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Visibility</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Status" htmlFor="p-status">
                <Select id="p-status" {...register('status')}>
                  {ProductStatus.options.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                </Select>
              </Field>
              {([['featured', 'Featured on home page'], ['onPromotion', 'On promotion'], ['bestSeller', 'Best seller']] as const).map(([k, label], i) => (
                <div key={k} className="flex items-center justify-between gap-2 text-sm">
                  <label htmlFor={`sw-${k}`}>{label}</label>
                  <Switch id={`sw-${k}`} label={label} checked={flags[i]!} onChange={(v) => setValue(k, v, { shouldDirty: true })} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Images</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <ul className="grid grid-cols-3 gap-2">
                {images.map((src, i) => (
                  <li key={`${i}-${src.slice(-12)}`} className="space-y-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Product image ${i + 1}`} className="aspect-square w-full rounded-md border border-border bg-muted object-cover" />
                    <div className="flex justify-between">
                      <Button size="icon" variant="ghost" className="size-7" aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)}><ArrowLeft /></Button>
                      <Button size="icon" variant="ghost" className="size-7" aria-label="Remove image" onClick={() => setImages((a) => a.filter((_, j) => j !== i))}><Trash2 /></Button>
                      <Button size="icon" variant="ghost" className="size-7" aria-label="Move later" disabled={i === images.length - 1} onClick={() => move(i, 1)}><ArrowRight /></Button>
                    </div>
                  </li>
                ))}
              </ul>
              {images.length === 0 && <p className="text-xs text-muted-foreground">No images yet. A placeholder is used if you save without any.</p>}
              <div className="flex gap-2">
                <Input aria-label="Image URL" placeholder="https://…" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl(); } }} />
                <Button variant="outline" onClick={addImageUrl}>Add</Button>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium">Or generate a placeholder</p>
                <div className="flex flex-wrap gap-1">
                  {EMOJI.map((e) => {
                    const tint = categories.data?.find((c) => c.id === watch('categoryId'))?.tint ?? '#E5E7EB';
                    return <Button key={e} size="icon" variant="outline" aria-label={`Add ${e} placeholder`} onClick={() => setImages((a) => [...a, placeholderImage(e, tint)])}>{e}</Button>;
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </fieldset>

      <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 border-t border-border bg-background/90 px-1 py-3 backdrop-blur">
        <Button variant="outline" onClick={onCancel}>{canWrite ? 'Cancel' : 'Back'}</Button>
        {canWrite && <Button type="submit" disabled={saving}>{saving ? 'Saving…' : product ? 'Save changes' : 'Create product'}</Button>}
      </div>
    </form>
  );
}
