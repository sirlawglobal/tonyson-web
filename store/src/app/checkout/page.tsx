'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, Clock, CreditCard, MapPin, Plus, ShieldCheck, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { AddressInput, formatNaira, type Order } from '@sirlawglobal/contracts';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { QuantityStepper } from '@/components/quantity-stepper';
import { validatePromo } from '@/lib/api';
import { createOrder, saveAddress } from '@/lib/api/account';
import { useAddresses } from '@/lib/account-queries';
import { useRequireAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { useCartPricing, useDeliveryZones } from '@/lib/queries';
import { cn } from '@/lib/utils';

const steps = ['Delivery', 'Payment', 'Review'];
const SLOTS = ['ASAP (about 2 hrs)', 'Today 4pm – 6pm', 'Tomorrow 9am – 12pm', 'Tomorrow 2pm – 5pm'];

function Confetti() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const colors = ['#bb0000', '#0a9be8', '#0a2a6b', '#e80000', '#f59e0b'];
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {Array.from({ length: 36 }, (_, i) => (
        <motion.span key={i} className="absolute top-0 h-3 w-2 rounded-sm" style={{ left: `${(i * 97) % 100}%`, background: colors[i % colors.length] }}
          initial={{ y: -20, opacity: 1, rotate: 0 }} animate={{ y: '105vh', opacity: [1, 1, 0], rotate: 360 + i * 20 }} transition={{ duration: 2.4 + (i % 5) * 0.3, delay: (i % 8) * 0.05, ease: 'easeIn' }} />
      ))}
    </div>
  );
}

export default function CheckoutPage() {
  const { user, ready } = useRequireAuth();
  const qc = useQueryClient();
  const cart = useCart();
  const zones = useDeliveryZones();
  const addresses = useAddresses();
  const [step, setStep] = React.useState(0);
  const [addressId, setAddressId] = React.useState<string>();
  const [adding, setAdding] = React.useState(false);
  const [zoneId, setZoneId] = React.useState('z1');
  const [slot, setSlot] = React.useState(SLOTS[0] as string);
  const [promoInput, setPromoInput] = React.useState('');
  const [promo, setPromo] = React.useState<string>();
  const [placing, setPlacing] = React.useState(false);
  const [placed, setPlaced] = React.useState<Order | null>(null);

  const zone = zones.data?.find((z) => z.id === zoneId);
  const pricing = useCartPricing(cart.items, promo, zone?.fee);
  const address = addresses.data?.find((a) => a.id === addressId);

  React.useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  // Preselect the default address and its delivery zone once loaded.
  React.useEffect(() => {
    if (addressId || !addresses.data?.length) return;
    const d = addresses.data.find((a) => a.isDefault) ?? addresses.data[0];
    if (d) { setAddressId(d.id); if (d.zoneId) setZoneId(d.zoneId); }
  }, [addresses.data, addressId]);

  const form = useForm({ resolver: zodResolver(AddressInput), defaultValues: { label: 'Home', recipient: user?.name ?? '', phone: user?.phone ?? '', line1: '', area: '', city: 'Lagos', state: 'Lagos', isDefault: false } });

  // The session is read after mount, so fill the name/phone once the user is known (unless already edited).
  React.useEffect(() => {
    if (!user) return;
    if (!form.getFieldState('recipient').isDirty) form.setValue('recipient', user.name);
    if (!form.getFieldState('phone').isDirty && user.phone) form.setValue('phone', user.phone);
  }, [user, form]);

  const addAddress = form.handleSubmit(async (values) => {
    const saved = await saveAddress({ ...values, zoneId });
    await qc.invalidateQueries({ queryKey: ['addresses'] });
    setAddressId(saved.id);
    setAdding(false);
    toast.success('Address saved');
  });

  const applyPromo = async () => {
    const res = await validatePromo(promoInput, pricing.data?.subtotal ?? 0);
    if (res.valid) { setPromo(promoInput.toUpperCase()); toast.success(res.message); } else toast.error(res.message);
  };

  const place = async () => {
    if (!pricing.data || !address) return;
    setPlacing(true);
    try {
      const order = await createOrder({ summary: pricing.data, address: { ...address, zoneId }, slot });
      setPlaced(order); // before clearing the cart, so the empty-cart screen never flashes
      cart.clear();
      await Promise.all([qc.invalidateQueries({ queryKey: ['my-orders'] }), qc.invalidateQueries({ queryKey: ['rewards'] })]);
    } catch {
      toast.error('We couldn’t place your order. You have not been charged.');
    } finally {
      setPlacing(false);
    }
  };

  if (!ready || !user) return <div className="mx-auto max-w-6xl space-y-4 px-4 py-10"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div>;

  if (placed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Confetti />
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }} className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-brand text-white dark:text-[#2a0505]"><Check className="h-12 w-12" strokeWidth={3} /></motion.div>
        <h1 className="mt-6 font-display text-3xl font-extrabold">Order placed!</h1>
        <p className="mt-2 text-muted-foreground">Order <strong className="text-foreground">{placed.number}</strong> is confirmed. Delivery: {slot}.</p>
        <p className="mt-1 text-sm text-muted-foreground">(Demo: no real payment was taken.)</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg"><Link href={`/account/orders/${placed.id}`}>Track my order</Link></Button>
          <Button asChild size="lg" variant="outline"><Link href="/">Continue shopping</Link></Button>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return <EmptyState title="Your cart is empty" body="Add some groceries before checking out." action={<Button asChild><Link href="/products">Start shopping</Link></Button>} />;
  }

  const total = pricing.data?.total ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <h1 className="font-display text-3xl font-extrabold">Checkout</h1>
      <ol className="my-6 flex items-center gap-2" aria-label="Checkout progress">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2" aria-current={i === step ? 'step' : undefined}>
            <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors', i <= step ? 'bg-brand text-white dark:text-[#2a0505]' : 'bg-muted text-muted-foreground')}>{i < step ? <Check className="h-4 w-4" /> : i + 1}</span>
            <span className={cn('hidden text-sm font-semibold sm:inline', i === step ? 'text-foreground' : 'text-muted-foreground')}>{s}</span>
            {i < steps.length - 1 && <span className={cn('h-0.5 flex-1 rounded-full', i < step ? 'bg-brand' : 'bg-border')} />}
          </li>
        ))}
      </ol>

      {pricing.isError && (
        <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent-soft p-3 text-sm font-medium text-accent">We couldn’t price your cart. <button type="button" onClick={() => pricing.refetch()} className="font-bold underline">Try again</button></div>
      )}

      {!user.verified && (
        <p className="mb-5 rounded-2xl bg-accent-soft p-3 text-sm font-medium text-accent">Your account isn’t verified yet. <Link href="/verify?next=/checkout" className="font-bold underline">Verify now</Link> to get order updates by SMS and email.</p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <div className="space-y-6 rounded-3xl border border-border bg-surface p-5 md:p-7">
                  <section>
                    <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold"><MapPin className="h-5 w-5 text-brand" aria-hidden />Delivery address</h2>
                    {addresses.isLoading ? <Skeleton className="h-24" /> : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {addresses.data?.map((a) => (
                          <label key={a.id} className={cn('has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand flex cursor-pointer flex-col gap-0.5 rounded-2xl border-2 p-4 text-sm transition-colors', addressId === a.id ? 'border-brand bg-brand-soft' : 'border-border hover:bg-muted')}>
                            <input type="radio" name="address" className="sr-only" checked={addressId === a.id} onChange={() => { setAddressId(a.id); if (a.zoneId) setZoneId(a.zoneId); }} />
                            <span className="font-bold">{a.label}{a.isDefault && <span className="ml-2 text-xs font-semibold text-brand">Default</span>}</span>
                            <span>{a.recipient} · {a.phone}</span>
                            <span className="text-muted-foreground">{a.line1}, {a.area}, {a.city}</span>
                          </label>
                        ))}
                        <button type="button" onClick={() => setAdding((v) => !v)} className="flex min-h-24 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm font-semibold text-brand hover:bg-muted"><Plus className="h-4 w-4" aria-hidden />Add a new address</button>
                      </div>
                    )}
                    {adding && (
                      <form onSubmit={addAddress} noValidate className="mt-4 space-y-4 rounded-2xl bg-muted p-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Full name" error={form.formState.errors.recipient?.message}><Input aria-invalid={!!form.formState.errors.recipient} {...form.register('recipient')} /></Field>
                          <Field label="Phone" error={form.formState.errors.phone?.message}><Input inputMode="tel" aria-invalid={!!form.formState.errors.phone} {...form.register('phone')} /></Field>
                        </div>
                        <Field label="Street address" error={form.formState.errors.line1?.message}><Input placeholder="12 Admiralty Way" aria-invalid={!!form.formState.errors.line1} {...form.register('line1')} /></Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Area" error={form.formState.errors.area?.message}><Input placeholder="Lekki Phase 1" aria-invalid={!!form.formState.errors.area} {...form.register('area')} /></Field>
                          <Field label="Label"><Input {...form.register('label')} /></Field>
                        </div>
                        <Button type="submit" disabled={form.formState.isSubmitting}>Save address</Button>
                      </form>
                    )}
                  </section>

                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold">Delivery zone</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {zones.isLoading ? <Skeleton className="h-16" /> : zones.data?.map((z) => (
                        <label key={z.id} className={cn('has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition-colors', zoneId === z.id ? 'border-brand bg-brand-soft' : 'border-border hover:bg-muted')}>
                          <span><span className="block text-sm font-semibold">{z.name}</span><span className="text-xs text-muted-foreground">~{z.etaMinutes} min</span></span>
                          <span className="text-sm font-bold">{formatNaira(z.fee)}</span>
                          <input type="radio" name="zone" className="sr-only" checked={zoneId === z.id} onChange={() => setZoneId(z.id)} />
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className="mb-2 flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-brand" aria-hidden />Delivery time</legend>
                    <div className="flex flex-wrap gap-2">
                      {SLOTS.map((s) => (
                        <label key={s} className={cn('has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand cursor-pointer rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-colors', slot === s ? 'border-brand bg-brand-soft text-brand-deep' : 'border-border hover:bg-muted')}>
                          <input type="radio" name="slot" className="sr-only" checked={slot === s} onChange={() => setSlot(s)} />{s}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <Button size="lg" disabled={!address} onClick={() => setStep(1)}>Continue to payment</Button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5 rounded-3xl border border-border bg-surface p-5 md:p-7">
                  <h2 className="flex items-center gap-2 font-display text-xl font-bold"><CreditCard className="h-5 w-5 text-brand" aria-hidden />Payment</h2>
                  {['Pay with card', 'Bank transfer', 'USSD'].map((m, i) => (
                    <label key={m} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand">
                      <input type="radio" name="pay" defaultChecked={i === 0} className="h-5 w-5 accent-[var(--brand)]" /><span className="font-semibold">{m}</span><span className="ml-auto text-xs text-muted-foreground">via Paystack</span>
                    </label>
                  ))}
                  <p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-brand" aria-hidden />Payments are verified server-side. Card details never touch our servers.</p>
                  <div className="flex gap-3"><Button variant="outline" size="lg" onClick={() => setStep(0)}>Back</Button><Button size="lg" onClick={() => setStep(2)}>Review order</Button></div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5 rounded-3xl border border-border bg-surface p-5 md:p-7">
                  <h2 className="font-display text-xl font-bold">Review your order</h2>
                  {address && <p className="rounded-2xl bg-muted p-3 text-sm"><strong>Deliver to:</strong> {address.recipient}, {address.line1}, {address.area}. <strong>When:</strong> {slot}</p>}
                  <ul className="divide-y divide-border">
                    {pricing.data?.lines.map((l) => (
                      <li key={`${l.productId}:${l.variantId ?? ''}`} className="flex items-center gap-3 py-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={l.image} alt="" className="h-14 w-14 rounded-xl bg-muted object-cover" />
                        <span className="min-w-0 flex-1 text-sm font-semibold">{l.name}</span>
                        <QuantityStepper size="sm" value={l.quantity} max={l.available} label={l.name} onChange={(n) => cart.setQty(l.productId, n, l.variantId)} />
                        <span className="w-24 text-right font-bold">{formatNaira(l.lineTotal)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-3">
                    <Button variant="outline" size="lg" onClick={() => setStep(1)}>Back</Button>
                    <Button size="lg" className="flex-1 sm:flex-none" disabled={placing || !pricing.data || !address} onClick={place}>{placing ? 'Placing order…' : `Place order · ${formatNaira(total)}`}</Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className="h-fit space-y-4 rounded-3xl border border-border bg-surface p-5 lg:sticky lg:top-40">
          <h2 className="font-display text-lg font-bold">Order summary</h2>
          <div className="flex gap-2">
            <div className="relative flex-1"><Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input aria-label="Promo code" className="h-11 pl-9 uppercase" placeholder="WELCOME10" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} /></div>
            <Button variant="outline" onClick={applyPromo} disabled={!promoInput}>Apply</Button>
          </div>
          {pricing.isLoading ? <Skeleton className="h-32" /> : (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-semibold">{formatNaira(pricing.data?.subtotal ?? 0)}</dd></div>
              {!!pricing.data?.discount && <div className="flex justify-between text-brand"><dt>Discount ({pricing.data.promoCode})</dt><dd className="font-semibold">-{formatNaira(pricing.data.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd className="font-semibold">{pricing.data?.deliveryFee ? formatNaira(pricing.data.deliveryFee) : 'Free'}</dd></div>
              <div className="flex justify-between border-t border-border pt-3 text-base"><dt className="font-bold">Total</dt><dd className="font-display text-xl font-extrabold">{formatNaira(total)}</dd></div>
            </dl>
          )}
          <p className="text-xs text-muted-foreground">Prices are re-calculated on our servers at payment.</p>
        </aside>
      </div>
    </div>
  );
}
