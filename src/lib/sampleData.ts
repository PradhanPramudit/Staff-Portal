// Sample dataset generator for Staff Portal (Nepal)
// 8 realistic Nepali staff members across various departments
// 3 months of historical attendance, salary advances, and payroll data

import { rupeesToPaisa } from './money';
import { getMonthInterval, prevMonthKey, isWeeklyOffDay } from './dates';
import type {
  Employee,
  AttendanceRecord,
  Advance,
  PayrollAdjustment,
  PayrollMonth,
  Settings,
  ActivityEntry,
  BackupData,
} from '../types';
import { computePayrollMonth } from './payroll';

export function generateSampleData(): BackupData {
  const now = new Date().toISOString();

  // 8 realistic Nepali staff
  const employees: Employee[] = [
    {
      id: 'emp_aarav_sharma',
      fullName: 'Aarav Sharma',
      phone: '9841234567',
      department: 'Administration',
      role: 'General Manager',
      baseSalary: rupeesToPaisa(65000),
      joiningDate: '2025-04-01',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'emp_sita_adhikari',
      fullName: 'Sita Adhikari',
      phone: '9851098765',
      department: 'Accounts & Finance',
      role: 'Senior Accountant',
      baseSalary: rupeesToPaisa(48000),
      joiningDate: '2025-06-15',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'emp_bikash_thapa',
      fullName: 'Bikash Thapa',
      phone: '9801238910',
      department: 'Sales & Marketing',
      role: 'Field Sales Lead',
      baseSalary: rupeesToPaisa(38000),
      joiningDate: '2025-08-01',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'emp_puja_shrestha',
      fullName: 'Puja Shrestha',
      phone: '9849876543',
      department: 'Customer Support',
      role: 'Support Executive',
      baseSalary: rupeesToPaisa(28000),
      joiningDate: '2025-11-01',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'emp_kiran_gurung',
      fullName: 'Kiran Gurung',
      phone: '9812345678',
      department: 'Operations',
      role: 'Warehouse Supervisor',
      baseSalary: rupeesToPaisa(34000),
      joiningDate: '2026-01-10',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'emp_manisha_tamang',
      fullName: 'Manisha Tamang',
      phone: '9860123456',
      department: 'Operations',
      role: 'Inventory Assistant',
      baseSalary: rupeesToPaisa(24000),
      joiningDate: '2026-03-01',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'emp_rohan_maharjan',
      fullName: 'Rohan Maharjan',
      phone: '9843322110',
      department: 'Logistics',
      role: 'Delivery Lead',
      baseSalary: rupeesToPaisa(26000),
      joiningDate: '2026-05-15',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'emp_anita_bhandari',
      fullName: 'Anita Bhandari',
      phone: '9818899001',
      department: 'Administration',
      role: 'Office Assistant',
      baseSalary: rupeesToPaisa(22000),
      joiningDate: '2026-09-01',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const settings: Settings = {
    businessName: 'Himalayan Mountain Crafts',
    currencySymbol: 'Rs.',
    numberFormat: 'indian',
    divisor: {
      mode: '30',
      custom: 30,
    },
    weeklyOff: 6, // Saturday
    theme: 'system',
  };

  // Generate 3 months of attendance: 2 past months + current month
  // E.g., if today is 2026-11, months are 2026-09, 2026-10, 2026-11
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const monthM1 = prevMonthKey(currentMonth);
  const monthM2 = prevMonthKey(monthM1);
  const months = [monthM2, monthM1, currentMonth];

  const attendance: AttendanceRecord[] = [];

  for (const m of months) {
    const { days } = getMonthInterval(m);
    for (const d of days) {
      // Don't mark attendance for future days
      const isFuture = d > now.slice(0, 10);
      if (isFuture) continue;

      const isSaturday = isWeeklyOffDay(d, 6);
      if (isSaturday) continue; // Saturdays are off, don't need explicit records

      // Pseudo-random deterministic distribution based on day and employee index
      const dayNum = parseInt(d.slice(8), 10);

      employees.forEach((emp, empIdx) => {
        // Skip days before joining
        if (emp.joiningDate && d < emp.joiningDate) return;

        // Realistic distribution: 90% present, 4% absent, 3% half day, 3% paid leave
        const seed = (dayNum * 13 + empIdx * 7) % 100;
        let status: AttendanceRecord['status'] = 'present';
        let note: string | undefined = undefined;

        if (seed === 0) {
          status = 'absent';
          note = 'Personal emergency';
        } else if (seed === 1 || seed === 2) {
          status = 'half_day';
          note = 'Left at 2 PM';
        } else if (seed === 3) {
          status = 'paid_leave';
          note = 'Annual leave approved';
        } else if (dayNum === 15 && m === monthM1) {
          status = 'holiday';
          note = 'Dashain Holiday';
        }

        attendance.push({
          employeeId: emp.id,
          date: d,
          status,
          note,
          updatedAt: now,
        });
      });
    }
  }

  // Realistic advances
  const advances: Advance[] = [
    {
      id: 'adv_sample_1',
      employeeId: 'emp_rohan_maharjan',
      date: `${monthM2}-05`,
      amount: rupeesToPaisa(15000),
      note: 'Bike maintenance & insurance',
      status: 'approved',
      installments: 3, // 5,000 Rs / mo
      recoveryStartMonth: monthM2,
      recovered: rupeesToPaisa(10000), // recovered 2 months already
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'adv_sample_2',
      employeeId: 'emp_kiran_gurung',
      date: `${monthM1}-12`,
      amount: rupeesToPaisa(20000),
      note: 'Family festival advance',
      status: 'approved',
      installments: 2, // 10,000 Rs / mo
      recoveryStartMonth: monthM1,
      recovered: rupeesToPaisa(10000), // 1 month recovered
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'adv_sample_3',
      employeeId: 'emp_manisha_tamang',
      date: `${currentMonth}-02`,
      amount: rupeesToPaisa(8000),
      note: 'Medical checkup advance',
      status: 'pending',
      installments: 1,
      recoveryStartMonth: currentMonth,
      recovered: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'adv_sample_4',
      employeeId: 'emp_bikash_thapa',
      date: `${monthM2}-10`,
      amount: rupeesToPaisa(10000),
      note: 'Travel equipment',
      status: 'deducted',
      installments: 1,
      recoveryStartMonth: monthM2,
      recovered: rupeesToPaisa(10000),
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Adjustments (Festival bonus in monthM1)
  const adjustments: PayrollAdjustment[] = [
    {
      employeeId: 'emp_bikash_thapa',
      month: monthM1,
      bonus: rupeesToPaisa(5000),
      otherDeductions: 0,
      note: 'Quarterly sales target bonus',
    },
    {
      employeeId: 'emp_puja_shrestha',
      month: monthM1,
      bonus: rupeesToPaisa(2500),
      otherDeductions: 0,
      note: 'Customer satisfaction reward',
    },
  ];

  // Past month M2 finalized payroll snapshot
  const m2Rows = computePayrollMonth({
    employees,
    month: monthM2,
    attendance,
    advances,
    adjustments: [],
    settings,
  });

  // Past month M1 finalized payroll snapshot
  const m1Rows = computePayrollMonth({
    employees,
    month: monthM1,
    attendance,
    advances,
    adjustments,
    settings,
  });

  const payrollMonths: PayrollMonth[] = [
    {
      month: monthM2,
      finalized: true,
      finalizedAt: `${monthM1}-01T10:00:00Z`,
      finalizedBy: 'Aarav Sharma',
      rows: m2Rows,
    },
    {
      month: monthM1,
      finalized: true,
      finalizedAt: `${currentMonth}-01T10:30:00Z`,
      finalizedBy: 'Aarav Sharma',
      rows: m1Rows,
    },
  ];

  const activities: ActivityEntry[] = [
    {
      id: 'act_1',
      at: now,
      type: 'sample_data_loaded',
      message: 'Initialized Nepali business sample data with 8 staff members',
    },
    {
      id: 'act_2',
      at: `${currentMonth}-01T10:30:00Z`,
      type: 'payroll_finalized',
      message: `Finalized payroll for ${monthM1}`,
    },
    {
      id: 'act_3',
      at: `${currentMonth}-02T09:15:00Z`,
      type: 'advance_created',
      message: 'Recorded salary advance of Rs. 8,000 for Manisha Tamang',
    },
    {
      id: 'act_4',
      at: `${monthM1}-01T10:00:00Z`,
      type: 'payroll_finalized',
      message: `Finalized payroll for ${monthM2}`,
    },
  ];

  return {
    version: 1,
    exportedAt: now,
    settings,
    employees,
    attendance,
    advances,
    adjustments,
    payrollMonths,
    activities,
  };
}
