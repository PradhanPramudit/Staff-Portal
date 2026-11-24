// Core domain types for Staff Portal (Nepal)
// All monetary amounts are stored as integer paisa (1 Rupee = 100 Paisa).

export type Paisa = number;
export type ISODate = string; // YYYY-MM-DD
export type MonthKey = string; // YYYY-MM

export type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: string;
  fullName: string;
  phone: string;
  department: string;
  role: string;
  baseSalary: Paisa;
  joiningDate: ISODate;
  status: EmployeeStatus;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half_day'
  | 'paid_leave'
  | 'holiday';

export interface AttendanceRecord {
  employeeId: string;
  date: ISODate;
  status: AttendanceStatus;
  note?: string;
  updatedAt: string;
}

export type AdvanceStatus = 'pending' | 'approved' | 'deducted' | 'rejected';

export interface Advance {
  id: string;
  employeeId: string;
  date: ISODate;
  amount: Paisa;
  note: string;
  status: AdvanceStatus;
  installments: number; // 1 = recover all in the first applicable month
  recoveryStartMonth: MonthKey;
  recovered: Paisa; // running total of paisa recovered so far
  createdAt: string;
  updatedAt: string;
}

export interface PayrollAdjustment {
  employeeId: string;
  month: MonthKey;
  bonus: Paisa;
  otherDeductions: Paisa;
  note?: string;
}

export interface PayrollRow {
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  baseSalary: Paisa;
  dailyRate: Paisa;
  totalDaysInMonth: number;
  calendarWorkingDays: number; // excluding weekly offs
  payableDays: number; // present + paid_leave + holiday + weekly_off + 0.5*half_day
  presentDays: number;
  absentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  holidayDays: number;
  weeklyOffDays: number;
  unmarkedDays: number;
  daysBeforeJoining: number; // unpaid mid-month joiner days
  absenceDeduction: Paisa;
  halfDayDeduction: Paisa;
  midMonthDeduction: Paisa;
  advanceRecovery: Paisa;
  advanceCarryForward: Paisa; // advance recovery that could not fit this month
  bonus: Paisa;
  otherDeductions: Paisa;
  grossEarnings: Paisa; // base + bonus
  totalDeductions: Paisa;
  netPay: Paisa; // strictly >= 0
}

export interface PayrollMonth {
  month: MonthKey;
  finalized: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  rows?: PayrollRow[]; // snapshot taken when finalized
}

export type DivisorMode = '30' | 'month_days' | 'custom';

export interface Settings {
  businessName: string;
  currencySymbol: string;
  numberFormat: 'indian' | 'international';
  divisor: {
    mode: DivisorMode;
    custom: number; // used when mode === 'custom'
  };
  weeklyOff: number; // 0 = Sunday, 6 = Saturday (default 6 for Nepal)
  theme: 'system' | 'light' | 'dark';
}

export interface ActivityEntry {
  id: string;
  at: string;
  type:
    | 'employee_created'
    | 'employee_updated'
    | 'employee_archived'
    | 'employee_restored'
    | 'attendance_marked'
    | 'advance_created'
    | 'advance_status'
    | 'payroll_finalized'
    | 'payroll_unlocked'
    | 'settings_updated'
    | 'data_reset'
    | 'sample_data_loaded';
  message: string;
  meta?: Record<string, unknown>;
}

export interface BackupData {
  version: 1;
  exportedAt: string;
  settings: Settings;
  employees: Employee[];
  attendance: AttendanceRecord[];
  advances: Advance[];
  adjustments: PayrollAdjustment[];
  payrollMonths: PayrollMonth[];
  activities: ActivityEntry[];
}
