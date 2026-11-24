'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { resendVerification, verifyAccount } from '@/lib/api/auth';
import { errorMessage } from '@/lib/api/client';
import { useAuth, useRequireAuth } from '@/lib/auth';

const LEN = 6;

function VerifyForm() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const { user } = useRequireAuth();
  const { setUser } = useAuth();
  const [digits, setDigits] = React.useState<string[]>(Array(LEN).fill(''));
  const [error, setError] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(30);
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async (code: string) => {
    setBusy(true);
    setError(undefined);
    try {
      const u = await verifyAccount(code);
      setUser(u);
      toast.success('Account verified');
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/account');
    } catch (e) {
      setError(errorMessage(e, 'Verification failed. Try again.'));
      setDigits(Array(LEN).fill(''));
      refs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const set = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1);
    const nextDigits = digits.map((x, k) => (k === i ? d : x));
    setDigits(nextDigits);
    if (d && i < LEN - 1) refs.current[i + 1]?.focus();
    if (nextDigits.every(Boolean)) void submit(nextDigits.join(''));
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LEN);
    if (!text) return;
    e.preventDefault();
    setDigits(Array.from({ length: LEN }, (_, i) => text[i] ?? ''));
    if (text.length === LEN) void submit(text);
  };

  if (!user) return null;

  return (
    <AuthShell title="Verify your account" subtitle={`We sent a 6-digit code to ${user.email}. Enter it below.`}>
      <div className="space-y-5">
        <div role="group" aria-label="6-digit verification code" className="flex justify-between gap-2" onPaste={onPaste}>
          {digits.map((d, i) => (
            <input key={i} ref={(el) => { refs.current[i] = el; }} value={d} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={1} aria-label={`Digit ${i + 1}`} aria-invalid={!!error}
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus(); }}
              className="h-14 w-full min-w-0 rounded-2xl border border-border bg-surface text-center font-display text-2xl font-bold focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 aria-[invalid=true]:border-danger" />
          ))}
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button size="lg" className="w-full" disabled={busy || digits.some((d) => !d)} onClick={() => submit(digits.join(''))}>{busy ? 'Verifying…' : 'Verify'}</Button>
        <div className="flex items-center justify-between text-sm">
          <button type="button" disabled={cooldown > 0} onClick={async () => {
            try {
              await resendVerification();
              setCooldown(30);
              setError(undefined);
              toast.info('A new code has been sent.');
            } catch (e) {
              toast.error(errorMessage(e, 'Could not send a new code. Try again shortly.'));
            }
          }} className="min-h-11 px-1 font-semibold text-brand disabled:text-muted-foreground">{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}</button>
          <button type="button" onClick={() => router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/account')} className="min-h-11 px-1 text-muted-foreground underline">Skip for now</button>
        </div>
      </div>
    </AuthShell>
  );
}

export default function VerifyPage() {
  return <React.Suspense fallback={null}><VerifyForm /></React.Suspense>;
}
