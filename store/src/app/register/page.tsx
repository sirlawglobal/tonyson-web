'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { RegisterInput } from '@sirlawglobal/contracts';
import { AuthShell } from '@/components/auth-shell';
import { PasswordInput } from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { register } from '@/lib/api/auth';
import { errorMessage } from '@/lib/api/client';
import { applyApiErrors } from '@/lib/form-errors';
import { useAuth } from '@/lib/auth';

function RegisterForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const { setUser } = useAuth();
  const [formError, setFormError] = React.useState<string>();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(RegisterInput),
    defaultValues: { name: '', email: '', phone: '', password: '', referralCode: sp.get('ref') ?? '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      const user = await register(values);
      setUser(user);
      toast.success('Account created', { description: 'Enter the code we sent to verify your account.' });
      const next = sp.get('next');
      router.replace(`/verify${next ? `?next=${encodeURIComponent(next)}` : ''}`);
    } catch (e) {
      // 409 (email taken) and 400 (invalid fields) both carry per-field details; anything else is a banner.
      if (!applyApiErrors(form, e, ['name', 'email', 'phone', 'password', 'referralCode'])) setFormError(errorMessage(e));
    }
  });

  return (
    <AuthShell title="Create your account" subtitle="Join Tonyson and start earning rewards on every order." footer={<>Already have an account? <Link href="/login" className="font-semibold text-brand underline">Log in</Link></>}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <p role="alert" className="rounded-2xl bg-accent-soft p-3 text-sm font-medium text-accent">{formError}</p>}
        <Field label="Full name" error={errors.name?.message}><Input autoComplete="name" aria-invalid={!!errors.name} {...form.register('name')} /></Field>
        <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register('email')} /></Field>
        <Field label="Phone number" error={errors.phone?.message}><Input type="tel" inputMode="tel" autoComplete="tel" placeholder="08012345678" aria-invalid={!!errors.phone} {...form.register('phone')} /></Field>
        <Field label="Password" error={errors.password?.message} hint="At least 8 characters"><PasswordInput autoComplete="new-password" aria-invalid={!!errors.password} {...form.register('password')} /></Field>
        <Field label="Referral code (optional)" error={errors.referralCode?.message}><Input className="uppercase" autoComplete="off" {...form.register('referralCode')} /></Field>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create account'}</Button>
        <p className="text-center text-xs text-muted-foreground">By continuing you agree to our Terms and Privacy Policy.</p>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return <React.Suspense fallback={null}><RegisterForm /></React.Suspense>;
}
