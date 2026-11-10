import { formatNaira } from '@sirlawglobal/contracts';
import { cn } from '@/lib/utils';

export function PriceTag({
  price,
  previousPrice,
  size = 'md',
  stacked = false,
  className,
}: {
  price: number;
  previousPrice?: number;
  size?: 'md' | 'lg';
  /** Show the struck-out old price above the current price instead of beside it. */
  stacked?: boolean;
  className?: string;
}) {
  const hasOld = !!previousPrice && previousPrice > price;
  if (stacked && hasOld) {
    return (
      <div className={cn('flex flex-col leading-tight', className)}>
        <span className={cn('text-muted-foreground line-through', size === 'lg' ? 'text-base' : 'text-xs')}>
          {formatNaira(previousPrice)}
        </span>
        <span className={cn('font-display font-extrabold tracking-tight', size === 'lg' ? 'text-3xl' : 'text-lg')}>
          {formatNaira(price)}
        </span>
      </div>
    );
  }
  return (
    <div className={cn('flex items-baseline gap-2', className)}>
      <span className={cn('font-display font-extrabold tracking-tight', size === 'lg' ? 'text-3xl' : 'text-lg')}>
        {formatNaira(price)}
      </span>
      {previousPrice && previousPrice > price && (
        <span className={cn('text-muted-foreground line-through', size === 'lg' ? 'text-base' : 'text-xs')}>
          {formatNaira(previousPrice)}
        </span>
      )}
    </div>
  );
}
