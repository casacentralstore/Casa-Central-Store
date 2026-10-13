import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Cloud,
  Layers,
  ArrowRight,
  Database,
  X,
  FileDown,
  Info,
  Clock,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import {
  initGoogleAuth,
  googleSignIn,
  googleLogout,
  getAccessToken,
  getGoogleUser,
  SCOPES,
} from '../../services/googleAuth.ts';
import {
  createGoogleSheetBackup,
  updateGoogleSheetBackup,
  BackupDataset,
  BackupResult,
} from '../../services/googleSheetsBackup.ts';
import { api } from '../../services/api.ts';
import * as XLSX from 'xlsx';
import { buildSheetsData } from '../../services/googleSheetsBackup.ts';

interface GoogleSheetsBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsBackupModal: React.FC<GoogleSheetsBackupModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Google Auth State
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Backup Data State
  const [dataset, setDataset] = useState<BackupDataset | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Backup Execution State
  const [isExporting, setIsExporting] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [lastResult, setLastResult] = useState<BackupResult | null>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('casa_last_sheets_backup');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  // Target Spreadsheet ID for updating
  const [targetSpreadsheetId, setTargetSpreadsheetId] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('casa_last_sheets_backup');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.spreadsheetId || '';
        } catch {
          return '';
        }
      }
    }
    return '';
  });
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Fetch current live database summary when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const data = await api.getBackupDataset();
      setDataset(data);
    } catch (err: any) {
      setDataError(err.message || 'Failed to fetch database records');
    } finally {
      setLoadingData(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setAccessToken(result.accessToken);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to connect Google account');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await googleLogout();
      setGoogleUser(null);
      setAccessToken(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  const handleCreateNewBackup = async () => {
    if (!accessToken) {
      await handleGoogleSignIn();
      return;
    }
    if (!dataset) {
      await loadData();
    }

    setIsExporting(true);
    setAuthError(null);
    try {
      const currentToken = (await getAccessToken()) || accessToken;
      const dataToExport = dataset || (await api.getBackupDataset());

      const result = await createGoogleSheetBackup(currentToken, dataToExport, msg => {
        setProgressMsg(msg);
      });

      setLastResult(result);
      setTargetSpreadsheetId(result.spreadsheetId);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('casa_last_sheets_backup', JSON.stringify(result));
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to create backup spreadsheet');
    } finally {
      setIsExporting(false);
      setProgressMsg('');
    }
  };

  const handleUpdateExistingBackup = async () => {
    if (!targetSpreadsheetId.trim()) {
      setAuthError('Please enter a valid Google Spreadsheet ID to update.');
      return;
    }

    setShowUpdateConfirm(false);
    setIsExporting(true);
    setAuthError(null);
    try {
      const currentToken = (await getAccessToken()) || accessToken;
      if (!currentToken) throw new Error('Google authorization token not found. Please sign in.');
      const dataToExport = dataset || (await api.getBackupDataset());

      const result = await updateGoogleSheetBackup(
        currentToken,
        targetSpreadsheetId.trim(),
        dataToExport,
        msg => {
          setProgressMsg(msg);
        }
      );

      setLastResult(result);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('casa_last_sheets_backup', JSON.stringify(result));
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to update backup spreadsheet');
    } finally {
      setIsExporting(false);
      setProgressMsg('');
    }
  };

  const handleDownloadExcel = () => {
    if (!dataset) return;
    try {
      const sheetsData = buildSheetsData(dataset);
      const workbook = XLSX.utils.book_new();

      const tabs: Array<{ name: string; data: any[][] }> = [
        { name: 'Orders', data: sheetsData.orders },
        { name: 'Logistics', data: sheetsData.logistics },
        { name: 'Invoices', data: sheetsData.invoices },
        { name: 'Customers', data: sheetsData.customers },
        { name: 'Inventory', data: sheetsData.inventory },
      ];

      tabs.forEach(tab => {
        const ws = XLSX.utils.aoa_to_sheet(tab.data);
        XLSX.utils.book_append_sheet(workbook, ws, tab.name);
      });

      const fileName = `Casa_Central_Store_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to export Excel file');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs font-sans animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[95dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                  Google Sheet Master Cloud Backup
                </h2>
                <span className="hidden sm:inline-block text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  5 Datasets in 1 File
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
                Consolidate Orders, Logistics, Invoices, Customers, and Inventory into a single Google Sheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">

          {/* Account Connection Status Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                  googleUser ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {googleUser?.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Google Account'}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <Cloud className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-900">
                    {googleUser ? (googleUser.displayName || googleUser.email) : 'Google Workspace Not Connected'}
                  </span>
                  {googleUser ? (
                    <span className="inline-flex items-center text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.2 rounded border border-emerald-300">
                      <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" /> Connected
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.2 rounded">
                      Action Required
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {googleUser
                    ? `Authenticated with Google Sheets and Google Drive permissions`
                    : 'Sign in with your Google Account to authorize spreadsheet creation in Google Drive'}
                </p>
              </div>
            </div>

            <div>
              {googleUser ? (
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono text-slate-500 hidden md:inline">
                    {googleUser.email}
                  </span>
                  <button
                    onClick={handleGoogleSignOut}
                    className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-lg flex items-center transition-colors cursor-pointer"
                    title="Disconnect Google Account"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={handleGoogleSignIn}
                  className="gsi-material-button"
                >
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        <path fill="none" d="M0 0h48v48H0z" />
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">
                      {authLoading ? 'Connecting...' : 'Sign in with Google'}
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {authError && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{authError}</div>
            </div>
          )}

          {/* Tabular Dataset Modules Preview (5 Cards) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-amber-500" />
                <span>Target Backup Tabs (Consolidated into 1 File)</span>
              </h3>
              <button
                onClick={loadData}
                disabled={loadingData}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loadingData ? 'animate-spin' : ''}`} />
                <span>Refresh Counts</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Tab 1: Orders */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:border-amber-400 transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Tab 1
                    </span>
                    <span className="font-mono text-sm font-black text-slate-900">
                      {dataset?.summary.totalOrders ?? '—'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-2">Orders</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Sales orders, line items, pricing, tax rates, sales reps &amp; payment methods.
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-mono">
                  31 Columns
                </div>
              </div>

              {/* Tab 2: Logistics */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:border-blue-400 transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      Tab 2
                    </span>
                    <span className="font-mono text-sm font-black text-slate-900">
                      {dataset?.summary.totalLogistics ?? '—'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-2">Logistics</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    SO numbers, carriers, tracking #, delivery addresses, schedules &amp; fulfillment state.
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-mono">
                  16 Columns
                </div>
              </div>

              {/* Tab 3: Invoices */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:border-indigo-400 transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                      Tab 3
                    </span>
                    <span className="font-mono text-sm font-black text-slate-900">
                      {dataset?.summary.totalInvoices ?? '—'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-2">Invoices</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Invoice #, billing dates, totals, payments collected, balance due &amp; status.
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-mono">
                  19 Columns
                </div>
              </div>

              {/* Tab 4: Customers */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:border-purple-400 transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                      Tab 4
                    </span>
                    <span className="font-mono text-sm font-black text-slate-900">
                      {dataset?.summary.totalCustomers ?? '—'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-2">Customers</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Customer directory, phone, email, addresses, order history &amp; lifetime spend.
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-mono">
                  14 Columns
                </div>
              </div>

              {/* Tab 5: Inventory */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:border-emerald-400 transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Tab 5
                    </span>
                    <span className="font-mono text-sm font-black text-slate-900">
                      {dataset?.summary.totalInventory ?? '—'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-2">Inventory</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    SKU catalog, serials, condition, stock counts, cost, prices &amp; valuation.
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-mono">
                  16 Columns
                </div>
              </div>
            </div>
          </div>

          {/* Active Backup Actions */}
          <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                  Cloud Synchronization
                </span>
                <h3 className="text-base font-black tracking-tight text-white mt-0.5">
                  Backup to Google Sheets Now
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Generates an all-in-one spreadsheet with formatted headers and frozen rows in your Google Drive.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleCreateNewBackup}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center transition-all cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      <span>{progressMsg || 'Generating Google Sheet...'}</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      <span>Create New Google Sheet Backup</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center transition-colors cursor-pointer"
                  title="Download offline Excel backup file (.xlsx) with all 5 tabs"
                >
                  <FileDown className="w-4 h-4 mr-1.5 text-slate-400" />
                  <span>Download .XLSX</span>
                </button>
              </div>
            </div>

            {/* Sync to Existing Spreadsheet Section */}
            <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex-1 max-w-md">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Update an Existing Backup Spreadsheet
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={targetSpreadsheetId}
                    onChange={e => setTargetSpreadsheetId(e.target.value)}
                    placeholder="Enter Google Spreadsheet ID (e.g. 1BxiMVs...)"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    disabled={isExporting || !targetSpreadsheetId.trim() || !accessToken}
                    onClick={() => setShowUpdateConfirm(true)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg shrink-0 disabled:opacity-40 cursor-pointer"
                  >
                    Sync / Overwrite
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center">
                <Info className="w-3.5 h-3.5 text-amber-400 mr-1.5 shrink-0" />
                <span>Syncing refreshes all 5 tabs inside the specified sheet.</span>
              </div>
            </div>
          </div>

          {/* Last Completed Backup Success Banner */}
          {lastResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">
                      Backup Successfully Saved to Google Drive
                    </h4>
                    <p className="text-[11px] text-emerald-800">
                      {lastResult.title}
                    </p>
                  </div>
                </div>

                <a
                  href={lastResult.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <span>Open in Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-emerald-200/70 text-[10px] text-emerald-900">
                <div>
                  <span className="text-emerald-700 block">Orders Tab</span>
                  <span className="font-bold font-mono">{lastResult.counts.orders} rows</span>
                </div>
                <div>
                  <span className="text-emerald-700 block">Logistics Tab</span>
                  <span className="font-bold font-mono">{lastResult.counts.logistics} rows</span>
                </div>
                <div>
                  <span className="text-emerald-700 block">Invoices Tab</span>
                  <span className="font-bold font-mono">{lastResult.counts.invoices} rows</span>
                </div>
                <div>
                  <span className="text-emerald-700 block">Customers Tab</span>
                  <span className="font-bold font-mono">{lastResult.counts.customers} rows</span>
                </div>
                <div>
                  <span className="text-emerald-700 block">Inventory Tab</span>
                  <span className="font-bold font-mono">{lastResult.counts.inventory} rows</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encrypted Google OAuth token stored in memory only</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Overwrite / Update Mutation */}
      {showUpdateConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs font-sans animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                Confirm Google Sheet Update
              </h3>
              <p className="text-xs text-slate-600 mt-2">
                Are you sure you want to update Google Spreadsheet:
              </p>
              <div className="mt-2 p-2 bg-slate-100 rounded-lg text-slate-800 font-mono text-[11px] break-all">
                {targetSpreadsheetId}
              </div>
              <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-3 text-left">
                <strong>Notice:</strong> This action will clear and overwrite all 5 tabs (Orders, Logistics, Invoices, Customers, Inventory) with current database records.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowUpdateConfirm(false)}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateExistingBackup}
                className="py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
              >
                Yes, Update Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
