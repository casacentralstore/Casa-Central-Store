import React, { useState, useEffect } from 'react';
import { Customer, User } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatCurrency, formatDate } from '../../utils/formatters.ts';
import { CustomerSelectModal } from '../pos/CustomerSelectModal.tsx';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Receipt,
  Edit,
  X,
} from 'lucide-react';

interface CustomersListProps {
  currentUser: User;
  onOpenOrder: (orderId: string) => void;
}

export const CustomersList: React.FC<CustomersListProps> = ({
  onOpenOrder,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<(Customer & { orders: any[] }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers(search);
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 200);
    return () => clearTimeout(timer);
  }, [search]);

  const loadCustomerDetail = async (id: string) => {
    setSelectedCustomerId(id);
    setDetailLoading(true);
    try {
      const data = await api.getCustomer(id);
      setCustomerDetail(data);
    } catch (err) {
      console.error('Failed to load customer detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStartEdit = (c: Customer) => {
    setEditingCustomer(c);
    setEditForm({
      first_name: c.first_name,
      last_name: c.last_name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      city: c.city || '',
      state: c.state || 'NJ',
      zip: c.zip || '',
      notes: c.notes || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    try {
      const updated = await api.updateCustomer(editingCustomer.id, editForm);
      setEditingCustomer(null);
      fetchCustomers();
      if (selectedCustomerId === updated.id) {
        loadCustomerDetail(updated.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update customer');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-800 p-3 sm:p-5 lg:p-6 overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            Customer Directory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer accounts, purchase history, and outstanding balances
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-2xs flex items-center transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add New Customer
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer name, phone number, email, or customer #..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
          />
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[400px]">
        {/* Customers Table (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-[300px]">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse min-w-[550px]">

              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] sticky top-0">
                  <th className="py-2.5 px-3">Customer #</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">City, State</th>
                  <th className="py-2.5 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Loading customers...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  customers.map(c => {
                    const isSelected = selectedCustomerId === c.id;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => loadCustomerDetail(c.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-50/70 border-l-4 border-l-amber-500' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-600">
                          {c.customer_number}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{c.display_name}</span>
                          {c.notes && <span className="text-[10px] text-slate-400 truncate max-w-44 block">{c.notes}</span>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <div className="flex items-center text-[11px]">
                            <Phone className="w-3 h-3 mr-1 text-slate-400" />
                            {c.phone}
                          </div>
                          {c.email && (
                            <div className="flex items-center text-[10px] text-slate-400">
                              <Mail className="w-2.5 h-2.5 mr-1" />
                              {c.email}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {c.city ? `${c.city}, ${c.state}` : 'N/A'}
                        </td>
                        <td className="py-2.5 px-2 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleStartEdit(c)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                            title="Edit Customer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Detail & Orders History (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-y-auto p-5 flex flex-col space-y-4">
          {!selectedCustomerId ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Users className="w-10 h-10 mb-2 text-slate-300" />
              <p className="text-sm font-semibold">Select a customer</p>
              <p className="text-xs text-slate-400 mt-1">
                View detailed profile, order history, lifetime sales, and balance
              </p>
            </div>
          ) : detailLoading || !customerDetail ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading details...</div>
          ) : (
            <>
              {/* Header Profile */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      {customerDetail.display_name}
                    </h2>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {customerDetail.customer_number}
                    </span>
                  </div>
                  <button
                    onClick={() => handleStartEdit(customerDetail)}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded text-slate-700 flex items-center cursor-pointer"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Phone</p>
                    <p className="font-semibold text-slate-800">{customerDetail.phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Email</p>
                    <p className="truncate text-slate-800">{customerDetail.email || 'None'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Address</p>
                    <p className="text-slate-800">
                      {customerDetail.address ? `${customerDetail.address}, ${customerDetail.city} ${customerDetail.state} ${customerDetail.zip}` : 'No address on file'}
                    </p>
                  </div>
                  {customerDetail.notes && (
                    <div className="col-span-2 pt-1 border-t border-slate-200">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Notes</p>
                      <p className="italic text-slate-700">{customerDetail.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] uppercase font-semibold text-slate-400">Total Orders</p>
                  <p className="text-base font-black text-slate-900 mt-0.5">{customerDetail.total_orders}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-[10px] uppercase font-semibold text-emerald-700">Lifetime Sales</p>
                  <p className="text-base font-black text-emerald-900 mt-0.5 font-mono">
                    {formatCurrency(customerDetail.total_sales)}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-[10px] uppercase font-semibold text-amber-800">Balance Due</p>
                  <p className="text-base font-black text-amber-900 mt-0.5 font-mono">
                    {formatCurrency(customerDetail.outstanding_balance)}
                  </p>
                </div>
              </div>

              {/* Order History Table */}
              <div className="space-y-2 flex-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center">
                  <Receipt className="w-3.5 h-3.5 mr-1 text-amber-500" />
                  Order History ({customerDetail.orders?.length || 0})
                </h3>
                {!customerDetail.orders || customerDetail.orders.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No orders recorded yet.</p>
                ) : (
                  <div className="space-y-2 text-xs max-h-60 overflow-y-auto">
                    {customerDetail.orders.map(o => (
                      <div
                        key={o.id}
                        onClick={() => onOpenOrder(o.id)}
                        className="p-3 bg-slate-50 hover:bg-amber-50/60 rounded-lg border border-slate-200 cursor-pointer transition-colors flex justify-between items-center"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-amber-700">{o.order_number}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 font-semibold">
                              {o.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(o.transaction_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-slate-900">{formatCurrency(o.invoice_total)}</p>
                          {o.balance_due > 0 && (
                            <p className="text-[10px] text-amber-700 font-mono font-semibold">
                              Bal: {formatCurrency(o.balance_due)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Customer Modal */}
      {showCreateModal && (
        <CustomerSelectModal
          onSelectCustomer={newCust => {
            setShowCreateModal(false);
            fetchCustomers();
            loadCustomerDetail(newCust.id);
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <h2 className="text-base font-bold text-slate-900">
                Edit Customer {editingCustomer.customer_number}
              </h2>
              <button onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.first_name}
                    onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.last_name}
                    onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold mb-1">ZIP Code</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={editForm.zip}
                    onChange={async e => {
                      const z = e.target.value;
                      setEditForm(prev => ({ ...prev, zip: z }));
                      if (z.trim().length === 5) {
                        const m = await api.lookupZip(z.trim());
                        if (m) {
                          setEditForm(prev => ({
                            ...prev,
                            city: m.city || prev.city,
                            state: m.state || prev.state,
                          }));
                        }
                      }
                    }}
                    placeholder="07087"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={e => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-3 py-1.5 bg-slate-100 rounded text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
