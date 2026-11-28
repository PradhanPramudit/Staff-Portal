import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  CheckCircle2,
  HandCoins,
  Receipt,
  UserCheck,
  Clock,
  ArrowRight,
  AlertCircle,
  Plus,
  CalendarCheck2,
} from 'lucide-react';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import {
  listEmployees,
  getAttendanceForDate,
  listAdvances,
  listActivities,
  getSettings,
  setAttendance,
  subscribeToStorage,
  listAdjustments,
} from '../lib/storage';
import { computePayrollMonth } from '../lib/payroll';
import { formatPaisa } from '../lib/money';
import {
  todayISO,
  currentMonthKey,
  formatDisplayDate,
  isWeeklyOffDay,
} from '../lib/dates';
import { navigate } from '../lib/router';
import { useToast } from '../hooks/useToast';
import type {
  Employee,
  AttendanceRecord,
  Advance,
  ActivityEntry,
  Settings,
} from '../types';

export const DashboardPage: React.FC<{ onOpenMobileNav: () => void }> = ({
  onOpenMobileNav,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [adjustments, setAdjustments] = useState<import('../types').PayrollAdjustment[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const today = todayISO();
  const curMonth = currentMonthKey();
  const { success, error } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [emps, dayAtt, advs, acts, s, adjs] = await Promise.all([
        listEmployees(),
        getAttendanceForDate(today),
        listAdvances(),
        listActivities(10),
        getSettings(),
        listAdjustments(curMonth),
      ]);

      setEmployees(emps);
      setTodayAttendance(dayAtt);
      setAdvances(advs);
      setAdjustments(adjs);
      setActivities(acts);
      setSettings(s);
    } catch (err) {
      console.error(err);
      error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [today, curMonth, error]);

  useEffect(() => {
    loadData();
    return subscribeToStorage(() => {
      loadData();
    });
  }, [loadData]);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'active'),
    [employees]
  );

  // Today's attendance mapping
  const attMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of todayAttendance) {
      map.set(r.employeeId, r);
    }
    return map;
  }, [todayAttendance]);

  // Marked vs Unmarked
  const markedStaff = useMemo(() => {
    return activeEmployees
      .filter((e) => attMap.has(e.id))
      .map((e) => ({
        employee: e,
        record: attMap.get(e.id)!,
      }));
  }, [activeEmployees, attMap]);

  const unmarkedStaff = useMemo(() => {
    return activeEmployees.filter((e) => !attMap.has(e.id));
  }, [activeEmployees, attMap]);

  // KPI 1: Active Staff count
  const activeStaffCount = activeEmployees.length;

  // KPI 2: Today's Attendance Rate
  const presentCount = markedStaff.filter(
    (m) => m.record.status === 'present' || m.record.status === 'half_day'
  ).length;
  const attendanceRate =
    activeStaffCount > 0 ? Math.round((presentCount / activeStaffCount) * 100) : 0;

  // KPI 3: Advances given this month
  const advancesThisMonth = useMemo(() => {
    return advances
      .filter((a) => a.date.startsWith(curMonth) && a.status !== 'rejected')
      .reduce((sum, a) => sum + a.amount, 0);
  }, [advances, curMonth]);

  // KPI 4: Estimated payroll this month
  const estimatedPayroll = useMemo(() => {
    if (!settings || activeEmployees.length === 0) return 0;
    const rows = computePayrollMonth({
      employees: activeEmployees,
      month: curMonth,
      attendance: todayAttendance,
      advances,
      adjustments,
      settings,
    });
    return rows.reduce((sum, r) => sum + r.netPay, 0);
  }, [settings, activeEmployees, curMonth, todayAttendance, advances]);

  // Quick action: quick mark single employee
  const handleQuickMark = async (employeeId: string, status: 'present' | 'half_day' | 'absent') => {
    try {
      await setAttendance({
        employeeId,
        date: today,
        status,
      });
      success(`Marked ${status.replace('_', ' ')}`);
      await loadData();
    } catch (err) {
      console.error(err);
      error('Failed to mark attendance');
    }
  };

  // Batch mark all unmarked as present
  const handleMarkAllPresent = async () => {
    try {
      await Promise.all(
        unmarkedStaff.map((emp) =>
          setAttendance({
            employeeId: emp.id,
            date: today,
            status: 'present',
          })
        )
      );
      success(`Marked ${unmarkedStaff.length} staff present`);
      await loadData();
    } catch (err) {
      console.error(err);
      error('Failed to mark all present');
    }
  };

  const isSaturday = isWeeklyOffDay(today, settings?.weeklyOff ?? 6);

  return (
    <div>
      <Topbar
        title="Dashboard Overview"
        subtitle={`Summary for ${formatDisplayDate(today)} • ${settings?.businessName || 'Staff Portal'}`}
        onOpenMobileNav={onOpenMobileNav}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<CalendarCheck2 className="w-3.5 h-3.5" />}
              onClick={() => navigate('/attendance')}
            >
              Mark Today
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => navigate('/employees')}
            >
              Add Staff
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Weekly Off alert banner if today is Saturday */}
        {isSaturday && (
          <div className="p-3.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
              <span>
                Today is Saturday (Regular Weekly Off in Nepal). Marking attendance is optional today.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/attendance')}
              aria-label="Open attendance sheet for today"
            >
              Open Sheet
            </Button>
          </div>
        )}

        {/* 4 Stat Cards */}
        {loading || !settings ? (
          <TableSkeleton rows={3} cols={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Active Staff */}
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="relative p-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 hover:-translate-y-1 hover:shadow-md active:border-zinc-400 dark:active:border-zinc-600 active:translate-y-0 transition-all group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-accent-400 dark:focus-visible:ring-offset-zinc-950"
              aria-label="View active staff and employees"
            >
              {activeStaffCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-sm" aria-hidden="true" />
              )}
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Active Staff
                </span>
                <Users className="w-4 h-4 text-accent-600 group-hover:scale-105 transition-transform" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
                {activeStaffCount}
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
                <span>{employees.length - activeStaffCount} inactive</span>
                <span className="text-accent-600 group-hover:underline flex items-center gap-0.5">
                  View staff <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </span>
              </div>
            </button>

            {/* Card 2: Today's Attendance Rate */}
            <button
              type="button"
              onClick={() => navigate('/attendance')}
              className="p-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 hover:-translate-y-1 hover:shadow-md active:border-zinc-400 dark:active:border-zinc-600 active:translate-y-0 transition-all group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-accent-400 dark:focus-visible:ring-offset-zinc-950"
              aria-label="View today's attendance rate and mark attendance"
            >
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Today's Attendance
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-105 transition-transform" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
                {attendanceRate}%
              </div>
              <div className="mt-2 mb-1.5 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${attendanceRate}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>
                  {presentCount} of {activeStaffCount} present
                </span>
                <span className="text-emerald-600 group-hover:underline flex items-center gap-0.5">
                  Mark sheet <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </span>
              </div>
            </button>

            {/* Card 3: Advances Given This Month */}
            <button
              type="button"
              onClick={() => navigate('/advances')}
              className="p-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 hover:-translate-y-1 hover:shadow-md active:border-zinc-400 dark:active:border-zinc-600 active:translate-y-0 transition-all group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-accent-400 dark:focus-visible:ring-offset-zinc-950"
              aria-label="View salary advances given this month"
            >
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Advances This Month
                </span>
                <HandCoins className="w-4 h-4 text-amber-500 group-hover:scale-105 transition-transform" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
                {formatPaisa(advancesThisMonth, {
                  currencySymbol: settings.currencySymbol,
                  numberFormat: settings.numberFormat,
                })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
                <span>Disbursed in {curMonth}</span>
                <span className="text-amber-600 group-hover:underline flex items-center gap-0.5">
                  Advances <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </span>
              </div>
            </button>

            {/* Card 4: Estimated Payroll This Month */}
            <button
              type="button"
              onClick={() => navigate('/payroll')}
              className="p-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 hover:-translate-y-1 hover:shadow-md active:border-zinc-400 dark:active:border-zinc-600 active:translate-y-0 transition-all group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-accent-400 dark:focus-visible:ring-offset-zinc-950"
              aria-label="Review estimated payroll payout for this month"
            >
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Est. Payroll Payout
                </span>
                <Receipt className="w-4 h-4 text-accent-700 dark:text-accent-400 group-hover:scale-105 transition-transform" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
                {formatPaisa(estimatedPayroll, {
                  currencySymbol: settings.currencySymbol,
                  numberFormat: settings.numberFormat,
                })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
                <span>Estimated net pay</span>
                <span className="text-accent-600 group-hover:underline flex items-center gap-0.5">
                  Review <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Middle Section: Today's Attendance Status (Marked vs Not Marked Yet) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Today's Marked Attendance */}
          <div className="lg:col-span-2 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                  <span>Today's Marked Attendance ({markedStaff.length})</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Staff members whose attendance has already been logged for today
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/attendance')}
                aria-label="Open full attendance sheet"
              >
                Open Full Sheet
              </Button>
            </div>

            {markedStaff.length === 0 ? (
              <EmptyState
                title="No attendance marked yet today"
                description="Click 'Mark All Present' in the attendance sheet or mark employees individually."
                action={{
                  label: 'Open Attendance Sheet',
                  onClick: () => navigate('/attendance'),
                }}
              />
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {markedStaff.map(({ employee: emp, record }) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => navigate(`/employees/${emp.id}`)}
                    className="py-2.5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 active:bg-zinc-100 dark:active:bg-zinc-800 px-2 rounded -mx-2 transition-colors w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600 dark:focus-visible:ring-accent-400"
                    aria-label={`View ${emp.fullName}'s details`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-[11px] flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                        {emp.fullName.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                          {emp.fullName}
                        </span>
                        <span className="text-[11px] text-zinc-400 truncate block">
                          {emp.department} • {emp.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {record.note && (
                        <span className="text-[11px] text-zinc-400 italic max-w-xs truncate hidden sm:inline">
                          "{record.note}"
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded font-semibold text-[11px] uppercase tracking-wider ${
                          record.status === 'present'
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : record.status === 'absent'
                            ? 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800'
                            : record.status === 'half_day'
                            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                        }`}
                      >
                        {record.status.replace('_', ' ')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Column 3: Not Marked Yet Section */}
          <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" aria-hidden="true" />
                  <span>Not Marked Yet ({unmarkedStaff.length})</span>
                </h3>
              </div>
              <p className="text-xs text-zinc-500">
                Staff members with no attendance record logged for today
              </p>

              {unmarkedStaff.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded bg-zinc-50/50 dark:bg-zinc-900/50">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" aria-hidden="true" />
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    All staff accounted for today!
                  </span>
                </div>
              ) : (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={handleMarkAllPresent}
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    aria-label="Mark all unmarked staff as present"
                  >
                    Mark All Present
                  </Button>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs max-h-72 overflow-y-auto">
                    {unmarkedStaff.map((emp) => (
                      <div
                        key={emp.id}
                        className="py-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate block">
                            {emp.fullName}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {emp.department}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQuickMark(emp.id, 'present')}
                            className="px-2 py-1 text-[11px] font-medium rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 active:bg-emerald-200 dark:active:bg-emerald-900/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                            aria-label={`Mark ${emp.fullName} as present`}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickMark(emp.id, 'half_day')}
                            className="px-2 py-1 text-[11px] font-medium rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 active:bg-amber-200 dark:active:bg-amber-900/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
                            aria-label={`Mark ${emp.fullName} as half day`}
                          >
                            H
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickMark(emp.id, 'absent')}
                            className="px-2 py-1 text-[11px] font-medium rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/60 active:bg-red-200 dark:active:bg-red-900/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                            aria-label={`Mark ${emp.fullName} as absent`}
                          >
                            A
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {unmarkedStaff.length > 0 && (
              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate('/attendance')}
                  aria-label="Go to attendance sheet to mark remaining staff"
                >
                  Go to Attendance Sheet
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Recent Activity Feed */}
        <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" aria-hidden="true" />
              <span>Recent Activity Feed</span>
            </h3>
            <span className="text-xs text-zinc-400 font-mono">Last 10 actions</span>
          </div>

          {activities.length === 0 ? (
            <div className="text-center py-6 text-xs text-zinc-400">
              No activity logged yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {activities.map((act) => {
                const timeAgo = formatDisplayDate(act.at.slice(0, 10));
                return (
                  <div key={act.id} className="py-2.5 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-600 mt-2 shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-zinc-800 dark:text-zinc-200 font-medium">
                          {act.message}
                        </p>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase">
                          {act.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-zinc-400 shrink-0 font-mono">
                      {timeAgo}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
