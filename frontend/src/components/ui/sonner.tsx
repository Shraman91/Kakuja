import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-[var(--paper)] group-[.toaster]:text-[var(--navy)] group-[.toaster]:border-[var(--border)] group-[.toaster]:shadow-navy-lg group-[.toaster]:rounded-xl font-sans',
          description: 'group-[.toast]:text-[var(--navy-soft)]',
          actionButton:
            'group-[.toast]:bg-[var(--navy)] group-[.toast]:text-[var(--cream)]',
          cancelButton:
            'group-[.toast]:bg-[var(--cream-deep)] group-[.toast]:text-[var(--navy)]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

