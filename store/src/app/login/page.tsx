'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { LoginInput } from '@sirlawglobal/contracts';
import { AuthShell } from '@/components/auth-shell';
import { PasswordInput } from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { login } from '@/lib/api/auth';
import { errorMessage } from '@/lib/api/client';
import { applyApiErrors } from '@/lib/form-errors';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';

/** Only allow same-site relative redirects (prevents open-redirect via ?next=). */
const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/account');

function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const { setUser } = useAuth();
  const cart = useCart();
  const [formError, setFormError] = React.useState<string>();
  const form = useForm<LoginInput>({ resolver: zodResolver(LoginInput), defaultValues: { email: '', password: '' } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      const user = await login(values);
      setUser(user);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`, { description: cart.count ? 'Your guest cart has been merged with your account.' : undefined });
      router.replace(next);
    } catch (e) {
      if (!applyApiErrors(form, e, ['email', 'password'])) setFormError(errorMessage(e));
    }
  });

  return (
    <AuthShell title="Welcome back" subtitle="Log in to see your orders, rewards and saved addresses." footer={<>New to Tonyson? <Link href={`/register${next !== '/account' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand underline">Create an account</Link></>}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <p role="alert" className="rounded-2xl bg-accent-soft p-3 text-sm font-medium text-accent">{formError}</p>}
        <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" placeholder="amara@example.com" aria-invalid={!!errors.email} {...form.register('email')} /></Field>
        <Field label="Password" error={errors.password?.message}><PasswordInput autoComplete="current-password" aria-invalid={!!errors.password} {...form.register('password')} /></Field>
        <div className="text-right"><Link href="/forgot-password" className="text-sm font-semibold text-brand hover:underline">Forgot password?</Link></div>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Log in'}</Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <React.Suspense fallback={null}><LoginForm /></React.Suspense>;
}
