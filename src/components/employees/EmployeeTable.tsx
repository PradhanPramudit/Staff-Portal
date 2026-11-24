import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  MoreVertical,
  Pencil,
  Archive,
  Eye,
} from 'lucide-react';
import { employeeStatusBadge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { formatPaisa } from '../../lib/money';
import { formatDisplayDate } from '../../lib/dates';
import { navigate } from '../../lib/router';
import type { Employee, Settings } from '../../types';

export interface EmployeeTableProps {
  employees: Employee[];
  settings: Settings;
  onEdit: (employee: Employee) => void;
  onArchive: (employee: Employee) => void;
}

type SortField = 'fullName' | 'department' | 'baseSalary' | 'joiningDate';
type SortDirection = 'asc' | 'desc';

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  settings,
  onEdit,
  onArchive,
}) => {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [sortField, setSortField] = useState<SortField>('fullName');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  // Active dropdown action menu per row
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  const filteredAndSorted = useMemo(() => {
    let result = employees.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (departmentFilter !== 'all' && e.department !== departmentFilter) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = e.fullName.toLowerCase().includes(query);
        const matchesRole = e.role.toLowerCase().includes(query);
        const matchesPhone = e.phone ? e.phone.includes(query) : false;
        const matchesDept = e.department.toLowerCase().includes(query);
        if (!matchesName && !matchesRole && !matchesPhone && !matchesDept) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'fullName') {
        cmp = a.fullName.localeCompare(b.fullName);
      } else if (sortField === 'department') {
        cmp = a.department.localeCompare(b.department);
      } else if (sortField === 'baseSalary') {
        cmp = a.baseSalary - b.baseSalary;
      } else if (sortField === 'joiningDate') {
        cmp = a.joiningDate.localeCompare(b.joiningDate);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [employees, search, departmentFilter, statusFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-3">
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, role, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Department filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-600"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="text-xs px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-600"
          >
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="all">All Staff</option>
          </select>
        </div>
      </div>

      {filteredAndSorted.length === 0 ? (
        <EmptyState
          title="No employees found"
          description={
            search || departmentFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search query or filters.'
              : 'Add your first employee to get started.'
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
                    <th
                      className="px-4 py-2.5 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 select-none"
                      onClick={() => toggleSort('fullName')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Staff Member</span>
                        <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-2.5 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 select-none"
                      onClick={() => toggleSort('department')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Department & Role</span>
                        <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                      </div>
                    </th>
                    <th className="px-4 py-2.5">Phone</th>
                    <th
                      className="px-4 py-2.5 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 select-none"
                      onClick={() => toggleSort('joiningDate')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Joined</span>
                        <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-2.5 text-right cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 select-none"
                      onClick={() => toggleSort('baseSalary')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Base Salary</span>
                        <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                      </div>
                    </th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-right w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredAndSorted.map((emp) => (
                    <tr
                      key={emp.id}
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold text-[11px] flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                            {emp.fullName.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate">{emp.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                        <div>{emp.department}</div>
                        <div className="text-[11px] text-zinc-400">{emp.role}</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]">
                        {emp.phone || '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                        {formatDisplayDate(emp.joiningDate)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {formatPaisa(emp.baseSalary, {
                          currencySymbol: settings.currencySymbol,
                          numberFormat: settings.numberFormat,
                        })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {employeeStatusBadge(emp.status)}
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() =>
                              setOpenActionId(openActionId === emp.id ? null : emp.id)
                            }
                            className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            aria-label="More actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openActionId === emp.id && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setOpenActionId(null)}
                              />
                              <div className="absolute right-0 mt-1 w-36 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-pop py-1 z-30 text-xs text-left">
                                <button
                                  onClick={() => {
                                    setOpenActionId(null);
                                    navigate(`/employees/${emp.id}`);
                                  }}
                                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Profile</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenActionId(null);
                                    onEdit(emp);
                                  }}
                                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Edit Staff</span>
                                </button>
                                <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />
                                <button
                                  onClick={() => {
                                    setOpenActionId(null);
                                    onArchive(emp);
                                  }}
                                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                  <span>Archive</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 flex justify-between items-center">
              <span>Showing {filteredAndSorted.length} of {employees.length} employees</span>
              <span className="font-mono">Nepali rupee rates</span>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            {filteredAndSorted.map((emp) => (
              <div
                key={emp.id}
                onClick={() => navigate(`/employees/${emp.id}`)}
                className="p-3.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2 active:bg-zinc-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {emp.fullName}
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      {emp.department} • {emp.role}
                    </p>
                  </div>
                  {employeeStatusBadge(emp.status)}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500 font-mono text-[11px]">
                    {emp.phone || 'No phone'}
                  </span>
                  <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                    {formatPaisa(emp.baseSalary, {
                      currencySymbol: settings.currencySymbol,
                      numberFormat: settings.numberFormat,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
