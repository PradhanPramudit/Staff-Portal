import React, { useState, useMemo } from 'react';
import {
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { advanceStatusBadge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { formatPaisa } from '../../lib/money';
import { formatDisplayDate } from '../../lib/dates';
import type { Advance, Employee, Settings } from '../../types';

export interface AdvanceTableProps {
  advances: Advance[];
  employees: Employee[];
  settings: Settings;
  onEdit: (advance: Advance) => void;
  onDelete: (advance: Advance) => void;
  onStatusChange: (advance: Advance, newStatus: Advance['status']) => void;
}

export const AdvanceTable: React.FC<AdvanceTableProps> = ({
  advances,
  employees,
  settings,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const empMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const e of employees) {
      map.set(e.id, e);
    }
    return map;
  }, [employees]);

  const filteredAdvances = useMemo(() => {
    return advances.filter((adv) => {
      if (statusFilter !== 'all' && adv.status !== statusFilter) return false;
      if (employeeFilter !== 'all' && adv.employeeId !== employeeFilter) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const emp = empMap.get(adv.employeeId);
        const nameMatch = emp?.fullName.toLowerCase().includes(query);
        const noteMatch = adv.note ? adv.note.toLowerCase().includes(query) : false;
        if (!nameMatch && !noteMatch) return false;
      }
      return true;
    });
  }, [advances, statusFilter, employeeFilter, search, empMap]);

  return (
    <div className="space-y-3">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by staff name or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Employee Filter */}
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-600"
          >
            <option value="all">All Staff Members</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-600"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="deducted">Deducted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {filteredAdvances.length === 0 ? (
        <EmptyState
          title="No salary advances found"
          description={
            search || statusFilter !== 'all' || employeeFilter !== 'all'
              ? 'Try adjusting your filters or search terms.'
              : 'Record a salary advance to get started.'
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-zinc-50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                  <tr>
                    <th className="px-4 py-2.5">Staff Member</th>
                    <th className="px-4 py-2.5">Date Given</th>
                    <th className="px-4 py-2.5 text-right">Advance Amount</th>
                    <th className="px-4 py-2.5 text-right">Recovered</th>
                    <th className="px-4 py-2.5 text-right">Remaining Due</th>
                    <th className="px-4 py-2.5 text-center">Plan</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5">Remarks</th>
                    <th className="px-4 py-2.5 text-right w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredAdvances.map((adv) => {
                    const emp = empMap.get(adv.employeeId);
                    const remaining = Math.max(0, adv.amount - (adv.recovered || 0));

                    return (
                      <tr
                        key={adv.id}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                          <div>{emp?.fullName || 'Unknown'}</div>
                          <div className="text-[11px] text-zinc-400 font-normal">
                            {emp?.department}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 font-mono">
                          {formatDisplayDate(adv.date)}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {formatPaisa(adv.amount, {
                            currencySymbol: settings.currencySymbol,
                            numberFormat: settings.numberFormat,
                          })}
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-zinc-500 tabular-nums">
                          {formatPaisa(adv.recovered || 0, {
                            currencySymbol: settings.currencySymbol,
                            numberFormat: settings.numberFormat,
                          })}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                          <span
                            className={
                              remaining > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-zinc-400'
                            }
                          >
                            {formatPaisa(remaining, {
                              currencySymbol: settings.currencySymbol,
                              numberFormat: settings.numberFormat,
                            })}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400 text-[11px]">
                          {adv.installments > 1 ? (
                            <span title={`Starts: ${adv.recoveryStartMonth}`}>
                              {adv.installments} mos
                            </span>
                          ) : (
                            <span>1 mo</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {advanceStatusBadge(adv.status)}
                        </td>

                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 max-w-xs truncate" title={adv.note}>
                          {adv.note || '—'}
                        </td>

                        {/* Action menu */}
                        <td className="px-4 py-3 text-right">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() =>
                                setOpenActionId(openActionId === adv.id ? null : adv.id)
                              }
                              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              aria-label="Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openActionId === adv.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-20"
                                  onClick={() => setOpenActionId(null)}
                                />
                                <div className="absolute right-0 mt-1 w-36 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-pop py-1 z-30 text-xs text-left">
                                  {adv.status === 'pending' && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setOpenActionId(null);
                                          onStatusChange(adv, 'approved');
                                        }}
                                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        <span>Approve</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setOpenActionId(null);
                                          onStatusChange(adv, 'rejected');
                                        }}
                                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-700 dark:text-red-300"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>Reject</span>
                                      </button>
                                      <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />
                                    </>
                                  )}

                                  <button
                                    onClick={() => {
                                      setOpenActionId(null);
                                      onEdit(adv);
                                    }}
                                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setOpenActionId(null);
                                      onDelete(adv);
                                    }}
                                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            {filteredAdvances.map((adv) => {
              const emp = empMap.get(adv.employeeId);
              const remaining = Math.max(0, adv.amount - (adv.recovered || 0));

              return (
                <div
                  key={adv.id}
                  className="p-3.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {emp?.fullName || 'Staff'}
                      </h4>
                      <p className="text-[11px] text-zinc-500">
                        {formatDisplayDate(adv.date)} • {adv.note || 'No note'}
                      </p>
                    </div>
                    {advanceStatusBadge(adv.status)}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800 font-mono">
                    <span className="text-zinc-500">
                      Total: {formatPaisa(adv.amount, { currencySymbol: settings.currencySymbol, numberFormat: settings.numberFormat })}
                    </span>
                    <span className="font-semibold text-amber-600">
                      Due: {formatPaisa(remaining, { currencySymbol: settings.currencySymbol, numberFormat: settings.numberFormat })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
