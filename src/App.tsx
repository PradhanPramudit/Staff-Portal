import React from 'react';
import { useRoute } from './lib/router';
import { ToastProvider } from './hooks/useToast';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/Dashboard';
import { EmployeesPage } from './pages/Employees';
import { EmployeeDetailPage } from './pages/EmployeeDetail';
import { AttendancePage } from './pages/Attendance';
import { AdvancesPage } from './pages/Advances';
import { PayrollPage } from './pages/Payroll';
import { PayslipPage } from './pages/PayslipPage';
import { SettingsPage } from './pages/Settings';

export const App: React.FC = () => {
  const route = useRoute();

  const renderContent = (openMobileNav: () => void) => {
    switch (route.name) {
      case 'dashboard':
        return <DashboardPage onOpenMobileNav={openMobileNav} />;
      case 'employees':
        return <EmployeesPage onOpenMobileNav={openMobileNav} />;
      case 'employee_detail':
        return <EmployeeDetailPage id={route.params.id} onOpenMobileNav={openMobileNav} />;
      case 'attendance':
        return <AttendancePage onOpenMobileNav={openMobileNav} />;
      case 'advances':
        return <AdvancesPage onOpenMobileNav={openMobileNav} />;
      case 'payroll':
        return <PayrollPage onOpenMobileNav={openMobileNav} />;
      case 'payslip':
        return (
          <PayslipPage
            month={route.params.month}
            employeeId={route.params.employeeId}
            onOpenMobileNav={openMobileNav}
          />
        );
      case 'settings':
        return <SettingsPage onOpenMobileNav={openMobileNav} />;
      default:
        return <DashboardPage onOpenMobileNav={openMobileNav} />;
    }
  };

  return (
    <ToastProvider>
      <AppShell>{({ openMobileNav }) => renderContent(openMobileNav)}</AppShell>
    </ToastProvider>
  );
};
