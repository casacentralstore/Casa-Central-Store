import React, { useState } from 'react';
import { Order, TaxSettings } from '../../types/index.ts';
import { formatCurrency, formatDate, generateOrderPdf } from '../../utils/formatters.ts';
import { Printer, Download, X, Mail, Copy, Check, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { copyEmailToClipboard, buildMailtoUrl, buildGmailComposeUrl } from '../../utils/emailHelper.ts';

interface DocumentViewerModalProps {
  order: Order | null;
  settings: TaxSettings;
  initialType?: 'Invoice' | 'Receipt' | 'Packing Slip';
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  order,
  settings,
  initialType = 'Invoice',
  onClose,
}) => {
  const [docType, setDocType] = useState<'Invoice' | 'Receipt' | 'Packing Slip'>(initialType);
  const [showEmailPanel, setShowEmailPanel] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  if (!order) return null;

  const customerEmail = order.customer_email || '';
  const customerName = order.customer_name || 'Valued Customer';
  const emailSubject = `${settings.company_name || 'Casa Central Store'} - ${docType} #${order.order_number}`;

  const buildInvoicePlainText = () => {
    const itemsList = (order.items || []).map((it, i) => 
      `${i + 1}. [${it.sku}] ${it.description} x${it.quantity} @ ${formatCurrency(it.unit_price)} = ${formatCurrency(it.line_total)}`
    ).join('\n');

    return `Dear ${customerName},

Thank you for your business with ${settings.company_name || 'Casa Central Store'}!

Here is your ${docType} summary for Order #${order.order_number}:
Date: ${formatDate(order.transaction_date)}
Status: ${order.status} | Fulfillment: ${order.fulfillment_status || 'Pick Up'}

ITEMS:
==================================================
${itemsList || 'No line items listed'}
==================================================

Subtotal: ${formatCurrency(order.subtotal)}
Sales Tax: ${formatCurrency(order.sales_tax)}
${order.shipping_amount ? `Shipping Fee: ${formatCurrency(order.shipping_amount)}\n` : ''}${order.credit_card_charge ? `CC Surcharge: ${formatCurrency(order.credit_card_charge)}\n` : ''}Invoice Total: ${formatCurrency(order.invoice_total)}
Amount Paid: ${formatCurrency(order.amount_paid)}
Balance Due: ${formatCurrency(order.balance_due)}

Store Address:
${settings.company_address || '1420 Bergenline Avenue'}
${settings.company_city_state_zip || 'Union City, NJ 07087'}
Phone: ${settings.company_phone || '(201) 867-4200'}
Email: ${settings.company_email || 'info@casacentralstore.com'}`;
  };

  const handleCopyInvoiceEmail = async () => {
    const text = buildInvoicePlainText();
    const success = await copyEmailToClipboard({
      to: customerEmail,
      toName: customerName,
      subject: emailSubject,
      bodyText: text,
    });
    if (success) {
      setCopiedInvoice(true);
      setTimeout(() => setCopiedInvoice(false), 2500);
    }
  };

  const handleOpenInvoiceMailApp = () => {
    const text = buildInvoicePlainText();
    const url = buildMailtoUrl({
      to: customerEmail,
      subject: emailSubject,
      body: text,
    });
    window.open(url, '_blank');
  };

  const handleOpenInvoiceGmailWeb = () => {
    const text = buildInvoicePlainText();
    const url = buildGmailComposeUrl({
      to: customerEmail,
      subject: emailSubject,
      body: text,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    generateOrderPdf(order, docType, settings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static font-sans">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[92dvh] print:max-h-none print:shadow-none print:rounded-none overflow-hidden">
        {/* Top Modal Controls (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 sm:px-6 py-3 bg-slate-50 rounded-t-xl print:hidden shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex bg-slate-200 p-1 rounded-lg">
              {(['Invoice', 'Receipt', 'Packing Slip'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setDocType(type)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    docType === type
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-300 font-mono">
              {order.order_number}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 mr-1.5 text-slate-600" />
              Print
            </button>
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 mr-1.5 text-amber-400" />
              Download PDF
            </button>
            <button
              onClick={() => setShowEmailPanel(!showEmailPanel)}
              className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer ${
                showEmailPanel
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
              }`}
              title="Copy formatted email or open directly in Outlook / Gmail"
            >
              <Mail className="w-4 h-4 mr-1.5 text-amber-500" />
              <span>Email / Copy</span>
              {showEmailPanel ? (
                <ChevronUp className="w-3.5 h-3.5 ml-1" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 ml-1" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Email & Manual Dispatch Drawer (Print: hidden) */}
        {showEmailPanel && (
          <div className="bg-amber-500/10 border-b border-amber-300 p-4 print:hidden text-xs text-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <Mail className="w-4 h-4 text-amber-600" />
                  <span>Manual Email &amp; Clipboard Dispatch</span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Recipient: <strong className="text-slate-900">{customerName}</strong> &bull;{' '}
                  <span className="font-mono text-slate-700">{customerEmail || 'No customer email on file'}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyInvoiceEmail}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors"
                  title="Copy full formatted invoice summary to clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedInvoice ? 'Copied to Clipboard!' : 'Copy Formatted Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenInvoiceMailApp}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors"
                  title="Launch default email app (Outlook, Apple Mail, etc.)"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Open in Mail App</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenInvoiceGmailWeb}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors"
                  title="Open pre-filled draft in Gmail web composer"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span>Open in Gmail</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-white border border-amber-200 rounded-lg max-h-36 overflow-y-auto font-mono text-[11px] whitespace-pre-wrap text-slate-700 leading-relaxed shadow-inner">
              {buildInvoicePlainText()}
            </div>
          </div>
        )}

        {/* Printable Document Preview Area */}
        <div className="p-8 overflow-y-auto print:p-6 print:overflow-visible">
          {/* Printable Sheet */}
          <div className="max-w-3xl mx-auto border border-slate-200 p-8 rounded-lg shadow-xs bg-white text-slate-800 print:border-none print:shadow-none print:p-0">
            {/* Document Header */}
            <div className="flex justify-between items-start border-b-2 border-amber-500 pb-5">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center font-black text-slate-950 text-base shadow-xs">
                    CC
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">
                    CASA CENTRAL STORE
                  </h1>
                </div>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Appliances & Electronics Asset-Recovery Specialists
                </p>
                <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                  <p>{settings.company_address || '1420 Bergenline Avenue'}</p>
                  <p>{settings.company_city_state_zip || 'Union City, NJ 07087'}</p>
                  <p>Tel: {settings.company_phone || '(201) 867-4200'} | Email: {settings.company_email || 'info@casacentralstore.com'}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-block px-3 py-1 bg-slate-900 text-amber-400 font-bold text-sm tracking-wider uppercase rounded-md shadow-xs">
                  {docType}
                </div>
                <p className="text-base font-bold text-slate-900 mt-2 font-mono">{order.order_number}</p>
                <p className="text-xs text-slate-500">Date: {formatDate(order.transaction_date)}</p>
                <p className="text-xs text-slate-500">Rep: {order.sales_rep_name || 'Staff'}</p>
                <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Status: {order.status}
                </span>
              </div>
            </div>

            {/* Customer & Logistics Info */}
            <div className="grid grid-cols-2 gap-6 my-6 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-1.5 text-[11px]">
                  Customer Information
                </h3>
                <p className="font-semibold text-slate-900 text-sm">
                  {order.customer?.display_name || 'Walk-in Customer'}
                </p>
                <p className="text-slate-600">{order.customer?.phone || 'No phone provided'}</p>
                <p className="text-slate-600">{order.customer?.email || 'No email provided'}</p>
                {order.customer?.address && (
                  <p className="text-slate-600 mt-1">
                    {order.customer.address}, {order.customer.city} {order.customer.state} {order.customer.zip}
                  </p>
                )}
                {order.tax_exempt && (
                  <p className="mt-1.5 inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                    TAX EXEMPT (Certificate Attached)
                  </p>
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-1.5 text-[11px]">
                  Fulfillment & Logistics
                </h3>
                <p className="font-semibold text-slate-900">
                  Method: <span className="text-amber-600 font-bold">{order.logistics_method}</span>
                </p>
                {order.logistics_method === 'Delivery' ? (
                  <div className="text-slate-600 space-y-0.5 mt-1">
                    <p>Address: {order.delivery_address || order.customer?.address || 'Standard Delivery'}</p>
                    {order.delivery_date && <p>Scheduled Date: {formatDate(order.delivery_date)}</p>}
                    {order.driver_name && <p>Driver: {order.driver_name}</p>}
                  </div>
                ) : (
                  <div className="text-slate-600 space-y-0.5 mt-1">
                    <p>Pickup Location: Showroom / Warehouse Bay</p>
                    {order.scheduled_pickup_date && (
                      <p>Scheduled Pickup: {formatDate(order.scheduled_pickup_date)}</p>
                    )}
                  </div>
                )}
                <p className="text-slate-500 mt-1">Payment Method: {order.payment_method}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto my-6 print:my-4">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px]">
                    <th className="py-2 px-1.5 w-7 text-center">#</th>
                    <th className="py-2 px-2 w-28">SKU</th>
                    <th className="py-2 px-2.5">Description & Physical Details</th>
                    <th className="py-2 px-2 w-14 text-center">Qty</th>
                    {docType !== 'Packing Slip' && (
                      <>
                        <th className="py-2 px-2 w-24 text-right">Unit Price</th>
                        <th className="py-2 px-2 w-24 text-right">Line Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {order.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                      <td className="py-2 px-1.5 text-slate-400 font-mono text-center align-top">{idx + 1}</td>
                      <td className="py-2 px-2 font-mono font-medium text-slate-800 text-[11px] break-all align-top">
                        {item.sku}
                      </td>
                      <td className="py-2 px-2.5 align-top">
                        <div className="font-medium text-slate-900 leading-snug">{item.description}</div>
                        {item.serial_number && item.serial_number.trim() && (
                          <div className="text-[10px] text-slate-500 font-mono mt-1">
                            S/N: <strong className="text-slate-700">{item.serial_number}</strong>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-900 align-top">{item.quantity}</td>
                      {docType !== 'Packing Slip' && (
                        <>
                          <td className="py-2 px-2 text-right font-mono text-slate-700 text-[11px] align-top">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 text-[11px] align-top">
                            {formatCurrency(item.line_total)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary (Only for Invoice and Receipt) */}
            {docType !== 'Packing Slip' && (
              <div className="flex justify-end my-6">
                <div className="w-72 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCurrency(order.subtotal)}</span>
                  </div>
                  {order.shipping_amount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Shipping / Delivery:</span>
                      <span className="font-mono">{formatCurrency(order.shipping_amount)}</span>
                    </div>
                  )}
                  {order.installation_fee > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Installation Fee:</span>
                      <span className="font-mono">{formatCurrency(order.installation_fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>
                      Sales Tax {order.tax_exempt ? '(Exempt)' : `(${(order.tax_rate ? order.tax_rate * 100 : settings.default_tax_rate * 100).toFixed(2)}%)`}:
                    </span>
                    <span className="font-mono">{formatCurrency(order.sales_tax)}</span>
                  </div>
                  {order.credit_card_charge > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Credit Card Surcharge (3%):</span>
                      <span className="font-mono">{formatCurrency(order.credit_card_charge)}</span>
                    </div>
                  )}
                  {order.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span className="font-mono">-{formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  {order.credit > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Store Credit:</span>
                      <span className="font-mono">-{formatCurrency(order.credit)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-sm text-slate-900">
                    <span>Invoice Total:</span>
                    <span className="font-mono">{formatCurrency(order.invoice_total)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Amount Paid:</span>
                    <span className="font-mono">{formatCurrency(order.amount_paid)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-sm text-slate-900">
                    <span>Balance Due:</span>
                    <span className={`font-mono ${order.balance_due > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {formatCurrency(order.balance_due)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Payments List if Receipt */}
            {docType === 'Receipt' && order.payments && order.payments.length > 0 && (
              <div className="my-4 border border-slate-200 rounded p-3 bg-slate-50/60 text-xs">
                <h4 className="font-bold text-slate-800 mb-2">Payment Transactions Recorded:</h4>
                <div className="space-y-1">
                  {order.payments.map((p, i) => (
                    <div key={i} className="flex justify-between text-slate-600">
                      <span>
                        {formatDate(p.payment_date)} - {p.payment_method}{' '}
                        {p.reference_number ? `(Ref: ${p.reference_number})` : ''}
                      </span>
                      <span className="font-mono font-semibold text-slate-900">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes & Terms */}
            <div className="mt-8 pt-4 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
              {order.notes && order.notes.trim() && (
                <div className="mb-2">
                  <p className="font-semibold text-slate-700">Order Notes / Instructions:</p>
                  <p className="italic text-slate-600">{order.notes}</p>
                </div>
              )}
              <p className="font-semibold text-slate-700">TERMS & CONDITIONS / WARRANTY:</p>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                By accepting this invoice, the customer acknowledges and agrees that all items are sold as-is, have been tested for operation prior to release, and have been received in satisfactory condition. Items with a Blue Tag include a 30-day store warranty, and the store reserves the right to provide a refund. Items with a Red Tag are sold as-is with no warranty. Items with a Green Tag are open-box items covered by the manufacturer’s warranty for one (1) year, subject to the manufacturer’s terms and conditions.
              </p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 mt-10 pt-4 border-t border-dashed border-slate-300 text-xs">
              <div>
                <div className="border-b border-slate-400 h-8"></div>
                <p className="text-slate-500 mt-1">Staff / Sales Representative Signature</p>
              </div>
              <div>
                <div className="border-b border-slate-400 h-8"></div>
                <p className="text-slate-500 mt-1">Customer Acceptance Signature & Date</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
