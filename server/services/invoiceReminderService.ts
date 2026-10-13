import crypto from 'node:crypto';
import { queryAll, queryOne, run, persistDatabase } from '../db.ts';
import { User, SentEmail } from '../../src/types/index.ts';

export interface OutstandingOrderSummary {
  totalOrders: number;
  pendingCount: number;
  partiallyPaidCount: number;
  totalBalanceDue: number;
  totalInvoiceAmount: number;
  totalAmountPaid: number;
}

export interface ReminderRecipient {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export interface SendPaymentReminderPayload {
  recipientIds: string[];
  additionalEmails?: string[];
  orderIds: string[];
  subject: string;
  messageBody: string;
  priority?: 'normal' | 'high' | 'urgent';
  includeOrdersTable?: boolean;
  dueDate?: string;
}

export function formatCurrencyUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Fetch all orders with outstanding balance (Pending and Partially Paid)
 */
export function getOutstandingOrdersForReminder(onlyOrderIds?: string[]): {
  orders: any[];
  summary: OutstandingOrderSummary;
} {
  let whereClauses = [
    "(o.status IN ('Pending', 'Partially Paid') AND o.balance_due > 0)"
  ];
  let params: any[] = [];

  if (onlyOrderIds && onlyOrderIds.length > 0) {
    const placeholders = onlyOrderIds.map(() => '?').join(',');
    whereClauses.push(`o.id IN (${placeholders})`);
    params.push(...onlyOrderIds);
  }

  const sql = `
    SELECT o.*,
           c.display_name as customer_name,
           c.first_name as customer_first_name,
           c.last_name as customer_last_name,
           c.phone as customer_phone,
           c.email as customer_email,
           c.city as customer_city,
           c.state as customer_state,
           u.name as sales_rep_name,
           u.email as sales_rep_email
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.sales_rep_id = u.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY o.balance_due DESC, o.created_at DESC
  `;

  const orders = queryAll<any>(sql, params);

  let totalBalanceDue = 0;
  let totalInvoiceAmount = 0;
  let totalAmountPaid = 0;
  let pendingCount = 0;
  let partiallyPaidCount = 0;

  for (const o of orders) {
    totalBalanceDue += Number(o.balance_due) || 0;
    totalInvoiceAmount += Number(o.invoice_total) || 0;
    totalAmountPaid += Number(o.amount_paid) || 0;
    if (o.status === 'Pending') pendingCount++;
    if (o.status === 'Partially Paid') partiallyPaidCount++;
  }

  // Round values
  totalBalanceDue = Math.round(totalBalanceDue * 100) / 100;
  totalInvoiceAmount = Math.round(totalInvoiceAmount * 100) / 100;
  totalAmountPaid = Math.round(totalAmountPaid * 100) / 100;

  return {
    orders,
    summary: {
      totalOrders: orders.length,
      pendingCount,
      partiallyPaidCount,
      totalBalanceDue,
      totalInvoiceAmount,
      totalAmountPaid,
    },
  };
}

/**
 * Fetch staff with Sales and Support roles eligible for reminders
 */
export function getSalesAndSupportRecipients(): ReminderRecipient[] {
  const sql = `
    SELECT id, name, email, role, active
    FROM users
    WHERE role IN ('Sales', 'Support', 'Sales Support') AND active = 1
    ORDER BY 
      CASE role 
        WHEN 'Sales' THEN 1 
        WHEN 'Support' THEN 2 
        ELSE 3 
      END,
      name ASC
  `;
  return queryAll<ReminderRecipient>(sql);
}

/**
 * Replace template variables with dynamic values
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, String(value));
  }
  return result;
}

/**
 * Build rich HTML & text email for a specific recipient
 */
export function buildPaymentReminderEmail(options: {
  recipient: { name: string; email: string; role: string };
  sender: { name: string; email: string; role: string };
  orders: any[];
  summary: OutstandingOrderSummary;
  subjectTemplate: string;
  messageTemplate: string;
  dueDate?: string;
  priority?: 'normal' | 'high' | 'urgent';
  includeOrdersTable?: boolean;
}): { subject: string; html: string; text: string } {
  const {
    recipient,
    sender,
    orders,
    summary,
    subjectTemplate,
    messageTemplate,
    dueDate = new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    priority = 'high',
    includeOrdersTable = true,
  } = options;

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const variables: Record<string, string | number> = {
    recipient_name: recipient.name,
    recipient_email: recipient.email,
    recipient_role: recipient.role,
    sender_name: sender.name,
    sender_email: sender.email,
    orders_count: summary.totalOrders,
    pending_count: summary.pendingCount,
    partially_paid_count: summary.partiallyPaidCount,
    total_balance: formatCurrencyUsd(summary.totalBalanceDue),
    total_invoice: formatCurrencyUsd(summary.totalInvoiceAmount),
    total_paid: formatCurrencyUsd(summary.totalAmountPaid),
    due_date: dueDate,
    date: currentDateFormatted,
    company_name: 'Casa Central Store',
  };

  const subject = interpolateTemplate(subjectTemplate, variables);
  const personalizedMessage = interpolateTemplate(messageTemplate, variables);

  // Split message into paragraphs for HTML rendering
  const messageParagraphs = personalizedMessage
    .split('\n\n')
    .filter(p => p.trim().length > 0)
    .map(p => `<p style="margin: 0 0 14px 0; color: #334155; font-size: 14px; line-height: 1.65;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  // Priority badge styling
  let priorityBadgeText = 'PAYMENT FOLLOW-UP';
  let priorityBg = '#fef3c7';
  let priorityColor = '#92400e';
  let priorityBorder = '#fde68a';

  if (priority === 'urgent') {
    priorityBadgeText = 'URGENT · IMMEDIATE ACTION REQUIRED';
    priorityBg = '#fee2e2';
    priorityColor = '#991b1b';
    priorityBorder = '#fecaca';
  } else if (priority === 'high') {
    priorityBadgeText = 'HIGH PRIORITY · PAYMENT COLLECTION';
    priorityBg = '#ffedd5';
    priorityColor = '#9a3412';
    priorityBorder = '#fed7aa';
  }

  // Orders Table Rows HTML
  const ordersRowsHtml = orders
    .map((o, idx) => {
      const isPartiallyPaid = o.status === 'Partially Paid';
      const statusBadge = isPartiallyPaid
        ? '<span style="display:inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; text-transform: uppercase;">Partially Paid</span>'
        : '<span style="display:inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; text-transform: uppercase;">Pending</span>';

      const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const soDisplay = o.so_number ? `<span style="font-family: monospace; font-weight: 700; color: #b45309;">${o.so_number}</span>` : '<span style="color: #94a3b8;">—</span>';
      const custPhone = o.customer_phone ? `<div style="font-size: 11px; color: #64748b; font-family: monospace;">${o.customer_phone}</div>` : '';

      return `
        <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-size: 12px; vertical-align: top;">
            <div style="font-family: monospace; font-weight: 700; color: #0f172a;">${o.order_number}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">SO: ${soDisplay}</div>
          </td>
          <td style="padding: 10px 12px; font-size: 12px; vertical-align: top;">
            <div style="font-weight: 600; color: #1e293b;">${o.customer_name || 'Customer'}</div>
            ${custPhone}
          </td>
          <td style="padding: 10px 12px; text-align: center; vertical-align: top;">
            ${statusBadge}
          </td>
          <td style="padding: 10px 12px; text-align: right; font-size: 12px; font-family: monospace; color: #475569; vertical-align: top;">
            ${formatCurrencyUsd(o.invoice_total)}
          </td>
          <td style="padding: 10px 12px; text-align: right; font-size: 12px; font-family: monospace; color: #059669; vertical-align: top;">
            ${formatCurrencyUsd(o.amount_paid)}
          </td>
          <td style="padding: 10px 12px; text-align: right; font-size: 13px; font-family: monospace; font-weight: 800; color: #dc2626; vertical-align: top;">
            ${formatCurrencyUsd(o.balance_due)}
          </td>
        </tr>
      `;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="680" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 36px; border-bottom: 4px solid #f59e0b;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; width: 42px; height: 42px; background-color: #f59e0b; border-radius: 10px; text-align: center; line-height: 42px; font-weight: 900; color: #0f172a; font-size: 19px; vertical-align: middle;">CC</div>
                    <div style="display: inline-block; vertical-align: middle; margin-left: 12px;">
                      <div style="color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Casa Central Store</div>
                      <div style="color: #f59e0b; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Invoices & Accounts Receivable</div>
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; background-color: ${priorityBg}; color: ${priorityColor}; border: 1px solid ${priorityBorder};">
                      ${priorityBadgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary Metric Banner -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 36px; border-bottom: 1px solid #e2e8f0;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="33%" style="padding-right: 12px;">
                    <div style="background-color: #ffffff; border: 1px solid #fee2e2; border-left: 4px solid #ef4444; border-radius: 10px; padding: 12px 14px;">
                      <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #991b1b; letter-spacing: 0.5px;">Total Outstanding</div>
                      <div style="font-size: 20px; font-weight: 900; color: #b91c1c; font-family: monospace; margin-top: 2px;">${formatCurrencyUsd(summary.totalBalanceDue)}</div>
                    </div>
                  </td>
                  <td width="33%" style="padding: 0 6px;">
                    <div style="background-color: #ffffff; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 10px; padding: 12px 14px;">
                      <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #92400e; letter-spacing: 0.5px;">Unpaid Orders</div>
                      <div style="font-size: 20px; font-weight: 900; color: #1e293b; font-family: monospace; margin-top: 2px;">${summary.totalOrders} <span style="font-size: 11px; font-weight: 600; color: #64748b;">(${summary.pendingCount} Pending, ${summary.partiallyPaidCount} Part. Paid)</span></div>
                    </div>
                  </td>
                  <td width="33%" style="padding-left: 12px;">
                    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; border-radius: 10px; padding: 12px 14px;">
                      <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #1e40af; letter-spacing: 0.5px;">Follow-Up Due By</div>
                      <div style="font-size: 15px; font-weight: 800; color: #1e293b; margin-top: 4px;">${dueDate}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding: 32px 36px 20px 36px;">
              <div style="margin-bottom: 24px;">
                <h2 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
                  Action Required: Follow Up Customer Payments
                </h2>
                <div style="font-size: 12px; color: #64748b;">
                  Assigned to: <strong style="color: #0f172a;">${recipient.name}</strong> (${recipient.role} Team) · Dispatched by: ${sender.name}
                </div>
              </div>

              <!-- Customized Content -->
              <div style="background-color: #ffffff; margin-bottom: 24px;">
                ${messageParagraphs}
              </div>

              ${includeOrdersTable ? `
              <!-- Orders Table Section -->
              <div style="margin-top: 28px; margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <h3 style="margin: 0; font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                    Outstanding Orders List (${summary.totalOrders})
                  </h3>
                  <span style="font-size: 11px; color: #64748b;">
                    Total Due: <strong style="color: #dc2626; font-family: monospace;">${formatCurrencyUsd(summary.totalBalanceDue)}</strong>
                  </span>
                </div>

                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; font-weight: 800;">
                      <th style="padding: 10px 12px;">Order / SO #</th>
                      <th style="padding: 10px 12px;">Customer</th>
                      <th style="padding: 10px 12px; text-align: center;">Status</th>
                      <th style="padding: 10px 12px; text-align: right;">Total</th>
                      <th style="padding: 10px 12px; text-align: right;">Paid</th>
                      <th style="padding: 10px 12px; text-align: right;">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${ordersRowsHtml}
                  </tbody>
                  <tfoot>
                    <tr style="background-color: #f8fafc; border-top: 2px solid #cbd5e1; font-weight: 800; font-size: 12px;">
                      <td colspan="3" style="padding: 10px 12px; text-align: right; color: #334155;">
                        Grand Total Outstanding:
                      </td>
                      <td style="padding: 10px 12px; text-align: right; font-family: monospace; color: #475569;">
                        ${formatCurrencyUsd(summary.totalInvoiceAmount)}
                      </td>
                      <td style="padding: 10px 12px; text-align: right; font-family: monospace; color: #059669;">
                        ${formatCurrencyUsd(summary.totalAmountPaid)}
                      </td>
                      <td style="padding: 10px 12px; text-align: right; font-family: monospace; color: #dc2626; font-size: 14px;">
                        ${formatCurrencyUsd(summary.totalBalanceDue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              ` : ''}

              <!-- Recommended Action Steps -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px;">
                <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #92400e; margin-bottom: 8px;">
                  Action Checklist for Sales & Support Team:
                </div>
                <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.6;">
                  <li>Contact the customer using the provided phone numbers or email addresses.</li>
                  <li>Inquire about the outstanding payment balance and assist with immediate settlement.</li>
                  <li>Once payment is collected (Cash, Card, Check, ACH), record it in the POS under the respective Order.</li>
                  <li>Confirm fulfillment and delivery schedule with the logistics team if needed.</li>
                </ol>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 36px; text-align: center; color: #94a3b8; font-size: 11px;">
              <div style="color: #ffffff; font-weight: 700; margin-bottom: 4px; font-size: 12px;">Casa Central Store</div>
              <div>405 32nd St, Union City, NJ 07087 · Accounts Receivable & Customer Care</div>
              <div style="margin-top: 8px; color: #64748b;">
                Generated automatically by Casa Central POS & Operations · ${currentDateFormatted}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Text version
  const textOrdersList = orders
    .map(
      o =>
        `- Order #${o.order_number} (SO: ${o.so_number || 'N/A'}): ${o.customer_name} | Status: ${o.status} | Total: ${formatCurrencyUsd(o.invoice_total)} | Paid: ${formatCurrencyUsd(o.amount_paid)} | Balance Due: ${formatCurrencyUsd(o.balance_due)}`
    )
    .join('\n');

  const text = `CASA CENTRAL STORE - PAYMENT FOLLOW-UP REMINDER
------------------------------------------------------------
Priority: ${priority.toUpperCase()}
Target Follow-up Due Date: ${dueDate}
Assigned to: ${recipient.name} (${recipient.role})
Sender: ${sender.name} (${sender.email})
Date: ${currentDateFormatted}

SUMMARY:
- Total Orders with Balance: ${summary.totalOrders} (${summary.pendingCount} Pending, ${summary.partiallyPaidCount} Partially Paid)
- Total Balance Due: ${formatCurrencyUsd(summary.totalBalanceDue)}
- Total Invoiced: ${formatCurrencyUsd(summary.totalInvoiceAmount)}

MESSAGE:
${personalizedMessage}

OUTSTANDING ORDERS:
${textOrdersList}

ACTION STEPS:
1. Contact customer to arrange balance settlement.
2. Accept payment via Credit Card, Check, Cash, or ACH.
3. Record payment directly in POS to update the order ledger.

Casa Central Store
405 32nd St, Union City, NJ 07087
`;

  return { subject, html, text };
}

/**
 * Send payment reminders to selected Sales and Support staff
 */
export function sendPaymentReminders(
  payload: SendPaymentReminderPayload,
  currentUserId: string
): {
  success: boolean;
  sentCount: number;
  recipients: { name: string; email: string; role: string }[];
  sentEmails: SentEmail[];
  summary: OutstandingOrderSummary;
} {
  const currentUser = queryOne<User>('SELECT * FROM users WHERE id = ?', [currentUserId]) || {
    id: currentUserId,
    name: 'Accounting / Operations',
    email: 'accounting@casacentralstore.com',
    role: 'Accounting',
  };

  const sender = {
    name: currentUser.name || 'Store Administrator',
    email: currentUser.email || 'accounting@casacentralstore.com',
    role: currentUser.role || 'Accounting',
  };

  // Get orders
  const { orders, summary } = getOutstandingOrdersForReminder(
    payload.orderIds && payload.orderIds.length > 0 ? payload.orderIds : undefined
  );

  if (orders.length === 0) {
    throw new Error('No orders with outstanding balances found to send reminders for.');
  }

  // Get recipient users
  let recipients: { id?: string; name: string; email: string; role: string }[] = [];

  if (payload.recipientIds && payload.recipientIds.length > 0) {
    const placeholders = payload.recipientIds.map(() => '?').join(',');
    const staff = queryAll<User>(
      `SELECT id, name, email, role FROM users WHERE id IN (${placeholders}) AND active = 1`,
      payload.recipientIds
    );
    recipients = staff.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }));
  } else {
    // Default to all active Sales and Support staff
    recipients = getSalesAndSupportRecipients();
  }

  // Add additional emails if specified
  if (payload.additionalEmails && payload.additionalEmails.length > 0) {
    for (const email of payload.additionalEmails) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail && !recipients.some(r => r.email.toLowerCase() === cleanEmail)) {
        recipients.push({
          name: cleanEmail.split('@')[0],
          email: cleanEmail,
          role: 'Sales Support',
        });
      }
    }
  }

  if (recipients.length === 0) {
    throw new Error('No Sales or Support recipients selected.');
  }

  const sentEmails: SentEmail[] = [];
  const now = new Date().toISOString();

  for (const recipient of recipients) {
    const { subject, html, text } = buildPaymentReminderEmail({
      recipient,
      sender,
      orders,
      summary,
      subjectTemplate: payload.subject,
      messageTemplate: payload.messageBody,
      dueDate: payload.dueDate,
      priority: payload.priority,
      includeOrdersTable: payload.includeOrdersTable !== false,
    });

    const emailId = `eml-remind-${crypto.randomUUID()}`;

    run(
      `INSERT INTO sent_emails (id, to_email, to_name, subject, body_html, body_text, email_type, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        emailId,
        recipient.email,
        recipient.name,
        subject,
        html,
        text,
        'payment_reminder',
        'sent',
        now,
      ]
    );

    sentEmails.push({
      id: emailId,
      to_email: recipient.email,
      to_name: recipient.name,
      subject,
      body_html: html,
      body_text: text,
      email_type: 'payment_reminder',
      status: 'sent',
      created_at: now,
    });
  }

  // Log audit entry
  try {
    const auditId = `aud-${crypto.randomUUID()}`;
    run(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auditId,
        currentUserId,
        'SEND_PAYMENT_REMINDERS',
        'invoices',
        'payment_reminders',
        null,
        JSON.stringify({
          recipient_count: recipients.length,
          orders_count: orders.length,
          total_balance_due: summary.totalBalanceDue,
          recipients: recipients.map(r => r.email),
        }),
        now,
      ]
    );
  } catch (auditErr) {
    console.warn('Audit log warning:', auditErr);
  }

  persistDatabase();

  return {
    success: true,
    sentCount: sentEmails.length,
    recipients,
    sentEmails,
    summary,
  };
}

/**
 * Fetch reminder dispatch history
 */
export function getPaymentReminderHistory(limit = 25): SentEmail[] {
  return queryAll<SentEmail>(
    `SELECT * FROM sent_emails WHERE email_type = 'payment_reminder' ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
}
