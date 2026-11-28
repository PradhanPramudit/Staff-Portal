import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      loading = false,
      icon,
      children,
      className = '',
      disabled,
      type = 'button', // a bare <Button> inside a <form> must not submit it
      ...props
    },
    ref
  ) => {
    // Focus ring colour lives in each variant so none depends on stylesheet order.
    const base =
      'inline-flex items-center justify-center whitespace-nowrap font-medium rounded transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed';

    // Hover/active only apply while enabled, so a disabled or loading button looks inert.
    // Dark-mode hovers darken: white text on accent-500 / red-500 falls below 4.5:1.
    const variants = {
      primary:
        'bg-accent-700 text-white shadow-sm focus-visible:ring-accent-600 dark:bg-accent-600 dark:focus-visible:ring-accent-400 enabled:hover:bg-accent-800 enabled:active:bg-accent-900 dark:enabled:hover:bg-accent-700 dark:enabled:active:bg-accent-800',
      secondary:
        'bg-zinc-100 text-zinc-900 border border-zinc-200 focus-visible:ring-accent-600 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 dark:focus-visible:ring-accent-400 enabled:hover:bg-zinc-200 enabled:active:bg-zinc-300 dark:enabled:hover:bg-zinc-700 dark:enabled:active:bg-zinc-600',
      outline:
        'bg-white text-zinc-800 border border-zinc-300 focus-visible:ring-accent-600 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 dark:focus-visible:ring-accent-400 enabled:hover:bg-zinc-50 enabled:active:bg-zinc-100 dark:enabled:hover:bg-zinc-800 dark:enabled:active:bg-zinc-700',
      destructive:
        'bg-red-600 text-white shadow-sm focus-visible:ring-red-500 enabled:hover:bg-red-700 enabled:active:bg-red-800 dark:enabled:hover:bg-red-700 dark:enabled:active:bg-red-800',
      ghost:
        'text-zinc-700 focus-visible:ring-accent-600 dark:text-zinc-300 dark:focus-visible:ring-accent-400 enabled:hover:bg-zinc-100 enabled:active:bg-zinc-200 dark:enabled:hover:bg-zinc-800 dark:enabled:active:bg-zinc-700',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-3.5 py-2 gap-2 h-9',
      lg: 'text-base px-4 py-2.5 gap-2.5 h-11',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading ? (
          // 14px matches the icons it replaces, so the button does not change width mid-load
          <span
            aria-hidden="true"
            className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin motion-reduce:animate-none motion-reduce:opacity-50"
          />
        ) : (
          icon
        )}
        {children != null && children !== false && <span>{children}</span>}
      </button>
    );
  }
);
Button.displayName = 'Button';
