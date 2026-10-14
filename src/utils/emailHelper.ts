/**
 * Email Helper Utilities for Casa Central Store
 * Provides:
 * 1. Ready-to-deploy Google Apps Script Webhook snippet (zero SMTP required)
 * 2. 1-click formatted Clipboard Copy (Text & HTML)
 * 3. Mailto / Gmail Web Composer launcher
 */

export const APPS_SCRIPT_SAMPLE_CODE = `/**
 * =========================================================================
 * CASA CENTRAL STORE - ZERO-SMTP GOOGLE APPS SCRIPT EMAIL RELAY
 * =========================================================================
 * 
 * ⚠️ MANDATORY ONE-TIME AUTHORIZATION STEP (DO THIS ONCE IN SCRIPT EDITOR):
 * Google Apps Script security requires you to grant email access once:
 * 
 * 1. Paste this code into https://script.google.com and click Save (Ctrl+S).
 * 2. In the top toolbar, look at the dropdown menu next to "Debug".
 * 3. Select "authorizeScript" from the dropdown.
 * 4. Click the "▶ Run" button.
 * 5. Google will show: "Authorization required":
 *    - Click "Review permissions"
 *    - Choose your Google Account
 *    - Click "Advanced" (small text on the bottom-left)
 *    - Click "Go to Casa Central Relay (unsafe)"
 *    - Click "Allow"
 * 6. You will see "Execution completed" in the execution log below!
 * 
 * DEPLOYING THE WEB APP:
 * 1. In the top right, click "Deploy" > "New deployment"
 * 2. Click the gear icon next to "Select type" and choose "Web app"
 * 3. Set "Execute as": "Me"
 * 4. Set "Who has access": "Anyone"
 * 5. Click "Deploy" and copy your Web App URL (ends in /exec)
 * 6. Paste the URL into Casa Central Store > Settings > Email Delivery!
 * 
 * NOTE: If you already deployed before running authorizeScript, you do NOT
 * need to redeploy! Just run "authorizeScript" once in the editor, and your
 * existing Web App URL will start working immediately.
 * =========================================================================
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: "No payload received" 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var to = (data.to || "").trim();
    if (!to) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: "Recipient email (to) is required" 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var subject = data.subject || "Notice from Casa Central Store";
    var htmlBody = data.html || "";
    var body = data.text || "";
    var fromName = data.fromName || "Casa Central Store";
    var replyTo = (data.replyTo || data.fromEmail || "").trim();

    var mailOptions = {
      name: fromName,
      htmlBody: htmlBody
    };

    if (replyTo && replyTo.indexOf("@") !== -1) {
      mailOptions.replyTo = replyTo;
    }

    // Try MailApp, fallback to GmailApp
    var methodUsed = "MailApp";
    try {
      MailApp.sendEmail(to, subject, body, mailOptions);
    } catch (mailErr) {
      if (typeof GmailApp !== "undefined" && GmailApp.sendEmail) {
        methodUsed = "GmailApp";
        GmailApp.sendEmail(to, subject, body, mailOptions);
      } else {
        throw mailErr;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Email dispatched successfully via Google Apps Script (" + methodUsed + ")",
      recipient: to,
      method: methodUsed,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    var errString = err.toString();
    var isAuthError = errString.indexOf("permission to call MailApp") !== -1 ||
                      errString.indexOf("auth/script.send_mail") !== -1 ||
                      errString.indexOf("auth/gmail.send") !== -1 ||
                      errString.indexOf("You do not have permission") !== -1 ||
                      errString.indexOf("authorization-is") !== -1;

    var errorOutput = isAuthError
      ? "AUTHORIZATION_REQUIRED: In script.google.com, select 'authorizeScript' from the top dropdown, click '▶ Run', and approve permissions ('Allow'). Then test again!"
      : errString;

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      authorized: !isAuthError,
      error: errorOutput
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ONE-TIME AUTHORIZATION TRIGGER:
 * Select this function in the Apps Script top toolbar and click '▶ Run'
 * to grant the required email dispatch permissions!
 */
function authorizeScript() {
  Logger.log("Starting Casa Central Store authorization test...");
  
  // Verify MailApp quota
  var quota = 0;
  try {
    quota = MailApp.getRemainingDailyQuota();
    Logger.log("MailApp quota available: " + quota);
  } catch (e) {
    Logger.log("MailApp check note: " + e.toString());
  }

  // Attempt test verification
  var userEmail = "";
  try {
    userEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  } catch (e) {
    Logger.log("Session note: " + e.toString());
  }

  if (userEmail && userEmail.indexOf("@") !== -1) {
    try {
      MailApp.sendEmail(
        userEmail,
        "Casa Central Store - Email Relay Authorized Successfully",
        "Your Google Apps Script email relay is authorized and ready to dispatch emails for Casa Central Store with zero SMTP!"
      );
      Logger.log("SUCCESS: Test email sent to: " + userEmail);
    } catch (sendErr) {
      Logger.log("Send check completed: " + sendErr.toString());
    }
  } else {
    Logger.log("SUCCESS: Permissions granted! Daily quota: " + quota);
  }

  return "AUTHORIZATION_COMPLETE";
}

function doGet(e) {
  var authorized = false;
  var quota = 0;
  var note = "Ready to dispatch emails";

  try {
    quota = MailApp.getRemainingDailyQuota();
    authorized = true;
  } catch (err) {
    authorized = false;
    note = "AUTHORIZATION_REQUIRED: Open script.google.com, select 'authorizeScript' in the top dropdown, and click '▶ Run' to grant permissions.";
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: authorized ? "ok" : "needs_authorization",
    authorized: authorized,
    quota: quota,
    note: note,
    service: "Casa Central Store Google Apps Script Email Relay",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
`;

export interface CopyEmailOptions {
  to?: string;
  toName?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}

/**
 * Copy formatted email to clipboard (both rich HTML and plain text)
 */
export async function copyEmailToClipboard(options: CopyEmailOptions): Promise<boolean> {
  const { to, toName, subject, bodyText, bodyHtml } = options;

  const header = [
    to ? `To: ${toName ? `${toName} <${to}>` : to}` : '',
    `Subject: ${subject}`,
    `--------------------------------------------------\n`,
  ].filter(Boolean).join('\n');

  const fullPlainText = `${header}${bodyText}`;

  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      const fullHtml = bodyHtml
        ? `<div><p><strong>To:</strong> ${to || ''}</p><p><strong>Subject:</strong> ${subject}</p><hr/>${bodyHtml}</div>`
        : `<div><pre>${fullPlainText}</pre></div>`;

      const textBlob = new Blob([fullPlainText], { type: 'text/plain' });
      const htmlBlob = new Blob([fullHtml], { type: 'text/html' });

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': textBlob,
          'text/html': htmlBlob,
        }),
      ]);
      return true;
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(fullPlainText);
      return true;
    }
  } catch (err) {
    console.warn('ClipboardItem write failed, falling back to writeText:', err);
    try {
      await navigator.clipboard.writeText(fullPlainText);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Copy only the subject line
 */
export async function copySubjectOnly(subject: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(subject);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy only the clean body text
 */
export async function copyBodyOnly(bodyText: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(bodyText);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build mailto: link
 */
export function buildMailtoUrl(options: { to?: string; subject: string; body: string }): string {
  const params: string[] = [];
  if (options.subject) params.push(`subject=${encodeURIComponent(options.subject)}`);
  if (options.body) params.push(`body=${encodeURIComponent(options.body)}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return `mailto:${options.to ? encodeURIComponent(options.to) : ''}${query}`;
}

/**
 * Build direct Gmail Web Composer URL
 */
export function buildGmailComposeUrl(options: { to?: string; subject: string; body: string }): string {
  const params: string[] = ['view=cm', 'fs=1'];
  if (options.to) params.push(`to=${encodeURIComponent(options.to)}`);
  if (options.subject) params.push(`su=${encodeURIComponent(options.subject)}`);
  if (options.body) params.push(`body=${encodeURIComponent(options.body)}`);
  return `https://mail.google.com/mail/?${params.join('&')}`;
}

/**
 * Trigger launch in mail client safely
 */
export function openMailClient(options: { to?: string; subject: string; body: string }) {
  const url = buildMailtoUrl(options);
  window.open(url, '_blank');
}

/**
 * Trigger launch in Gmail web
 */
export function openGmailWeb(options: { to?: string; subject: string; body: string }) {
  const url = buildGmailComposeUrl(options);
  window.open(url, '_blank', 'noopener,noreferrer');
}
