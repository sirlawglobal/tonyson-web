import { AlertTriangle, PackageSearch } from 'lucide-react';
import { Button } from './button';

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-16 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-brand-soft text-brand-deep">
        <PackageSearch className="h-9 w-9" aria-hidden />
      </div>
      <h3 className="font-display text-xl font-bold">{title}</h3>
      {body && <p className="text-muted-foreground">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="mx-auto flex max-w-sm flex-col items-center gap-3 py-16 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-accent-soft text-accent">
        <AlertTriangle className="h-9 w-9" aria-hidden />
      </div>
      <h3 className="font-display text-xl font-bold">We hit a snag</h3>
      <p className="text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
