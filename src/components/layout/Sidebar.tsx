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
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded bg-accent-600 flex items-center justify-center text-white shrink-0 font-semibold text-xs shadow-sm">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-semibold text-zinc-100 truncate tracking-tight">
              {businessName}
            </h1>
            <p className="text-[11px] text-zinc-400 font-mono leading-none mt-0.5">
              Staff & Payroll
            </p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden text-zinc-400 hover:text-zinc-200 p-1"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav list */}
      <nav className="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isCurrent(item);
          return (
            <a
              key={item.name}
              href={item.path}
              onClick={() => onCloseMobile()}
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                active
                  ? 'bg-zinc-800 text-white font-semibold shadow-xs border-l-2 border-accent-400 pl-[10px]'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-accent-400' : 'text-zinc-400'}`} />
              <span className="truncate">{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Footer controls */}
      <div className="p-3 border-t border-zinc-800 text-xs flex items-center justify-between shrink-0">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors w-full"
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
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
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50"
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
