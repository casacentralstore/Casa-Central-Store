export type UserRole = 'Admin' | 'Administrator' | 'Manager' | 'Sales' | 'Support' | 'Accounting' | 'Sales Support' | 'Logistics';

export type UserStatus = 'active' | 'invited' | 'disabled';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  status?: UserStatus;
  invite_token?: string | null;
  invite_expires_at?: string | null;
  last_login_at?: string | null;
  has_password?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserInvitation {
  id: string;
  user_id: string;
  email: string;
  token: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired';
  setup_url: string;
  created_at: string;
  accepted_at?: string | null;
  created_by?: string;
  email_preview?: {
    subject: string;
    body_html: string;
    body_text: string;
  };
}

export interface SentEmail {
  id: string;
  to_email: string;
  to_name: string;
  subject: string;
  body_html: string;
  body_text: string;
  email_type: string;
  status: string;
  created_at: string;
  from_email?: string;
  from_name?: string;
  preview_url?: string;
  error_message?: string;
}

export interface Customer {
  id: string;
  customer_number: string;
  first_name: string;
  last_name: string;
  display_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  total_orders?: number;
  total_sales?: number;
  outstanding_balance?: number;
}

export type OrderStatus = 'Pending' | 'Partially Paid' | 'Paid' | 'Completed' | 'Cancelled' | 'Refunded';

export type LeadSource = 
  | 'Showroom'
  | 'Newspaper'
  | 'Facebook'
  | 'Instagram'
  | 'LinkedIn'
  | 'Google'
  | 'Family/Friend'
  | 'Repeat Customer'
  | 'Other';

export type LogisticsMethod = 'Pick Up' | 'Delivery';

export type PaymentMethod = 'Cash' | 'Credit Card' | 'Debit Card' | 'Check' | 'ACH' | 'Other';

export const CONDITION_OPTIONS = [
  'Brand New - Sealed Box',
  'Brand New - Open Box',
  'Brand New - Damage Box',
  'Brand New - No Box',
  'Refurbished - Original Box',
  'Refurbished - White Box',
  'Refurbished - Open Box',
  'Refurbished - Damage Box',
  'Refurbished - No Box',
  'Blue Tag - no S/N',
] as const;

export type ItemCondition = typeof CONDITION_OPTIONS[number];

export const ITEM_TAG_OPTIONS = [
  'None',
  'Blue',
  'Red',
  'Green',
] as const;

export type ItemTag = typeof ITEM_TAG_OPTIONS[number];

export const LOCATION_OPTIONS = [
  'MS Appliances | Showroom',
  'MS Appliances | ITC, Bohemia, NY',
  'MS Appliances | Intercounty, Medford, NY',
  'Golden Opportunity Inc. | Showroom',
  'Golden Opportunity Inc. | Warehouse, Paterson, NJ',
  'HomeSquare',
] as const;

export type ItemLocation = typeof LOCATION_OPTIONS[number];

export const BULK_TEMPLATE_TAGS = [
  'None',
  'Blue',
  'Red',
  'Green',
] as const;

export const BULK_TEMPLATE_CONDITIONS = [
  'Brand New - Sealed Box',
  'Brand New - Open Box',
  'Brand New - Damage Box',
  'Brand New - No Box',
  'Refurbished - Original Box',
  'Refurbished - White Box',
  'Refurbished - Open Box',
  'Refurbished - Damage Box',
  'Refurbished - No Box',
] as const;

export const BULK_TEMPLATE_LOCATIONS = [
  'MS Appliances | Showroom',
  'MS Appliances | ITC, Bohemia, NY',
  'MS Appliances | Intercounty, Medford, NY',
  'Golden Opportunity Inc. | Showroom',
  'Golden Opportunity Inc. | Warehouse, Paterson, NJ',
  'HomeSquare',
] as const;

export type InventoryCondition = ItemCondition | 'A' | 'B' | 'C' | 'Brand New' | 'Refurbished' | 'Scratch & Dent';

export type InventoryStatus = 
  | 'Available'
  | 'Reserved'
  | 'Sold'
  | 'Picked Up'
  | 'Delivered'
  | 'Returned'
  | 'Damaged'
  | 'Hold';

export interface InventoryItem {
  id: string;
  sku: string;
  model_number?: string;
  brand?: string;
  serial_number?: string;
  item_tag?: string;
  description: string;
  condition: string;
  quantity: number;
  unit_cost: number;
  selling_price: number;
  location: string;
  status: InventoryStatus;
  source?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  inventory_item_id?: string | null;
  sku: string;
  serial_number?: string;
  description: string;
  condition?: string;
  item_tag?: string;
  location?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  line_number: number;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  order_id: string;
  payment_date: string;
  payment_method: PaymentMethod;
  amount: number;
  reference_number?: string;
  notes?: string;
  received_by?: string;
  received_by_name?: string;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  document_type: 'Tax Exemption' | 'Invoice' | 'Receipt' | 'Packing Slip' | 'Other';
  file_name: string;
  storage_url: string;
  file_size?: number;
  mime_type?: string;
  related_entity_type: string;
  related_entity_id: string;
  uploaded_by?: string;
  uploaded_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: string | null;
  new_values?: string | null;
  timestamp: string;
}

export interface Order {
  id: string;
  order_number: string;
  transaction_date: string;
  customer_id: string;
  lead_source: LeadSource;
  sales_rep_id: string;
  logistics_method: LogisticsMethod;
  payment_method: PaymentMethod;
  subtotal: number;
  shipping_amount: number;
  installation_fee: number;
  sales_tax: number;
  tax_rate?: number;
  tax_jurisdiction?: string;
  credit_card_charge: number;
  invoice_total: number;
  discount: number;
  credit: number;
  deposit: number;
  amount_paid: number;
  balance_due: number;
  tax_exempt: boolean;
  tax_exemption_document_id?: string | null;
  status: OrderStatus;
  notes: string;
  internal_notes?: string;
  // Fulfillment & Logistics
  so_number?: string;
  invoice_number?: string;
  carrier?: CarrierOption | string;
  tracking_number?: string;
  delivery_schedule?: string;
  is_fulfilled?: boolean | number;
  fulfillment_status?: FulfillmentActionStatus | string;
  picked_up_date?: string;
  fulfilled_at?: string;
  invoiced_at?: string;
  // Logistics fields
  pickup_status?: string;
  scheduled_pickup_date?: string;
  pickup_notes?: string;
  released_by?: string;
  released_date?: string;
  delivery_address?: string;
  delivery_date?: string;
  delivery_status?: string;
  driver_name?: string;
  delivery_notes?: string;
  proof_of_delivery?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  // Joined fields
  customer?: Customer;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  sales_rep_name?: string;
  items?: OrderItem[];
  payments?: Payment[];
  documents?: DocumentRecord[];
  audit_logs?: AuditLog[];
}

export interface TaxSettings {
  default_tax_rate: number; // e.g. 0.0331259 for NJ
  tax_name: string;
  cc_surcharge_rate: number; // e.g. 0.03 for 3%
  company_name: string;
  company_address: string;
  company_city_state_zip: string;
  company_phone: string;
  company_email: string;
  conditions: string[];
}

export const CARRIER_OPTIONS = [
  'ITC',
  'DNS',
  'MJX',
  'UPS',
  'FedEx',
  'NR',
  'JS',
  'Pick Up',
  'Other',
] as const;

export type CarrierOption = typeof CARRIER_OPTIONS[number];

export const FULFILLMENT_ACTION_STATUSES = [
  'Pick Up',
  'Picked Up',
  'Scheduled',
  'En Route',
  'Received',
] as const;

export type FulfillmentActionStatus = typeof FULFILLMENT_ACTION_STATUSES[number];

export interface MarketingProduct {
  id?: string;
  brand: string;
  model_number: string;
  description: string;
  price: number;
  image_url: string;
}

export interface MarketingCampaignPayload {
  subject: string;
  headline?: string;
  introMessage?: string;
  products: MarketingProduct[]; // Exactly 5 products
  customerIds?: string[];
  additionalEmails?: string[];
  testOnly?: boolean;
  testEmail?: string;
}

export type EmailDispatchMode = 'apps_script' | 'manual' | 'smtp';

export interface EmailConfigData {
  mode: EmailDispatchMode;
  appsScriptUrl?: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass?: string;
  defaultFrom: string;
  isConfigured: boolean;
  hasPassword?: boolean;
}

