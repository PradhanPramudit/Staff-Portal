import { describe, it, expect } from 'vitest';
import {
  computePayrollRow,
  getPayrollDivisor,
  calculateAdvanceScheduledRecovery,
} from './payroll';
import { formatIndianNumber, formatPaisa, rupeesToPaisa } from './money';
import type { Employee, Settings, AttendanceRecord, Advance } from '../types';

const defaultSettings: Settings = {
  businessName: 'Himalayan Traders',
  currencySymbol: 'Rs.',
  numberFormat: 'indian',
  divisor: { mode: '30', custom: 30 },
  weeklyOff: 6, // Saturday
  theme: 'system',
};

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    fullName: 'Aarav Sharma',
    phone: '9841234567',
    department: 'Sales',
    role: 'Sales Officer',
    baseSalary: rupeesToPaisa(30000), // 30,000 Rs = 3,000,000 paisa
    joiningDate: '2026-01-01',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('Payroll math - basic rules', () => {
  it('pays full base salary when perfectly present (all working days marked present)', () => {
    const emp = makeEmployee();
    // In Nov 2026: 30 days, Saturdays are 7, 14, 21, 28 (4 Saturdays -> 26 working days)
    // Mark all 26 working days present
    const attendance: AttendanceRecord[] = [];
    for (let d = 1; d <= 30; d++) {
      const dayStr = d.toString().padStart(2, '0');
      const iso = `2026-11-${dayStr}`;
      const isSat = [7, 14, 21, 28].includes(d);
      if (!isSat) {
        attendance.push({
          employeeId: emp.id,
          date: iso,
          status: 'present',
          updatedAt: '2026-11-01',
        });
      }
    }

    const row = computePayrollRow({
      employee: emp,
      month: '2026-11',
      attendance,
      advances: [],
      settings: defaultSettings,
    });

    expect(row.baseSalary).toBe(3000000);
    expect(row.dailyRate).toBe(100000); // 30,000 / 30 = 1,000 Rs = 100,000 paisa
    expect(row.absenceDeduction).toBe(0);
    expect(row.halfDayDeduction).toBe(0);
    expect(row.netPay).toBe(3000000);
    expect(row.presentDays).toBe(26);
    expect(row.weeklyOffDays).toBe(4);
    expect(row.payableDays).toBe(30);
  });

  it('deducts exact daily rate for absent days', () => {
    const emp = makeEmployee();
    // 2 absences, rest present (24 present, 2 absent, 4 saturdays)
    const attendance: AttendanceRecord[] = [];
    let absentCount = 0;
    for (let d = 1; d <= 30; d++) {
      const isSat = [7, 14, 21, 28].includes(d);
      if (isSat) continue;
      const iso = `2026-11-${d.toString().padStart(2, '0')}`;
      if (absentCount < 2) {
        attendance.push({ employeeId: emp.id, date: iso, status: 'absent', updatedAt: iso });
        absentCount++;
      } else {
        attendance.push({ employeeId: emp.id, date: iso, status: 'present', updatedAt: iso });
      }
    }

    const row = computePayrollRow({
      employee: emp,
      month: '2026-11',
      attendance,
      advances: [],
      settings: defaultSettings,
    });

    // 2 days absent * 1,000 Rs = 2,000 Rs deduction = 200,000 paisa
    expect(row.absentDays).toBe(2);
    expect(row.absenceDeduction).toBe(200000);
    expect(row.netPay).toBe(2800000);
  });

  it('deducts 0.5 * daily rate for half-days', () => {
    const emp = makeEmployee();
    const attendance: AttendanceRecord[] = [];
    let halfDayCount = 0;
    for (let d = 1; d <= 30; d++) {
      if ([7, 14, 21, 28].includes(d)) continue;
      const iso = `2026-11-${d.toString().padStart(2, '0')}`;
      if (halfDayCount < 3) {
        attendance.push({ employeeId: emp.id, date: iso, status: 'half_day', updatedAt: iso });
        halfDayCount++;
      } else {
        attendance.push({ employeeId: emp.id, date: iso, status: 'present', updatedAt: iso });
      }
    }

    const row = computePayrollRow({
      employee: emp,
      month: '2026-11',
      attendance,
      advances: [],
      settings: defaultSettings,
    });

    // 3 half days * (1,000 * 0.5) = 1,500 Rs = 150,000 paisa
    expect(row.halfDays).toBe(3);
    expect(row.halfDayDeduction).toBe(150000);
    expect(row.netPay).toBe(2850000);
  });

  it('does NOT deduct paid leave or holidays', () => {
    const emp = makeEmployee();
    const attendance: AttendanceRecord[] = [
      { employeeId: emp.id, date: '2026-11-02', status: 'paid_leave', updatedAt: '2026-11-02' },
      { employeeId: emp.id, date: '2026-11-03', status: 'holiday', updatedAt: '2026-11-03' },
    ];
    // mark all other working days present
    for (let d = 1; d <= 30; d++) {
      if ([7, 14, 21, 28].includes(d)) continue;
      if (d === 2 || d === 3) continue;
      attendance.push({
        employeeId: emp.id,
        date: `2026-11-${d.toString().padStart(2, '0')}`,
        status: 'present',
        updatedAt: '2026-11-01',
      });
    }

    const row = computePayrollRow({
      employee: emp,
      month: '2026-11',
      attendance,
      advances: [],
      settings: defaultSettings,
    });

    expect(row.paidLeaveDays).toBe(1);
    expect(row.holidayDays).toBe(1);
    expect(row.absenceDeduction).toBe(0);
    expect(row.netPay).toBe(3000000);
  });
});

describe('Payroll math - edge cases', () => {
  it('handles mid-month joiner by deducting days before joining date', () => {
    // Joins on 2026-11-16 (15 days before joining)
    const emp = makeEmployee({ joiningDate: '2026-11-16' });

    // Mark all working days on or after joining date as present
    const attendance: AttendanceRecord[] = [];
    for (let d = 16; d <= 30; d++) {
      if ([21, 28].includes(d)) continue;
      attendance.push({
        employeeId: emp.id,
        date: `2026-11-${d.toString().padStart(2, '0')}`,
        status: 'present',
        updatedAt: '2026-11-16',
      });
    }

    const row = computePayrollRow({
      employee: emp,
      month: '2026-11',
      attendance,
      advances: [],
      settings: defaultSettings,
    });

    // 15 days before joining * 1,000 Rs = 15,000 Rs deduction = 1,500,000 paisa
    expect(row.daysBeforeJoining).toBe(15);
    expect(row.midMonthDeduction).toBe(1500000);
    expect(row.absenceDeduction).toBe(0);
    expect(row.netPay).toBe(1500000);
  });

  it('clamps net pay to 0 on zero attendance and never yields negative net pay', () => {
    const emp = makeEmployee();
    // No attendance records at all. All 26 working days are unmarked -> deducted as absent.
    const row = computePayrollRow({
      employee: emp,
      month: '2026-11',
      attendance: [],
      advances: [],
      settings: defaultSettings,
    });

    // 26 days * 1,000 Rs = 26,000 Rs deduction. Net = 30,000 - 26,000 = 4,000 Rs.
    // If we also add other deductions of 50,000 Rs, net must be 0, not negative.
    expect(row.netPay).toBeGreaterThanOrEqual(0);

    const heavyDeductionRow = computePayrollRow({
      employee: emp,
      month: '2026-11',
      attendance: [],
      advances: [],
      adjustment: {
        employeeId: emp.id,
        month: '2026-11',
        bonus: 0,
        otherDeductions: rupeesToPaisa(50000),
      },
      settings: defaultSettings,
    });

    expect(heavyDeductionRow.netPay).toBe(0);
  });

  it('caps advance recovery to available net and carries forward the excess', () => {
    const emp = makeEmployee();
    // Base salary 30,000 Rs. Advance is 50,000 Rs in 1 installment.
    const bigAdvance: Advance = {
      id: 'adv-1',
      employeeId: emp.id,
      date: '2026-11-01',
      amount: rupeesToPaisa(50000), // 5,000,000 paisa
      note: 'Emergency personal advance',
      status: 'approved',
      installments: 1,
      recoveryStartMonth: '2026-11',
      recovered: 0,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    };

    // Mark all working days present so gross is full 30,000 Rs
    const attendance: AttendanceRecord[] = [];
    for (let d = 1; d <= 30; d++) {
      if ([7, 14, 21, 28].includes(d)) continue;
      attendance.push({
        employeeId: emp.id,
        date: `2026-11-${d.toString().padStart(2, '0')}`,
        status: 'present',
        updatedAt: '2026-11-01',
      });
    }

    const row = computePayrollRow({
      employee: emp,
      month: '2026-11',
      attendance,
      advances: [bigAdvance],
      settings: defaultSettings,
    });

    // Advance recovery is capped at 30,000 Rs. Remainder (20,000 Rs) carries forward.
    expect(row.advanceRecovery).toBe(rupeesToPaisa(30000));
    expect(row.advanceCarryForward).toBe(rupeesToPaisa(20000));
    expect(row.netPay).toBe(0);
  });

  it('splits advance recovery across installments', () => {
    const advance: Advance = {
      id: 'adv-2',
      employeeId: 'emp-1',
      date: '2026-10-15',
      amount: rupeesToPaisa(30000), // 30,000 Rs in 3 installments = 10,000 Rs/mo
      note: 'Festival expense',
      status: 'approved',
      installments: 3,
      recoveryStartMonth: '2026-10',
      recovered: rupeesToPaisa(10000), // first month was already recovered
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    };

    const scheduled = calculateAdvanceScheduledRecovery(advance, '2026-11');
    expect(scheduled).toBe(rupeesToPaisa(10000));

    // If remaining is only 5,000 Rs, only 5,000 Rs should be scheduled
    advance.recovered = rupeesToPaisa(25000);
    const lastScheduled = calculateAdvanceScheduledRecovery(advance, '2026-12');
    expect(lastScheduled).toBe(rupeesToPaisa(5000));
  });

  it('supports custom divisor and month_days divisor modes', () => {
    const febSettings: Settings = {
      ...defaultSettings,
      divisor: { mode: 'month_days', custom: 30 },
    };
    // Feb 2026 has 28 days
    expect(getPayrollDivisor('2026-02', febSettings)).toBe(28);

    const customSettings: Settings = {
      ...defaultSettings,
      divisor: { mode: 'custom', custom: 26 },
    };
    expect(getPayrollDivisor('2026-11', customSettings)).toBe(26);
  });
});

describe('Nepali / Indian money formatting', () => {
  it('groups numbers in the Indian format: 1,00,000', () => {
    expect(formatIndianNumber(0)).toBe('0');
    expect(formatIndianNumber(500)).toBe('500');
    expect(formatIndianNumber(1000)).toBe('1,000');
    expect(formatIndianNumber(10000)).toBe('10,000');
    expect(formatIndianNumber(100000)).toBe('1,00,000');
    expect(formatIndianNumber(1234567)).toBe('12,34,567');
    expect(formatIndianNumber(10000000)).toBe('1,00,00,000');
  });

  it('formats paisa to formatted currency string', () => {
    expect(formatPaisa(rupeesToPaisa(100000))).toBe('Rs. 1,00,000');
    expect(formatPaisa(rupeesToPaisa(5000.5), { decimals: true })).toBe('Rs. 5,000.50');
  });
});
