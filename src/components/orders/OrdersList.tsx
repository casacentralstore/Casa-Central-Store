import React, { useState, useEffect, useRef } from 'react';
import { Order, TaxSettings, User } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatCurrency, formatDate, formatDateTime, formatTime } from '../../utils/formatters.ts';
import { exportOrdersToCsv, exportOrdersToXlsx } from '../../utils/exportOrders.ts';
import { OrderDetailModal } from './OrderDetailModal.tsx';
import { PaymentModal } from './PaymentModal.tsx';
import { DocumentViewerModal } from '../documents/DocumentViewerModal.tsx';
import { FulfillModal } from './FulfillModal.tsx';
import {
  Search,
  Eye,
  Edit,
  DollarSign,
  FileText,
  Package,
  Calendar,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  FileSpreadsheet,
  CheckSquare,
  ChevronDown,
  Clock,
  Truck,
  CheckCircle,
} from 'lucide-react';

interface OrdersListProps {
  settings: TaxSettings;
  users: User[];
  currentUser: User;
  onEditInPos: (orderId: string) => void;
  onNewOrder: () => void;
}

type DatePreset = 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'CUSTOM';

export const OrdersList: React.FC<OrdersListProps> = ({
  settings,
  users,
  currentUser,
  onEditInPos,
  onNewOrder,
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Filters: Status, Logistics, Rep, Date Period (Date range), and Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [logisticsFilter, setLogisticsFilter] = useState('ALL');
  const [repFilter, setRepFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Selected orders for multi-select checkboxes
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // Selected Order for Detail / Payment / Docs
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [fulfillOrderModal, setFulfillOrderModal] = useState<Order | null>(null);
  const [docModalOrder, setDocModalOrder] = useState<{
    order: Order;
    type: 'Invoice' | 'Receipt' | 'Packing Slip';
  } | null>(null);

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update header checkbox indeterminate state
  useEffect(() => {
    if (headerCheckboxRef.current) {
      const allSelectedOnPage = orders.length > 0 && orders.every(o => selectedOrderIds.includes(o.id));
      const someSelected = orders.some(o => selectedOrderIds.includes(o.id));
      headerCheckboxRef.current.indeterminate = someSelected && !allSelectedOnPage;
    }
  }, [orders, selectedOrderIds]);

  // Handle Date Period Preset Changes
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setPage(1);

    const now = new Date();
    const toYMD = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      const todayStr = toYMD(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'YESTERDAY') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = toYMD(yest);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay();
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - day);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(now));
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(now));
    } else if (preset === 'LAST_30_DAYS') {
      const past = new Date(now);
      past.setDate(now.getDate() - 30);
      setStartDate(toYMD(past));
      setEndDate(toYMD(now));
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setDatePreset('CUSTOM');
    setPage(1);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setDatePreset('CUSTOM');
    setPage(1);
  };

  const handleClearDatePeriod = () => {
    setStartDate('');
    setEndDate('');
    setDatePreset('ALL');
    setPage(1);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getOrders({
        search,
        status: statusFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sales_rep_id: repFilter,
        logistics: logisticsFilter,
        limit,
        offset: (page - 1) * limit,
      });
      setOrders(res.orders);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchOrders, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter, startDate, endDate, repFilter, logisticsFilter, page]);

  // Checkbox multi-select handlers
  const handleToggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const isAllOnPageSelected = orders.length > 0 && orders.every(o => selectedOrderIds.includes(o.id));

  const handleToggleSelectAll = () => {
    if (isAllOnPageSelected) {
      const pageIds = new Set(orders.map(o => o.id));
      setSelectedOrderIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const pageIds = orders.map(o => o.id);
      setSelectedOrderIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllOnPage = () => {
    const pageIds = orders.map(o => o.id);
    setSelectedOrderIds(prev => Array.from(new Set([...prev, ...pageIds])));
  };

  const handleDeselectAll = () => {
    setSelectedOrderIds([]);
  };

  const handleExport = async (format: 'csv' | 'xlsx', forceSelectedOnly = false) => {
    setExporting(true);
    try {
      let ordersToExport: any[] = [];
      if (selectedOrderIds.length > 0 && (forceSelectedOnly || selectedOrderIds.length > 0)) {
        const presentSelected = orders.filter(o => selectedOrderIds.includes(o.id));
        if (presentSelected.length === selectedOrderIds.length) {
          ordersToExport = presentSelected;
        } else {
          const res = await api.getOrders({ limit: 1000 });
          ordersToExport = res.orders.filter(o => selectedOrderIds.includes(o.id));
        }
      } else {
        const res = await api.getOrders({
          search,
          status: statusFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          sales_rep_id: repFilter,
          logistics: logisticsFilter,
          limit: 1000,
        });
        ordersToExport = res.orders;
      }

      if (ordersToExport.length === 0) {
        alert('No orders available to export.');
        return;
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Orders_Export_${timestamp}.${format}`;

      if (format === 'csv') {
        exportOrdersToCsv(ordersToExport, filename);
      } else {
        exportOrdersToXlsx(ordersToExport, filename);
      }
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Failed to export orders: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const handleOpenDoc = async (orderId: string, type: 'Invoice' | 'Receipt' | 'Packing Slip') => {
    try {
      const order = await api.getOrder(orderId);
      setDocModalOrder({ order, type });
    } catch (err) {
      alert('Failed to load order document');
    }
  };

  const handleOpenPayment = async (orderId: string) => {
    try {
      const order = await api.getOrder(orderId);
      setPaymentOrder(order);
    } catch (err) {
      alert('Failed to load order');
    }
  };

  const handleTogglePickedUp = async (order: any) => {
    const isCurrentlyPickedUp = order.fulfillment_status === 'Picked Up';
    const nextStatus = isCurrentlyPickedUp ? 'Pick Up' : 'Picked Up';
    const nowIso = new Date().toISOString();
    try {
      setOrders(prev =>
        prev.map(o => (o.id === order.id ? {
          ...o,
          fulfillment_status: nextStatus,
          picked_up_date: nextStatus === 'Picked Up' ? (o.picked_up_date || nowIso) : null,
        } : o))
      );
      const updated = await api.updateFulfillmentStatus(order.id, nextStatus);
      if (updated) {
        setOrders(prev => prev.map(o => (o.id === order.id ? { ...o, ...updated } : o)));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update pickup status');
      fetchOrders();
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Partially Paid':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Completed':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-800 p-3 sm:p-5 lg:p-6 overflow-y-auto">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            Orders Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time transaction registry with authoritative financial auditing ({total} orders)
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-2xs flex items-center transition-colors disabled:opacity-50 cursor-pointer"
              title="Export orders data"
            >
              {exporting ? (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-amber-500" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              )}
              <span>Export</span>
              <ChevronDown className="w-3 h-3 ml-1 text-slate-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-40 text-xs divide-y divide-slate-100">
                <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {selectedOrderIds.length > 0
                    ? `Export ${selectedOrderIds.length} Selected Orders`
                    : `Export All Filtered (${total} orders)`}
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      handleExport('csv');
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 mr-2.5 text-slate-500" />
                    <span>Export to CSV (.csv)</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      handleExport('xlsx');
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center text-emerald-800 font-medium transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2.5 text-emerald-600" />
                    <span>Export to Excel (.xlsx)</span>
                  </button>
                </div>
                {selectedOrderIds.length > 0 && (
                  <div className="py-1 bg-amber-50/50">
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExport('csv', false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 hover:bg-amber-100/50 flex items-center text-amber-900 text-[11px] cursor-pointer"
                    >
                      Export entire filtered dataset ({total}) as CSV
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExport('xlsx', false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 hover:bg-amber-100/50 flex items-center text-amber-900 text-[11px] cursor-pointer"
                    >
                      Export entire filtered dataset ({total}) as XLSX
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={fetchOrders}
            className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-600 shadow-2xs transition-colors cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onNewOrder}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-2xs flex items-center transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create POS Order
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs mb-3 flex flex-wrap items-center gap-3 text-xs">
        {/* Search */}
        <div className="relative min-w-52 flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search order #, customer, phone, SKU..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-slate-50/50 focus:bg-white"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1.5">
          <span className="text-slate-500 font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-amber-500 outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid in Full</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Logistics Filter */}
        <div className="flex items-center space-x-1.5">
          <span className="text-slate-500 font-semibold">Logistics:</span>
          <select
            value={logisticsFilter}
            onChange={e => {
              setLogisticsFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-amber-500 outline-hidden"
          >
            <option value="ALL">All Methods</option>
            <option value="Pick Up">Pick Up</option>
            <option value="Delivery">Delivery</option>
          </select>
        </div>

        {/* Rep Filter */}
        <div className="flex items-center space-x-1.5">
          <span className="text-slate-500 font-semibold">Rep:</span>
          <select
            value={repFilter}
            onChange={e => {
              setRepFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-amber-500 outline-hidden"
          >
            <option value="ALL">All Sales Reps</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Period Filter */}
        <div className="flex items-center space-x-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0 ml-1" />
          <span className="text-slate-600 font-semibold">Date Period:</span>
          <select
            value={datePreset}
            onChange={e => handleDatePresetChange(e.target.value as DatePreset)}
            className="px-2 py-1 border border-slate-300 rounded bg-white font-medium text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
          >
            <option value="ALL">All Period</option>
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
            <option value="CUSTOM">Custom Range</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={e => handleStartDateChange(e.target.value)}
            className="px-2 py-1 border border-slate-300 rounded bg-white font-mono text-[11px] focus:ring-2 focus:ring-amber-500 outline-hidden"
            title="Start Date"
          />
          <span className="text-slate-400 font-bold">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => handleEndDateChange(e.target.value)}
            className="px-2 py-1 border border-slate-300 rounded bg-white font-mono text-[11px] focus:ring-2 focus:ring-amber-500 outline-hidden"
            title="End Date"
          />
          {(startDate || endDate || datePreset !== 'ALL') && (
            <button
              onClick={handleClearDatePeriod}
              className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              title="Clear date period"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Selected Items Action Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs mb-3 shadow-2xs">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-4 h-4 text-amber-600" />
            <span className="font-bold text-amber-950">
              {selectedOrderIds.length} order{selectedOrderIds.length > 1 ? 's' : ''} selected
            </span>
            <span className="text-amber-400">|</span>
            <button
              onClick={handleSelectAllOnPage}
              className="text-amber-800 hover:text-amber-950 underline font-semibold text-xs cursor-pointer"
            >
              Select all on page ({orders.length})
            </button>
            <button
              onClick={handleDeselectAll}
              className="text-slate-500 hover:text-slate-800 underline text-xs ml-1 cursor-pointer"
            >
              Deselect all
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExport('csv', true)}
              disabled={exporting}
              className="px-3 py-1 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg text-amber-900 font-bold flex items-center shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-amber-700" />
              Export Selected CSV ({selectedOrderIds.length})
            </button>
            <button
              onClick={() => handleExport('xlsx', true)}
              disabled={exporting}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
              Export Selected XLSX ({selectedOrderIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-[350px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs border-collapse min-w-[780px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] sticky top-0 z-10">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    ref={headerCheckboxRef}
                    checked={isAllOnPageSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer accent-amber-600"
                    title="Select/deselect all orders on this page"
                  />
                </th>
                <th className="py-3 px-3">Order #</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-2">Rep</th>
                <th className="py-3 px-2">Logistics</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-3 text-right">Invoice Total</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-right">Balance Due</th>
                <th className="py-3 px-3 text-center w-48">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                      <span>Loading orders...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map(order => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  const dateTimeStr = order.created_at
                    ? formatDateTime(order.created_at)
                    : formatDate(order.transaction_date);

                  return (
                    <tr
                      key={order.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-amber-50/70 hover:bg-amber-100/60' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOrder(order.id)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer accent-amber-600"
                          aria-label={`Select order ${order.order_number}`}
                        />
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => setSelectedOrderId(order.id)}
                          className="font-mono font-bold text-amber-700 hover:text-amber-900 hover:underline text-xs block text-left cursor-pointer"
                        >
                          {order.order_number}
                        </button>
                        <div className="text-[11px] text-slate-500 font-medium flex items-center mt-0.5 space-x-1">
                          <Clock className="w-3 h-3 text-slate-400 inline shrink-0" />
                          <span>{dateTimeStr}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900 block">{order.customer_name}</span>
                        <span className="text-[11px] text-slate-400">{order.customer_phone}</span>
                      </td>
                      <td className="py-3 px-2 text-slate-600 font-medium">
                        {order.sales_rep_name || 'Staff'}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col items-start gap-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {order.logistics_method}
                          </span>
                          {order.fulfillment_status === 'Picked Up' ? (
                            <div>
                              <button
                                type="button"
                                onClick={() => handleTogglePickedUp(order)}
                                title="Marked as Picked Up. Click to revert to Pick Up if needed."
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                              >
                                <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>Picked Up</span>
                              </button>
                              {order.picked_up_date && (
                                <div className="text-[10px] text-emerald-800 font-medium flex items-center mt-0.5 space-x-1" title="Pick up date & time">
                                  <span>{formatDate(order.picked_up_date)}</span>
                                  <span className="text-slate-400">·</span>
                                  <span>{formatTime(order.picked_up_date)}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTogglePickedUp(order)}
                              title="Click to mark as Picked Up"
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                            >
                              <Package className="w-3 h-3 text-amber-700 shrink-0" />
                              <span>Mark Picked Up</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(order.invoice_total)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                        {formatCurrency(order.amount_paid)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black">
                        <span className={order.balance_due > 0 ? 'text-amber-700' : 'text-slate-400'}>
                          {formatCurrency(order.balance_due)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5 flex-nowrap">
                          {/* 1. Record Payment (Icon only) */}
                          <button
                            type="button"
                            onClick={() => handleOpenPayment(order.id)}
                            disabled={order.status === 'Cancelled' || order.balance_due <= 0}
                            title={order.balance_due <= 0 ? 'Order fully paid' : 'Record Payment'}
                            aria-label="Record Payment"
                            className="p-1.5 text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors disabled:opacity-25 disabled:pointer-events-none cursor-pointer shadow-2xs"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          </button>

                          {/* 2. Invoice (Icon only) */}
                          <button
                            type="button"
                            onClick={() => handleOpenDoc(order.id, 'Invoice')}
                            title="Invoice Document"
                            aria-label="Invoice"
                            className="p-1.5 text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          </button>

                          {/* 3. Packing Slip (Icon only) */}
                          <button
                            type="button"
                            onClick={() => handleOpenDoc(order.id, 'Packing Slip')}
                            title="Packing Slip Document"
                            aria-label="Packing Slip"
                            className="p-1.5 text-indigo-800 hover:text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                          >
                            <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          </button>

                          {/* 4. Fulfill */}
                          <button
                            type="button"
                            onClick={() => {
                              setFulfillOrderModal(order);
                            }}
                            disabled={order.status === 'Cancelled'}
                            title={
                              order.is_fulfilled
                                ? `Fulfilled (${order.so_number || 'SO'}) - Click to view/edit fulfillment`
                                : 'Fulfill Order - Enter SO #'
                            }
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer shadow-2xs disabled:opacity-30 ${
                              order.is_fulfilled
                                ? 'bg-slate-800 text-slate-100 hover:bg-slate-900 border border-slate-700'
                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-600'
                            }`}
                          >
                            {order.is_fulfilled ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Truck className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span>{order.is_fulfilled ? 'Fulfilled' : 'Fulfill'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-slate-200 px-4 py-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} orders
            {selectedOrderIds.length > 0 && (
              <span className="ml-2 font-semibold text-amber-700">
                ({selectedOrderIds.length} selected)
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 border border-slate-300 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 border border-slate-300 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          settings={settings}
          currentUser={currentUser}
          onClose={() => setSelectedOrderId(null)}
          onEditOrder={id => {
            setSelectedOrderId(null);
            onEditInPos(id);
          }}
          onOrderUpdated={fetchOrders}
        />
      )}

      {paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          onPaymentSuccess={() => {
            setPaymentOrder(null);
            fetchOrders();
          }}
          onClose={() => setPaymentOrder(null)}
        />
      )}

      {docModalOrder && (
        <DocumentViewerModal
          order={docModalOrder.order}
          settings={settings}
          initialType={docModalOrder.type}
          onClose={() => setDocModalOrder(null)}
        />
      )}

      {fulfillOrderModal && (
        <FulfillModal
          order={fulfillOrderModal}
          isOpen={Boolean(fulfillOrderModal)}
          onClose={() => setFulfillOrderModal(null)}
          onSuccess={() => {
            fetchOrders();
          }}
        />
      )}
    </div>
  );
};
