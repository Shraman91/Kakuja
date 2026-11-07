import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--navy)] text-[var(--cream)] shadow-navy-sm hover:bg-[var(--navy-soft)] hover:shadow-navy-md active:scale-[0.98]',
        secondary:
          'bg-[var(--cream-deep)] text-[var(--navy)] hover:bg-[#dfd4ba] border border-[var(--border)] active:scale-[0.98]',
        outline:
          'border border-[var(--border)] bg-transparent text-[var(--navy)] hover:bg-[var(--cream-deep)] active:scale-[0.98]',
        ghost:
          'hover:bg-[var(--cream-deep)] text-[var(--navy)] hover:text-[var(--navy-soft)]',
        link: 'text-[var(--navy)] underline-offset-4 hover:underline',
        accent:
          'bg-[var(--accent)] text-[var(--navy-ink)] font-semibold shadow-navy-sm hover:brightness-105 active:scale-[0.98]',
        dark:
          'bg-[var(--cream)] text-[var(--navy-ink)] font-semibold shadow-navy-sm hover:bg-[#fbf7ee] active:scale-[0.98]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-7 text-base font-medium',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
