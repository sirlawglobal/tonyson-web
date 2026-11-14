import { cn } from '@/lib/utils';

/**
 * Tonyson logo (hexagon mark + wordmark).
 * - "auto": swaps to the light-on-dark artwork when the OS is in dark mode.
 * - "onDark": always the light-on-dark artwork, for permanently dark surfaces (footer, auth panel).
 */
export function Logo({ variant = 'auto', className }: { variant?: 'auto' | 'onDark'; className?: string }) {
  /* eslint-disable @next/next/no-img-element */
  if (variant === 'onDark') {
    return <img src="/logo-dark.png" alt="Tonyson" width={900} height={252} className={cn('h-9 w-auto', className)} />;
  }
  return (
    <>
      <img src="/logo.png" alt="Tonyson" width={900} height={252} className={cn('h-9 w-auto dark:hidden', className)} />
      <img src="/logo-dark.png" alt="" aria-hidden width={900} height={252} className={cn('hidden h-9 w-auto dark:block', className)} />
    </>
  );
}
