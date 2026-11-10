'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { LoginInput } from '@sirlawglobal/contracts';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginInput) });

  const onSubmit = async (_values: LoginInput) => {
    // Mock only: real staff authentication arrives with the backend (Phase 5).
    await new Promise((r) => setTimeout(r, 600));
    toast.success('Signed in (demo)');
    router.push('/');
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-accent/40 p-4">
      <Card className="w-full max-w-sm p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Tonyson" className="mb-6 h-9 w-auto" />
        <h1 className="text-lg font-semibold tracking-tight">Staff sign in</h1>
        <p className="mb-5 text-sm text-muted-foreground">Access the Tonyson admin dashboard.</p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="username" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-err' : undefined} {...register('email')} />
            {errors.email && (
              <p id="email-err" role="alert" className="mt-1 text-xs text-danger">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'pw-err' : undefined} {...register('password')} />
            {errors.password && (
              <p id="pw-err" role="alert" className="mt-1 text-xs text-danger">
                {errors.password.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
