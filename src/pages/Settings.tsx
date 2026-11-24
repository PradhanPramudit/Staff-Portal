import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Calculator,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Check,
} from 'lucide-react';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import {
  getSettings,
  updateSettings,
  exportAllData,
  importAllData,
  resetAllData,
} from '../lib/storage';
import { generateSampleData } from '../lib/sampleData';
import { useToast } from '../hooks/useToast';
import type { DivisorMode, BackupData } from '../types';

export const SettingsPage: React.FC<{ onOpenMobileNav: () => void }> = ({
  onOpenMobileNav,
}) => {
  const [saving, setSaving] = useState(false);

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('Rs.');
  const [numberFormat, setNumberFormat] = useState<'indian' | 'international'>('indian');
  const [divisorMode, setDivisorMode] = useState<DivisorMode>('30');
  const [customDivisor, setCustomDivisor] = useState('26');
  const [weeklyOff, setWeeklyOff] = useState('6'); // 6 = Saturday

  // Reset modal state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmationInput, setResetConfirmationInput] = useState('');
  const [resetting, setResetting] = useState(false);

  // Sample data modal
  const [sampleDialogOpen, setSampleDialogOpen] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error, info } = useToast();

  useEffect(() => {
    getSettings().then((s) => {
      setBusinessName(s.businessName || '');
      setCurrencySymbol(s.currencySymbol || 'Rs.');
      setNumberFormat(s.numberFormat || 'indian');
      setDivisorMode(s.divisor?.mode || '30');
      setCustomDivisor(s.divisor?.custom?.toString() || '26');
      setWeeklyOff((s.weeklyOff ?? 6).toString());
    });
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      error('Business name cannot be empty');
      return;
    }
    const customNum = parseInt(customDivisor, 10);
    if (divisorMode === 'custom' && (isNaN(customNum) || customNum <= 0)) {
      error('Custom divisor must be a positive number');
      return;
    }

    setSaving(true);
    try {
      await updateSettings({
        businessName: businessName.trim(),
        currencySymbol: currencySymbol.trim() || 'Rs.',
        numberFormat,
        divisor: {
          mode: divisorMode,
          custom: customNum || 30,
        },
        weeklyOff: parseInt(weeklyOff, 10),
      });
      success('Settings saved successfully');
    } catch (err) {
      console.error(err);
      error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      const data = await exportAllData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `staff-portal-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success('Backup exported successfully');
    } catch (err) {
      console.error(err);
      error('Failed to export backup file');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as BackupData;
        if (!parsed.version) {
          throw new Error('Unrecognized file structure');
        }
        await importAllData(parsed);
        success('All records restored successfully');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } catch (err) {
        console.error(err);
        error('Invalid backup file. Ensure it is a valid JSON export.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadSampleData = async () => {
    setSampleLoading(true);
    try {
      const sample = generateSampleData();
      await importAllData(sample);
      setSampleDialogOpen(false);
      success('Sample data loaded with 8 Nepali staff and 3 months history');
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (err) {
      console.error(err);
      error('Failed to load sample data');
    } finally {
      setSampleLoading(false);
    }
  };

  const handleResetData = async () => {
    if (resetConfirmationInput !== 'RESET') {
      error('Type RESET exactly to confirm');
      return;
    }
    setResetting(true);
    try {
      await resetAllData();
      setResetDialogOpen(false);
      setResetConfirmationInput('');
      info('All staff and attendance records have been reset');
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err) {
      console.error(err);
      error('Failed to reset data');
    } finally {
      setResetting(false);
    }
  };

  const weeklyOffOptions = [
    { value: '0', label: 'Sunday' },
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday (Standard in Nepal)' },
  ];

  return (
    <div>
      <Topbar
        title="Settings"
        subtitle="Business profile, payroll calculation divisor, weekly off day and data backups"
        onOpenMobileNav={onOpenMobileNav}
      />

      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        {/* Main Settings Form */}
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Card 1: Business Profile */}
          <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-zinc-400" />
              <span>Business Profile</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Business Name"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Himalayan Enterprises"
                helperText="Appears on payslips and reports"
              />

              <Input
                label="Currency Symbol"
                required
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="Rs."
                helperText="Default: Rs."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Number Formatting"
                value={numberFormat}
                onChange={(e) =>
                  setNumberFormat(e.target.value as 'indian' | 'international')
                }
                options={[
                  { value: 'indian', label: 'Nepali / Indian (e.g. 1,00,000)' },
                  { value: 'international', label: 'International (e.g. 100,000)' },
                ]}
                helperText="Grouping separator for amounts"
              />

              <Select
                label="Weekly Off Day"
                value={weeklyOff}
                onChange={(e) => setWeeklyOff(e.target.value)}
                options={weeklyOffOptions}
                helperText="Nepali businesses observe Saturday as the weekly rest day"
              />
            </div>
          </div>

          {/* Card 2: Payroll Calculation Rules */}
          <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-zinc-400" />
              <span>Payroll Calculation Formula</span>
            </h3>

            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Daily Rate Divisor: <span className="font-mono text-accent-700 dark:text-accent-400">daily_rate = base_salary ÷ divisor</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDivisorMode('30')}
                  className={`p-3 rounded border text-left transition-colors ${
                    divisorMode === '30'
                      ? 'border-accent-600 bg-accent-50/50 dark:bg-accent-950/30 text-zinc-900 dark:text-zinc-100 ring-1 ring-accent-600'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <span>Fixed 30 Days</span>
                    {divisorMode === '30' && <Check className="w-3.5 h-3.5 text-accent-600" />}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Standard in Nepal. Divides by 30 regardless of calendar length.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDivisorMode('month_days')}
                  className={`p-3 rounded border text-left transition-colors ${
                    divisorMode === 'month_days'
                      ? 'border-accent-600 bg-accent-50/50 dark:bg-accent-950/30 text-zinc-900 dark:text-zinc-100 ring-1 ring-accent-600'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <span>Calendar Days</span>
                    {divisorMode === 'month_days' && (
                      <Check className="w-3.5 h-3.5 text-accent-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Divides by 28, 29, 30, or 31 depending on the specific month.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDivisorMode('custom')}
                  className={`p-3 rounded border text-left transition-colors ${
                    divisorMode === 'custom'
                      ? 'border-accent-600 bg-accent-50/50 dark:bg-accent-950/30 text-zinc-900 dark:text-zinc-100 ring-1 ring-accent-600'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <span>Custom Divisor</span>
                    {divisorMode === 'custom' && (
                      <Check className="w-3.5 h-3.5 text-accent-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Specify fixed working days (e.g. 26 days excluding Saturdays).
                  </p>
                </button>
              </div>

              {divisorMode === 'custom' && (
                <div className="pt-2 max-w-xs">
                  <Input
                    label="Custom Day Count"
                    required
                    type="number"
                    min="1"
                    max="365"
                    value={customDivisor}
                    onChange={(e) => setCustomDivisor(e.target.value)}
                    helperText="Divisor used for daily rate"
                  />
                </div>
              )}
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 space-y-1">
              <div>daily_rate = base_salary ÷ {divisorMode === 'custom' ? customDivisor : divisorMode}</div>
              <div>absence_deduction = absent_days × daily_rate</div>
              <div>half_day_deduction = half_days × daily_rate × 0.5</div>
              <div>net_pay = base + bonus − absence_deduction − half_day_deduction − advance_recovery − other_deductions</div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="primary" size="md" type="submit" loading={saving}>
              Save Settings
            </Button>
          </div>
        </form>

        {/* Card 3: Backup & Recovery */}
        <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Download className="w-4 h-4 text-zinc-400" />
            <span>Data Backup & Portability</span>
          </h3>
          <p className="text-xs text-zinc-500">
            Export all staff profiles, attendance logs, salary advances, and finalized payroll history as a single JSON file. You can import this file at any time on another browser or machine.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExportJSON}
            >
              Export JSON Backup
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Upload className="w-3.5 h-3.5" />}
              onClick={handleImportClick}
            >
              Import JSON Backup
            </Button>
          </div>
        </div>

        {/* Card 4: Testing & Danger Zone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Sample Data */}
          <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-600" />
                <span>Load Sample Data</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Populates 8 realistic Nepali staff records (Aarav, Sita, Bikash, etc.) with 3 months of complete attendance, salary advance history, and finalized payrolls.
              </p>
            </div>
            <div>
              <Button
                variant="secondary"
                size="sm"
                icon={<Sparkles className="w-3.5 h-3.5 text-accent-600" />}
                onClick={() => setSampleDialogOpen(true)}
              >
                Load Sample Data
              </Button>
            </div>
          </div>

          {/* Reset All Data */}
          <div className="rounded border border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10 p-5 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-red-900 dark:text-red-300 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>Reset All Data</span>
              </h3>
              <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-1">
                Permanently wipes all staff members, attendance records, advances, and payroll history from local storage.
              </p>
            </div>
            <div>
              <Button
                variant="destructive"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => {
                  setResetConfirmationInput('');
                  setResetDialogOpen(true);
                }}
              >
                Reset Everything
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Sample Data */}
      <Dialog
        open={sampleDialogOpen}
        onClose={() => setSampleDialogOpen(false)}
        title="Load Nepali Sample Data?"
        description="This will replace current local records with a pre-configured sample dataset containing 8 staff members, 3 months of attendance, advances, and finalized payrolls."
        confirmLabel="Load Sample Data"
        confirmVariant="primary"
        loading={sampleLoading}
        onConfirm={handleLoadSampleData}
      />

      {/* Confirmation Dialog for Reset (requires typing RESET) */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        title="Confirm Data Reset"
        description="This action cannot be undone. All staff, attendance, and payroll records will be permanently deleted."
        confirmLabel="Wipe All Data"
        confirmVariant="destructive"
        loading={resetting}
        onConfirm={handleResetData}
      >
        <div className="space-y-2 mt-2">
          <label className="text-xs text-zinc-600 dark:text-zinc-400 block">
            Type <span className="font-mono font-bold text-red-600">RESET</span> to confirm:
          </label>
          <Input
            value={resetConfirmationInput}
            onChange={(e) => setResetConfirmationInput(e.target.value)}
            placeholder="RESET"
            autoFocus
          />
        </div>
      </Dialog>
    </div>
  );
};
