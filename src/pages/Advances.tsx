import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HandCoins, Plus, Clock, CheckCircle2 } from 'lucide-react';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { Dialog } from '../components/ui/Dialog';
import { TableSkeleton } from '../components/ui/Skeleton';
import { AdvanceTable } from '../components/advances/AdvanceTable';
import { AdvanceForm } from '../components/advances/AdvanceForm';
import {
  listAdvances,
  listEmployees,
  saveAdvance,
  updateAdvanceStatus,
  deleteAdvance,
  getSettings,
  subscribeToStorage,
} from '../lib/storage';
import { formatPaisa } from '../lib/money';
import { currentMonthKey } from '../lib/dates';
import { useToast } from '../hooks/useToast';
import type { Advance, Employee, Settings } from '../types';

export const AdvancesPage: React.FC<{ onOpenMobileNav: () => void }> = ({
  onOpenMobileNav,
}) => {
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Advance | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { success, error } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [advs, emps, s] = await Promise.all([
        listAdvances(),
        listEmployees(),
        getSettings(),
      ]);
      setAdvances(advs);
      setEmployees(emps);
      setSettings(s);
    } catch (err) {
      console.error(err);
      error('Failed to load salary advance records.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
    return subscribeToStorage((key) => {
      if (key.includes('advances') || key.includes('employees') || key.includes('settings')) {
        loadData();
      }
    });
  }, [loadData]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const curMonth = currentMonthKey();
    let totalOutstanding = 0;
    let givenThisMonth = 0;
    let pendingCount = 0;
    let pendingAmount = 0;

    for (const a of advances) {
      const remaining = Math.max(0, a.amount - (a.recovered || 0));
      if (a.status === 'approved') {
        totalOutstanding += remaining;
      }
      if (a.date.startsWith(curMonth) && a.status !== 'rejected') {
        givenThisMonth += a.amount;
      }
      if (a.status === 'pending') {
        pendingCount++;
        pendingAmount += a.amount;
      }
    }

    return { totalOutstanding, givenThisMonth, pendingCount, pendingAmount };
  }, [advances]);

  const handleOpenAdd = () => {
    setEditingAdvance(null);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (adv: Advance) => {
    setEditingAdvance(adv);
    setDrawerOpen(true);
  };

  const handleFormSubmit = async (
    data: Omit<Advance, 'id' | 'createdAt' | 'updatedAt' | 'recovered'>
  ) => {
    setFormLoading(true);
    try {
      if (editingAdvance) {
        await saveAdvance({ ...data, id: editingAdvance.id });
        success('Salary advance updated');
      } else {
        await saveAdvance(data);
        success('Salary advance recorded successfully');
      }
      setDrawerOpen(false);
      setEditingAdvance(null);
      await loadData();
    } catch (err) {
      console.error(err);
      error('Failed to save salary advance');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (adv: Advance, newStatus: Advance['status']) => {
    try {
      await updateAdvanceStatus(adv.id, newStatus);
      success(`Advance marked as ${newStatus}`);
      await loadData();
    } catch (err) {
      console.error(err);
      error('Failed to update status');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdvance(deleteTarget.id);
      success('Salary advance deleted');
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      console.error(err);
      error('Failed to delete advance');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <Topbar
        title="Salary Advances"
        subtitle="Record employee advances, recovery installments, and monitor outstanding balances"
        onOpenMobileNav={onOpenMobileNav}
        action={
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenAdd}
          >
            Record Advance
          </Button>
        }
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* 3 KPI Summary Cards */}
        {settings && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Total Outstanding Due
                </span>
                <HandCoins className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
                {formatPaisa(kpis.totalOutstanding, {
                  currencySymbol: settings.currencySymbol,
                  numberFormat: settings.numberFormat,
                })}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Across all active approved staff advances
              </p>
            </div>

            <div className="p-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Disbursed This Month
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
                {formatPaisa(kpis.givenThisMonth, {
                  currencySymbol: settings.currencySymbol,
                  numberFormat: settings.numberFormat,
                })}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                New advances issued in current calendar month
              </p>
            </div>

            <div className="p-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-1">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Pending Approvals
                </span>
                <Clock className="w-4 h-4 text-sky-500" />
              </div>
              <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
                {kpis.pendingCount}
                <span className="text-xs font-normal text-zinc-400 ml-2">
                  ({formatPaisa(kpis.pendingAmount, { currencySymbol: settings.currencySymbol, numberFormat: settings.numberFormat })})
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Advance requests awaiting management sign-off
              </p>
            </div>
          </div>
        )}

        {/* Advance Table */}
        {loading || !settings ? (
          <TableSkeleton rows={6} cols={7} />
        ) : (
          <AdvanceTable
            advances={advances}
            employees={employees}
            settings={settings}
            onEdit={handleOpenEdit}
            onDelete={(adv) => setDeleteTarget(adv)}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {/* Drawer for Add/Edit Advance */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingAdvance ? 'Edit Salary Advance' : 'Record Salary Advance'}
        description={
          editingAdvance
            ? 'Update advance amount, status, or recovery installments'
            : 'Issue an advance to an active staff member and schedule monthly deduction'
        }
      >
        <AdvanceForm
          employees={employees.filter((e) => e.status === 'active')}
          initial={editingAdvance}
          onSubmit={handleFormSubmit}
          onCancel={() => setDrawerOpen(false)}
          loading={formLoading}
        />
      </Drawer>

      {/* Delete Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Salary Advance Record?"
        description="Are you sure you want to delete this salary advance? Any unrecovered balance will be removed from future payroll recovery."
        confirmLabel="Delete Advance"
        confirmVariant="destructive"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
