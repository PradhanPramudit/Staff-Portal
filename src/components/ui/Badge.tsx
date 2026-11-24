import React from 'react';

export type BadgeVariant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'accent';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  size = 'md',
  className = '',
}) => {
  const variants: Record<BadgeVariant, string> = {
    neutral: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
    success: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    danger: 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800',
    info: 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    accent: 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  };

  const sizes = {
    sm: 'text-[11px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded border ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

// Convenience status mappers
export function attendanceStatusBadge(status: string) {
  switch (status) {
    case 'present':
      return <Badge variant="success">Present</Badge>;
    case 'absent':
      return <Badge variant="danger">Absent</Badge>;
    case 'half_day':
      return <Badge variant="warning">Half-day</Badge>;
    case 'paid_leave':
      return <Badge variant="info">Paid leave</Badge>;
    case 'holiday':
      return <Badge variant="accent">Holiday</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export function advanceStatusBadge(status: string) {
  switch (status) {
    case 'approved':
      return <Badge variant="success">Approved</Badge>;
    case 'pending':
      return <Badge variant="warning">Pending</Badge>;
    case 'deducted':
      return <Badge variant="neutral">Deducted</Badge>;
    case 'rejected':
      return <Badge variant="danger">Rejected</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export function employeeStatusBadge(status: 'active' | 'inactive') {
  if (status === 'active') {
    return <Badge variant="success">Active</Badge>;
  }
  return <Badge variant="neutral">Inactive</Badge>;
}
