import crypto from 'node:crypto';
import { queryAll, queryOne, run } from '../db.ts';
import { User, UserRole, UserInvitation, SentEmail } from '../../src/types/index.ts';

// Cryptographic Password Utilities
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  if (!combinedHash || !combinedHash.includes(':')) {
    return false;
  }
  try {
    const [salt, originalHash] = combinedHash.split(':');
    const verify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    const a = Buffer.from(verify, 'hex');
    const b = Buffer.from(originalHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function generateToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function getAllUsers(): User[] {
  return queryAll<User>(`
    SELECT 
      id, name, email, role, active, 
      COALESCE(status, 'active') as status, 
      invite_token, invite_expires_at, last_login_at,
      (CASE WHEN password_hash IS NOT NULL AND password_hash != '' THEN 1 ELSE 0 END) as has_password,
      created_at, updated_at 
    FROM users 
    WHERE active = 1 
    ORDER BY name ASC
  `);
}

export function getUserById(id: string): User | null {
  return queryOne<User>(`
    SELECT 
      id, name, email, role, active, 
      COALESCE(status, 'active') as status, 
      invite_token, invite_expires_at, last_login_at,
      (CASE WHEN password_hash IS NOT NULL AND password_hash != '' THEN 1 ELSE 0 END) as has_password,
      created_at, updated_at 
    FROM users 
    WHERE id = ?
  `, [id]);
}

export function getUserByEmail(email: string): (User & { password_hash?: string }) | null {
  const cleanEmail = email.toLowerCase().trim();
  return queryOne<User & { password_hash?: string }>(`
    SELECT 
      id, name, email, role, active, password_hash,
      COALESCE(status, 'active') as status, 
      invite_token, invite_expires_at, last_login_at,
      (CASE WHEN password_hash IS NOT NULL AND password_hash != '' THEN 1 ELSE 0 END) as has_password,
      created_at, updated_at 
    FROM users 
    WHERE email = ?
  `, [cleanEmail]);
}

export function checkPermission(
  role: UserRole,
  action: 'manage_settings' | 'manage_users' | 'create_order' | 'edit_order' | 'cancel_order' | 'record_payment' | 'view_financials' | 'view_reports' | 'manage_inventory' | 'update_logistics' | 'manage_customers'
): boolean {
  switch (role) {
    case 'Admin':
    case 'Administrator':
      return true; // full access
    case 'Manager':
      return action !== 'manage_users'; // full operational access, reports, orders, financials
    case 'Sales':
      return ['create_order', 'manage_customers', 'update_logistics'].includes(action);
    case 'Support':
    case 'Sales Support':
    case 'Logistics':
      return ['create_order', 'manage_customers', 'update_logistics'].includes(action);
    case 'Accounting':
      return ['record_payment', 'view_financials', 'view_reports'].includes(action);
    default:
      return false;
  }
}

// Session Validation
export function createSession(userId: string): string {
  const token = generateToken(32);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  const id = 'sess-' + Date.now() + '-' + generateToken(4);

  run(
    'INSERT INTO auth_sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, userId, token, expiresAt, now.toISOString()]
  );
  return token;
}

export function validateSession(token: string): User | null {
  if (!token) return null;
  const now = new Date().toISOString();
  const session = queryOne<{ user_id: string; expires_at: string }>(
    'SELECT user_id, expires_at FROM auth_sessions WHERE token = ?',
    [token]
  );

  if (!session || session.expires_at < now) {
    return null;
  }

  const user = getUserById(session.user_id);
  if (!user || !user.active) {
    return null;
  }

  return user;
}

export function logoutSession(token: string): boolean {
  if (!token) return false;
  run('DELETE FROM auth_sessions WHERE token = ?', [token]);
  return true;
}

// Login
export function loginUser(email: string, password: string): { user: User; token: string } {
  if (!email || !email.trim()) {
    throw new Error('Email address is required.');
  }
  if (!password) {
    throw new Error('Password is required.');
  }

  const user = getUserByEmail(email);
  if (!user || !user.active) {
    throw new Error('Invalid email or password.');
  }

  // If user was invited and hasn't set their password yet
  if (user.status === 'invited' && (!user.password_hash || !user.has_password)) {
    throw new Error('Your account invitation is pending password setup. Please use the invitation link sent to your email to set up your password.');
  }

  if (!user.password_hash) {
    throw new Error('Password has not been set for this account. Please use the password setup link or contact your administrator.');
  }

  const isValid = verifyPassword(password, user.password_hash);
  if (!isValid) {
    throw new Error('Invalid email or password.');
  }

  const now = new Date().toISOString();
  run('UPDATE users SET last_login_at = ? WHERE id = ?', [now, user.id]);

  const token = createSession(user.id);
  const cleanUser = getUserById(user.id)!;

  return { user: cleanUser, token };
}

// Create Invitation and Email Template
function buildInvitationEmail(name: string, email: string, role: UserRole, setupUrl: string, expiresAt: string): { subject: string; html: string; text: string } {
  const roleDisplay = role === 'Admin' ? 'Administrator' : role;
  const expirationDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const subject = `You're invited to join Casa Central Store POS & Operations as ${roleDisplay}`;

  const text = `Hello ${name},

You have been invited to join Casa Central Store as ${roleDisplay}.

To activate your account and start using the system, please set up your password using the link below:

${setupUrl}

This invitation link expires on ${expirationDate}.

If you did not expect this invitation, please contact your store administrator.

Best regards,
Casa Central Store Team
405 32nd St, Union City, NJ 07087
`;

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
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 40px; text-align: left; border-bottom: 3px solid #f59e0b;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; width: 44px; height: 44px; background-color: #f59e0b; border-radius: 10px; text-align: center; line-height: 44px; font-weight: 900; color: #0f172a; font-size: 20px; vertical-align: middle;">CC</div>
                    <div style="display: inline-block; vertical-align: middle; margin-left: 14px;">
                      <div style="color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Casa Central Store</div>
                      <div style="color: #f59e0b; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">POS & Operations Platform</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 22px; font-weight: 700;">Welcome to the Team, ${name}!</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                An administrator has added you to <strong>Casa Central Store</strong> with the role of:
              </p>
              
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px;">
                <span style="display: inline-block; background-color: #fef3c7; color: #92400e; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">${roleDisplay}</span>
                <p style="margin: 8px 0 0 0; color: #334155; font-size: 13px; font-weight: 500;">
                  Your account is ready. Please click the button below to choose your password and activate your access.
                </p>
              </div>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${setupUrl}" target="_blank" style="display: inline-block; background-color: #f59e0b; color: #0f172a; font-size: 15px; font-weight: 800; text-decoration: none; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                      Set Up Your Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px;">If the button above does not work, copy and paste this link into your web browser:</p>
                <p style="margin: 0 0 16px 0; color: #0284c7; font-size: 12px; word-break: break-all; font-family: monospace;">${setupUrl}</p>
                <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                  &bull; This link is securely personalized and will expire on <strong>${expirationDate}</strong>.<br>
                  &bull; For any access questions, reach out to your store manager or administrator.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 11px;">
                Casa Central Store &bull; 405 32nd St, Union City, NJ 07087 &bull; (201) 867-0000
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

// User Creation with Automated Invitation Email
export function createUser(
  data: { name: string; email: string; role: UserRole },
  baseUrl = '',
  createdBy = 'usr-admin-1'
): { user: User; invitation: UserInvitation; email: SentEmail } {
  if (!data.name || !data.name.trim()) {
    throw new Error('User name is required.');
  }
  if (!data.email || !data.email.trim()) {
    throw new Error('User email is required.');
  }

  const cleanEmail = data.email.toLowerCase().trim();
  const existing = queryOne<{ id: string; active: number; status: string }>(
    'SELECT id, active, status FROM users WHERE email = ?',
    [cleanEmail]
  );

  let userId: string;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  const token = generateToken(24);

  if (existing) {
    if (existing.active === 1) {
      throw new Error('A user with this email address already exists in the system.');
    } else {
      // Reactivate previously deactivated user
      userId = existing.id;
      run(
        `UPDATE users SET 
          name = ?, role = ?, active = 1, status = 'invited', 
          password_hash = NULL, invite_token = ?, invite_expires_at = ?, updated_at = ? 
        WHERE id = ?`,
        [data.name.trim(), data.role, token, expiresAt, now, userId]
      );
    }
  } else {
    userId = 'usr-' + Date.now() + '-' + generateToken(3);
    run(
      `INSERT INTO users (
        id, name, email, role, active, status, 
        invite_token, invite_expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, 'invited', ?, ?, ?, ?)`,
      [userId, data.name.trim(), cleanEmail, data.role, token, expiresAt, now, now]
    );
  }

  // Construct invite URL
  const setupUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/?invite=${token}` : `/?invite=${token}`;

  // Record invitation
  const inviteId = 'inv-' + Date.now() + '-' + generateToken(3);
  run(
    `INSERT INTO user_invitations (
      id, user_id, email, token, expires_at, status, setup_url, created_at, created_by
    ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [inviteId, userId, cleanEmail, token, expiresAt, setupUrl, now, createdBy]
  );

  // Generate and Record Invitation Email
  const emailContent = buildInvitationEmail(data.name.trim(), cleanEmail, data.role, setupUrl, expiresAt);
  const emailId = 'email-' + Date.now() + '-' + generateToken(3);
  run(
    `INSERT INTO sent_emails (
      id, to_email, to_name, subject, body_html, body_text, email_type, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'invitation', 'sent', ?)`,
    [emailId, cleanEmail, data.name.trim(), emailContent.subject, emailContent.html, emailContent.text, now]
  );

  const newUser = getUserById(userId)!;
  const invitationRecord: UserInvitation = {
    id: inviteId,
    user_id: userId,
    email: cleanEmail,
    token,
    expires_at: expiresAt,
    status: 'pending',
    setup_url: setupUrl,
    created_at: now,
    created_by: createdBy,
    email_preview: {
      subject: emailContent.subject,
      body_html: emailContent.html,
      body_text: emailContent.text,
    },
  };

  const sentEmailRecord: SentEmail = {
    id: emailId,
    to_email: cleanEmail,
    to_name: data.name.trim(),
    subject: emailContent.subject,
    body_html: emailContent.html,
    body_text: emailContent.text,
    email_type: 'invitation',
    status: 'sent',
    created_at: now,
  };

  return { user: newUser, invitation: invitationRecord, email: sentEmailRecord };
}

// Verify Invitation Token
export function verifyInviteToken(token: string): {
  valid: boolean;
  user?: User;
  invitation?: UserInvitation;
  error?: string;
} {
  if (!token || !token.trim()) {
    return { valid: false, error: 'No invitation token provided.' };
  }

  const cleanToken = token.trim();
  const invitation = queryOne<any>(
    'SELECT * FROM user_invitations WHERE token = ?',
    [cleanToken]
  );

  if (!invitation) {
    return { valid: false, error: 'Invitation link is invalid or does not exist.' };
  }

  if (invitation.status === 'accepted') {
    return { valid: false, error: 'This invitation has already been redeemed and the account password is set. Please log in.' };
  }

  const now = new Date().toISOString();
  if (invitation.expires_at < now) {
    return { valid: false, error: 'This invitation link has expired. Please request a new invitation from your administrator.' };
  }

  const user = getUserById(invitation.user_id);
  if (!user || !user.active) {
    return { valid: false, error: 'The user account associated with this invitation is no longer active.' };
  }

  return {
    valid: true,
    user,
    invitation: {
      id: invitation.id,
      user_id: invitation.user_id,
      email: invitation.email,
      token: invitation.token,
      expires_at: invitation.expires_at,
      status: invitation.status,
      setup_url: invitation.setup_url,
      created_at: invitation.created_at,
      accepted_at: invitation.accepted_at,
      created_by: invitation.created_by,
    },
  };
}

// Setup Password via Invitation Token
export function setupPasswordWithInvite(token: string, password: string): { user: User; token: string } {
  const check = verifyInviteToken(token);
  if (!check.valid || !check.user) {
    throw new Error(check.error || 'Invalid invitation.');
  }

  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();

  // Update user with active status and password hash
  run(
    `UPDATE users SET 
      password_hash = ?, status = 'active', 
      invite_token = NULL, invite_expires_at = NULL, 
      last_login_at = ?, updated_at = ? 
    WHERE id = ?`,
    [passwordHash, now, now, check.user.id]
  );

  // Mark invitation accepted
  run(
    "UPDATE user_invitations SET status = 'accepted', accepted_at = ? WHERE token = ?",
    [now, token.trim()]
  );

  // Log the user in immediately
  const sessionToken = createSession(check.user.id);
  const updatedUser = getUserById(check.user.id)!;

  return { user: updatedUser, token: sessionToken };
}

// Resend Invitation
export function resendInvitation(
  userId: string,
  baseUrl = '',
  createdBy = 'usr-admin-1'
): { invitation: UserInvitation; email: SentEmail } {
  const user = getUserById(userId);
  if (!user || !user.active) {
    throw new Error('User not found or inactive.');
  }

  const token = generateToken(24);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const setupUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/?invite=${token}` : `/?invite=${token}`;

  // Update user
  run(
    `UPDATE users SET 
      status = 'invited', invite_token = ?, invite_expires_at = ?, updated_at = ? 
    WHERE id = ?`,
    [token, expiresAt, now, userId]
  );

  // Invalidate previous pending invitations
  run(
    "UPDATE user_invitations SET status = 'expired' WHERE user_id = ? AND status = 'pending'",
    [userId]
  );

  // Insert new invitation
  const inviteId = 'inv-' + Date.now() + '-' + generateToken(3);
  run(
    `INSERT INTO user_invitations (
      id, user_id, email, token, expires_at, status, setup_url, created_at, created_by
    ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [inviteId, userId, user.email, token, expiresAt, setupUrl, now, createdBy]
  );

  // Generate & Log Email
  const emailContent = buildInvitationEmail(user.name, user.email, user.role, setupUrl, expiresAt);
  const emailId = 'email-' + Date.now() + '-' + generateToken(3);
  run(
    `INSERT INTO sent_emails (
      id, to_email, to_name, subject, body_html, body_text, email_type, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'invitation', 'sent', ?)`,
    [emailId, user.email, user.name, emailContent.subject, emailContent.html, emailContent.text, now]
  );

  const invitationRecord: UserInvitation = {
    id: inviteId,
    user_id: userId,
    email: user.email,
    token,
    expires_at: expiresAt,
    status: 'pending',
    setup_url: setupUrl,
    created_at: now,
    created_by: createdBy,
    email_preview: {
      subject: emailContent.subject,
      body_html: emailContent.html,
      body_text: emailContent.text,
    },
  };

  const sentEmailRecord: SentEmail = {
    id: emailId,
    to_email: user.email,
    to_name: user.name,
    subject: emailContent.subject,
    body_html: emailContent.html,
    body_text: emailContent.text,
    email_type: 'invitation',
    status: 'sent',
    created_at: now,
  };

  return { invitation: invitationRecord, email: sentEmailRecord };
}

// Get User's Latest Invitation & Email
export function getUserInvitation(userId: string): { invitation: UserInvitation | null; email: SentEmail | null } {
  const invitation = queryOne<any>(
    'SELECT * FROM user_invitations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId]
  );

  const email = queryOne<any>(
    'SELECT * FROM sent_emails WHERE to_email = (SELECT email FROM users WHERE id = ?) ORDER BY created_at DESC LIMIT 1',
    [userId]
  );

  return {
    invitation: invitation || null,
    email: email || null,
  };
}

export function deleteUser(id: string, currentUserId: string): { success: boolean; message: string } {
  const targetUser = getUserById(id);
  if (!targetUser) {
    throw new Error('User not found.');
  }

  if (id === currentUserId) {
    throw new Error('You cannot delete your own account while signed in.');
  }

  if (targetUser.role === 'Admin' || targetUser.role === 'Administrator') {
    const adminCount = queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM users WHERE role IN ('Admin', 'Administrator') AND active = 1 AND id != ?",
      [id]
    );
    if (!adminCount || adminCount.count === 0) {
      throw new Error('Cannot delete the only remaining active Administrator in the system.');
    }
  }

  const now = new Date().toISOString();

  // Check if user has associated transactions or orders
  const ordersWithUser = queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM orders WHERE sales_rep_id = ? OR created_by = ? OR updated_by = ?',
    [id, id, id]
  );

  if (ordersWithUser && ordersWithUser.count > 0) {
    // Soft delete to safeguard transactional and audit trail integrity
    run("UPDATE users SET active = 0, status = 'disabled', updated_at = ? WHERE id = ?", [now, id]);
  } else {
    // Hard delete since there are no foreign key dependencies
    run('DELETE FROM users WHERE id = ?', [id]);
    run('DELETE FROM user_invitations WHERE user_id = ?', [id]);
  }

  return { success: true, message: `User "${targetUser.name}" has been removed.` };
}

// User changes their own password
export function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): { success: boolean; message: string } {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const user = getUserById(userId);
  if (!user || !user.active) {
    throw new Error('User account not found or inactive.');
  }

  const fullUser = queryOne<User & { password_hash?: string }>(
    'SELECT id, password_hash FROM users WHERE id = ?',
    [userId]
  );

  // If user currently has a password hash, require verification of current password
  if (fullUser?.password_hash) {
    if (!currentPassword) {
      throw new Error('Current password is required.');
    }
    const isValid = verifyPassword(currentPassword, fullUser.password_hash);
    if (!isValid) {
      throw new Error('Incorrect current password. Please verify and try again.');
    }
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  if (fullUser?.password_hash && currentPassword === newPassword) {
    throw new Error('New password must be different from your current password.');
  }

  const passwordHash = hashPassword(newPassword);
  const now = new Date().toISOString();

  run(
    'UPDATE users SET password_hash = ?, status = \'active\', updated_at = ? WHERE id = ?',
    [passwordHash, now, userId]
  );

  return {
    success: true,
    message: 'Your password has been successfully updated.',
  };
}

// Admin resets a staff member's password
export function adminResetUserPassword(
  adminUserId: string,
  targetUserId: string,
  newPassword: string
): { success: boolean; message: string } {
  const admin = getUserById(adminUserId);
  if (!admin || (admin.role !== 'Admin' && admin.role !== 'Administrator')) {
    throw new Error('Unauthorized: Administrator access required to reset user passwords.');
  }

  const targetUser = getUserById(targetUserId);
  if (!targetUser || !targetUser.active) {
    throw new Error('Target user account not found or inactive.');
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  const passwordHash = hashPassword(newPassword);
  const now = new Date().toISOString();

  run(
    'UPDATE users SET password_hash = ?, status = \'active\', updated_at = ? WHERE id = ?',
    [passwordHash, now, targetUserId]
  );

  return {
    success: true,
    message: `Password for "${targetUser.name}" has been successfully reset.`,
  };
}
