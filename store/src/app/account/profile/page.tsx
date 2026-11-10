'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, LogOut, ShieldCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { ProfileInput } from '@sirlawglobal/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Card, PageTitle } from '@/components/account/common';
import { useUpdateProfile } from '@/lib/account-queries';
import { useAuth } from '@/lib/auth';

export default function ProfilePage() {
  const { user, setUser, signOut } = useAuth();
  const router = useRouter();
  const update = useUpdateProfile();
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileInput>({
    resolver: zodResolver(ProfileInput),
    defaultValues: { name: user?.name ?? '', phone: user?.phone ?? '' },
  });
  if (!user) return null;

  const submit = handleSubmit(async (values) => {
    try {
      const next = await update.mutateAsync(values);
      setUser(next);
      toast.success('Profile updated');
    } catch {
      toast.error('Could not update your profile. Please try again.');
    }
  });
  const out = async () => { await signOut(); router.replace('/'); };

  return (
    <div>
      <PageTitle title="Profile" subtitle="Manage your personal details." />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label="Full name" error={errors.name?.message}><Input aria-invalid={!!errors.name} {...register('name')} /></Field>
            <Field label="Phone number" error={errors.phone?.message}><Input inputMode="tel" aria-invalid={!!errors.phone} {...register('phone')} /></Field>
            <Field label="Email" hint="Email can’t be changed here. Contact support if you need to update it."><Input value={user.email} readOnly disabled /></Field>
            <Button type="submit" disabled={!isDirty || update.isPending}>{update.isPending ? 'Saving…' : 'Save changes'}</Button>
          </form>
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 font-display text-lg font-bold">Verification</h2>
            {user.verified ? <Badge tone="brand"><ShieldCheck className="h-3.5 w-3.5" aria-hidden />Account verified</Badge> : (
              <><Badge tone="warning"><ShieldAlert className="h-3.5 w-3.5" aria-hidden />Not verified</Badge><p className="mt-2 text-sm text-muted-foreground">Verify to unlock rewards and secure your account.</p><Button asChild size="sm" className="mt-3"><Link href="/verify">Verify now</Link></Button></>
            )}
          </Card>
          <Card>
            <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold"><KeyRound className="h-4 w-4 text-brand" aria-hidden />Password</h2>
            <p className="text-sm text-muted-foreground">Forgot or want to change your password? We’ll email you a reset link.</p>
            <Button asChild variant="outline" size="sm" className="mt-3"><Link href="/forgot-password">Reset password</Link></Button>
          </Card>
          <Button variant="outline" size="lg" className="w-full text-danger" onClick={out}><LogOut className="h-4 w-4" aria-hidden />Sign out</Button>
        </div>
      </div>
    </div>
  );
}
