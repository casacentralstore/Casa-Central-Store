import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Order, TaxSettings, User } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatCurrency, formatDateTime } from '../../utils/formatters.ts';
import {
  FileText,
  Search,
  CheckCircle2,
  RefreshCw,
  Edit2,
  X,
  FileSpreadsheet,
  AlertCircle,
  Hash,
  Eye,
  Clock,
  Mail,
  Send,
} from 'lucide-react';
import { OrderDetailModal } from '../orders/OrderDetailModal.tsx';
import { PaymentReminderModal } from './PaymentReminderModal.tsx';

interface InvoicesListProps {
  settings: TaxSettings;
  currentUser: User;
  onOpenOrder?: (orderId: string) => void;
}

type TabFilter = 'ALL' | 'PENDING' | 'INVOICED';

export const InvoicesList: React.FC<InvoicesListProps> = ({
  settings,
  currentUser,
  onOpenOrder,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState<string>('');
  const [tabFilter, setTabFilter] = useState<TabFilter>('ALL');

  // Modal State for Invoice Number entry
  const [invoicingOrder, setInvoicingOrder] = useState<Order | null>(null);
  const [invoiceNumberInput, setInvoiceNumberInput] = useState<string>('');
  const [savingInvoice, setSavingInvoice] = useState<boolean>(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // Order Details Modal
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);

  // Payment Reminder to Sales and Support Modal
  const [reminderModalOpen, setReminderModalOpen] = useState<boolean>(false);

  // Success Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOrders({
        invoices: 'true',
        limit: 100,
      });
      const fulfilledList = (res.orders || []).filter(
        o => o.is_fulfilled || (o.so_number && o.so_number.trim() !== '')
      );
      setOrders(fulfilledList);
    } catch (err: any) {
      console.error('Failed to load fulfilled orders for invoices module:', err);
      setError(err.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const hasInvoice = Boolean(order.invoice_number && order.invoice_number.trim() !== '');
      if (tabFilter === 'PENDING' && hasInvoice) return false;
      if (tabFilter === 'INVOICED' && !hasInvoice) return false;

      if (!search.trim()) return true;
      const s = search.toLowerCase().trim();
      const soNum = (order.so_number || '').toLowerCase();
      const orderNum = (order.order_number || '').toLowerCase();
      const custName = (order.customer_name || order.customer?.display_name || '').toLowerCase();
      const custPhone = (order.customer_phone || order.customer?.phone || '').toLowerCase();
      const invNum = (order.invoice_number || '').toLowerCase();
      const status = (order.status || '').toLowerCase();

      return (
        soNum.includes(s) ||
        orderNum.includes(s) ||
        custName.includes(s) ||
        custPhone.includes(s) ||
        invNum.includes(s) ||
        status.includes(s)
      );
    });
  }, [orders, tabFilter, search]);

  const metrics = useMemo(() => {
    const totalFulfilled = orders.length;
    const invoicedCount = orders.filter(o => o.invoice_number && o.invoice_number.trim() !== '').length;
    const pendingCount = totalFulfilled - invoicedCount;
    const totalInvoiceAmount = orders.reduce((sum, o) => sum + (o.invoice_total || 0), 0);
    const totalBalanceDue = orders.reduce((sum, o) => sum + (o.balance_due || 0), 0);
    const outstandingCount = orders.filter(
      o => (o.status === 'Pending' || o.status === 'Partially Paid') && (o.balance_due || 0) > 0
    ).length;

    return {
      totalFulfilled,
      invoicedCount,
      pendingCount,
      totalInvoiceAmount,
      totalBalanceDue,
      outstandingCount,
    };
  }, [orders]);

  const handleOpenInvoiceModal = (order: Order) => {
    setInvoicingOrder(order);
    if (order.invoice_number && order.invoice_number.trim() !== '') {
      setInvoiceNumberInput(order.invoice_number);
    } else {
      const digits = (order.so_number || order.order_number || '').replace(/[^0-9]/g, '');
      setInvoiceNumberInput(digits ? `INV-${digits}` : 'INV-');
    }
    setInvoiceError(null);
  };

  const handleSaveInvoiceNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoicingOrder) return;
    const trimmed = invoiceNumberInput.trim();
    if (!trimmed) {
      setInvoiceError('Please enter an internal invoice number.');
      return;
    }

    setSavingInvoice(true);
    setInvoiceError(null);
    try {
      await api.updateInvoiceNumber(invoicingOrder.id, trimmed);
      const nowIso = new Date().toISOString();
      setOrders(prev =>
        prev.map(o => (o.id === invoicingOrder.id ? { ...o, invoice_number: trimmed, invoiced_at: nowIso } : o))
      );
      showToast(
        `Invoice #${trimmed} successfully recorded for ${invoicingOrder.so_number || invoicingOrder.order_number}!`
      );
      setInvoicingOrder(null);
    } catch (err: any) {
      console.error('Failed to update invoice number:', err);
      setInvoiceError(err.message || 'Failed to save invoice number.');
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredOrders.length === 0) return;
    const headers = [
      'Sales Order',
      'Order Number',
      'Transaction Date',
      'Customer Name',
      'Customer Phone',
      'Status',
      'Invoice Total',
      'Paid',
      'Balance Due',
      'Invoice Number',
      'Action Status',
    ];
    const rows = filteredOrders.map(o => [
      `"${o.so_number || ''}"`,
      `"${o.order_number || ''}"`,
      `"${o.transaction_date || ''}"`,
      `"${(o.customer_name || o.customer?.display_name || '').replace(/"/g, '""')}"`,
      `"${(o.customer_phone || o.customer?.phone || '').replace(/"/g, '""')}"`,
      `"${o.status || ''}"`,
      (o.invoice_total || 0).toFixed(2),
      (o.amount_paid || 0).toFixed(2),
      (o.balance_due || 0).toFixed(2),
      `"${(o.invoice_number || '').replace(/"/g, '""')}"`,
      o.invoice_number ? '"Invoiced"' : '"Pending Invoice"',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CasaCentral_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Paid':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'Partially Paid':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Refunded':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-800 select-none overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Module Header Bar */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 sm:py-4 shrink-0 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center space-x-2">
                  <span>Invoices</span>
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Accounting
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Internal invoice registry for orders fulfilled with a Sales Order (SO #)
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center space-x-3 overflow-x-auto pb-1 md:pb-0">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 flex items-center space-x-3 shrink-0">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Fulfilled Orders</p>
                <p className="text-sm font-black text-slate-900 font-mono">{metrics.totalFulfilled}</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 flex items-center space-x-3 shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Invoiced</p>
                <p className="text-sm font-black text-emerald-700 font-mono">{metrics.invoicedCount}</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 flex items-center space-x-3 shrink-0">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pending Invoice</p>
                <p className="text-sm font-black text-amber-700 font-mono">{metrics.pendingCount}</p>
              </div>
            </div>
            <div
              onClick={() => setReminderModalOpen(true)}
              className="bg-slate-50 hover:bg-amber-50/80 border border-slate-200/80 hover:border-amber-300 rounded-xl px-3.5 py-2 flex items-center space-x-3 shrink-0 cursor-pointer transition-colors group"
              title="Click to send email reminder to Sales and Support roles"
            >
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <div>
                <div className="flex items-center space-x-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-amber-800">
                    Outstanding Balance
                  </p>
                  <Mail className="w-3 h-3 text-amber-600" />
                </div>
                <p className="text-sm font-black text-amber-900 font-mono">
                  {formatCurrency(metrics.totalBalanceDue)}
                  {metrics.outstandingCount > 0 && (
                    <span className="text-[10px] font-bold text-amber-700 ml-1 font-sans">
                      ({metrics.outstandingCount} open)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 flex items-center space-x-3 shrink-0">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Invoiced Value</p>
                <p className="text-sm font-black text-slate-900 font-mono">{formatCurrency(metrics.totalInvoiceAmount)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & Tab Filters */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 w-fit">
            <button
              onClick={() => setTabFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tabFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Fulfilled ({metrics.totalFulfilled})
            </button>
            <button
              onClick={() => setTabFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                tabFilter === 'PENDING'
                  ? 'bg-white text-amber-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pending Invoice</span>
              {metrics.pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-amber-100 text-amber-800">
                  {metrics.pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTabFilter('INVOICED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                tabFilter === 'INVOICED'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Invoiced</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-emerald-100 text-emerald-800">
                {metrics.invoicedCount}
              </span>
            </button>
          </div>

          {/* Search & Utility Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-72 md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search SO #, Order #, Customer, Phone, Invoice #..."
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Email Payment Reminder Button */}
            <button
              onClick={() => setReminderModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition-all cursor-pointer shrink-0"
              title="Send email reminder to Sales and Support roles to follow up payments for orders with outstanding balance"
            >
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span>Send Payment Reminder</span>
              {metrics.outstandingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-slate-950 text-amber-400 rounded-full font-mono text-[10px] font-bold">
                  {metrics.outstandingCount}
                </span>
              )}
            </button>

            <button
              onClick={handleExportCsv}
              disabled={filteredOrders.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold shadow-2xs transition-all disabled:opacity-50 cursor-pointer shrink-0"
              title="Export visible invoices to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={loadOrders}
              disabled={loading}
              className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer shrink-0"
              title="Refresh Invoices"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto flex flex-col min-h-[350px]">
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden">
          {error && (
            <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={loadOrders}
                className="underline font-bold text-rose-800 hover:text-rose-900"
              >
                Retry
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[780px]">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Sales Order</th>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Invoice Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Invoice Number</th>
                  <th className="py-3 px-4 text-center">Action (Invoice)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                        <span className="text-xs font-semibold">Loading fulfilled orders for accounting ledger...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">No fulfilled orders found</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {search
                              ? `No results matching "${search}"`
                              : tabFilter === 'PENDING'
                              ? 'All fulfilled orders have already been invoiced!'
                              : 'Orders will automatically appear here once fulfilled with an SO #.'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => {
                    const isInvoiced = Boolean(order.invoice_number && order.invoice_number.trim() !== '');
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* 1. Sales Order */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs">
                            {order.so_number || '—'}
                          </span>
                        </td>

                        {/* 2. Order # (with subtext of transaction date & time) */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <button
                              onClick={() => setViewingOrderId(order.id)}
                              className="font-mono font-bold text-xs text-slate-900 hover:text-amber-700 text-left transition-colors cursor-pointer flex items-center space-x-1"
                              title="Click to view full order details"
                            >
                              <span>{order.order_number}</span>
                              <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                            </button>
                            <span className="text-[11px] text-slate-500 font-sans mt-0.5">
                              {formatDateTime(order.transaction_date)}
                            </span>
                          </div>
                        </td>

                        {/* 3. Customer Name (with subtext of Customer Phone) */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 text-xs">
                              {order.customer_name ||
                                (order.customer
                                  ? `${order.customer.first_name} ${order.customer.last_name}`
                                  : 'Walk-in Customer')}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {order.customer_phone || order.customer?.phone || 'No Phone'}
                            </span>
                          </div>
                        </td>

                        {/* 4. Status */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wide uppercase ${getStatusBadge(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>

                        {/* 5. Invoice Total */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {formatCurrency(order.invoice_total)}
                          </span>
                        </td>

                        {/* 6. Paid */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-bold text-xs text-emerald-700">
                            {formatCurrency(order.amount_paid)}
                          </span>
                        </td>

                        {/* 7. Balance Due */}
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-mono font-bold text-xs ${
                              order.balance_due > 0 ? 'text-rose-600' : 'text-slate-400'
                            }`}
                          >
                            {formatCurrency(order.balance_due)}
                          </span>
                        </td>

                        {/* 8. Invoice Number */}
                        <td className="py-3 px-4 text-center">
                          {isInvoiced ? (
                            <div className="flex flex-col items-center">
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs">
                                <Hash className="w-3 h-3 text-blue-500 shrink-0" />
                                <span>{order.invoice_number}</span>
                              </span>
                              {/* Date subtext showing when the order is invoiced */}
                              <div
                                className="text-[10px] text-slate-500 font-sans flex items-center mt-1 space-x-1 justify-center"
                                title="Invoiced Date & Time"
                              >
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{formatDateTime(order.invoiced_at || order.updated_at)}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              — Not Invoiced —
                            </span>
                          )}
                        </td>

                        {/* 9. Action (Invoice) */}
                        <td className="py-3 px-4 text-center">
                          {isInvoiced ? (
                            <button
                              onClick={() => handleOpenInvoiceModal(order)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer group/btn"
                              title="Click to edit or update the internal invoice number"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Invoiced</span>
                              <Edit2 className="w-3 h-3 text-emerald-600 opacity-60 group-hover/btn:opacity-100" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenInvoiceModal(order)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-sm hover:shadow cursor-pointer"
                              title="Click to enter internal invoice number"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-950" />
                              <span>Invoice</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> fulfilled orders
            </span>
            <div className="flex items-center space-x-4">
              <span>
                Total Invoiced:{' '}
                <strong className="text-emerald-700 font-mono font-bold">{metrics.invoicedCount}</strong>
              </span>
              <span>
                Pending:{' '}
                <strong className="text-amber-700 font-mono font-bold">{metrics.pendingCount}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Invoice Number Modal */}
      {invoicingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white">
                    {invoicingOrder.invoice_number ? 'Update Internal Invoice Number' : 'Log Internal Invoice'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Accounting ledger record for internal invoices
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInvoicingOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Order Summary Context */}
            <div className="bg-amber-50/70 border-b border-amber-200/80 px-6 py-3.5 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[9px]">Sales Order</span>
                  <span className="font-mono font-bold text-amber-900 text-xs">
                    {invoicingOrder.so_number || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[9px]">Order Number</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {invoicingOrder.order_number}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[9px]">Customer</span>
                  <span className="font-semibold text-slate-900 truncate block">
                    {invoicingOrder.customer_name || invoicingOrder.customer?.display_name || 'Customer'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[9px]">Invoice Total</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {formatCurrency(invoicingOrder.invoice_total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveInvoiceNumber} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Internal Invoice Number <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Enter the internal invoice reference generated by your accounting system.
                </p>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={invoiceNumberInput}
                    onChange={e => setInvoiceNumberInput(e.target.value)}
                    placeholder="e.g. INV-10024"
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              {invoiceError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{invoiceError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setInvoicingOrder(null)}
                  disabled={savingInvoice}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingInvoice}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded-lg text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingInvoice ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Set Invoiced</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {viewingOrderId && (
        <OrderDetailModal
          orderId={viewingOrderId}
          settings={settings}
          currentUser={currentUser}
          onClose={() => setViewingOrderId(null)}
          onEditOrder={orderId => {
            setViewingOrderId(null);
            if (onOpenOrder) onOpenOrder(orderId);
          }}
          onOrderUpdated={loadOrders}
        />
      )}

      {/* Payment Reminder Modal to Sales and Support Staff */}
      <PaymentReminderModal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        currentUser={currentUser}
        onSentSuccess={msg => {
          showToast(msg);
          loadOrders();
        }}
      />
    </div>
  );
};
