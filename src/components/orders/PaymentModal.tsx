import React, { useState } from 'react';
import { Order, PaymentMethod } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatCurrency } from '../../utils/formatters.ts';
import { DollarSign, X, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  order: Order;
  onPaymentSuccess: (updatedOrder: Order) => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  order,
  onPaymentSuccess,
  onClose,
}) => {
  const [amount, setAmount] = useState<string>(String(order.balance_due));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (parsedAmount > order.balance_due + 0.01) {
      setError(`Payment cannot exceed the remaining balance (${formatCurrency(order.balance_due)}).`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.addPayment(order.id, {
        payment_method: paymentMethod,
        amount: parsedAmount,
        payment_date: paymentDate,
        reference_number: referenceNumber,
        notes,
      });
      onPaymentSuccess(res.order);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Record Payment Transaction
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Summary banner */}
        <div className="px-6 py-3 bg-amber-50/60 border-b border-amber-200/60 flex justify-between items-center text-xs">
          <div>
            <span className="font-bold text-slate-900 font-mono">{order.order_number}</span>
            <span className="text-slate-500 ml-1">({order.customer?.display_name || 'Customer'})</span>
          </div>
          <div>
            <span className="text-slate-600">Balance Due: </span>
            <span className="font-mono font-bold text-amber-700 text-sm">
              {formatCurrency(order.balance_due)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Amount ($) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-semibold">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={order.balance_due}
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-base font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>
            <div className="flex space-x-2 mt-1.5">
              <button
                type="button"
                onClick={() => setAmount(String(order.balance_due))}
                className="text-[11px] text-amber-600 hover:text-amber-800 font-semibold cursor-pointer"
              >
                Pay Full Balance ({formatCurrency(order.balance_due)})
              </button>
              {order.balance_due > 100 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.round(order.balance_due / 2)))}
                  className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Pay 50%
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
              >
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Check">Check</option>
                <option value="ACH">ACH Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reference / Check / Auth # (Optional)
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
              placeholder="e.g. Check #5021 or Auth #92831"
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Partial cash payment at front register"
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
