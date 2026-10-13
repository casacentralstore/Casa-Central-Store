import express from 'express';
import path from 'node:path';
import { initDatabase, queryAll, queryOne, run } from './server/db.ts';
import {
  calculateOrderTotals,
  createOrder,
  getOrderById,
  getOrderByNumber,
  updateOrder,
  cancelOrder,
  fulfillOrder,
  updateFulfillmentStatus,
  updateInvoiceNumber,
  getSettings,
} from './server/services/orderService.ts';
import {
  getOutstandingOrdersForReminder,
  getSalesAndSupportRecipients,
  sendPaymentReminders,
  getPaymentReminderHistory,
} from './server/services/invoiceReminderService.ts';
import {
  searchCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  checkCustomerDuplicates,
} from './server/services/customerService.ts';
import {
  listInventory,
  searchAvailableInventory,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  bulkCreateInventoryItems,
} from './server/services/inventoryService.ts';
import { recordPayment } from './server/services/paymentService.ts';
import { saveDocument } from './server/services/documentService.ts';
import { getDashboardMetrics, getSalesReport } from './server/services/reportService.ts';
import {
  getAllUsers,
  getUserById,
  createUser,
  deleteUser,
  checkPermission,
  loginUser,
  validateSession,
  logoutSession,
  verifyInviteToken,
  setupPasswordWithInvite,
  resendInvitation,
  getUserInvitation,
  changePassword,
  adminResetUserPassword,
} from './server/services/authService.ts';
import { UserRole } from './src/types/index.ts';
import { resolveTaxRate, NY_ZIP_TAX_MAP, ALL_NY_TAX_ENTRIES } from './server/data/nyTaxData.ts';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Middleware to extract current user from header or session token
app.use((req, res, next) => {
  const authHeader = req.headers['authorization'];
  const sessionToken = (req.headers['x-auth-token'] as string) || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined);
  
  let user = null;
  if (sessionToken) {
    user = validateSession(sessionToken);
  }
  
  if (!user) {
    const userId = (req.headers['x-user-id'] as string);
    if (userId) {
      user = getUserById(userId);
    }
  }

  (req as any).currentUser = user || getUserById('usr-admin-1');
  (req as any).authenticatedUser = user;
  next();
});

// ZIP Code Lookup Helper with robust NJ & NY tax resolution
const NJ_ZIP_MAP: Record<string, { city: string; state: string; county: string }> = {
  '07087': { city: 'Union City', state: 'NJ', county: 'Hudson' },
  '07047': { city: 'North Bergen', state: 'NJ', county: 'Hudson' },
  '07093': { city: 'West New York', state: 'NJ', county: 'Hudson' },
  '07302': { city: 'Jersey City', state: 'NJ', county: 'Hudson' },
  '07304': { city: 'Jersey City', state: 'NJ', county: 'Hudson' },
  '07306': { city: 'Jersey City', state: 'NJ', county: 'Hudson' },
  '07307': { city: 'Jersey City', state: 'NJ', county: 'Hudson' },
  '07030': { city: 'Hoboken', state: 'NJ', county: 'Hudson' },
  '07020': { city: 'Edgewater', state: 'NJ', county: 'Bergen' },
  '07024': { city: 'Fort Lee', state: 'NJ', county: 'Bergen' },
  '07102': { city: 'Newark', state: 'NJ', county: 'Essex' },
  '07104': { city: 'Newark', state: 'NJ', county: 'Essex' },
  '07105': { city: 'Newark', state: 'NJ', county: 'Essex' },
  '07055': { city: 'Passaic', state: 'NJ', county: 'Passaic' },
  '07501': { city: 'Paterson', state: 'NJ', county: 'Passaic' },
  '07070': { city: 'Rutherford', state: 'NJ', county: 'Bergen' },
  '07071': { city: 'Lyndhurst', state: 'NJ', county: 'Bergen' },
  '07072': { city: 'Carlstadt', state: 'NJ', county: 'Bergen' },
  '07073': { city: 'East Rutherford', state: 'NJ', county: 'Bergen' },
  '07094': { city: 'Secaucus', state: 'NJ', county: 'Hudson' },
  '07032': { city: 'Kearny', state: 'NJ', county: 'Hudson' },
  '07029': { city: 'Harrison', state: 'NJ', county: 'Hudson' },
};

app.get('/api/zip-lookup/:zip', async (req, res) => {
  const rawZip = req.params.zip.trim();
  const zip = rawZip.length === 5 ? rawZip : rawZip.slice(0, 5).padStart(5, '0');
  let city = '';
  let state = '';
  let county = '';

  // 1. Check zippopotam.us API for accurate US city/state
  try {
    const zippoRes = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (zippoRes.ok) {
      const zippoData = (await zippoRes.json()) as any;
      if (zippoData.places && zippoData.places.length > 0) {
        city = zippoData.places[0]['place name'] || '';
        state = zippoData.places[0]['state abbreviation'] || '';
      }
    }
  } catch {
    // Continue with local mapping
  }

  // 2. Check NJ cache
  if (!city && NJ_ZIP_MAP[zip]) {
    const nj = NJ_ZIP_MAP[zip];
    city = nj.city;
    state = nj.state;
    county = nj.county;
  }

  // 3. Check NY database
  const ny = NY_ZIP_TAX_MAP.get(zip);
  if (ny) {
    if (!city) city = ny.city;
    if (!state) state = 'NY';
    county = ny.county;
  }

  // Fallback state inferral
  if (!state) {
    if (zip.startsWith('07') || zip.startsWith('08')) {
      state = 'NJ';
    } else if (zip.startsWith('10') || zip.startsWith('11') || zip.startsWith('12') || zip.startsWith('13') || zip.startsWith('14')) {
      state = 'NY';
    } else {
      state = 'OTHER';
    }
  }

  const tax = resolveTaxRate(state, zip, false);

  return res.json({
    success: true,
    data: {
      city,
      state,
      county,
      taxRate: tax.rate,
      taxRatePercent: tax.ratePercentFormatted,
      jurisdiction: tax.jurisdiction,
    },
  });
});

// Tax Resolver Endpoint
app.get('/api/tax/lookup', (req, res) => {
  const state = req.query.state as string;
  const zip = req.query.zip as string;
  const isTaxExempt = req.query.tax_exempt === 'true';
  const taxInfo = resolveTaxRate(state, zip, isTaxExempt);
  res.json({ success: true, data: taxInfo });
});

app.get('/api/tax/ny-rates', (req, res) => {
  const search = (req.query.search as string || '').toLowerCase().trim();
  if (!search) {
    return res.json({ success: true, data: ALL_NY_TAX_ENTRIES, total: ALL_NY_TAX_ENTRIES.length });
  }
  const filtered = ALL_NY_TAX_ENTRIES.filter(
    e => e.city.toLowerCase().includes(search) || e.zip.includes(search) || e.county.toLowerCase().includes(search)
  );
  res.json({ success: true, data: filtered, total: filtered.length });
});

// Settings Endpoints
app.get('/api/settings', (req, res) => {
  try {
    const settings = getSettings();
    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    if (!checkPermission(currentUser.role, 'manage_settings')) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Admin access required.' });
    }

    const {
      default_tax_rate,
      tax_name,
      cc_surcharge_rate,
      company_name,
      company_address,
      company_city_state_zip,
      company_phone,
      company_email,
      conditions,
    } = req.body;

    const now = new Date().toISOString();
    const update = (key: string, value: string) => {
      run(
        'INSERT INTO settings (key, value, description, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?',
        [key, value, '', now, value, now]
      );
    };

    if (default_tax_rate !== undefined) update('default_tax_rate', String(default_tax_rate));
    if (tax_name !== undefined) update('tax_name', tax_name);
    if (cc_surcharge_rate !== undefined) update('cc_surcharge_rate', String(cc_surcharge_rate));
    if (company_name !== undefined) update('company_name', company_name);
    if (company_address !== undefined) update('company_address', company_address);
    if (company_city_state_zip !== undefined) update('company_city_state_zip', company_city_state_zip);
    if (company_phone !== undefined) update('company_phone', company_phone);
    if (company_email !== undefined) update('company_email', company_email);
    if (conditions !== undefined) update('conditions_json', JSON.stringify(conditions));

    res.json({ success: true, data: getSettings() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Authentication Endpoints
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const result = loginUser(email, password);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = (req.headers['x-auth-token'] as string) || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.body.token);
    if (token) {
      logoutSession(token);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  const user = (req as any).authenticatedUser || (req as any).currentUser;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  res.json({ success: true, data: user });
});

app.get('/api/auth/invite/:token', (req, res) => {
  try {
    const result = verifyInviteToken(req.params.token);
    if (!result.valid) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/setup-password', (req, res) => {
  try {
    const { token, password } = req.body;
    const result = setupPasswordWithInvite(token, password);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Change Password Endpoint (authenticated user)
app.post('/api/auth/change-password', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    const targetUserId = req.body.userId || currentUser?.id;
    const { currentPassword, newPassword } = req.body;

    if (!targetUserId) {
      return res.status(401).json({ success: false, error: 'User must be authenticated to change password.' });
    }

    // If an admin is resetting another user's password directly
    if (currentUser && currentUser.id !== targetUserId && (currentUser.role === 'Admin' || currentUser.role === 'Administrator')) {
      const result = adminResetUserPassword(currentUser.id, targetUserId, newPassword);
      return res.json({ success: true, message: result.message });
    }

    // Standard user changing their own password
    const result = changePassword(targetUserId, currentPassword, newPassword);
    res.json({ success: true, message: result.message });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin Direct Password Reset for Staff Member
app.post('/api/users/:id/reset-password', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    if (!currentUser || (currentUser.role !== 'Admin' && currentUser.role !== 'Administrator')) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Admin role required to reset passwords.' });
    }

    const { newPassword } = req.body;
    const result = adminResetUserPassword(currentUser.id, req.params.id, newPassword);
    res.json({ success: true, message: result.message });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Users Endpoints
app.get('/api/users', (req, res) => {
  try {
    const users = getAllUsers();
    res.json({ success: true, data: users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/users', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    if (!checkPermission(currentUser.role, 'manage_users')) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Admin role required to create users.' });
    }
    const origin = req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const result = createUser(req.body, origin, currentUser.id);
    res.json({
      success: true,
      data: result.user,
      invitation: result.invitation,
      email: result.email,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/users/:id/invitation', (req, res) => {
  try {
    const result = getUserInvitation(req.params.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/users/:id/resend-invite', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    if (!checkPermission(currentUser.role, 'manage_users')) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Admin role required to resend invitations.' });
    }
    const origin = req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const result = resendInvitation(req.params.id, origin, currentUser.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    if (!checkPermission(currentUser.role, 'manage_users')) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Admin role required to delete users.' });
    }
    const result = deleteUser(req.params.id, currentUser.id);
    res.json({ success: true, message: result.message });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Customers Endpoints
app.get('/api/customers', (req, res) => {
  try {
    const term = (req.query.search as string) || '';
    const customers = searchCustomers(term);
    res.json({ success: true, data: customers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/customers/:id', (req, res) => {
  try {
    const customer = getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }
    res.json({ success: true, data: customer });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/customers/check-duplicates', (req, res) => {
  try {
    const { phone, email } = req.body;
    const matches = checkCustomerDuplicates(phone, email);
    res.json({ success: true, data: matches });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    const customer = createCustomer(req.body, currentUser.id);
    res.json({ success: true, data: customer });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    const customer = updateCustomer(req.params.id, req.body, currentUser.id);
    res.json({ success: true, data: customer });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Inventory Endpoints
app.get('/api/inventory', (req, res) => {
  try {
    const search = req.query.search as string;
    const condition = req.query.condition as string;
    const status = req.query.status as string;
    const location = req.query.location as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const result = listInventory({ search, condition, status, location, limit, offset });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/inventory/search', (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    const items = searchAvailableInventory(q);
    res.json({ success: true, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/inventory/:id', (req, res) => {
  try {
    const item = getInventoryItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Inventory item not found.' });
    }
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/inventory', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    if (!checkPermission(currentUser.role, 'manage_inventory')) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify inventory.' });
    }
    const item = createInventoryItem(req.body, currentUser.id);
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/inventory/bulk', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    if (!checkPermission(currentUser.role, 'manage_inventory')) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify inventory.' });
    }
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No inventory items provided.' });
    }
    const result = bulkCreateInventoryItems(items, currentUser.id);
    res.json({
      success: true,
      data: result.created,
      importedCount: result.importedCount,
      errors: result.errors,
      message: `Successfully imported ${result.importedCount} inventory assets.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/inventory/:id', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    if (!checkPermission(currentUser.role, 'manage_inventory')) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify inventory.' });
    }
    const item = updateInventoryItem(req.params.id, req.body, currentUser.id);
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Orders Endpoints
app.post('/api/orders/calculate', (req, res) => {
  try {
    const calculated = calculateOrderTotals(req.body);
    res.json({ success: true, data: calculated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/orders', (req, res) => {
  try {
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const date = (req.query.date as string) || '';
    const startDate = (req.query.startDate as string) || (req.query.start_date as string) || '';
    const endDate = (req.query.endDate as string) || (req.query.end_date as string) || '';
    const salesRepId = (req.query.sales_rep_id as string) || '';
    const leadSource = (req.query.lead_source as string) || '';
    const logistics = (req.query.logistics as string) || '';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    let where: string[] = [];
    let params: any[] = [];

    if (search.trim()) {
      const s = `%${search.trim()}%`;
      where.push(`(
        o.order_number LIKE ? 
        OR c.display_name LIKE ? 
        OR c.phone LIKE ? 
        OR c.email LIKE ?
        OR o.so_number LIKE ?
        OR o.invoice_number LIKE ?
        OR EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND (oi.sku LIKE ? OR oi.serial_number LIKE ? OR oi.item_tag LIKE ?))
      )`);
      params.push(s, s, s, s, s, s, s, s, s);
    }
    if (status && status !== 'ALL') {
      where.push('o.status = ?');
      params.push(status);
    }
    if (startDate) {
      where.push('o.transaction_date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      where.push('o.transaction_date <= ?');
      params.push(endDate);
    }
    if (!startDate && !endDate && date) {
      where.push('o.transaction_date = ?');
      params.push(date);
    }
    if (salesRepId && salesRepId !== 'ALL') {
      where.push('o.sales_rep_id = ?');
      params.push(salesRepId);
    }
    if (leadSource && leadSource !== 'ALL') {
      where.push('o.lead_source = ?');
      params.push(leadSource);
    }
    if (logistics && logistics !== 'ALL') {
      where.push('o.logistics_method = ?');
      params.push(logistics);
    }
    if (req.query.is_fulfilled === 'true' || req.query.fulfilled === '1') {
      where.push('o.is_fulfilled = 1');
    }
    if (req.query.invoices === 'true') {
      where.push('(o.is_fulfilled = 1 OR (o.so_number IS NOT NULL AND o.so_number != \'\'))');
    }
    if (req.query.invoiced === 'true') {
      where.push('(o.invoice_number IS NOT NULL AND o.invoice_number != \'\')');
    } else if (req.query.invoiced === 'false') {
      where.push('(o.invoice_number IS NULL OR o.invoice_number = \'\')');
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const countRow = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM orders o 
       JOIN customers c ON o.customer_id = c.id 
       ${whereSql}`,
      params
    );
    const total = countRow ? countRow.count : 0;

    const orders = queryAll<any>(
      `SELECT o.*, c.display_name as customer_name, c.phone as customer_phone, c.email as customer_email,
              c.first_name as customer_first_name, c.last_name as customer_last_name,
              c.address as customer_address, c.city as customer_city, c.state as customer_state, c.zip as customer_zip,
              u.name as sales_rep_name
       FROM orders o 
       JOIN customers c ON o.customer_id = c.id 
       LEFT JOIN users u ON o.sales_rep_id = u.id 
       ${whereSql} 
       ORDER BY o.created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const placeholders = orderIds.map(() => '?').join(',');
      const allItems = queryAll<any>(
        `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY line_number ASC`,
        orderIds
      );
      const itemsMap: Record<string, any[]> = {};
      for (const item of allItems) {
        if (!itemsMap[item.order_id]) {
          itemsMap[item.order_id] = [];
        }
        itemsMap[item.order_id].push(item);
      }
      for (const order of orders) {
        order.items = itemsMap[order.id] || [];
        if (!order.customer) {
          order.customer = {
            id: order.customer_id,
            display_name: order.customer_name,
            first_name: order.customer_first_name,
            last_name: order.customer_last_name,
            phone: order.customer_phone,
            email: order.customer_email,
            address: order.customer_address,
            city: order.customer_city,
            state: order.customer_state,
            zip: order.customer_zip,
          };
        }
      }
    }

    res.json({ success: true, data: { orders, total } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/orders/search', (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q.trim()) {
      const recent = queryAll<any>(
        `SELECT o.id, o.order_number, o.transaction_date, o.invoice_total, o.amount_paid, o.balance_due, o.status, c.display_name as customer_name, c.phone as customer_phone 
         FROM orders o JOIN customers c ON o.customer_id = c.id 
         ORDER BY o.created_at DESC LIMIT 15`
      );
      return res.json({ success: true, data: recent });
    }
    const s = `%${q.trim()}%`;
    const results = queryAll<any>(
      `SELECT o.id, o.order_number, o.transaction_date, o.invoice_total, o.amount_paid, o.balance_due, o.status, c.display_name as customer_name, c.phone as customer_phone 
       FROM orders o 
        JOIN customers c ON o.customer_id = c.id 
       WHERE o.order_number LIKE ? 
          OR c.display_name LIKE ? 
          OR c.phone LIKE ? 
          OR c.email LIKE ?
          OR o.transaction_date LIKE ?
          OR o.status LIKE ?
       ORDER BY o.created_at DESC LIMIT 25`,
      [s, s, s, s, s, s]
    );
    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/orders/:id', (req, res) => {
  try {
    const order = getOrderById(req.params.id) || getOrderByNumber(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/orders', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    const order = createOrder(req.body, currentUser.id);
    logOrderToGoogleSheet(order.id).catch(() => {});
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/orders/:id', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    const expectedUpdatedAt = req.body.expected_updated_at;
    const order = updateOrder(req.params.id, req.body, expectedUpdatedAt, currentUser.id);
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/orders/:id/fulfill', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    const order = fulfillOrder(req.params.id, req.body, currentUser.id);
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/orders/:id/fulfillment-status', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    const status = req.body.fulfillment_status;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Fulfillment status is required.' });
    }
    const order = updateFulfillmentStatus(req.params.id, status, currentUser.id);
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/orders/:id/invoice', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    const invoiceNumber = req.body.invoice_number ?? req.body.invoiceNumber;
    if (invoiceNumber === undefined || invoiceNumber === null) {
      return res.status(400).json({ success: false, error: 'Invoice number is required.' });
    }
    const order = updateInvoiceNumber(req.params.id, String(invoiceNumber), currentUser.id);
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Invoice Module: Payment Follow-up Reminders to Sales and Support roles
app.get('/api/invoices/outstanding-orders', (req, res) => {
  try {
    const onlyOrderIds = req.query.orderIds
      ? String(req.query.orderIds).split(',').map(s => s.trim()).filter(Boolean)
      : undefined;
    const result = getOutstandingOrdersForReminder(onlyOrderIds);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/invoices/reminder-recipients', (req, res) => {
  try {
    const recipients = getSalesAndSupportRecipients();
    res.json({ success: true, data: recipients });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/invoices/send-payment-reminder', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    const { recipientIds, additionalEmails, orderIds, subject, messageBody, priority, includeOrdersTable, dueDate } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, error: 'Email subject is required.' });
    }
    if (!messageBody || !messageBody.trim()) {
      return res.status(400).json({ success: false, error: 'Email message content is required.' });
    }

    const result = sendPaymentReminders(
      {
        recipientIds: Array.isArray(recipientIds) ? recipientIds : [],
        additionalEmails: Array.isArray(additionalEmails) ? additionalEmails : [],
        orderIds: Array.isArray(orderIds) ? orderIds : [],
        subject: subject.trim(),
        messageBody: messageBody.trim(),
        priority,
        includeOrdersTable: includeOrdersTable !== false,
        dueDate,
      },
      currentUser?.id || 'system'
    );

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/invoices/reminder-history', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
    const history = getPaymentReminderHistory(limit);
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/orders/:id/cancel', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    if (!checkPermission(currentUser.role, 'cancel_order')) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Cancel order permission required.' });
    }
    const order = cancelOrder(req.params.id, req.body.reason, currentUser.id);
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Payments Endpoints
app.post('/api/orders/:id/payments', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    const payment = recordPayment(
      {
        order_id: req.params.id,
        payment_method: req.body.payment_method,
        amount: req.body.amount,
        payment_date: req.body.payment_date,
        reference_number: req.body.reference_number,
        notes: req.body.notes,
      },
      currentUser.id
    );
    const updatedOrder = getOrderById(req.params.id);
    res.json({ success: true, data: { payment, order: updatedOrder } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Document Upload Endpoints
app.post('/api/documents/upload', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    const { document_type, file_name, storage_url, file_size, mime_type, related_entity_type, related_entity_id } = req.body;
    if (!file_name || !storage_url) {
      return res.status(400).json({ success: false, error: 'File name and file content are required.' });
    }
    const doc = saveDocument(
      {
        document_type: document_type || 'Other',
        file_name,
        storage_url,
        file_size,
        mime_type,
        related_entity_type: related_entity_type || 'order',
        related_entity_id: related_entity_id || 'temp',
      },
      currentUser.id
    );
    res.json({ success: true, data: doc });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Dashboard & Reports
app.get('/api/dashboard/metrics', (req, res) => {
  try {
    const metrics = getDashboardMetrics();
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports/sales', (req, res) => {
  try {
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    const report = getSalesReport(startDate, endDate);
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Migration CSV Importer
app.post('/api/migration/import-csv', (req, res) => {
  try {
    const currentUser = (req as any).currentUser;
    if (!checkPermission(currentUser.role, 'manage_settings')) {
      return res.status(403).json({ success: false, error: 'Admin permission required for CSV migration.' });
    }
    const { type, rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No data rows provided.' });
    }
    let importedCount = 0;
    if (type === 'customers') {
      for (const r of rows) {
        if (!r.display_name && (!r.first_name || !r.last_name)) continue;
        const fn = r.first_name || r.display_name.split(' ')[0] || 'Customer';
        const ln = r.last_name || r.display_name.split(' ').slice(1).join(' ') || 'Valued';
        const phone = r.phone || '201-000-0000';
        createCustomer(
          {
            first_name: fn,
            last_name: ln,
            phone: phone,
            email: r.email || '',
            address: r.address || '',
            city: r.city || '',
            state: r.state || 'NJ',
            zip: r.zip || '',
            notes: r.notes || 'Imported via CSV migration',
          },
          currentUser.id
        );
        importedCount++;
      }
    } else if (type === 'inventory') {
      for (const r of rows) {
        if (!r.sku || !r.description) continue;
        createInventoryItem(
          {
            sku: r.sku,
            model_number: r.model_number || '',
            brand: r.brand || '',
            serial_number: r.serial_number || '',
            item_tag: r.item_tag || '',
            description: r.description,
            condition: r.condition || 'A',
            quantity: Number(r.quantity) || 1,
            unit_cost: Number(r.unit_cost) || 0,
            selling_price: Number(r.selling_price) || 0,
            location: r.location || 'Showroom Floor',
            status: r.status || 'Available',
            source: r.source || 'CSV Import',
            notes: r.notes || '',
          },
          currentUser.id
        );
        importedCount++;
      }
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported migration type.' });
    }
    res.json({ success: true, importedCount, message: `Successfully imported ${importedCount} records.` });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Comprehensive Database Backup Endpoint for Google Sheets
app.get('/api/backup/dataset', (req, res) => {
  try {
    // 1. Fetch all Customers
    const customers = queryAll<any>(`
      SELECT c.*,
        (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) as total_orders,
        (SELECT COALESCE(SUM(o.invoice_total), 0) FROM orders o WHERE o.customer_id = c.id) as total_spent
      FROM customers c
      ORDER BY c.created_at DESC
    `);

    // 2. Fetch all Inventory Items
    const inventory = queryAll<any>(`
      SELECT * FROM inventory_items ORDER BY created_at DESC
    `);

    // 3. Fetch all Orders with customer & sales rep info
    const orders = queryAll<any>(`
      SELECT o.*, 
             c.display_name as customer_name, c.phone as customer_phone, c.email as customer_email,
             c.address as customer_address, c.city as customer_city, c.state as customer_state, c.zip as customer_zip,
             u.name as sales_rep_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.sales_rep_id = u.id
      ORDER BY o.created_at DESC
    `);

    // Fetch all items for orders
    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const placeholders = orderIds.map(() => '?').join(',');
      const allItems = queryAll<any>(
        `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY line_number ASC`,
        orderIds
      );
      const itemsMap: Record<string, any[]> = {};
      for (const item of allItems) {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
        itemsMap[item.order_id].push(item);
      }
      for (const order of orders) {
        order.items = itemsMap[order.id] || [];
      }
    }

    // 4. Logistics Dataset (Fulfillment, Deliveries, Pickups)
    const logistics = orders.map(o => ({
      order_id: o.id,
      order_number: o.order_number,
      so_number: o.so_number || 'N/A',
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      customer_email: o.customer_email,
      delivery_address: o.delivery_address || `${o.customer_address || ''}, ${o.customer_city || ''} ${o.customer_state || ''} ${o.customer_zip || ''}`.trim(),
      logistics_method: o.logistics_method || 'Pick Up',
      fulfillment_status: o.fulfillment_status || 'Pending',
      is_fulfilled: Boolean(o.is_fulfilled),
      carrier: o.carrier || 'In-House Delivery',
      tracking_number: o.tracking_number || '',
      delivery_schedule: o.delivery_schedule || '',
      driver_name: o.driver_name || '',
      logistics_notes: o.logistics_notes || '',
      fulfilled_at: o.fulfilled_at || '',
      transaction_date: o.transaction_date,
      created_at: o.created_at,
    }));

    // 5. Invoices Dataset (Billing, Balances, Payment Status)
    const invoices = orders.map(o => ({
      invoice_number: o.invoice_number || `INV-${o.order_number}`,
      order_number: o.order_number,
      so_number: o.so_number || '',
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      customer_email: o.customer_email,
      billing_date: o.transaction_date,
      payment_status: Number(o.balance_due || 0) <= 0.005 ? 'Paid in Full' : (Number(o.amount_paid || 0) > 0 ? 'Partially Paid' : 'Unpaid'),
      payment_method: o.payment_method || 'Cash',
      subtotal: Number(o.subtotal || 0),
      shipping_amount: Number(o.shipping_amount || 0),
      installation_fee: Number(o.installation_fee || 0),
      sales_tax: Number(o.sales_tax || 0),
      credit_card_charge: Number(o.credit_card_charge || 0),
      discount: Number(o.discount || 0),
      credit: Number(o.credit || 0),
      invoice_total: Number(o.invoice_total || 0),
      amount_paid: Number(o.amount_paid || 0),
      balance_due: Number(o.balance_due || 0),
      status: o.status,
      created_at: o.created_at,
    }));

    res.json({
      success: true,
      data: {
        orders,
        logistics,
        invoices,
        customers,
        inventory,
        summary: {
          totalOrders: orders.length,
          totalLogistics: logistics.length,
          totalInvoices: invoices.length,
          totalCustomers: customers.length,
          totalInventory: inventory.length,
          exportedAt: new Date().toISOString(),
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Format order rows for attached Google Sheet format (31 columns)
function formatOrderRowsForSheet(order: any, customer: any, items: any[]): any[][] {
  const round2 = (val: any) => Number(val || 0).toFixed(2);
  const taxStatus = order.tax_exempt ? 'Tax Exempt' : Number(order.sales_tax || 0) > 0 ? 'Taxed' : 'Non-Taxed';
  const formatDt = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const formatD = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  const safeItems = items && items.length > 0 ? items : [null];
  return safeItems.map((item: any, idx: number) => {
    const qty = item ? Number(item.quantity || 1) : 0;
    const unitPrice = item ? Number(item.unit_price || 0) : 0;
    const lineTotal = qty * unitPrice;
    const lineNumber = item ? (item.line_number ?? (idx + 1)) : 1;
    return [
      order.order_number || '',
      formatDt(order.created_at),
      formatD(order.transaction_date),
      customer?.display_name || 'N/A',
      customer?.phone || '',
      customer?.email || '',
      order.sales_rep_name || 'Staff',
      order.lead_source || '',
      order.logistics_method || 'Pick Up',
      order.payment_method || 'Cash',
      order.status || 'Pending',
      order.fulfillment_status || 'Pending',
      round2(order.subtotal),
      round2(order.shipping_amount),
      round2(order.installation_fee),
      round2(order.discount),
      round2(order.credit),
      round2(order.sales_tax),
      round2(order.credit_card_charge),
      round2(order.invoice_total),
      round2(order.amount_paid),
      round2(order.balance_due),
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
    ];
  });
}

async function logOrderToGoogleSheet(orderId: string) {
  try {
    const webhookRow = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['google_sheet_webhook_url']);
    const autoSyncRow = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['google_sheet_auto_sync']);
    if (!webhookRow?.value || autoSyncRow?.value === 'false') return;

    const order = queryOne<any>('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) return;
    const customer = queryOne<any>('SELECT * FROM customers WHERE id = ?', [order.customer_id]);
    const items = queryAll<any>('SELECT * FROM order_items WHERE order_id = ? ORDER BY line_number ASC', [orderId]);
    const rep = order.sales_rep_id ? queryOne<any>('SELECT name FROM users WHERE id = ?', [order.sales_rep_id]) : null;
    order.sales_rep_name = rep ? rep.name : 'Staff';

    const rows = formatOrderRowsForSheet(order, customer, items);
    await fetch(webhookRow.value, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'append', tab: 'Orders', rows }),
    });
  } catch (err) {
    console.warn('Background Google Sheet logging note:', err);
  }
}

app.get('/api/backup/google-sheet-config', (req, res) => {
  try {
    const webhook = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['google_sheet_webhook_url'])?.value || '';
    const sheetUrl = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['google_sheet_url'])?.value || '';
    const autoSync = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['google_sheet_auto_sync'])?.value !== 'false';
    const lastSync = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['google_sheet_last_sync'])?.value || '';
    res.json({
      success: true,
      data: {
        webhookUrl: webhook,
        sheetUrl: sheetUrl,
        autoSync: autoSync,
        lastSync: lastSync,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/backup/google-sheet-config', (req, res) => {
  try {
    const { webhookUrl, sheetUrl, autoSync } = req.body;
    const now = new Date().toISOString();
    const saveSetting = (k: string, v: string) => {
      run(
        'INSERT INTO settings (key, value, description, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?',
        [k, v, '', now, v, now]
      );
    };
    if (webhookUrl !== undefined) saveSetting('google_sheet_webhook_url', String(webhookUrl).trim());
    if (sheetUrl !== undefined) saveSetting('google_sheet_url', String(sheetUrl).trim());
    if (autoSync !== undefined) saveSetting('google_sheet_auto_sync', String(Boolean(autoSync)));

    res.json({
      success: true,
      message: 'Google Sheet configuration saved successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/backup/log-to-sheet', async (req, res) => {
  try {
    const { webhookUrl, action, tab, rows } = req.body;
    const url = webhookUrl || queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['google_sheet_webhook_url'])?.value;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Google Sheet Webhook URL is not configured.' });
    }

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action || 'append', tab: tab || 'Orders', rows: rows || [] }),
    });

    const now = new Date().toISOString();
    run(
      'INSERT INTO settings (key, value, description, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?',
      ['google_sheet_last_sync', now, '', now, now, now]
    );

    res.json({ success: true, message: 'Data logged to Google Sheet successfully.', syncedAt: now });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Start Express server and connect Vite in development
async function startServer() {
  await initDatabase();
  console.log('✅ SQLite database initialized and ready.');

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Casa Central Store Server listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
