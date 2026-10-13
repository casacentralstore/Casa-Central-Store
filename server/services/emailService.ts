import nodemailer, { type Transporter, type TestAccount, type SendMailOptions } from 'nodemailer';
import { queryOne, run, persistDatabase } from '../db.ts';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  defaultFrom: string;
  isConfigured: boolean;
}

export function getEmailConfig(): EmailConfig {
  const hostSetting = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['smtp_host']);
  const portSetting = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['smtp_port']);
  const secureSetting = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['smtp_secure']);
  const userSetting = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['smtp_user']);
  const passSetting = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['smtp_pass']);
  const fromSetting = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['smtp_from']);

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

  const isConfigured = Boolean(host && user);

  return {
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
    ['smtp_host', config.host || '', 'SMTP Server Host'],
    ['smtp_port', String(config.port || 587), 'SMTP Server Port'],
    ['smtp_secure', config.secure ? 'true' : 'false', 'SMTP Secure SSL/TLS'],
    ['smtp_user', config.user || '', 'SMTP Username / Account'],
    ['smtp_pass', config.pass || '', 'SMTP Password / App Key'],
    ['smtp_from', config.defaultFrom || '', 'Default Outgoing From Address'],
  ];

  for (const [key, value, desc] of entries) {
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

  if (config.isConfigured && config.host) {
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
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { transporter, isTest, activeFromAddress } = await getTransporter();

  // The email sender should be the user logged in
  const senderDisplayName = options.fromName ? options.fromName.trim() : 'Casa Central Store';
  const senderEmailAddress = options.fromEmail ? options.fromEmail.trim() : activeFromAddress;

  // If using authenticated SMTP where from must match authenticated mailbox,
  // we still display the user's name: "User Name <authenticated_email>" and set reply-to to user's email.
  // In Ethereal or standard SMTP, we format from as "User Name <User Email>".
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
    };
  } catch (err: any) {
    console.error('Email delivery error:', err);
    throw new Error(`Email delivery failed: ${err.message || 'Unknown error'}`);
  }
}

export async function verifyEmailConnection(): Promise<{ success: boolean; message: string; isTest: boolean }> {
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
    };
  } catch (err: any) {
    return {
      success: false,
      message: `SMTP Connection test failed: ${err.message || 'Unknown error'}`,
      isTest: false,
    };
  }
}
