'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { ForgotPasswordInput } from '@sirlawglobal/contracts';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { requestPasswordReset } from '@/lib/api/account';

export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState<string>();
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(ForgotPasswordInput), defaultValues: { email: '' } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ email }) => {
    await requestPasswordReset(email);
    setSent(email);
  });

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we’ll send you a reset link." footer={<Link href="/login" className="font-semibold text-brand underline">Back to log in</Link>}>
      {sent ? (
        <div role="status" className="space-y-3 rounded-3xl bg-brand-soft p-6 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-brand-deep" aria-hidden />
          <p className="font-semibold text-brand-deep">Check your inbox</p>
          <p className="text-sm text-brand-deep/80">If an account exists for {sent}, a reset link is on its way.</p>
          <Button asChild variant="outline"><Link href="/reset-password?token=demo">Open demo reset link</Link></Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register('email')} /></Field>
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send reset link'}</Button>
        </form>
      )}
    </AuthShell>
  );
}
