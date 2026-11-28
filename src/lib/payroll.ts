// Pure payroll calculation functions for Staff Portal
// No I/O, no side effects. All money in integer Paisa.

import type {
  Employee,
  AttendanceRecord,
  Advance,
  PayrollAdjustment,
  PayrollRow,
  Settings,
  MonthKey,
  ISODate,
  Paisa,
} from '../types';
import { getMonthInterval, getDaysInMonthKey, isWeeklyOffDay, isDateBefore, isDateAfter, todayISO } from './dates';

export interface ComputePayrollRowInput {
  employee: Employee;
  month: MonthKey;
  attendance: AttendanceRecord[];
  advances: Advance[]; // approved advances applicable to this month
  adjustment?: PayrollAdjustment;
  settings: Settings;
  referenceDate?: ISODate; // used to distinguish future days from unmarked past days
}

/**
 * Determine the divisor used for daily rate calculation.
 */
export function getPayrollDivisor(month: MonthKey, settings: Settings): number {
  const mode = settings.divisor?.mode || '30';
  if (mode === '30') return 30;
  if (mode === 'month_days') return getDaysInMonthKey(month);
  if (mode === 'custom') {
    const c = settings.divisor.custom;
    return c > 0 ? c : 30;
  }
  return 30;
}

/**
 * Calculate the daily rate in unrounded paisa float.
 * Used internally for multiplying by day counts before rounding.
 */
export function calculateDailyRateFloat(baseSalary: Paisa, divisor: number): number {
  if (divisor <= 0) return 0;
  return baseSalary / divisor;
}

/**
 * Compute the scheduled recovery amount for an advance in a given month.
 * Does not check employee net pay yet (that happens when stacking recoveries).
 */
export function calculateAdvanceScheduledRecovery(
  advance: Advance,
  month: MonthKey
): Paisa {
  if (advance.status !== 'approved') return 0;
  if (advance.recoveryStartMonth && advance.recoveryStartMonth > month) return 0;

  const remaining = Math.max(0, advance.amount - (advance.recovered || 0));
  if (remaining <= 0) return 0;

  const installments = Math.max(1, advance.installments || 1);
  // Monthly installment is round(total_amount / installments)
  const scheduledPerMonth = Math.round(advance.amount / installments);

  // But we cannot recover more than the remaining balance
  return Math.min(scheduledPerMonth, remaining);
}

/**
 * Pure function: compute a single employee's payroll row for a given month.
 */
export function computePayrollRow(input: ComputePayrollRowInput): PayrollRow {
  const { employee, month, attendance, advances, adjustment, settings, referenceDate } = input;
  const divisor = getPayrollDivisor(month, settings);
  const dailyRateFloat = calculateDailyRateFloat(employee.baseSalary, divisor);
  const dailyRatePaisa: Paisa = Math.round(dailyRateFloat);

  const { days } = getMonthInterval(month);
  const totalDaysInMonth = days.length;
  const weeklyOffDay = settings.weeklyOff ?? 6;
  const refDate = referenceDate || todayISO();

  // Map of date -> attendance status
  const attMap = new Map<string, AttendanceRecord>();
  for (const r of attendance) {
    if (r.employeeId === employee.id) {
      attMap.set(r.date, r);
    }
  }

  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let paidLeaveDays = 0;
  let holidayDays = 0;
  let weeklyOffDays = 0;
  let unmarkedDays = 0;
  let daysBeforeJoining = 0;
  let calendarWorkingDays = 0;

  const joiningDate = employee.joiningDate;

  for (const date of days) {
    const isOff = isWeeklyOffDay(date, weeklyOffDay);
    if (!isOff) {
      calendarWorkingDays++;
    }

    // Mid-month joiner check: days strictly before joining date are unpaid
    if (joiningDate && isDateBefore(date, joiningDate)) {
      daysBeforeJoining++;
      continue;
    }

    const rec = attMap.get(date);

    if (rec) {
      switch (rec.status) {
        case 'present':
          presentDays++;
          break;
        case 'absent':
          absentDays++;
          break;
        case 'half_day':
          halfDays++;
          break;
        case 'paid_leave':
          paidLeaveDays++;
          break;
        case 'holiday':
          holidayDays++;
          break;
      }
    } else {
      // No attendance record for this day
      if (isOff) {
        weeklyOffDays++;
      } else {
        // Working day with no record: only count as unmarked if date <= referenceDate
        if (date <= refDate) {
          unmarkedDays++;
        }
      }
    }
  }

  // Deductions for missing work
  // Total absent-equivalent days = recorded absences + unmarked past working days
  const effectiveAbsentDays = absentDays + unmarkedDays;
  const absenceDeduction: Paisa = Math.round(effectiveAbsentDays * dailyRateFloat);
  const halfDayDeduction: Paisa = Math.round(halfDays * dailyRateFloat * 0.5);
  const midMonthDeduction: Paisa = Math.round(daysBeforeJoining * dailyRateFloat);

  // Payable days count for summary
  const payableDays =
    presentDays +
    paidLeaveDays +
    holidayDays +
    weeklyOffDays +
    halfDays * 0.5;

  const bonus: Paisa = adjustment?.bonus ? Math.max(0, adjustment.bonus) : 0;
  const otherDeductions: Paisa = adjustment?.otherDeductions
    ? Math.max(0, adjustment.otherDeductions)
    : 0;

  const grossEarnings: Paisa = employee.baseSalary + bonus;

  // Net before advance recovery
  const deductionsBeforeAdvance: Paisa =
    absenceDeduction + halfDayDeduction + midMonthDeduction + otherDeductions;

  const netBeforeAdvance = Math.max(0, grossEarnings - deductionsBeforeAdvance);

  // Calculate advance recovery: total requested across approved advances
  let totalRequestedAdvance = 0;
  for (const adv of advances) {
    if (adv.employeeId === employee.id && adv.status === 'approved') {
      totalRequestedAdvance += calculateAdvanceScheduledRecovery(adv, month);
    }
  }

  // Advance recovery cannot exceed netBeforeAdvance (net pay must never be negative)
  const actualAdvanceRecovery = Math.min(totalRequestedAdvance, netBeforeAdvance);
  const advanceCarryForward = totalRequestedAdvance - actualAdvanceRecovery;

  const totalDeductions: Paisa = deductionsBeforeAdvance + actualAdvanceRecovery;
  const netPay: Paisa = Math.max(0, grossEarnings - totalDeductions);

  return {
    employeeId: employee.id,
    employeeName: employee.fullName,
    department: employee.department,
    role: employee.role,
    baseSalary: employee.baseSalary,
    dailyRate: dailyRatePaisa,
    totalDaysInMonth,
    calendarWorkingDays,
    payableDays,
    presentDays,
    absentDays,
    halfDays,
    paidLeaveDays,
    holidayDays,
    weeklyOffDays,
    unmarkedDays,
    daysBeforeJoining,
    absenceDeduction,
    halfDayDeduction,
    midMonthDeduction,
    advanceRecovery: actualAdvanceRecovery,
    advanceCarryForward,
    bonus,
    otherDeductions,
    grossEarnings,
    totalDeductions,
    netPay,
  };
}

export interface ComputePayrollMonthInput {
  employees: Employee[];
  month: MonthKey;
  attendance: AttendanceRecord[];
  advances: Advance[];
  adjustments: PayrollAdjustment[];
  settings: Settings;
  includeInactive?: boolean;
}

/**
 * Pure function: compute payroll rows for all active (and optionally inactive) employees.
 */
export function computePayrollMonth(input: ComputePayrollMonthInput): PayrollRow[] {
  const {
    employees,
    month,
    attendance,
    advances,
    adjustments,
    settings,
    includeInactive = false,
  } = input;

  const adjMap = new Map<string, PayrollAdjustment>();
  for (const a of adjustments) {
    if (a.month === month) {
      adjMap.set(a.employeeId, a);
    }
  }

  const { start, end } = getMonthInterval(month);
  const monthStartISO = start.toISOString().slice(0, 10);
  const monthEndISO = end.toISOString().slice(0, 10);

  const eligibleEmployees = employees.filter((emp) => {
    if (emp.archivedAt) return false;
    // If joined after this month ends, not eligible
    if (emp.joiningDate && isDateAfter(emp.joiningDate, monthEndISO)) {
      return false;
    }
    if (!includeInactive && emp.status === 'inactive') {
      return false;
    }
    return true;
  });

  return eligibleEmployees.map((emp) =>
    computePayrollRow({
      employee: emp,
      month,
      attendance,
      advances,
      adjustment: adjMap.get(emp.id),
      settings,
      referenceDate: monthStartISO,
    })
  );
}

export interface MonthPayrollSummary {
  employeeCount: number;
  totalBaseSalary: Paisa;
  totalAbsenceDeductions: Paisa;
  totalHalfDayDeductions: Paisa;
  totalAdvanceRecoveries: Paisa;
  totalBonuses: Paisa;
  totalOtherDeductions: Paisa;
  totalGross: Paisa;
  totalDeductions: Paisa;
  totalNetPay: Paisa;
}

export function summarizePayrollRows(rows: PayrollRow[]): MonthPayrollSummary {
  return rows.reduce<MonthPayrollSummary>(
    (acc, r) => ({
      employeeCount: acc.employeeCount + 1,
      totalBaseSalary: acc.totalBaseSalary + r.baseSalary,
      totalAbsenceDeductions: acc.totalAbsenceDeductions + r.absenceDeduction + r.midMonthDeduction,
      totalHalfDayDeductions: acc.totalHalfDayDeductions + r.halfDayDeduction,
      totalAdvanceRecoveries: acc.totalAdvanceRecoveries + r.advanceRecovery,
      totalBonuses: acc.totalBonuses + r.bonus,
      totalOtherDeductions: acc.totalOtherDeductions + r.otherDeductions,
      totalGross: acc.totalGross + r.grossEarnings,
      totalDeductions: acc.totalDeductions + r.totalDeductions,
      totalNetPay: acc.totalNetPay + r.netPay,
    }),
    {
      employeeCount: 0,
      totalBaseSalary: 0,
      totalAbsenceDeductions: 0,
      totalHalfDayDeductions: 0,
      totalAdvanceRecoveries: 0,
      totalBonuses: 0,
      totalOtherDeductions: 0,
      totalGross: 0,
      totalDeductions: 0,
      totalNetPay: 0,
    }
  );
}
