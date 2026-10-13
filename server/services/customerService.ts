import { queryAll, queryOne, run, runTransaction } from '../db.ts';
import { Customer } from '../../src/types/index.ts';

export function getNextCustomerNumber(): string {
  let nextVal = 1001;
  const row = queryOne<{ current_value: number }>('SELECT current_value FROM sequences WHERE name = ?', ['customer_number']);
  if (row) {
    nextVal = row.current_value + 1;
  }
  const maxCust = queryOne<{ max_num: string }>('SELECT MAX(customer_number) as max_num FROM customers');
  if (maxCust && maxCust.max_num) {
    const numPart = parseInt(maxCust.max_num.replace(/\D/g, ''), 10);
    if (!isNaN(numPart) && numPart >= nextVal) {
      nextVal = numPart + 1;
    }
  }
  run('UPDATE sequences SET current_value = ? WHERE name = ?', [nextVal, 'customer_number']);
  return `CUST-${String(nextVal).padStart(6, '0')}`;
}

export function searchCustomers(term: string): Customer[] {
  if (!term || term.trim() === '') {
    return queryAll<Customer>('SELECT * FROM customers ORDER BY created_at DESC LIMIT 20');
  }
  const cleanTerm = `%${term.trim()}%`;
  return queryAll<Customer>(
    `SELECT * FROM customers 
     WHERE display_name LIKE ? 
        OR phone LIKE ? 
        OR email LIKE ? 
        OR customer_number LIKE ? 
        OR first_name LIKE ? 
        OR last_name LIKE ?
     ORDER BY display_name ASC 
     LIMIT 25`,
    [cleanTerm, cleanTerm, cleanTerm, cleanTerm, cleanTerm, cleanTerm]
  );
}

export function getCustomerById(id: string): (Customer & { orders: any[] }) | null {
  const customer = queryOne<Customer>('SELECT * FROM customers WHERE id = ?', [id]);
  if (!customer) return null;

  const orders = queryAll(
    'SELECT id, order_number, transaction_date, invoice_total, amount_paid, balance_due, status FROM orders WHERE customer_id = ? ORDER BY transaction_date DESC',
    [id]
  );

  let totalSales = 0;
  let outstanding = 0;
  for (const o of orders) {
    if (o.status !== 'Cancelled') {
      totalSales += Number(o.invoice_total) || 0;
      outstanding += Number(o.balance_due) || 0;
    }
  }

  return {
    ...customer,
    total_orders: orders.length,
    total_sales: Math.round(totalSales * 100) / 100,
    outstanding_balance: Math.round(outstanding * 100) / 100,
    orders,
  };
}

export interface CreateCustomerInput {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
}

export function checkCustomerDuplicates(phone: string, email?: string): Customer[] {
  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
  const results: Customer[] = [];

  if (cleanPhone.length >= 7) {
    const byPhone = queryAll<Customer>(
      `SELECT * FROM customers WHERE REPLACE(REPLACE(REPLACE(phone, '-', ''), ' ', ''), '(', '') LIKE ?`,
      [`%${cleanPhone.slice(-7)}%`]
    );
    results.push(...byPhone);
  }

  if (email && email.trim() !== '') {
    const byEmail = queryAll<Customer>('SELECT * FROM customers WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    for (const c of byEmail) {
      if (!results.some(r => r.id === c.id)) {
        results.push(c);
      }
    }
  }

  return results;
}

export function createCustomer(input: CreateCustomerInput, userId: string): Customer {
  return runTransaction(() => {
    if (!input.first_name?.trim() || !input.last_name?.trim()) {
      throw new Error('First name and last name are required.');
    }
    if (!input.phone?.trim()) {
      throw new Error('Customer phone number is required.');
    }

    const id = 'cust-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const customerNumber = getNextCustomerNumber();
    const displayName = `${input.first_name.trim()} ${input.last_name.trim()}`;
    const now = new Date().toISOString();

    run(
      `INSERT INTO customers (
        id, customer_number, first_name, last_name, display_name, phone, email, address, city, state, zip, notes,
        created_at, updated_at, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        customerNumber,
        input.first_name.trim(),
        input.last_name.trim(),
        displayName,
        input.phone.trim(),
        input.email?.trim() || '',
        input.address?.trim() || '',
        input.city?.trim() || '',
        input.state?.trim() || '',
        input.zip?.trim() || '',
        input.notes?.trim() || '',
        now,
        now,
        userId,
        userId,
      ]
    );

    // Audit log
    run(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['aud-' + Date.now(), userId, 'CUSTOMER_CREATED', 'customer', id, null, JSON.stringify(input), now]
    );

    return queryOne<Customer>('SELECT * FROM customers WHERE id = ?', [id])!;
  });
}

export function updateCustomer(id: string, input: Partial<CreateCustomerInput>, userId: string): Customer {
  return runTransaction(() => {
    const existing = queryOne<Customer>('SELECT * FROM customers WHERE id = ?', [id]);
    if (!existing) {
      throw new Error('Customer not found.');
    }

    const firstName = input.first_name !== undefined ? input.first_name.trim() : existing.first_name;
    const lastName = input.last_name !== undefined ? input.last_name.trim() : existing.last_name;
    const displayName = `${firstName} ${lastName}`;
    const now = new Date().toISOString();

    run(
      `UPDATE customers SET
        first_name = ?,
        last_name = ?,
        display_name = ?,
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        zip = COALESCE(?, zip),
        notes = COALESCE(?, notes),
        updated_at = ?,
        updated_by = ?
       WHERE id = ?`,
      [
        firstName,
        lastName,
        displayName,
        input.phone !== undefined ? input.phone.trim() : null,
        input.email !== undefined ? input.email.trim() : null,
        input.address !== undefined ? input.address.trim() : null,
        input.city !== undefined ? input.city.trim() : null,
        input.state !== undefined ? input.state.trim() : null,
        input.zip !== undefined ? input.zip.trim() : null,
        input.notes !== undefined ? input.notes.trim() : null,
        now,
        userId,
        id,
      ]
    );

    run(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['aud-' + Date.now(), userId, 'CUSTOMER_UPDATED', 'customer', id, JSON.stringify(existing), JSON.stringify(input), now]
    );

    return queryOne<Customer>('SELECT * FROM customers WHERE id = ?', [id])!;
  });
}
