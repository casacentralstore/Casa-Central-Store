import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { formatCurrency } from '../../utils/formatters.ts';
import {
  AlertCircle,
  Truck,
  Package,
  DollarSign,
  Box,
  Plus,
  ArrowRight,
  Clock,
} from 'lucide-react';

interface DashboardOverviewProps {
  onNavigate: (module: string) => void;
  onNewOrder: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigate,
}) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await api.getDashboardMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-800 p-3 sm:p-5 lg:p-6 overflow-y-auto">
      {/* Top Banner */}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Store Operations Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Casa Central Store physical retail & asset-recovery operational status
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate('POS')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg shadow-sm flex items-center transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Open POS Register
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Today's Sales</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {loading ? '...' : formatCurrency(metrics?.today_sales)}
          </p>
          <p className="text-[11px] text-slate-500">
            {metrics?.today_orders || 0} order(s) processed today
          </p>
        </div>

        {/* Outstanding Balances */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Outstanding Balance</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 font-mono">
            {loading ? '...' : formatCurrency(metrics?.outstanding_balance)}
          </p>
          <p className="text-[11px] text-slate-500">
            Pending customer collections
          </p>
        </div>

        {/* Ready for Pickup */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Ready for Pick Up</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {loading ? '...' : metrics?.orders_ready_pickup || 0}
          </p>
          <p className="text-[11px] text-slate-500">
            Orders staged in showroom / warehouse
          </p>
        </div>

        {/* Pending Delivery */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Delivery</span>
            <Truck className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {loading ? '...' : metrics?.orders_pending_delivery || 0}
          </p>
          <p className="text-[11px] text-slate-500">
            Scheduled truck routes
          </p>
        </div>
      </div>

      {/* Secondary Status Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div
          onClick={() => onNavigate('Orders')}
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-amber-400 cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Orders Pending Payment</p>
              <p className="text-lg font-bold text-slate-900">{metrics?.orders_pending || 0}</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>

        <div
          onClick={() => onNavigate('Orders')}
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-amber-400 cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Partially Paid Orders</p>
              <p className="text-lg font-bold text-slate-900">{metrics?.orders_partially_paid || 0}</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>

        <div
          onClick={() => onNavigate('Inventory')}
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-amber-400 cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Available Stock Assets</p>
              <p className="text-lg font-bold text-slate-900">{metrics?.inventory_available_count || 0}</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Operational Highlights */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
          System Overview & Migration Architecture
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600">
          <div>
            <h3 className="font-bold text-slate-900 mb-1">Authoritative Relational Database</h3>
            <p>
              ACID-compliant transactional database. All calculations, unique random order numbering (CASA-xxxxxx),
              and constraints are enforced server-side.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-1">Dual Inventory Architecture</h3>
            <p>
              Supports standard SKU items with multi-quantity along with unique physical liquidation assets
              (serials, item tags, condition A/B/C) to prevent duplicate asset sales.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-1">Document & Exemption Compliance</h3>
            <p>
              Enforces NJ State ST-3 resale documentation upload prior to authorizing 0.00% tax exemption.
              Generates print-ready Invoices, Receipts, and Packing Slips.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
