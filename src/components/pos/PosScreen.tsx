import React, { useState, useEffect } from 'react';
import {
  Customer,
  InventoryItem,
  Order,
  OrderItem,
  TaxSettings,
  User,
  DocumentRecord,
  LeadSource,
  LogisticsMethod,
  PaymentMethod,
  CONDITION_OPTIONS,
  ITEM_TAG_OPTIONS,
  LOCATION_OPTIONS,
} from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatCurrency } from '../../utils/formatters.ts';
import { CustomerSelectModal } from './CustomerSelectModal.tsx';
import { InventorySelectModal } from './InventorySelectModal.tsx';
import { OrderSearchModal } from './OrderSearchModal.tsx';
import { TaxExemptionModal } from './TaxExemptionModal.tsx';
import { DocumentViewerModal } from '../documents/DocumentViewerModal.tsx';
import {
  Plus,
  Trash2,
  Search,
  Save,
  RotateCcw,
  FileText,
  Printer,
  Package,
  CheckCircle,
  AlertCircle,
  UserCheck,
  FileCheck2,
  Calendar,
  AlertTriangle,
  Layers,
} from 'lucide-react';

interface PosScreenProps {
  settings: TaxSettings;
  users: User[];
  currentUser: User;
  onNavigateToOrders?: () => void;
  initialOrderId?: string | null;
}

export const PosScreen: React.FC<PosScreenProps> = ({
  settings,
  users,
  currentUser,
  initialOrderId,
}) => {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Form Fields
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [leadSource, setLeadSource] = useState<LeadSource>('Showroom');
  const [salesRepId, setSalesRepId] = useState<string>(currentUser?.id || 'usr-sales-1');
  const [logisticsMethod, setLogisticsMethod] = useState<LogisticsMethod>('Pick Up');
  const [scheduledPickupDate, setScheduledPickupDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');

  // Customer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerState, setCustomerState] = useState('NJ');
  const [customerZip, setCustomerZip] = useState('');

  // Line Items
  const [lineItems, setLineItems] = useState<OrderItem[]>([
    {
      sku: '',
      serial_number: '',
      description: '',
      condition: 'Brand New - Sealed Box',
      item_tag: 'None',
      location: 'MS Appliances | Showroom',
      quantity: 1,
      unit_price: 0,
      line_total: 0,
      line_number: 1,
    },
  ]);

  // Financials & Adjustments
  const [shippingAmount, setShippingAmount] = useState<number>(0);
  const [installationFee, setInstallationFee] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [taxExempt, setTaxExempt] = useState<boolean>(false);
  const [taxExemptionDoc, setTaxExemptionDoc] = useState<DocumentRecord | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [credit, setCredit] = useState<number>(0);
  const [deposit, setDeposit] = useState<number>(0);
  const [initialPayment, setInitialPayment] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState<string>('');

  // Notes
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState<string>('');

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showOrderSearchModal, setShowOrderSearchModal] = useState(false);
  const [showTaxDocModal, setShowTaxDocModal] = useState(false);
  const [documentModalType, setDocumentModalType] = useState<'Invoice' | 'Receipt' | 'Packing Slip' | null>(null);

  // Status & Feedback
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Calculated Live Totals
  const [calculatedTotals, setCalculatedTotals] = useState({
    subtotal: 0,
    shipping_amount: 0,
    installation_fee: 0,
    sales_tax: 0,
    credit_card_charge: 0,
    invoice_total: 0,
    discount: 0,
    credit: 0,
    tax_rate: 0.0331259,
    tax_rate_formatted: '3.31259%',
    tax_jurisdiction: 'New Jersey (3.31259% UEZ/State Sales Tax)',
  });

  // Load initial order if specified
  useEffect(() => {
    if (initialOrderId) {
      loadOrderById(initialOrderId);
    }
  }, [initialOrderId]);

  // Live Server-Safe Calculation Debounced
  useEffect(() => {
    let active = true;
    const calculate = async () => {
      try {
        const payload = {
          items: lineItems.map(i => ({
            quantity: Math.max(1, Number(i.quantity) || 1),
            unit_price: Math.max(0, Number(i.unit_price) || 0),
          })),
          shipping_amount: Number(shippingAmount) || 0,
          installation_fee: Number(installationFee) || 0,
          discount: Number(discount) || 0,
          credit: Number(credit) || 0,
          tax_exempt: taxExempt,
          payment_method: paymentMethod,
          state: customerState,
          zip: customerZip,
        };
        const result = await api.calculateTotals(payload);
        if (active) {
          setCalculatedTotals(result);
        }
      } catch (err) {
        console.warn('Live calculation error:', err);
      }
    };
    calculate();
    return () => {
      active = false;
    };
  }, [lineItems, shippingAmount, installationFee, discount, credit, taxExempt, paymentMethod, customerState, customerZip]);

  const [zipLoading, setZipLoading] = useState(false);
  const autoPopulateCityStateFromZip = async (zipCode: string) => {
    const clean = zipCode.trim();
    if (clean.length === 5) {
      setZipLoading(true);
      try {
        const match = await api.lookupZip(clean);
        if (match) {
          if (match.city) setCustomerCity(match.city);
          if (match.state) setCustomerState(match.state.toUpperCase());
        }
      } catch (err) {
        console.warn('ZIP lookup error:', err);
      } finally {
        setZipLoading(false);
      }
    }
  };

  const handleZipInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerZip(val);
    if (val.trim().length === 5) {
      autoPopulateCityStateFromZip(val);
    }
  };

  const handleZipBlur = () => {
    if (customerZip.trim().length === 5) {
      autoPopulateCityStateFromZip(customerZip);
    }
  };

  const handleAddLineItem = () => {
    setLineItems(prev => [
      ...prev,
      {
        sku: '',
        serial_number: '',
        description: '',
        condition: 'Brand New - Sealed Box',
        item_tag: 'None',
        location: 'MS Appliances | Showroom',
        quantity: 1,
        unit_price: 0,
        line_total: 0,
        line_number: prev.length + 1,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) {
      setLineItems([
        {
          sku: '',
          serial_number: '',
          description: '',
          condition: 'Brand New - Sealed Box',
          item_tag: 'None',
          location: 'MS Appliances | Showroom',
          quantity: 1,
          unit_price: 0,
          line_total: 0,
          line_number: 1,
        },
      ]);
      return;
    }
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLineItem = (index: number, field: keyof OrderItem, value: any) => {
    setLineItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        const qty = field === 'quantity' ? Math.max(1, Number(value) || 1) : Math.max(1, Number(item.quantity) || 1);
        const price = field === 'unit_price' ? Math.max(0, Number(value) || 0) : Math.max(0, Number(item.unit_price) || 0);
        item.line_total = Math.round((qty * price + Number.EPSILON) * 100) / 100;
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleSelectInventoryItem = (item: InventoryItem) => {
    setShowInventoryModal(false);
    const emptyIndex = lineItems.findIndex(i => !i.sku && !i.description);
    const newLineItem: OrderItem = {
      inventory_item_id: item.id,
      sku: item.sku,
      serial_number: item.serial_number || '',
      description: item.description,
      condition: item.condition || 'Brand New - Sealed Box',
      item_tag: item.item_tag || 'None',
      location: item.location || 'MS Appliances | Showroom',
      quantity: 1,
      unit_price: item.selling_price || 0,
      line_total: item.selling_price || 0,
      line_number: emptyIndex >= 0 ? emptyIndex + 1 : lineItems.length + 1,
    };

    if (emptyIndex >= 0) {
      setLineItems(prev => {
        const next = [...prev];
        next[emptyIndex] = newLineItem;
        return next;
      });
    } else {
      setLineItems(prev => [...prev, newLineItem]);
    }
  };

  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerName(cust.display_name);
    setCustomerPhone(cust.phone);
    setCustomerEmail(cust.email || '');
    setCustomerAddress(cust.address || '');
    setCustomerCity(cust.city || '');
    setCustomerState(cust.state || 'NJ');
    setCustomerZip(cust.zip || '');
    if (logisticsMethod === 'Delivery' && !deliveryAddress) {
      setDeliveryAddress(`${cust.address || ''}, ${cust.city || ''} ${cust.state || ''} ${cust.zip || ''}`);
    }
    setShowCustomerModal(false);
  };

  const loadOrderById = async (orderId: string) => {
    try {
      const order = await api.getOrder(orderId);
      setActiveOrder(order);
      setOrderDate(order.transaction_date);
      setLeadSource(order.lead_source);
      setSalesRepId(order.sales_rep_id);
      setLogisticsMethod(order.logistics_method);
      setScheduledPickupDate(order.scheduled_pickup_date || order.transaction_date);
      setDeliveryDate(order.delivery_date || '');
      setDeliveryAddress(order.delivery_address || '');
      if (order.customer) {
        setSelectedCustomer(order.customer);
        setCustomerName(order.customer.display_name);
        setCustomerPhone(order.customer.phone);
        setCustomerEmail(order.customer.email || '');
        setCustomerAddress(order.customer.address || '');
        setCustomerCity(order.customer.city || '');
        setCustomerState(order.customer.state || 'NJ');
        setCustomerZip(order.customer.zip || '');
      }
      if (order.items && order.items.length > 0) {
        setLineItems(order.items);
      }
      setShippingAmount(order.shipping_amount);
      setInstallationFee(order.installation_fee);
      setPaymentMethod(order.payment_method);
      setTaxExempt(Boolean(order.tax_exempt));
      setDiscount(order.discount);
      setCredit(order.credit);
      setDeposit(order.deposit);
      setInitialPayment(0);
      setOrderNotes(order.notes || '');
      setInternalNotes(order.internal_notes || '');
      setSuccessMessage(`Order ${order.order_number} loaded into POS.`);
      setShowOrderSearchModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load order');
    }
  };

  const handleClearForm = () => {
    setActiveOrder(null);
    setOrderDate(new Date().toISOString().split('T')[0]);
    setLeadSource('Showroom');
    setLogisticsMethod('Pick Up');
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerCity('');
    setCustomerState('NJ');
    setCustomerZip('');
    setLineItems([
      {
        sku: '',
        serial_number: '',
        description: '',
        condition: 'Brand New - Sealed Box',
        item_tag: 'None',
        location: 'MS Appliances | Showroom',
        quantity: 1,
        unit_price: 0,
        line_total: 0,
        line_number: 1,
      },
    ]);
    setShippingAmount(0);
    setInstallationFee(0);
    setPaymentMethod('Cash');
    setTaxExempt(false);
    setTaxExemptionDoc(null);
    setDiscount(0);
    setCredit(0);
    setDeposit(0);
    setInitialPayment(0);
    setPaymentReference('');
    setOrderNotes('');
    setInternalNotes('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSaveOrder = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    let customerId = selectedCustomer?.id;
    if (!customerId) {
      if (!customerName.trim() || !customerPhone.trim()) {
        setErrorMessage('Customer name and phone number are required before saving.');
        return;
      }
      try {
        const parts = customerName.trim().split(' ');
        const fn = parts[0];
        const ln = parts.slice(1).join(' ') || fn;
        const newCust = await api.createCustomer({
          first_name: fn,
          last_name: ln,
          phone: customerPhone.trim(),
          email: customerEmail.trim(),
          address: customerAddress.trim(),
          city: customerCity.trim(),
          state: customerState.trim() || 'NJ',
          zip: customerZip.trim(),
        });
        setSelectedCustomer(newCust);
        customerId = newCust.id;
      } catch (err: any) {
        setErrorMessage(`Could not create customer: ${err.message}`);
        return;
      }
    }

    const validItems = lineItems.filter(i => i.sku.trim() || i.description.trim());
    if (validItems.length === 0) {
      setErrorMessage('Please add at least one line item with SKU or description.');
      return;
    }

    for (const item of validItems) {
      if (item.quantity <= 0) {
        setErrorMessage(`Quantity for "${item.sku || item.description}" must be at least 1.`);
        return;
      }
      if (item.unit_price < 0) {
        setErrorMessage(`Unit price for "${item.sku || item.description}" cannot be negative.`);
        return;
      }
    }

    if (taxExempt && !taxExemptionDoc && !activeOrder?.tax_exemption_document_id) {
      setErrorMessage('Tax exemption is selected. A tax exemption document must be uploaded before finalizing.');
      setShowTaxDocModal(true);
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        customer_id: customerId,
        lead_source: leadSource,
        sales_rep_id: salesRepId,
        logistics_method: logisticsMethod,
        payment_method: paymentMethod,
        shipping_amount: Number(shippingAmount) || 0,
        installation_fee: Number(installationFee) || 0,
        discount: Number(discount) || 0,
        credit: Number(credit) || 0,
        deposit: Number(deposit) || 0,
        initial_payment: Number(initialPayment) || 0,
        payment_reference: paymentReference,
        tax_exempt: taxExempt,
        tax_exemption_document_id: taxExemptionDoc?.id || activeOrder?.tax_exemption_document_id || null,
        state: customerState || 'NJ',
        zip: customerZip || '07087',
        notes: orderNotes,
        internal_notes: internalNotes,
        delivery_address: logisticsMethod === 'Delivery' ? deliveryAddress || `${customerAddress}, ${customerCity} ${customerState}` : null,
        delivery_date: logisticsMethod === 'Delivery' ? deliveryDate : null,
        scheduled_pickup_date: logisticsMethod === 'Pick Up' ? scheduledPickupDate : null,
        items: validItems.map(i => ({
          inventory_item_id: i.inventory_item_id || null,
          sku: i.sku || 'ITEM',
          serial_number: i.serial_number || '',
          description: i.description || 'Appliance/Electronics Asset',
          condition: i.condition || 'Brand New - Sealed Box',
          item_tag: i.item_tag || 'None',
          location: i.location || 'MS Appliances | Showroom',
          quantity: Number(i.quantity) || 1,
          unit_price: Number(i.unit_price) || 0,
        })),
      };

      let saved: Order;
      if (activeOrder) {
        payload.expected_updated_at = activeOrder.updated_at;
        saved = await api.updateOrder(activeOrder.id, payload);
        setSuccessMessage(`Order ${saved.order_number} successfully updated!`);
      } else {
        saved = await api.createOrder(payload);
        setSuccessMessage(`Order ${saved.order_number} saved successfully! Unique order number generated.`);
      }
      setActiveOrder(saved);
      setInitialPayment(0);
      setDeposit(0);
    } catch (err: any) {
      setErrorMessage(err.message || 'Order could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const invoiceTotal = calculatedTotals.invoice_total;
  const currentCommittedPaid = activeOrder ? activeOrder.amount_paid : 0;
  const newPaymentsEntered = (Number(deposit) || 0) + (Number(initialPayment) || 0);
  const totalPaidPreview = currentCommittedPaid + newPaymentsEntered;
  const balanceDuePreview = Math.max(0, invoiceTotal - totalPaidPreview);

  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-800">
      {/* Top POS Action Bar */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 sm:py-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3 shadow-2xs shrink-0">

        <div className="flex items-center space-x-2">
          <button
            onClick={handleClearForm}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1 text-slate-600" />
            New Order
          </button>
          <button
            onClick={() => setShowOrderSearchModal(true)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            <Search className="w-4 h-4 mr-1 text-slate-500" />
            Load Order
          </button>
          <button
            onClick={handleClearForm}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Clear Form
          </button>
        </div>

        {/* Current Order Badge */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-2xs font-mono text-xs">
            <span className="text-slate-400 mr-1.5">Order #:</span>
            <span className="font-bold text-amber-400 text-sm">
              {activeOrder ? activeOrder.order_number : 'NEW [Auto CASA-xxxxxx]'}
            </span>
            {activeOrder && (
              <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded uppercase font-semibold">
                {activeOrder.status}
              </span>
            )}
          </div>

          {/* Document Generation Buttons */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              disabled={!activeOrder}
              onClick={() => setDocumentModalType('Invoice')}
              title={activeOrder ? 'Generate Invoice' : 'Save order first to generate Invoice'}
              className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white border border-slate-200 hover:border-amber-400 text-slate-800 shadow-2xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 mr-1 text-amber-600" />
              Invoice
            </button>
            <button
              disabled={!activeOrder}
              onClick={() => setDocumentModalType('Packing Slip')}
              title={activeOrder ? 'Generate Packing Slip' : 'Save order first to generate Packing Slip'}
              className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white border border-slate-200 hover:border-amber-400 text-slate-800 shadow-2xs cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              Packing Slip
            </button>
            <button
              disabled={!activeOrder}
              onClick={() => setDocumentModalType('Receipt')}
              title={activeOrder ? 'Generate Receipt' : 'Save order first to generate Receipt'}
              className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white border border-slate-200 hover:border-amber-400 text-slate-800 shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMessage && (
        <div className="mx-3 sm:mx-6 mt-3 sm:mt-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-700 hover:text-emerald-900 font-bold ml-4 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mx-3 sm:mx-6 mt-3 sm:mt-4 p-3 bg-rose-50 border border-rose-300 text-rose-900 text-xs rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-700 hover:text-rose-900 font-bold ml-4 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* POS Content Grid */}
      <div className="flex-1 p-3 sm:p-5 lg:p-6 pb-24 lg:pb-6 overflow-y-auto space-y-4 sm:space-y-5">
        {/* Row 1: Order Details & Customer Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">

          {/* Order Details (5 cols) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center">
                <Calendar className="w-4 h-4 mr-1.5 text-amber-500" />
                Order Details
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                {activeOrder ? `ID: ${activeOrder.id}` : 'Draft'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Date</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={e => setOrderDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden font-medium"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Lead Source</label>
                <select
                  value={leadSource}
                  onChange={e => setLeadSource(e.target.value as LeadSource)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white font-medium"
                >
                  <option value="Showroom">Showroom Walk-in</option>
                  <option value="Facebook">Facebook Marketplace</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Google">Google / Local Search</option>
                  <option value="Repeat Customer">Repeat Customer</option>
                  <option value="Family/Friend">Family / Friend Referral</option>
                  <option value="Newspaper">Newspaper</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Sales Representative</label>
                <select
                  value={salesRepId}
                  onChange={e => setSalesRepId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white font-medium"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'Admin' ? 'Administrator' : u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Logistics Method</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Pick Up', 'Delivery'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setLogisticsMethod(method)}
                      className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                        logisticsMethod === method
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-2xs font-bold'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Section (7 cols) */}
          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-amber-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Customer Information
                </h2>
                {selectedCustomer && (
                  <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                    {selectedCustomer.customer_number}
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors flex items-center shadow-2xs cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 mr-1" />
                  Search / Select Customer
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="md:col-span-1">
                <label className="block font-semibold text-slate-600 mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Roberto Alvarez"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="201-555-0142"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
              <div className="md:col-span-6">
                <label className="block font-semibold text-slate-600 mb-1">Street Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  placeholder="1420 Bergenline Ave"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-600 mb-1 flex items-center justify-between">
                  <span>ZIP Code</span>
                  {zipLoading && (
                    <span className="text-[10px] text-amber-600 font-normal animate-pulse">
                      Looking up...
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={customerZip}
                  onBlur={handleZipBlur}
                  onChange={handleZipInputChange}
                  placeholder="07087"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-600 mb-1">City</label>
                <input
                  type="text"
                  value={customerCity}
                  onChange={e => setCustomerCity(e.target.value)}
                  placeholder="Union City"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-600 mb-1">State</label>
                <input
                  type="text"
                  maxLength={2}
                  value={customerState}
                  onChange={e => setCustomerState(e.target.value.toUpperCase())}
                  placeholder="NJ"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Item Section (Dynamic Line Items Table) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-amber-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Order Line Items
              </h2>
              <span className="text-xs text-slate-400">
                ({lineItems.length} {lineItems.length === 1 ? 'item' : 'items'})
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowInventoryModal(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-amber-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center shadow-2xs cursor-pointer"
              >
                <Package className="w-3.5 h-3.5 mr-1 text-amber-400" />
                Pick from Inventory / Assets
              </button>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors flex items-center shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Custom Line Item
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto -mx-1 sm:mx-0">
            <table className="w-full text-left text-xs border-collapse min-w-[820px]">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-2 w-10">#</th>
                  <th className="py-2.5 px-2 w-28">SKU</th>
                  <th className="py-2.5 px-2 w-32">Serial Number</th>
                  <th className="py-2.5 px-3 min-w-44">Description</th>
                  <th className="py-2.5 px-2 w-48">Condition</th>
                  <th className="py-2.5 px-2 w-24">Item Tag</th>
                  <th className="py-2.5 px-2 w-56">Location</th>
                  <th className="py-2.5 px-2 w-16 text-center">Qty</th>
                  <th className="py-2.5 px-2 w-24 text-right">Price ($)</th>
                  <th className="py-2.5 px-2 w-28 text-right">Total ($)</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-2 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2 px-1">
                      <input
                        type="text"
                        value={item.sku}
                        onChange={e => handleUpdateLineItem(idx, 'sku', e.target.value)}
                        placeholder="SKU-..."
                        className="w-full px-2 py-1 font-mono border border-slate-300 rounded text-xs focus:ring-1 focus:ring-amber-500 outline-hidden font-medium"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="text"
                        value={item.serial_number || ''}
                        onChange={e => handleUpdateLineItem(idx, 'serial_number', e.target.value)}
                        placeholder="SN-..."
                        className="w-full px-2 py-1 font-mono border border-slate-300 rounded text-xs focus:ring-1 focus:ring-amber-500 outline-hidden"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => handleUpdateLineItem(idx, 'description', e.target.value)}
                        placeholder="Appliance or electronics description..."
                        className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-amber-500 outline-hidden font-medium"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <select
                        value={item.condition || 'Brand New - Sealed Box'}
                        onChange={e => handleUpdateLineItem(idx, 'condition', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-amber-500 outline-hidden bg-white font-medium"
                      >
                        {CONDITION_OPTIONS.map(c => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-1">
                      <select
                        value={item.item_tag || 'None'}
                        onChange={e => handleUpdateLineItem(idx, 'item_tag', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-amber-500 outline-hidden bg-white font-medium"
                      >
                        {ITEM_TAG_OPTIONS.map(tag => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-1">
                      <select
                        value={item.location || 'MS Appliances | Showroom'}
                        onChange={e => handleUpdateLineItem(idx, 'location', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-amber-500 outline-hidden bg-white font-medium text-[11px]"
                      >
                        {LOCATION_OPTIONS.map(loc => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-1 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleUpdateLineItem(idx, 'quantity', e.target.value)}
                        className="w-14 px-1.5 py-1 text-center font-bold border border-slate-300 rounded text-xs focus:ring-1 focus:ring-amber-500 outline-hidden"
                      />
                    </td>
                    <td className="py-2 px-1 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={e => handleUpdateLineItem(idx, 'unit_price', e.target.value)}
                        className="w-20 px-2 py-1 text-right font-mono font-medium border border-slate-300 rounded text-xs focus:ring-1 focus:ring-amber-500 outline-hidden"
                      />
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 text-xs">
                      {formatCurrency(item.line_total)}
                    </td>
                    <td className="py-2 px-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Remove Line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Row 3: Financial Section, Payments & Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Notes & Exemption Warning (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Tax Exemption Control Card */}
            <div className={`p-4 rounded-xl border transition-all ${
              taxExempt
                ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxExempt}
                    onChange={e => setTaxExempt(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-900">
                    Tax Exempt Customer / Resale Exemption
                  </span>
                </label>
                {taxExempt && (
                  <button
                    type="button"
                    onClick={() => setShowTaxDocModal(true)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center transition-colors cursor-pointer ${
                      taxExemptionDoc || activeOrder?.tax_exemption_document_id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 text-slate-950 hover:bg-amber-400 animate-pulse'
                    }`}
                  >
                    <FileCheck2 className="w-3.5 h-3.5 mr-1" />
                    {taxExemptionDoc || activeOrder?.tax_exemption_document_id
                      ? 'Exemption Certificate Attached'
                      : 'Upload Certificate (Required)'}
                  </button>
                )}
              </div>

              {taxExempt && (
                <div className="mt-2.5 pt-2.5 border-t border-amber-200 text-xs text-amber-900 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Sales Tax Override to $0.00</p>
                    <p className="text-[11px] text-amber-800">
                      Under NJ tax code, tax exemption requires an active ST-3/ST-4 resale or exemption
                      certificate on file. The system enforces uploading a document prior to order finalization.
                    </p>
                    {taxExemptionDoc && (
                      <p className="mt-1 text-[11px] font-mono font-semibold text-emerald-800">
                        Attached: {taxExemptionDoc.file_name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Order Notes */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Order Notes & Instructions
              </h3>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Customer-Facing Notes / Delivery Instructions (Printed on invoice & packing slip)
                </label>
                <textarea
                  rows={3}
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  placeholder="e.g. Call customer 30 minutes before delivery; gate code #4490; check refrigerator door swing."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Internal Operations Notes (Staff only)
                </label>
                <input
                  type="text"
                  value={internalNotes}
                  onChange={e => setInternalNotes(e.target.value)}
                  placeholder="e.g. Authorized 5% scratch-and-dent discount by manager."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Financial Breakdown Section (5 cols) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
              Financial Breakdown & Payment
            </h3>

            {/* Calculations List */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Subtotal (Items):</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrency(calculatedTotals.subtotal)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Shipping / Delivery:</span>
                <div className="flex items-center space-x-1">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={shippingAmount}
                    onChange={e => setShippingAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-20 px-2 py-0.5 text-right font-mono border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Installation Fee:</span>
                <div className="flex items-center space-x-1">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={installationFee}
                    onChange={e => setInstallationFee(Math.max(0, Number(e.target.value) || 0))}
                    className="w-20 px-2 py-0.5 text-right font-mono border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-between items-start text-slate-600">
                <div className="pr-2">
                  <span className="font-medium">Sales Tax</span>{' '}
                  <span className="text-[10px] text-amber-700 font-semibold block">
                    {taxExempt
                      ? '(Tax Exempt: 0.00%)'
                      : `${calculatedTotals.tax_rate_formatted || `${(settings.default_tax_rate * 100).toFixed(2)}%`} – ${calculatedTotals.tax_jurisdiction || 'New Jersey'}`}
                  </span>
                </div>
                <span className="font-mono font-semibold text-slate-900 shrink-0">
                  {formatCurrency(calculatedTotals.sales_tax)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Credit Card Charge (3%):</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrency(calculatedTotals.credit_card_charge)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Discount ($):</span>
                <div className="flex items-center space-x-1">
                  <span className="text-slate-400">-$</span>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={discount}
                    onChange={e => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-20 px-2 py-0.5 text-right font-mono border border-slate-300 rounded text-xs text-rose-600"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Store Credit ($):</span>
                <div className="flex items-center space-x-1">
                  <span className="text-slate-400">-$</span>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={credit}
                    onChange={e => setCredit(Math.max(0, Number(e.target.value) || 0))}
                    className="w-20 px-2 py-0.5 text-right font-mono border border-slate-300 rounded text-xs text-emerald-600"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-2 flex justify-between items-center font-bold text-sm text-slate-900">
                <span>Invoice Total:</span>
                <span className="font-mono text-base text-slate-950 font-black">
                  {formatCurrency(invoiceTotal)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector & Register Inputs */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-medium"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card (+3%)</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Check">Check</option>
                    <option value="ACH">ACH Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Deposit Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={deposit}
                    onChange={e => setDeposit(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Amount Paid at Register ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={initialPayment}
                    onChange={e => setInitialPayment(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono font-bold"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Auth / Check #</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    placeholder="e.g. AUTH-4902"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const remainingToPay = Math.max(0, invoiceTotal - currentCommittedPaid);
                    setInitialPayment(remainingToPay);
                    setDeposit(0);
                  }}
                  className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
                >
                  Pay Full Amount ({formatCurrency(Math.max(0, invoiceTotal - currentCommittedPaid))})
                </button>
              </div>
            </div>

            {/* Total Paid & Remaining Balance Due */}
            <div className="p-3 bg-slate-900 text-white rounded-lg flex justify-between items-center">
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Balance Due</p>
                <p className="text-xl font-black font-mono text-amber-400">
                  {formatCurrency(balanceDuePreview)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400">
                  Total Paid: <span className="text-emerald-400 font-mono font-bold">{formatCurrency(totalPaidPreview)}</span>
                </p>
                <span
                  className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    balanceDuePreview === 0 && invoiceTotal > 0
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                      : totalPaidPreview > 0
                      ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                      : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                  }`}
                >
                  {balanceDuePreview === 0 && invoiceTotal > 0
                    ? 'Paid in Full'
                    : totalPaidPreview > 0
                    ? 'Partially Paid'
                    : 'Pending Payment'}
                </span>
              </div>
            </div>

            {/* Final Action Button */}
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveOrder}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span className="text-sm">
                {saving
                  ? 'Saving Order Transaction...'
                  : activeOrder
                  ? 'Update Order Transaction'
                  : 'Save Order Transaction'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Checkout Bar (Fixed at bottom on < lg screens) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-slate-900/95 backdrop-blur-xs border-t border-slate-800 px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Balance Due</span>
          <span className="text-base font-black font-mono text-amber-400">
            {formatCurrency(balanceDuePreview)}
          </span>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={handleSaveOrder}
          className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md text-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : activeOrder ? 'Update Order' : 'Save Order'}</span>
        </button>
      </div>


      {/* Modals */}
      {showCustomerModal && (
        <CustomerSelectModal
          onSelectCustomer={handleSelectCustomer}
          onClose={() => setShowCustomerModal(false)}
        />
      )}
      {showInventoryModal && (
        <InventorySelectModal
          onSelectItem={handleSelectInventoryItem}
          onClose={() => setShowInventoryModal(false)}
        />
      )}
      {showOrderSearchModal && (
        <OrderSearchModal
          onSelectOrder={loadOrderById}
          onClose={() => setShowOrderSearchModal(false)}
        />
      )}
      {showTaxDocModal && (
        <TaxExemptionModal
          currentDocumentId={taxExemptionDoc?.id || activeOrder?.tax_exemption_document_id}
          onDocumentAttached={doc => setTaxExemptionDoc(doc)}
          onClose={() => setShowTaxDocModal(false)}
        />
      )}
      {documentModalType && activeOrder && (
        <DocumentViewerModal
          order={activeOrder}
          settings={settings}
          initialType={documentModalType}
          onClose={() => setDocumentModalType(null)}
        />
      )}
    </div>
  );
};
