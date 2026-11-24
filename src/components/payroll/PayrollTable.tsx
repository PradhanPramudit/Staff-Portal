import React from 'react';
import { Eye, AlertTriangle } from 'lucide-react';
import { formatPaisa, paisaToRupees, rupeesToPaisa } from '../../lib/money';
import { navigate } from '../../lib/router';
import type { PayrollRow, Settings, MonthKey } from '../../types';

export interface PayrollTableProps {
  month: MonthKey;
  rows: PayrollRow[];
  settings: Settings;
  isFinalized: boolean;
  onUpdateAdjustment: (
    employeeId: string,
    bonus: number,
    otherDeductions: number
  ) => void;
}

export const PayrollTable: React.FC<PayrollTableProps> = ({
  month,
  rows,
  settings,
  isFinalized,
  onUpdateAdjustment,
}) => {
  // Totals for footer
  const totals = rows.reduce(
    (acc, r) => ({
      baseSalary: acc.baseSalary + r.baseSalary,
      absenceDeductions: acc.absenceDeductions + r.absenceDeduction + r.midMonthDeduction,
      halfDayDeductions: acc.halfDayDeductions + r.halfDayDeduction,
      advanceRecoveries: acc.advanceRecoveries + r.advanceRecovery,
      bonuses: acc.bonuses + r.bonus,
      otherDeductions: acc.otherDeductions + r.otherDeductions,
      netPay: acc.netPay + r.netPay,
    }),
    {
      baseSalary: 0,
      absenceDeductions: 0,
      halfDayDeductions: 0,
      advanceRecoveries: 0,
      bonuses: 0,
      otherDeductions: 0,
      netPay: 0,
    }
  );

  return (
    <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-zinc-50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium select-none">
            <tr>
              <th className="px-3.5 py-2.5">Staff Member</th>
              <th className="px-3 py-2.5 text-right">Base Salary</th>
              <th className="px-3 py-2.5 text-center" title="Present + Paid Leave + Holiday + Weekly Off + 0.5*Half">
                Payable Days
              </th>
              <th className="px-3 py-2.5 text-right">Absence Ded.</th>
              <th className="px-3 py-2.5 text-right">Half-Day Ded.</th>
              <th className="px-3 py-2.5 text-right">Advance Rec.</th>
              <th className="px-3 py-2.5 text-right min-w-[100px]">Bonus (+)</th>
              <th className="px-3 py-2.5 text-right min-w-[100px]">Other Ded. (−)</th>
              <th className="px-3.5 py-2.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                NET PAY
              </th>
              <th className="px-3 py-2.5 text-center w-16">Payslip</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono">
            {rows.map((r) => {
              const absenceTotal = r.absenceDeduction + r.midMonthDeduction;

              return (
                <tr
                  key={r.employeeId}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  {/* Staff Info */}
                  <td className="px-3.5 py-2.5 font-sans">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span>{r.employeeName}</span>
                      {r.unmarkedDays > 0 && (
                        <span
                          className="inline-flex items-center text-amber-600"
                          title={`${r.unmarkedDays} working day(s) have no attendance record and were counted absent`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {r.department} • {r.role}
                    </div>
                  </td>

                  {/* Base Salary */}
                  <td className="px-3 py-2.5 text-right text-zinc-800 dark:text-zinc-200 tabular-nums">
                    {formatPaisa(r.baseSalary, {
                      currencySymbol: settings.currencySymbol,
                      numberFormat: settings.numberFormat,
                    })}
                  </td>

                  {/* Payable Days */}
                  <td className="px-3 py-2.5 text-center text-zinc-600 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {r.payableDays}
                    </span>
                    <span className="text-[11px] text-zinc-400">/{r.totalDaysInMonth}</span>
                  </td>

                  {/* Absence Deduction */}
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {absenceTotal > 0 ? (
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        −{formatPaisa(absenceTotal, { currencySymbol: '', numberFormat: settings.numberFormat })}
                      </span>
                    ) : (
                      <span className="text-zinc-400">0</span>
                    )}
                  </td>

                  {/* Half-Day Deduction */}
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {r.halfDayDeduction > 0 ? (
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        −{formatPaisa(r.halfDayDeduction, { currencySymbol: '', numberFormat: settings.numberFormat })}
                      </span>
                    ) : (
                      <span className="text-zinc-400">0</span>
                    )}
                  </td>

                  {/* Advance Recovery */}
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {r.advanceRecovery > 0 ? (
                      <div>
                        <span className="text-amber-700 dark:text-amber-400 font-medium">
                          −{formatPaisa(r.advanceRecovery, { currencySymbol: '', numberFormat: settings.numberFormat })}
                        </span>
                        {r.advanceCarryForward > 0 && (
                          <div
                            className="text-[10px] text-amber-600 dark:text-amber-500 font-sans"
                            title={`Cap reached: Rs. ${paisaToRupees(r.advanceCarryForward)} carried forward to next month`}
                          >
                            +{paisaToRupees(r.advanceCarryForward)} c/f
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-400">0</span>
                    )}
                  </td>

                  {/* Bonus (Inline input when editable) */}
                  <td className="px-3 py-2.5 text-right">
                    {isFinalized ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium tabular-nums">
                        {r.bonus > 0 ? `+${paisaToRupees(r.bonus)}` : '0'}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={r.bonus ? paisaToRupees(r.bonus) : ''}
                        placeholder="0"
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          onUpdateAdjustment(r.employeeId, rupeesToPaisa(val), r.otherDeductions);
                        }}
                        className="w-20 text-right px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent-600"
                      />
                    )}
                  </td>

                  {/* Other Deductions (Inline input when editable) */}
                  <td className="px-3 py-2.5 text-right">
                    {isFinalized ? (
                      <span className="text-red-600 dark:text-red-400 font-medium tabular-nums">
                        {r.otherDeductions > 0 ? `−${paisaToRupees(r.otherDeductions)}` : '0'}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={r.otherDeductions ? paisaToRupees(r.otherDeductions) : ''}
                        placeholder="0"
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          onUpdateAdjustment(r.employeeId, r.bonus, rupeesToPaisa(val));
                        }}
                        className="w-20 text-right px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent-600"
                      />
                    )}
                  </td>

                  {/* NET PAY */}
                  <td className="px-3.5 py-2.5 text-right tabular-nums font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {formatPaisa(r.netPay, {
                      currencySymbol: settings.currencySymbol,
                      numberFormat: settings.numberFormat,
                    })}
                  </td>

                  {/* Payslip View Action */}
                  <td className="px-3 py-2.5 text-center font-sans">
                    <button
                      onClick={() => navigate(`/payroll/${month}/${r.employeeId}`)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      title="View / Print Payslip"
                      aria-label="View payslip"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Footer Totals Row */}
          <tfoot className="bg-zinc-100 dark:bg-zinc-950 font-mono font-bold text-xs border-t-2 border-zinc-300 dark:border-zinc-700">
            <tr>
              <td className="px-3.5 py-3 font-sans text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Total ({rows.length} staff)
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatPaisa(totals.baseSalary, { currencySymbol: settings.currencySymbol, numberFormat: settings.numberFormat })}
              </td>
              <td className="px-3 py-3 text-center text-zinc-400">—</td>
              <td className="px-3 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                −{formatPaisa(totals.absenceDeductions, { currencySymbol: '', numberFormat: settings.numberFormat })}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                −{formatPaisa(totals.halfDayDeductions, { currencySymbol: '', numberFormat: settings.numberFormat })}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-amber-700 dark:text-amber-400">
                −{formatPaisa(totals.advanceRecoveries, { currencySymbol: '', numberFormat: settings.numberFormat })}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                +{formatPaisa(totals.bonuses, { currencySymbol: '', numberFormat: settings.numberFormat })}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                −{formatPaisa(totals.otherDeductions, { currencySymbol: '', numberFormat: settings.numberFormat })}
              </td>
              <td className="px-3.5 py-3 text-right tabular-nums text-sm font-extrabold text-zinc-950 dark:text-white">
                {formatPaisa(totals.netPay, { currencySymbol: settings.currencySymbol, numberFormat: settings.numberFormat })}
              </td>
              <td className="px-3 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
