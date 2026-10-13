import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { ALL_NY_TAX_ENTRIES } from './data/nyTaxData.ts';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.resolve(DATA_DIR, 'casacentral.sqlite');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export async function initDatabase(): Promise<Database> {
  if (db) return db;
  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } catch (err) {
      console.warn('Failed to load existing database, creating fresh one:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  setupSchema(db);
  seedInitialData(db);
  persistDatabase();
  return db;
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function persistDatabase(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  }
}

export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  const database = getDb();
  const stmt = database.prepare(sql);
  try {
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const results = queryAll<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

let inTransaction = false;

export function run(sql: string, params: any[] = []): { changes: number } {
  const database = getDb();
  const stmt = database.prepare(sql);
  try {
    stmt.run(params);
    const changes = database.getRowsModified();
    if (!inTransaction) {
      persistDatabase();
    }
    return { changes };
  } finally {
    stmt.free();
  }
}

export function runTransaction<T>(callback: () => T): T {
  const database = getDb();
  database.exec('BEGIN TRANSACTION;');
  inTransaction = true;
  try {
    const result = callback();
    database.exec('COMMIT;');
    inTransaction = false;
    persistDatabase();
    return result;
  } catch (error) {
    try {
      database.exec('ROLLBACK;');
    } catch (rbErr) {
      // ignore rollback error if already rolled back
    }
    inTransaction = false;
    throw error;
  }
}

function setupSchema(database: Database) {
  database.exec(`
    -- Sequences table for reliable atomic sequential numbers
    CREATE TABLE IF NOT EXISTS sequences (
      name TEXT PRIMARY KEY,
      current_value INTEGER NOT NULL
    );

    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      password_hash TEXT,
      status TEXT DEFAULT 'active',
      invite_token TEXT,
      invite_expires_at TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- User Invitations Table
    CREATE TABLE IF NOT EXISTS user_invitations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL, -- 'pending', 'accepted', 'expired'
      setup_url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      accepted_at TEXT,
      created_by TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
    CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);

    -- Sent Emails Table (system email dispatch audit log)
    CREATE TABLE IF NOT EXISTS sent_emails (
      id TEXT PRIMARY KEY,
      to_email TEXT NOT NULL,
      to_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT NOT NULL,
      email_type TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Auth Sessions Table
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token);

    -- Customers Table
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      customer_number TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT,
      updated_by TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_customers_number ON customers(customer_number);

    -- Inventory Items Table
    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      model_number TEXT,
      brand TEXT,
      serial_number TEXT,
      item_tag TEXT,
      description TEXT NOT NULL,
      condition TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_cost REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      location TEXT NOT NULL,
      status TEXT NOT NULL,
      source TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_inv_sku ON inventory_items(sku);
    CREATE INDEX IF NOT EXISTS idx_inv_serial ON inventory_items(serial_number);
    CREATE INDEX IF NOT EXISTS idx_inv_tag ON inventory_items(item_tag);
    CREATE INDEX IF NOT EXISTS idx_inv_status ON inventory_items(status);

    -- Orders Table
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      transaction_date TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      lead_source TEXT NOT NULL,
      sales_rep_id TEXT NOT NULL,
      logistics_method TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      shipping_amount REAL NOT NULL DEFAULT 0,
      installation_fee REAL NOT NULL DEFAULT 0,
      sales_tax REAL NOT NULL DEFAULT 0,
      credit_card_charge REAL NOT NULL DEFAULT 0,
      invoice_total REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      credit REAL NOT NULL DEFAULT 0,
      deposit REAL NOT NULL DEFAULT 0,
      amount_paid REAL NOT NULL DEFAULT 0,
      balance_due REAL NOT NULL DEFAULT 0,
      tax_exempt INTEGER NOT NULL DEFAULT 0,
      tax_exemption_document_id TEXT,
      status TEXT NOT NULL,
      notes TEXT,
      internal_notes TEXT,
      
      -- Logistics
      pickup_status TEXT,
      scheduled_pickup_date TEXT,
      pickup_notes TEXT,
      released_by TEXT,
      released_date TEXT,
      delivery_address TEXT,
      delivery_date TEXT,
      delivery_status TEXT,
      driver_name TEXT,
      delivery_notes TEXT,
      proof_of_delivery TEXT,

      -- Fulfillment (Support & Logistics)
      so_number TEXT,
      invoice_number TEXT,
      carrier TEXT,
      tracking_number TEXT,
      delivery_schedule TEXT,
      is_fulfilled INTEGER DEFAULT 0,
      fulfillment_status TEXT DEFAULT 'Pick Up',

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT,
      updated_by TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(transaction_date);

    -- Order Items Table
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      inventory_item_id TEXT,
      sku TEXT NOT NULL,
      serial_number TEXT,
      description TEXT NOT NULL,
      condition TEXT,
      item_tag TEXT,
      location TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL DEFAULT 0,
      line_number INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

    -- Payments Table
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      amount REAL NOT NULL,
      reference_number TEXT,
      notes TEXT,
      received_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );

    CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

    -- Documents Table
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      document_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      storage_url TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      related_entity_type TEXT NOT NULL,
      related_entity_id TEXT NOT NULL,
      uploaded_by TEXT,
      uploaded_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_docs_entity ON documents(related_entity_type, related_entity_id);

    -- Audit Logs Table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      old_values TEXT,
      new_values TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

    -- App Settings Table
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL
    );

    -- NY Tax Rates by ZIP Table
    CREATE TABLE IF NOT EXISTS ny_tax_rates (
      zip TEXT PRIMARY KEY,
      city TEXT NOT NULL,
      county TEXT NOT NULL,
      rate_percent REAL NOT NULL,
      rate_decimal REAL NOT NULL
    );
  `);

  // Safe migrations for orders table
  try {
    database.exec('ALTER TABLE orders ADD COLUMN tax_rate REAL DEFAULT 0.0331259;');
  } catch {}
  try {
    database.exec('ALTER TABLE orders ADD COLUMN tax_jurisdiction TEXT;');
  } catch {}
  try {
    database.exec('ALTER TABLE orders ADD COLUMN so_number TEXT;');
  } catch {}
  try {
    database.exec('ALTER TABLE orders ADD COLUMN carrier TEXT;');
  } catch {}
  try {
    database.exec('ALTER TABLE orders ADD COLUMN tracking_number TEXT;');
  } catch {}
  try {
    database.exec('ALTER TABLE orders ADD COLUMN delivery_schedule TEXT;');
  } catch {}
  try {
    database.exec('ALTER TABLE orders ADD COLUMN is_fulfilled INTEGER DEFAULT 0;');
  } catch {}
  try {
    database.exec('ALTER TABLE orders ADD COLUMN invoice_number TEXT;');
  } catch {}
  try {
    database.exec("ALTER TABLE orders ADD COLUMN fulfillment_status TEXT DEFAULT 'Pick Up';");
  } catch {}
  try {
    database.exec('ALTER TABLE orders ADD COLUMN picked_up_date TEXT;');
  } catch {}
  try {
    database.exec('ALTER TABLE orders ADD COLUMN fulfilled_at TEXT;');
  } catch {}
  try {
    database.exec('ALTER TABLE orders ADD COLUMN invoiced_at TEXT;');
  } catch {}
  try {
    database.exec("UPDATE orders SET fulfillment_status = 'Pick Up' WHERE is_fulfilled = 1 AND (fulfillment_status IS NULL OR fulfillment_status = '' OR fulfillment_status = 'Scheduled');");
  } catch {}
  try {
    database.exec("UPDATE orders SET fulfilled_at = updated_at WHERE is_fulfilled = 1 AND (fulfilled_at IS NULL OR fulfilled_at = '');");
  } catch {}
  try {
    database.exec("UPDATE orders SET picked_up_date = updated_at WHERE fulfillment_status = 'Picked Up' AND (picked_up_date IS NULL OR picked_up_date = '');");
  } catch {}
  try {
    database.exec("UPDATE orders SET invoiced_at = updated_at WHERE invoice_number IS NOT NULL AND invoice_number != '' AND (invoiced_at IS NULL OR invoiced_at = '');");
  } catch {}
  try {
    database.exec("UPDATE inventory_items SET status = 'Available' WHERE status = 'Sold' AND quantity > 0;");
  } catch {}
  try {
    database.exec("UPDATE inventory_items SET status = 'Sold' WHERE quantity <= 0 AND status = 'Available';");
  } catch {}
  try {
    database.exec("ALTER TABLE sent_emails ADD COLUMN from_email TEXT;");
  } catch {}
  try {
    database.exec("ALTER TABLE sent_emails ADD COLUMN from_name TEXT;");
  } catch {}
  try {
    database.exec("ALTER TABLE sent_emails ADD COLUMN preview_url TEXT;");
  } catch {}
  try {
    database.exec("ALTER TABLE sent_emails ADD COLUMN error_message TEXT;");
  } catch {}
}

function seedInitialData(database: Database) {
  // Check sequences
  const seq = queryOne<{ current_value: number }>('SELECT current_value FROM sequences WHERE name = ?', ['order_number']);
  if (!seq) {
    database.run('INSERT INTO sequences (name, current_value) VALUES (?, ?)', ['order_number', 100]);
  }

  const custSeq = queryOne<{ current_value: number }>('SELECT current_value FROM sequences WHERE name = ?', ['customer_number']);
  if (!custSeq) {
    database.run('INSERT INTO sequences (name, current_value) VALUES (?, ?)', ['customer_number', 1000]);
  }

  // Seed Settings
  const defaultSettings = [
    { key: 'default_tax_rate', value: '0.0331259', description: 'NJ Sales Tax Rate (3.31259%)' },
    { key: 'tax_name', value: 'NJ Urban Enterprise / State Sales Tax', description: 'Tax jurisdiction label' },
    { key: 'cc_surcharge_rate', value: '0.03', description: 'Credit Card Surcharge Rate (3.0%)' },
    { key: 'company_name', value: 'Casa Central Store', description: 'Business Store Name' },
    { key: 'company_address', value: '1420 Bergenline Avenue', description: 'Store Street Address' },
    { key: 'company_city_state_zip', value: 'Union City, NJ 07087', description: 'City, State and ZIP' },
    { key: 'company_phone', value: '(201) 867-4200', description: 'Store Customer Service Phone' },
    { key: 'company_email', value: 'info@casacentralstore.com', description: 'Store Email' },
    {
      key: 'conditions_json',
      value: JSON.stringify([
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
      ]),
      description: 'Item condition master list',
    },
  ];

  for (const s of defaultSettings) {
    const existing = queryOne('SELECT key FROM settings WHERE key = ?', [s.key]);
    if (!existing) {
      database.run('INSERT INTO settings (key, value, description, updated_at) VALUES (?, ?, ?, ?)', [
        s.key, s.value, s.description, new Date().toISOString()
      ]);
    } else if (s.key === 'conditions_json') {
      database.run('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?', [
        s.value, new Date().toISOString(), s.key
      ]);
    }
  }

  // Seed NY Tax Rates by ZIP
  const nyTaxCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM ny_tax_rates');
  if (!nyTaxCount || nyTaxCount.count === 0) {
    for (const entry of ALL_NY_TAX_ENTRIES) {
      database.run(
        'INSERT OR REPLACE INTO ny_tax_rates (zip, city, county, rate_percent, rate_decimal) VALUES (?, ?, ?, ?, ?)',
        [entry.zip, entry.city, entry.county, entry.ratePercent, entry.rateDecimal]
      );
    }
  }

  // Run Auth & Users Migration for existing database schemas
  try {
    const cols = queryAll<{ name: string }>('PRAGMA table_info(users)');
    const colNames = new Set(cols.map(c => c.name));
    if (!colNames.has('password_hash')) database.run('ALTER TABLE users ADD COLUMN password_hash TEXT');
    if (!colNames.has('status')) database.run("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'");
    if (!colNames.has('invite_token')) database.run('ALTER TABLE users ADD COLUMN invite_token TEXT');
    if (!colNames.has('invite_expires_at')) database.run('ALTER TABLE users ADD COLUMN invite_expires_at TEXT');
    if (!colNames.has('last_login_at')) database.run('ALTER TABLE users ADD COLUMN last_login_at TEXT');
  } catch (migErr) {
    console.warn('Users migration note:', migErr);
  }

  const defaultSalt = 'casacentral_default_salt';
  const defaultHash = `${defaultSalt}:${crypto.pbkdf2Sync('password123', defaultSalt, 10000, 64, 'sha512').toString('hex')}`;
  const now = new Date().toISOString();

  // Seed default 5-role users if missing
  const defaultStaff = [
    { id: 'usr-admin-1', name: 'Store Administrator', email: 'ecommerce@casacentralstore.com', role: 'Admin' },
    { id: 'usr-mgr-1', name: 'Carlos Rivera', email: 'carlos@casacentralstore.com', role: 'Manager' },
    { id: 'usr-sales-1', name: 'Elena Gomez', email: 'elena@casacentralstore.com', role: 'Sales' },
    { id: 'usr-sales-2', name: 'Marcus Vance', email: 'marcus@casacentralstore.com', role: 'Support' },
    { id: 'usr-acct-1', name: 'Sarah Jenkins', email: 'accounting@casacentralstore.com', role: 'Accounting' },
  ];

  for (const staff of defaultStaff) {
    const existingStaff = queryOne<{ id: string; password_hash?: string; status?: string }>(
      'SELECT id, password_hash, status FROM users WHERE email = ?',
      [staff.email.toLowerCase()]
    );
    if (!existingStaff) {
      database.run(
        'INSERT INTO users (id, name, email, role, active, password_hash, status, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)',
        [staff.id, staff.name, staff.email.toLowerCase(), staff.role, defaultHash, 'active', now, now]
      );
    } else if (!existingStaff.password_hash) {
      database.run(
        'UPDATE users SET password_hash = ?, status = COALESCE(status, "active") WHERE id = ?',
        [defaultHash, existingStaff.id]
      );
    }
  }

  // Ensure all existing active users have status and default password set
  database.run(
    'UPDATE users SET password_hash = ?, status = "active" WHERE (password_hash IS NULL OR password_hash = "") AND active = 1',
    [defaultHash]
  );
}
