import crypto from 'node:crypto';
import { queryAll, queryOne, run, persistDatabase } from '../db.ts';
import { User, SentEmail, Customer } from '../../src/types/index.ts';
import { sendEmail } from './emailService.ts';

export interface MarketingProductItem {
  id?: string;
  brand: string;
  model_number: string;
  description: string;
  price: number;
  image_url: string;
}

export interface SendMarketingCampaignOptions {
  subject: string;
  headline?: string;
  introMessage?: string;
  products: MarketingProductItem[]; // exactly 5 products
  customerIds?: string[];
  additionalEmails?: string[];
  testOnly?: boolean;
  testEmail?: string;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Fetch all customers who have valid non-empty email addresses
 */
export function getCustomersWithEmail(): Customer[] {
  return queryAll<Customer>(
    `SELECT * FROM customers 
     WHERE email IS NOT NULL AND TRIM(email) != '' AND email LIKE '%@%'
     ORDER BY display_name ASC`
  );
}

/**
 * Build rich HTML email for the 5-product marketing campaign
 */
export function buildMarketingEmailHtml(options: {
  recipientName: string;
  sender: { name: string; email: string; role: string };
  subject: string;
  headline: string;
  introMessage: string;
  products: MarketingProductItem[];
}): { html: string; text: string } {
  const { recipientName, sender, subject, headline, introMessage, products } = options;

  const currentYear = new Date().getFullYear();

  // Generate 5 product cards HTML
  const productCardsHtml = products
    .map((p, idx) => {
      const priceFormatted = formatUsd(Number(p.price) || 0);
      const cleanImg = p.image_url ? p.image_url.trim() : 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80';
      const cleanBrand = (p.brand || 'Premium Brand').toUpperCase();
      const cleanModel = (p.model_number || 'N/A').toUpperCase();
      const cleanDesc = p.description || 'Quality home appliance backed by warranty and white-glove delivery service.';

      return `
        <!-- Product ${idx + 1} -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding: 0;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Product Image -->
                  <td width="200" align="center" valign="middle" style="background-color: #f8fafc; padding: 16px; border-right: 1px solid #f1f5f9; text-align: center;">
                    <img src="${cleanImg}" alt="${cleanBrand} - ${cleanModel}" width="168" style="max-width: 168px; max-height: 160px; object-fit: contain; border-radius: 8px; display: block; margin: 0 auto;" />
                    <div style="margin-top: 10px;">
                      <span style="display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;">
                        FEATURED #${idx + 1}
                      </span>
                    </div>
                  </td>

                  <!-- Product Details -->
                  <td valign="top" style="padding: 20px 24px;">
                    <div style="margin-bottom: 6px;">
                      <span style="display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; color: #d97706; text-transform: uppercase;">
                        ${cleanBrand}
                      </span>
                      <span style="display: inline-block; margin-left: 8px; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 11px; font-weight: 700; background-color: #f1f5f9; color: #334155;">
                        MODEL: ${cleanModel}
                      </span>
                    </div>

                    <h3 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 800; color: #0f172a; line-height: 1.35;">
                      ${cleanBrand} ${cleanModel}
                    </h3>

                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #475569; line-height: 1.55;">
                      ${cleanDesc}
                    </p>

                    <!-- Price & CTA row -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px dashed #e2e8f0; padding-top: 12px; margin-top: 10px;">
                      <tr>
                        <td valign="middle">
                          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Special Offer Price</div>
                          <div style="font-size: 24px; font-weight: 900; color: #059669; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                            ${priceFormatted}
                          </div>
                        </td>
                        <td align="right" valign="middle">
                          <a href="tel:2018674200" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 12px; font-weight: 700; text-decoration: none; padding: 9px 18px; border-radius: 8px; letter-spacing: 0.3px;">
                            Call to Reserve &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="680" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 35px rgba(0,0,0,0.35); max-width: 680px;">
          
          <!-- Brand Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 36px; border-bottom: 4px solid #f59e0b;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; width: 44px; height: 44px; background-color: #f59e0b; border-radius: 12px; text-align: center; line-height: 44px; font-weight: 900; color: #0f172a; font-size: 20px; vertical-align: middle;">CC</div>
                    <div style="display: inline-block; vertical-align: middle; margin-left: 14px;">
                      <div style="color: #ffffff; font-size: 20px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">Casa Central Store</div>
                      <div style="color: #f59e0b; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Exclusive Customer Showcase · New Jersey</div>
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 5px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;">
                      VIP SPECIAL OFFERS
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Banner & Greeting -->
          <tr>
            <td style="background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%); padding: 32px 36px 24px 36px; border-bottom: 1px solid #e2e8f0;">
              <div style="font-size: 13px; font-weight: 700; color: #d97706; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
                Special Selection for You
              </div>
              <h1 style="margin: 0 0 14px 0; font-size: 24px; font-weight: 900; color: #0f172a; line-height: 1.3;">
                ${headline}
              </h1>
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #475569; line-height: 1.65;">
                Dear <strong>${recipientName || 'Valued Customer'}</strong>,
              </p>
              <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.65;">
                ${introMessage.replace(/\n/g, '<br/>')}
              </p>
            </td>
          </tr>

          <!-- Product Showcase Section -->
          <tr>
            <td style="padding: 28px 36px 12px 36px; background-color: #f1f5f9;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px;">
                  Featured 5 Products This Week:
                </div>
                <div style="font-size: 11px; color: #64748b; font-weight: 600;">
                  Limited Quantities Available
                </div>
              </div>

              ${productCardsHtml}
            </td>
          </tr>

          <!-- Store Contact & Personal Rep Box -->
          <tr>
            <td style="padding: 28px 36px; background-color: #ffffff;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px;">
                <tr>
                  <td width="60%" valign="top">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #92400e; margin-bottom: 4px;">
                      Your Dedicated Sales Representative:
                    </div>
                    <div style="font-size: 16px; font-weight: 800; color: #0f172a;">
                      ${sender.name}
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                      ${sender.role} Team · Casa Central Store
                    </div>
                    <div style="font-size: 12px; color: #0284c7; margin-top: 4px; font-weight: 600;">
                      Email: <a href="mailto:${sender.email}" style="color: #0284c7; text-decoration: none;">${sender.email}</a>
                    </div>
                  </td>
                  <td width="40%" align="right" valign="top">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; margin-bottom: 4px;">
                      Store Showroom:
                    </div>
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a;">
                      405 32nd St, Union City, NJ 07087
                    </div>
                    <div style="font-size: 13px; font-weight: 800; color: #059669; margin-top: 4px;">
                      Tel: (201) 867-4200
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 36px; text-align: center; color: #94a3b8; font-size: 11px;">
              <div style="color: #ffffff; font-weight: 700; margin-bottom: 4px; font-size: 12px;">Casa Central Store</div>
              <div>405 32nd St, Union City, NJ 07087 &bull; Home Appliances, Electronics &amp; Living Essentials</div>
              <div style="margin-top: 10px; color: #64748b;">
                You are receiving this communication as a valued registered customer of Casa Central Store.<br/>
                &copy; ${currentYear} Casa Central Store. All rights reserved.
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
  const textProductList = products
    .map(
      (p, i) =>
        `[#${i + 1}] ${p.brand} - Model: ${p.model_number}
Price: ${formatUsd(Number(p.price) || 0)}
Description: ${p.description}
`
    )
    .join('\n');

  const text = `CASA CENTRAL STORE - EXCLUSIVE PRODUCT SHOWCASE
==================================================
${headline}

Dear ${recipientName || 'Valued Customer'},

${introMessage}

OUR 5 FEATURED PRODUCTS:
--------------------------------------------------
${textProductList}

TO ORDER OR INQUIRE:
Call Store: (201) 867-4200
Visit Showroom: 405 32nd St, Union City, NJ 07087

Your Sales Advisor:
${sender.name} (${sender.email})
Casa Central Store
`;

  return { html, text };
}

/**
 * Dispatch marketing campaign to customers
 */
export async function sendMarketingCampaign(
  options: SendMarketingCampaignOptions,
  currentUserId: string
): Promise<{
  success: boolean;
  sentCount: number;
  totalRecipients: number;
  recipients: { name: string; email: string }[];
  sentEmails: SentEmail[];
  previewUrl?: string;
  campaignId: string;
}> {
  // Validate products count: must have 5 products!
  if (!Array.isArray(options.products) || options.products.length !== 5) {
    throw new Error('A marketing campaign requires exactly 5 products. Please provide details for all 5 products.');
  }

  // Validate each product
  options.products.forEach((p, idx) => {
    if (!p.brand || !p.brand.trim()) {
      throw new Error(`Product #${idx + 1} is missing a Brand name.`);
    }
    if (!p.model_number || !p.model_number.trim()) {
      throw new Error(`Product #${idx + 1} is missing a Model Number.`);
    }
    if (!p.description || !p.description.trim()) {
      throw new Error(`Product #${idx + 1} is missing a Description.`);
    }
    if (p.price === undefined || p.price === null || isNaN(Number(p.price)) || Number(p.price) < 0) {
      throw new Error(`Product #${idx + 1} must have a valid non-negative Price.`);
    }
    if (!p.image_url || !p.image_url.trim()) {
      throw new Error(`Product #${idx + 1} is missing an Image URL.`);
    }
  });

  const subject = (options.subject || '').trim();
  if (!subject) {
    throw new Error('Campaign email Subject is required.');
  }

  const headline = options.headline?.trim() || 'Exclusive Weekly Appliance Specials from Casa Central Store';
  const introMessage =
    options.introMessage?.trim() ||
    'We are excited to share our hand-picked selection of top-rated appliances and electronics available this week at special promotional pricing. Contact us or visit our showroom to take advantage of these limited-quantity offers!';

  // The email sender should be the user logged in
  const currentUser = queryOne<User>('SELECT * FROM users WHERE id = ?', [currentUserId]) || {
    id: currentUserId,
    name: 'Store Administrator',
    email: 'ecommerce@casacentralstore.com',
    role: 'Admin',
  };

  const sender = {
    name: currentUser.name || 'Store Administrator',
    email: currentUser.email || 'ecommerce@casacentralstore.com',
    role: currentUser.role || 'Admin',
  };

  // Determine recipients
  let recipients: { id?: string; name: string; email: string }[] = [];

  if (options.testOnly) {
    const targetTest = (options.testEmail || sender.email).trim().toLowerCase();
    recipients = [
      {
        name: sender.name,
        email: targetTest,
      },
    ];
  } else {
    if (options.customerIds && options.customerIds.length > 0) {
      const placeholders = options.customerIds.map(() => '?').join(',');
      const selectedCusts = queryAll<Customer>(
        `SELECT id, display_name, email FROM customers 
         WHERE id IN (${placeholders}) AND email IS NOT NULL AND TRIM(email) != '' AND email LIKE '%@%'`,
        options.customerIds
      );
      recipients = selectedCusts.map(c => ({
        id: c.id,
        name: c.display_name,
        email: c.email.trim(),
      }));
    } else {
      // All customers with valid email
      const allCusts = getCustomersWithEmail();
      recipients = allCusts.map(c => ({
        id: c.id,
        name: c.display_name,
        email: c.email.trim(),
      }));
    }

    // Add additional custom emails if specified
    if (options.additionalEmails && options.additionalEmails.length > 0) {
      for (const email of options.additionalEmails) {
        const clean = email.trim().toLowerCase();
        if (clean && !recipients.some(r => r.email.toLowerCase() === clean)) {
          recipients.push({
            name: clean.split('@')[0],
            email: clean,
          });
        }
      }
    }
  }

  if (recipients.length === 0) {
    throw new Error('No valid customer email recipients found to receive this campaign.');
  }

  const campaignId = `cmp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const sentEmails: SentEmail[] = [];
  const now = new Date().toISOString();
  let lastPreviewUrl: string | undefined = undefined;

  for (const recipient of recipients) {
    const { html, text } = buildMarketingEmailHtml({
      recipientName: recipient.name,
      sender,
      subject,
      headline,
      introMessage,
      products: options.products,
    });

    const emailId = `eml-mkt-${crypto.randomUUID()}`;
    let emailStatus = 'sent';
    let errorMessage: string | null = null;
    let previewUrl: string | undefined = undefined;

    try {
      const result = await sendEmail({
        to: recipient.email,
        toName: recipient.name,
        fromName: sender.name,
        fromEmail: sender.email,
        replyTo: sender.email,
        subject,
        html,
        text,
      });

      if (result.previewUrl) {
        previewUrl = result.previewUrl;
        lastPreviewUrl = result.previewUrl;
      }
    } catch (err: any) {
      console.error(`Failed to dispatch marketing email to ${recipient.email}:`, err);
      emailStatus = 'failed';
      errorMessage = err.message || 'Delivery error';
    }

    run(
      `INSERT INTO sent_emails (id, to_email, to_name, subject, body_html, body_text, email_type, status, from_email, from_name, preview_url, error_message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        emailId,
        recipient.email,
        recipient.name,
        subject,
        html,
        text,
        'marketing_campaign',
        emailStatus,
        sender.email,
        sender.name,
        previewUrl || null,
        errorMessage || null,
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
      email_type: 'marketing_campaign',
      status: emailStatus,
      from_email: sender.email,
      from_name: sender.name,
      preview_url: previewUrl,
      error_message: errorMessage || undefined,
      created_at: now,
    });
  }

  // Record audit log
  try {
    const auditId = `aud-${crypto.randomUUID()}`;
    run(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auditId,
        currentUserId,
        'SEND_MARKETING_CAMPAIGN',
        'customers',
        campaignId,
        null,
        JSON.stringify({
          sender_name: sender.name,
          sender_email: sender.email,
          subject,
          products_count: options.products.length,
          recipients_count: recipients.length,
          test_only: Boolean(options.testOnly),
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
    sentCount: sentEmails.filter(e => e.status === 'sent').length,
    totalRecipients: recipients.length,
    recipients,
    sentEmails,
    previewUrl: lastPreviewUrl,
    campaignId,
  };
}
