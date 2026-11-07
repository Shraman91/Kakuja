import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[var(--navy)] text-[var(--cream)] shadow-sm',
        secondary:
          'border-[var(--border)] bg-[var(--cream-deep)] text-[var(--navy)]',
        outline:
          'border-[var(--border)] bg-transparent text-[var(--navy)]',
        gold:
          'border-[#D9A441]/40 bg-[#D9A441]/20 text-[#684803] font-semibold',
        result:
          'border-[#D9A441] bg-[#D9A441]/25 text-[#684803] font-semibold',
        method:
          'border-[var(--navy)]/30 bg-[var(--navy)]/10 text-[var(--navy)] font-medium',
        dataset:
          'border-[#2A7F7F]/40 bg-[#2A7F7F]/15 text-[#134E4E] font-medium',
        concept:
          'border-[#C2674A]/40 bg-[#C2674A]/15 text-[#7C2D16] font-medium',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
