import React, { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { rupeesToPaisa, paisaToRupees } from '../../lib/money';
import { todayISO } from '../../lib/dates';
import type { Employee } from '../../types';

export interface EmployeeFormProps {
  initial?: Employee | null;
  onSubmit: (data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const DEPARTMENTS = [
  'Administration',
  'Sales & Marketing',
  'Accounts & Finance',
  'Operations',
  'Customer Support',
  'Logistics',
  'Kitchen / Service',
  'Technical',
];

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  initial,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [customDepartment, setCustomDepartment] = useState('');
  const [role, setRole] = useState('');
  const [baseSalaryRupees, setBaseSalaryRupees] = useState<string>('30000');
  const [joiningDate, setJoiningDate] = useState<string>(todayISO());
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initial) {
      setFullName(initial.fullName);
      setPhone(initial.phone || '');
      if (DEPARTMENTS.includes(initial.department)) {
        setDepartment(initial.department);
        setCustomDepartment('');
      } else {
        setDepartment('other');
        setCustomDepartment(initial.department);
      }
      setRole(initial.role);
      setBaseSalaryRupees(paisaToRupees(initial.baseSalary).toString());
      setJoiningDate(initial.joiningDate);
      setStatus(initial.status);
    } else {
      setFullName('');
      setPhone('');
      setDepartment(DEPARTMENTS[0]);
      setCustomDepartment('');
      setRole('');
      setBaseSalaryRupees('30000');
      setJoiningDate(todayISO());
      setStatus('active');
    }
    setErrors({});
  }, [initial]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) {
      errs.fullName = 'Full name is required';
    }
    const cleanSalary = parseFloat(baseSalaryRupees.replace(/,/g, ''));
    if (isNaN(cleanSalary) || cleanSalary < 0) {
      errs.baseSalary = 'Valid base salary is required (cannot be negative)';
    }
    if (!joiningDate) {
      errs.joiningDate = 'Joining date is required';
    }
    if (department === 'other' && !customDepartment.trim()) {
      errs.department = 'Department name is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalDept = department === 'other' ? customDepartment.trim() : department;
    const baseSalaryPaisa = rupeesToPaisa(baseSalaryRupees);

    await onSubmit({
      fullName: fullName.trim(),
      phone: phone.trim(),
      department: finalDept,
      role: role.trim() || 'Staff',
      baseSalary: baseSalaryPaisa,
      joiningDate,
      status,
    });
  };

  const deptOptions = [
    ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
    { value: 'other', label: 'Other (type custom)' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Full Name"
        required
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="e.g. Ramesh Adhikari"
        error={errors.fullName}
        autoFocus
      />

      <Input
        label="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="e.g. 98XXXXXXXX"
        helperText="Nepali mobile number (optional)"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Department"
          required
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          options={deptOptions}
        />

        <Input
          label="Designation / Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Senior Cashier"
        />
      </div>

      {department === 'other' && (
        <Input
          label="Custom Department"
          required
          value={customDepartment}
          onChange={(e) => setCustomDepartment(e.target.value)}
          placeholder="Enter department name"
          error={errors.department}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Monthly Base Salary (Rs.)"
          required
          type="text"
          inputMode="numeric"
          value={baseSalaryRupees}
          onChange={(e) => setBaseSalaryRupees(e.target.value)}
          prefixNode="Rs."
          placeholder="30000"
          error={errors.baseSalary}
          helperText="Gross monthly base pay"
        />

        <Input
          label="Joining Date"
          required
          type="date"
          value={joiningDate}
          onChange={(e) => setJoiningDate(e.target.value)}
          error={errors.joiningDate}
        />
      </div>

      <Select
        label="Employment Status"
        value={status}
        onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
        options={[
          { value: 'active', label: 'Active (eligible for attendance & payroll)' },
          { value: 'inactive', label: 'Inactive / On Leave' },
        ]}
      />

      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
        <Button variant="outline" size="sm" type="button" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" type="submit" loading={loading}>
          {initial ? 'Save Changes' : 'Add Employee'}
        </Button>
      </div>
    </form>
  );
};
