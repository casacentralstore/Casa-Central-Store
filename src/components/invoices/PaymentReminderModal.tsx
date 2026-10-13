import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, SentEmail, Order } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatCurrency, formatDate } from '../../utils/formatters.ts';
import {
  Mail,
  Send,
  X,
  Users,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Clock,
  Sparkles,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  AlertTriangle,
  History,
} from 'lucide-react';

interface PaymentReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSentSuccess?: (msg: string) => void;
}

type ModalTab = 'template' | 'recipients_orders' | 'preview' | 'history';

interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  subject: string;
  message: string;
  priority: 'normal' | 'high' | 'urgent';
}

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'standard',
    name: 'Standard Payment Follow-up',
    description: 'Polite and professional payment collection reminder with order breakdown',
    priority: 'high',
    subject: '[Action Required] Payment Follow-up Reminder: {{orders_count}} Orders with Outstanding Balance (Total: {{total_balance}})',
    message: `Hello {{recipient_name}},

This is a payment collection reminder from Casa Central Store Accounting regarding outstanding balances on active customer orders.

Currently, there are {{orders_count}} orders with pending or partial payment balances, representing an outstanding balance total of {{total_balance}} ({{pending_count}} Pending orders, {{partially_paid_count}} Partially Paid).

Please review the order accounts listed below, reach out to the respective customers to arrange balance settlement, and update the order records in the POS upon payment receipt.

Target follow-up completion date: {{due_date}}.

Thank you for your prompt attention to these customer accounts!`,
  },
  {
    id: 'urgent',
    name: 'Urgent Balance Settlement',
    description: 'Direct, high-priority notification for overdue or time-sensitive balances',
    priority: 'urgent',
    subject: '[URGENT] Immediate Payment Collection Required: {{total_balance}} Across {{orders_count}} Open Orders',
    message: `Hello {{recipient_name}},

Please be advised that the accounts listed below currently have open or pending balances totaling {{total_balance}}.

Immediate follow-up is requested before further order fulfillment or delivery dispatch can proceed. Please contact each customer today to collect payment via credit card, check, cash, or wire transfer.

Please report your collection status or update payments in the system by: {{due_date}}.

Thank you for your immediate cooperation,
{{sender_name}} (Casa Central Accounting / Operations)`,
  },
  {
    id: 'weekly',
    name: 'Weekly Sales & Support Sync',
    description: 'Structured weekly checkpoint for team members on open customer balances',
    priority: 'normal',
    subject: 'Weekly Payment Follow-up Brief: {{orders_count}} Orders Awaiting Balance Settlement',
    message: `Hi {{recipient_name}},

Here is this week's payment follow-up briefing for the Sales and Support teams.

We currently have {{pending_count}} pending orders and {{partially_paid_count}} partially paid orders, with a combined balance due of {{total_balance}}.

Please check in with your assigned customers, record any customer notes, and collect outstanding balances by {{due_date}}.

Best regards,
{{company_name}} Accounting Team`,
  },
];

const VARIABLE_TAGS = [
  { tag: '{{recipient_name}}', label: 'Recipient Name', example: 'Elena Gomez' },
  { tag: '{{total_balance}}', label: 'Total Balance Due', example: '$2,264.14' },
  { tag: '{{orders_count}}', label: 'Orders Count', example: '3' },
  { tag: '{{pending_count}}', label: 'Pending Count', example: '2' },
  { tag: '{{partially_paid_count}}', label: 'Partially Paid Count', example: '1' },
  { tag: '{{due_date}}', label: 'Due Date', example: 'Fri, Oct 17' },
  { tag: '{{sender_name}}', label: 'Sender Name', example: 'Carlos Rivera' },
  { tag: '{{company_name}}', label: 'Company Name', example: 'Casa Central Store' },
  { tag: '{{date}}', label: 'Current Date', example: 'October 13, 2026' },
];

export const PaymentReminderModal: React.FC<PaymentReminderModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSentSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('template');

  // Data Loading
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [allOutstandingOrders, setAllOutstandingOrders] = useState<Order[]>([]);
  const [staffRecipients, setStaffRecipients] = useState<
    { id: string; name: string; email: string; role: string; active: boolean }[]
  >([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Template State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('standard');
  const [subjectInput, setSubjectInput] = useState<string>(TEMPLATE_PRESETS[0].subject);
  const [messageInput, setMessageInput] = useState<string>(TEMPLATE_PRESETS[0].message);
  const [priorityInput, setPriorityInput] = useState<'normal' | 'high' | 'urgent'>('high');
  const [includeTableInput, setIncludeTableInput] = useState<boolean>(true);

  // Due Date (default: 3 days ahead in YYYY-MM-DD)
  const defaultDueDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  }, []);
  const [dueDateInput, setDueDateInput] = useState<string>(defaultDueDate);

  // Selection state
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [customEmailInput, setCustomEmailInput] = useState<string>('');

  // Orders filter inside modal
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'Pending' | 'Partially Paid'>('ALL');
  const [orderSearchText, setOrderSearchText] = useState<string>('');

  // Dispatch state
  const [sending, setSending] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentSuccessDetails, setSentSuccessDetails] = useState<{
    sentCount: number;
    recipients: string[];
  } | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<SentEmail[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [inspectingEmail, setInspectingEmail] = useState<SentEmail | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Load orders and recipients on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingData(true);
    setLoadError(null);
    setSendError(null);
    setSentSuccessDetails(null);

    Promise.all([
      api.getOutstandingOrders(),
      api.getReminderRecipients(),
    ])
      .then(([ordersRes, recipientsRes]) => {
        if (!isMounted) return;
        const ords = ordersRes.orders || [];
        setAllOutstandingOrders(ords);
        // By default select all orders with balance due
        setSelectedOrderIds(ords.map(o => o.id));

        const recs = recipientsRes || [];
        setStaffRecipients(recs);
        // By default select all active Sales and Support staff
        setSelectedRecipientIds(recs.map(r => r.id));
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Failed to load payment reminder data:', err);
        setLoadError(err.message || 'Failed to load outstanding orders or staff list.');
      })
      .finally(() => {
        if (isMounted) setLoadingData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Load history when history tab is clicked
  useEffect(() => {
    if (activeTab === 'history') {
      setLoadingHistory(true);
      api.getReminderHistory(30)
        .then(res => setHistoryItems(res || []))
        .catch(err => console.error('Failed to load history:', err))
        .finally(() => setLoadingHistory(false));
    }
  }, [activeTab]);

  // Handle Preset Change
  const handleApplyPreset = (presetId: string) => {
    const preset = TEMPLATE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(preset.id);
    setSubjectInput(preset.subject);
    setMessageInput(preset.message);
    setPriorityInput(preset.priority);
  };

  // Insert tag at cursor
  const handleInsertTag = (tag: string) => {
    if (!textareaRef.current) {
      setMessageInput(prev => prev + ' ' + tag);
      return;
    }
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = messageInput;
    const before = text.substring(0, start);
    const after = text.substring(end);

    setMessageInput(before + tag + after);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  // Filtered orders list for review
  const filteredOrders = useMemo(() => {
    return allOutstandingOrders.filter(o => {
      if (orderStatusFilter !== 'ALL' && o.status !== orderStatusFilter) {
        return false;
      }
      if (!orderSearchText.trim()) return true;
      const s = orderSearchText.toLowerCase().trim();
      const num = (o.order_number || '').toLowerCase();
      const so = (o.so_number || '').toLowerCase();
      const cust = (o.customer_name || '').toLowerCase();
      const phone = (o.customer_phone || '').toLowerCase();
      return num.includes(s) || so.includes(s) || cust.includes(s) || phone.includes(s);
    });
  }, [allOutstandingOrders, orderStatusFilter, orderSearchText]);

  // Selected orders subset
  const selectedOrders = useMemo(() => {
    const set = new Set(selectedOrderIds);
    return allOutstandingOrders.filter(o => set.has(o.id));
  }, [allOutstandingOrders, selectedOrderIds]);

  // Selected orders summary statistics
  const selectedSummary = useMemo(() => {
    let totalBal = 0;
    let totalInv = 0;
    let totalPaid = 0;
    let pendingCnt = 0;
    let partiallyPaidCnt = 0;

    for (const o of selectedOrders) {
      totalBal += o.balance_due || 0;
      totalInv += o.invoice_total || 0;
      totalPaid += o.amount_paid || 0;
      if (o.status === 'Pending') pendingCnt++;
      if (o.status === 'Partially Paid') partiallyPaidCnt++;
    }

    return {
      count: selectedOrders.length,
      pendingCount: pendingCnt,
      partiallyPaidCount: partiallyPaidCnt,
      totalBalance: Math.round(totalBal * 100) / 100,
      totalInvoice: Math.round(totalInv * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
    };
  }, [selectedOrders]);

  // Add custom CC email
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

  // Format Due Date for display
  const formattedDueDate = useMemo(() => {
    if (!dueDateInput) return 'As soon as possible';
    try {
      const parts = dueDateInput.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dueDateInput;
    }
  }, [dueDateInput]);

  // Rendered preview strings
  const previewRecipient = useMemo(() => {
    const firstSelected = staffRecipients.find(r => selectedRecipientIds.includes(r.id));
    return firstSelected || {
      id: 'demo',
      name: 'Elena Gomez',
      email: 'elena@casacentralstore.com',
      role: 'Sales',
    };
  }, [staffRecipients, selectedRecipientIds]);

  const renderedSubject = useMemo(() => {
    let s = subjectInput;
    const map: Record<string, string | number> = {
      recipient_name: previewRecipient.name,
      total_balance: formatCurrency(selectedSummary.totalBalance),
      orders_count: selectedSummary.count,
      pending_count: selectedSummary.pendingCount,
      partially_paid_count: selectedSummary.partiallyPaidCount,
      due_date: formattedDueDate,
      sender_name: currentUser.name || 'Store Administrator',
      company_name: 'Casa Central Store',
      date: formatDate(new Date().toISOString()),
    };
    for (const [k, v] of Object.entries(map)) {
      s = s.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    }
    return s;
  }, [subjectInput, previewRecipient, selectedSummary, formattedDueDate, currentUser]);

  const renderedMessage = useMemo(() => {
    let m = messageInput;
    const map: Record<string, string | number> = {
      recipient_name: previewRecipient.name,
      total_balance: formatCurrency(selectedSummary.totalBalance),
      orders_count: selectedSummary.count,
      pending_count: selectedSummary.pendingCount,
      partially_paid_count: selectedSummary.partiallyPaidCount,
      due_date: formattedDueDate,
      sender_name: currentUser.name || 'Store Administrator',
      company_name: 'Casa Central Store',
      date: formatDate(new Date().toISOString()),
    };
    for (const [k, v] of Object.entries(map)) {
      m = m.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    }
    return m;
  }, [messageInput, previewRecipient, selectedSummary, formattedDueDate, currentUser]);

  // Total recipients count
  const totalRecipientsCount = selectedRecipientIds.length + additionalEmails.length;

  // Dispatch Action
  const handleSendReminder = async () => {
    if (totalRecipientsCount === 0) {
      setSendError('Please select at least one recipient to receive the reminder.');
      return;
    }
    if (selectedOrders.length === 0) {
      setSendError('Please select at least one order with outstanding balance to follow up.');
      return;
    }
    if (!subjectInput.trim()) {
      setSendError('Please specify an email subject.');
      return;
    }
    if (!messageInput.trim()) {
      setSendError('Please specify the message content.');
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      const res = await api.sendPaymentReminder({
        recipientIds: selectedRecipientIds,
        additionalEmails,
        orderIds: selectedOrderIds,
        subject: subjectInput.trim(),
        messageBody: messageInput.trim(),
        priority: priorityInput,
        includeOrdersTable: includeTableInput,
        dueDate: formattedDueDate,
      });

      const recipientList = res.recipients.map(r => `${r.name} (${r.email})`);
      setSentSuccessDetails({
        sentCount: res.sentCount,
        recipients: recipientList,
      });

      if (onSentSuccess) {
        onSentSuccess(
          `Successfully dispatched payment reminders to ${res.sentCount} Sales & Support recipients!`
        );
      }
    } catch (err: any) {
      console.error('Failed to send payment reminder:', err);
      setSendError(err.message || 'Failed to send payment reminder emails.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-sm">
              <Mail className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Payment Follow-up Reminder
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Sales & Support
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Send email reminders to follow up customer payments on Pending & Partially Paid orders
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Quick KPI Badge */}
            <div className="hidden sm:flex items-center space-x-2 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs">
              <span className="text-slate-400">Selected Due:</span>
              <span className="font-mono font-bold text-amber-400">
                {formatCurrency(selectedSummary.totalBalance)}
              </span>
              <span className="text-slate-500">·</span>
              <span className="font-bold text-slate-300 font-mono">
                {selectedSummary.count} Orders
              </span>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Confirmation Overlay */}
        {sentSuccessDetails ? (
          <div className="p-8 flex-1 flex flex-col items-center justify-center text-center overflow-y-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center mb-4 shadow-md">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Payment Reminders Successfully Sent!
            </h3>
            <p className="text-sm text-slate-600 mt-2 max-w-md">
              Dispatched <strong>{sentSuccessDetails.sentCount} email notifications</strong> to the Sales and Support teams to follow up on <strong>{selectedSummary.count} outstanding orders</strong> totaling <strong>{formatCurrency(selectedSummary.totalBalance)}</strong>.
            </p>

            <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-md w-full text-left text-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Recipients Dispatched:
              </span>
              <ul className="space-y-1 text-slate-700 font-mono text-[11px]">
                {sentSuccessDetails.recipients.map((rec, i) => (
                  <li key={i} className="flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex items-center space-x-3">
              <button
                onClick={() => {
                  setSentSuccessDetails(null);
                  setActiveTab('history');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <History className="w-4 h-4" />
                <span>View Dispatch History</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Nav Tabs Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 pt-3 flex items-center justify-between shrink-0 overflow-x-auto">
              <div className="flex space-x-1 sm:space-x-2">
                <button
                  onClick={() => setActiveTab('template')}
                  className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
                    activeTab === 'template'
                      ? 'border-amber-500 text-slate-900 bg-white shadow-2xs'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Template & Message Editor</span>
                </button>
                <button
                  onClick={() => setActiveTab('recipients_orders')}
                  className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
                    activeTab === 'recipients_orders'
                      ? 'border-amber-500 text-slate-900 bg-white shadow-2xs'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Recipients & Orders</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 text-slate-700 font-bold">
                    {totalRecipientsCount} Staff · {selectedOrders.length} Orders
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
                    activeTab === 'preview'
                      ? 'border-amber-500 text-slate-900 bg-white shadow-2xs'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Live Email Preview</span>
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
                    activeTab === 'history'
                      ? 'border-amber-500 text-slate-900 bg-white shadow-2xs'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Sent History</span>
                </button>
              </div>
            </div>

            {/* Error Banners */}
            {loadError && (
              <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center space-x-2 px-6">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{loadError}</span>
              </div>
            )}
            {sendError && (
              <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center space-x-2 px-6">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{sendError}</span>
              </div>
            )}

            {/* Main Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
              {loadingData ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold">Loading outstanding orders & Sales/Support staff...</span>
                </div>
              ) : (
                <>
                  {/* TAB 1: TEMPLATE & MESSAGE EDITOR */}
                  {activeTab === 'template' && (
                    <div className="space-y-5">
                      {/* Presets and Controls Card */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Choose Template Preset</span>
                          </label>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleApplyPreset(selectedPresetId)}
                              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-1 transition-colors cursor-pointer"
                              title="Reset current editor content to preset default"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reset to Preset</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          {TEMPLATE_PRESETS.map(preset => {
                            const isSelected = selectedPresetId === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleApplyPreset(preset.id)}
                                className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-500/20'
                                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-900">{preset.name}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                  {preset.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Subject Line & Meta Controls */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Email Subject Line <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={subjectInput}
                            onChange={e => setSubjectInput(e.target.value)}
                            placeholder="e.g. Payment Reminder for Outstanding Orders..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            Supports merge tags: <code className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded">{'{{total_balance}}'}</code>, <code className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded">{'{{orders_count}}'}</code>, <code className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded">{'{{due_date}}'}</code>
                          </p>
                        </div>

                        {/* Priority, Due Date & Table Toggle Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                              <span>Urgency Level</span>
                            </label>
                            <select
                              value={priorityInput}
                              onChange={e => setPriorityInput(e.target.value as any)}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                            >
                              <option value="normal">Normal (Routine Follow-up)</option>
                              <option value="high">High (Recommended)</option>
                              <option value="urgent">Urgent (Immediate Action)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>Follow-up Target Date</span>
                            </label>
                            <input
                              type="date"
                              value={dueDateInput}
                              onChange={e => setDueDateInput(e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                            />
                          </div>

                          <div className="flex flex-col justify-end">
                            <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                              <input
                                type="checkbox"
                                checked={includeTableInput}
                                onChange={e => setIncludeTableInput(e.target.checked)}
                                className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                              />
                              <span className="text-[11px] font-semibold text-slate-700">
                                Include Orders Table in Email
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Custom Message Content Editor & Variable Chips */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span>Message Content & Instructions</span>
                            <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[11px] text-slate-400">
                            Click any variable chip below to insert into the message
                          </span>
                        </div>

                        {/* Variable insertion chips */}
                        <div className="flex items-center flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] font-bold uppercase text-slate-400 px-1 shrink-0">
                            Insert Merge Tags:
                          </span>
                          {VARIABLE_TAGS.map(item => (
                            <button
                              key={item.tag}
                              type="button"
                              onClick={() => handleInsertTag(item.tag)}
                              className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white text-amber-800 hover:bg-amber-100 hover:text-amber-900 border border-slate-200 hover:border-amber-300 shadow-2xs transition-colors cursor-pointer"
                              title={`Inserts ${item.label} (e.g. ${item.example})`}
                            >
                              + {item.tag}
                            </button>
                          ))}
                        </div>

                        {/* Textarea */}
                        <textarea
                          ref={textareaRef}
                          rows={10}
                          value={messageInput}
                          onChange={e => setMessageInput(e.target.value)}
                          placeholder="Type customized message content and payment collection instructions..."
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                        />

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            Tip: You can customize instructions per customer or collection timeline.
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('preview')}
                            className="text-amber-700 hover:text-amber-800 font-bold flex items-center space-x-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview rendered email &rarr;</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: RECIPIENTS & ORDERS */}
                  {activeTab === 'recipients_orders' && (
                    <div className="space-y-6">
                      {/* Section 1: Sales and Support Recipients */}
                      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                              <Users className="w-4 h-4 text-emerald-600" />
                              <span>Sales & Support Team Recipients ({staffRecipients.length})</span>
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Staff members assigned to Sales and Support roles who will receive the reminder
                            </p>
                          </div>

                          <div className="flex items-center space-x-2 text-xs">
                            <button
                              type="button"
                              onClick={() => setSelectedRecipientIds(staffRecipients.map(r => r.id))}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedRecipientIds([])}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>

                        {/* Staff Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {staffRecipients.map(staff => {
                            const isChecked = selectedRecipientIds.includes(staff.id);
                            const roleColor =
                              staff.role === 'Sales'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-teal-100 text-teal-800 border-teal-300';

                            return (
                              <label
                                key={staff.id}
                                className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                  isChecked
                                    ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/20'
                                    : 'bg-white border-slate-200 hover:bg-slate-50 opacity-75'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSelectedRecipientIds(prev => [...prev, staff.id]);
                                    } else {
                                      setSelectedRecipientIds(prev => prev.filter(id => id !== staff.id));
                                    }
                                  }}
                                  className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-900 truncate">
                                      {staff.name}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${roleColor}`}>
                                      {staff.role}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-500 font-mono block truncate mt-0.5">
                                    {staff.email}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>

                        {/* Additional CC Emails */}
                        <div className="pt-3 border-t border-slate-100">
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Additional CC Recipients (Optional)
                          </label>
                          <form onSubmit={handleAddCustomEmail} className="flex space-x-2">
                            <input
                              type="email"
                              value={customEmailInput}
                              onChange={e => setCustomEmailInput(e.target.value)}
                              placeholder="Enter email address (e.g. manager@casacentralstore.com)..."
                              className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                            />
                            <button
                              type="submit"
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          </form>

                          {additionalEmails.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {additionalEmails.map(em => (
                                <span
                                  key={em}
                                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-800 border border-slate-300 font-mono"
                                >
                                  <span>{em}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCustomEmail(em)}
                                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 2: Orders with Outstanding Balance */}
                      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                              <DollarSign className="w-4 h-4 text-rose-600" />
                              <span>Orders with Outstanding Balance ({allOutstandingOrders.length})</span>
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Pending and Partially Paid orders included in this follow-up email
                            </p>
                          </div>

                          <div className="flex items-center space-x-2 text-xs">
                            <button
                              type="button"
                              onClick={() => setSelectedOrderIds(allOutstandingOrders.map(o => o.id))}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Select All ({allOutstandingOrders.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedOrderIds([])}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 w-fit">
                            <button
                              type="button"
                              onClick={() => setOrderStatusFilter('ALL')}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                orderStatusFilter === 'ALL'
                                  ? 'bg-white text-slate-900 shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              All ({allOutstandingOrders.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderStatusFilter('Pending')}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                orderStatusFilter === 'Pending'
                                  ? 'bg-white text-slate-900 shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Pending ({allOutstandingOrders.filter(o => o.status === 'Pending').length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderStatusFilter('Partially Paid')}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                orderStatusFilter === 'Partially Paid'
                                  ? 'bg-white text-amber-800 shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Partially Paid ({allOutstandingOrders.filter(o => o.status === 'Partially Paid').length})
                            </button>
                          </div>

                          <input
                            type="text"
                            value={orderSearchText}
                            onChange={e => setOrderSearchText(e.target.value)}
                            placeholder="Search Order #, SO #, customer..."
                            className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 w-full sm:w-60 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        {/* Orders List / Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                              <tr>
                                <th className="py-2 px-3 w-8">
                                  <input
                                    type="checkbox"
                                    checked={
                                      filteredOrders.length > 0 &&
                                      filteredOrders.every(o => selectedOrderIds.includes(o.id))
                                    }
                                    onChange={e => {
                                      if (e.target.checked) {
                                        const idsToAdd = filteredOrders.map(o => o.id);
                                        setSelectedOrderIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
                                      } else {
                                        const idsToRemove = new Set(filteredOrders.map(o => o.id));
                                        setSelectedOrderIds(prev => prev.filter(id => !idsToRemove.has(id)));
                                      }
                                    }}
                                    className="w-3.5 h-3.5 text-amber-600 rounded cursor-pointer"
                                  />
                                </th>
                                <th className="py-2 px-3">Order / SO #</th>
                                <th className="py-2 px-3">Customer</th>
                                <th className="py-2 px-3 text-center">Status</th>
                                <th className="py-2 px-3 text-right">Total</th>
                                <th className="py-2 px-3 text-right">Paid</th>
                                <th className="py-2 px-3 text-right font-black text-rose-700">Balance Due</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredOrders.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                                    No orders match filter.
                                  </td>
                                </tr>
                              ) : (
                                filteredOrders.map(o => {
                                  const isSelected = selectedOrderIds.includes(o.id);
                                  return (
                                    <tr
                                      key={o.id}
                                      className={`hover:bg-slate-50/80 transition-colors ${
                                        isSelected ? 'bg-amber-50/20' : 'opacity-60'
                                      }`}
                                    >
                                      <td className="py-2.5 px-3">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={e => {
                                            if (e.target.checked) {
                                              setSelectedOrderIds(prev => [...prev, o.id]);
                                            } else {
                                              setSelectedOrderIds(prev => prev.filter(id => id !== o.id));
                                            }
                                          }}
                                          className="w-3.5 h-3.5 text-amber-600 rounded cursor-pointer"
                                        />
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <div className="font-mono font-bold text-slate-900">{o.order_number}</div>
                                        {o.so_number && (
                                          <div className="text-[10px] font-mono text-amber-700 font-bold">
                                            SO: {o.so_number}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <div className="font-semibold text-slate-900">
                                          {o.customer_name || 'Customer'}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-mono">
                                          {o.customer_phone || 'No phone'}
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                            o.status === 'Partially Paid'
                                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                                              : 'bg-slate-100 text-slate-700 border-slate-300'
                                          }`}
                                        >
                                          {o.status}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                        {formatCurrency(o.invoice_total)}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                                        {formatCurrency(o.amount_paid)}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono font-black text-rose-600 text-xs">
                                        {formatCurrency(o.balance_due)}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Selected Orders Total Bar */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium">
                            Included in Reminder:{' '}
                            <strong className="text-slate-900">{selectedOrders.length}</strong> of{' '}
                            <strong>{allOutstandingOrders.length}</strong> orders
                          </span>
                          <div className="flex items-center space-x-3 font-mono">
                            <span className="text-slate-500">
                              Total Balance Due:{' '}
                              <strong className="text-rose-600 text-sm font-black">
                                {formatCurrency(selectedSummary.totalBalance)}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: LIVE EMAIL PREVIEW */}
                  {activeTab === 'preview' && (
                    <div className="space-y-4">
                      {/* Email Header Metadata Simulator */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                        <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                          <span className="text-slate-400 uppercase font-bold text-[10px]">From:</span>
                          <span className="text-slate-900 font-semibold font-mono">
                            Casa Central Accounts Receivable &lt;accounting@casacentralstore.com&gt;
                          </span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                          <span className="text-slate-400 uppercase font-bold text-[10px]">To:</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-900 font-semibold font-mono">
                              {previewRecipient.name} &lt;{previewRecipient.email}&gt; ({previewRecipient.role})
                            </span>
                            {totalRecipientsCount > 1 && (
                              <span className="text-[10px] text-slate-500 italic">
                                (+ {totalRecipientsCount - 1} other staff recipients)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                          <span className="text-slate-400 uppercase font-bold text-[10px]">Subject:</span>
                          <span className="text-slate-900 font-bold">
                            {renderedSubject}
                          </span>
                        </div>
                      </div>

                      {/* Rendered Email Visual Mockup */}
                      <div className="bg-slate-900 p-4 sm:p-8 rounded-2xl flex justify-center shadow-inner overflow-x-auto">
                        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-[640px] overflow-hidden text-slate-800">
                          {/* Email Brand Header */}
                          <div className="bg-linear-to-r from-slate-900 to-slate-800 p-6 text-white border-b-4 border-amber-500">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg">
                                  CC
                                </div>
                                <div>
                                  <div className="text-sm font-black tracking-wider uppercase">
                                    Casa Central Store
                                  </div>
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                    Invoices & Accounts Receivable
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  priorityInput === 'urgent'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {priorityInput.toUpperCase()} FOLLOW-UP
                              </span>
                            </div>
                          </div>

                          {/* Email KPI Summary Row */}
                          <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 grid grid-cols-3 gap-3">
                            <div className="bg-white p-3 rounded-lg border border-rose-200 border-l-4 border-l-rose-500">
                              <span className="text-[9px] uppercase font-bold text-rose-700 tracking-wider block">
                                Total Due
                              </span>
                              <span className="text-base font-black text-rose-700 font-mono mt-0.5 block">
                                {formatCurrency(selectedSummary.totalBalance)}
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-amber-200 border-l-4 border-l-amber-500">
                              <span className="text-[9px] uppercase font-bold text-amber-700 tracking-wider block">
                                Open Orders
                              </span>
                              <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                                {selectedSummary.count}{' '}
                                <span className="text-[10px] text-slate-500 font-normal">
                                  ({selectedSummary.pendingCount} P, {selectedSummary.partiallyPaidCount} PP)
                                </span>
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-blue-200 border-l-4 border-l-blue-500">
                              <span className="text-[9px] uppercase font-bold text-blue-700 tracking-wider block">
                                Due By
                              </span>
                              <span className="text-xs font-bold text-slate-900 mt-1 block">
                                {formattedDueDate}
                              </span>
                            </div>
                          </div>

                          {/* Email Body Content */}
                          <div className="p-6 space-y-4">
                            <div>
                              <h3 className="text-base font-black text-slate-900">
                                Action Required: Follow Up Customer Payments
                              </h3>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Assigned to: <strong>{previewRecipient.name}</strong> ({previewRecipient.role}) · Sent by: {currentUser.name}
                              </p>
                            </div>

                            {/* Message Paragraphs */}
                            <div className="space-y-3 text-xs text-slate-700 leading-relaxed whitespace-pre-line border-y border-slate-100 py-4">
                              {renderedMessage}
                            </div>

                            {/* Rendered Orders Table */}
                            {includeTableInput && (
                              <div className="space-y-2 pt-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                                    Outstanding Orders Breakdown ({selectedOrders.length})
                                  </span>
                                  <span className="text-rose-600 font-bold font-mono">
                                    {formatCurrency(selectedSummary.totalBalance)} Due
                                  </span>
                                </div>

                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-left text-[11px]">
                                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px]">
                                      <tr>
                                        <th className="py-2 px-2.5">Order / SO #</th>
                                        <th className="py-2 px-2.5">Customer</th>
                                        <th className="py-2 px-2.5 text-center">Status</th>
                                        <th className="py-2 px-2.5 text-right">Total</th>
                                        <th className="py-2 px-2.5 text-right font-bold text-rose-600">Balance</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-sans">
                                      {selectedOrders.map(o => (
                                        <tr key={o.id} className="hover:bg-slate-50">
                                          <td className="py-2 px-2.5 font-mono font-bold text-slate-900">
                                            {o.order_number}
                                            {o.so_number && (
                                              <span className="block text-[10px] text-amber-700">
                                                SO: {o.so_number}
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 px-2.5">
                                            <div className="font-semibold text-slate-900">
                                              {o.customer_name || 'Customer'}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-mono">
                                              {o.customer_phone}
                                            </div>
                                          </td>
                                          <td className="py-2 px-2.5 text-center">
                                            <span
                                              className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                                                o.status === 'Partially Paid'
                                                  ? 'bg-amber-100 text-amber-800'
                                                  : 'bg-slate-100 text-slate-700'
                                              }`}
                                            >
                                              {o.status}
                                            </span>
                                          </td>
                                          <td className="py-2 px-2.5 text-right font-mono text-slate-600">
                                            {formatCurrency(o.invoice_total)}
                                          </td>
                                          <td className="py-2 px-2.5 text-right font-mono font-bold text-rose-600">
                                            {formatCurrency(o.balance_due)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Action Instructions Card */}
                            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
                              <div className="font-bold text-amber-900 uppercase text-[10px] tracking-wider">
                                Action Required by Sales & Support:
                              </div>
                              <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[11px]">
                                <li>Contact the customer to collect the outstanding balance.</li>
                                <li>Process payment via POS (Cash, Card, Check, or ACH).</li>
                                <li>Update fulfillment status and accounting invoices accordingly.</li>
                              </ul>
                            </div>
                          </div>

                          {/* Email Footer */}
                          <div className="bg-slate-900 p-4 text-center text-[10px] text-slate-400 border-t border-slate-800">
                            <span className="font-bold text-white">Casa Central Store</span> · 405 32nd St, Union City, NJ 07087
                            <div className="mt-1 text-slate-500">
                              Generated by POS & Operations Platform · Internal System Dispatch
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: DISPATCH HISTORY */}
                  {activeTab === 'history' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                            <History className="w-4 h-4 text-slate-500" />
                            <span>Recent Payment Reminder Dispatches ({historyItems.length})</span>
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Audit log of previously sent payment follow-up emails
                          </p>
                        </div>
                      </div>

                      {loadingHistory ? (
                        <div className="py-12 flex justify-center text-slate-400">
                          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : historyItems.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400 space-y-2">
                          <Mail className="w-8 h-8 mx-auto text-slate-300" />
                          <p className="text-sm font-bold text-slate-600">No payment reminders recorded yet</p>
                          <p className="text-xs text-slate-400">
                            When you send follow-up reminders to Sales and Support, they will appear here.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                              <tr>
                                <th className="py-2.5 px-4">Date & Time</th>
                                <th className="py-2.5 px-4">Recipient</th>
                                <th className="py-2.5 px-4">Subject</th>
                                <th className="py-2.5 px-4 text-center">Status</th>
                                <th className="py-2.5 px-4 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {historyItems.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                    {new Date(item.created_at).toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-slate-900">{item.to_name}</div>
                                    <div className="text-[11px] text-slate-500 font-mono">{item.to_email}</div>
                                  </td>
                                  <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate">
                                    {item.subject}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      {item.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setInspectingEmail(item)}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
                                    >
                                      Inspect
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div className="bg-white border-t border-slate-200 px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <span>
                  Recipients:{' '}
                  <strong className="text-slate-900 font-mono font-bold">
                    {totalRecipientsCount}
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Orders:{' '}
                  <strong className="text-slate-900 font-mono font-bold">
                    {selectedOrders.length}
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Outstanding:{' '}
                  <strong className="text-rose-600 font-mono font-bold">
                    {formatCurrency(selectedSummary.totalBalance)}
                  </strong>
                </span>
              </div>

              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={sending}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                {activeTab !== 'preview' ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview Email</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('template')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Template</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSendReminder}
                  disabled={sending || totalRecipientsCount === 0 || selectedOrders.length === 0}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black rounded-xl text-xs shadow-sm hover:shadow transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Sending Reminders...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-slate-950" />
                      <span>Send Reminder to {totalRecipientsCount} Staff</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Email Inspection Sub-Modal */}
        {inspectingEmail && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Sent Email Log Details</h4>
                  <p className="text-xs text-slate-400">To: {inspectingEmail.to_name} ({inspectingEmail.to_email})</p>
                </div>
                <button
                  onClick={() => setInspectingEmail(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-3 text-xs bg-slate-50">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Subject:</span>
                  <div className="font-bold text-slate-900">{inspectingEmail.subject}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Sent At:</span>
                  <div className="font-mono text-slate-700">{new Date(inspectingEmail.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">HTML Preview:</span>
                  <div
                    className="p-4 bg-white border border-slate-200 rounded-xl overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: inspectingEmail.body_html }}
                  />
                </div>
              </div>
              <div className="p-3 bg-white border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setInspectingEmail(null)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
