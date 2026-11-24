import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Printer, ArrowLeft, Building2 } from 'lucide-react';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import {
  getEmployee,
  getAttendanceForMonth,
  listAdvances,
  listAdjustments,
  getPayrollMonth,
  getSettings,
} from '../lib/storage';
import { computePayrollRow } from '../lib/payroll';
import { formatPaisa, paisaToRupees, rupeesToWords } from '../lib/money';
import { formatDisplayMonth, formatDisplayDate } from '../lib/dates';
import { navigate } from '../lib/router';
import type { Employee, Settings, MonthKey, PayrollRow } from '../types';

export interface PayslipPageProps {
  month: MonthKey;
  employeeId: string;
  onOpenMobileNav: () => void;
}

export const PayslipPage: React.FC<PayslipPageProps> = ({
  month,
  employeeId,
  onOpenMobileNav,
}) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [row, setRow] = useState<PayrollRow | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [emp, s, att, advs, adjs, pm] = await Promise.all([
        getEmployee(employeeId),
        getSettings(),
        getAttendanceForMonth(month),
        listAdvances(),
        listAdjustments(month),
        getPayrollMonth(month),
      ]);

      setEmployee(emp);
      setSettings(s);

      // Check if finalized snapshot exists for this employee
      if (pm?.finalized && pm.rows) {
        const found = pm.rows.find((r) => r.employeeId === employeeId);
        if (found) {
          setRow(found);
          setIsFinalized(true);
          setLoading(false);
          return;
        }
      }

      // If not finalized, compute live row
      if (emp && s) {
        const adj = adjs.find((a) => a.employeeId === employeeId);
        const computed = computePayrollRow({
          employee: emp,
          month,
          attendance: att,
          advances: advs,
          adjustment: adj,
          settings: s,
        });
        setRow(computed);
        setIsFinalized(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [month, employeeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrint = () => {
    window.print();
  };

  const netRupees = useMemo(() => {
    return row ? paisaToRupees(row.netPay) : 0;
  }, [row]);

  if (loading) {
    return (
      <div>
        <Topbar title="Loading Payslip..." onOpenMobileNav={onOpenMobileNav} />
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!employee || !row || !settings) {
    return (
      <div>
        <Topbar title="Payslip" onOpenMobileNav={onOpenMobileNav} />
        <div className="p-6 max-w-xl mx-auto">
          <EmptyState
            title="Payslip record not found"
            description="Could not find an employee record or payroll calculations for the specified period."
            action={{
              label: 'Back to Payroll',
              onClick: () => navigate('/payroll'),
            }}
          />
        </div>
      </div>
    );
  }

  const absenceTotal = row.absenceDeduction + row.midMonthDeduction;

  return (
    <div>
      {/* Topbar: hidden on print */}
      <div className="no-print">
        <Topbar
          title={`Payslip: ${employee.fullName}`}
          subtitle={`${formatDisplayMonth(month)} • ${isFinalized ? 'Finalized Record' : 'Draft / Live Preview'}`}
          onOpenMobileNav={onOpenMobileNav}
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<ArrowLeft className="w-3.5 h-3.5" />}
                onClick={() => navigate('/payroll')}
              >
                Back to Payroll
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={handlePrint}
              >
                Print Payslip
              </Button>
            </div>
          }
        />
      </div>

      {/* Payslip A4 Sheet Container */}
      <div className="p-4 sm:p-8 max-w-4xl mx-auto">
        <div className="print-area bg-white text-zinc-900 border border-zinc-200 shadow-sm rounded-lg p-8 sm:p-10 font-sans space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-zinc-200 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-zinc-900 text-white flex items-center justify-center font-bold text-sm">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                  {settings.businessName}
                </h1>
                <p className="text-xs text-zinc-500 font-mono">
                  Monthly Salary Payslip • Nepal
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase tracking-wider text-zinc-400 block font-semibold">
                Pay Period
              </span>
              <span className="text-base font-bold text-zinc-900 font-mono">
                {formatDisplayMonth(month)}
              </span>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Status: {isFinalized ? 'Official / Finalized' : 'Draft Estimate'}
              </div>
            </div>
          </div>

          {/* Employee & Attendance Info Grid */}
          <div className="grid grid-cols-2 gap-6 p-4 rounded bg-zinc-50 border border-zinc-200 text-xs">
            {/* Left: Staff Profile */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">Employee Name:</span>
                <span className="font-bold text-zinc-900">{employee.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Department:</span>
                <span className="text-zinc-900 font-medium">{employee.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Designation / Role:</span>
                <span className="text-zinc-900 font-medium">{employee.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Joining Date:</span>
                <span className="text-zinc-900">{formatDisplayDate(employee.joiningDate)}</span>
              </div>
            </div>

            {/* Right: Days & Attendance Summary */}
            <div className="space-y-1.5 border-l border-zinc-200 pl-6 font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-sans">Calendar Days:</span>
                <span className="font-semibold">{row.totalDaysInMonth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-sans">Present / Half Days:</span>
                <span>
                  {row.presentDays} / {row.halfDays}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-sans">Paid Leave / Holidays:</span>
                <span>
                  {row.paidLeaveDays} / {row.holidayDays}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-sans">Payable Days:</span>
                <span className="font-bold text-zinc-900">{row.payableDays}</span>
              </div>
            </div>
          </div>

          {/* Earnings & Deductions Breakdown Table */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            {/* Earnings Section */}
            <div className="border border-zinc-200 rounded overflow-hidden">
              <div className="bg-zinc-100 px-3.5 py-2 font-semibold text-zinc-800 border-b border-zinc-200 flex justify-between">
                <span>Gross Earnings</span>
                <span>Amount</span>
              </div>
              <div className="p-3.5 space-y-2.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-600 font-sans">Monthly Base Salary</span>
                  <span className="font-medium">
                    {formatPaisa(row.baseSalary, { currencySymbol: settings.currencySymbol, numberFormat: settings.numberFormat })}
                  </span>
                </div>
                {row.bonus > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span className="font-sans">Performance / Festival Bonus</span>
                    <span className="font-medium">
                      +{formatPaisa(row.bonus, { currencySymbol: settings.currencySymbol, numberFormat: settings.numberFormat })}
                    </span>
                  </div>
                )}
              </div>
              <div className="bg-zinc-50 px-3.5 py-2 border-t border-zinc-200 flex justify-between font-bold font-mono">
                <span className="font-sans">Total Earnings (A)</span>
                <span>
                  {formatPaisa(row.grossEarnings, { currencySymbol: settings.currencySymbol, numberFormat: settings.numberFormat })}
                </span>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="border border-zinc-200 rounded overflow-hidden">
              <div className="bg-zinc-100 px-3.5 py-2 font-semibold text-zinc-800 border-b border-zinc-200 flex justify-between">
                <span>Deductions</span>
                <span>Amount</span>
              </div>
              <div className="p-3.5 space-y-2.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-600 font-sans">
                    Absence Deduction ({row.absentDays + row.unmarkedDays + row.daysBeforeJoining} d)
                  </span>
                  <span className={absenceTotal > 0 ? 'text-red-600 font-medium' : 'text-zinc-400'}>
                    {absenceTotal > 0 ? `−${formatPaisa(absenceTotal, { currencySymbol: settings.currencySymbol, numberFormat: settings.numberFormat })}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 font-sans">Half-Day Deduction ({row.halfDays} d)</span>
                  <span className={row.halfDayDeduction > 0 ? 'text-red-600 font-medium' : 'text-zinc-400'}>
                    {row.halfDayDeduction > 0 ? `−${formatPaisa(row.halfDayDeduction, { currencySymbol: settings.currencySymbol, numberFormat: settings.numberFormat })}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 font-sans">Salary Advance Recovery</span>
                  <span className={row.advanceRecovery > 0 ? 'text-amber-700 font-medium' : 'text-zinc-400'}>
                    {row.advanceRecovery > 0 ? `−${formatPaisa(row.advanceRecovery, { currencySymbol: settings.currencySymbol, numberFormat: settings.numberFormat })}` : '—'}
                  </span>
                </div>
                {row.otherDeductions > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600 font-sans">Other Deductions</span>
                    <span className="text-red-600 font-medium">
                      −{formatPaisa(row.otherDeductions, { currencySymbol: settings.currencySymbol, numberFormat: settings.numberFormat })}
                    </span>
                  </div>
                )}
              </div>
              <div className="bg-zinc-50 px-3.5 py-2 border-t border-zinc-200 flex justify-between font-bold font-mono">
                <span className="font-sans">Total Deductions (B)</span>
                <span className="text-red-600">
                  −{formatPaisa(row.totalDeductions, { currencySymbol: settings.currencySymbol, numberFormat: settings.numberFormat })}
                </span>
              </div>
            </div>
          </div>

          {/* NET PAY Highlight Box */}
          <div className="p-4 rounded-lg bg-zinc-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block">
                Net Take-Home Pay (A − B)
              </span>
              <span className="text-xs text-zinc-300 italic font-serif mt-1 block">
                Amount in Words: {rupeesToWords(netRupees)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold font-mono tracking-tight tabular-nums">
                {formatPaisa(row.netPay, {
                  currencySymbol: settings.currencySymbol,
                  numberFormat: settings.numberFormat,
                })}
              </span>
            </div>
          </div>

          {/* Footer & Signature Blocks */}
          <div className="pt-10 grid grid-cols-3 gap-6 text-xs text-center border-t border-zinc-200 text-zinc-500">
            <div>
              <div className="border-b border-zinc-300 pb-12 mb-2" />
              <span className="font-semibold text-zinc-700">Prepared By</span>
              <p className="text-[10px] text-zinc-400">Accounts Department</p>
            </div>
            <div>
              <div className="border-b border-zinc-300 pb-12 mb-2" />
              <span className="font-semibold text-zinc-700">Authorized Signatory</span>
              <p className="text-[10px] text-zinc-400">Management</p>
            </div>
            <div>
              <div className="border-b border-zinc-300 pb-12 mb-2" />
              <span className="font-semibold text-zinc-700">Employee Signature</span>
              <p className="text-[10px] text-zinc-400">Received & Acknowledged</p>
            </div>
          </div>

          <div className="text-center text-[10px] text-zinc-400 pt-2 font-mono">
            This is a computer-generated payslip issued by {settings.businessName}. Generated on {formatDisplayDate(new Date().toISOString().slice(0, 10))}.
          </div>
        </div>
      </div>
    </div>
  );
};
