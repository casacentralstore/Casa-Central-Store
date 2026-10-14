import React, { useState, useEffect } from 'react';
import { TaxSettings, User, UserRole, UserInvitation, SentEmail } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatDate } from '../../utils/formatters.ts';
import { InvitationSentModal } from '../auth/InvitationSentModal.tsx';
import { GoogleSheetsBackupModal } from '../backup/GoogleSheetsBackupModal.tsx';
import { ChangePasswordModal } from '../auth/ChangePasswordModal.tsx';
import {
  DollarSign,
  Shield,
  Upload,
  CheckCircle,
  AlertCircle,
  Save,
  FileSpreadsheet,
  UserPlus,
  Trash2,
  AlertTriangle,
  UserCheck,
  X,
  Lock,
  Mail,
  Send,
  KeyRound,
  Cloud,
  ExternalLink,
  Copy,
  Check,
  Code,
  Sparkles,
  FileCode,
  CheckCircle2,
  ShieldAlert,
  Globe,
} from 'lucide-react';
import {
  APPS_SCRIPT_SAMPLE_CODE,
  copyEmailToClipboard,
  buildMailtoUrl,
  buildGmailComposeUrl,
} from '../../utils/emailHelper.ts';


interface SettingsPageProps {
  settings: TaxSettings;
  users: User[];
  currentUser: User;
  onRefreshSettings: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  users,
  currentUser,
  onRefreshSettings,
}) => {
  const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'Administrator';

  // Config form state
  const [form, setForm] = useState({
    default_tax_rate: (settings.default_tax_rate * 100).toFixed(5),
    tax_name: settings.tax_name,
    cc_surcharge_rate: (settings.cc_surcharge_rate * 100).toFixed(2),
    company_name: settings.company_name,
    company_address: settings.company_address,
    company_city_state_zip: settings.company_city_state_zip,
    company_phone: settings.company_phone,
    company_email: settings.company_email,
  });

  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState('');
  const [configError, setConfigError] = useState('');

  // Email / Delivery Dispatch State (Google Apps Script, Manual Clipboard, or SMTP)
  const [emailConfig, setEmailConfig] = useState<{
    mode: 'apps_script' | 'manual' | 'smtp';
    appsScriptUrl: string;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    defaultFrom: string;
    isConfigured: boolean;
    hasPassword: boolean;
  }>({
    mode: 'apps_script',
    appsScriptUrl: '',
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    defaultFrom: '',
    isConfigured: false,
    hasPassword: false,
  });
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [testEmailAddress, setTestEmailAddress] = useState(currentUser.email || '');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<any>(null);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);
  const [manualTestDraft, setManualTestDraft] = useState<{ to: string; subject: string; body: string } | null>(null);
  const [manualTestCopied, setManualTestCopied] = useState(false);

  useEffect(() => {
    const fetchEmailConfig = async () => {
      try {
        const cfg = await api.getEmailConfig();
        setEmailConfig({
          mode: cfg.mode || 'apps_script',
          appsScriptUrl: cfg.appsScriptUrl || '',
          host: cfg.host || '',
          port: cfg.port || 587,
          secure: Boolean(cfg.secure),
          user: cfg.user || '',
          pass: '',
          defaultFrom: cfg.defaultFrom || '',
          isConfigured: Boolean(cfg.isConfigured),
          hasPassword: Boolean(cfg.hasPassword),
        });
      } catch (err) {
        console.error('Failed to load email config:', err);
      }
    };
    fetchEmailConfig();
  }, []);

  // Migration CSV Import State
  const [migrationType, setMigrationType] = useState<'customers' | 'inventory'>('customers');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  // User Management State (Add & Delete)
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Sales');
  const [creatingUser, setCreatingUser] = useState(false);
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);

  // Delete User Confirmation Modal
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Invitation Modal & Resend State
  const [inviteModalData, setInviteModalData] = useState<{
    user: User;
    invitation: UserInvitation;
    email?: SentEmail | null;
  } | null>(null);
  const [resendingInviteFor, setResendingInviteFor] = useState<string | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [passwordModalTarget, setPasswordModalTarget] = useState<User | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleViewInvitation = async (targetUser: User) => {
    try {
      setUserActionError(null);
      const res = await api.getUserInvitation(targetUser.id);
      if (res.invitation) {
        setInviteModalData({
          user: targetUser,
          invitation: res.invitation,
          email: res.email,
        });
      } else {
        handleResendInvite(targetUser);
      }
    } catch (err: any) {
      setUserActionError(err.message || 'Failed to load invitation details');
    }
  };

  const handleResendInvite = async (targetUser: User) => {
    setResendingInviteFor(targetUser.id);
    setUserActionError(null);
    try {
      const res = await api.resendInvite(targetUser.id);
      setInviteModalData({
        user: targetUser,
        invitation: res.invitation,
        email: res.email,
      });
      setUserActionSuccess(`New invitation link and email dispatched for ${targetUser.name}!`);
      onRefreshSettings();
    } catch (err: any) {
      setUserActionError(err.message || 'Failed to resend invitation');
    } finally {
      setResendingInviteFor(null);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSuccess('');
    setConfigError('');
    setSavingConfig(true);
    try {
      const taxRateDecimal = parseFloat(form.default_tax_rate) / 100;
      const ccRateDecimal = parseFloat(form.cc_surcharge_rate) / 100;
      await api.updateSettings({
        default_tax_rate: taxRateDecimal,
        tax_name: form.tax_name,
        cc_surcharge_rate: ccRateDecimal,
        company_name: form.company_name,
        company_address: form.company_address,
        company_city_state_zip: form.company_city_state_zip,
        company_phone: form.company_phone,
        company_email: form.company_email,
      });
      setConfigSuccess('System configurations updated successfully.');
      onRefreshSettings();
    } catch (err: any) {
      setConfigError(err.message || 'Failed to update settings');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    setEmailSuccess('');
    setEmailError('');
    try {
      await api.updateEmailConfig(emailConfig);
      setEmailSuccess('Email delivery settings saved successfully!');
      setTimeout(() => setEmailSuccess(''), 4000);
    } catch (err: any) {
      setEmailError(err.message || 'Failed to update email settings');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleVerifyEmailConnection = async () => {
    setVerifyingEmail(true);
    setEmailSuccess('');
    setEmailError('');
    try {
      // First save current form state so backend tests active configuration
      await api.updateEmailConfig(emailConfig);
      const res = await api.verifyEmailConnection();
      if (res.success) {
        setEmailSuccess(res.message);
      } else {
        setEmailError(res.message);
      }
    } catch (err: any) {
      setEmailError(err.message || 'Verification connection failed');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      setEmailError('Please enter a destination email address for the test.');
      return;
    }
    setSendingTestEmail(true);
    setEmailError('');
    setTestEmailResult(null);
    setManualTestDraft(null);
    try {
      // Auto-save settings first
      await api.updateEmailConfig(emailConfig);

      if (emailConfig.mode === 'manual') {
        const fullSubject = 'Casa Central Store - Email Dispatch Verification';
        const fullBody = `Casa Central Store Email Test\nSender: ${currentUser.name} (${currentUser.email})\nRecipient: ${testEmailAddress.trim()}\nMode: Manual Clipboard Dispatch\nTimestamp: ${new Date().toLocaleString()}\n\nThis confirms that manual email dispatch is ready. You can copy this message to your clipboard or launch it in your email client below.`;
        setManualTestDraft({
          to: testEmailAddress.trim(),
          subject: fullSubject,
          body: fullBody,
        });
        setEmailSuccess(`Manual Test Email draft prepared for ${testEmailAddress.trim()}! Copy or open it below.`);
        setTimeout(() => setEmailSuccess(''), 6000);
      } else {
        const res = await api.sendTestEmail(testEmailAddress.trim());
        setTestEmailResult(res.data);
        const modeLabel = res.data?.mode === 'apps_script' 
          ? 'Google Apps Script Webhook' 
          : 'SMTP Server';
        setEmailSuccess(`Test email processed via ${modeLabel} for ${testEmailAddress}!`);
        setTimeout(() => setEmailSuccess(''), 6000);
      }
    } catch (err: any) {
      setEmailError(err.message || 'Failed to dispatch test email');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      setMigrationError('Please select a CSV file to import.');
      return;
    }
    setMigrationError(null);
    setMigrationResult(null);
    setCsvImporting(true);
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        throw new Error('CSV file contains no data rows.');
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const rowObj: any = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || '';
        });
        rows.push(rowObj);
      }
      const res = await api.importCsv(migrationType, rows);
      setMigrationResult(res.message);
      setCsvFile(null);
    } catch (err: any) {
      setMigrationError(err.message || 'CSV Import failed');
    } finally {
      setCsvImporting(false);
    }
  };

  // Add User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError(null);
    setUserActionSuccess(null);

    if (!newUserName.trim()) {
      setUserActionError('Full Name is required.');
      return;
    }
    if (!newUserEmail.trim()) {
      setUserActionError('Email address is required.');
      return;
    }

    setCreatingUser(true);
    try {
      const created = await api.createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
      });
      setUserActionSuccess(`Staff member "${created.user.name}" (${created.user.role}) added and invitation dispatched!`);
      setShowAddUser(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('Sales');
      onRefreshSettings();
      // Show invitation link and email modal
      setInviteModalData({
        user: created.user,
        invitation: created.invitation,
        email: created.email,
      });
    } catch (err: any) {
      setUserActionError(err.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  // Delete User Handler
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setUserActionError(null);
    setUserActionSuccess(null);
    setDeletingUser(true);

    try {
      const res = await api.deleteUser(userToDelete.id);
      setUserActionSuccess(res.message || `User "${userToDelete.name}" has been deleted.`);
      setUserToDelete(null);
      onRefreshSettings();
    } catch (err: any) {
      setUserActionError(err.message || 'Failed to delete user');
    } finally {
      setDeletingUser(false);
    }
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'Admin':
      case 'Administrator':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Manager':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Sales':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Support':
      case 'Sales Support':
        return 'bg-cyan-100 text-cyan-900 border-cyan-300';
      case 'Accounting':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Logistics':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case 'Admin':
      case 'Administrator':
        return 'Full unrestricted access: Manage users, company settings, tax rates, inventory catalog, orders, and financial reconciliations.';
      case 'Manager':
        return 'Full operational authority: POS register, inventory assets, sales orders, order fulfillment, reports, and payments (except user account management).';
      case 'Sales':
        return 'Front-end sales register: Create and edit sales orders, look up products/inventory, and manage customer records.';
      case 'Support':
      case 'Sales Support':
      case 'Logistics':
        return 'Sales Support & Logistics: Customer inquiries, order lookup, packing slips, warehouse fulfillment (SO# entry), carrier assignment, and pick-up confirmations.';
      case 'Accounting':
        return 'Financial reconciliation: Record payments, invoice monitoring, review statements, and inspect tax/financial reports.';
      default:
        return 'Standard system access.';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-800 p-3 sm:p-5 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6">
      {/* Top Header */}

      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">
          Settings & Master Configuration
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tax jurisdictions, store master data, users & role-based permissions, and legacy CSV data migration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Tax & Email Settings */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <DollarSign className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Tax Rates & Financial Parameters
            </h2>
          </div>

          {configSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-lg flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
              {configSuccess}
            </div>
          )}

          {configError && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 text-xs rounded-lg flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 text-rose-600" />
              {configError}
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">
                  Sales Tax Rate (%) <span className="text-[10px] text-amber-700 font-normal">(NJ UEZ/Standard)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.00001"
                    min="0"
                    max="100"
                    required
                    value={form.default_tax_rate}
                    onChange={e => setForm({ ...form, default_tax_rate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold"
                  />
                  <span className="absolute right-2.5 top-1.5 text-slate-400 font-bold">%</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Current NJ Retail / UEZ: 3.31259%
                </span>
              </div>
              <div>
                <label className="block font-semibold mb-1">Credit Card Surcharge (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="20"
                    required
                    value={form.cc_surcharge_rate}
                    onChange={e => setForm({ ...form, cc_surcharge_rate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold"
                  />
                  <span className="absolute right-2.5 top-1.5 text-slate-400 font-bold">%</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Standard merchant fee offset: 3.00%
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Tax Jurisdiction Label</label>
              <input
                type="text"
                value={form.tax_name}
                onChange={e => setForm({ ...form, tax_name: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
              />
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <h3 className="font-bold text-slate-800 text-[11px] uppercase">
                Store Company Information (Printed on Documents)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Company Name</label>
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={e => setForm({ ...form, company_name: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.company_phone}
                    onChange={e => setForm({ ...form, company_phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Street Address</label>
                <input
                  type="text"
                  value={form.company_address}
                  onChange={e => setForm({ ...form, company_address: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">City, State, ZIP</label>
                  <input
                    type="text"
                    value={form.company_city_state_zip}
                    onChange={e => setForm({ ...form, company_city_state_zip: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Store Email</label>
                  <input
                    type="email"
                    value={form.company_email}
                    onChange={e => setForm({ ...form, company_email: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              className="mt-2 w-full py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg shadow-2xs flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {savingConfig ? 'Saving Settings...' : 'Save Configuration Changes'}
            </button>
          </form>
        </div>

        {/* Email & Outgoing Dispatch Engine Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-amber-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Outgoing Email Engine &amp; Dispatcher
              </h2>
            </div>
            {emailConfig.mode === 'apps_script' ? (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${
                emailConfig.appsScriptUrl ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>{emailConfig.appsScriptUrl ? 'Google Apps Script Relay Active' : 'Apps Script (Setup Required)'}</span>
              </span>
            ) : emailConfig.mode === 'manual' ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center space-x-1">
                <Copy className="w-3 h-3 text-blue-600" />
                <span>Manual Clipboard Mode Active</span>
              </span>
            ) : (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                emailConfig.isConfigured ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                {emailConfig.isConfigured ? 'Custom SMTP Active' : 'SMTP Ethereal Test Mode'}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Automated emails for <strong>Payment Reminders</strong>, <strong>Customer Marketing Campaigns</strong>, and <strong>User Invitations</strong> are sent from the logged-in staff member (<em>{currentUser.name} &lt;{currentUser.email}&gt;</em>). If company restrictions block SMTP ports, choose <strong>Google Apps Script Relay</strong> or <strong>Manual Mode</strong> below!
          </p>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setEmailConfig({ ...emailConfig, mode: 'apps_script' })}
              className={`p-2.5 rounded-lg text-left transition-all cursor-pointer ${
                emailConfig.mode === 'apps_script'
                  ? 'bg-white shadow-sm border border-amber-400 text-slate-900 ring-1 ring-amber-500/20'
                  : 'hover:bg-slate-200/60 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Google Apps Script</span>
                </span>
                {emailConfig.mode === 'apps_script' && <Check className="w-3.5 h-3.5 text-amber-600" />}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Zero SMTP! Uses a lightweight Google Webhook to send via Gmail.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setEmailConfig({ ...emailConfig, mode: 'manual' })}
              className={`p-2.5 rounded-lg text-left transition-all cursor-pointer ${
                emailConfig.mode === 'manual'
                  ? 'bg-white shadow-sm border border-blue-400 text-slate-900 ring-1 ring-blue-500/20'
                  : 'hover:bg-slate-200/60 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center space-x-1.5">
                  <Copy className="w-3.5 h-3.5 text-blue-600" />
                  <span>Manual Clipboard</span>
                </span>
                {emailConfig.mode === 'manual' && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                1-click copy or open in Outlook/Gmail web with full formatted drafts.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setEmailConfig({ ...emailConfig, mode: 'smtp' })}
              className={`p-2.5 rounded-lg text-left transition-all cursor-pointer ${
                emailConfig.mode === 'smtp'
                  ? 'bg-white shadow-sm border border-purple-400 text-slate-900 ring-1 ring-purple-500/20'
                  : 'hover:bg-slate-200/60 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-purple-600" />
                  <span>Custom SMTP</span>
                </span>
                {emailConfig.mode === 'smtp' && <Check className="w-3.5 h-3.5 text-purple-600" />}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Standard host/port server configuration with app password.
              </p>
            </button>
          </div>

          {emailSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-lg flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
              <span>{emailSuccess}</span>
            </div>
          )}

          {emailError && (
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 text-xs rounded-lg flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 text-rose-600 shrink-0" />
                <span>{emailError}</span>
              </div>

              {(emailError.includes('Authorization') ||
                emailError.includes('permission to call MailApp') ||
                emailError.includes('auth/script.send_mail') ||
                emailError.includes('auth/gmail.send') ||
                emailError.includes('You do not have permission')) && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3 text-xs text-amber-950">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-bold text-slate-900">
                        Quick Fix: 1-Time Authorization Required in Google
                      </span>
                    </div>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full self-start sm:self-auto">
                      Takes 30 seconds
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    Google blocks external webhooks from sending emails until you run the script once inside the Google Apps Script code editor. Follow these 4 quick steps:
                  </p>

                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-800 font-medium bg-white/80 p-3 rounded-lg border border-amber-200">
                    <li>
                      Open your script project in{' '}
                      <a
                        href="https://script.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-800 underline font-bold"
                      >
                        script.google.com
                      </a>
                    </li>
                    <li>
                      In the top toolbar dropdown menu (next to &quot;Debug&quot;), choose <strong>authorizeScript</strong>
                    </li>
                    <li>
                      Click the <strong>▶ Run</strong> button &rarr; <strong>Review permissions</strong> &rarr; <strong>Advanced</strong> &rarr; <strong>Allow</strong>
                    </li>
                    <li>
                      Return here and click <strong>&quot;Ping / Verify Webhook&quot;</strong> (your existing URL will work immediately without redeploying!)
                    </li>
                  </ol>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href="https://script.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs inline-flex items-center space-x-1.5 transition-colors shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open script.google.com</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowScriptModal(true)}
                      className="px-3 py-1.5 bg-white hover:bg-amber-100 text-slate-800 border border-amber-300 font-bold rounded-lg text-xs inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5 text-amber-600" />
                      <span>View Full Script Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = { ...emailConfig, mode: 'manual' as const };
                        setEmailConfig(updated);
                        await api.updateEmailConfig(updated);
                        setEmailError('');
                        setEmailSuccess('Switched to 1-Click Manual Mode! Zero SMTP or Google configuration needed.');
                        setTimeout(() => setEmailSuccess(''), 5000);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs inline-flex items-center space-x-1.5 transition-colors cursor-pointer sm:ml-auto shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Switch to Manual Clipboard Mode</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test Email Result Banner */}
          {testEmailResult && testEmailResult.previewUrl && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between">
              <div>
                <strong>Test Email Dispatched!</strong> View delivery output via live preview:
              </div>
              <a
                href={testEmailResult.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[11px] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                View Test Email
              </a>
            </div>
          )}

          <form onSubmit={handleSaveEmailConfig} className="space-y-4 text-xs">
            {/* GOOGLE APPS SCRIPT RELAY VIEW */}
            {emailConfig.mode === 'apps_script' && (
              <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Google Apps Script Webhook Relay</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Sends emails seamlessly through your Google/Gmail account via a safe Google Web App endpoint.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowScriptModal(true)}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>View Script &amp; Instructions</span>
                  </button>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-800">
                    Google Apps Script Web App URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={emailConfig.appsScriptUrl}
                    onChange={e => setEmailConfig({ ...emailConfig, appsScriptUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                    <span>Must be a deployed Web App URL ending in <code className="text-amber-800 font-bold">/exec</code></span>
                    <button
                      type="button"
                      onClick={handleVerifyEmailConnection}
                      disabled={verifyingEmail || !emailConfig.appsScriptUrl}
                      className="font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer disabled:opacity-40"
                    >
                      {verifyingEmail ? 'Testing connection...' : 'Ping / Verify Webhook'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-800">Default Sender Display Name</label>
                    <input
                      type="text"
                      placeholder="Casa Central Store"
                      value={emailConfig.defaultFrom}
                      onChange={e => setEmailConfig({ ...emailConfig, defaultFrom: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-[11px]"
                    />
                  </div>
                  <div className="p-2.5 bg-white border border-amber-200/80 rounded-lg text-[11px] text-slate-600 flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>No SMTP Password Required!</strong> Runs with your standard daily Google account quota.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* MANUAL CLIPBOARD VIEW */}
            {emailConfig.mode === 'manual' && (
              <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                    <Copy className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">Manual Dispatch Mode Active</h3>
                    <p className="text-[11px] text-slate-500">
                      Zero setup required. Perfect if you want complete manual control in Outlook or Gmail.
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-white border border-blue-100 rounded-lg text-slate-700 text-xs space-y-1.5 leading-relaxed">
                  <p>In this mode, all email screens offer immediate buttons to:</p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                    <li><strong>Copy Formatted Email (HTML &amp; Plain Text):</strong> Paste directly into any email compose window.</li>
                    <li><strong>Open in Email App (<code className="text-blue-800">mailto:</code>):</strong> Launches Outlook, Apple Mail, or Thunderbird with recipient and subject pre-filled.</li>
                    <li><strong>Open in Gmail Web Composer:</strong> Launches Gmail in a new tab with your pre-drafted subject and body.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* CUSTOM SMTP VIEW */}
            {emailConfig.mode === 'smtp' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h3 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                  <Mail className="w-4 h-4 text-purple-600" />
                  <span>Custom SMTP Server Parameters</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">SMTP Server Host</label>
                    <input
                      type="text"
                      placeholder="e.g. smtp.gmail.com"
                      value={emailConfig.host}
                      onChange={e => setEmailConfig({ ...emailConfig, host: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-[11px] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">SMTP Port</label>
                    <input
                      type="number"
                      placeholder="587"
                      value={emailConfig.port}
                      onChange={e => setEmailConfig({ ...emailConfig, port: parseInt(e.target.value, 10) || 587 })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-[11px] bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">SMTP Username / Account</label>
                    <input
                      type="text"
                      placeholder="account@casacentralstore.com"
                      value={emailConfig.user}
                      onChange={e => setEmailConfig({ ...emailConfig, user: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-[11px] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">
                      SMTP App Password / Secret {emailConfig.hasPassword && <span className="text-emerald-600 font-normal">(Saved)</span>}
                    </label>
                    <input
                      type="password"
                      placeholder={emailConfig.hasPassword ? '••••••••••••' : 'App Password'}
                      value={emailConfig.pass}
                      onChange={e => setEmailConfig({ ...emailConfig, pass: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-[11px] bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Default From Header</label>
                    <input
                      type="text"
                      placeholder="Casa Central Store <ecommerce@casacentralstore.com>"
                      value={emailConfig.defaultFrom}
                      onChange={e => setEmailConfig({ ...emailConfig, defaultFrom: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-[11px] bg-white"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailConfig.secure}
                        onChange={e => setEmailConfig({ ...emailConfig, secure: e.target.checked })}
                        className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                      />
                      <span className="font-semibold text-slate-700">SSL/TLS Secure (Port 465)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="flex items-center space-x-3 pt-1">
                <button
                  type="submit"
                  disabled={savingEmail}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-2xs flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-1.5 text-amber-400" />
                  {savingEmail ? 'Saving Email Settings...' : 'Save Email Configuration'}
                </button>
                {emailConfig.mode !== 'manual' && (
                  <button
                    type="button"
                    onClick={handleVerifyEmailConnection}
                    disabled={verifyingEmail}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {verifyingEmail ? 'Verifying...' : 'Verify Engine'}
                  </button>
                )}
              </div>
            )}
          </form>

          {/* Test Email Dispatch Section */}
          <div className="pt-3 border-t border-slate-100">
            <label className="block font-bold text-slate-800 mb-1.5 text-xs">
              Test Real Email Dispatch ({emailConfig.mode === 'apps_script' ? 'via Google Apps Script' : emailConfig.mode === 'manual' ? 'via Manual Preview' : 'via SMTP'})
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Recipient email address..."
                value={testEmailAddress}
                onChange={e => setTestEmailAddress(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
              />
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTestEmail}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center shadow-2xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {sendingTestEmail ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    <span>Send Test Email</span>
                  </>
                )}
              </button>
            </div>

            {/* Manual Email Draft Card (Preview & 1-Click Actions) */}
            {manualTestDraft && (
              <div className="mt-3 p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-2.5">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                      <Copy className="w-4 h-4 text-blue-600" />
                      <span>Manual Test Email Draft Generated</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      To: <strong>{manualTestDraft.to}</strong> &bull; Subject: <em>{manualTestDraft.subject}</em>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await copyEmailToClipboard({
                          to: manualTestDraft.to,
                          subject: manualTestDraft.subject,
                          bodyText: manualTestDraft.body,
                        });
                        setManualTestCopied(true);
                        setTimeout(() => setManualTestCopied(false), 3000);
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      {manualTestCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{manualTestCopied ? 'Copied to Clipboard!' : 'Copy Formatted Email'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = buildMailtoUrl({
                          to: manualTestDraft.to,
                          subject: manualTestDraft.subject,
                          body: manualTestDraft.body,
                        });
                        window.open(url, '_blank');
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Open in default email app (Outlook, Apple Mail, etc.)"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>Open in Mail App</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = buildGmailComposeUrl({
                          to: manualTestDraft.to,
                          subject: manualTestDraft.subject,
                          body: manualTestDraft.body,
                        });
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Open pre-filled in Gmail"
                    >
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      <span>Open in Gmail</span>
                    </button>
                  </div>
                </div>
                <div className="p-3 bg-white border border-blue-200 rounded-lg font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {manualTestDraft.body}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: User Management (Add & Delete) & Legacy Migration */}
        <div className="space-y-6">
          {/* Users & Role Permissions Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-amber-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Users & Staff Accounts
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                  {users.length} Active
                </span>
              </div>

              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUser(!showAddUser);
                    setUserActionError(null);
                    setUserActionSuccess(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                    showAddUser
                      ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-2xs'
                  }`}
                >
                  {showAddUser ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add User</span>
                    </>
                  )}
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 flex items-center">
                  <Lock className="w-3 h-3 mr-1 text-slate-400" />
                  Admin Only
                </span>
              )}
            </div>

            {/* Admin status notice */}
            {!isAdmin && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs flex items-center space-x-2">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  You are viewing this table as <strong>{currentUser.name}</strong> ({currentUser.role}). Admin privileges are required to add or delete staff accounts.
                </span>
              </div>
            )}

            {/* User action feedback notifications */}
            {userActionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{userActionSuccess}</span>
                </div>
                <button
                  onClick={() => setUserActionSuccess(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {userActionError && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 text-xs rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{userActionError}</span>
                </div>
                <button
                  onClick={() => setUserActionError(null)}
                  className="text-rose-700 hover:text-rose-900 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Add User Form (Visible to Admin when toggled) */}
            {showAddUser && isAdmin && (
              <form
                onSubmit={handleCreateUser}
                className="p-4 bg-amber-50/50 border border-amber-200/90 rounded-xl space-y-3 text-xs animate-in fade-in duration-150"
              >
                <div className="flex items-center space-x-2 border-b border-amber-200/60 pb-2">
                  <UserPlus className="w-4 h-4 text-amber-700" />
                  <span className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">
                    Create New Staff Account
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maria Delgado"
                      value={newUserName}
                      onChange={e => setNewUserName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Work Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. maria@casacentralstore.com"
                      value={newUserEmail}
                      onChange={e => setNewUserEmail(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    System Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden font-semibold"
                  >
                    <option value="Admin">Administrator (Full system access & user management)</option>
                    <option value="Manager">Manager (Operations, reports, orders & inventory)</option>
                    <option value="Sales">Sales (POS register & customer management)</option>
                    <option value="Support">Support (Sales Support & Logistics)</option>
                    <option value="Accounting">Accounting (Invoicing, payments & financial reports)</option>
                  </select>
                </div>

                {/* Role description note */}
                <div className="bg-white/80 border border-amber-200 rounded-lg p-2.5 text-[11px] text-slate-600">
                  <strong className="text-slate-800">Permissions:</strong> {getRoleDescription(newUserRole)}
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1 border-t border-amber-200/60">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUser(false);
                      setNewUserName('');
                      setNewUserEmail('');
                    }}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingUser}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-2xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {creatingUser ? (
                      <span>Adding User...</span>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Add User Account</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Users List Table */}
            <div className="overflow-x-auto text-xs border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-2">Role</th>
                    <th className="py-2.5 px-2 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => {
                    const isSelf = u.id === currentUser.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div className="flex items-center space-x-1.5">
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{u.email}</td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeStyle(
                              u.role
                            )}`}
                          >
                            {u.role === 'Admin' ? 'Administrator' : u.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {u.status === 'invited' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              Invited (Setup Pending)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {isSelf ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPasswordModalTarget(null);
                                  setShowPasswordModal(true);
                                }}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                                title="Change your account password"
                              >
                                <KeyRound className="w-3 h-3 text-amber-600" />
                                <span>Change Password</span>
                              </button>
                            ) : isAdmin ? (
                              <>
                                {u.status === 'invited' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleViewInvitation(u)}
                                      className="inline-flex items-center space-x-1 px-2 py-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                                      title="View Invitation Setup Link & Email"
                                    >
                                      <KeyRound className="w-3 h-3 text-amber-600" />
                                      <span>Invite Link</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleResendInvite(u)}
                                      disabled={resendingInviteFor === u.id}
                                      className="inline-flex items-center space-x-1 px-2 py-1 text-[11px] font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                                      title="Resend invitation email"
                                    >
                                      <Send className="w-3 h-3 text-teal-600" />
                                      <span>{resendingInviteFor === u.id ? 'Sending...' : 'Resend'}</span>
                                    </button>
                                  </>
                                )}
                                {u.status === 'active' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPasswordModalTarget(u);
                                      setShowPasswordModal(true);
                                    }}
                                    className="inline-flex items-center space-x-1 px-2 py-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                                    title={`Reset password for ${u.name}`}
                                  >
                                    <KeyRound className="w-3 h-3 text-slate-500" />
                                    <span>Reset Pwd</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setUserToDelete(u)}
                                  className="inline-flex items-center space-x-1 px-2 py-1 text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                                  title={`Delete user ${u.name}`}
                                >
                                  <Trash2 className="w-3 h-3 text-rose-600" />
                                  <span>Delete</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">--</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* My Account & Password Security Box */}
            <div className="pt-2 border-t border-slate-100">
              <div className="p-3.5 bg-linear-to-r from-amber-50/60 to-slate-50 border border-amber-200/70 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 block text-xs">
                      Account Security: {currentUser.name} ({currentUser.email})
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Keep your credentials up-to-date to maintain operational security and audit compliance.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordModalTarget(null);
                    setShowPasswordModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg shadow-2xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shrink-0 text-xs"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Change Password</span>
                </button>
              </div>
            </div>
          </div>

          {/* Google Sheets & Drive Master Cloud Backup */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Google Sheets & Drive Master Backup
                  </h2>
                  <p className="text-[10px] text-slate-400">All 5 store domains in a single consolidated spreadsheet</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                5 Tabs
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Consolidate and back up all live store records into a single Google Sheet file organized into dedicated tabs:
              <strong> Orders</strong>, <strong>Logistics</strong>, <strong>Invoices</strong>, <strong>Customers</strong>, and <strong>Inventory</strong>.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[10px] py-1 bg-slate-50 rounded-lg border border-slate-200/80">
              <div className="p-1 font-semibold text-slate-700">1. Orders</div>
              <div className="p-1 font-semibold text-slate-700">2. Logistics</div>
              <div className="p-1 font-semibold text-slate-700">3. Invoices</div>
              <div className="p-1 font-semibold text-slate-700">4. Customers</div>
              <div className="p-1 font-semibold text-slate-700">5. Inventory</div>
            </div>
            <button
              type="button"
              onClick={() => setShowBackupModal(true)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs flex items-center justify-center cursor-pointer text-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              <span>Launch Google Sheets Backup Manager</span>
            </button>
          </div>

          {/* Legacy Google Sheets Data Migration (CSV) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <FileSpreadsheet className="w-4 h-4 text-amber-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Legacy Google Sheets Data Migration (CSV)
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              Import historical datasets from the previous Google Sheets POS (Customers, Inventory, or Orders archive)
              without requiring manual data re-entry.
            </p>
            {migrationResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-lg flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
                {migrationResult}
              </div>
            )}
            {migrationError && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 text-xs rounded-lg flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 text-rose-600" />
                {migrationError}
              </div>
            )}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Target Entity Dataset</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMigrationType('customers')}
                    className={`py-1.5 px-3 rounded-lg border font-semibold text-center transition-all cursor-pointer ${
                      migrationType === 'customers'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Customers CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setMigrationType('inventory')}
                    className={`py-1.5 px-3 rounded-lg border font-semibold text-center transition-all cursor-pointer ${
                      migrationType === 'inventory'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Inventory Assets CSV
                  </button>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Select CSV Export File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={e => setCsvFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>
              <button
                type="button"
                disabled={csvImporting || !csvFile}
                onClick={handleCsvUpload}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-2xs flex items-center justify-center cursor-pointer disabled:opacity-40"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                {csvImporting ? 'Importing CSV Records...' : `Import ${migrationType.toUpperCase()} Dataset`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white">
                    Confirm Delete User
                  </h3>
                  <p className="text-xs text-rose-100">
                    Administrator access required
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="text-rose-200 hover:text-white p-1 rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 space-y-1">
                <p className="font-bold text-sm">
                  Are you sure you want to delete this staff user?
                </p>
                <p className="text-xs text-rose-800">
                  This will remove the user from active registers and system access.
                </p>
              </div>

              {/* Target User Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Name</span>
                  <span className="font-bold text-slate-900 text-sm">{userToDelete.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Email</span>
                  <span className="font-mono text-slate-800">{userToDelete.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Role</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeStyle(userToDelete.role)}`}>
                    {userToDelete.role === 'Admin' ? 'Administrator' : userToDelete.role}
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-2 text-[11px] text-slate-500 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Data Safety Guarantee:</strong> If this staff member has closed past orders or recorded payments, their account will be deactivated rather than deleted from history to maintain complete audit compliance.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={deletingUser}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deletingUser}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {deletingUser ? (
                    <span>Deleting...</span>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete User Account</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invitation Dispatched Details Modal */}
      {inviteModalData && (
        <InvitationSentModal
          user={inviteModalData.user}
          invitation={inviteModalData.invitation}
          email={inviteModalData.email}
          onClose={() => setInviteModalData(null)}
        />
      )}

      {/* Google Sheets Backup Manager Modal */}
      <GoogleSheetsBackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
      />

      {/* Google Apps Script Relay Helper & Code Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 bg-linear-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-950">
                    Google Apps Script Email Relay Code
                  </h3>
                  <p className="text-[11px] text-slate-900 font-medium">
                    Deploy this 15-line script to send emails directly with zero SMTP!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="text-slate-950/80 hover:text-slate-950 p-1.5 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs bg-slate-50">
              {/* Instructions steps */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>3-Minute Setup Instructions:</span>
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-700 text-[11px] leading-relaxed">
                  <li>
                    Open <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-amber-700 underline font-bold">script.google.com</a> and click <strong>New project</strong>.
                  </li>
                  <li>
                    Replace all existing code with the script below, and save (<kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded text-[10px]">Ctrl+S</kbd>).
                  </li>
                  <li className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-950 font-medium">
                    <strong className="text-amber-900 block mb-1">⚠️ MANDATORY ONE-TIME STEP: Grant Google Permissions</strong>
                    In the top toolbar dropdown menu (next to &quot;Debug&quot;), select <strong>authorizeScript</strong>. Click the <strong>▶ Run</strong> button.
                    <ul className="list-disc list-inside mt-1 ml-2 space-y-0.5 text-[10px] text-amber-900">
                      <li>A popup will ask for permissions &rarr; click <strong>Review permissions</strong></li>
                      <li>Choose your Google Account</li>
                      <li>Click <strong>Advanced</strong> (small text on bottom-left) &rarr; <strong>Go to Casa Central Relay (unsafe)</strong></li>
                      <li>Click <strong>Allow</strong> &rarr; wait for &quot;Execution completed&quot; in the log box</li>
                    </ul>
                  </li>
                  <li>
                    Click <strong>Deploy &rarr; New deployment</strong> in the top right corner.
                  </li>
                  <li>
                    Click the gear icon next to &quot;Select type&quot;, choose <strong>Web app</strong>.
                  </li>
                  <li>
                    Set <strong>Execute as:</strong> <code className="bg-slate-100 text-slate-800 px-1 rounded">Me</code> and <strong>Who has access:</strong> <code className="bg-amber-100 text-amber-900 font-bold px-1 rounded">Anyone</code>.
                  </li>
                  <li>
                    Click <strong>Deploy</strong> and copy your <strong>Web app URL</strong> (ends in <code className="text-amber-700 font-bold">/exec</code>).
                  </li>
                  <li>
                    Paste the Web app URL into <strong>Settings &rarr; Email Delivery</strong> and click <strong>Save</strong>!
                  </li>
                  <li className="text-slate-500 italic">
                    Already deployed previously before authorizing? No need to redeploy! Just run <strong>authorizeScript</strong> once in the editor, and your existing URL will start working immediately.
                  </li>
                </ol>
              </div>

              {/* Code Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700 text-xs">Ready-to-Deploy Code:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(APPS_SCRIPT_SAMPLE_CODE);
                      setScriptCopied(true);
                      setTimeout(() => setScriptCopied(false), 2500);
                    }}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    {scriptCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Script Code</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[300px] border border-slate-800">
                  {APPS_SCRIPT_SAMPLE_CODE}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordModalTarget(null);
        }}
        currentUser={currentUser}
        targetUser={passwordModalTarget}
        onSuccess={msg => {
          setUserActionSuccess(msg);
          setUserActionError(null);
        }}
      />
    </div>
  );
};

