import {
  Customer,
  InventoryItem,
  Order,
  OrderItem,
  Payment,
  TaxSettings,
  User,
  DocumentRecord,
  UserInvitation,
  SentEmail,
  MarketingProduct,
  MarketingCampaignPayload,
  EmailConfigData,
} from '../types/index.ts';

let activeUserId: string = typeof localStorage !== 'undefined' ? localStorage.getItem('casa_user_id') || 'usr-admin-1' : 'usr-admin-1';
let authToken: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('casa_auth_token') : null;

export function setActiveUserId(id: string) {
  activeUserId = id;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('casa_user_id', id);
  }
}

export function getActiveUserId(): string {
  return activeUserId;
}

export function setAuthSession(token: string, userId: string) {
  authToken = token;
  activeUserId = userId;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('casa_auth_token', token);
    localStorage.setItem('casa_user_id', userId);
  }
}

export function clearAuthSession() {
  authToken = null;
  activeUserId = '';
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('casa_auth_token');
    localStorage.removeItem('casa_user_id');
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('x-user-id', activeUserId);
  if (authToken) {
    headers.set('x-auth-token', authToken);
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, { ...options, headers });
  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(result.error || result.message || 'Server request failed');
  }

  return result.data !== undefined ? result.data : result;
}

export const api = {
  // Authentication
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    const res = await request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthSession(res.token, res.user.id);
    return res;
  },

  logout: async (): Promise<void> => {
    try {
      await request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore logout network errors
    } finally {
      clearAuthSession();
    }
  },

  getMe: () => request<User>('/api/auth/me'),

  getInvite: (token: string) =>
    request<{ valid: boolean; user: User; invitation: UserInvitation }>(`/api/auth/invite/${token}`),

  setupPassword: async (token: string, password: string): Promise<{ user: User; token: string }> => {
    const res = await request<{ user: User; token: string }>('/api/auth/setup-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    setAuthSession(res.token, res.user.id);
    return res;
  },

  changePassword: (data: { userId?: string; currentPassword?: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resetUserPassword: (userId: string, newPassword: string) =>
    request<{ success: boolean; message: string }>(`/api/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  // Users
  getUsers: () => request<User[]>('/api/users'),

  createUser: async (data: Partial<User>): Promise<{ user: User; invitation: UserInvitation; email: SentEmail }> => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('x-user-id', activeUserId);
    if (authToken) {
      headers.set('x-auth-token', authToken);
      headers.set('Authorization', `Bearer ${authToken}`);
    }

    const res = await fetch('/api/users', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || result.success === false) {
      throw new Error(result.error || result.message || 'Failed to create user');
    }
    return {
      user: result.data as User,
      invitation: result.invitation as UserInvitation,
      email: result.email as SentEmail,
    };
  },

  getUserInvitation: (userId: string) =>
    request<{ invitation: UserInvitation | null; email: SentEmail | null }>(`/api/users/${userId}/invitation`),

  resendInvite: (userId: string) =>
    request<{ invitation: UserInvitation; email: SentEmail }>(`/api/users/${userId}/resend-invite`, {
      method: 'POST',
    }),

  deleteUser: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/users/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => request<TaxSettings>('/api/settings'),
  updateSettings: (data: Partial<TaxSettings>) =>
    request<TaxSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // ZIP Code & Tax Lookup (using api.zippopotam.us)
  lookupZip: async (zip: string) => {
    const cleanZip = zip.trim();
    if (cleanZip.length !== 5) return null;
    // 1. Primary: zippopotamus API
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${cleanZip}`);
      if (res.ok) {
        const json = await res.json();
        if (json.places && json.places.length > 0) {
          const place = json.places[0];
          return {
            city: place['place name'] || '',
            state: place['state abbreviation'] || '',
            stateName: place['state'] || '',
            zip: cleanZip,
          };
        }
      }
    } catch {
      // Fall through to server lookup
    }
    // 2. Fallback to server database lookup
    try {
      const res = await fetch(`/api/zip-lookup/${cleanZip}`);
      const json = await res.json();
      return json.success ? json.data : null;
    } catch {
      return null;
    }
  },

  lookupTax: (state: string, zip: string, taxExempt?: boolean) =>
    request<any>(
      `/api/tax/lookup?state=${encodeURIComponent(state)}&zip=${encodeURIComponent(zip)}&tax_exempt=${Boolean(taxExempt)}`
    ),

  getNyTaxRates: (search?: string) =>
    request<any>(`/api/tax/ny-rates${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  // Customers
  getCustomers: (search?: string) =>
    request<Customer[]>(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getCustomer: (id: string) => request<Customer & { orders: Order[] }>(`/api/customers/${id}`),
  createCustomer: (data: any) =>
    request<Customer>('/api/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: any) =>
    request<Customer>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  checkCustomerDuplicates: (phone: string, email?: string) =>
    request<Customer[]>('/api/customers/check-duplicates', {
      method: 'POST',
      body: JSON.stringify({ phone, email }),
    }),

  // Inventory
  getInventory: (params?: { search?: string; condition?: string; status?: string; location?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.condition) q.set('condition', params.condition);
    if (params?.status) q.set('status', params.status);
    if (params?.location) q.set('location', params.location);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    return request<{ items: InventoryItem[]; total: number }>(`/api/inventory?${q.toString()}`);
  },
  searchInventory: (q: string) =>
    request<InventoryItem[]>(`/api/inventory/search?q=${encodeURIComponent(q)}`),
  getInventoryItem: (id: string) => request<InventoryItem>(`/api/inventory/${id}`),
  createInventoryItem: (data: any) =>
    request<InventoryItem>('/api/inventory', { method: 'POST', body: JSON.stringify(data) }),
  bulkCreateInventory: (items: any[]) =>
    request<{ importedCount: number; errors: any[]; data: InventoryItem[]; message: string }>('/api/inventory/bulk', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  updateInventoryItem: (id: string, data: any) =>
    request<InventoryItem>(`/api/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Orders
  calculateTotals: (data: any) =>
    request<any>('/api/orders/calculate', { method: 'POST', body: JSON.stringify(data) }),
  getOrders: (params?: { search?: string; status?: string; date?: string; startDate?: string; endDate?: string; sales_rep_id?: string; lead_source?: string; logistics?: string; limit?: number; offset?: number; is_fulfilled?: boolean | string; invoices?: boolean | string; invoiced?: boolean | string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.date) q.set('date', params.date);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.sales_rep_id) q.set('sales_rep_id', params.sales_rep_id);
    if (params?.lead_source) q.set('lead_source', params.lead_source);
    if (params?.logistics) q.set('logistics', params.logistics);
    if (params?.is_fulfilled !== undefined) q.set('is_fulfilled', String(params.is_fulfilled));
    if (params?.invoices !== undefined) q.set('invoices', String(params.invoices));
    if (params?.invoiced !== undefined) q.set('invoiced', String(params.invoiced));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    return request<{ orders: Order[]; total: number }>(`/api/orders?${q.toString()}`);
  },
  searchOrders: (q: string) =>
    request<Order[]>(`/api/orders/search?q=${encodeURIComponent(q)}`),
  getOrder: (id: string) => request<Order>(`/api/orders/${id}`),
  createOrder: (data: any) =>
    request<Order>('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrder: (id: string, data: any) =>
    request<Order>(`/api/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelOrder: (id: string, reason: string) =>
    request<Order>(`/api/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  fulfillOrder: (id: string, data: { so_number: string; carrier: string; tracking_number?: string; delivery_schedule?: string; delivery_address?: string }) =>
    request<Order>(`/api/orders/${id}/fulfill`, { method: 'PUT', body: JSON.stringify(data) }),
  updateFulfillmentStatus: (id: string, fulfillment_status: string) =>
    request<Order>(`/api/orders/${id}/fulfillment-status`, { method: 'PUT', body: JSON.stringify({ fulfillment_status }) }),
  updateInvoiceNumber: (id: string, invoice_number: string) =>
    request<Order>(`/api/orders/${id}/invoice`, { method: 'PUT', body: JSON.stringify({ invoice_number }) }),

  // Invoices Module Reminders
  getOutstandingOrders: (orderIds?: string[]) => {
    const q = orderIds && orderIds.length > 0 ? `?orderIds=${encodeURIComponent(orderIds.join(','))}` : '';
    return request<{ orders: Order[]; summary: { totalOrders: number; pendingCount: number; partiallyPaidCount: number; totalBalanceDue: number; totalInvoiceAmount: number; totalAmountPaid: number } }>(`/api/invoices/outstanding-orders${q}`);
  },
  getReminderRecipients: () =>
    request<{ id: string; name: string; email: string; role: string; active: boolean }[]>('/api/invoices/reminder-recipients'),
  sendPaymentReminder: (data: {
    recipientIds: string[];
    additionalEmails?: string[];
    orderIds: string[];
    subject: string;
    messageBody: string;
    priority?: string;
    includeOrdersTable?: boolean;
    dueDate?: string;
  }) =>
    request<{
      success: boolean;
      sentCount: number;
      recipients: { name: string; email: string; role: string }[];
      sentEmails: SentEmail[];
      summary: any;
    }>('/api/invoices/send-payment-reminder', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getReminderHistory: (limit = 25) =>
    request<SentEmail[]>(`/api/invoices/reminder-history?limit=${limit}`),

  // Payments
  addPayment: (orderId: string, data: any) =>
    request<{ payment: Payment; order: Order }>(`/api/orders/${orderId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Documents
  uploadDocument: (data: { document_type: string; file_name: string; storage_url: string; file_size?: number; mime_type?: string; related_entity_type?: string; related_entity_id?: string }) =>
    request<DocumentRecord>('/api/documents/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Dashboard & Reports
  getDashboardMetrics: () => request<any>('/api/dashboard/metrics'),
  getSalesReport: (startDate?: string, endDate?: string) => {
    const q = new URLSearchParams();
    if (startDate) q.set('start_date', startDate);
    if (endDate) q.set('end_date', endDate);
    return request<any>(`/api/reports/sales?${q.toString()}`);
  },

  // Migration
  importCsv: (type: 'customers' | 'inventory', rows: any[]) =>
    request<{ importedCount: number; message: string }>('/api/migration/import-csv', {
      method: 'POST',
      body: JSON.stringify({ type, rows }),
    }),

  // Backup dataset (Orders, Logistics, Invoices, Customers, Inventory)
  getBackupDataset: () =>
    request<{
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
    }>('/api/backup/dataset'),

  // Google Sheet Zero-Auth Master Logger
  getGoogleSheetConfig: () =>
    request<{
      webhookUrl: string;
      sheetUrl: string;
      autoSync: boolean;
      lastSync: string;
    }>('/api/backup/google-sheet-config'),

  updateGoogleSheetConfig: (data: { webhookUrl?: string; sheetUrl?: string; autoSync?: boolean }) =>
    request<{ success: boolean; message: string }>('/api/backup/google-sheet-config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  logToGoogleSheet: (data: { webhookUrl?: string; action?: string; tab?: string; rows?: any[][] }) =>
    request<{ success: boolean; message: string; syncedAt: string }>('/api/backup/log-to-sheet', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Marketing Campaigns
  getCustomersWithEmail: () =>
    request<Customer[]>('/api/customers-with-email'),

  sendMarketingCampaign: (data: MarketingCampaignPayload) =>
    request<{
      success: boolean;
      sentCount: number;
      totalRecipients: number;
      recipients: { name: string; email: string }[];
      sentEmails: SentEmail[];
      previewUrl?: string;
      campaignId: string;
    }>('/api/customers/send-marketing-campaign', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Email / SMTP Settings
  getEmailConfig: () =>
    request<EmailConfigData>('/api/settings/email-config'),

  updateEmailConfig: (data: Partial<EmailConfigData>) =>
    request<{ success: boolean; message: string }>('/api/settings/email-config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  sendTestEmail: (email?: string) =>
    request<{ success: boolean; data: any }>('/api/settings/test-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};


