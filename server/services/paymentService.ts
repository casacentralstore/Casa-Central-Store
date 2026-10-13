import { queryAll, queryOne, run, runTransaction } from '../db.ts';
import { Payment } from '../../src/types/index.ts';
import { getOrderById } from './orderService.ts';

export interface RecordPaymentInput {
  order_id: string;
  payment_method: string;
  amount: number;
  payment_date?: string;
  reference_number?: string;
  notes?: string;
}

export function recordPayment(input: RecordPaymentInput, userId: string): Payment {
  return runTransaction(() => {
    const order = getOrderById(input.order_id);
    if (!order) {
      throw new Error('Order not found.');
    }
    if (order.status === 'Cancelled') {
      throw new Error('Cannot add payments to a cancelled order.');
    }
    const amount = Math.round((Number(input.amount) + Number.EPSILON) * 100) / 100;
    if (amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }
    if (amount > order.balance_due + 0.01) {
      throw new Error(`Payment amount ($${amount.toFixed(2)}) exceeds remaining balance ($${order.balance_due.toFixed(2)}).`);
    }

    const id = 'pay-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const today = input.payment_date || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    run(
      `INSERT INTO payments (id, order_id, payment_date, payment_method, amount, reference_number, notes, received_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.order_id,
        today,
        input.payment_method || 'Cash',
        amount,
        input.reference_number || '',
        input.notes || '',
        userId,
        now,
      ]
    );

    // Recalculate total payments for this order
    const paySum = queryOne<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE order_id = ?', [input.order_id]);
    const totalPaid = Math.round(((paySum ? paySum.total : 0) + Number.EPSILON) * 100) / 100;
    const balanceDue = Math.max(0, Math.round((order.invoice_total - totalPaid + Number.EPSILON) * 100) / 100);

    let newStatus = order.status;
    if (balanceDue === 0 && order.invoice_total > 0) {
      newStatus = 'Paid';
    } else if (totalPaid > 0) {
      newStatus = 'Partially Paid';
    }

    run(
      'UPDATE orders SET amount_paid = ?, balance_due = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
      [totalPaid, balanceDue, newStatus, now, userId, input.order_id]
    );

    run(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'aud-' + Date.now(),
        userId,
        'PAYMENT_RECORDED',
        'payment',
        id,
        JSON.stringify({ previous_balance: order.balance_due }),
        JSON.stringify({ amount, new_balance: balanceDue, new_status: newStatus }),
        now,
      ]
    );

    return queryOne<Payment>('SELECT * FROM payments WHERE id = ?', [id])!;
  });
}
