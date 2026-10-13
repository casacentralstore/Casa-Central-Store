import { formatDate, formatDateTime } from '../utils/formatters.ts';

export interface BackupDataset {
  orders: any[];
  logistics: any[];
  invoices: any[];
  customers: any[];
  inventory: any[];
  summary: {
    totalOrders: number;
    totalLogistics: number;
    totalInvoices: number;
    totalCustomers: number;
    totalInventory: number;
    exportedAt: string;
  };
}

export interface BackupResult {
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  title: string;
  timestamp: string;
  counts: {
    orders: number;
    logistics: number;
    invoices: number;
    customers: number;
    inventory: number;
  };
}

// Format each of the 5 sheets into 2D arrays [headerRow, ...dataRows]
export function buildSheetsData(data: BackupDataset) {
  // 1. Orders Tab (31 Columns - Matches the Attached Master Google Sheet exactly)
  const ordersHeaders = [
    'Order #',
    'Created At',
    'Transaction Date',
    'Customer Name',
    'Customer Phone',
    'Customer Email',
    'Sales Rep',
    'Lead Source',
    'Logistics Method',
    'Payment Method',
    'Status',
    'Fulfillment Status',
    'Subtotal ($)',
    'Shipping Fee ($)',
    'Installation Fee ($)',
    'Discount ($)',
    'Credit ($)',
    'Sales Tax ($)',
    'CC Surcharge ($)',
    'Invoice Total ($)',
    'Amount Paid ($)',
    'Balance Due ($)',
    'Tax Status',
    'Line SKU',
    'Model #',
    'Serial #',
    'Description',
    'Condition',
    'Quantity',
    'Unit Price ($)',
    'Line Total ($)',
    'Order Line Number',
  ];

  const ordersRows: any[][] = [];
  data.orders.forEach(order => {
    const items = order.items && order.items.length > 0 ? order.items : [null];
    const taxStatus = order.tax_exempt
      ? 'Tax Exempt'
      : Number(order.sales_tax || 0) > 0 || Number(order.tax_rate || 0) > 0
      ? 'Taxed'
      : 'Non-Taxed';

    items.forEach((item: any, idx: number) => {
      const qty = item ? Number(item.quantity || 1) : 0;
      const unitPrice = item ? Number(item.unit_price || 0) : 0;
      const lineTotal = qty * unitPrice;
      const lineNumber = item ? (item.line_number ?? (idx + 1)) : 1;

      ordersRows.push([
        order.order_number || '',
        order.created_at ? formatDateTime(order.created_at) : '',
        order.transaction_date ? formatDate(order.transaction_date) : '',
        order.customer_name || 'N/A',
        order.customer_phone || '',
        order.customer_email || '',
        order.sales_rep_name || 'Staff',
        order.lead_source || '',
        order.logistics_method || 'Pick Up',
        order.payment_method || 'Cash',
        order.status || 'Pending',
        order.fulfillment_status || 'Pending',
        Number(order.subtotal || 0).toFixed(2),
        Number(order.shipping_amount || 0).toFixed(2),
        Number(order.installation_fee || 0).toFixed(2),
        Number(order.discount || 0).toFixed(2),
        Number(order.credit || 0).toFixed(2),
        Number(order.sales_tax || 0).toFixed(2),
        Number(order.credit_card_charge || 0).toFixed(2),
        Number(order.invoice_total || 0).toFixed(2),
        Number(order.amount_paid || 0).toFixed(2),
        Number(order.balance_due || 0).toFixed(2),
        taxStatus,
        item ? (item.sku || '') : '',
        item ? (item.model_number || '') : '',
        item ? (item.serial_number || '') : '',
        item ? (item.description || '') : '',
        item ? (item.condition || '') : '',
        item ? qty : '',
        item ? unitPrice.toFixed(2) : '',
        item ? lineTotal.toFixed(2) : '',
        lineNumber,
      ]);
    });
  });

  // 2. Logistics Tab (16 Columns)
  const logisticsHeaders = [
    'Order #',
    'SO Number',
    'Customer Name',
    'Customer Phone',
    'Customer Email',
    'Delivery Address',
    'Logistics Method',
    'Fulfillment Status',
    'Is Fulfilled',
    'Carrier',
    'Tracking Number',
    'Delivery Schedule',
    'Driver Name',
    'Logistics Notes',
    'Fulfilled At',
    'Order Date',
  ];

  const logisticsRows: any[][] = data.logistics.map(log => [
    log.order_number || '',
    log.so_number || 'N/A',
    log.customer_name || 'N/A',
    log.customer_phone || '',
    log.customer_email || '',
    log.delivery_address || '',
    log.logistics_method || 'Pick Up',
    log.fulfillment_status || 'Pending',
    log.is_fulfilled ? 'YES' : 'NO',
    log.carrier || 'In-House Delivery',
    log.tracking_number || '',
    log.delivery_schedule ? formatDate(log.delivery_schedule) : '',
    log.driver_name || '',
    log.logistics_notes || '',
    log.fulfilled_at ? formatDateTime(log.fulfilled_at) : '',
    log.transaction_date ? formatDate(log.transaction_date) : '',
  ]);

  // 3. Invoices Tab (20 Columns)
  const invoicesHeaders = [
    'Invoice #',
    'Order #',
    'SO Number',
    'Billing Date',
    'Customer Name',
    'Customer Phone',
    'Customer Email',
    'Payment Status',
    'Payment Method',
    'Subtotal ($)',
    'Shipping Fee ($)',
    'Installation Fee ($)',
    'Sales Tax ($)',
    'CC Surcharge ($)',
    'Discount ($)',
    'Credit ($)',
    'Invoice Total ($)',
    'Amount Paid ($)',
    'Balance Due ($)',
    'Order Status',
  ];

  const invoicesRows: any[][] = data.invoices.map(inv => [
    inv.invoice_number || '',
    inv.order_number || '',
    inv.so_number || '',
    inv.billing_date ? formatDate(inv.billing_date) : '',
    inv.customer_name || 'N/A',
    inv.customer_phone || '',
    inv.customer_email || '',
    inv.payment_status || '',
    inv.payment_method || '',
    Number(inv.subtotal || 0).toFixed(2),
    Number(inv.shipping_amount || 0).toFixed(2),
    Number(inv.installation_fee || 0).toFixed(2),
    Number(inv.sales_tax || 0).toFixed(2),
    Number(inv.credit_card_charge || 0).toFixed(2),
    Number(inv.discount || 0).toFixed(2),
    Number(inv.credit || 0).toFixed(2),
    Number(inv.invoice_total || 0).toFixed(2),
    Number(inv.amount_paid || 0).toFixed(2),
    Number(inv.balance_due || 0).toFixed(2),
    inv.status || '',
  ]);

  // 4. Customers Tab (14 Columns)
  const customersHeaders = [
    'Customer #',
    'First Name',
    'Last Name',
    'Display Name',
    'Phone',
    'Email',
    'Address',
    'City',
    'State',
    'ZIP Code',
    'Total Orders',
    'Lifetime Spend ($)',
    'Notes',
    'Registered Date',
  ];

  const customersRows: any[][] = data.customers.map(c => [
    c.customer_number || '',
    c.first_name || '',
    c.last_name || '',
    c.display_name || '',
    c.phone || '',
    c.email || '',
    c.address || '',
    c.city || '',
    c.state || '',
    c.zip || '',
    Number(c.total_orders || 0),
    Number(c.total_spent || 0).toFixed(2),
    c.notes || '',
    c.created_at ? formatDate(c.created_at) : '',
  ]);

  // 5. Inventory Tab (16 Columns)
  const inventoryHeaders = [
    'SKU',
    'Brand',
    'Model Number',
    'Serial Number',
    'Item Tag',
    'Description',
    'Condition',
    'Quantity In Stock',
    'Unit Cost ($)',
    'Selling Price ($)',
    'Total Asset Valuation ($)',
    'Location',
    'Status',
    'Source',
    'Notes',
    'Cataloged At',
  ];

  const inventoryRows: any[][] = data.inventory.map(item => {
    const qty = Number(item.quantity || 0);
    const unitCost = Number(item.unit_cost || 0);
    const totalValuation = qty * unitCost;

    return [
      item.sku || '',
      item.brand || '',
      item.model_number || '',
      item.serial_number || '',
      item.item_tag || '',
      item.description || '',
      item.condition || '',
      qty,
      unitCost.toFixed(2),
      Number(item.selling_price || 0).toFixed(2),
      totalValuation.toFixed(2),
      item.location || '',
      item.status || '',
      item.source || '',
      item.notes || '',
      item.created_at ? formatDate(item.created_at) : '',
    ];
  });

  return {
    orders: [ordersHeaders, ...ordersRows],
    logistics: [logisticsHeaders, ...logisticsRows],
    invoices: [invoicesHeaders, ...invoicesRows],
    customers: [customersHeaders, ...customersRows],
    inventory: [inventoryHeaders, ...inventoryRows],
  };
}

/**
 * Converts a 2D array into clean TSV (Tab Separated Values) for 1-click
 * copying and direct pasting into any Google Sheet (via Ctrl+V / Cmd+V).
 */
export function buildTsv(rows: any[][]): string {
  return rows
    .map(row =>
      row
        .map(cell => {
          const str = cell === null || cell === undefined ? '' : String(cell);
          // If the cell contains tabs or newlines, wrap in quotes
          if (str.includes('\t') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join('\t')
    )
    .join('\n');
}

/**
 * Converts a 2D array into RFC 4180 compliant CSV.
 */
export function buildCsv(rows: any[][]): string {
  return rows
    .map(row =>
      row
        .map(cell => {
          const str = cell === null || cell === undefined ? '' : String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');
}

/**
 * Triggers a browser file download.
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Logs data directly into a Google Sheet via a Google Apps Script Webhook or endpoint.
 * Requires ZERO Google Cloud credentials, OAuth tokens, or Firebase Auth.
 */
export async function syncDataToGoogleSheetWebhook(
  webhookUrl: string,
  payload: {
    action?: 'sync' | 'append';
    tab?: string;
    rows?: any[][];
    dataset?: BackupDataset;
  }
): Promise<{ success: boolean; message: string; rowsLogged?: number }> {
  const cleanUrl = webhookUrl.trim();
  if (!cleanUrl) {
    throw new Error('Google Sheet Webhook URL is required.');
  }

  // Allow either direct Apps Script or local proxy
  const res = await fetch(cleanUrl, {
    method: 'POST',
    mode: 'no-cors', // Standard Google Apps Script Web App redirects
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  return {
    success: true,
    message: 'Data successfully dispatched to Google Sheet.',
    rowsLogged: payload.rows ? payload.rows.length - 1 : undefined,
  };
}

/**
 * Standard Apps Script template that users can paste into their Google Sheet
 * (Extensions > Apps Script) to enable automatic, zero-auth logging.
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// -------------------------------------------------------------
// Casa Central Store - Google Sheet Logger Script
// Paste into: Extensions > Apps Script in your Google Sheet
// Then click: Deploy > New Deployment > Web app
// - Execute as: Me
// - Who has access: Anyone
// -------------------------------------------------------------

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tabName = payload.tab || 'Orders';
    var sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);
    
    if (payload.action === 'sync' && payload.rows && payload.rows.length > 0) {
      sheet.clearContents();
      sheet.getRange(1, 1, payload.rows.length, payload.rows[0].length).setValues(payload.rows);
      sheet.getRange(1, 1, 1, payload.rows[0].length).setFontWeight("bold").setBackground("#172133").setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    } else if (payload.rows && payload.rows.length > 0) {
      // Append rows
      for (var i = 0; i < payload.rows.length; i++) {
        sheet.appendRow(payload.rows[i]);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Logged to Google Sheet successfully" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "online", service: "Casa Central Store Logger" }))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
