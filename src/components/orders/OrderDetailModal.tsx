import React, { useState } from 'react';
import { Order, TaxSettings, User } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatCurrency, formatDate, formatDateTime, formatTime } from '../../utils/formatters.ts';
import { PaymentModal } from './PaymentModal.tsx';
import { DocumentViewerModal } from '../documents/DocumentViewerModal.tsx';
import { FulfillModal } from './FulfillModal.tsx';
import { OrderAuditTrail } from './OrderAuditTrail.tsx';
import {
  X,
  FileText,
  Printer,
  Package,
  DollarSign,
  Edit,
  XCircle,
  Clock,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  FileCheck2,
  Truck,
  CheckCircle,
} from 'lucide-react';

interface OrderDetailModalProps {
  orderId: string;
  settings: TaxSettings;
  currentUser: User;
  onClose: () => void;
  onEditOrder: (orderId: string) => void;
  onOrderUpdated: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  orderId,
  settings,
  onClose,
  onEditOrder,
  onOrderUpdated,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [documentModalType, setDocumentModalType] = useState<'Invoice' | 'Receipt' | 'Packing Slip' | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [updatingActionStatus, setUpdatingActionStatus] = useState(false);

  const handleToggleActionStatus = async () => {
    if (!order) return;
    const currentAction = order.fulfillment_status || 'Pick Up';
    const nextAction = currentAction === 'Picked Up' ? 'Pick Up' : 'Picked Up';
    setUpdatingActionStatus(true);
    try {
      const updated = await api.updateFulfillmentStatus(order.id, nextAction);
      setOrder(updated);
      onOrderUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update action status');
    } finally {
      setUpdatingActionStatus(false);
    }
  };

  React.useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const data = await api.getOrder(orderId);
        setOrder(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch order');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!order) return;
    try {
      const updated = await api.cancelOrder(order.id, cancelReason || 'Cancelled by staff');
      setOrder(updated);
      setShowCancelPrompt(false);
      onOrderUpdated();
    } catch (err: any) {
      alert(err.message || 'Could not cancel order');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white p-6 rounded-xl shadow-xl text-xs text-slate-500">
          Loading order details...
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white p-6 rounded-xl shadow-xl text-center space-y-3">
          <p className="text-sm font-semibold text-rose-600">{error || 'Order not found'}</p>
          <button onClick={onClose} className="px-3 py-1 bg-slate-100 rounded text-xs font-semibold cursor-pointer">
            Close
          </button>
        </div>
      </div>
    );
  }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-black font-mono text-slate-900">
              {order.order_number}
            </h1>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(order.status)}`}>
              {order.status}
            </span>
            <span className="text-xs text-slate-500">
              Placed on {formatDate(order.transaction_date)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEditOrder(order.id)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Edit in POS
            </button>
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={order.status === 'Cancelled' || order.balance_due <= 0}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 shadow-2xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5 mr-1" />
              Add Payment
            </button>
            <div className="h-4 w-px bg-slate-300 mx-1"></div>
            <button
              onClick={() => setDocumentModalType('Invoice')}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 mr-1 text-amber-600" />
              Invoice
            </button>
            <button
              onClick={() => setDocumentModalType('Receipt')}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Receipt
            </button>
            <button
              onClick={() => setDocumentModalType('Packing Slip')}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              Packing Slip
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Customer & Fulfillment Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customer Details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center">
                <UserIcon className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Customer Details
              </h3>
              <p className="font-bold text-sm text-slate-900">
                {order.customer?.display_name || 'Walk-in Customer'}
              </p>
              <div className="text-slate-600 space-y-1">
                <p className="flex items-center">
                  <Phone className="w-3 h-3 mr-1 text-slate-400" />
                  {order.customer?.phone || 'No phone'}
                </p>
                {order.customer?.email && (
                  <p className="flex items-center">
                    <Mail className="w-3 h-3 mr-1 text-slate-400" />
                    {order.customer.email}
                  </p>
                )}
                {order.customer?.address && (
                  <p className="flex items-start">
                    <MapPin className="w-3 h-3 mr-1 text-slate-400 shrink-0 mt-0.5" />
                    <span>{order.customer.address}, {order.customer.city} {order.customer.state} {order.customer.zip}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Logistics & Schedule */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center">
                  <Package className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  Fulfillment & Logistics
                </h3>
                {Boolean(order.is_fulfilled || order.fulfillment_status || order.so_number) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Fulfilled
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-700">Method:</span>
                <span className="font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                  {order.logistics_method}
                </span>
                {order.so_number && (
                  <span className="font-mono text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                    SO: {order.so_number}
                  </span>
                )}
              </div>

              {order.carrier && (
                <div className="text-slate-600 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200">
                  <p><strong>Carrier:</strong> <span className="font-semibold text-slate-800">{order.carrier}</span></p>
                  {order.tracking_number && (
                    <p><strong>Tracking:</strong> <span className="font-mono text-slate-800">{order.tracking_number}</span></p>
                  )}
                  {order.delivery_schedule && (
                    <p><strong>Schedule:</strong> {order.delivery_schedule}</p>
                  )}
                  {order.fulfillment_status && (
                    <p><strong>Fulfillment Action:</strong> <span className="font-bold text-indigo-700">{order.fulfillment_status}</span></p>
                  )}
                </div>
              )}

              {order.logistics_method === 'Delivery' ? (
                <div className="text-slate-600 space-y-1">
                  <p><strong>Scheduled:</strong> {order.delivery_schedule || formatDate(order.delivery_date)}</p>
                  <p><strong>Destination:</strong> {order.delivery_address || order.customer?.address || 'Store delivery'}</p>
                  <p><strong>Status:</strong> {order.fulfillment_status || order.delivery_status || 'Scheduled'}</p>
                </div>
              ) : (
                <div className="text-slate-600 space-y-1">
                  <p><strong>Scheduled Pickup:</strong> {order.delivery_schedule || formatDate(order.scheduled_pickup_date)}</p>
                  <p><strong>Status:</strong> {order.fulfillment_status || order.pickup_status || 'Scheduled'}</p>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200/70 space-y-2">
                {/* Fulfillment Action Status Card */}
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/80 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Pickup / Action Status
                      </span>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold border ${
                            order.fulfillment_status === 'Picked Up'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-indigo-100 text-indigo-900 border-indigo-300'
                          }`}
                        >
                          {order.fulfillment_status || 'Pick Up'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {order.fulfillment_status === 'Picked Up'
                            ? (order.picked_up_date
                                ? `Package picked up on ${formatDate(order.picked_up_date)} at ${formatTime(order.picked_up_date)}`
                                : 'Package collected by customer / carrier')
                            : 'Ready for Pick Up'}
                        </span>
                      </div>
                    </div>

                      <button
                        type="button"
                        onClick={handleToggleActionStatus}
                        disabled={updatingActionStatus}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 ${
                          order.fulfillment_status === 'Picked Up'
                            ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                        title={
                          order.fulfillment_status === 'Picked Up'
                            ? 'Click to revert action status to Pick Up'
                            : 'Store manager action: Click to mark as Picked Up once package is collected'
                        }
                      >
                        {updatingActionStatus ? (
                          <span>Updating...</span>
                        ) : order.fulfillment_status === 'Picked Up' ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Revert to “Pick Up”</span>
                          </>
                        ) : (
                          <>
                            <Package className="w-3.5 h-3.5" />
                            <span>Mark as “Picked Up”</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">
                      * Store manager action: defaults to “Pick Up” upon fulfillment. Change to “Picked Up” once handed over to customer or carrier.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFulfillModal(true)}
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 underline cursor-pointer flex items-center space-x-1"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>View / Update Logistics Details</span>
                  </button>
                </div>
              </div>

            {/* Sales & Financial Overview */}
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-[11px] text-amber-400">
                Financial Summary
              </h3>
              <div className="flex justify-between items-center text-slate-300">
                <span>Invoice Total:</span>
                <span className="font-mono text-base font-bold text-white">
                  {formatCurrency(order.invoice_total)}
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-400 font-semibold">
                <span>Amount Paid:</span>
                <span className="font-mono">{formatCurrency(order.amount_paid)}</span>
              </div>
              <div className="border-t border-slate-800 pt-1.5 flex justify-between items-center">
                <span className="text-slate-400">Balance Due:</span>
                <span className={`font-mono text-base font-black ${order.balance_due > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {formatCurrency(order.balance_due)}
                </span>
              </div>
              <div className="pt-1 text-[11px] text-slate-400 flex justify-between">
                <span>Rep: {order.sales_rep_name || 'Staff'}</span>
                <span>Source: {order.lead_source}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Purchased Items & Assets
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Description & Physical Identification</th>
                    <th className="py-2.5 px-3 text-center">Condition</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items?.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{i + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.sku}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900">{item.description}</span>
                        {(item.serial_number || item.item_tag || item.location) && (
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5 space-x-2">
                            {item.serial_number && <span>S/N: <strong>{item.serial_number}</strong></span>}
                            {item.item_tag && <span>Tag: <strong>{item.item_tag}</strong></span>}
                            {item.location && <span>Loc: {item.location}</span>}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{item.condition || 'A'}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments & Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payments Ledger */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center">
                  <DollarSign className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Recorded Payments ({order.payments?.length || 0})
                </h4>
                {order.balance_due > 0 && order.status !== 'Cancelled' && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    + Add Payment
                  </button>
                )}
              </div>
              {!order.payments || order.payments.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No payment transactions recorded.</p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {order.payments.map((p, idx) => (
                    <div key={idx} className="p-2 bg-white rounded border border-slate-200 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {p.payment_method}
                          {p.reference_number ? ` (${p.reference_number})` : ''}
                        </div>
                        <div className="text-[10px] text-slate-400">{formatDate(p.payment_date)}</div>
                      </div>
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(p.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents & Compliance */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center">
                <FileCheck2 className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Attached Documents & Certificates
              </h4>
              {order.tax_exempt && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold">Tax Exemption Verified</span>
                    <p className="text-[10px] text-emerald-700">ST-3 / Resale certificate linked</p>
                  </div>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold">
                    0.00% TAX
                  </span>
                </div>
              )}
              {!order.documents || order.documents.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No uploaded documents attached.</p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {order.documents.map((d, idx) => (
                    <div key={idx} className="p-2 bg-white rounded border border-slate-200 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-slate-800">{d.file_name}</p>
                        <p className="text-[10px] text-slate-400">{d.document_type} • {formatDateTime(d.uploaded_at)}</p>
                      </div>
                      <a
                        href={d.storage_url}
                        download={d.file_name}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-amber-600 hover:underline cursor-pointer"
                      >
                        View / Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Audit History Log */}
          {order.audit_logs && order.audit_logs.length > 0 && (
            <OrderAuditTrail logs={order.audit_logs} />
          )}

          {/* Order Cancellation Warning & Action */}
          {order.status !== 'Cancelled' && (
            <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
              <div>
                {showCancelPrompt ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      placeholder="Reason for cancellation..."
                      className="px-2.5 py-1 text-xs border border-rose-300 rounded outline-hidden"
                    />
                    <button
                      onClick={handleCancelOrder}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded shadow-2xs cursor-pointer"
                    >
                      Confirm Cancel Order
                    </button>
                    <button
                      onClick={() => setShowCancelPrompt(false)}
                      className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                    >
                      Never mind
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCancelPrompt(true)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Cancel Order Transaction (Restores Inventory)
                  </button>
                )}
              </div>

              {Boolean(order.is_fulfilled || order.fulfillment_status || (order.status as string) === 'Fulfilled' || order.so_number) ? (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                >
                  Close
                </button>
              ) : (
                <button
                  onClick={() => setShowFulfillModal(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>Fulfill</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showPaymentModal && order && (
        <PaymentModal
          order={order}
          onPaymentSuccess={updated => {
            setOrder(updated);
            onOrderUpdated();
          }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {documentModalType && order && (
        <DocumentViewerModal
          order={order}
          settings={settings}
          initialType={documentModalType}
          onClose={() => setDocumentModalType(null)}
        />
      )}

      {showFulfillModal && order && (
        <FulfillModal
          order={order}
          isOpen={showFulfillModal}
          onClose={() => setShowFulfillModal(false)}
          onSuccess={updated => {
            setOrder(updated);
            setShowFulfillModal(false);
            onOrderUpdated();
          }}
        />
      )}
    </div>
  );
};
