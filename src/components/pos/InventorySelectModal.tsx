import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatCurrency } from '../../utils/formatters.ts';
import { Search, X, Box, Tag, ShieldCheck } from 'lucide-react';

interface InventorySelectModalProps {
  onSelectItem: (item: InventoryItem) => void;
  onClose: () => void;
}

export const InventorySelectModal: React.FC<InventorySelectModalProps> = ({
  onSelectItem,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchInventory = async () => {
      setLoading(true);
      try {
        const results = await api.searchInventory(searchTerm);
        if (active) setItems(results);
      } catch (err) {
        console.error('Failed to search inventory:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = setTimeout(fetchInventory, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95dvh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 bg-slate-50">

          <div className="flex items-center space-x-2">
            <Box className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900">
              Select Inventory Item / Asset
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
              placeholder="Search by SKU, serial number, item tag, brand, model, or description..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden"
            />
          </div>
        </div>

        {/* Items List */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading catalog assets...</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">No inventory matches found.</p>
              <p className="text-xs text-slate-400 mt-1">
                You can also enter custom/non-catalog items directly into the POS line items.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {items.map(item => {
                const isAvailable = item.status === 'Available';
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-lg border transition-all flex items-center justify-between ${
                      isAvailable
                        ? 'border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 bg-white'
                        : 'border-slate-100 bg-slate-50/80 opacity-70'
                    }`}
                  >
                    <div className="flex-1 mr-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {item.sku}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.condition === 'Brand New'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.condition === 'A'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          Cond: {item.condition}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            isAvailable
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-slate-900 mt-1">
                        {item.brand && <span className="text-amber-700 mr-1">[{item.brand}]</span>}
                        {item.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                        {item.serial_number && (
                          <span className="font-mono flex items-center">
                            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            SN: <strong className="text-slate-800 ml-1">{item.serial_number}</strong>
                          </span>
                        )}
                        {item.item_tag && (
                          <span className="font-mono flex items-center">
                            <Tag className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            Tag: <strong className="text-slate-800 ml-1">{item.item_tag}</strong>
                          </span>
                        )}
                        <span>Loc: <strong>{item.location}</strong></span>
                        <span>Stock: <strong>{item.quantity}</strong></span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-slate-900 font-mono">
                        {formatCurrency(item.selling_price)}
                      </p>
                      {item.unit_cost > 0 && (
                        <p className="text-[10px] text-slate-400">
                          Cost: {formatCurrency(item.unit_cost)}
                        </p>
                      )}
                      <button
                        disabled={!isAvailable}
                        onClick={() => onSelectItem(item)}
                        className={`mt-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
                          isAvailable
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {isAvailable ? 'Add to Order' : 'Not Available'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
