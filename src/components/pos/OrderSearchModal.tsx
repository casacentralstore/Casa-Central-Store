import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { formatCurrency, formatDate } from '../../utils/formatters.ts';
import { Search, X, Receipt, Calendar, User, Phone } from 'lucide-react';

interface OrderSearchModalProps {
  onSelectOrder: (orderId: string) => void;
  onClose: () => void;
}

export const OrderSearchModal: React.FC<OrderSearchModalProps> = ({
  onSelectOrder,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const results = await api.searchOrders(searchTerm);
        if (active) setOrders(results);
      } catch (err) {
        console.error('Failed to search orders:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = setTimeout(fetchOrders, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Partially Paid':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Completed':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95dvh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 bg-slate-50">

          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900">
              Load Existing Order
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by Order # (e.g. CASA-592814), Customer name, phone, or date..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden"
            />
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Searching orders...</div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No orders matched your search.
            </div>
          ) : (
            <div className="space-y-1">
              {orders.map(o => (
                <div
                  key={o.id}
                  onClick={() => onSelectOrder(o.id)}
                  className="p-3 hover:bg-amber-50/60 rounded-lg cursor-pointer transition-colors flex items-center justify-between border border-transparent hover:border-amber-200"
                >
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {o.order_number}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                          o.status
                        )}`}
                      >
                        {o.status}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(o.transaction_date)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-600 mt-1">
                      <span className="flex items-center font-medium">
                        <User className="w-3 h-3 mr-1 text-slate-400" />
                        {o.customer_name}
                      </span>
                      {o.customer_phone && (
                        <span className="flex items-center text-slate-500">
                          <Phone className="w-3 h-3 mr-1 text-slate-400" />
                          {o.customer_phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-sm text-slate-900">
                      {formatCurrency(o.invoice_total)}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Bal: <span className={o.balance_due > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600'}>
                        {formatCurrency(o.balance_due)}
                      </span>
                    </p>
                    <button className="mt-1 px-2.5 py-0.5 text-xs font-semibold bg-slate-100 hover:bg-amber-500 hover:text-slate-950 rounded text-slate-700 transition-colors cursor-pointer">
                      Load Into POS
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
