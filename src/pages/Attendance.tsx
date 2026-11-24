import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck2,
  CalendarDays,
  TableProperties,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Topbar } from '../components/layout/Topbar';
import { MarkingSheet } from '../components/attendance/MarkingSheet';
import { MonthlyGrid } from '../components/attendance/MonthlyGrid';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import {
  listEmployees,
  getAttendanceForDate,
  getAttendanceForMonth,
  setAttendanceBatch,
  getSettings,
  subscribeToStorage,
} from '../lib/storage';
import {
  todayISO,
  currentMonthKey,
  formatDisplayDate,
  isWeeklyOffDay,
  formatShortDate,
} from '../lib/dates';
import { format, subDays, addDays, parseISO } from 'date-fns';
import { useToast } from '../hooks/useToast';
import { navigate } from '../lib/router';
import type { Employee, AttendanceRecord, Settings, ISODate, MonthKey } from '../types';

export const AttendancePage: React.FC<{ onOpenMobileNav: () => void }> = ({
  onOpenMobileNav,
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState<ISODate>(todayISO());
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(currentMonthKey());

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<AttendanceRecord[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const { success, error } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [empList, s, dayAtt, monthAtt] = await Promise.all([
        listEmployees(),
        getSettings(),
        getAttendanceForDate(selectedDate),
        getAttendanceForMonth(selectedMonth),
      ]);
      setEmployees(empList.filter((e) => e.status === 'active'));
      setSettings(s);
      setDailyAttendance(dayAtt);
      setMonthlyAttendance(monthAtt);
    } catch (err) {
      console.error(err);
      error('Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedMonth, error]);

  useEffect(() => {
    loadData();
    return subscribeToStorage((key) => {
      if (key.includes('attendance') || key.includes('employees') || key.includes('settings')) {
        loadData();
      }
    });
  }, [loadData]);

  // Navigate date by +/- 1 day
  const handlePrevDay = () => {
    const prev = format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(todayISO());
  };

  const handleSaveBatch = async (
    records: Array<Omit<AttendanceRecord, 'updatedAt'>>
  ) => {
    try {
      await setAttendanceBatch(records);
      success(`Saved attendance for ${formatShortDate(selectedDate)}`);
      await loadData();
    } catch (err) {
      console.error(err);
      error('Failed to save attendance batch.');
    }
  };

  const weeklyOffDay = settings?.weeklyOff ?? 6;
  const isSelectedDateWeeklyOff = isWeeklyOffDay(selectedDate, weeklyOffDay);

  return (
    <div>
      <Topbar
        title="Attendance Management"
        subtitle="Fast daily marking sheet with keyboard shortcuts and monthly grid overview"
        onOpenMobileNav={onOpenMobileNav}
        action={
          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex items-center p-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('daily')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors ${
                  activeTab === 'daily'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Daily Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('monthly')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors ${
                  activeTab === 'monthly'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <TableProperties className="w-3.5 h-3.5" />
                <span>Monthly Grid</span>
              </button>
            </div>
          </div>
        }
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
        {loading || !settings ? (
          <TableSkeleton rows={8} cols={5} />
        ) : employees.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck2 className="w-8 h-8" />}
            title="No active staff members"
            description="Add active employees to begin tracking daily attendance."
            action={{
              label: 'Go to Staff list',
              onClick: () => navigate('/employees'),
            }}
          />
        ) : activeTab === 'daily' ? (
          <div className="space-y-4">
            {/* Date Navigator Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevDay}
                  className="p-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-accent-600"
                  />
                  <button
                    onClick={handleToday}
                    className="text-xs px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
                  >
                    Today
                  </button>
                </div>

                <button
                  onClick={handleNextDay}
                  className="p-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="Next day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                <span>{formatDisplayDate(selectedDate)}</span>
                {isSelectedDateWeeklyOff && (
                  <span className="ml-2 text-[11px] font-normal text-amber-600 dark:text-amber-400">
                    (Weekly Off — Saturday)
                  </span>
                )}
              </div>
            </div>

            {/* Marking Sheet */}
            <MarkingSheet
              date={selectedDate}
              employees={employees}
              attendance={dailyAttendance}
              isWeeklyOff={isSelectedDateWeeklyOff}
              onSaveBatch={handleSaveBatch}
            />
          </div>
        ) : (
          /* Monthly Grid View */
          <MonthlyGrid
            month={selectedMonth}
            onMonthChange={setSelectedMonth}
            employees={employees}
            attendance={monthlyAttendance}
            settings={settings}
          />
        )}
      </div>
    </div>
  );
};
