import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  HandCoins,
  Receipt,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Building2,
  X,
} from 'lucide-react';
import { useRoute } from '../../lib/router';
import { useTheme } from '../../hooks/useTheme';

interface SidebarProps {
  businessName?: string;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  name: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'dashboard', label: 'Dashboard', path: '#/', icon: LayoutDashboard },
  { name: 'employees', label: 'Employees', path: '#/employees', icon: Users },
  { name: 'attendance', label: 'Attendance', path: '#/attendance', icon: CalendarCheck2 },
  { name: 'advances', label: 'Advances', path: '#/advances', icon: HandCoins },
  { name: 'payroll', label: 'Payroll', path: '#/payroll', icon: Receipt },
  { name: 'settings', label: 'Settings', path: '#/settings', icon: SettingsIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({
  businessName = 'Himalayan Enterprises',
  isOpenMobile,
  onCloseMobile,
}) => {
  const route = useRoute();
  const { isDark, toggleTheme } = useTheme();

  const isCurrent = (item: NavItem) => {
    if (item.name === 'dashboard' && route.name === 'dashboard') return true;
    if (item.name === 'employees' && (route.name === 'employees' || route.name === 'employee_detail')) return true;
    if (item.name === 'attendance' && route.name === 'attendance') return true;
    if (item.name === 'advances' && route.name === 'advances') return true;
    if (item.name === 'payroll' && (route.name === 'payroll' || route.name === 'payslip')) return true;
    if (item.name === 'settings' && route.name === 'settings') return true;
    return false;
  };

  const content = (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-300 dark:bg-zinc-950 dark:border-r dark:border-zinc-800">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 group">
          <div className="w-7 h-7 rounded bg-accent-600 flex items-center justify-center text-white shrink-0 font-semibold text-xs shadow-sm group-hover:shadow-md group-hover:bg-accent-500 transition-all duration-300" aria-hidden="true">
            <Building2 className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-semibold text-zinc-100 truncate tracking-tight group-hover:text-white transition-colors duration-200">
              {businessName}
            </h1>
            <p className="text-[11px] text-zinc-400 font-mono leading-none mt-0.5 group-hover:text-zinc-300 transition-colors duration-200">
              Staff & Payroll
            </p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:text-zinc-100 active:bg-zinc-700 p-1.5 rounded transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900"
          aria-label="Close navigation menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav list */}
      <nav className="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isCurrent(item);
          return (
            <a
              key={item.name}
              href={item.path}
              onClick={() => onCloseMobile()}
              aria-current={active ? 'page' : undefined}
              className={`relative flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 ${
                active
                  ? 'bg-gradient-to-r from-accent-600/20 to-accent-600/10 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 active:bg-zinc-800'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-accent-400 rounded-r-full shadow-[0_0_8px_rgba(45,212,191,0.6)]" aria-hidden="true" />
              )}
              <Icon className={`w-4 h-4 shrink-0 transition-all duration-200 ${active ? 'text-accent-400 drop-shadow-[0_0_4px_rgba(45,212,191,0.5)]' : ''}`} aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Footer controls */}
      <div className="p-3 border-t border-zinc-800 text-xs flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 active:bg-zinc-700 active:scale-95 transition-all duration-200 w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 group"
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-90 group-hover:scale-110 transition-all duration-300" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4 group-hover:-rotate-12 group-hover:scale-110 transition-all duration-300" aria-hidden="true" />
          )}
          <span className="group-hover:translate-x-0.5 transition-transform duration-200">{isDark ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:block w-56 fixed inset-y-0 left-0 z-30 select-none">
        {content}
      </aside>

      {/* Mobile drawer */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-64 max-w-xs h-full z-10 shadow-pop">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
