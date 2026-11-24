import React, { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { rupeesToPaisa, paisaToRupees } from '../../lib/money';
import { todayISO, currentMonthKey } from '../../lib/dates';
import type { Employee, Advance, MonthKey } from '../../types';

export interface AdvanceFormProps {
  employees: Employee[];
  initial?: Advance | null;
  onSubmit: (data: Omit<Advance, 'id' | 'createdAt' | 'updatedAt' | 'recovered'>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const AdvanceForm: React.FC<AdvanceFormProps> = ({
  employees,
  initial,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [employeeId, setEmployeeId] = useState<string>(
    initial?.employeeId || employees[0]?.id || ''
  );
  const [amountRupees, setAmountRupees] = useState<string>(
    initial ? paisaToRupees(initial.amount).toString() : '10000'
  );
  const [date, setDate] = useState<string>(initial?.date || todayISO());
  const [installments, setInstallments] = useState<string>(
    initial?.installments?.toString() || '1'
  );
  const [recoveryStartMonth, setRecoveryStartMonth] = useState<MonthKey>(
    initial?.recoveryStartMonth || currentMonthKey()
  );
  const [status, setStatus] = useState<Advance['status']>(
    initial?.status || 'approved'
  );
  const [note, setNote] = useState<string>(initial?.note || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initial) {
      setEmployeeId(initial.employeeId);
      setAmountRupees(paisaToRupees(initial.amount).toString());
      setDate(initial.date);
      setInstallments(initial.installments.toString());
      setRecoveryStartMonth(initial.recoveryStartMonth);
      setStatus(initial.status);
      setNote(initial.note);
    } else if (employees.length > 0 && !employeeId) {
      setEmployeeId(employees[0].id);
    }
  }, [initial, employees, employeeId]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!employeeId) errs.employeeId = 'Please select an employee';
    const cleanAmount = parseFloat(amountRupees.replace(/,/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      errs.amount = 'Advance amount must be greater than zero';
    }
    const cleanInst = parseInt(installments, 10);
    if (isNaN(cleanInst) || cleanInst < 1 || cleanInst > 24) {
      errs.installments = 'Installments must be between 1 and 24 months';
    }
    if (!date) errs.date = 'Date is required';
    if (!recoveryStartMonth) errs.recoveryStartMonth = 'Recovery start month is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      employeeId,
      amount: rupeesToPaisa(amountRupees),
      date,
      installments: parseInt(installments, 10),
      recoveryStartMonth,
      status,
      note: note.trim(),
    });
  };

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const calculatedPerMonth =
    parseFloat(amountRupees.replace(/,/g, '')) / (parseInt(installments, 10) || 1);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Employee"
        required
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
        options={employees.map((e) => ({
          value: e.id,
          label: `${e.fullName} (${e.department} - Base: Rs. ${paisaToRupees(e.baseSalary)})`,
        }))}
        error={errors.employeeId}
        disabled={Boolean(initial)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Advance Amount (Rs.)"
          required
          type="text"
          inputMode="numeric"
          value={amountRupees}
          onChange={(e) => setAmountRupees(e.target.value)}
          prefixNode="Rs."
          placeholder="10000"
          error={errors.amount}
          autoFocus={!initial}
        />

        <Input
          label="Date Given"
          required
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Recovery Installments (Months)"
          required
          type="number"
          min="1"
          max="24"
          value={installments}
          onChange={(e) => setInstallments(e.target.value)}
          helperText="1 = deduct full amount in first month"
          error={errors.installments}
        />

        <Input
          label="Recovery Starts From"
          required
          type="month"
          value={recoveryStartMonth}
          onChange={(e) => setRecoveryStartMonth(e.target.value)}
          helperText="Payroll month to begin deduction"
          error={errors.recoveryStartMonth}
        />
      </div>

      {parseInt(installments, 10) > 1 && !isNaN(calculatedPerMonth) && (
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300 font-mono">
          <span>Scheduled deduction: </span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            ~Rs. {Math.round(calculatedPerMonth).toLocaleString('en-US')} / month
          </span>
          <span> for {installments} consecutive months</span>
        </div>
      )}

      <Select
        label="Status"
        value={status}
        onChange={(e) => setStatus(e.target.value as Advance['status'])}
        options={[
          { value: 'approved', label: 'Approved (ready for payroll recovery)' },
          { value: 'pending', label: 'Pending Approval' },
          { value: 'deducted', label: 'Deducted / Fully Settled' },
          { value: 'rejected', label: 'Rejected' },
        ]}
      />

      <Input
        label="Reason / Remarks"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Festival advance, medical urgency, travel"
        helperText="Brief note for accounting reference"
      />

      {selectedEmployee && (
        <div className="text-[11px] text-zinc-500 pt-1">
          Staff base pay: Rs. {paisaToRupees(selectedEmployee.baseSalary).toLocaleString('en-US')} / mo
        </div>
      )}

      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
        <Button variant="outline" size="sm" type="button" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" type="submit" loading={loading}>
          {initial ? 'Save Changes' : 'Record Advance'}
        </Button>
      </div>
    </form>
  );
};
