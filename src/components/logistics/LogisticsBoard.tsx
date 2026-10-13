import React, { useState, useEffect } from 'react';
import { User, Order } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { FulfillModal } from '../orders/FulfillModal.tsx';
import { formatDate, formatDateTime } from '../../utils/formatters.ts';
import {
  Truck,
  Package,
  MapPin,
  Search,
  RefreshCw,
  Phone,
  User as UserIcon,
  CheckCircle,
  ExternalLink,
  Check,
  AlertCircle,
  Hash,
  Clock,
  Calendar,
} from 'lucide-react';

interface LogisticsBoardProps {
  currentUser: User;
  onOpenOrder: (orderId: string) => void;
}

type LogisticsTabFilter = 'ALL' | 'PENDING' | 'FULFILLED' | 'PICK_UP' | 'PICKED_UP';

export const LogisticsBoard: React.FC<LogisticsBoardProps> = ({
  onOpenOrder,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<LogisticsTabFilter>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fulfill modal state: prompts user to enter SO #
  const [fulfillModalOrder, setFulfillModalOrder] = useState<Order | null>(null);

  // Success toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getOrders({
        search: search.trim() || undefined,
        limit: 200,
      } as any);
      // All saved orders are logged in both Orders and Logistics Module, even if not yet fulfilled.
      // Exclude cancelled orders so logistics operations remain clean and actionable.
      const activeOrders = (res.orders || []).filter((o: any) => o.status !== 'Cancelled');
      setOrders(activeOrders);
    } catch (err) {
      console.error('Failed to load logistics orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchOrders, 150);
    return () => clearTimeout(timer);
  }, [search]);

  // Handler for updating Pick Up / Picked Up status
  const handleToggleStatus = async (orderId: string, currentStatus?: string) => {
    const newStatus = currentStatus === 'Picked Up' ? 'Pick Up' : 'Picked Up';
    setUpdatingId(orderId);
    const nowIso = new Date().toISOString();
    try {
      // Optimistic update
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId
            ? {
                ...o,
                fulfillment_status: newStatus,
                picked_up_date: newStatus === 'Picked Up' ? (o.picked_up_date || nowIso) : undefined,
              }
            : o
        )
      );
      const updated = await api.updateFulfillmentStatus(orderId, newStatus);
      if (updated) {
        setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, ...updated } : o)));
      }
      showToast(
        newStatus === 'Picked Up'
          ? 'Package marked as Picked Up! Pick Up Date automatically recorded.'
          : 'Status updated to Pick Up.'
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
      fetchOrders();
    } finally {
      setUpdatingId(null);
    }
  };

  // Counts for tabs
  const pendingCount = orders.filter(o => !o.is_fulfilled).length;
  const fulfilledCount = orders.filter(o => Boolean(o.is_fulfilled)).length;
  const pickedUpCount = orders.filter(o => o.fulfillment_status === 'Picked Up').length;
  const pickUpCount = orders.filter(o => o.fulfillment_status !== 'Picked Up').length;

  // Filtered orders by tab
  const filteredOrders = orders.filter(o => {
    if (tabFilter === 'PENDING') {
      return !o.is_fulfilled;
    }
    if (tabFilter === 'FULFILLED') {
      return Boolean(o.is_fulfilled);
    }
    if (tabFilter === 'PICK_UP') {
      return o.fulfillment_status !== 'Picked Up';
    }
    if (tabFilter === 'PICKED_UP') {
      return o.fulfillment_status === 'Picked Up';
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-800 p-3 sm:p-5 lg:p-6 overflow-y-auto">
      {/* Top Toast */}

      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-800 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Logistics Module
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              {orders.length} Total Orders
            </span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-slate-950 shadow-2xs">
                {pendingCount} Awaiting Fulfillment
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time logistics queue — all saved orders are logged here. Fulfill orders by entering the SO # to dispatch to Invoices.
          </p>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search SO#, Order#, client, carrier..."
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-64 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-2xs outline-hidden"
            />
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            title="Refresh Logistics Board"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-600 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setTabFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center space-x-1.5 cursor-pointer ${
            tabFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <span>All Orders</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-200">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setTabFilter('PENDING')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center space-x-1.5 cursor-pointer ${
            tabFilter === 'PENDING'
              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-2xs font-black'
              : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Fulfillment</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${tabFilter === 'PENDING' ? 'bg-amber-600 text-slate-950 font-black' : 'bg-slate-100 text-slate-600'}`}>
            {pendingCount}
          </span>
        </button>

        <button
          onClick={() => setTabFilter('FULFILLED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center space-x-1.5 cursor-pointer ${
            tabFilter === 'FULFILLED'
              ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Fulfilled</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-200">
            {fulfilledCount}
          </span>
        </button>

        <span className="text-slate-300">|</span>

        <button
          onClick={() => setTabFilter('PICK_UP')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center space-x-1.5 cursor-pointer ${
            tabFilter === 'PICK_UP'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Status: Pick Up</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-700 text-white">
            {pickUpCount}
          </span>
        </button>

        <button
          onClick={() => setTabFilter('PICKED_UP')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center space-x-1.5 cursor-pointer ${
            tabFilter === 'PICKED_UP'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Status: Picked Up</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-700 text-white">
            {pickedUpCount}
          </span>
        </button>
      </div>

      {/* Table Container */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-[350px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs border-collapse min-w-[750px]">

            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] sticky top-0 z-10">
                {/* Columns strictly matching requirement:
                    1. SO#
                    2. Carrier & Pick Up Type
                    3. Order #
                    4. Client
                    5. Delivery / Bay Address
                    6. Status (Pick Up or Picked Up)
                    7. Action (Fulfill)
                */}
                <th className="py-3 px-3 w-32 font-bold">SO#</th>
                <th className="py-3 px-3 w-48 font-bold">Carrier & Pick Up Type</th>
                <th className="py-3 px-3 w-32 font-bold">Order #</th>
                <th className="py-3 px-3 w-48 font-bold">Client</th>
                <th className="py-3 px-3 font-bold">Delivery / Bay Address</th>
                <th className="py-3 px-3 w-36 font-bold">Pick Up Date</th>
                <th className="py-3 px-3 w-40 text-center font-bold">Status (Pick Up or Picked Up)</th>
                <th className="py-3 px-3 w-36 text-center font-bold">Action (Fulfill)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                      <span>Loading logistics queue...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Truck className="w-8 h-8 text-slate-300" />
                      <span className="font-semibold text-slate-600">No orders found in this view.</span>
                      <p className="text-xs text-slate-400 max-w-md">
                        Every order saved in the POS or Orders module automatically appears in this Logistics module.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isFulfilled = Boolean(order.is_fulfilled || (order.so_number && order.so_number.trim() !== ''));
                  const isPickedUp = order.fulfillment_status === 'Picked Up';
                  const isUpdating = updatingId === order.id;

                  // SO# display: Show assigned SO # if fulfilled, or Pending indicator
                  const soDisplay = order.so_number ? order.so_number.trim() : null;

                  // Carrier & Pick Up Type
                  const pickUpType = order.logistics_method || 'Pick Up';
                  const isCustomerPickup = pickUpType === 'Pick Up';
                  const carrierName = order.carrier || (isCustomerPickup ? 'Customer Pick Up' : 'ITC');

                  // Client
                  const clientName =
                    order.customer_name ||
                    (order.customer ? order.customer.display_name : 'Walk-in Customer');
                  const clientPhone =
                    order.customer_phone || (order.customer ? order.customer.phone : 'No phone');

                  // Delivery / Bay Address
                  const addressDisplay =
                    order.delivery_address && order.delivery_address.trim()
                      ? order.delivery_address.trim()
                      : isCustomerPickup
                      ? 'Showroom / Warehouse Pickup Bay (1420 Bergenline Ave)'
                      : (order.customer?.address
                          ? `${order.customer.address}, ${order.customer.city || ''} ${order.customer.state || ''} ${order.customer.zip || ''}`.trim()
                          : 'Delivery Address on Invoice');

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. SO# */}
                      <td className="py-3 px-3 align-middle font-mono text-[11px]">
                        {soDisplay ? (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-100 text-slate-900 border border-slate-300 font-black shadow-2xs">
                              <Hash className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{soDisplay}</span>
                            </span>
                            {/* Date subtext showing when order is fulfilled */}
                            <div className="text-[10px] text-slate-500 font-sans flex items-center mt-1 space-x-1" title="Fulfilled Date & Time">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{formatDateTime(order.fulfilled_at || order.updated_at)}</span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold italic">
                              <span>Pending SO</span>
                            </span>
                            <div className="text-[10px] text-slate-400 font-sans italic mt-0.5">
                              Awaiting fulfillment
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 2. Carrier & Pick Up Type */}
                      <td className="py-3 px-3 align-middle">
                        <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                          {isCustomerPickup ? (
                            <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          ) : (
                            <Truck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                          <span className="truncate">{carrierName}</span>
                        </div>
                        <div className="flex items-center space-x-1 mt-0.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              isCustomerPickup
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {pickUpType}
                          </span>
                          {order.tracking_number && (
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]" title={order.tracking_number}>
                              #{order.tracking_number}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Order # */}
                      <td className="py-3 px-3 align-middle font-mono font-bold">
                        <button
                          type="button"
                          onClick={() => onOpenOrder(order.id)}
                          title="Open order in POS / View Details"
                          className="text-amber-700 hover:text-amber-900 hover:underline flex items-center space-x-1 cursor-pointer"
                        >
                          <span>{order.order_number}</span>
                          <ExternalLink className="w-3 h-3 text-amber-500 shrink-0" />
                        </button>
                      </td>

                      {/* 4. Client */}
                      <td className="py-3 px-3 align-middle">
                        <div className="font-bold text-slate-900 flex items-center space-x-1">
                          <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{clientName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{clientPhone}</span>
                        </div>
                      </td>

                      {/* 5. Delivery / Bay Address */}
                      <td className="py-3 px-3 align-middle text-slate-700">
                        <div className="flex items-start space-x-1 text-[11px] leading-snug">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{addressDisplay}</span>
                        </div>
                      </td>

                      {/* 6. Pick Up Date (automatically filled once order is marked as Picked Up) */}
                      <td className="py-3 px-3 align-middle text-slate-700">
                        {order.picked_up_date ? (
                          <div>
                            <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-900">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{formatDate(order.picked_up_date)}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-sans ml-5 block">
                              {formatDateTime(order.picked_up_date).split(',')[1]?.trim() || ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            —
                          </span>
                        )}
                      </td>

                      {/* 6. Status (Pick Up or Picked Up) */}
                      <td className="py-3 px-3 align-middle text-center">
                        {isPickedUp ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(order.id, 'Picked Up')}
                            disabled={isUpdating}
                            title="Marked as Picked Up. Click to revert to Pick Up if needed."
                            className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Picked Up</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(order.id, 'Pick Up')}
                            disabled={isUpdating}
                            title="Click to mark as Picked Up by customer or carrier"
                            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            <Package className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>Pick Up</span>
                          </button>
                        )}
                      </td>

                      {/* 7. Action (Fulfill) */}
                      <td className="py-3 px-3 align-middle text-center">
                        {isFulfilled ? (
                          <button
                            type="button"
                            onClick={() => setFulfillModalOrder(order)}
                            title={`Fulfilled with SO #${order.so_number || 'SO'}. Click to view or edit fulfillment.`}
                            className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-slate-100 border border-slate-700 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Fulfilled</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setFulfillModalOrder(order)}
                            title="Click to fulfill order by entering SO #"
                            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-2xs border border-amber-600 cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5 shrink-0" />
                            <span>Fulfill</span>
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

        {/* Footer info bar */}
        <div className="border-t border-slate-200 px-4 py-2.5 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center space-x-4">
            <span>
              Showing {filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'}
            </span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="inline-flex items-center space-x-1 text-amber-800 font-semibold">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Pending Fulfillment ({pendingCount})</span>
              </span>
              <span className="inline-flex items-center space-x-1 text-slate-700 font-semibold">
                <span className="inline-block w-2 h-2 rounded-full bg-slate-800"></span>
                <span>Fulfilled ({fulfilledCount})</span>
              </span>
              <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Picked Up ({pickedUpCount})</span>
              </span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400">
            Fulfill action requires SO # (Sales Order). Once fulfilled, the order is automatically logged in the Invoices module.
          </span>
        </div>
      </div>

      {/* Fulfill Modal (User enters SO # to fulfill order) */}
      {fulfillModalOrder && (
        <FulfillModal
          order={fulfillModalOrder}
          isOpen={Boolean(fulfillModalOrder)}
          onClose={() => setFulfillModalOrder(null)}
          onSuccess={updatedOrder => {
            fetchOrders();
            setFulfillModalOrder(null);
            showToast(
              `Order ${updatedOrder.order_number} successfully fulfilled with ${updatedOrder.so_number || 'SO#'}! Logged in Invoices module.`
            );
          }}
        />
      )}
    </div>
  );
};
