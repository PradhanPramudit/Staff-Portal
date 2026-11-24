import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus } from 'lucide-react';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { Dialog } from '../components/ui/Dialog';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmployeeTable } from '../components/employees/EmployeeTable';
import { EmployeeForm } from '../components/employees/EmployeeForm';
import {
  listEmployees,
  saveEmployee,
  archiveEmployee,
  restoreEmployee,
  getSettings,
  subscribeToStorage,
} from '../lib/storage';
import { useToast } from '../hooks/useToast';
import type { Employee, Settings } from '../types';

export const EmployeesPage: React.FC<{ onOpenMobileNav: () => void }> = ({
  onOpenMobileNav,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  // Drawer state for Add/Edit
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Archive modal state
  const [archiveTarget, setArchiveTarget] = useState<Employee | null>(null);
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);

  const { success, error } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [empList, s] = await Promise.all([listEmployees(), getSettings()]);
      setEmployees(empList);
      setSettings(s);
    } catch (err) {
      console.error('Failed to load employee data:', err);
      error('Failed to load employee records.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
    return subscribeToStorage((key) => {
      if (key.includes('employees') || key.includes('settings')) {
        loadData();
      }
    });
  }, [loadData]);

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setDrawerOpen(true);
  };

  const handleFormSubmit = async (
    data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    setFormSubmitting(true);
    try {
      if (editingEmployee) {
        await saveEmployee({ ...data, id: editingEmployee.id });
        success(`Updated profile for ${data.fullName}`);
      } else {
        await saveEmployee(data);
        success(`Added ${data.fullName} to staff`);
      }
      setDrawerOpen(false);
      setEditingEmployee(null);
      await loadData();
    } catch (err) {
      console.error(err);
      error('Failed to save employee. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiveSubmitting(true);
    const target = archiveTarget;
    try {
      await archiveEmployee(target.id);
      setArchiveTarget(null);
      await loadData();

      // Show toast with UNDO action
      success(`Archived ${target.fullName}`, {
        label: 'Undo',
        onClick: async () => {
          try {
            await restoreEmployee(target.id);
            await loadData();
            success(`Restored ${target.fullName}`);
          } catch (err) {
            console.error('Failed to restore:', err);
            error('Failed to restore employee.');
          }
        },
      });
    } catch (err) {
      console.error(err);
      error('Failed to archive employee.');
    } finally {
      setArchiveSubmitting(false);
    }
  };

  return (
    <div>
      <Topbar
        title="Staff & Employees"
        subtitle="Manage active staff members, designations, base salaries and records"
        onOpenMobileNav={onOpenMobileNav}
        action={
          <Button
            variant="primary"
            size="sm"
            icon={<UserPlus className="w-3.5 h-3.5" />}
            onClick={handleOpenAdd}
          >
            Add Employee
          </Button>
        }
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {loading || !settings ? (
          <TableSkeleton rows={6} cols={6} />
        ) : (
          <EmployeeTable
            employees={employees}
            settings={settings}
            onEdit={handleOpenEdit}
            onArchive={(emp) => setArchiveTarget(emp)}
          />
        )}
      </div>

      {/* Drawer for Add/Edit */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingEmployee ? 'Edit Staff Profile' : 'Add New Staff Member'}
        description={
          editingEmployee
            ? `Update details for ${editingEmployee.fullName}`
            : 'Enter staff credentials, department, joining date and monthly base salary'
        }
      >
        <EmployeeForm
          initial={editingEmployee}
          onSubmit={handleFormSubmit}
          onCancel={() => setDrawerOpen(false)}
          loading={formSubmitting}
        />
      </Drawer>

      {/* Confirmation Dialog for Archiving */}
      <Dialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title="Archive Employee?"
        description={
          archiveTarget
            ? `Are you sure you want to archive ${archiveTarget.fullName}? They will no longer appear in daily attendance sheets or new payroll calculations, but past records will remain preserved.`
            : ''
        }
        confirmLabel="Archive Employee"
        confirmVariant="destructive"
        loading={archiveSubmitting}
        onConfirm={handleConfirmArchive}
      />
    </div>
  );
};
