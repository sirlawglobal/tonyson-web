import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold', {
  variants: {
    tone: {
      sale: 'bg-accent text-white dark:text-[#00182b]',
      brand: 'bg-brand-soft text-brand-deep',
      neutral: 'bg-muted text-muted-foreground',
      warning: 'bg-accent-soft text-accent',
      danger: 'bg-[#fee2e2] text-danger dark:bg-[#3b1010]',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
