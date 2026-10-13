import { queryAll, queryOne, run, runTransaction } from '../db.ts';
import { Order, OrderItem, Payment, TaxSettings } from '../../src/types/index.ts';
import { resolveTaxRate, ResolvedTaxInfo } from '../data/nyTaxData.ts';

export function generateRandomOrderNumber(): string {
  // Generate random Order numbers following the format CASA-xxxxxx (e.g. CASA-592814)
  for (let attempt = 0; attempt < 200; attempt++) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
    const candidate = `CASA-${randomDigits}`;
    const existing = queryOne<{ id: string }>('SELECT id FROM orders WHERE order_number = ?', [candidate]);
    if (!existing) {
      return candidate;
    }
  }
  const fallbackDigits = Math.floor(100000 + Math.random() * 900000).toString();
  return `CASA-${fallbackDigits}`;
}

export function getNextOrderNumber(): string {
  return generateRandomOrderNumber();
}

export function getSettings(): TaxSettings {
  const rows = queryAll<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return {
    default_tax_rate: parseFloat(map['default_tax_rate'] || '0.0331259'),
    tax_name: map['tax_name'] || 'NJ Sales Tax',
    cc_surcharge_rate: parseFloat(map['cc_surcharge_rate'] || '0.03'),
    company_name: map['company_name'] || 'Casa Central Store',
    company_address: map['company_address'] || '1420 Bergenline Avenue',
    company_city_state_zip: map['company_city_state_zip'] || 'Union City, NJ 07087',
    company_phone: map['company_phone'] || '(201) 867-4200',
    company_email: map['company_email'] || 'info@casacentralstore.com',
    conditions: map['conditions_json']
      ? JSON.parse(map['conditions_json'])
      : [
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
        ],
  };
}

export interface CalculateOrderTotalsInput {
  items: Array<{ quantity: number; unit_price: number }>;
  shipping_amount?: number;
  installation_fee?: number;
  discount?: number;
  credit?: number;
  tax_exempt?: boolean;
  payment_method?: string;
  state?: string;
  zip?: string;
}

export function calculateOrderTotals(input: CalculateOrderTotalsInput) {
  const settings = getSettings();
  // Safe decimal math rounding to 2 decimals
  const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

  let subtotal = 0;
  for (const item of input.items) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const price = Math.max(0, Number(item.unit_price) || 0);
    subtotal += round2(qty * price);
  }
  subtotal = round2(subtotal);

  const shipping = round2(Math.max(0, Number(input.shipping_amount) || 0));
  const installation = round2(Math.max(0, Number(input.installation_fee) || 0));
  const discount = round2(Math.max(0, Number(input.discount) || 0));
  const credit = round2(Math.max(0, Number(input.credit) || 0));

  // Dynamic Multi-State Sales Tax Calculation:
  // - Tax exempt => 0.00% ($0.00)
  // - NJ => 3.31259%
  // - NY => varies by ZIP Code per reference sheet (8.88%, 8.75%, 8.00%, etc.)
  // - Other US States => 0.00% (No sales tax for now)
  const isTaxExempt = Boolean(input.tax_exempt);
  const taxInfo = resolveTaxRate(input.state, input.zip, isTaxExempt);

  const salesTax = round2(subtotal * taxInfo.rate);
  const preSurchargeTotal = round2(subtotal + shipping + installation + salesTax - discount - credit);

  const isCC = input.payment_method === 'Credit Card';
  const ccSurchargeRate = isCC ? settings.cc_surcharge_rate : 0;
  const ccCharge = isCC ? round2(preSurchargeTotal * ccSurchargeRate) : 0;
  const invoiceTotal = round2(preSurchargeTotal + ccCharge);

  return {
    subtotal,
    shipping_amount: shipping,
    installation_fee: installation,
    tax_rate: taxInfo.rate,
    tax_rate_formatted: taxInfo.ratePercentFormatted,
    tax_jurisdiction: taxInfo.jurisdiction,
    sales_tax: salesTax,
    credit_card_charge: ccCharge,
    invoice_total: Math.max(0, invoiceTotal),
    discount,
    credit,
  };
}

export function getOrderById(id: string): Order | null {
  const order = queryOne<Order>('SELECT * FROM orders WHERE id = ?', [id]);
  if (!order) return null;

  // Joined Customer
  const cust = queryOne<any>('SELECT * FROM customers WHERE id = ?', [order.customer_id]);
  order.customer = cust || undefined;
  if (cust) {
    order.customer_name = cust.display_name || `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || 'N/A';
    order.customer_phone = cust.phone || '';
    order.customer_email = cust.email || '';
  }

  // Sales rep name
  const rep = queryOne<{ name: string }>('SELECT name FROM users WHERE id = ?', [order.sales_rep_id]);
  order.sales_rep_name = rep ? rep.name : 'Unknown';

  // Items
  order.items = queryAll<OrderItem>('SELECT * FROM order_items WHERE order_id = ? ORDER BY line_number ASC', [id]);

  // Payments
  order.payments = queryAll<Payment>('SELECT * FROM payments WHERE order_id = ? ORDER BY payment_date ASC', [id]);

  // Documents
  order.documents = queryAll('SELECT * FROM documents WHERE related_entity_type = ? AND related_entity_id = ?', ['order', id]);

  // Audit logs
  order.audit_logs = queryAll(
    `SELECT a.*, u.name as user_name 
     FROM audit_logs a 
     LEFT JOIN users u ON a.user_id = u.id 
     WHERE a.entity_type = ? AND a.entity_id = ? 
     ORDER BY a.timestamp DESC`,
    ['order', id]
  );

  order.tax_exempt = Boolean(order.tax_exempt);
  order.is_fulfilled = Boolean(order.is_fulfilled);

  return order;
}

export function getOrderByNumber(orderNumber: string): Order | null {
  const order = queryOne<{ id: string }>('SELECT id FROM orders WHERE order_number = ?', [orderNumber]);
  if (!order) return null;
  return getOrderById(order.id);
}

export interface CreateOrderPayload {
  customer_id: string;
  lead_source: string;
  sales_rep_id: string;
  logistics_method: string;
  payment_method: string;
  shipping_amount?: number;
  installation_fee?: number;
  discount?: number;
  credit?: number;
  deposit?: number;
  initial_payment?: number;
  payment_reference?: string;
  tax_exempt?: boolean;
  tax_exemption_document_id?: string | null;
  state?: string;
  zip?: string;
  notes?: string;
  internal_notes?: string;
  delivery_address?: string;
  delivery_date?: string;
  scheduled_pickup_date?: string;
  items: Array<{
    inventory_item_id?: string | null;
    sku: string;
    serial_number?: string;
    description: string;
    condition?: string;
    item_tag?: string;
    location?: string;
    quantity: number;
    unit_price: number;
  }>;
}

export function createOrder(payload: CreateOrderPayload, userId: string): Order {
  return runTransaction(() => {
    // 1. Validation
    if (!payload.customer_id) {
      throw new Error('Customer is required.');
    }
    const customer = queryOne<{ id: string; state: string; zip: string }>('SELECT id, state, zip FROM customers WHERE id = ?', [payload.customer_id]);
    if (!customer) {
      throw new Error('Selected customer does not exist.');
    }
    if (!payload.items || payload.items.length === 0) {
      throw new Error('At least one item is required in the order.');
    }

    // 2. Validate Tax Exemption
    if (payload.tax_exempt && !payload.tax_exemption_document_id) {
      throw new Error('Tax exemption document is required before finalizing a tax-exempt order.');
    }

    // Determine destination state & zip for sales tax
    const effectiveState = payload.state || customer.state || 'NJ';
    const effectiveZip = payload.zip || customer.zip || '07087';

    // 3. Validate unique physical inventory availability
    for (const item of payload.items) {
      if (item.inventory_item_id) {
        const inv = queryOne<{ status: string; serial_number: string; item_tag: string }>(
          'SELECT status, serial_number, item_tag FROM inventory_items WHERE id = ?',
          [item.inventory_item_id]
        );
        if (!inv) {
          throw new Error(`Inventory item "${item.sku}" not found in database.`);
        }
        if (inv.status !== 'Available') {
          throw new Error(
            `Inventory asset "${item.sku}" (Serial: ${inv.serial_number || 'N/A'}, Tag: ${inv.item_tag || 'N/A'}) is not available (Current status: ${inv.status}).`
          );
        }
      } else if (item.serial_number && item.serial_number.trim() !== '') {
        const existingWithSerial = queryOne<{ status: string; id: string }>(
          'SELECT id, status FROM inventory_items WHERE serial_number = ?',
          [item.serial_number.trim()]
        );
        if (existingWithSerial && existingWithSerial.status !== 'Available') {
          throw new Error(`Serial number "${item.serial_number}" already exists and is marked as ${existingWithSerial.status}.`);
        }
      }
    }

    // 4. Server-side totals calculation
    const calculated = calculateOrderTotals({
      items: payload.items,
      shipping_amount: payload.shipping_amount,
      installation_fee: payload.installation_fee,
      discount: payload.discount,
      credit: payload.credit,
      tax_exempt: payload.tax_exempt,
      payment_method: payload.payment_method,
      state: effectiveState,
      zip: effectiveZip,
    });

    const orderId = 'ord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const orderNumber = getNextOrderNumber();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const deposit = Math.max(0, Number(payload.deposit) || 0);
    const initialPayment = Math.max(0, Number(payload.initial_payment) || 0);
    const totalPaid = Math.round((deposit + initialPayment + Number.EPSILON) * 100) / 100;
    const balanceDue = Math.max(0, Math.round((calculated.invoice_total - totalPaid + Number.EPSILON) * 100) / 100);

    let status = 'Pending';
    if (balanceDue === 0 && calculated.invoice_total > 0) {
      status = 'Paid';
    } else if (totalPaid > 0) {
      status = 'Partially Paid';
    }

    // 5. Insert Order
    run(
      `INSERT INTO orders (
        id, order_number, transaction_date, customer_id, lead_source, sales_rep_id, logistics_method, payment_method,
        subtotal, shipping_amount, installation_fee, sales_tax, tax_rate, tax_jurisdiction, credit_card_charge, invoice_total,
        discount, credit, deposit, amount_paid, balance_due, tax_exempt, tax_exemption_document_id,
        status, notes, internal_notes,
        pickup_status, scheduled_pickup_date, delivery_address, delivery_date, delivery_status,
        created_at, updated_at, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        orderNumber,
        today,
        payload.customer_id,
        payload.lead_source || 'Showroom',
        payload.sales_rep_id || userId,
        payload.logistics_method || 'Pick Up',
        payload.payment_method || 'Cash',
        calculated.subtotal,
        calculated.shipping_amount,
        calculated.installation_fee,
        calculated.sales_tax,
        calculated.tax_rate,
        calculated.tax_jurisdiction,
        calculated.credit_card_charge,
        calculated.invoice_total,
        calculated.discount,
        calculated.credit,
        deposit,
        totalPaid,
        balanceDue,
        payload.tax_exempt ? 1 : 0,
        payload.tax_exemption_document_id || null,
        status,
        payload.notes || '',
        payload.internal_notes || '',
        payload.logistics_method === 'Pick Up' ? 'Scheduled' : null,
        payload.scheduled_pickup_date || null,
        payload.delivery_address || null,
        payload.delivery_date || null,
        payload.logistics_method === 'Delivery' ? 'Scheduled' : null,
        now,
        now,
        userId,
        userId,
      ]
    );

    // 6. Insert Order Items & Update Inventory status
    let lineNum = 1;
    for (const item of payload.items) {
      const itemId = 'item-' + Date.now() + '-' + lineNum;
      const qty = Math.max(1, Number(item.quantity) || 1);
      const price = Math.max(0, Number(item.unit_price) || 0);
      const lineTotal = Math.round((qty * price + Number.EPSILON) * 100) / 100;

      run(
        `INSERT INTO order_items (
          id, order_id, inventory_item_id, sku, serial_number, description, condition, item_tag, location,
          quantity, unit_price, line_total, line_number, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          orderId,
          item.inventory_item_id || null,
          item.sku,
          item.serial_number || '',
          item.description,
          item.condition || 'A',
          item.item_tag || '',
          item.location || '',
          qty,
          price,
          lineTotal,
          lineNum++,
          now,
          now,
        ]
      );

      if (item.inventory_item_id) {
        run(
          'UPDATE inventory_items SET status = ?, updated_at = ? WHERE id = ?',
          ['Sold', now, item.inventory_item_id]
        );
      }
    }

    // 7. Record Payments
    if (deposit > 0) {
      run(
        `INSERT INTO payments (id, order_id, payment_date, payment_method, amount, reference_number, notes, received_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'pay-' + Date.now() + '-dep',
          orderId,
          today,
          payload.payment_method || 'Cash',
          deposit,
          payload.payment_reference || 'Deposit',
          'Initial order deposit',
          userId,
          now,
        ]
      );
    }

    if (initialPayment > 0) {
      run(
        `INSERT INTO payments (id, order_id, payment_date, payment_method, amount, reference_number, notes, received_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'pay-' + Date.now() + '-init',
          orderId,
          today,
          payload.payment_method || 'Cash',
          initialPayment,
          payload.payment_reference || '',
          'Point of sale payment',
          userId,
          now,
        ]
      );
    }

    if (payload.tax_exemption_document_id) {
      run(
        'UPDATE documents SET related_entity_type = ?, related_entity_id = ? WHERE id = ?',
        ['order', orderId, payload.tax_exemption_document_id]
      );
    }

    run(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'aud-' + Date.now(),
        userId,
        'ORDER_CREATED',
        'order',
        orderId,
        null,
        JSON.stringify({
          order_number: orderNumber,
          customer_id: payload.customer_id,
          total: calculated.invoice_total,
          items_count: payload.items.length,
          status,
        }),
        now,
      ]
    );

    const savedOrder = getOrderById(orderId);
    if (!savedOrder) {
      throw new Error('Order creation verification failed.');
    }
    return savedOrder;
  });
}

export function updateOrder(id: string, payload: Partial<CreateOrderPayload>, expectedUpdatedAt: string | undefined, userId: string): Order {
  return runTransaction(() => {
    const existing = queryOne<Order>('SELECT * FROM orders WHERE id = ?', [id]);
    if (!existing) {
      throw new Error('Order not found.');
    }
    if (expectedUpdatedAt && existing.updated_at !== expectedUpdatedAt) {
      throw new Error('Another user has modified this order. Please reload before saving.');
    }
    if (existing.status === 'Cancelled') {
      throw new Error('Cancelled orders cannot be modified.');
    }

    const now = new Date().toISOString();

    if (payload.items && payload.items.length > 0) {
      const oldItems = queryAll<OrderItem>('SELECT * FROM order_items WHERE order_id = ?', [id]);
      for (const oldItem of oldItems) {
        if (oldItem.inventory_item_id) {
          const stillThere = payload.items.some(i => i.inventory_item_id === oldItem.inventory_item_id);
          if (!stillThere) {
            run('UPDATE inventory_items SET status = ?, updated_at = ? WHERE id = ?', ['Available', now, oldItem.inventory_item_id]);
          }
        }
      }

      for (const item of payload.items) {
        if (item.inventory_item_id) {
          const inv = queryOne<{ status: string }>('SELECT status FROM inventory_items WHERE id = ?', [item.inventory_item_id]);
          if (inv && inv.status !== 'Available') {
            const wasOurs = oldItems.some(oi => oi.inventory_item_id === item.inventory_item_id);
            if (!wasOurs) {
              throw new Error(`Inventory item ${item.sku} is not available.`);
            }
          }
        }
      }

      const cust = queryOne<{ state: string; zip: string }>('SELECT state, zip FROM customers WHERE id = ?', [payload.customer_id || existing.customer_id]);
      const effectiveState = payload.state || cust?.state || 'NJ';
      const effectiveZip = payload.zip || cust?.zip || '07087';

      const calculated = calculateOrderTotals({
        items: payload.items,
        shipping_amount: payload.shipping_amount ?? existing.shipping_amount,
        installation_fee: payload.installation_fee ?? existing.installation_fee,
        discount: payload.discount ?? existing.discount,
        credit: payload.credit ?? existing.credit,
        tax_exempt: payload.tax_exempt ?? Boolean(existing.tax_exempt),
        payment_method: payload.payment_method ?? existing.payment_method,
        state: effectiveState,
        zip: effectiveZip,
      });

      const paySum = queryOne<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE order_id = ?', [id]);
      const amountPaid = paySum ? paySum.total : 0;
      const balanceDue = Math.max(0, calculated.invoice_total - amountPaid);

      let status = existing.status;
      if (status !== 'Refunded') {
        if (balanceDue === 0 && calculated.invoice_total > 0) {
          status = 'Paid';
        } else if (amountPaid > 0) {
          status = 'Partially Paid';
        } else {
          status = 'Pending';
        }
      }

      run(
        `UPDATE orders SET
          customer_id = COALESCE(?, customer_id),
          lead_source = COALESCE(?, lead_source),
          sales_rep_id = COALESCE(?, sales_rep_id),
          logistics_method = COALESCE(?, logistics_method),
          payment_method = COALESCE(?, payment_method),
          subtotal = ?,
          shipping_amount = ?,
          installation_fee = ?,
          sales_tax = ?,
          tax_rate = ?,
          tax_jurisdiction = ?,
          credit_card_charge = ?,
          invoice_total = ?,
          discount = ?,
          credit = ?,
          amount_paid = ?,
          balance_due = ?,
          tax_exempt = ?,
          tax_exemption_document_id = COALESCE(?, tax_exemption_document_id),
          status = ?,
          notes = COALESCE(?, notes),
          internal_notes = COALESCE(?, internal_notes),
          delivery_address = COALESCE(?, delivery_address),
          delivery_date = COALESCE(?, delivery_date),
          scheduled_pickup_date = COALESCE(?, scheduled_pickup_date),
          updated_at = ?,
          updated_by = ?
        WHERE id = ?`,
        [
          payload.customer_id || null,
          payload.lead_source || null,
          payload.sales_rep_id || null,
          payload.logistics_method || null,
          payload.payment_method || null,
          calculated.subtotal,
          calculated.shipping_amount,
          calculated.installation_fee,
          calculated.sales_tax,
          calculated.tax_rate,
          calculated.tax_jurisdiction,
          calculated.credit_card_charge,
          calculated.invoice_total,
          calculated.discount,
          calculated.credit,
          amountPaid,
          balanceDue,
          payload.tax_exempt ? 1 : 0,
          payload.tax_exemption_document_id || null,
          status,
          payload.notes ?? null,
          payload.internal_notes ?? null,
          payload.delivery_address ?? null,
          payload.delivery_date ?? null,
          payload.scheduled_pickup_date ?? null,
          now,
          userId,
          id,
        ]
      );

      run('DELETE FROM order_items WHERE order_id = ?', [id]);
      let lineNum = 1;
      for (const item of payload.items) {
        const itemId = 'item-' + Date.now() + '-' + lineNum;
        const qty = Math.max(1, Number(item.quantity) || 1);
        const price = Math.max(0, Number(item.unit_price) || 0);
        const lineTotal = Math.round((qty * price + Number.EPSILON) * 100) / 100;

        run(
          `INSERT INTO order_items (
            id, order_id, inventory_item_id, sku, serial_number, description, condition, item_tag, location,
            quantity, unit_price, line_total, line_number, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId,
            id,
            item.inventory_item_id || null,
            item.sku,
            item.serial_number || '',
            item.description,
            item.condition || 'A',
            item.item_tag || '',
            item.location || '',
            qty,
            price,
            lineTotal,
            lineNum++,
            now,
            now,
          ]
        );

        if (item.inventory_item_id) {
          run('UPDATE inventory_items SET status = ?, updated_at = ? WHERE id = ?', ['Sold', now, item.inventory_item_id]);
        }
      }
    } else {
      run(
        `UPDATE orders SET
          notes = COALESCE(?, notes),
          internal_notes = COALESCE(?, internal_notes),
          delivery_address = COALESCE(?, delivery_address),
          delivery_date = COALESCE(?, delivery_date),
          delivery_status = COALESCE(?, delivery_status),
          driver_name = COALESCE(?, driver_name),
          delivery_notes = COALESCE(?, delivery_notes),
          pickup_status = COALESCE(?, pickup_status),
          scheduled_pickup_date = COALESCE(?, scheduled_pickup_date),
          pickup_notes = COALESCE(?, pickup_notes),
          so_number = COALESCE(?, so_number),
          carrier = COALESCE(?, carrier),
          tracking_number = COALESCE(?, tracking_number),
          delivery_schedule = COALESCE(?, delivery_schedule),
          is_fulfilled = COALESCE(?, is_fulfilled),
          fulfillment_status = COALESCE(?, fulfillment_status),
          updated_at = ?,
          updated_by = ?
        WHERE id = ?`,
        [
          payload.notes ?? null,
          payload.internal_notes ?? null,
          payload.delivery_address ?? null,
          payload.delivery_date ?? null,
          (payload as any).delivery_status ?? null,
          (payload as any).driver_name ?? null,
          (payload as any).delivery_notes ?? null,
          (payload as any).pickup_status ?? null,
          payload.scheduled_pickup_date ?? null,
          (payload as any).pickup_notes ?? null,
          (payload as any).so_number ?? null,
          (payload as any).carrier ?? null,
          (payload as any).tracking_number ?? null,
          (payload as any).delivery_schedule ?? null,
          (payload as any).is_fulfilled !== undefined ? ((payload as any).is_fulfilled ? 1 : 0) : null,
          (payload as any).fulfillment_status ?? null,
          now,
          userId,
          id,
        ]
      );
    }

    run(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'aud-' + Date.now(),
        userId,
        'ORDER_UPDATED',
        'order',
        id,
        JSON.stringify({ order_number: existing.order_number, total: existing.invoice_total, status: existing.status }),
        JSON.stringify(payload),
        now,
      ]
    );

    return getOrderById(id)!;
  });
}

export function cancelOrder(id: string, reason: string, userId: string): Order {
  return runTransaction(() => {
    const order = getOrderById(id);
    if (!order) {
      throw new Error('Order not found.');
    }
    if (order.status === 'Cancelled') {
      throw new Error('Order is already cancelled.');
    }

    const now = new Date().toISOString();

    if (order.items) {
      for (const item of order.items) {
        if (item.inventory_item_id) {
          run('UPDATE inventory_items SET status = ?, updated_at = ? WHERE id = ?', ['Available', now, item.inventory_item_id]);
        }
      }
    }

    run(
      `UPDATE orders SET status = 'Cancelled', notes = notes || ?, updated_at = ?, updated_by = ? WHERE id = ?`,
      [`\n[Cancelled: ${reason || 'Customer request'}]`, now, userId, id]
    );

    run(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'aud-' + Date.now(),
        userId,
        'ORDER_CANCELLED',
        'order',
        id,
        JSON.stringify({ previous_status: order.status }),
        JSON.stringify({ reason }),
        now,
      ]
    );

    return getOrderById(id)!;
  });
}

export interface FulfillOrderPayload {
  so_number: string;
  carrier: string;
  tracking_number?: string;
  delivery_schedule?: string;
  delivery_address?: string;
}

export function fulfillOrder(id: string, payload: FulfillOrderPayload, userId: string): Order {
  return runTransaction(() => {
    const existing = queryOne<Order>('SELECT * FROM orders WHERE id = ?', [id]);
    if (!existing) {
      throw new Error('Order not found.');
    }

    const now = new Date().toISOString();
    const updatedStatus = existing.status;
    const initialActionStatus = 'Pick Up';

    run(
      `UPDATE orders SET
        so_number = ?,
        carrier = ?,
        tracking_number = ?,
        delivery_schedule = ?,
        delivery_address = COALESCE(?, delivery_address),
        is_fulfilled = 1,
        fulfillment_status = ?,
        status = ?,
        fulfilled_at = COALESCE(fulfilled_at, ?),
        updated_at = ?,
        updated_by = ?
      WHERE id = ?`,
      [
        payload.so_number || ('SO-' + existing.order_number.replace(/^(ORD-|CASA-)/i, '')),
        payload.carrier,
        payload.tracking_number || '',
        payload.delivery_schedule || '',
        payload.delivery_address ?? null,
        initialActionStatus,
        updatedStatus,
        now,
        now,
        userId,
        id,
      ]
    );

    run(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'aud-' + Date.now(),
        userId,
        'ORDER_FULFILLED',
        'order',
        id,
        JSON.stringify({ so_number: existing.so_number, is_fulfilled: existing.is_fulfilled }),
        JSON.stringify({ ...payload, fulfillment_status: initialActionStatus, is_fulfilled: 1 }),
        now,
      ]
    );

    return getOrderById(id)!;
  });
}

export function updateFulfillmentStatus(id: string, fulfillmentStatus: string, userId: string): Order {
  return runTransaction(() => {
    const existing = queryOne<Order>('SELECT * FROM orders WHERE id = ?', [id]);
    if (!existing) {
      throw new Error('Order not found.');
    }

    const now = new Date().toISOString();
    let newStatus = existing.status;
    if ((fulfillmentStatus === 'Picked Up' || fulfillmentStatus === 'Received') && existing.status !== 'Cancelled') {
      if (existing.balance_due <= 0) {
        newStatus = 'Completed';
      }
    } else if (fulfillmentStatus === 'Pick Up' && existing.status === 'Completed') {
      newStatus = existing.balance_due <= 0 ? 'Paid' : 'Partially Paid';
    }

    const isPickedUp = fulfillmentStatus === 'Picked Up';
    const pickedUpDate = isPickedUp ? (existing.picked_up_date || now) : null;

    run(
      `UPDATE orders SET
        fulfillment_status = ?,
        status = ?,
        picked_up_date = ?,
        updated_at = ?,
        updated_by = ?
      WHERE id = ?`,
      [
        fulfillmentStatus,
        newStatus,
        pickedUpDate,
        now,
        userId,
        id,
      ]
    );

    run(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'aud-' + Date.now(),
        userId,
        'FULFILLMENT_STATUS_UPDATED',
        'order',
        id,
        JSON.stringify({ fulfillment_status: existing.fulfillment_status }),
        JSON.stringify({ fulfillment_status: fulfillmentStatus, status: newStatus }),
        now,
      ]
    );

    return getOrderById(id)!;
  });
}

export function updateInvoiceNumber(id: string, invoiceNumber: string, userId: string): Order {
  return runTransaction(() => {
    const existing = queryOne<Order>('SELECT * FROM orders WHERE id = ?', [id]);
    if (!existing) {
      throw new Error('Order not found.');
    }

    const now = new Date().toISOString();
    const trimmedNumber = invoiceNumber.trim();
    const invoicedAt = trimmedNumber ? (existing.invoiced_at || now) : null;

    run(
      `UPDATE orders SET
        invoice_number = ?,
        invoiced_at = ?,
        updated_at = ?,
        updated_by = ?
      WHERE id = ?`,
      [
        trimmedNumber,
        invoicedAt,
        now,
        userId,
        id,
      ]
    );

    run(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'aud-' + Date.now(),
        userId,
        'INVOICE_NUMBER_UPDATED',
        'order',
        id,
        JSON.stringify({ invoice_number: existing.invoice_number }),
        JSON.stringify({ invoice_number: trimmedNumber }),
        now,
      ]
    );

    return getOrderById(id)!;
  });
}
