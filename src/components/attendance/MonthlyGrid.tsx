import React, { useMemo } from 'react';
import {
  getMonthInterval,
  isWeeklyOffDay,
  formatDisplayMonth,
  prevMonthKey,
  nextMonthKey,
} from '../../lib/dates';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type {
  Employee,
  AttendanceRecord,
  MonthKey,
  Settings,
  AttendanceStatus,
  ISODate,
} from '../../types';

export interface MonthlyGridProps {
  month: MonthKey;
  onMonthChange: (month: MonthKey) => void;
  employees: Employee[];
  attendance: AttendanceRecord[];
  settings: Settings;
}

export const MonthlyGrid: React.FC<MonthlyGridProps> = ({
  month,
  onMonthChange,
  employees,
  attendance,
  settings,
}) => {
  const { days } = useMemo(() => getMonthInterval(month), [month]);
  const weeklyOffDay = settings.weeklyOff ?? 6;

  // Map of `${employeeId}::${date}` -> AttendanceRecord
  const attLookup = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of attendance) {
      if (r.date.startsWith(month)) {
        map.set(`${r.employeeId}::${r.date}`, r);
      }
    }
    return map;
  }, [attendance, month]);

  // Status cell style helper
  const renderStatusCell = (status: AttendanceStatus | undefined, isOff: boolean) => {
    if (status === 'present') {
      return (
        <span
          className="inline-block w-5 h-5 rounded-xs bg-emerald-600 text-white font-bold text-[10px] leading-5 text-center shadow-xs"
          title="Present"
        >
          P
        </span>
      );
    }
    if (status === 'absent') {
      return (
        <span
          className="inline-block w-5 h-5 rounded-xs bg-red-600 text-white font-bold text-[10px] leading-5 text-center shadow-xs"
          title="Absent"
        >
          A
        </span>
      );
    }
    if (status === 'half_day') {
      return (
        <span
          className="inline-block w-5 h-5 rounded-xs bg-amber-500 text-white font-bold text-[10px] leading-5 text-center shadow-xs"
          title="Half-day"
        >
          H
        </span>
      );
    }
    if (status === 'paid_leave') {
      return (
        <span
          className="inline-block w-5 h-5 rounded-xs bg-sky-600 text-white font-bold text-[10px] leading-5 text-center shadow-xs"
          title="Paid leave"
        >
          L
        </span>
      );
    }
    if (status === 'holiday') {
      return (
        <span
          className="inline-block w-5 h-5 rounded-xs bg-teal-600 text-white font-bold text-[10px] leading-5 text-center shadow-xs"
          title="Holiday"
        >
          O
        </span>
      );
    }
    if (isOff) {
      return (
        <span
          className="inline-block w-5 h-5 rounded-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono text-[10px] leading-5 text-center"
          title="Weekly Off"
        >
          —
        </span>
      );
    }
    return (
      <span
        className="inline-block w-5 h-5 rounded-xs bg-zinc-100 dark:bg-zinc-800/40 text-zinc-300 dark:text-zinc-600 font-mono text-[10px] leading-5 text-center"
        title="Not marked"
      >
        ·
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Month Selector & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        {/* Month Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMonthChange(prevMonthKey(month))}
            className="p-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold px-2 min-w-[130px] text-center font-mono">
            {formatDisplayMonth(month)}
          </span>
          <button
            onClick={() => onMonthChange(nextMonthKey(month))}
            className="p-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-xs bg-emerald-600" />
            <span>Present (P)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-xs bg-red-600" />
            <span>Absent (A)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-xs bg-amber-500" />
            <span>Half-day (H)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-xs bg-sky-600" />
            <span>Paid Leave (L)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-xs bg-teal-600" />
            <span>Holiday (O)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-xs bg-zinc-300 dark:bg-zinc-700" />
            <span>Weekly Off</span>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-zinc-50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
              <tr>
                <th className="px-3 py-2.5 sticky left-0 z-10 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 min-w-[170px]">
                  Staff Member
                </th>
                {days.map((dateStr: ISODate) => {
                  const dayNum = parseInt(dateStr.slice(8), 10);
                  const isOff = isWeeklyOffDay(dateStr, weeklyOffDay);
                  return (
                    <th
                      key={dateStr}
                      className={`px-1 py-2 text-center font-mono w-7 shrink-0 select-none ${
                        isOff
                          ? 'bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-500'
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                      title={dateStr}
                    >
                      <div className="text-[10px]">{dayNum}</div>
                    </th>
                  );
                })}
                {/* Summary counts */}
                <th className="px-2 py-2 text-center bg-zinc-50 dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 text-emerald-700 font-mono">
                  P
                </th>
                <th className="px-2 py-2 text-center bg-zinc-50 dark:bg-zinc-950 text-red-700 font-mono">
                  A
                </th>
                <th className="px-2 py-2 text-center bg-zinc-50 dark:bg-zinc-950 text-amber-700 font-mono">
                  H
                </th>
                <th className="px-2 py-2 text-center bg-zinc-50 dark:bg-zinc-950 text-sky-700 font-mono">
                  L
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {employees.map((emp) => {
                let pCount = 0;
                let aCount = 0;
                let hCount = 0;
                let lCount = 0;

                return (
                  <tr
                    key={emp.id}
                    className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    {/* Sticky Employee Name Column */}
                    <td className="px-3 py-2 sticky left-0 z-10 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">
                      <div className="truncate font-semibold">{emp.fullName}</div>
                      <div className="text-[10px] text-zinc-400 truncate">{emp.department}</div>
                    </td>

                    {/* Day Cells */}
                    {days.map((dateStr: ISODate) => {
                      const rec = attLookup.get(`${emp.id}::${dateStr}`);
                      const isOff = isWeeklyOffDay(dateStr, weeklyOffDay);

                      if (rec?.status === 'present') pCount++;
                      else if (rec?.status === 'absent') aCount++;
                      else if (rec?.status === 'half_day') hCount++;
                      else if (rec?.status === 'paid_leave') lCount++;

                      return (
                        <td
                          key={dateStr}
                          className={`p-1 text-center align-middle ${
                            isOff ? 'bg-zinc-100/40 dark:bg-zinc-900/40' : ''
                          }`}
                        >
                          {renderStatusCell(rec?.status, isOff)}
                        </td>
                      );
                    })}

                    {/* Summary counters */}
                    <td className="px-2 py-2 text-center font-mono font-semibold text-emerald-700 dark:text-emerald-400 border-l border-zinc-200 dark:border-zinc-800 bg-emerald-50/20">
                      {pCount}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-semibold text-red-700 dark:text-red-400 bg-red-50/20">
                      {aCount}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/20">
                      {hCount}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-semibold text-sky-700 dark:text-sky-400 bg-sky-50/20">
                      {lCount}
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
