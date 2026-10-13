import React, { useState, useEffect } from 'react';
import { Customer } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { Search, UserPlus, AlertCircle, X, Phone, Mail, MapPin } from 'lucide-react';

interface CustomerSelectModalProps {
  onSelectCustomer: (customer: Customer) => void;
  onClose: () => void;
}

export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  onSelectCustomer,
  onClose,
}) => {
  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  // New Customer Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: 'NJ',
    zip: '',
    notes: '',
  });

  const [duplicates, setDuplicates] = useState<Customer[]>([]);
  const [zipLoading, setZipLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Debounced Search
  useEffect(() => {
    let active = true;
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const results = await api.getCustomers(searchTerm);
        if (active) setCustomers(results);
      } catch (err) {
        console.error('Failed to search customers:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = setTimeout(fetchCustomers, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  // Check duplicates when phone changes in create mode
  const handlePhoneBlur = async () => {
    if (!formData.phone || formData.phone.length < 7) return;
    try {
      const dupes = await api.checkCustomerDuplicates(formData.phone, formData.email);
      setDuplicates(dupes);
    } catch {
      // ignore
    }
  };

  // ZIP Code Auto-population
  const handleZipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const zip = e.target.value;
    setFormData(prev => ({ ...prev, zip }));
    if (zip.length === 5) {
      setZipLoading(true);
      try {
        const match = await api.lookupZip(zip);
        if (match) {
          setFormData(prev => ({
            ...prev,
            city: match.city || prev.city,
            state: match.state || prev.state,
          }));
        }
      } finally {
        setZipLoading(false);
      }
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setFormError('First and last name are required.');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('Phone number is required.');
      return;
    }

    try {
      const created = await api.createCustomer(formData);
      onSelectCustomer(created);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create customer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95dvh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 bg-slate-50">

          <div className="flex space-x-2">
            <button
              onClick={() => { setMode('search'); setFormError(''); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'search'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Search Customer
            </button>
            <button
              onClick={() => { setMode('create'); setFormError(''); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'create'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 inline mr-1" />
              New Customer
            </button>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Mode */}
        {mode === 'search' ? (
          <div className="p-6 flex flex-col flex-1 overflow-hidden">
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by customer name, phone, email, or customer #..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden"
              />
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 max-h-96">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Searching customers...</div>
              ) : customers.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500">No customers found.</p>
                  <button
                    onClick={() => setMode('create')}
                    className="mt-2 text-xs text-amber-600 font-semibold hover:underline cursor-pointer"
                  >
                    + Create new customer "{searchTerm}"
                  </button>
                </div>
              ) : (
                customers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => onSelectCustomer(c)}
                    className="p-3 hover:bg-amber-50/60 cursor-pointer rounded-lg transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm text-slate-900 group-hover:text-amber-800">
                          {c.display_name}
                        </span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {c.customer_number}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center space-x-3">
                        <span className="flex items-center">
                          <Phone className="w-3 h-3 mr-1 text-slate-400" />
                          {c.phone}
                        </span>
                        {c.email && (
                          <span className="flex items-center">
                            <Mail className="w-3 h-3 mr-1 text-slate-400" />
                            {c.email}
                          </span>
                        )}
                        {c.city && (
                          <span className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                            {c.city}, {c.state}
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 group-hover:border-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 rounded shadow-xs cursor-pointer">
                      Select
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Create Mode */
          <form onSubmit={handleCreateCustomer} className="p-6 overflow-y-auto space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                {formError}
              </div>
            )}

            {duplicates.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                <div className="flex items-center font-bold mb-1">
                  <AlertCircle className="w-4 h-4 mr-1.5 text-amber-600 shrink-0" />
                  Potential duplicate customer found with this phone/email:
                </div>
                <div className="space-y-1 mt-1 pl-5">
                  {duplicates.map(d => (
                    <div key={d.id} className="flex justify-between items-center">
                      <span>{d.display_name} ({d.phone})</span>
                      <button
                        type="button"
                        onClick={() => onSelectCustomer(d)}
                        className="text-amber-800 font-bold underline hover:text-amber-950 ml-2 cursor-pointer"
                      >
                        Use this customer instead
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                  placeholder="e.g. Maria"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                  placeholder="e.g. Gonzalez"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onBlur={handlePhoneBlur}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                  placeholder="e.g. 201-555-0199"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                  placeholder="maria@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                placeholder="e.g. 120 48th St"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ZIP Code {zipLoading && <span className="text-[10px] text-amber-600 font-normal">(Looking up...)</span>}
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={formData.zip}
                  onChange={handleZipChange}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                  placeholder="07087"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                  placeholder="Union City"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  maxLength={2}
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                  placeholder="NJ"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Notes</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                placeholder="Preferences, contractor status, delivery instructions..."
              />
            </div>

            <div className="pt-2 flex justify-end space-x-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setMode('search')}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-xs cursor-pointer"
              >
                Save & Select Customer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
