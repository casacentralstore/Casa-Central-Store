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
  spreadsheetId: string;
  spreadsheetUrl: string;
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
  // 1. Orders Tab
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
  ];

  const ordersRows: any[][] = [];
  data.orders.forEach(order => {
    const items = order.items && order.items.length > 0 ? order.items : [null];
    const taxStatus = order.tax_exempt
      ? 'Tax Exempt'
      : Number(order.sales_tax || 0) > 0 || Number(order.tax_rate || 0) > 0
      ? 'Taxed'
      : 'Non-Taxed';

    items.forEach((item: any) => {
      const qty = item ? Number(item.quantity || 1) : 0;
      const unitPrice = item ? Number(item.unit_price || 0) : 0;
      const lineTotal = qty * unitPrice;

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
      ]);
    });
  });

  // 2. Logistics Tab
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

  // 3. Invoices Tab
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

  // 4. Customers Tab
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

  // 5. Inventory Tab
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
 * Creates a brand new Google Sheet in the user's Google Drive with all 5 tabs
 * populated with current database records.
 */
export async function createGoogleSheetBackup(
  accessToken: string,
  dataset: BackupDataset,
  onProgress?: (message: string) => void
): Promise<BackupResult> {
  const timestamp = new Date().toISOString();
  const dateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const sheetTitle = `Casa Central Store - Business Backup (${dateFormatted})`;

  onProgress?.('Preparing tabular data across all 5 modules...');
  const sheetsData = buildSheetsData(dataset);

  // 1. Create Spreadsheet with 5 named sheets
  onProgress?.('Creating new Google Spreadsheet file in Google Drive...');
  const createPayload = {
    properties: {
      title: sheetTitle,
    },
    sheets: [
      { properties: { sheetId: 101, title: 'Orders', gridProperties: { frozenRowCount: 1 } } },
      { properties: { sheetId: 102, title: 'Logistics', gridProperties: { frozenRowCount: 1 } } },
      { properties: { sheetId: 103, title: 'Invoices', gridProperties: { frozenRowCount: 1 } } },
      { properties: { sheetId: 104, title: 'Customers', gridProperties: { frozenRowCount: 1 } } },
      { properties: { sheetId: 105, title: 'Inventory', gridProperties: { frozenRowCount: 1 } } },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Failed to create Google Spreadsheet file');
  }

  const createdFile = await createRes.json();
  const spreadsheetId = createdFile.spreadsheetId;

  // 2. Populate values across all 5 sheets in batch
  onProgress?.('Populating Orders, Logistics, Invoices, Customers, and Inventory...');
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Orders!A1', values: sheetsData.orders },
          { range: 'Logistics!A1', values: sheetsData.logistics },
          { range: 'Invoices!A1', values: sheetsData.invoices },
          { range: 'Customers!A1', values: sheetsData.customers },
          { range: 'Inventory!A1', values: sheetsData.inventory },
        ],
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json();
    throw new Error(err.error?.message || 'Failed to populate spreadsheet cells');
  }

  // 3. Apply professional Casa Central brand formatting (dark header, white bold text)
  onProgress?.('Applying professional styling and freeze panes...');
  try {
    const sheetIds = [101, 102, 103, 104, 105];
    const formatRequests: any[] = [];

    sheetIds.forEach(id => {
      // Format Row 1 (Header) with dark slate background and bold white text
      formatRequests.push({
        repeatCell: {
          range: {
            sheetId: id,
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.09, green: 0.13, blue: 0.20 }, // #172133 Slate
              textFormat: {
                foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                bold: true,
                fontSize: 10,
              },
              horizontalAlignment: 'LEFT',
              verticalAlignment: 'MIDDLE',
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
        },
      });
      // Auto resize columns
      formatRequests.push({
        autoResizeDimensions: {
          dimensions: {
            sheetId: id,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 30,
          },
        },
      });
    });

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: formatRequests }),
    });
  } catch (formatErr) {
    // Non-fatal, styling enhancement only
    console.warn('Formatting batch update non-fatal error:', formatErr);
  }

  onProgress?.('Backup complete!');

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    title: sheetTitle,
    timestamp,
    counts: {
      orders: sheetsData.orders.length - 1,
      logistics: sheetsData.logistics.length - 1,
      invoices: sheetsData.invoices.length - 1,
      customers: sheetsData.customers.length - 1,
      inventory: sheetsData.inventory.length - 1,
    },
  };
}

/**
 * Updates an existing Google Spreadsheet with the latest data across all 5 tabs.
 * Note: Caller must confirm with the user before invoking this operation.
 */
export async function updateGoogleSheetBackup(
  accessToken: string,
  spreadsheetId: string,
  dataset: BackupDataset,
  onProgress?: (message: string) => void
): Promise<BackupResult> {
  onProgress?.('Verifying existing spreadsheet...');
  // 1. Fetch spreadsheet info
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!metaRes.ok) {
    const err = await metaRes.json();
    throw new Error(err.error?.message || 'Failed to locate existing Google Spreadsheet');
  }

  const meta = await metaRes.json();
  const existingSheetTitles: string[] = (meta.sheets || []).map((s: any) => s.properties.title);
  const requiredTitles = ['Orders', 'Logistics', 'Invoices', 'Customers', 'Inventory'];
  const missingTitles = requiredTitles.filter(t => !existingSheetTitles.includes(t));

  // Add missing sheets if needed
  if (missingTitles.length > 0) {
    onProgress?.(`Adding missing tabs (${missingTitles.join(', ')})...`);
    const addSheetRequests = missingTitles.map(title => ({
      addSheet: {
        properties: {
          title,
          gridProperties: { frozenRowCount: 1 },
        },
      },
    }));
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: addSheetRequests }),
    });
  }

  // 2. Clear old data ranges
  onProgress?.('Clearing previous data rows in sheets...');
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: ['Orders!A1:ZZ', 'Logistics!A1:ZZ', 'Invoices!A1:ZZ', 'Customers!A1:ZZ', 'Inventory!A1:ZZ'],
      }),
    }
  );

  // 3. Write fresh data
  onProgress?.('Syncing updated data into all 5 sheets...');
  const sheetsData = buildSheetsData(dataset);

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Orders!A1', values: sheetsData.orders },
          { range: 'Logistics!A1', values: sheetsData.logistics },
          { range: 'Invoices!A1', values: sheetsData.invoices },
          { range: 'Customers!A1', values: sheetsData.customers },
          { range: 'Inventory!A1', values: sheetsData.inventory },
        ],
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json();
    throw new Error(err.error?.message || 'Failed to update spreadsheet data');
  }

  onProgress?.('Update complete!');

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    title: meta.properties?.title || 'Casa Central Store Backup',
    timestamp: new Date().toISOString(),
    counts: {
      orders: sheetsData.orders.length - 1,
      logistics: sheetsData.logistics.length - 1,
      invoices: sheetsData.invoices.length - 1,
      customers: sheetsData.customers.length - 1,
      inventory: sheetsData.inventory.length - 1,
    },
  };
}
