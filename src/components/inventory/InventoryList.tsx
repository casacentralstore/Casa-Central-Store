import React, { useState, useEffect } from 'react';
import {
  InventoryItem,
  TaxSettings,
  User,
  CONDITION_OPTIONS,
  ITEM_TAG_OPTIONS,
  LOCATION_OPTIONS,
} from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatCurrency } from '../../utils/formatters.ts';
import { downloadInventoryTemplate } from '../../utils/inventoryTemplate.ts';
import {
  Search,
  Plus,
  ShieldCheck,
  Tag,
  Edit,
  RotateCcw,
  AlertTriangle,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  Check,
  Loader2,
  Download,
  Info,
} from 'lucide-react';
import { BulkAddInventoryModal } from './BulkAddInventoryModal.tsx';

interface InventoryListProps {
  settings: TaxSettings;
  currentUser: User;
}

export const InventoryList: React.FC<InventoryListProps> = ({
  settings,
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [conditionFilter, setConditionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const limit = 25;

  // Add / Edit Modal
  const [showUpsertModal, setShowUpsertModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Inline variable editing state (for QTY and SELLING PRICE)
  const [inlineValues, setInlineValues] = useState<
    Record<string, { quantity?: string; selling_price?: string }>
  >({});
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [savedRowId, setSavedRowId] = useState<string | null>(null);

  const handleInlineChange = (
    itemId: string,
    field: 'quantity' | 'selling_price',
    value: string
  ) => {
    setInlineValues(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const handleSaveInline = async (
    item: InventoryItem,
    field: 'quantity' | 'selling_price',
    rawVal: string | undefined
  ) => {
    if (rawVal === undefined) return;
    const key = `${item.id}-${field}`;
    let numVal = field === 'quantity' ? parseInt(rawVal, 10) : parseFloat(rawVal);
    if (isNaN(numVal) || numVal < 0) {
      // Revert if invalid
      setInlineValues(prev => ({
        ...prev,
        [item.id]: {
          ...prev[item.id],
          [field]: field === 'quantity' ? String(item.quantity) : String(item.selling_price),
        },
      }));
      return;
    }
    if (field === 'selling_price') {
      numVal = Math.round(numVal * 100) / 100;
    }
    const currentVal = (item as any)[field];
    if (numVal === currentVal) {
      return; // No change
    }

    setSavingRowId(key);
    try {
      await api.updateInventoryItem(item.id, { [field]: numVal });
      setItems(prev =>
        prev.map(it => (it.id === item.id ? { ...it, [field]: numVal } : it))
      );
      setSavedRowId(key);
      setTimeout(() => {
        setSavedRowId(prev => (prev === key ? null : prev));
      }, 2500);
    } catch (err: any) {
      alert(err.message || `Failed to update ${field}`);
      fetchInventory();
    } finally {
      setSavingRowId(null);
    }
  };

  const [modalForm, setModalForm] = useState({
    sku: '',
    model_number: '',
    brand: '',
    serial_number: '',
    item_tag: 'None',
    description: '',
    condition: 'Brand New - Sealed Box',
    quantity: 1,
    unit_cost: 0,
    selling_price: 0,
    location: 'MS Appliances | Showroom',
    status: 'Available',
    source: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await api.getInventory({
        search,
        condition: conditionFilter,
        status: statusFilter,
        limit,
        offset: (page - 1) * limit,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchInventory, 200);
    return () => clearTimeout(timer);
  }, [search, conditionFilter, statusFilter, page]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalForm({
      sku: '',
      model_number: '',
      brand: '',
      serial_number: '',
      item_tag: 'None',
      description: '',
      condition: 'Brand New - Sealed Box',
      quantity: 1,
      unit_cost: 0,
      selling_price: 0,
      location: 'MS Appliances | Showroom',
      status: 'Available',
      source: 'Open Box / Liquidation',
      notes: '',
    });
    setFormError('');
    setShowUpsertModal(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setModalForm({
      sku: item.sku,
      model_number: item.model_number || '',
      brand: item.brand || '',
      serial_number: item.serial_number || '',
      item_tag: item.item_tag || '',
      description: item.description,
      condition: item.condition,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      selling_price: item.selling_price,
      location: item.location,
      status: item.status,
      source: item.source || '',
      notes: item.notes || '',
    });
    setFormError('');
    setShowUpsertModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (editingItem) {
      // QTY and SELLING PRICE are editable variables; other fields updated via template
      try {
        const updatedQty = Math.max(0, parseInt(String(modalForm.quantity), 10) || 0);
        const updatedPrice = Math.max(0, parseFloat(String(modalForm.selling_price)) || 0);
        await api.updateInventoryItem(editingItem.id, {
          quantity: updatedQty,
          selling_price: Math.round(updatedPrice * 100) / 100,
        });
        setShowUpsertModal(false);
        fetchInventory();
      } catch (err: any) {
        setFormError(err.message || 'Failed to update item variables');
      }
    } else {
      if (!modalForm.sku.trim() || !modalForm.description.trim()) {
        setFormError('SKU and description are required.');
        return;
      }
      try {
        await api.createInventoryItem(modalForm);
        setShowUpsertModal(false);
        fetchInventory();
      } catch (err: any) {
        setFormError(err.message || 'Failed to save inventory item');
      }
    }
  };

  const handleQuickStatusChange = async (item: InventoryItem, newStatus: string) => {
    try {
      await api.updateInventoryItem(item.id, { status: newStatus });
      fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Sold':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      case 'Reserved':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Picked Up':
      case 'Delivered':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'Returned':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Damaged':
      case 'Hold':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-800 p-3 sm:p-5 lg:p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            Inventory & Asset Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Individual physical assets with serial/tag tracking & standard SKU catalog ({total} assets)
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowBulkAddModal(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center transition-colors cursor-pointer border border-slate-700"
            title="Download product template (XLSX) and bulk add assets"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
            Bulk Add Assets (XLSX)
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-2xs flex items-center transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Inventory Asset / SKU
          </button>
        </div>
      </div>

      {/* Success Notification if Bulk Import Completed */}
      {bulkSuccessMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900 animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{bulkSuccessMsg}</span>
          </div>
          <button
            onClick={() => setBulkSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs mb-4 flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-56">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search SKU, serial number, item tag, brand, description..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
          />
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-slate-500 font-semibold">Condition:</span>
          <select
            value={conditionFilter}
            onChange={e => { setConditionFilter(e.target.value); setPage(1); }}
            className="px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">All Conditions</option>
            {settings.conditions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-slate-500 font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Reserved">Reserved</option>
            <option value="Sold">Sold</option>
            <option value="Picked Up">Picked Up</option>
            <option value="Delivered">Delivered</option>
            <option value="Returned">Returned</option>
            <option value="Damaged">Damaged</option>
            <option value="Hold">Hold</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-[350px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] sticky top-0">
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Description & Brand</th>
                <th className="py-3 px-3">Serial / Asset Tag</th>
                <th className="py-3 px-2 text-center">Cond</th>
                <th className="py-3 px-2">Location</th>
                <th className="py-2.5 px-2 text-center bg-amber-50/40">
                  <div className="inline-flex flex-col items-center">
                    <span className="flex items-center space-x-1 text-slate-800">
                      <span>Qty</span>
                      <Edit className="w-2.5 h-2.5 text-amber-600" />
                    </span>
                    <span className="text-[8px] font-bold text-amber-700 bg-amber-100/70 px-1 py-0.2 rounded border border-amber-300 uppercase tracking-tight">
                      Variable
                    </span>
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Cost ($)</th>
                <th className="py-2.5 px-3 text-right bg-amber-50/40">
                  <div className="inline-flex flex-col items-end">
                    <span className="flex items-center space-x-1 text-slate-800">
                      <span>Selling Price ($)</span>
                      <Edit className="w-2.5 h-2.5 text-amber-600" />
                    </span>
                    <span className="text-[8px] font-bold text-amber-700 bg-amber-100/70 px-1 py-0.2 rounded border border-amber-300 uppercase tracking-tight">
                      Variable
                    </span>
                  </div>
                </th>
                <th className="py-3 px-2 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">Loading inventory...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">No inventory items found.</td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {item.sku}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">
                        {item.brand && <span className="text-amber-700 mr-1">[{item.brand}]</span>}
                        {item.description}
                      </div>
                      {item.model_number && (
                        <div className="text-[10px] text-slate-400 font-mono">Model: {item.model_number}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {item.serial_number ? (
                        <div className="flex items-center text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          SN: <strong className="text-slate-800 ml-1">{item.serial_number}</strong>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">[Standard SKU]</span>
                      )}
                      {item.item_tag && (
                        <div className="flex items-center text-[10px] text-slate-500">
                          <Tag className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          Tag: <span className="font-semibold">{item.item_tag}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-slate-700">
                      {item.condition}
                    </td>
                    <td className="py-3 px-2 text-slate-600 text-[11px]">
                      {item.location}
                    </td>
                    {/* Qty (Editable Variable) */}
                    <td className="py-2 px-2 text-center bg-amber-50/20">
                      <div className="inline-flex items-center justify-center space-x-1">
                        <input
                          type="number"
                          min="0"
                          title="Variable field: Click or type to edit Quantity directly"
                          value={
                            inlineValues[item.id]?.quantity !== undefined
                              ? inlineValues[item.id]!.quantity
                              : item.quantity
                          }
                          onChange={(e) =>
                            handleInlineChange(item.id, 'quantity', e.target.value)
                          }
                          onBlur={(e) =>
                            handleSaveInline(item, 'quantity', e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className={`w-16 px-1.5 py-1 text-center font-bold text-xs rounded border transition-colors shadow-2xs ${
                            savedRowId === `${item.id}-quantity`
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200'
                              : 'border-slate-300 bg-white text-slate-900 hover:border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                          }`}
                        />
                        {savingRowId === `${item.id}-quantity` && (
                          <Loader2 className="w-3 h-3 text-amber-600 animate-spin shrink-0" />
                        )}
                        {savedRowId === `${item.id}-quantity` && (
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    </td>
                    {/* Unit Cost (Read-only, updated via template) */}
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {formatCurrency(item.unit_cost)}
                    </td>
                    {/* Selling Price (Editable Variable) */}
                    <td className="py-2 px-3 text-right bg-amber-50/20">
                      <div className="inline-flex items-center justify-end space-x-0.5">
                        <span className="text-slate-400 font-mono text-xs font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          title="Variable field: Click or type to edit Selling Price directly"
                          value={
                            inlineValues[item.id]?.selling_price !== undefined
                              ? inlineValues[item.id]!.selling_price
                              : item.selling_price
                          }
                          onChange={(e) =>
                            handleInlineChange(item.id, 'selling_price', e.target.value)
                          }
                          onBlur={(e) =>
                            handleSaveInline(item, 'selling_price', e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className={`w-24 px-1.5 py-1 text-right font-mono font-bold text-xs rounded border transition-colors shadow-2xs ${
                            savedRowId === `${item.id}-selling_price`
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200'
                              : 'border-slate-300 bg-white text-slate-900 hover:border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                          }`}
                        />
                        {savingRowId === `${item.id}-selling_price` && (
                          <Loader2 className="w-3 h-3 text-amber-600 animate-spin shrink-0 ml-1" />
                        )}
                        {savedRowId === `${item.id}-selling_price` && (
                          <Check className="w-3 h-3 text-emerald-600 shrink-0 ml-1" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                          title="Edit Item Variables (Qty & Selling Price)"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-700" />
                        </button>
                        {item.status !== 'Available' && (
                          <button
                            onClick={() => handleQuickStatusChange(item, 'Available')}
                            className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded cursor-pointer"
                            title="Restore to Available"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Inventory Modal */}
      {showUpsertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <span>
                    {editingItem
                      ? `Edit Item Variables – SKU: ${editingItem.sku}`
                      : 'New Inventory Asset / SKU'}
                  </span>
                  {editingItem && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      Variable Editor
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {editingItem
                    ? 'Only QTY and SELLING PRICE are editable variables. Other specifications are managed via file template.'
                    : 'Add a new inventory asset catalog record or physical asset.'}
                </p>
              </div>
              <button
                onClick={() => setShowUpsertModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
                  {formError}
                </div>
              )}

              {/* In Edit Mode: Dedicated Variables Editor + Specifications Card */}
              {editingItem ? (
                <>
                  {/* Policy Banner */}
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 flex items-start space-x-2.5">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs">Variable Attributes Policy</span>
                      <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                        In the Inventory module, <strong>QTY</strong> and <strong>SELLING PRICE</strong> are editable variables. All other product specifications (SKU, Description, Brand, Serial Number, Tag, Condition, Location, Cost) are fixed in the system and must be updated via file template (XLSX).
                      </p>
                    </div>
                  </div>

                  {/* Active Editable Variables Section */}
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Edit className="w-4 h-4 text-amber-600" />
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Editable Variables
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-800 mb-1">
                          Quantity (QTY) <span className="text-amber-600 font-semibold">(Editable Variable)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={modalForm.quantity}
                          onChange={e =>
                            setModalForm({
                              ...modalForm,
                              quantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                            })
                          }
                          className="w-full px-3 py-2 border-2 border-amber-400 focus:border-amber-500 rounded-lg text-sm font-bold bg-white text-slate-900 shadow-2xs focus:ring-2 focus:ring-amber-200 outline-hidden"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Available physical stock count</p>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-800 mb-1">
                          Selling Price ($) <span className="text-amber-600 font-semibold">(Editable Variable)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-mono font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={modalForm.selling_price}
                            onChange={e =>
                              setModalForm({
                                ...modalForm,
                                selling_price: Math.max(0, parseFloat(e.target.value) || 0),
                              })
                            }
                            className="w-full pl-7 pr-3 py-2 border-2 border-amber-400 focus:border-amber-500 rounded-lg text-sm font-bold font-mono bg-white text-slate-900 shadow-2xs focus:ring-2 focus:ring-amber-200 outline-hidden"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Customer selling price per unit</p>
                      </div>
                    </div>
                  </div>

                  {/* Read-Only Product Specifications */}
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center">
                        <Lock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Product Specifications (Read-Only – Update via Template)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUpsertModal(false);
                          setShowBulkAddModal(true);
                        }}
                        className="text-[10px] text-amber-700 hover:text-amber-800 font-bold underline cursor-pointer flex items-center space-x-1"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        <span>Update via File Template</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">SKU / Model</span>
                        <span className="font-mono font-bold text-slate-800 text-xs">{modalForm.sku}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Brand</span>
                        <span className="font-semibold text-slate-800 text-xs">{modalForm.brand || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Model Number</span>
                        <span className="font-mono text-slate-800 text-xs">{modalForm.model_number || '—'}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-[10px] text-slate-400 font-medium block">Description</span>
                        <span className="text-slate-700 text-xs">{modalForm.description}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Serial Number</span>
                        <span className="font-mono text-slate-800 text-xs">{modalForm.serial_number || '[Standard SKU]'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Tag</span>
                        <span className="font-semibold text-slate-800 text-xs">{modalForm.item_tag || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Condition</span>
                        <span className="font-semibold text-slate-800 text-xs">{modalForm.condition}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Location</span>
                        <span className="text-slate-800 text-xs truncate" title={modalForm.location}>{modalForm.location}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Unit Cost</span>
                        <span className="font-mono text-slate-600 text-xs">{formatCurrency(modalForm.unit_cost)}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Creation Mode (For new manual SKU, with Bulk Template Guidance) */
                <>
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 flex items-start justify-between">
                    <div className="flex items-start space-x-2">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-xs">Bulk Import Available:</span>
                        <p className="text-[11px] text-indigo-800 mt-0.5">
                          If you need to add inventory assets in bulk, download the official Excel template (XLSX) with dropdowns for Tag, Condition, and Location.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadInventoryTemplate()}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-300 rounded text-[11px] shrink-0 ml-3 flex items-center space-x-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download XLSX</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">SKU <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={modalForm.sku}
                        onChange={e => setModalForm({ ...modalForm, sku: e.target.value })}
                        placeholder="REF-SAM-RF28"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Brand</label>
                      <input
                        type="text"
                        value={modalForm.brand}
                        onChange={e => setModalForm({ ...modalForm, brand: e.target.value })}
                        placeholder="Samsung, LG, Bosch"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Model Number</label>
                      <input
                        type="text"
                        value={modalForm.model_number}
                        onChange={e => setModalForm({ ...modalForm, model_number: e.target.value })}
                        placeholder="WM4000HWA"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Description <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={modalForm.description}
                      onChange={e => setModalForm({ ...modalForm, description: e.target.value })}
                      placeholder="Full title, appliance specifications..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                    />
                  </div>

                  {/* Physical Asset Identification */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <span className="font-bold text-slate-800 block">
                      Individual Physical Asset Identifiers (For unique items):
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">Serial Number (Unique)</label>
                        <input
                          type="text"
                          value={modalForm.serial_number}
                          onChange={e => setModalForm({ ...modalForm, serial_number: e.target.value })}
                          placeholder="SN-18928372"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Item Physical Tag</label>
                        <select
                          value={modalForm.item_tag || 'None'}
                          onChange={e => setModalForm({ ...modalForm, item_tag: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                        >
                          {ITEM_TAG_OPTIONS.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Condition</label>
                      <select
                        value={modalForm.condition || 'Brand New - Sealed Box'}
                        onChange={e => setModalForm({ ...modalForm, condition: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                      >
                        {(settings.conditions?.length ? settings.conditions : CONDITION_OPTIONS).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Quantity <span className="text-amber-600 font-bold">(Variable)</span></label>
                      <input
                        type="number"
                        min="0"
                        value={modalForm.quantity}
                        onChange={e => setModalForm({ ...modalForm, quantity: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-center font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Cost ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={modalForm.unit_cost}
                        onChange={e => setModalForm({ ...modalForm, unit_cost: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Selling Price ($) <span className="text-amber-600 font-bold">(Variable)</span></label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={modalForm.selling_price}
                        onChange={e => setModalForm({ ...modalForm, selling_price: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Location</label>
                      <select
                        value={modalForm.location || 'MS Appliances | Showroom'}
                        onChange={e => setModalForm({ ...modalForm, location: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                      >
                        {LOCATION_OPTIONS.map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Status</label>
                      <select
                        value={modalForm.status}
                        onChange={e => setModalForm({ ...modalForm, status: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                      >
                        <option value="Available">Available</option>
                        <option value="Reserved">Reserved</option>
                        <option value="Sold">Sold</option>
                        <option value="Picked Up">Picked Up</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Returned">Returned</option>
                        <option value="Damaged">Damaged</option>
                        <option value="Hold">Hold</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Source / Acquisition</label>
                      <input
                        type="text"
                        value={modalForm.source}
                        onChange={e => setModalForm({ ...modalForm, source: e.target.value })}
                        placeholder="e.g. Liquidation lot #42"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Asset Notes</label>
                    <textarea
                      rows={2}
                      value={modalForm.notes}
                      onChange={e => setModalForm({ ...modalForm, notes: e.target.value })}
                      placeholder="Cosmetic condition details, accessories included..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 flex items-center justify-between border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUpsertModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-semibold cursor-pointer text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold cursor-pointer text-xs shadow-2xs transition-colors flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {editingItem ? 'Save Variables (Qty & Selling Price)' : 'Save New Asset'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Inventory Modal */}
      <BulkAddInventoryModal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        onSuccess={(importedCount) => {
          fetchInventory();
          setBulkSuccessMsg(`Successfully imported ${importedCount} inventory assets in bulk!`);
          setTimeout(() => setBulkSuccessMsg(null), 8000);
        }}
      />
    </div>
  );
};
