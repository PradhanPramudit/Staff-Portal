import React from 'react';
import { Menu } from 'lucide-react';

export interface TopbarProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onOpenMobileNav: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  subtitle,
  action,
  onOpenMobileNav,
}) => {
  return (
    <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileNav}
          className="md:hidden text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-1 -ml-1 rounded focus:outline-none focus:ring-2 focus:ring-accent-600"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </header>
  );
};
