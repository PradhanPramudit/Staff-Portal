import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, CheckCheck, Keyboard, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Employee, AttendanceRecord, AttendanceStatus, ISODate } from '../../types';

export interface MarkingSheetProps {
  date: ISODate;
  employees: Employee[];
  attendance: AttendanceRecord[];
  isWeeklyOff: boolean;
  onSaveBatch: (records: Array<Omit<AttendanceRecord, 'updatedAt'>>) => Promise<void>;
}

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { key: string; label: string; activeClass: string; badgeClass: string }
> = {
  present: {
    key: 'P',
    label: 'Present',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
    badgeClass: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  },
  absent: {
    key: 'A',
    label: 'Absent',
    activeClass: 'bg-red-600 text-white border-red-600 shadow-xs',
    badgeClass: 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800',
  },
  half_day: {
    key: 'H',
    label: 'Half-day',
    activeClass: 'bg-amber-600 text-white border-amber-600 shadow-xs',
    badgeClass: 'bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  },
  paid_leave: {
    key: 'L',
    label: 'Paid leave',
    activeClass: 'bg-sky-600 text-white border-sky-600 shadow-xs',
    badgeClass: 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 dark:border-sky-800',
  },
  holiday: {
    key: 'O',
    label: 'Holiday',
    activeClass: 'bg-teal-600 text-white border-teal-600 shadow-xs',
    badgeClass: 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800',
  },
};

export const MarkingSheet: React.FC<MarkingSheetProps> = ({
  date,
  employees,
  attendance,
  isWeeklyOff,
  onSaveBatch,
}) => {
  // Local state map: employeeId -> { status, note }
  const [localMap, setLocalMap] = useState<
    Map<string, { status?: AttendanceStatus; note?: string }>
  >(new Map());
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(0);
  const [editingNoteFor, setEditingNoteFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);

  // Initialize or re-sync local state when attendance / employees / date change
  useEffect(() => {
    const map = new Map<string, { status?: AttendanceStatus; note?: string }>();
    for (const r of attendance) {
      if (r.date === date) {
        map.set(r.employeeId, { status: r.status, note: r.note });
      }
    }
    setLocalMap(map);
    setHasChanges(false);
    setFocusedRowIndex(0);
  }, [date, attendance]);

  // Set status for an employee
  const handleSetStatus = useCallback(
    (employeeId: string, status: AttendanceStatus) => {
      setLocalMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(employeeId) || {};
        next.set(employeeId, { ...existing, status });
        return next;
      });
      setHasChanges(true);
    },
    []
  );

  // Set note
  const handleSetNote = (employeeId: string, note: string) => {
    setLocalMap((prev) => {
      const next = new Map(prev);
      const existing = next.get(employeeId) || {};
      next.set(employeeId, { ...existing, note });
      return next;
    });
    setHasChanges(true);
  };

  // "Mark all present" button
  const handleMarkAllPresent = () => {
    setLocalMap((prev) => {
      const next = new Map(prev);
      for (const emp of employees) {
        const existing = next.get(emp.id) || {};
        // If not already set, or override
        next.set(emp.id, { ...existing, status: 'present' });
      }
      return next;
    });
    setHasChanges(true);
  };

  // Keyboard navigation listener (P, A, H, L, ArrowUp, ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (employees.length === 0) return;

      const currentEmp = employees[focusedRowIndex];

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedRowIndex((prev) => Math.min(prev + 1, employees.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedRowIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key.toLowerCase() === 'p' && currentEmp) {
        e.preventDefault();
        handleSetStatus(currentEmp.id, 'present');
        // Auto-advance to next employee row for super fast marking
        setFocusedRowIndex((prev) => Math.min(prev + 1, employees.length - 1));
      } else if (e.key.toLowerCase() === 'a' && currentEmp) {
        e.preventDefault();
        handleSetStatus(currentEmp.id, 'absent');
        setFocusedRowIndex((prev) => Math.min(prev + 1, employees.length - 1));
      } else if (e.key.toLowerCase() === 'h' && currentEmp) {
        e.preventDefault();
        handleSetStatus(currentEmp.id, 'half_day');
        setFocusedRowIndex((prev) => Math.min(prev + 1, employees.length - 1));
      } else if (e.key.toLowerCase() === 'l' && currentEmp) {
        e.preventDefault();
        handleSetStatus(currentEmp.id, 'paid_leave');
        setFocusedRowIndex((prev) => Math.min(prev + 1, employees.length - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [employees, focusedRowIndex, handleSetStatus]);

  // Scroll focused row into view
  useEffect(() => {
    const el = rowRefs.current[focusedRowIndex];
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedRowIndex]);

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    try {
      const recordsToSave: Array<Omit<AttendanceRecord, 'updatedAt'>> = [];
      for (const emp of employees) {
        const item = localMap.get(emp.id);
        if (item?.status) {
          recordsToSave.push({
            employeeId: emp.id,
            date,
            status: item.status,
            note: item.note,
          });
        }
      }
      await onSaveBatch(recordsToSave);
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  // Stats calculation for the sheet
  const markedCount = Array.from(localMap.values()).filter((v) => v.status).length;
  const presentCount = Array.from(localMap.values()).filter((v) => v.status === 'present').length;
  const absentCount = Array.from(localMap.values()).filter((v) => v.status === 'absent').length;
  const halfDayCount = Array.from(localMap.values()).filter((v) => v.status === 'half_day').length;
  const leaveCount = Array.from(localMap.values()).filter((v) => v.status === 'paid_leave').length;

  return (
    <div className="space-y-4">
      {/* Top action & shortcut hints bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Button
            variant="secondary"
            size="sm"
            icon={<CheckCheck className="w-3.5 h-3.5 text-accent-600" />}
            onClick={handleMarkAllPresent}
          >
            Mark All Present
          </Button>

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-[11px] text-zinc-500 font-mono">
            <Keyboard className="w-3.5 h-3.5 text-zinc-400" />
            <span>Shortcuts:</span>
            <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold">P</kbd> Present
            <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold">A</kbd> Absent
            <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold">H</kbd> Half
            <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold">L</kbd> Leave
            <span className="text-zinc-400">|</span>
            <span>↑/↓ Move</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-500 font-mono">
            <span>{markedCount}/{employees.length} marked</span>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Check className="w-3.5 h-3.5" />}
            loading={saving}
            disabled={!hasChanges && markedCount === 0}
            onClick={handleSave}
          >
            {hasChanges ? 'Save Attendance' : 'Saved'}
          </Button>
        </div>
      </div>

      {isWeeklyOff && (
        <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            This day is the regular weekly off (Saturday). Attendance is optional and staff are paid base rate without deduction.
          </span>
        </div>
      )}

      {/* Quick stats pills */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono font-medium">
          Present: {presentCount}
        </span>
        <span className="px-2.5 py-1 rounded bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 font-mono font-medium">
          Absent: {absentCount}
        </span>
        <span className="px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono font-medium">
          Half-day: {halfDayCount}
        </span>
        <span className="px-2.5 py-1 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-mono font-medium">
          Paid leave: {leaveCount}
        </span>
      </div>

      {/* Fast Marking Table */}
      <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-zinc-50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
              <tr>
                <th className="px-4 py-2.5 w-12 text-center">#</th>
                <th className="px-4 py-2.5">Staff Member</th>
                <th className="px-4 py-2.5">Department</th>
                <th className="px-4 py-2.5">Mark Status (P / A / H / L)</th>
                <th className="px-4 py-2.5">Remarks / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {employees.map((emp, index) => {
                const item = localMap.get(emp.id);
                const currentStatus = item?.status;
                const isFocused = index === focusedRowIndex;

                return (
                  <tr
                    key={emp.id}
                    ref={(el) => {
                      rowRefs.current[index] = el;
                    }}
                    onClick={() => setFocusedRowIndex(index)}
                    className={`transition-colors cursor-pointer ${
                      isFocused
                        ? 'bg-accent-50/40 dark:bg-accent-950/20 ring-1 ring-inset ring-accent-500/40'
                        : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <td className="px-4 py-3 text-center text-zinc-400 font-mono text-[11px]">
                      {index + 1}
                    </td>

                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-[11px] flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                          {emp.fullName.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <span className="truncate block font-semibold">{emp.fullName}</span>
                          <span className="text-[11px] text-zinc-400 font-normal">{emp.role}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      {emp.department}
                    </td>

                    {/* Status Pill Buttons */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {(
                          ['present', 'absent', 'half_day', 'paid_leave', 'holiday'] as AttendanceStatus[]
                        ).map((st) => {
                          const cfg = STATUS_CONFIG[st];
                          const active = currentStatus === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => {
                                setFocusedRowIndex(index);
                                handleSetStatus(emp.id, st);
                              }}
                              className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all select-none ${
                                active
                                  ? cfg.activeClass
                                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                              }`}
                              title={`${cfg.label} (Press ${cfg.key})`}
                            >
                              <span>{cfg.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    {/* Remarks Input */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {editingNoteFor === emp.id || item?.note ? (
                        <input
                          type="text"
                          value={item?.note || ''}
                          placeholder="Add note (e.g. sick leave, late)"
                          onChange={(e) => handleSetNote(emp.id, e.target.value)}
                          onBlur={() => {
                            if (!item?.note?.trim()) setEditingNoteFor(null);
                          }}
                          className="w-full text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent-600"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingNoteFor(emp.id)}
                          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xs italic"
                        >
                          + Add note
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
