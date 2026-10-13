import { queryAll, queryOne } from '../db.ts';

export function getDashboardMetrics() {
  const today = new Date().toISOString().split('T')[0];

  // Today's Sales & Orders
  const todayStats = queryOne<{ count: number; total: number }>(
    `SELECT COUNT(*) as count, COALESCE(SUM(invoice_total), 0) as total 
     FROM orders 
     WHERE transaction_date = ? AND status != 'Cancelled'`,
    [today]
  );

  // Overall Outstanding Balance across active orders
  const outRow = queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(balance_due), 0) as total 
     FROM orders 
     WHERE status NOT IN ('Cancelled', 'Paid')`
  );

  // Status breakdown
  const pendingCount = queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'`
  );
  const partiallyPaidCount = queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM orders WHERE status = 'Partially Paid'`
  );

  // Ready for pickup
  const pickupCount = queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM orders 
     WHERE logistics_method = 'Pick Up' 
       AND status != 'Cancelled' 
       AND (pickup_status IS NULL OR pickup_status != 'Picked Up')`
  );

  // Pending delivery
  const deliveryCount = queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM orders 
     WHERE logistics_method = 'Delivery' 
       AND status != 'Cancelled' 
       AND (delivery_status IS NULL OR delivery_status != 'Delivered')`
  );

  // Total completed & paid
  const totalOrders = queryOne<{ count: number; revenue: number }>(
    `SELECT COUNT(*) as count, COALESCE(SUM(invoice_total), 0) as revenue 
     FROM orders WHERE status != 'Cancelled'`
  );

  // Inventory available count
  const invAvailable = queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM inventory_items WHERE status = 'Available'`
  );

  return {
    today_sales: Math.round(((todayStats?.total || 0) + Number.EPSILON) * 100) / 100,
    today_orders: todayStats?.count || 0,
    outstanding_balance: Math.round(((outRow?.total || 0) + Number.EPSILON) * 100) / 100,
    orders_pending: pendingCount?.count || 0,
    orders_partially_paid: partiallyPaidCount?.count || 0,
    orders_ready_pickup: pickupCount?.count || 0,
    orders_pending_delivery: deliveryCount?.count || 0,
    total_lifetime_orders: totalOrders?.count || 0,
    total_lifetime_revenue: Math.round(((totalOrders?.revenue || 0) + Number.EPSILON) * 100) / 100,
    inventory_available_count: invAvailable?.count || 0,
  };
}

export function getSalesReport(startDate?: string, endDate?: string) {
  let dateFilter = '';
  const params: any[] = [];

  if (startDate && endDate) {
    dateFilter = 'AND transaction_date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  } else if (startDate) {
    dateFilter = 'AND transaction_date >= ?';
    params.push(startDate);
  }

  // Sales by Day
  const salesByDay = queryAll(
    `SELECT transaction_date as date, COUNT(*) as orders_count, 
            SUM(subtotal) as subtotal, SUM(sales_tax) as tax, 
            SUM(invoice_total) as total, SUM(amount_paid) as collected,
            SUM(balance_due) as balance
     FROM orders 
     WHERE status != 'Cancelled' ${dateFilter}
     GROUP BY transaction_date 
     ORDER BY transaction_date DESC 
     LIMIT 30`,
    params
  );

  // Sales by Sales Rep
  const salesByRep = queryAll(
    `SELECT u.name as rep_name, COUNT(o.id) as orders_count, 
            SUM(o.invoice_total) as total_sales, SUM(o.amount_paid) as collected
     FROM orders o
     JOIN users u ON o.sales_rep_id = u.id
     WHERE o.status != 'Cancelled' ${dateFilter}
     GROUP BY u.name 
     ORDER BY total_sales DESC`,
    params
  );

  // Sales by Lead Source
  const salesBySource = queryAll(
    `SELECT lead_source, COUNT(*) as count, SUM(invoice_total) as total
     FROM orders 
     WHERE status != 'Cancelled' ${dateFilter}
     GROUP BY lead_source 
     ORDER BY total DESC`,
    params
  );

  // Sales by Payment Method
  const salesByPaymentMethod = queryAll(
    `SELECT payment_method, COUNT(*) as count, SUM(amount) as total
     FROM payments 
     GROUP BY payment_method 
     ORDER BY total DESC`
  );

  // Condition breakdown from Order Items
  const salesByCondition = queryAll(
    `SELECT condition, COUNT(*) as item_count, SUM(line_total) as total_sales
     FROM order_items 
     GROUP BY condition 
     ORDER BY total_sales DESC`
  );

  // Tax collected
  const taxSummary = queryOne<{ total_tax: number; exempt_orders: number; taxable_orders: number }>(
    `SELECT 
        COALESCE(SUM(sales_tax), 0) as total_tax,
        SUM(CASE WHEN tax_exempt = 1 THEN 1 ELSE 0 END) as exempt_orders,
        SUM(CASE WHEN tax_exempt = 0 THEN 1 ELSE 0 END) as taxable_orders
     FROM orders 
     WHERE status != 'Cancelled' ${dateFilter}`,
    params
  );

  return {
    sales_by_day: salesByDay,
    sales_by_rep: salesByRep,
    sales_by_source: salesBySource,
    sales_by_payment_method: salesByPaymentMethod,
    sales_by_condition: salesByCondition,
    tax_summary: {
      total_tax: Math.round(((taxSummary?.total_tax || 0) + Number.EPSILON) * 100) / 100,
      exempt_orders: taxSummary?.exempt_orders || 0,
      taxable_orders: taxSummary?.taxable_orders || 0,
    },
  };
}
