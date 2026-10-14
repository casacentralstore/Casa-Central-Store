import nodemailer, { type Transporter, type TestAccount, type SendMailOptions } from 'nodemailer';
import { queryOne, run, persistDatabase } from '../db.ts';

export type EmailDispatchMode = 'apps_script' | 'manual' | 'smtp';

export interface EmailConfig {
  mode: EmailDispatchMode;
  appsScriptUrl: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  defaultFrom: string;
  isConfigured: boolean;
}

export function getEmailConfig(): EmailConfig {
  const modeSetting = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['email_mode']);
  const appsScriptSetting = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['apps_script_url']);
  const hostSetting = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['smtp_host']);
  const portSetting = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['smtp_port']);
  const secureSetting = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['smtp_secure']);
  const userSetting = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['smtp_user']);
  const passSetting = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['smtp_pass']);
  const fromSetting = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['smtp_from']);

  const appsScriptUrl = (appsScriptSetting?.value || process.env.APPS_SCRIPT_URL || '').trim();
  const host = (hostSetting?.value || process.env.SMTP_HOST || '').trim();
  const port = portSetting?.value
    ? parseInt(portSetting.value, 10)
    : process.env.SMTP_PORT
    ? parseInt(process.env.SMTP_PORT, 10)
    : 587;
  const secure = secureSetting?.value
    ? secureSetting.value === 'true'
    : process.env.SMTP_SECURE === 'true' || port === 465;
  const user = (userSetting?.value || process.env.SMTP_USER || '').trim();
  const pass = (passSetting?.value || process.env.SMTP_PASS || '').trim();
  const defaultFrom =
    (fromSetting?.value || process.env.SMTP_FROM || 'Casa Central Store <ecommerce@casacentralstore.com>').trim();

  // Determine mode
  let mode: EmailDispatchMode = 'apps_script';
  if (modeSetting?.value) {
    mode = modeSetting.value as EmailDispatchMode;
  } else if (appsScriptUrl) {
    mode = 'apps_script';
  } else if (host && user) {
    mode = 'smtp';
  } else {
    mode = 'apps_script';
  }

  const isConfigured =
    mode === 'apps_script'
      ? Boolean(appsScriptUrl)
      : mode === 'manual'
      ? true
      : Boolean(host && user);

  return {
    mode,
    appsScriptUrl,
    host,
    port,
    secure,
    user,
    pass,
    defaultFrom,
    isConfigured,
  };
}

export function updateEmailConfig(config: Partial<EmailConfig>): boolean {
  const now = new Date().toISOString();
  const entries: [string, string, string][] = [
    ['email_mode', config.mode || 'apps_script', 'Email Dispatch Mode (apps_script, manual, smtp)'],
    ['apps_script_url', (config.appsScriptUrl || '').trim(), 'Google Apps Script Webhook URL'],
    ['smtp_host', config.host || '', 'SMTP Server Host'],
    ['smtp_port', String(config.port || 587), 'SMTP Server Port'],
    ['smtp_secure', config.secure ? 'true' : 'false', 'SMTP Secure SSL/TLS'],
    ['smtp_user', config.user || '', 'SMTP Username / Account'],
    ['smtp_pass', config.pass !== undefined ? config.pass : '', 'SMTP Password / App Key'],
    ['smtp_from', config.defaultFrom || '', 'Default Outgoing From Address'],
  ];

  for (const [key, value, desc] of entries) {
    // If pass is empty string and was omitted/masked, don't overwrite existing
    if (key === 'smtp_pass' && value === '' && config.pass === undefined) {
      continue;
    }
    const existing = queryOne('SELECT key FROM settings WHERE key = ?', [key]);
    if (existing) {
      run('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?', [value, now, key]);
    } else {
      run('INSERT INTO settings (key, value, description, updated_at) VALUES (?, ?, ?, ?)', [key, value, desc, now]);
    }
  }

  persistDatabase();
  return true;
}

let cachedTestAccount: TestAccount | null = null;

async function getTransporter(): Promise<{
  transporter: Transporter;
  isTest: boolean;
  activeFromAddress: string;
}> {
  const config = getEmailConfig();

  if (config.host && config.user) {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    return {
      transporter,
      isTest: false,
      activeFromAddress: config.user,
    };
  }

  // Fallback to real Ethereal test mailbox for immediate live preview & safe delivery
  if (!cachedTestAccount) {
    try {
      cachedTestAccount = await nodemailer.createTestAccount();
      console.log('Provisioned Ethereal Email account for testing:', cachedTestAccount.user);
    } catch (err) {
      console.warn('Failed to generate Ethereal account, using JSON transport fallback:', err);
    }
  }

  if (cachedTestAccount) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: cachedTestAccount.user,
        pass: cachedTestAccount.pass,
      },
    });

    return {
      transporter,
      isTest: true,
      activeFromAddress: cachedTestAccount.user,
    };
  }

  // In-memory JSON transport fallback
  const transporter = nodemailer.createTransport({
    jsonTransport: true,
  });

  return {
    transporter,
    isTest: true,
    activeFromAddress: 'test@casacentralstore.com',
  };
}

export interface SendEmailOptions {
  to: string;
  toName?: string;
  fromName?: string;
  fromEmail?: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId: string;
  previewUrl?: string;
  isTest: boolean;
  senderUsed: string;
  mode: EmailDispatchMode;
  manualMode?: boolean;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const config = getEmailConfig();

  // =========================================================================
  // 1. GOOGLE APPS SCRIPT WEBHOOK RELAY (ZERO SMTP CONFIGURATION REQUIRED)
  // =========================================================================
  if (config.mode === 'apps_script' || (config.appsScriptUrl && config.mode !== 'smtp' && config.mode !== 'manual')) {
    if (!config.appsScriptUrl) {
      throw new Error(
        'Google Apps Script Webhook URL is not configured. Please paste your deployed Web App URL in Settings > Email Delivery.'
      );
    }

    const payload = {
      to: options.to,
      toName: options.toName || '',
      fromName: options.fromName || 'Casa Central Store',
      fromEmail: options.fromEmail || '',
      replyTo: options.replyTo || options.fromEmail || '',
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    try {
      const response = await fetch(config.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });

      const resText = await response.text();
      let json: any = {};
      try {
        json = JSON.parse(resText);
      } catch {
        if (response.ok && (resText.toLowerCase().includes('success') || resText.length === 0)) {
          json = { success: true };
        } else if (response.ok) {
          json = { success: true, message: resText };
        } else {
          throw new Error(`Google Apps Script returned HTTP ${response.status}: ${resText.slice(0, 300)}`);
        }
      }

      if (json.success === false || json.error) {
        const errorText = String(json.error || '');
        const isAuthError =
          errorText.includes('permission to call MailApp') ||
          errorText.includes('auth/script.send_mail') ||
          errorText.includes('auth/gmail.send') ||
          errorText.includes('AUTHORIZATION_REQUIRED') ||
          errorText.includes('You do not have permission') ||
          errorText.includes('authorization-is');

        if (isAuthError) {
          throw new Error(
            'Google Apps Script Authorization Required: Open script.google.com, select "authorizeScript" from the top function dropdown, click "▶ Run", and click "Review permissions" -> "Allow". Alternatively, switch to "Manual Clipboard Mode" in Settings if company restrictions prevent scripts.'
          );
        }
        throw new Error(`Google Apps Script error: ${errorText || 'Delivery failed'}`);
      }

      return {
        success: true,
        messageId: `gas-${Date.now()}`,
        isTest: false,
        senderUsed: `Google Apps Script Relay (${options.fromName || 'Staff'})`,
        mode: 'apps_script',
      };
    } catch (err: any) {
      const msg = err.message || '';
      const isAuthError =
        msg.includes('permission to call MailApp') ||
        msg.includes('auth/script.send_mail') ||
        msg.includes('auth/gmail.send') ||
        msg.includes('AUTHORIZATION_REQUIRED') ||
        msg.includes('Authorization Required') ||
        msg.includes('You do not have permission') ||
        msg.includes('authorization-is');

      if (isAuthError) {
        console.warn('Google Apps Script relay requires one-time user authorization in script.google.com editor.');
        throw new Error(
          'Google Apps Script Authorization Required: Open script.google.com, select "authorizeScript" from the top dropdown, click "▶ Run", and click "Review permissions" -> "Allow". Alternatively, switch to "Manual Clipboard Mode" in Settings.'
        );
      }
      console.error('Google Apps Script relay error:', msg);
      throw new Error(`Google Apps Script dispatch failed: ${msg || 'Network error'}`);
    }
  }

  // =========================================================================
  // 2. MANUAL CLIENT / CLIPBOARD DISPATCH MODE
  // =========================================================================
  if (config.mode === 'manual') {
    return {
      success: true,
      messageId: `manual-${Date.now()}`,
      isTest: false,
      senderUsed: `Manual Clipboard / Email Client Dispatch (${options.fromName || 'Staff'})`,
      mode: 'manual',
      manualMode: true,
    };
  }

  // =========================================================================
  // 3. SMTP SERVER DISPATCH (STANDARD NODEMAILER)
  // =========================================================================
  const { transporter, isTest, activeFromAddress } = await getTransporter();

  const senderDisplayName = options.fromName ? options.fromName.trim() : 'Casa Central Store';
  const senderEmailAddress = options.fromEmail ? options.fromEmail.trim() : activeFromAddress;
  const fromHeader = `"${senderDisplayName}" <${senderEmailAddress}>`;

  const mailOptions: SendMailOptions = {
    from: fromHeader,
    to: options.toName ? `"${options.toName}" <${options.to}>` : options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: options.replyTo || `"${senderDisplayName}" <${senderEmailAddress}>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    let previewUrl: string | undefined = undefined;

    if (isTest) {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) {
        previewUrl = url;
      }
    }

    return {
      success: true,
      messageId: info.messageId || `msg-${Date.now()}`,
      previewUrl,
      isTest,
      senderUsed: fromHeader,
      mode: 'smtp',
    };
  } catch (err: any) {
    console.error('Email delivery error:', err);
    throw new Error(`Email delivery failed: ${err.message || 'Unknown error'}`);
  }
}

export async function verifyEmailConnection(): Promise<{
  success: boolean;
  message: string;
  isTest: boolean;
  mode: EmailDispatchMode;
  needsAuthorization?: boolean;
}> {
  const config = getEmailConfig();

  if (config.mode === 'apps_script') {
    if (!config.appsScriptUrl) {
      return {
        success: false,
        message: 'Google Apps Script Webhook URL is not entered yet. Paste your deployed Web App URL in the input above.',
        isTest: false,
        mode: 'apps_script',
      };
    }

    try {
      const res = await fetch(config.appsScriptUrl, {
        method: 'GET',
        redirect: 'follow',
      });
      if (res.ok) {
        const text = await res.text();
        let json: any = {};
        try {
          json = JSON.parse(text);
        } catch {}

        if (
          json.authorized === false ||
          json.status === 'needs_authorization' ||
          String(json.note || '').includes('AUTHORIZATION_REQUIRED')
        ) {
          return {
            success: false,
            message: 'Webhook reachable, but Google Authorization is required! In script.google.com, select "authorizeScript" from the top dropdown, click "▶ Run", and click "Allow".',
            isTest: false,
            mode: 'apps_script',
            needsAuthorization: true,
          };
        }

        return {
          success: true,
          message: 'Google Apps Script Webhook verified & authorized! Ready to dispatch emails directly through your Google account with zero SMTP.',
          isTest: false,
          mode: 'apps_script',
        };
      } else {
        return {
          success: false,
          message: `Google Apps Script returned HTTP ${res.status}. Verify that your deployment access is set to "Anyone".`,
          isTest: false,
          mode: 'apps_script',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Google Apps Script URL: ${err.message}`,
        isTest: false,
        mode: 'apps_script',
      };
    }
  }

  if (config.mode === 'manual') {
    return {
      success: true,
      message: 'Manual Clipboard & Email Client mode active. Copy formatted messages or open them in Gmail / Outlook with 1 click.',
      isTest: false,
      mode: 'manual',
    };
  }

  // SMTP Mode
  try {
    const { transporter, isTest } = await getTransporter();
    if (transporter.verify) {
      await transporter.verify();
    }
    return {
      success: true,
      message: isTest
        ? 'Ethereal Test Mailbox connected successfully. Emails will generate live preview links.'
        : 'SMTP Server connection verified successfully!',
      isTest,
      mode: 'smtp',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `SMTP Connection test failed: ${err.message || 'Unknown error'}`,
      isTest: false,
      mode: 'smtp',
    };
  }
}
