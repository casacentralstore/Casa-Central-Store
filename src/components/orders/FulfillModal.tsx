import React, { useState, useEffect } from 'react';
import { Order, CARRIER_OPTIONS } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import {
  Truck,
  Package,
  Calendar,
  MapPin,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Phone,
  Hash,
} from 'lucide-react';

interface FulfillModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOrder: Order) => void;
}

export const FulfillModal: React.FC<FulfillModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [fullOrder, setFullOrder] = useState<Order>(order);

  const resolveAddress = (o: Order) => {
    if (o.delivery_address && o.delivery_address.trim()) {
      return o.delivery_address.trim();
    }
    if (o.customer?.address) {
      return `${o.customer.address}, ${o.customer.city || ''} ${o.customer.state || ''} ${o.customer.zip || ''}`.trim();
    }
    return '';
  };

  const isDelivery = (fullOrder.logistics_method || order.logistics_method) === 'Delivery';

  const defaultSoNumber =
    order.so_number ||
    (order.order_number
      ? `SO-${order.order_number.replace(/^(ORD-|CASA-)/i, '')}`
      : `SO-${Date.now().toString().slice(-4)}`);

  const defaultCarrier =
    order.carrier || (order.logistics_method === 'Pick Up' ? 'Pick Up' : 'ITC');

  const defaultDeliverySchedule =
    order.delivery_schedule ||
    order.delivery_date ||
    order.scheduled_pickup_date ||
    new Date().toISOString().split('T')[0];

  const defaultAddress = resolveAddress(order);

  const [soNumber, setSoNumber] = useState(defaultSoNumber);
  const [carrier, setCarrier] = useState(defaultCarrier);
  const [deliverySchedule, setDeliverySchedule] = useState(defaultDeliverySchedule);
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '');
  const [deliveryAddress, setDeliveryAddress] = useState(defaultAddress);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && order) {
      setFullOrder(order);
      setSoNumber(
        order.so_number ||
        (order.order_number
          ? `SO-${order.order_number.replace(/^(ORD-|CASA-)/i, '')}`
          : `SO-${Date.now().toString().slice(-4)}`)
      );
      setCarrier(order.carrier || (order.logistics_method === 'Pick Up' ? 'Pick Up' : 'ITC'));
      setDeliverySchedule(
        order.delivery_schedule ||
        order.delivery_date ||
        order.scheduled_pickup_date ||
        new Date().toISOString().split('T')[0]
      );
      setTrackingNumber(order.tracking_number || '');
      const addr = resolveAddress(order);
      setDeliveryAddress(addr);
      setError(null);

      if (order.id) {
        api.getOrder(order.id)
          .then(fetched => {
            if (fetched) {
              setFullOrder(fetched);
              if (!addr) {
                const fetchedAddr = resolveAddress(fetched);
                if (fetchedAddr) setDeliveryAddress(fetchedAddr);
              }
            }
          })
          .catch(err => {
            console.error('Error fetching order for fulfillment modal:', err);
          });
      }
    }
  }, [order, isOpen]);

  const customerName =
    fullOrder.customer_name ||
    fullOrder.customer?.display_name ||
    (fullOrder.customer?.first_name || fullOrder.customer?.last_name
      ? `${fullOrder.customer?.first_name || ''} ${fullOrder.customer?.last_name || ''}`.trim()
      : '') ||
    order.customer_name ||
    order.customer?.display_name ||
    'N/A';

  const customerPhone =
    fullOrder.customer_phone ||
    fullOrder.customer?.phone ||
    order.customer_phone ||
    order.customer?.phone ||
    'No phone';

  const orderItems = (fullOrder.items && fullOrder.items.length > 0)
    ? fullOrder.items
    : (order.items || []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soNumber.trim()) {
      setError('Please provide a valid SO # (Sales Order number).');
      return;
    }
    if (isDelivery && !deliveryAddress.trim()) {
      setError('Delivery Address is required for delivery orders.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updated = await api.fulfillOrder(order.id, {
        so_number: soNumber.trim(),
        carrier: carrier.trim(),
        delivery_schedule: deliverySchedule,
        tracking_number: trackingNumber.trim(),
        delivery_address: deliveryAddress.trim(),
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm and schedule fulfillment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-slate-100">Support & Logistics Fulfillment</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950">
                  Dispatch
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Verify order items, assign carrier, schedule delivery, and dispatch to Logistics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Order Details Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Order Summary</span>
              <span className="font-mono text-xs font-bold text-slate-800">
                Order #: <span className="text-amber-700 font-extrabold">{order.order_number}</span>
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Logistics Method</span>
                <span className="inline-flex items-center font-bold text-slate-900">
                  {(fullOrder.logistics_method || order.logistics_method) === 'Delivery' ? (
                    <>
                      <Truck className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      Delivery
                    </>
                  ) : (
                    <>
                      <Package className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Pick Up
                    </>
                  )}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Customer Name</span>
                <span className="font-semibold text-slate-900 flex items-center truncate" title={customerName}>
                  <User className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                  <span className="truncate">{customerName}</span>
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Customer Phone</span>
                <span className="font-semibold text-slate-900 flex items-center truncate" title={customerPhone}>
                  <Phone className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                  <span className="truncate">{customerPhone}</span>
                </span>
              </div>
            </div>

            {/* Order Items Table */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
                <Package className="w-3 h-3 mr-1 text-slate-400" />
                <span>Order Items ({orderItems.length})</span>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white max-h-36 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="py-1.5 px-2.5 font-bold">SKU</th>
                      <th className="py-1.5 px-2.5 font-bold">Description</th>
                      <th className="py-1.5 px-2.5 font-bold text-center">Qty</th>
                      <th className="py-1.5 px-2.5 font-bold">Serial Number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderItems.length > 0 ? (
                      orderItems.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-1.5 px-2.5 font-mono font-bold text-slate-800 text-[11px]">{it.sku}</td>
                          <td className="py-1.5 px-2.5 text-slate-700 truncate max-w-[200px]" title={it.description}>
                            {it.description}
                          </td>
                          <td className="py-1.5 px-2.5 text-center font-bold text-slate-900">{it.quantity}</td>
                          <td className="py-1.5 px-2.5 font-mono text-slate-500 text-[11px]">
                            {it.serial_number ? it.serial_number : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-3 px-2 text-center text-slate-400 italic">
                          No items loaded for this order
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 2: Support & Logistics Inputs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1" />
                <span>Support & Logistics Dispatch Info</span>
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Action Status upon fulfillment: <strong>Pick Up</strong>
              </span>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
              <Package className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Fulfillment Action Workflow:</span>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Once fulfilled, the order action status defaults to <strong>“Pick Up”</strong>. The store manager will subsequently update it to <strong>“Picked Up”</strong> once the package is picked up by the customer or carrier.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* SO # (Sales Order) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  SO # (Sales Order) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={soNumber}
                    onChange={e => setSoNumber(e.target.value)}
                    placeholder="e.g. SO-1001"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Unique Sales Order tracking reference</p>
              </div>

              {/* Carrier */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Carrier <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Truck className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <select
                    value={carrier}
                    onChange={e => setCarrier(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white cursor-pointer"
                  >
                    {CARRIER_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Designated logistics carrier or method</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Delivery Schedule */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Delivery Schedule <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={deliverySchedule}
                    onChange={e => setDeliverySchedule(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Scheduled delivery or pickup date</p>
              </div>

              {/* Tracking Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  placeholder="e.g. 1Z9999999999999999 or BOL/PRO #"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Carrier tracking code, BOL, or internal reference</p>
              </div>
            </div>

            {/* Delivery Address (if for Delivery) */}
            {isDelivery && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Delivery Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required={isDelivery}
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="Full street address, city, state, zip"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Customer destination address for courier dispatch</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{ color: '#ff0000', backgroundColor: '#ffd0d0' }}
              className="px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 hover:opacity-90"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Scheduling...' : 'Confirm & Schedule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
