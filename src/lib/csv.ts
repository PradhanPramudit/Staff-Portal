// Payroll CSV export generator
// Produces RFC 4180 compliant CSV files with BOM for Excel compatibility in South Asia.

import type { PayrollRow, Settings, MonthKey } from '../types';
import { paisaToRupees } from './money';

export function exportPayrollCSV(
  month: MonthKey,
  rows: PayrollRow[],
  settings: Settings
): void {
  const headers = [
    'Staff ID',
    'Employee Name',
    'Department',
    'Designation',
    'Base Salary (Rs.)',
    'Payable Days',
    'Present',
    'Absent',
    'Half Days',
    'Paid Leave',
    'Holidays',
    'Weekly Off',
    'Absence Deduction (Rs.)',
    'Half-Day Deduction (Rs.)',
    'Advance Recovery (Rs.)',
    'Bonus (Rs.)',
    'Other Deductions (Rs.)',
    'Gross Earnings (Rs.)',
    'Total Deductions (Rs.)',
    'NET PAY (Rs.)',
  ];

  const escapeCSV = (val: string | number): string => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csvLines: string[] = [
    // Header row
    headers.map(escapeCSV).join(','),
  ];

  for (const r of rows) {
    const line = [
      r.employeeId,
      r.employeeName,
      r.department,
      r.role,
      paisaToRupees(r.baseSalary),
      r.payableDays,
      r.presentDays,
      r.absentDays,
      r.halfDays,
      r.paidLeaveDays,
      r.holidayDays,
      r.weeklyOffDays,
      paisaToRupees(r.absenceDeduction + r.midMonthDeduction),
      paisaToRupees(r.halfDayDeduction),
      paisaToRupees(r.advanceRecovery),
      paisaToRupees(r.bonus),
      paisaToRupees(r.otherDeductions),
      paisaToRupees(r.grossEarnings),
      paisaToRupees(r.totalDeductions),
      paisaToRupees(r.netPay),
    ];
    csvLines.push(line.map(escapeCSV).join(','));
  }

  // UTF-8 BOM so Excel opens it with proper encoding
  const csvContent = '﻿' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeBusinessName = (settings.businessName || 'Staff')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .toLowerCase();
  a.href = url;
  a.download = `payroll_${safeBusinessName}_${month}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
