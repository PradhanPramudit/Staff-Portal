import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Download,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { PayrollTable } from '../components/payroll/PayrollTable';
import {
  listEmployees,
  getAttendanceForMonth,
  listAdvances,
  listAdjustments,
  saveAdjustment,
  getPayrollMonth,
  finalizePayrollMonth,
  unlockPayrollMonth,
  getSettings,
  subscribeToStorage,
} from '../lib/storage';
import { computePayrollMonth } from '../lib/payroll';
import { exportPayrollCSV } from '../lib/csv';
import { formatPaisa } from '../lib/money';
import {
  currentMonthKey,
  prevMonthKey,
  nextMonthKey,
  formatDisplayMonth,
  formatDisplayDate,
} from '../lib/dates';
import { useToast } from '../hooks/useToast';
import { navigate } from '../lib/router';
import type {
  Employee,
  AttendanceRecord,
  Advance,
  PayrollAdjustment,
  PayrollMonth,
  PayrollRow,
  Settings,
  MonthKey,
} from '../types';

export const PayrollPage: React.FC<{ onOpenMobileNav: () => void }> = ({
  onOpenMobileNav,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(currentMonthKey());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [adjustments, setAdjustments] = useState<PayrollAdjustment[]>([]);
  const [payrollMonthData, setPayrollMonthData] = useState<PayrollMonth | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals for Finalize and Unlock
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { success, error } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [emps, s, att, advs, adjs, pm] = await Promise.all([
        listEmployees(),
        getSettings(),
        getAttendanceForMonth(selectedMonth),
        listAdvances(),
        listAdjustments(selectedMonth),
        getPayrollMonth(selectedMonth),
      ]);

      setEmployees(emps);
      setSettings(s);
      setAttendance(att);
      setAdvances(advs);
      setAdjustments(adjs);
      setPayrollMonthData(pm);
    } catch (err) {
      console.error(err);
      error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, error]);

  useEffect(() => {
    loadData();
    return subscribeToStorage((key) => {
      if (
        key.includes('payroll') ||
        key.includes('adjustments') ||
        key.includes('attendance') ||
        key.includes('advances') ||
        key.includes('settings')
      ) {
        loadData();
      }
    });
  }, [loadData]);

  // Compute live rows if not finalized; if finalized, use snapshot
  const isFinalized = Boolean(payrollMonthData?.finalized);

  const computedRows: PayrollRow[] = useMemo(() => {
    if (isFinalized && payrollMonthData?.rows) {
      return payrollMonthData.rows;
    }
    if (!settings || employees.length === 0) return [];

    return computePayrollMonth({
      employees,
      month: selectedMonth,
      attendance,
      advances,
      adjustments,
      settings,
      includeInactive: false,
    });
  }, [isFinalized, payrollMonthData, settings, employees, selectedMonth, attendance, advances, adjustments]);

  // Handle bonus or other deduction change
  const handleUpdateAdjustment = async (
    employeeId: string,
    bonus: number,
    otherDeductions: number
  ) => {
    if (isFinalized) return;
    try {
      await saveAdjustment({
        employeeId,
        month: selectedMonth,
        bonus,
        otherDeductions,
      });
      // Optimistically update local adjustments state
      setAdjustments((prev) => {
        const next = prev.filter((a) => !(a.employeeId === employeeId && a.month === selectedMonth));
        next.push({ employeeId, month: selectedMonth, bonus, otherDeductions });
        return next;
      });
    } catch (err) {
      console.error(err);
      error('Failed to update adjustment');
    }
  };

  // Finalize payroll
  const handleConfirmFinalize = async () => {
    setActionLoading(true);
    try {
      await finalizePayrollMonth(selectedMonth, computedRows);
      setFinalizeDialogOpen(false);
      success(`Finalized and locked payroll for ${formatDisplayMonth(selectedMonth)}`);
      await loadData();
    } catch (err) {
      console.error(err);
      error('Failed to finalize payroll');
    } finally {
      setActionLoading(false);
    }
  };

  // Unlock payroll
  const handleConfirmUnlock = async () => {
    setActionLoading(true);
    try {
      await unlockPayrollMonth(selectedMonth);
      setUnlockDialogOpen(false);
      success(`Unlocked payroll for ${formatDisplayMonth(selectedMonth)}`);
      await loadData();
    } catch (err) {
      console.error(err);
      error('Failed to unlock payroll');
    } finally {
      setActionLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!settings || computedRows.length === 0) {
      error('No payroll rows to export');
      return;
    }
    exportPayrollCSV(selectedMonth, computedRows, settings);
    success('Exported payroll CSV');
  };

  const totalNetPayout = computedRows.reduce((sum, r) => sum + r.netPay, 0);

  return (
    <div>
      <Topbar
        title="Monthly Payroll"
        subtitle="Review attendance deductions, advance recoveries, bonuses, and finalize monthly pay"
        onOpenMobileNav={onOpenMobileNav}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExportCSV}
              disabled={computedRows.length === 0}
            >
              Export CSV
            </Button>

            {isFinalized ? (
              <Button
                variant="outline"
                size="sm"
                icon={<Unlock className="w-3.5 h-3.5 text-amber-600" />}
                onClick={() => setUnlockDialogOpen(true)}
              >
                Unlock Month
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={<Lock className="w-3.5 h-3.5" />}
                onClick={() => setFinalizeDialogOpen(true)}
                disabled={computedRows.length === 0}
              >
                Finalize Month
              </Button>
            )}
          </div>
        }
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
        {/* Month Selector Bar & Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
          {/* Month Navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMonth(prevMonthKey(selectedMonth))}
              className="p-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 min-w-[140px] text-center font-mono">
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

          {/* Quick Summary Pill */}
          {settings && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-zinc-500">
                Staff: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{computedRows.length}</span>
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <span className="text-zinc-500">
                Total Net Payout:{' '}
                <span className="font-mono font-bold text-accent-700 dark:text-accent-400">
                  {formatPaisa(totalNetPayout, {
                    currencySymbol: settings.currencySymbol,
                    numberFormat: settings.numberFormat,
                  })}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Finalized Month Banner */}
        {isFinalized && payrollMonthData && (
          <div className="p-3.5 rounded bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold">Month Finalized & Locked: </span>
                <span>
                  All records for {formatDisplayMonth(selectedMonth)} are locked in an immutable snapshot. Advances scheduled for this month have been deducted from employee balances.
                </span>
                {payrollMonthData.finalizedAt && (
                  <span className="text-emerald-700/80 dark:text-emerald-300/80 ml-1">
                    (Finalized on {formatDisplayDate(payrollMonthData.finalizedAt.slice(0, 10))})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payroll Table */}
        {loading || !settings ? (
          <TableSkeleton rows={7} cols={9} />
        ) : computedRows.length === 0 ? (
          <EmptyState
            title="No eligible staff for this month"
            description="Add active staff members or verify joining dates."
            action={{
              label: 'Go to Staff list',
              onClick: () => navigate('/employees'),
            }}
          />
        ) : (
          <PayrollTable
            month={selectedMonth}
            rows={computedRows}
            settings={settings}
            isFinalized={isFinalized}
            onUpdateAdjustment={handleUpdateAdjustment}
          />
        )}
      </div>

      {/* Confirmation Dialog for Finalize Month */}
      <Dialog
        open={finalizeDialogOpen}
        onClose={() => setFinalizeDialogOpen(false)}
        title={`Finalize Payroll for ${formatDisplayMonth(selectedMonth)}?`}
        description="This will lock the payroll calculations for this month, save a snapshot of all rows, and mark scheduled salary advances as recovered. You can still view and print individual payslips at any time."
        confirmLabel="Finalize & Lock Month"
        confirmVariant="primary"
        loading={actionLoading}
        onConfirm={handleConfirmFinalize}
      />

      {/* Confirmation Dialog for Unlock Month */}
      <Dialog
        open={unlockDialogOpen}
        onClose={() => setUnlockDialogOpen(false)}
        title={`Unlock Payroll for ${formatDisplayMonth(selectedMonth)}?`}
        description="Unlocking allows adjustments to attendance, bonuses, and deductions again. It will temporarily revert the recorded advance recoveries until you finalize again."
        confirmLabel="Unlock Payroll"
        confirmVariant="destructive"
        loading={actionLoading}
        onConfirm={handleConfirmUnlock}
      />
    </div>
  );
};
