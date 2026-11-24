import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  HandCoins,
  Receipt,
  Pencil,
  Archive,
  Phone,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { Dialog } from '../components/ui/Dialog';
import { employeeStatusBadge, advanceStatusBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { EmployeeForm } from '../components/employees/EmployeeForm';
import {
  getEmployee,
  saveEmployee,
  archiveEmployee,
  restoreEmployee,
  getAttendanceForEmployee,
  listAdvances,
  getSettings,
  exportAllData,
} from '../lib/storage';
import { formatPaisa } from '../lib/money';
import {
  formatDisplayDate,
  formatDisplayMonth,
  getMonthInterval,
  currentMonthKey,
  prevMonthKey,
  nextMonthKey,
  isWeeklyOffDay,
} from '../lib/dates';
import { navigate } from '../lib/router';
import { useToast } from '../hooks/useToast';
import type { Employee, Settings, AttendanceRecord, Advance, MonthKey, ISODate } from '../types';

export const EmployeeDetailPage: React.FC<{
  id: string;
  onOpenMobileNav: () => void;
}> = ({ id, onOpenMobileNav }) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(currentMonthKey());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [pastPayrollMonths, setPastPayrollMonths] = useState<
    Array<{ month: MonthKey; netPay: number; finalizedAt?: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  // Edit drawer & archive dialog
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const { success, error } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [emp, s, att, advs, allData] = await Promise.all([
        getEmployee(id),
        getSettings(),
        getAttendanceForEmployee(id, selectedMonth),
        listAdvances({ employeeId: id }),
        exportAllData(),
      ]);

      setEmployee(emp);
      setSettings(s);
      setAttendance(att);
      setAdvances(advs);

      // Extract past finalized payrolls for this employee
      const payslips: Array<{ month: MonthKey; netPay: number; finalizedAt?: string }> = [];
      for (const pm of allData.payrollMonths) {
        if (pm.finalized && pm.rows) {
          const row = pm.rows.find((r) => r.employeeId === id);
          if (row) {
            payslips.push({
              month: pm.month,
              netPay: row.netPay,
              finalizedAt: pm.finalizedAt,
            });
          }
        }
      }
      payslips.sort((a, b) => b.month.localeCompare(a.month));
      setPastPayrollMonths(payslips);
    } catch (err) {
      console.error(err);
      error('Failed to load employee details.');
    } finally {
      setLoading(false);
    }
  }, [id, selectedMonth, error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calendar month computation
  const monthInterval = useMemo(() => {
    return getMonthInterval(selectedMonth);
  }, [selectedMonth]);

  const attMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of attendance) {
      map.set(r.date, r);
    }
    return map;
  }, [attendance]);

  // Attendance stats for selected month
  const monthStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let paidLeave = 0;
    let holiday = 0;

    for (const r of attendance) {
      if (r.status === 'present') present++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'half_day') halfDay++;
      else if (r.status === 'paid_leave') paidLeave++;
      else if (r.status === 'holiday') holiday++;
    }

    return { present, absent, halfDay, paidLeave, holiday };
  }, [attendance]);

  // Outstanding advance balance
  const outstandingAdvance = useMemo(() => {
    return advances
      .filter((a) => a.status === 'approved')
      .reduce((sum, a) => sum + Math.max(0, a.amount - (a.recovered || 0)), 0);
  }, [advances]);

  const handleEditSubmit = async (
    data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!employee) return;
    setFormLoading(true);
    try {
      await saveEmployee({
        ...data,
        id: employee.id,
      });
      success('Staff profile updated');
      setEditDrawerOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      error('Failed to update employee');
    } finally {
      setFormLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!employee) return;
    try {
      await archiveEmployee(employee.id);
      setArchiveDialogOpen(false);
      success(`Archived ${employee.fullName}`, {
        label: 'Undo',
        onClick: async () => {
          await restoreEmployee(employee.id);
          await loadData();
          success(`Restored ${employee.fullName}`);
        },
      });
      navigate('/employees');
    } catch (err) {
      console.error(err);
      error('Failed to archive employee');
    }
  };

  if (loading) {
    return (
      <div>
        <Topbar
          title="Employee Profile"
          onOpenMobileNav={onOpenMobileNav}
        />
        <div className="p-6 max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div>
        <Topbar title="Staff Member Not Found" onOpenMobileNav={onOpenMobileNav} />
        <div className="p-6 max-w-xl mx-auto">
          <EmptyState
            title="Employee not found"
            description="The staff record you are looking for does not exist or has been removed."
            action={{
              label: 'Back to staff list',
              onClick: () => navigate('/employees'),
            }}
          />
        </div>
      </div>
    );
  }

  const weeklyOffDay = settings?.weeklyOff ?? 6;

  return (
    <div>
      <Topbar
        title={employee.fullName}
        subtitle={`${employee.department} • ${employee.role}`}
        onOpenMobileNav={onOpenMobileNav}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={() => navigate('/employees')}
            >
              Staff List
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Pencil className="w-3.5 h-3.5" />}
              onClick={() => setEditDrawerOpen(true)}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Archive className="w-3.5 h-3.5" />}
              onClick={() => setArchiveDialogOpen(true)}
            >
              Archive
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Profile Card */}
        <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-lg font-semibold flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                {employee.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {employee.fullName}
                  </h1>
                  {employeeStatusBadge(employee.status)}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    {employee.department} — {employee.role}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {employee.phone || 'No phone'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Joined {formatDisplayDate(employee.joiningDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick KPI stats */}
            <div className="flex items-center gap-4 sm:border-l sm:border-zinc-200 dark:sm:border-zinc-800 sm:pl-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
              <div>
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider block">
                  Base Salary
                </span>
                <span className="text-base font-semibold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {formatPaisa(employee.baseSalary, {
                    currencySymbol: settings?.currencySymbol,
                    numberFormat: settings?.numberFormat,
                  })}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider block">
                  Advance Due
                </span>
                <span
                  className={`text-base font-semibold font-mono tabular-nums ${
                    outstandingAdvance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  {formatPaisa(outstandingAdvance, {
                    currencySymbol: settings?.currencySymbol,
                    numberFormat: settings?.numberFormat,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Monthly Attendance Calendar */}
        <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-400" />
                <span>Monthly Attendance Calendar</span>
              </h2>
              <p className="text-xs text-zinc-500">
                Visual breakdown of daily logs for {formatDisplayMonth(selectedMonth)}
              </p>
            </div>

            {/* Month Navigator */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedMonth(prevMonthKey(selectedMonth))}
                className="p-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold px-2 min-w-[120px] text-center font-mono">
                {formatDisplayMonth(selectedMonth)}
              </span>
              <button
                onClick={() => setSelectedMonth(nextMonthKey(selectedMonth))}
                className="p-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Month Summary Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
              Present: {monthStats.present}
            </span>
            <span className="px-2.5 py-1 rounded bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 font-mono">
              Absent: {monthStats.absent}
            </span>
            <span className="px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono">
              Half-day: {monthStats.halfDay}
            </span>
            <span className="px-2.5 py-1 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-mono">
              Paid leave: {monthStats.paidLeave}
            </span>
            <span className="px-2.5 py-1 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-mono">
              Holiday: {monthStats.holiday}
            </span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5 pt-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
              <div
                key={day}
                className={`text-center py-1 text-[11px] font-semibold tracking-wider uppercase ${
                  idx === weeklyOffDay ? 'text-zinc-400 font-normal' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {day}
              </div>
            ))}

            {/* Empty slots for starting day of month */}
            {Array.from({ length: monthInterval.start.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="h-14 bg-zinc-50/50 dark:bg-zinc-950/30 rounded border border-transparent" />
            ))}

            {/* Days */}
            {monthInterval.days.map((dateStr: ISODate) => {
              const rec = attMap.get(dateStr);
              const isOff = isWeeklyOffDay(dateStr, weeklyOffDay);
              const dayNum = parseInt(dateStr.slice(8), 10);

              let statusColor = 'bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 border-zinc-200 dark:border-zinc-800';
              let badgeText = isOff ? 'Off' : '—';

              if (rec) {
                if (rec.status === 'present') {
                  statusColor = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
                  badgeText = 'P';
                } else if (rec.status === 'absent') {
                  statusColor = 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800';
                  badgeText = 'A';
                } else if (rec.status === 'half_day') {
                  statusColor = 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
                  badgeText = 'H';
                } else if (rec.status === 'paid_leave') {
                  statusColor = 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800';
                  badgeText = 'L';
                } else if (rec.status === 'holiday') {
                  statusColor = 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800';
                  badgeText = 'Hol';
                }
              }

              return (
                <div
                  key={dateStr}
                  className={`h-14 p-1.5 rounded border flex flex-col justify-between transition-colors ${statusColor}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-medium">{dayNum}</span>
                    <span className="text-[10px] font-semibold">{badgeText}</span>
                  </div>
                  {rec?.note && (
                    <span className="text-[9px] truncate text-zinc-500 dark:text-zinc-400" title={rec.note}>
                      {rec.note}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Advances & Payslips History in 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Salary Advance History */}
          <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <HandCoins className="w-4 h-4 text-zinc-400" />
                <span>Salary Advance History</span>
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/advances')}
              >
                Manage
              </Button>
            </div>

            {advances.length === 0 ? (
              <EmptyState
                title="No advances recorded"
                description="This staff member has never taken a salary advance."
              />
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {advances.map((adv) => {
                  const remaining = Math.max(0, adv.amount - (adv.recovered || 0));
                  return (
                    <div key={adv.id} className="py-2.5 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                            {formatPaisa(adv.amount, {
                              currencySymbol: settings?.currencySymbol,
                              numberFormat: settings?.numberFormat,
                            })}
                          </span>
                          {advanceStatusBadge(adv.status)}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {formatDisplayDate(adv.date)} • {adv.note || 'No note'}
                        </p>
                        {adv.installments > 1 && (
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            Installments: {adv.installments} months (Starts: {adv.recoveryStartMonth})
                          </p>
                        )}
                      </div>

                      <div className="text-right font-mono text-[11px]">
                        <span className="text-zinc-500 block">Remaining</span>
                        <span
                          className={`font-semibold ${
                            remaining > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500'
                          }`}
                        >
                          {formatPaisa(remaining, {
                            currencySymbol: settings?.currencySymbol,
                            numberFormat: settings?.numberFormat,
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Payslips History */}
          <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-zinc-400" />
              <span>Finalized Payslips</span>
            </h2>

            {pastPayrollMonths.length === 0 ? (
              <EmptyState
                title="No finalized payslips"
                description="Payslips appear here once a monthly payroll is finalized."
                action={{
                  label: 'Go to Payroll',
                  onClick: () => navigate('/payroll'),
                }}
              />
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {pastPayrollMonths.map((p) => (
                  <div
                    key={p.month}
                    className="py-2.5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 px-2 rounded -mx-2 transition-colors cursor-pointer"
                    onClick={() => navigate(`/payroll/${p.month}/${employee.id}`)}
                  >
                    <div>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                        {formatDisplayMonth(p.month)}
                      </span>
                      {p.finalizedAt && (
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          Finalized {formatDisplayDate(p.finalizedAt.slice(0, 10))}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block uppercase">Net Pay</span>
                        <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatPaisa(p.netPay, {
                            currencySymbol: settings?.currencySymbol,
                            numberFormat: settings?.numberFormat,
                          })}
                        </span>
                      </div>
                      <Button variant="outline" size="sm">
                        View Payslip
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Drawer */}
      <Drawer
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        title="Edit Staff Member"
        description={`Update information for ${employee.fullName}`}
      >
        <EmployeeForm
          initial={employee}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditDrawerOpen(false)}
          loading={formLoading}
        />
      </Drawer>

      {/* Archive Dialog */}
      <Dialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        title="Archive Employee?"
        description={`Are you sure you want to archive ${employee.fullName}? Historical data and past payslips will remain saved.`}
        confirmLabel="Archive"
        confirmVariant="destructive"
        onConfirm={handleArchive}
      />
    </div>
  );
};
