import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Layers,
  Database,
  X,
  FileDown,
  Info,
  Check,
  Send,
  Link2,
  Code2,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  buildSheetsData,
  buildCsv,
  buildTsv,
  downloadFile,
  syncDataToGoogleSheetWebhook,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  BackupDataset,
} from '../../services/googleSheetsBackup.ts';
import { api } from '../../services/api.ts';
import * as XLSX from 'xlsx';

interface GoogleSheetsBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsBackupModal: React.FC<GoogleSheetsBackupModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Live Backup Dataset
  const [dataset, setDataset] = useState<BackupDataset | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Active Tab Preview in the Modal Table
  const [activeTab, setActiveTab] = useState<'orders' | 'logistics' | 'invoices' | 'customers' | 'inventory'>('orders');
  const [tableSearch, setTableSearch] = useState('');

  // Google Sheet Webhook & URL Settings
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('casa_google_sheet_url') || '';
    }
    return '';
  });
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('casa_google_sheet_webhook_url') || '';
    }
    return '';
  });
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // UI States
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [showScriptGuide, setShowScriptGuide] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Load Data and Settings on open
  useEffect(() => {
    if (isOpen) {
      loadData();
      loadConfig();
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

  const loadConfig = async () => {
    try {
      const config = await api.getGoogleSheetConfig();
      if (config.webhookUrl) {
        setWebhookUrl(config.webhookUrl);
        localStorage.setItem('casa_google_sheet_webhook_url', config.webhookUrl);
      }
      if (config.sheetUrl) {
        setSheetUrl(config.sheetUrl);
        localStorage.setItem('casa_google_sheet_url', config.sheetUrl);
      }
      if (config.autoSync !== undefined) {
        setAutoSync(config.autoSync);
      }
      if (config.lastSync) {
        setLastSyncTime(config.lastSync);
      }
    } catch (err) {
      console.warn('Config fetch note:', err);
    }
  };

  const handleSaveConfig = async () => {
    try {
      localStorage.setItem('casa_google_sheet_url', sheetUrl);
      localStorage.setItem('casa_google_sheet_webhook_url', webhookUrl);
      await api.updateGoogleSheetConfig({
        webhookUrl: webhookUrl.trim(),
        sheetUrl: sheetUrl.trim(),
        autoSync,
      });
      setSyncSuccessMsg('Configuration saved successfully.');
      setTimeout(() => setSyncSuccessMsg(null), 3500);
    } catch (err: any) {
      setSyncErrorMsg(err.message || 'Failed to save configuration.');
    }
  };

  // Pre-formatted 5 datasets
  const formattedSheets = useMemo(() => {
    if (!dataset) return null;
    return buildSheetsData(dataset);
  }, [dataset]);

  // Copy active tab (or all orders) to clipboard as TSV for immediate Google Sheet pasting (Ctrl+V)
  const handleCopyToClipboard = (tabKey: 'orders' | 'logistics' | 'invoices' | 'customers' | 'inventory') => {
    if (!formattedSheets) return;
    const rows = formattedSheets[tabKey];
    if (!rows || rows.length === 0) return;

    const tsv = buildTsv(rows);
    navigator.clipboard.writeText(tsv).then(() => {
      setCopiedTab(tabKey);
      setTimeout(() => setCopiedTab(null), 3000);
    });
  };

  // Download direct CSV of the attached Orders Sheet
  const handleDownloadCsv = (tabKey: 'orders' | 'logistics' | 'invoices' | 'customers' | 'inventory') => {
    if (!formattedSheets) return;
    const rows = formattedSheets[tabKey];
    if (!rows || rows.length === 0) return;

    const csv = buildCsv(rows);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `CasaCentral_${tabKey.toUpperCase()}_GoogleSheet_${dateStr}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8;');
  };

  // Download multi-tab Excel (.xlsx) file with all 5 sheets
  const handleDownloadAllExcel = () => {
    if (!formattedSheets) return;
    try {
      const workbook = XLSX.utils.book_new();
      const tabs: Array<{ name: string; data: any[][] }> = [
        { name: 'Orders', data: formattedSheets.orders },
        { name: 'Logistics', data: formattedSheets.logistics },
        { name: 'Invoices', data: formattedSheets.invoices },
        { name: 'Customers', data: formattedSheets.customers },
        { name: 'Inventory', data: formattedSheets.inventory },
      ];

      tabs.forEach(tab => {
        const ws = XLSX.utils.aoa_to_sheet(tab.data);
        XLSX.utils.book_append_sheet(workbook, ws, tab.name);
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `Casa_Central_Store_Master_GoogleSheet_Backup_${dateStr}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (err: any) {
      setSyncErrorMsg(err.message || 'Failed to export Excel file.');
    }
  };

  // Sync / Log directly to Google Sheet Webhook
  const handleSyncToSheet = async () => {
    if (!webhookUrl.trim()) {
      setSyncErrorMsg('Please provide a Google Sheet Webhook URL below to log data directly.');
      setShowScriptGuide(true);
      return;
    }

    if (!dataset || !formattedSheets) {
      await loadData();
    }

    setIsSyncing(true);
    setSyncErrorMsg(null);
    setSyncSuccessMsg(null);

    try {
      // 1. Sync through frontend Webhook dispatcher
      const currentRows = formattedSheets?.[activeTab] || [];
      await syncDataToGoogleSheetWebhook(webhookUrl.trim(), {
        action: 'sync',
        tab: activeTab === 'orders' ? 'Orders' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1),
        rows: currentRows,
      });

      // 2. Also register in backend settings
      await api.logToGoogleSheet({
        webhookUrl: webhookUrl.trim(),
        action: 'sync',
        tab: activeTab === 'orders' ? 'Orders' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1),
        rows: currentRows,
      });

      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(new Date().toISOString());
      setSyncSuccessMsg(`Successfully logged ${currentRows.length - 1} rows to Google Sheet (${timeStr})!`);
      setTimeout(() => setSyncSuccessMsg(null), 5000);
    } catch (err: any) {
      setSyncErrorMsg(err.message || 'Failed to dispatch data to Google Sheet webhook.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE).then(() => {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 3000);
    });
  };

  // Filter rows for the active tab based on tableSearch
  const currentTabRows = useMemo(() => {
    if (!formattedSheets) return { headers: [], rows: [] };
    const sheetData = formattedSheets[activeTab];
    if (!sheetData || sheetData.length === 0) return { headers: [], rows: [] };

    const headers = sheetData[0];
    const dataRows = sheetData.slice(1);

    if (!tableSearch.trim()) {
      return { headers, rows: dataRows };
    }

    const q = tableSearch.toLowerCase().trim();
    const filtered = dataRows.filter(row =>
      row.some(cell => String(cell || '').toLowerCase().includes(q))
    );
    return { headers, rows: filtered };
  }, [formattedSheets, activeTab, tableSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs font-sans animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[96dvh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                  Google Sheet Master Log &amp; Backup
                </h2>
                <span className="inline-block text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  Zero-Auth Master Sheet
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
                Directly log and sync Orders (32 Columns), Logistics, Invoices, Customers &amp; Inventory to Google Sheets
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
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5">

          {/* Quick Action & Sync Panel */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                  Zero-Auth Google Sheet Synchronization
                </span>
                <h3 className="text-base font-black tracking-tight text-white mt-0.5 flex items-center space-x-2">
                  <span>Attached Google Sheet Data Logger</span>
                  {lastSyncTime && (
                    <span className="text-[11px] font-normal text-slate-400 font-mono">
                      (Last Logged: {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  All transactions and records are formatted to match the attached master sheet layout. Copy and paste with 1-click or log directly via webhook without requiring Google Sign-in or cloud setup.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1-Click Copy for Google Sheets */}
                <button
                  type="button"
                  onClick={() => handleCopyToClipboard(activeTab)}
                  className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center transition-all cursor-pointer"
                  title="Copies current tab as Tab-Separated Values. Press Ctrl+V in your Google Sheet to paste all columns cleanly!"
                >
                  {copiedTab === activeTab ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5 text-slate-950" />
                      <span>Copied! Paste into Google Sheet (Ctrl+V)</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1.5" />
                      <span>Copy {activeTab.toUpperCase()} for Google Sheet</span>
                    </>
                  )}
                </button>

                {/* Direct Sync via Webhook */}
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleSyncToSheet}
                  className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center transition-all cursor-pointer disabled:opacity-50"
                  title="Directly sends all rows to your Google Sheet webhook"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                      <span>Logging to Google Sheet...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1.5" />
                      <span>Log / Sync to Sheet Now</span>
                    </>
                  )}
                </button>

                {/* Download CSV */}
                <button
                  type="button"
                  onClick={() => handleDownloadCsv(activeTab)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center transition-colors cursor-pointer"
                  title="Download CSV formatted identically to the attached Google Sheet"
                >
                  <FileDown className="w-4 h-4 mr-1.5 text-emerald-400" />
                  <span>Download .CSV</span>
                </button>

                {/* Download Excel 5-in-1 */}
                <button
                  type="button"
                  onClick={handleDownloadAllExcel}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center transition-colors cursor-pointer"
                  title="Download all 5 modules in a single .xlsx spreadsheet"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-1.5 text-amber-400" />
                  <span>Download .XLSX (5 Tabs)</span>
                </button>
              </div>
            </div>

            {/* Google Sheet Webhook & URL Settings */}
            <div className="border-t border-slate-800/80 pt-3.5 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs items-center">
              <div className="md:col-span-6">
                <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Google Sheet Link / ID (Optional)</span>
                  </span>
                  {sheetUrl.trim() && (
                    <a
                      href={sheetUrl.startsWith('http') ? sheetUrl : `https://docs.google.com/spreadsheets/d/${sheetUrl}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                    >
                      <span>Open Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </label>
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={e => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Google Apps Script Webhook URL (For Direct Auto-Logging)</span>
                  <button
                    type="button"
                    onClick={() => setShowScriptGuide(!showScriptGuide)}
                    className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center space-x-0.5 cursor-pointer"
                  >
                    <Code2 className="w-3 h-3 mr-0.5" />
                    <span>Setup Guide</span>
                  </button>
                </label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-2 flex items-end justify-end space-x-2 pt-4 md:pt-0">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="w-full px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg cursor-pointer transition-colors text-center text-xs"
                >
                  Save Settings
                </button>
              </div>
            </div>

            {/* Notification Alerts */}
            {syncSuccessMsg && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{syncSuccessMsg}</span>
              </div>
            )}

            {syncErrorMsg && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-semibold">{syncErrorMsg}</span>
              </div>
            )}
          </div>

          {/* Collapsible 30-Second Google Apps Script Setup Guide */}
          {showScriptGuide && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 text-amber-950 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <h4 className="text-sm font-bold text-amber-950">
                    How to Connect Your Google Sheet (Zero-Auth, 30 Seconds)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScriptGuide(false)}
                  className="text-amber-700 hover:text-amber-950 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ol className="text-xs space-y-1.5 list-decimal list-inside text-amber-900 leading-relaxed">
                <li>Open your Google Sheet, click <strong>Extensions &gt; Apps Script</strong> in the top menu.</li>
                <li>Delete any code in the editor and <strong>paste the script below</strong>:</li>
              </ol>

              <div className="relative">
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-700">
                  {GOOGLE_APPS_SCRIPT_TEMPLATE}
                </pre>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded-md shadow-xs flex items-center space-x-1 cursor-pointer"
                >
                  {copiedScript ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedScript ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <ol start={3} className="text-xs space-y-1.5 list-decimal list-inside text-amber-900 leading-relaxed">
                <li>Click <strong>Deploy &gt; New deployment</strong>, select type <strong>Web app</strong>.</li>
                <li>Set <strong>Execute as: Me</strong>, and <strong>Who has access: Anyone</strong>.</li>
                <li>Click <strong>Deploy</strong> and copy the generated Web app URL into the <strong>Google Apps Script Webhook URL</strong> box above!</li>
              </ol>
            </div>
          )}

          {/* Module Tab Selector & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'orders'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Orders (Master - 32 Columns)</span>
                <span className="font-mono text-[10px] bg-slate-900/10 px-1.5 py-0.2 rounded-full">
                  {dataset?.summary.totalOrders ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('logistics')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'logistics'
                    ? 'bg-blue-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Logistics</span>
                <span className="font-mono text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                  {dataset?.summary.totalLogistics ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'invoices'
                    ? 'bg-indigo-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Invoices</span>
                <span className="font-mono text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                  {dataset?.summary.totalInvoices ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('customers')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'customers'
                    ? 'bg-purple-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Customers</span>
                <span className="font-mono text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                  {dataset?.summary.totalCustomers ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'inventory'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Inventory</span>
                <span className="font-mono text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                  {dataset?.summary.totalInventory ?? 0}
                </span>
              </button>
            </div>

            {/* Search Filter & Refresh */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                  placeholder="Filter table rows..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500 w-44 sm:w-56"
                />
              </div>
              <button
                type="button"
                onClick={loadData}
                disabled={loadingData}
                className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-300 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Refresh live dataset"
              >
                <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Interactive Google Sheet Table Grid */}
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-white">
            <div className="bg-slate-800 text-slate-200 px-4 py-2 border-b border-slate-700 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">
                  {activeTab === 'orders'
                    ? 'Orders Tab — Attached Master Google Sheet Layout'
                    : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Tab Preview`}
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  ({currentTabRows.rows.length} rows &bull; {currentTabRows.headers.length} columns)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleCopyToClipboard(activeTab)}
                  className="text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 flex items-center space-x-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy for Sheet</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="sticky top-0 z-10 bg-slate-900 text-white uppercase text-[10px] tracking-wider select-none font-bold">
                  <tr>
                    <th className="px-2.5 py-2 border-r border-slate-700 w-10 text-center bg-slate-950 text-slate-400 font-mono">
                      #
                    </th>
                    {currentTabRows.headers.map((h, idx) => (
                      <th
                        key={idx}
                        className="px-3 py-2 border-r border-slate-700 whitespace-nowrap text-slate-100 font-bold"
                      >
                        {String(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-sans text-slate-800">
                  {loadingData ? (
                    <tr>
                      <td
                        colSpan={currentTabRows.headers.length + 1}
                        className="py-12 text-center text-slate-400"
                      >
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                        <span>Loading live dataset...</span>
                      </td>
                    </tr>
                  ) : currentTabRows.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={currentTabRows.headers.length + 1}
                        className="py-10 text-center text-slate-400"
                      >
                        No records match the current filter.
                      </td>
                    </tr>
                  ) : (
                    currentTabRows.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={`hover:bg-amber-50/60 transition-colors ${
                          rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                        }`}
                      >
                        <td className="px-2.5 py-1.5 border-r border-slate-200 text-center font-mono text-[10px] text-slate-400 bg-slate-100/70 select-none">
                          {rIdx + 1}
                        </td>
                        {row.map((cell: any, cIdx: number) => {
                          const val = cell === null || cell === undefined ? '' : String(cell);
                          const isNumeric = !isNaN(Number(val)) && val.trim() !== '' && !val.includes('-') && !val.includes('/');
                          return (
                            <td
                              key={cIdx}
                              className={`px-3 py-1.5 border-r border-slate-200 whitespace-nowrap max-w-[280px] truncate ${
                                isNumeric ? 'font-mono text-right' : ''
                              } ${cIdx === 0 ? 'font-bold font-mono text-slate-900' : ''}`}
                              title={val}
                            >
                              {val || <span className="text-slate-300">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-medium">
              Live SQLite database connected &bull; Zero Google Cloud or Firebase authentication required
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleCopyToClipboard(activeTab)}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-bold transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy TSV</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
