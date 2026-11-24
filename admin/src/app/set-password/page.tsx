'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ResetPasswordInput } from '@sirlawglobal/contracts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { setPassword } from '@/lib/api/auth';
import { ApiError, errorMessage } from '@/lib/api/client';

/**
 * Where the staff invite email (and an admin-issued "resend link") lands: /set-password?token=...
 * Choosing a password here also verifies the email address. The link works once and expires after 72 hours.
 */
function SetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [formError, setFormError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(ResetPasswordInput), defaultValues: { password: '', confirm: '' } });

  const onSubmit = async ({ password }: ResetPasswordInput) => {
    setFormError(undefined);
    try {
      await setPassword(token, password);
      toast.success('Password set. You can sign in now.');
      router.replace('/login');
    } catch (e) {
      // 400: password rules (per-field); 422: the link is invalid, expired or already used.
      const weak = e instanceof ApiError ? e.fieldError('password') : undefined;
      if (weak) setError('password', { message: weak });
      else setFormError(errorMessage(e));
    }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-accent/40 p-4">
      <ThemeToggle className="absolute right-4 top-4" />
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-lg font-semibold tracking-tight">Choose your password</h1>
        <p className="mb-5 text-sm text-muted-foreground">Welcome to the Tonyson admin dashboard. Set a password to finish creating your account.</p>
        {!token ? (
          <p role="alert" className="rounded-md bg-danger-soft p-2.5 text-sm font-medium text-danger">
            This link is missing its token. Open the link from your invitation email, or ask a Super Admin to send you a new one.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {formError && (
              <p role="alert" className="rounded-md bg-danger-soft p-2.5 text-sm font-medium text-danger">
                {formError} Ask a Super Admin to send you a new link.
              </p>
            )}
            <div>
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'pw-err' : undefined} {...register('password')} />
              {errors.password && (
                <p id="pw-err" role="alert" className="mt-1 text-xs text-danger">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} aria-describedby={errors.confirm ? 'cf-err' : undefined} {...register('confirm')} />
              {errors.confirm && (
                <p id="cf-err" role="alert" className="mt-1 text-xs text-danger">
                  {errors.confirm.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Set password'}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/login" className="underline">
            Back to sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordForm />
    </Suspense>
  );
}
