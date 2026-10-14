import React, { useState, useEffect, useMemo } from 'react';
import { Customer, User, MarketingProduct, InventoryItem } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatCurrency } from '../../utils/formatters.ts';
import {
  Megaphone,
  X,
  Sparkles,
  Mail,
  Send,
  Eye,
  CheckCircle,
  AlertCircle,
  Package,
  DollarSign,
  Image as ImageIcon,
  Users,
  Search,
  ExternalLink,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Tag,
  Copy,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { copyEmailToClipboard, buildMailtoUrl, buildGmailComposeUrl } from '../../utils/emailHelper.ts';

interface MarketingCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onCampaignSent?: (msg: string) => void;
}

type ModalTab = 'products' | 'campaign' | 'preview';

// 5 High-Quality Sample Appliances for instant testing
const SAMPLE_PRODUCTS: MarketingProduct[] = [
  {
    brand: 'Samsung',
    model_number: 'RF28T5001SR',
    description: '28 cu. ft. Large Capacity 3-Door French Door Refrigerator with Twin Cooling Plus and fingerprint-resistant stainless finish.',
    price: 1399.99,
    image_url: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&auto=format&fit=crop&q=80',
  },
  {
    brand: 'LG',
    model_number: 'WM4000HWA',
    description: '4.5 cu. ft. Ultra Large Capacity Smart Front Load Washer with TurboWash 360 Technology and ColdWash feature.',
    price: 849.99,
    image_url: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&auto=format&fit=crop&q=80',
  },
  {
    brand: 'Whirlpool',
    model_number: 'WED5050MW',
    description: '7.0 cu. ft. Front Load Electric Dryer with AutoDry Drying System and Wrinkle Shield option.',
    price: 649.99,
    image_url: 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=600&auto=format&fit=crop&q=80',
  },
  {
    brand: 'GE Profile',
    model_number: 'PGS930YPFS',
    description: '30-inch Smart Slide-In Gas Range with No-Preheat Air Fry, Chef Connect, and 21K Triple Ring Burner.',
    price: 1899.99,
    image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80',
  },
  {
    brand: 'Bosch',
    model_number: 'SHPM65Z55N',
    description: '500 Series 24-inch Built-In Dishwasher with AutoAir Drying, 44 dBA ultra-quiet operation, and 3rd Rack.',
    price: 999.99,
    image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80',
  },
];

const INITIAL_EMPTY_PRODUCTS: MarketingProduct[] = [
  { brand: '', model_number: '', description: '', price: 0, image_url: '' },
  { brand: '', model_number: '', description: '', price: 0, image_url: '' },
  { brand: '', model_number: '', description: '', price: 0, image_url: '' },
  { brand: '', model_number: '', description: '', price: 0, image_url: '' },
  { brand: '', model_number: '', description: '', price: 0, image_url: '' },
];

export const MarketingCampaignModal: React.FC<MarketingCampaignModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCampaignSent,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('products');

  // 5 Products State
  const [products, setProducts] = useState<MarketingProduct[]>(INITIAL_EMPTY_PRODUCTS);

  // Campaign Info State
  const [subject, setSubject] = useState(
    'Exclusive Deals of the Week from Casa Central Store'
  );
  const [headline, setHeadline] = useState(
    'Top 5 Hand-Picked Appliance Specials — Limited Time Offers!'
  );
  const [introMessage, setIntroMessage] = useState(
    'We are excited to share our hand-picked selection of top-rated appliances and home essentials available this week at special promotional pricing. Contact our showroom or call directly to reserve yours before stock runs out!'
  );

  // Audience & Customer selection
  const [audienceType, setAudienceType] = useState<'all' | 'custom'>('all');
  const [customersWithEmail, setCustomersWithEmail] = useState<Customer[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [customEmailInput, setCustomEmailInput] = useState('');

  // Inventory Quick-Picker Modal for a product slot
  const [inventoryPickerSlot, setInventoryPickerSlot] = useState<number | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Dispatch & UI feedback
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [dispatchResult, setDispatchResult] = useState<{
    success: boolean;
    sentCount: number;
    totalRecipients: number;
    previewUrl?: string;
    recipients: { name: string; email: string }[];
  } | null>(null);

  // Fetch customers with email
  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      try {
        const custs = await api.getCustomersWithEmail();
        setCustomersWithEmail(custs);
        setSelectedCustomerIds(custs.map(c => c.id));
      } catch (err) {
        console.error('Failed to load customers for marketing:', err);
      }
    };
    loadData();
  }, [isOpen]);

  // Load Inventory for Picker
  const handleOpenInventoryPicker = async (slotIndex: number) => {
    setInventoryPickerSlot(slotIndex);
    setLoadingInventory(true);
    try {
      const res = await api.getInventory({ status: 'Available', limit: 50 });
      setInventoryItems(res.items);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleSelectInventoryItem = (item: InventoryItem) => {
    if (inventoryPickerSlot === null) return;
    const updated = [...products];
    updated[inventoryPickerSlot] = {
      brand: item.brand || 'Casa Central',
      model_number: item.model_number || item.sku || 'N/A',
      description: item.description || `${item.brand} ${item.model_number}`,
      price: Number(item.selling_price) || 0,
      image_url:
        updated[inventoryPickerSlot].image_url ||
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80',
    };
    setProducts(updated);
    setInventoryPickerSlot(null);
  };

  const handleUpdateProduct = (index: number, field: keyof MarketingProduct, value: any) => {
    const updated = [...products];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setProducts(updated);
  };

  const handleLoadSampleProducts = () => {
    setProducts([...SAMPLE_PRODUCTS]);
  };

  const handleResetProducts = () => {
    setProducts([...INITIAL_EMPTY_PRODUCTS]);
  };

  // Check product validation
  const validProductsCount = useMemo(() => {
    return products.filter(
      p =>
        p.brand.trim() &&
        p.model_number.trim() &&
        p.description.trim() &&
        p.price > 0 &&
        p.image_url.trim()
    ).length;
  }, [products]);

  const allProductsValid = validProductsCount === 5;

  // Filtered customers for manual checklist
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customersWithEmail;
    const q = customerSearch.toLowerCase().trim();
    return customersWithEmail.filter(
      c =>
        c.display_name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        c.phone.includes(q)
    );
  }, [customersWithEmail, customerSearch]);

  const handleToggleCustomer = (id: string) => {
    setSelectedCustomerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredCustomers.map(c => c.id);
    setSelectedCustomerIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const handleDeselectAllFiltered = () => {
    const ids = new Set(filteredCustomers.map(c => c.id));
    setSelectedCustomerIds(prev => prev.filter(x => !ids.has(x)));
  };

  // Add custom extra email
  const handleAddCustomEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customEmailInput.trim().toLowerCase();
    if (!clean) return;
    if (!clean.includes('@') || !clean.includes('.')) {
      setSendError('Please enter a valid email address.');
      return;
    }
    if (!additionalEmails.includes(clean)) {
      setAdditionalEmails(prev => [...prev, clean]);
    }
    setCustomEmailInput('');
  };

  const handleRemoveCustomEmail = (email: string) => {
    setAdditionalEmails(prev => prev.filter(e => e !== email));
  };

  // Total recipient count
  const effectiveRecipientCount = useMemo(() => {
    if (audienceType === 'all') {
      return customersWithEmail.length + additionalEmails.length;
    }
    return selectedCustomerIds.length + additionalEmails.length;
  }, [audienceType, customersWithEmail, selectedCustomerIds, additionalEmails]);

  // Execute Dispatch
  const handleSendCampaign = async (testOnly = false) => {
    if (!allProductsValid) {
      setSendError('Please fill out all 5 products completely (Brand, Model #, Description, Price, Image).');
      setActiveTab('products');
      return;
    }

    if (!subject.trim()) {
      setSendError('Please enter an email Subject for this campaign.');
      setActiveTab('campaign');
      return;
    }

    if (!testOnly && effectiveRecipientCount === 0) {
      setSendError('Please select at least one recipient or customer to receive the campaign.');
      setActiveTab('campaign');
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      const payload = {
        subject: subject.trim(),
        headline: headline.trim(),
        introMessage: introMessage.trim(),
        products: products.map(p => ({
          ...p,
          price: Number(p.price) || 0,
        })),
        customerIds: audienceType === 'all' ? undefined : selectedCustomerIds,
        additionalEmails,
        testOnly,
        testEmail: currentUser.email || 'p13.msappliances@gmail.com',
      };

      const result = await api.sendMarketingCampaign(payload);
      setDispatchResult(result);

      if (onCampaignSent) {
        onCampaignSent(
          testOnly
            ? `Test email sent successfully to ${currentUser.email || 'your email'}!`
            : `Marketing campaign dispatched to ${result.sentCount} customers!`
        );
      }
    } catch (err: any) {
      console.error('Failed to send marketing campaign:', err);
      setSendError(err.message || 'Failed to dispatch marketing campaign.');
    } finally {
      setSending(false);
    }
  };

  const [copySuccessToast, setCopySuccessToast] = useState<string | null>(null);

  const buildCampaignPlainText = () => {
    const productsText = products.map((p, idx) => 
      `#${idx + 1}. ${p.brand ? p.brand.toUpperCase() : 'APPLIANCE'} - Model: ${p.model_number}\nPrice: ${formatCurrency(Number(p.price) || 0)}\n${p.description}\n`
    ).join('\n');

    return `${headline}\n\nDear Valued Customer,\n\n${introMessage}\n\nFEATURED PRODUCTS THIS WEEK:\n==================================================\n${productsText}\n==================================================\n\nYour Personal Sales Advisor: ${currentUser.name}\nDirect: ${currentUser.email} | Store: (201) 867-4200\nCasa Central Store | 405 32nd St, Union City, NJ 07087`;
  };

  const handleCopyCampaignEmail = async () => {
    const text = buildCampaignPlainText();
    const success = await copyEmailToClipboard({
      subject,
      bodyText: text,
    });
    if (success) {
      setCopySuccessToast('Campaign email copied to clipboard! Paste directly into Outlook, Gmail, or your email app (Ctrl+V / Cmd+V).');
      setTimeout(() => setCopySuccessToast(null), 4500);
    }
  };

  const handleOpenCampaignMailApp = () => {
    const text = buildCampaignPlainText();
    const url = buildMailtoUrl({
      subject,
      body: text,
    });
    window.open(url, '_blank');
  };

  const handleOpenCampaignGmailWeb = () => {
    const text = buildCampaignPlainText();
    const url = buildGmailComposeUrl({
      subject,
      body: text,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-sm">
              <Megaphone className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Customer Email Marketing Campaign
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                  5-Product Showcase
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Send professional product catalogs to customers &bull; Email Sender:{' '}
                <strong className="text-amber-400">{currentUser.name}</strong> ({currentUser.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>5 Featured Products</span>
              <span
                className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  allProductsValid
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-300 text-slate-700'
                }`}
              >
                {validProductsCount}/5
              </span>
            </button>

            <button
              onClick={() => setActiveTab('campaign')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                activeTab === 'campaign'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Recipients &amp; Content</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {effectiveRecipientCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Live Email Preview</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-2">
            <button
              onClick={handleLoadSampleProducts}
              className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md flex items-center transition-colors cursor-pointer"
              title="Populate 5 sample appliances with photos and specs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Load Sample 5 Products
            </button>
            <button
              onClick={handleResetProducts}
              className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              title="Reset product fields"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60">
          
          {/* Global Alert Notification */}
          {sendError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{sendError}</span>
            </div>
          )}

          {/* Dispatch Confirmation View */}
          {dispatchResult && (
            <div className="mb-5 p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-xs">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">
                    Marketing Email Campaign Dispatched Successfully!
                  </h3>
                  <p className="text-xs text-emerald-700">
                    Delivered to {dispatchResult.sentCount} out of {dispatchResult.totalRecipients} recipients &bull; Sender: {currentUser.name} ({currentUser.email})
                  </p>
                </div>
              </div>

              {dispatchResult.previewUrl && (
                <div className="mt-3 pt-3 border-t border-emerald-200 flex items-center justify-between">
                  <div className="text-xs text-emerald-800">
                    <strong className="font-bold">Ethereal Live Preview Link:</strong> View the delivered HTML email with styling and images.
                  </div>
                  <a
                    href={dispatchResult.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Open Live Delivery Preview
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: 5 FEATURED PRODUCTS */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Requirement:</strong> Please provide exactly <strong>5 products</strong> including images, model number, description, brand, and price.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleProducts}
                  className="px-2.5 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  Quick Fill Sample Appliances
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((prod, idx) => {
                  const isSlotComplete =
                    prod.brand.trim() &&
                    prod.model_number.trim() &&
                    prod.description.trim() &&
                    prod.price > 0 &&
                    prod.image_url.trim();

                  return (
                    <div
                      key={idx}
                      className={`bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between transition-all ${
                        isSlotComplete
                          ? 'border-emerald-300 ring-1 ring-emerald-300/40'
                          : 'border-slate-200'
                      }`}
                    >
                      <div>
                        {/* Slot Header */}
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                          <div className="flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 text-xs font-black flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              Product Slot {idx + 1}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {isSlotComplete ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Ready
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Required
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenInventoryPicker(idx)}
                              className="px-2 py-1 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 flex items-center transition-colors cursor-pointer"
                              title="Pick from store inventory"
                            >
                              <Tag className="w-3 h-3 mr-1 text-slate-500" />
                              Pick Inventory
                            </button>
                          </div>
                        </div>

                        {/* Image Preview & URL */}
                        <div className="mb-3">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Product Image URL *
                          </label>
                          <div className="flex gap-2">
                            <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                              {prod.image_url ? (
                                <img
                                  src={prod.image_url}
                                  alt="Preview"
                                  className="w-full h-full object-contain"
                                  onError={e => {
                                    (e.target as HTMLImageElement).src =
                                      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80';
                                  }}
                                />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <input
                              type="text"
                              value={prod.image_url}
                              onChange={e => handleUpdateProduct(idx, 'image_url', e.target.value)}
                              placeholder="https://... image link"
                              className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden font-mono"
                            />
                          </div>
                        </div>

                        {/* Brand & Model */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Brand *
                            </label>
                            <input
                              type="text"
                              value={prod.brand}
                              onChange={e => handleUpdateProduct(idx, 'brand', e.target.value)}
                              placeholder="e.g. Samsung, LG"
                              className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Model Number *
                            </label>
                            <input
                              type="text"
                              value={prod.model_number}
                              onChange={e => handleUpdateProduct(idx, 'model_number', e.target.value)}
                              placeholder="e.g. RF28T5001SR"
                              className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden font-mono font-semibold"
                            />
                          </div>
                        </div>

                        {/* Price */}
                        <div className="mb-3">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Selling Price ($) *
                          </label>
                          <div className="relative">
                            <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={prod.price === 0 ? '' : prod.price}
                              onChange={e =>
                                handleUpdateProduct(idx, 'price', parseFloat(e.target.value) || 0)
                              }
                              placeholder="0.00"
                              className="w-full pl-7 pr-3 py-1 text-xs font-mono font-bold text-emerald-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Description *
                          </label>
                          <textarea
                            rows={2}
                            value={prod.description}
                            onChange={e => handleUpdateProduct(idx, 'description', e.target.value)}
                            placeholder="Key features, capacity, specs, or finish..."
                            className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Move to next tab CTA */}
              <div className="flex justify-between items-center pt-2">
                <div className="text-xs text-slate-600">
                  {allProductsValid ? (
                    <span className="text-emerald-700 font-bold flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      All 5 products are ready for the campaign!
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium">
                      {5 - validProductsCount} more product(s) required to proceed.
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('campaign')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center transition-colors cursor-pointer"
                >
                  Next: Configure Campaign &rarr;
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: RECIPIENTS & CONTENT */}
          {activeTab === 'campaign' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Column: Email Content (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Sender Info Banner */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Verified Outgoing Sender
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-800">
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0">
                      CC
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {currentUser.name}{' '}
                        <span className="text-slate-500 font-normal">({currentUser.email})</span>
                      </div>
                      <div className="text-[11px] text-amber-700 font-semibold">
                        Role: {currentUser.role} &bull; Casa Central Store Authorized Dispatcher
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Subject */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Email Subject Line *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Subject for customer inboxes..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden font-medium"
                  />
                </div>

                {/* Promotional Headline */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Promotional Headline (Hero Banner)
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={e => setHeadline(e.target.value)}
                    placeholder="Banner title inside the email..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden font-bold"
                  />
                </div>

                {/* Intro Greeting / Message */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Introductory Message to Customer
                  </label>
                  <textarea
                    rows={4}
                    value={introMessage}
                    onChange={e => setIntroMessage(e.target.value)}
                    placeholder="Write a personalized note to customers..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden resize-none leading-relaxed"
                  />
                </div>

                {/* Custom Additional Emails */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Additional CC / Test Email Addresses
                  </label>
                  <form onSubmit={handleAddCustomEmail} className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={customEmailInput}
                      onChange={e => setCustomEmailInput(e.target.value)}
                      placeholder="Add an email (e.g. manager@store.com)..."
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1 inline" />
                      Add
                    </button>
                  </form>

                  {additionalEmails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {additionalEmails.map(email => (
                        <span
                          key={email}
                          className="inline-flex items-center px-2 py-1 rounded-md text-[11px] bg-slate-100 text-slate-800 border border-slate-200 font-mono"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomEmail(email)}
                            className="ml-1.5 text-slate-400 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Audience Selector (5 cols) */}
              <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col h-full max-h-[580px]">
                <div className="mb-3 pb-2 border-b border-slate-200 flex items-center justify-between">
                  <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center">
                    <Users className="w-4 h-4 mr-1.5 text-amber-500" />
                    Target Audience
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    {effectiveRecipientCount} Recipient(s)
                  </span>
                </div>

                {/* Audience Switcher */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setAudienceType('all')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer text-center ${
                      audienceType === 'all'
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    All Customers ({customersWithEmail.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudienceType('custom')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer text-center ${
                      audienceType === 'custom'
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Select Individual ({selectedCustomerIds.length})
                  </button>
                </div>

                {/* Customer Checklist */}
                {audienceType === 'custom' && (
                  <div className="flex-1 flex flex-col min-h-0 border border-slate-200 rounded-lg overflow-hidden">
                    <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={e => setCustomerSearch(e.target.value)}
                          placeholder="Search customer or email..."
                          className="w-full pl-7 pr-2 py-1 text-[11px] border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 outline-hidden"
                        />
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={handleSelectAllFiltered}
                          className="text-[10px] font-bold text-amber-700 hover:underline px-1"
                        >
                          All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={handleDeselectAllFiltered}
                          className="text-[10px] font-bold text-slate-500 hover:underline px-1"
                        >
                          None
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No matching customers with email found.
                        </div>
                      ) : (
                        filteredCustomers.map(c => {
                          const isChecked = selectedCustomerIds.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className="flex items-center p-2 hover:bg-slate-50 rounded cursor-pointer text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCustomer(c.id)}
                                className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 mr-2.5"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-slate-900 truncate">
                                  {c.display_name}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate font-mono">
                                  {c.email}
                                </div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {audienceType === 'all' && (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50 border border-slate-200 rounded-lg">
                    <Mail className="w-8 h-8 text-amber-500 mb-2" />
                    <h4 className="text-xs font-bold text-slate-800">
                      Broad Customer Broadcast
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                      This campaign will be automatically sent to all{' '}
                      <strong>{customersWithEmail.length} registered customers</strong> with verified email addresses.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE EMAIL PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* Manual Dispatch & Clipboard Action Toolbar */}
              <div className="bg-amber-500/10 border border-amber-300 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                    <Copy className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Manual Campaign Dispatch &amp; Copy Tools
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Copy campaign catalog to clipboard or open directly in Outlook / Gmail
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCampaignEmail}
                    disabled={!allProductsValid}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors disabled:opacity-50"
                    title="Copy full campaign text to clipboard"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Formatted Campaign</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenCampaignMailApp}
                    disabled={!allProductsValid}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors disabled:opacity-50"
                    title="Launch default email app (Outlook, Apple Mail, etc.)"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>Open Mail App</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenCampaignGmailWeb}
                    disabled={!allProductsValid}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors disabled:opacity-50"
                    title="Open pre-filled draft in Gmail web composer"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Open in Gmail</span>
                  </button>
                </div>
              </div>

              {copySuccessToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{copySuccessToast}</span>
                </div>
              )}

              <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl flex justify-center">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-800 font-sans border border-slate-200">
                
                {/* Email Header */}
                <div className="bg-slate-900 px-6 py-5 border-b-4 border-amber-500 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg">
                      CC
                    </div>
                    <div>
                      <div className="text-sm font-black text-white uppercase tracking-wider">
                        Casa Central Store
                      </div>
                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                        Showroom &amp; Living Essentials
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 uppercase">
                    VIP Special Offers
                  </span>
                </div>

                {/* Hero Headline & Message */}
                <div className="p-6 bg-slate-50 border-b border-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">
                    Special Weekly Selection
                  </div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight mb-2">
                    {headline}
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Dear <strong>Valued Customer</strong>,
                  </p>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {introMessage}
                  </p>
                </div>

                {/* 5 Product Cards */}
                <div className="p-6 space-y-4 bg-slate-100/60">
                  <div className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2">
                    Featured 5 Products This Week:
                  </div>

                  {products.map((p, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row gap-4 items-center"
                    >
                      <div className="w-28 h-28 bg-slate-50 rounded-lg p-2 border border-slate-100 flex items-center justify-center shrink-0">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.model_number}
                            className="max-h-full max-w-full object-contain"
                            onError={e => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80';
                            }}
                          />
                        ) : (
                          <Package className="w-8 h-8 text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-[10px] font-black uppercase text-amber-600">
                            {p.brand || 'Brand'}
                          </span>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                            Model: {p.model_number || 'N/A'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 mb-1">
                          {p.brand} {p.model_number}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {p.description || 'Quality appliance selection.'}
                        </p>
                        <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">
                              Special Price
                            </span>
                            <div className="text-sm font-black text-emerald-700 font-mono">
                              {formatCurrency(p.price || 0)}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-900 text-white rounded">
                            Call to Reserve
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Signature */}
                <div className="p-6 bg-slate-900 text-white text-center text-xs">
                  <div className="font-bold text-amber-400 mb-0.5">
                    Your Personal Sales Advisor: {currentUser.name}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Direct: {currentUser.email} &bull; Store: (201) 867-4200
                  </div>
                  <div className="text-slate-500 text-[10px] mt-3">
                    Casa Central Store &bull; 405 32nd St, Union City, NJ 07087
                  </div>
                </div>

              </div>
            </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Action Bar */}
        <div className="bg-white px-5 sm:px-6 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-600">
            <span>Sender:</span>
            <strong className="text-slate-900">{currentUser.name}</strong>
            <span className="text-slate-400 font-mono">({currentUser.email})</span>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {/* Copy Email Button */}
            <button
              type="button"
              disabled={!allProductsValid}
              onClick={handleCopyCampaignEmail}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center"
              title="Copy campaign email text to clipboard to paste into your mail app"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              Copy Campaign
            </button>

            {/* Test Email Button */}
            <button
              type="button"
              disabled={sending || !allProductsValid}
              onClick={() => handleSendCampaign(true)}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center"
              title={`Send instant test email to ${currentUser.email || 'your address'}`}
            >
              <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Send Test to Me
            </button>

            {/* Send Full Campaign Button */}
            <button
              type="button"
              disabled={sending || !allProductsValid}
              onClick={() => handleSendCampaign(false)}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center"
            >
              {sending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin mr-2" />
                  Dispatching Campaign...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Dispatch Campaign to {effectiveRecipientCount} Recipient(s)
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* QUICK INVENTORY PICKER MODAL */}
      {inventoryPickerSlot !== null && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                <Tag className="w-4 h-4 mr-1.5 text-amber-500" />
                Pick Item for Slot #{inventoryPickerSlot + 1}
              </h3>
              <button
                onClick={() => setInventoryPickerSlot(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={inventorySearch}
                onChange={e => setInventorySearch(e.target.value)}
                placeholder="Search SKU, brand, model, or description..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
              {loadingInventory ? (
                <div className="p-6 text-center text-xs text-slate-400">Loading inventory...</div>
              ) : inventoryItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No inventory found.</div>
              ) : (
                inventoryItems
                  .filter(
                    item =>
                      !inventorySearch.trim() ||
                      item.sku.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                      (item.brand && item.brand.toLowerCase().includes(inventorySearch.toLowerCase())) ||
                      (item.model_number &&
                        item.model_number.toLowerCase().includes(inventorySearch.toLowerCase())) ||
                      item.description.toLowerCase().includes(inventorySearch.toLowerCase())
                  )
                  .map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectInventoryItem(item)}
                      className="w-full text-left p-2.5 hover:bg-amber-50/60 transition-colors flex items-center justify-between rounded group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold uppercase text-amber-700">
                            {item.brand || 'No Brand'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-600 font-bold">
                            {item.model_number || item.sku}
                          </span>
                        </div>
                        <div className="text-xs text-slate-900 font-medium truncate mt-0.5">
                          {item.description}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-mono text-emerald-800">
                          {formatCurrency(Number(item.selling_price) || 0)}
                        </div>
                        <span className="text-[10px] text-amber-600 font-bold group-hover:underline">
                          Select &rarr;
                        </span>
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
