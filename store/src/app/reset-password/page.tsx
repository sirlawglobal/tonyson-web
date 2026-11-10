'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ResetPasswordInput } from '@sirlawglobal/contracts';
import { AuthShell } from '@/components/auth-shell';
import { PasswordInput } from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { resetPassword } from '@/lib/api/account';

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const form = useForm<ResetPasswordInput>({ resolver: zodResolver(ResetPasswordInput), defaultValues: { password: '', confirm: '' } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    await resetPassword(token, password);
    toast.success('Password updated. Please log in.');
    router.replace('/login');
  });

  return (
    <AuthShell title="Choose a new password" subtitle="Use at least 8 characters.">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="New password" error={errors.password?.message}><PasswordInput autoComplete="new-password" aria-invalid={!!errors.password} {...form.register('password')} /></Field>
        <Field label="Confirm password" error={errors.confirm?.message}><PasswordInput autoComplete="new-password" aria-invalid={!!errors.confirm} {...form.register('confirm')} /></Field>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !token}>{isSubmitting ? 'Saving…' : 'Update password'}</Button>
        {!token && <p role="alert" className="text-sm text-danger">This reset link is invalid or has expired.</p>}
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return <React.Suspense fallback={null}><ResetForm /></React.Suspense>;
}
