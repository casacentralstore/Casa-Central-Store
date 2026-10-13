import * as XLSX from 'xlsx';
import { formatDate, formatDateTime } from './formatters.ts';

export function formatOrderRows(order: any): any[] {
  const createdDate = order.created_at
    ? formatDateTime(order.created_at)
    : (order.transaction_date ? formatDate(order.transaction_date) : '');
  const lastUpdateDate = order.updated_at
    ? formatDateTime(order.updated_at)
    : (order.created_at ? formatDateTime(order.created_at) : (order.transaction_date ? formatDate(order.transaction_date) : ''));
  const customerName = order.customer_name || (order.customer ? order.customer.display_name : '') || 'N/A';
  const customerPhone = order.customer_phone || (order.customer ? order.customer.phone : '') || '';
  const customerEmail = order.customer_email || (order.customer ? order.customer.email : '') || '';

  let taxStatus = 'Non-Taxed';
  if (order.tax_exempt) {
    taxStatus = 'Tax Exempt';
  } else if (Number(order.sales_tax || 0) > 0 || Number(order.tax_rate || 0) > 0) {
    taxStatus = 'Taxed';
  } else {
    taxStatus = 'Non-Taxed';
  }

  const items = order.items && order.items.length > 0 ? order.items : [null];

  return items.map((item: any, idx: number) => ({
    'Order #': order.order_number || '',
    'Date & Time': createdDate,
    'Transaction Date': order.transaction_date || '',
    'Last Update Date': lastUpdateDate,
    'Customer Name': customerName,
    'Customer Phone': customerPhone,
    'Customer Email': customerEmail,
    'Sales Rep': order.sales_rep_name || 'Staff',
    'Logistics Method': order.logistics_method || 'Pick Up',
    'Payment Method': order.payment_method || '',
    'Status': order.status || 'Pending',
    'Subtotal': Number(order.subtotal || 0).toFixed(2),
    'Shipping Fee': Number(order.shipping_amount || 0).toFixed(2),
    'Installation Fee': Number(order.installation_fee || 0).toFixed(2),
    'Discount': Number(order.discount || 0).toFixed(2),
    'Credit': Number(order.credit || 0).toFixed(2),
    'Sales Tax': Number(order.sales_tax || 0).toFixed(2),
    'CC Surcharge': Number(order.credit_card_charge || 0).toFixed(2),
    'Invoice Total': Number(order.invoice_total || 0).toFixed(2),
    'Amount Paid': Number(order.amount_paid || 0).toFixed(2),
    'Balance Due': Number(order.balance_due || 0).toFixed(2),
    'Tax Status (Taxed, Non-Taxed, Tax Exempt)': taxStatus,
    'Item SKU': item ? (item.sku || '') : '',
    'Serial Number': item ? (item.serial_number || '') : '',
    'Description': item ? (item.description || '') : '',
    'Condition': item ? (item.condition || '') : '',
    'Item Tag': item ? (item.item_tag || '') : '',
    'Location': item ? (item.location || '') : '',
    'Quantity': item ? (item.quantity != null ? item.quantity : 1) : '',
    'Price': item ? (item.unit_price != null ? Number(item.unit_price).toFixed(2) : '0.00') : '',
    'Line Number': item ? (item.line_number != null ? item.line_number : idx + 1) : '',
  }));
}

export function formatOrderRow(order: any) {
  const rows = formatOrderRows(order);
  return rows[0] || {};
}

export function exportOrdersToCsv(orders: any[], filename?: string) {
  const name = filename || `Orders_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  const rows = orders.flatMap(formatOrderRows);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, name);
}

export function exportOrdersToXlsx(orders: any[], filename?: string) {
  const name = filename || `Orders_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const rows = orders.flatMap(formatOrderRows);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  if (rows.length > 0) {
    const colWidths = Object.keys(rows[0]).map(key => ({
      wch: Math.max(key.length + 3, 14),
    }));
    worksheet['!cols'] = colWidths;
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, name);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
