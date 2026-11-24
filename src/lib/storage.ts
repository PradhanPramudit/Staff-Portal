// Single storage module for Staff Portal (Nepal)
// All persistent data access goes through this file.
// Can later be swapped for a REST/GraphQL backend without touching UI components.

import type {
  Employee,
  AttendanceRecord,
  Advance,
  PayrollAdjustment,
  PayrollMonth,
  Settings,
  ActivityEntry,
  BackupData,
  MonthKey,
  ISODate,
} from '../types';
import { generateSampleData } from './sampleData';

const STORAGE_PREFIX = 'staffportal:v1:';

const KEYS = {
  settings: `${STORAGE_PREFIX}settings`,
  employees: `${STORAGE_PREFIX}employees`,
  attendance: `${STORAGE_PREFIX}attendance`,
  advances: `${STORAGE_PREFIX}advances`,
  adjustments: `${STORAGE_PREFIX}adjustments`,
  payrollMonths: `${STORAGE_PREFIX}payroll_months`,
  activities: `${STORAGE_PREFIX}activities`,
} as const;

export const DEFAULT_SETTINGS: Settings = {
  businessName: 'Himalayan Enterprises',
  currencySymbol: 'Rs.',
  numberFormat: 'indian',
  divisor: {
    mode: '30',
    custom: 30,
  },
  weeklyOff: 6, // Saturday (standard weekend in Nepal)
  theme: 'system',
};

// Event emitter so components can subscribe to storage updates
type ChangeListener = (key: string) => void;
const listeners = new Set<ChangeListener>();

export function subscribeToStorage(fn: ChangeListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify(key: string) {
  for (const fn of listeners) {
    try {
      fn(key);
    } catch (err) {
      console.error('Storage listener error:', err);
    }
  }
}

// Low-level safe localStorage helpers
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Failed to read ${key} from localStorage, using fallback:`, err);
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notify(key);
  } catch (err) {
    console.error(`Failed to write ${key} to localStorage:`, err);
    throw new Error('Local storage write failed (storage may be full).');
  }
}

// ============================================================================
// SETTINGS
// ============================================================================

export async function getSettings(): Promise<Settings> {
  const stored = readJSON<Settings | null>(KEYS.settings, null);
  if (!stored) {
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function updateSettings(partial: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const updated: Settings = { ...current, ...partial };
  writeJSON(KEYS.settings, updated);
  await logActivity('settings_updated', 'Updated business settings');
  return updated;
}

// ============================================================================
// EMPLOYEES
// ============================================================================

export async function listEmployees(options: { includeArchived?: boolean } = {}): Promise<Employee[]> {
  const list = readJSON<Employee[]>(KEYS.employees, []);
  if (options.includeArchived) return list;
  return list.filter((e) => !e.archivedAt);
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const list = await listEmployees({ includeArchived: true });
  return list.find((e) => e.id === id) || null;
}

export async function saveEmployee(
  data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Employee> {
  const list = await listEmployees({ includeArchived: true });
  const now = new Date().toISOString();

  if (data.id) {
    // Edit existing
    const idx = list.findIndex((e) => e.id === data.id);
    if (idx === -1) throw new Error('Employee not found');
    const updated: Employee = {
      ...list[idx],
      ...data,
      id: data.id,
      updatedAt: now,
    };
    list[idx] = updated;
    writeJSON(KEYS.employees, list);
    await logActivity('employee_updated', `Updated employee: ${updated.fullName}`);
    return updated;
  }

  // Create new
  const id = `emp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const created: Employee = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };
  list.unshift(created);
  writeJSON(KEYS.employees, list);
  await logActivity('employee_created', `Added new employee: ${created.fullName}`);
  return created;
}

export async function archiveEmployee(id: string): Promise<Employee> {
  const list = await listEmployees({ includeArchived: true });
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error('Employee not found');
  const now = new Date().toISOString();
  list[idx].archivedAt = now;
  list[idx].updatedAt = now;
  writeJSON(KEYS.employees, list);
  await logActivity('employee_archived', `Archived employee: ${list[idx].fullName}`);
  return list[idx];
}

export async function restoreEmployee(id: string): Promise<Employee> {
  const list = await listEmployees({ includeArchived: true });
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error('Employee not found');
  delete list[idx].archivedAt;
  list[idx].updatedAt = new Date().toISOString();
  writeJSON(KEYS.employees, list);
  await logActivity('employee_restored', `Restored employee: ${list[idx].fullName}`);
  return list[idx];
}

// ============================================================================
// ATTENDANCE
// ============================================================================

export async function getAttendanceForDate(date: ISODate): Promise<AttendanceRecord[]> {
  const list = readJSON<AttendanceRecord[]>(KEYS.attendance, []);
  return list.filter((r) => r.date === date);
}

export async function getAttendanceForMonth(month: MonthKey): Promise<AttendanceRecord[]> {
  const list = readJSON<AttendanceRecord[]>(KEYS.attendance, []);
  return list.filter((r) => r.date.startsWith(month));
}

export async function getAttendanceForEmployee(
  employeeId: string,
  month?: MonthKey
): Promise<AttendanceRecord[]> {
  const list = readJSON<AttendanceRecord[]>(KEYS.attendance, []);
  return list.filter((r) => {
    if (r.employeeId !== employeeId) return false;
    if (month && !r.date.startsWith(month)) return false;
    return true;
  });
}

export async function setAttendance(record: Omit<AttendanceRecord, 'updatedAt'>): Promise<AttendanceRecord> {
  const list = readJSON<AttendanceRecord[]>(KEYS.attendance, []);
  const now = new Date().toISOString();
  const existingIdx = list.findIndex(
    (r) => r.employeeId === record.employeeId && r.date === record.date
  );

  const fullRecord: AttendanceRecord = { ...record, updatedAt: now };

  if (existingIdx >= 0) {
    list[existingIdx] = fullRecord;
  } else {
    list.push(fullRecord);
  }

  writeJSON(KEYS.attendance, list);
  return fullRecord;
}

export async function setAttendanceBatch(
  records: Array<Omit<AttendanceRecord, 'updatedAt'>>
): Promise<void> {
  if (records.length === 0) return;
  const list = readJSON<AttendanceRecord[]>(KEYS.attendance, []);
  const now = new Date().toISOString();

  const keyMap = new Map<string, number>();
  list.forEach((r, idx) => {
    keyMap.set(`${r.employeeId}::${r.date}`, idx);
  });

  for (const rec of records) {
    const key = `${rec.employeeId}::${rec.date}`;
    const full: AttendanceRecord = { ...rec, updatedAt: now };
    const existingIdx = keyMap.get(key);
    if (existingIdx !== undefined) {
      list[existingIdx] = full;
    } else {
      keyMap.set(key, list.length);
      list.push(full);
    }
  }

  writeJSON(KEYS.attendance, list);
  const sampleDate = records[0].date;
  await logActivity(
    'attendance_marked',
    `Marked attendance for ${records.length} records (${sampleDate})`
  );
}

// ============================================================================
// ADVANCES
// ============================================================================

export async function listAdvances(options: { employeeId?: string } = {}): Promise<Advance[]> {
  const list = readJSON<Advance[]>(KEYS.advances, []);
  if (options.employeeId) {
    return list.filter((a) => a.employeeId === options.employeeId);
  }
  return list;
}

export async function getAdvance(id: string): Promise<Advance | null> {
  const list = await listAdvances();
  return list.find((a) => a.id === id) || null;
}

export async function saveAdvance(
  data: Omit<Advance, 'id' | 'createdAt' | 'updatedAt' | 'recovered'> & {
    id?: string;
    recovered?: number;
  }
): Promise<Advance> {
  const list = await listAdvances();
  const now = new Date().toISOString();

  if (data.id) {
    const idx = list.findIndex((a) => a.id === data.id);
    if (idx === -1) throw new Error('Advance not found');
    const updated: Advance = {
      ...list[idx],
      ...data,
      id: data.id,
      recovered: data.recovered ?? list[idx].recovered ?? 0,
      updatedAt: now,
    };
    list[idx] = updated;
    writeJSON(KEYS.advances, list);
    await logActivity('advance_created', `Updated salary advance of Rs. ${Math.round(updated.amount / 100)}`);
    return updated;
  }

  const id = `adv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const created: Advance = {
    ...data,
    id,
    recovered: 0,
    createdAt: now,
    updatedAt: now,
  };
  list.unshift(created);
  writeJSON(KEYS.advances, list);
  await logActivity('advance_created', `Recorded salary advance of Rs. ${Math.round(created.amount / 100)}`);
  return created;
}

export async function updateAdvanceStatus(
  id: string,
  status: Advance['status']
): Promise<Advance> {
  const list = await listAdvances();
  const idx = list.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error('Advance not found');
  list[idx].status = status;
  list[idx].updatedAt = new Date().toISOString();
  writeJSON(KEYS.advances, list);
  await logActivity('advance_status', `Advance marked as ${status}`);
  return list[idx];
}

export async function deleteAdvance(id: string): Promise<void> {
  const list = await listAdvances();
  const filtered = list.filter((a) => a.id !== id);
  writeJSON(KEYS.advances, filtered);
}

// ============================================================================
// PAYROLL ADJUSTMENTS (Bonus & Other Deductions)
// ============================================================================

export async function listAdjustments(month: MonthKey): Promise<PayrollAdjustment[]> {
  const list = readJSON<PayrollAdjustment[]>(KEYS.adjustments, []);
  return list.filter((a) => a.month === month);
}

export async function saveAdjustment(adjustment: PayrollAdjustment): Promise<void> {
  const list = readJSON<PayrollAdjustment[]>(KEYS.adjustments, []);
  const idx = list.findIndex(
    (a) => a.employeeId === adjustment.employeeId && a.month === adjustment.month
  );
  if (idx >= 0) {
    list[idx] = adjustment;
  } else {
    list.push(adjustment);
  }
  writeJSON(KEYS.adjustments, list);
}

// ============================================================================
// PAYROLL MONTHS (Finalize / Lock / Unlock)
// ============================================================================

export async function getPayrollMonth(month: MonthKey): Promise<PayrollMonth | null> {
  const list = readJSON<PayrollMonth[]>(KEYS.payrollMonths, []);
  return list.find((m) => m.month === month) || null;
}

export async function finalizePayrollMonth(
  month: MonthKey,
  rows: import('../types').PayrollRow[]
): Promise<PayrollMonth> {
  const list = readJSON<PayrollMonth[]>(KEYS.payrollMonths, []);
  const now = new Date().toISOString();

  // Apply advance recoveries to advances collection
  const advances = await listAdvances();
  for (const r of rows) {
    if (r.advanceRecovery > 0) {
      let remainingToApply = r.advanceRecovery;
      for (const adv of advances) {
        if (adv.employeeId === r.employeeId && adv.status === 'approved') {
          const outstanding = Math.max(0, adv.amount - (adv.recovered || 0));
          if (outstanding > 0 && remainingToApply > 0) {
            const deduction = Math.min(outstanding, remainingToApply);
            adv.recovered = (adv.recovered || 0) + deduction;
            remainingToApply -= deduction;
            if (adv.recovered >= adv.amount) {
              adv.status = 'deducted';
            }
          }
        }
      }
    }
  }
  writeJSON(KEYS.advances, advances);

  const entry: PayrollMonth = {
    month,
    finalized: true,
    finalizedAt: now,
    rows,
  };

  const idx = list.findIndex((m) => m.month === month);
  if (idx >= 0) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }
  writeJSON(KEYS.payrollMonths, list);
  await logActivity('payroll_finalized', `Finalized payroll for ${month}`);
  return entry;
}

export async function unlockPayrollMonth(month: MonthKey): Promise<void> {
  const list = readJSON<PayrollMonth[]>(KEYS.payrollMonths, []);
  const target = list.find((m) => m.month === month);
  if (!target) return;

  // Revert advance recoveries recorded during finalize
  if (target.rows) {
    const advances = await listAdvances();
    for (const r of target.rows) {
      if (r.advanceRecovery > 0) {
        let toRevert = r.advanceRecovery;
        // Revert in reverse order
        for (let i = advances.length - 1; i >= 0; i--) {
          const adv = advances[i];
          if (adv.employeeId === r.employeeId && (adv.recovered || 0) > 0 && toRevert > 0) {
            const revertAmount = Math.min(adv.recovered, toRevert);
            adv.recovered -= revertAmount;
            toRevert -= revertAmount;
            if (adv.status === 'deducted') {
              adv.status = 'approved';
            }
          }
        }
      }
    }
    writeJSON(KEYS.advances, advances);
  }

  const updated = list.filter((m) => m.month !== month);
  writeJSON(KEYS.payrollMonths, updated);
  await logActivity('payroll_unlocked', `Unlocked payroll for ${month}`);
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export async function listActivities(limit = 10): Promise<ActivityEntry[]> {
  const list = readJSON<ActivityEntry[]>(KEYS.activities, []);
  return list.slice(0, limit);
}

export async function logActivity(
  type: ActivityEntry['type'],
  message: string,
  meta?: Record<string, unknown>
): Promise<void> {
  const list = readJSON<ActivityEntry[]>(KEYS.activities, []);
  const entry: ActivityEntry = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    type,
    message,
    meta,
  };
  list.unshift(entry);
  // Keep last 100 activities
  if (list.length > 100) list.length = 100;
  writeJSON(KEYS.activities, list);
}

// ============================================================================
// BACKUP & RESTORE
// ============================================================================

export async function exportAllData(): Promise<BackupData> {
  const settings = await getSettings();
  const employees = await listEmployees({ includeArchived: true });
  const attendance = readJSON<AttendanceRecord[]>(KEYS.attendance, []);
  const advances = await listAdvances();
  const adjustments = readJSON<PayrollAdjustment[]>(KEYS.adjustments, []);
  const payrollMonths = readJSON<PayrollMonth[]>(KEYS.payrollMonths, []);
  const activities = await listActivities(100);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    employees,
    attendance,
    advances,
    adjustments,
    payrollMonths,
    activities,
  };
}

export async function importAllData(data: BackupData): Promise<void> {
  if (!data || data.version !== 1) {
    throw new Error('Invalid backup file format.');
  }

  writeJSON(KEYS.settings, data.settings || DEFAULT_SETTINGS);
  writeJSON(KEYS.employees, data.employees || []);
  writeJSON(KEYS.attendance, data.attendance || []);
  writeJSON(KEYS.advances, data.advances || []);
  writeJSON(KEYS.adjustments, data.adjustments || []);
  writeJSON(KEYS.payrollMonths, data.payrollMonths || []);
  writeJSON(KEYS.activities, data.activities || []);
  await logActivity('sample_data_loaded', 'Imported backup data');
}

export async function resetAllData(): Promise<void> {
  for (const k of Object.values(KEYS)) {
    localStorage.removeItem(k);
  }
  // Mark as intentionally cleared so it does not auto-repopulate sample data
  localStorage.setItem(`${STORAGE_PREFIX}initialized`, 'reset');
  // Restore default settings
  writeJSON(KEYS.settings, DEFAULT_SETTINGS);
  await logActivity('data_reset', 'Reset all staff and payroll data');
}

/**
 * Bootstrap storage with sample data on first launch if empty
 */
export async function ensureInitialized(): Promise<void> {
  if (typeof window === 'undefined') return;
  const flag = localStorage.getItem(`${STORAGE_PREFIX}initialized`);
  if (!flag) {
    const sample = generateSampleData();
    await importAllData(sample);
    localStorage.setItem(`${STORAGE_PREFIX}initialized`, 'true');
  }
}

