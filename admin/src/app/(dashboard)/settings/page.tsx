'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { getSettings, saveSettings } from '@/lib/api/settings';
import type { StoreSettings } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { RequirePermission } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

/** The form edits the free-delivery threshold in naira; the API stores kobo. */
const FormSchema = z.object({
  storeName: z.string().trim().min(2, 'Enter the store name'),
  supportEmail: z.string().trim().email('Enter a valid email'),
  supportPhone: z.string().trim().min(7, 'Enter a valid phone number'),
  freeDeliveryNaira: z.number({ invalid_type_error: 'Enter an amount' }).min(0, 'Cannot be negative'),
  orderCutoffHour: z.number({ invalid_type_error: 'Enter an hour' }).int().min(0, '0 to 23').max(23, '0 to 23'),
  paymentProvider: z.enum(['PAYSTACK', 'FLUTTERWAVE']),
  lowStockDefault: z.number({ invalid_type_error: 'Enter a number' }).int('Whole numbers only').min(0, 'Cannot be negative'),
  allowGuestCheckout: z.boolean(),
  maintenanceMode: z.boolean(),
});
type FormValues = z.infer<typeof FormSchema>;

const toForm = (s: StoreSettings): FormValues => ({
  storeName: s.storeName,
  supportEmail: s.supportEmail,
  supportPhone: s.supportPhone,
  freeDeliveryNaira: s.freeDeliveryThreshold / 100,
  orderCutoffHour: s.orderCutoffHour,
  paymentProvider: s.paymentProvider,
  lowStockDefault: s.lowStockDefault,
  allowGuestCheckout: s.allowGuestCheckout,
  maintenanceMode: s.maintenanceMode,
});

const toSettings = (v: FormValues, base: StoreSettings): StoreSettings => ({
  ...base,
  storeName: v.storeName,
  supportEmail: v.supportEmail,
  supportPhone: v.supportPhone,
  freeDeliveryThreshold: Math.round(v.freeDeliveryNaira * 100),
  orderCutoffHour: v.orderCutoffHour,
  paymentProvider: v.paymentProvider,
  lowStockDefault: v.lowStockDefault,
  allowGuestCheckout: v.allowGuestCheckout,
  maintenanceMode: v.maintenanceMode,
});

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-col items-start gap-0.5">
        <CardTitle>{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function ToggleRow({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 sm:col-span-2">
      <div>
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} label={label} checked={checked} onChange={onChange} />
    </div>
  );
}

function SettingsForm({ settings }: { settings: StoreSettings }) {
  const qc = useQueryClient();
  const { register, control, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: toForm(settings),
  });

  useEffect(() => reset(toForm(settings)), [settings, reset]);

  const maintenance = watch('maintenanceMode');
  const m = useMutation({
    mutationFn: (v: FormValues) => saveSettings(toSettings(v, settings)),
    onSuccess: (s) => {
      toast.success('Settings saved');
      qc.setQueryData(['settings'], s);
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form onSubmit={handleSubmit((v) => m.mutate(v))} className="space-y-4 pb-20" noValidate>
      <Section title="Store information" description="Shown to customers on receipts and support pages.">
        <Field label="Store name" htmlFor="s-name" error={errors.storeName?.message}>
          <Input id="s-name" aria-invalid={!!errors.storeName} {...register('storeName')} />
        </Field>
        <Field label="Support email" htmlFor="s-email" error={errors.supportEmail?.message}>
          <Input id="s-email" type="email" aria-invalid={!!errors.supportEmail} {...register('supportEmail')} />
        </Field>
        <Field label="Support phone" htmlFor="s-phone" error={errors.supportPhone?.message}>
          <Input id="s-phone" type="tel" aria-invalid={!!errors.supportPhone} {...register('supportPhone')} />
        </Field>
        <Field label="Currency" htmlFor="s-currency" hint="Prices are stored in kobo (NGN).">
          <Input id="s-currency" value="NGN (₦)" disabled readOnly />
        </Field>
      </Section>

      <Section title="Delivery & ordering" description="Rules applied at checkout.">
        <Field label="Free delivery threshold (₦)" htmlFor="s-free" error={errors.freeDeliveryNaira?.message} hint="Orders at or above this subtotal ship free.">
          <Input id="s-free" type="number" min={0} step={100} aria-invalid={!!errors.freeDeliveryNaira} {...register('freeDeliveryNaira', { valueAsNumber: true })} />
        </Field>
        <Field label="Same-day order cut-off (hour, 0 to 23)" htmlFor="s-cutoff" error={errors.orderCutoffHour?.message} hint="Orders after this hour are scheduled for the next day.">
          <Input id="s-cutoff" type="number" min={0} max={23} aria-invalid={!!errors.orderCutoffHour} {...register('orderCutoffHour', { valueAsNumber: true })} />
        </Field>
        <Controller
          control={control}
          name="allowGuestCheckout"
          render={({ field }) => (
            <ToggleRow id="s-guest" label="Allow guest checkout" hint="When off, customers must log in before paying." checked={field.value} onChange={field.onChange} />
          )}
        />
      </Section>

      <Section title="Payments" description="Provider used to collect card and transfer payments.">
        <Field label="Payment provider" htmlFor="s-provider" hint="Switching takes effect for new payments only. Final provider is confirmed in the backend phase.">
          <Select id="s-provider" {...register('paymentProvider')}>
            <option value="PAYSTACK">Paystack</option>
            <option value="FLUTTERWAVE">Flutterwave</option>
          </Select>
        </Field>
      </Section>

      <Section title="Inventory" description="Defaults for stock alerts.">
        <Field label="Default low-stock threshold" htmlFor="s-low" error={errors.lowStockDefault?.message} hint="Applied to new products. Existing products keep their own value.">
          <Input id="s-low" type="number" min={0} aria-invalid={!!errors.lowStockDefault} {...register('lowStockDefault', { valueAsNumber: true })} />
        </Field>
      </Section>

      <Section title="Maintenance" description="Temporarily close the storefront.">
        <Controller
          control={control}
          name="maintenanceMode"
          render={({ field }) => (
            <ToggleRow
              id="s-maint"
              label="Maintenance mode"
              hint={maintenance ? 'The storefront shows a “back soon” page and checkout is disabled.' : 'The storefront is open to customers.'}
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">{isDirty ? 'You have unsaved changes' : 'All changes saved'}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={!isDirty || m.isPending} onClick={() => reset(toForm(settings))}>Reset</Button>
            <Button type="submit" disabled={!isDirty || m.isPending}>{m.isPending ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function Settings() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="System-wide configuration for the store." />
      {error ? (
        <Card><ErrorState message={error.message} onRetry={() => refetch()} /></Card>
      ) : isLoading || !data ? (
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : (
        <SettingsForm settings={data} />
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RequirePermission permission="settings.manage">
      <Settings />
    </RequirePermission>
  );
}
