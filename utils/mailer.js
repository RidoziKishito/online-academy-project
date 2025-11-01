import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

// WARNING: Gmail SMTP may be blocked on some hosting providers (e.g., Render)
// Consider using SendGrid, Mailgun, or other email services for production
// See EMAIL_CONFIG.md for setup instructions

// Check if email is properly configured
const isEmailConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;
if (!isEmailConfigured) {
  logger.warn('Email credentials not configured - email features will be disabled');
}

// Create transporter using Gmail SMTP with enhanced configuration for production
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587, // Use port 587 with STARTTLS (more reliable on hosting services)
  secure: false, // false for port 587, true for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false,
    ciphers: 'SSLv3'
  },
  connectionTimeout: 5000, // Reduced to 5 seconds for faster failure detection
  greetingTimeout: 5000,
  socketTimeout: 5000,
  pool: true, // Use connection pooling
  maxConnections: 3,
  maxMessages: 100,
  rateLimit: 10 // Max 10 messages per second
});

/**
 * Send email with retry logic and better error handling
 * @param {Object} mailOptions - Nodemailer mail options
 * @param {number} maxRetries - Maximum retry attempts (default: 2)
 */
async function sendMailWithRetry(mailOptions, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      return info; // Success
    } catch (error) {
      lastError = error;
      logger.warn({ 
        err: error, 
        attempt, 
        maxRetries,
        to: mailOptions.to 
      }, `Email send attempt ${attempt} failed`);
      
      // Don't retry on authentication errors
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  // All retries failed
  throw lastError;
}

/**
 * Send password reset email with token
 * @param {string} email - Recipient email
 * @param {string} token - Reset token
 * @param {string} fullName - User's full name (optional)
 */
export async function sendResetEmail(email, token, fullName = 'User') {
  if (!isEmailConfigured) {
    logger.warn({ email }, 'Cannot send reset email - email not configured');
    return false;
  }
  
  const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/account/reset-password?email=${encodeURIComponent(email)}&token=${token}`;
  
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Online Academy'}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f8f9fa; padding: 30px; }
          .token-box { background-color: #fff; border: 2px solid #007bff; padding: 15px; margin: 20px 0; text-align: center; }
          .token { font-size: 24px; font-weight: bold; color: #007bff; letter-spacing: 2px; }
          .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${fullName}</strong>,</p>
            <p>We received a request to reset your password. Use the token below to reset your password:</p>
            
            <div class="token-box">
              <div class="token">${token}</div>
            </div>
            
            <p>Or click the button below to reset your password directly:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p><strong>This token will expire in 15 minutes.</strong></p>
            
            <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'Online Academy'}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await sendMailWithRetry(mailOptions);
    logger.info({ email }, 'Password reset email sent');
    return true;
  } catch (error) {
    logger.error({ err: error, email }, 'Error sending reset email');
    // Don't throw - return false instead to allow app to continue
    return false;
  }
}

/**
 * Send account verification email with OTP
 * @param {string} email - Recipient email
 * @param {string} token - Verification OTP
 * @param {string} fullName - User's full name (optional)
 */
export async function sendVerifyEmail(email, token, fullName = 'User') {
  if (!isEmailConfigured) {
    logger.warn({ email }, 'Cannot send verification email - email not configured');
    return false;
  }
  
  const verifyUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/account/verify-email?email=${encodeURIComponent(email)}`;
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Online Academy'}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Verify your ${process.env.APP_NAME || 'Online Academy'} account`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #198754; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f8f9fa; padding: 30px; }
          .token-box { background-color: #fff; border: 2px solid #198754; padding: 15px; margin: 20px 0; text-align: center; }
          .token { font-size: 24px; font-weight: bold; color: #198754; letter-spacing: 2px; }
          .button { display: inline-block; background-color: #198754; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify your account</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${fullName}</strong>,</p>
            <p>Welcome to ${process.env.APP_NAME || 'Online Academy'}! Use the verification code below to activate your account:</p>
            <div class="token-box">
              <div class="token">${token}</div>
            </div>
            <p>Or click the button below to go to the verification page:</p>
            <div style="text-align: center;">
              <a href="${verifyUrl}" class="button">Verify Account</a>
            </div>
            <p><strong>This code will expire in 15 minutes.</strong></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'Online Academy'}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await sendMailWithRetry(mailOptions);
    logger.info({ email }, 'Verification email sent');
    return true;
  } catch (error) {
    logger.error({ err: error, email }, 'Error sending verification email');
    // Don't throw - return false instead to allow app to continue
    return false;
  }
}

/**
 * Test email configuration (non-blocking)
 */
export async function testEmailConfig() {
  // Only test in development, skip in production to avoid blocking app startup
  if (process.env.NODE_ENV === 'production') {
    logger.info('Email configuration test skipped in production');
    return true;
  }
  
  try {
    await transporter.verify();
    logger.info('Email server is ready to send messages');
    return true;
  } catch (error) {
    logger.warn({ err: error }, 'Email configuration test failed (app will continue)');
    return false;
  }
}

/**
 * Send instructor account welcome email with credentials
 * NOTE: Since this contains a plaintext password, strongly encourage changing it after first login.
 * @param {string} email
 * @param {string} fullName
 * @param {string} rawPassword
 */
export async function sendInstructorAccountEmail(email, fullName = 'Instructor', rawPassword) {
  if (!isEmailConfigured) {
    logger.warn({ email }, 'Cannot send instructor account email - email not configured');
    return false;
  }
  
  const appName = process.env.APP_NAME || 'Online Academy';
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const signinUrl = `${baseUrl}/account/signin`;

  const mailOptions = {
    from: `"${appName}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Your ${appName} Instructor Account`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0d6efd; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f8f9fa; padding: 24px; }
          .box { background: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 16px; }
          .label { color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
          .value { font-size: 16px; font-weight: 600; }
          .button { display: inline-block; background-color: #0d6efd; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome, Instructor!</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${fullName}</strong>,</p>
            <p>Your instructor account has been created and verified. You can log in using the credentials below:</p>
            <div class="box">
              <div class="label">Email</div>
              <div class="value">${email}</div>
              <div class="label" style="margin-top: 12px;">Temporary Password</div>
              <div class="value">${rawPassword}</div>
            </div>
            <p style="margin-top:16px">Use the button below to sign in:</p>
            <p style="text-align:center"><a class="button" href="${signinUrl}">Sign in</a></p>
            <p><strong>Security tip:</strong> For your safety, please change this password immediately after signing in (Account → Change Password).</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await sendMailWithRetry(mailOptions);
    logger.info({ email }, 'Instructor account email sent');
    return true;
  } catch (error) {
    logger.error({ err: error, email }, 'Error sending instructor account email');
    // Don't throw - return false instead to allow app to continue
    return false;
  }
}

/**
 * Send an email notifying the user that their account has been upgraded to Instructor.
 * No password included (user already has one). Encourages them to review instructor dashboard.
 * @param {string} email
 * @param {string} fullName
 */
export async function sendInstructorPromotionEmail(email, fullName = 'User') {
  if (!isEmailConfigured) {
    logger.warn({ email }, 'Cannot send instructor promotion email - email not configured');
    return false;
  }
  
  const appName = process.env.APP_NAME || 'Online Academy';
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const dashboardUrl = `${baseUrl}/instructor`;

  const mailOptions = {
    from: `"${appName}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `You're now an Instructor at ${appName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #198754; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f8f9fa; padding: 24px; }
          .button { display: inline-block; background-color: #198754; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Instructor Role Granted</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${fullName}</strong>,</p>
            <p>Your account has been upgraded to <strong>Instructor</strong> at ${appName}. You can now create and manage courses.</p>
            <p style="text-align:center"><a class="button" href="${dashboardUrl}">Go to Instructor Dashboard</a></p>
            <p>If this wasn't expected, please contact our support.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await sendMailWithRetry(mailOptions);
    logger.info({ email }, 'Instructor promotion email sent');
    return true;
  } catch (error) {
    logger.error({ err: error, email }, 'Error sending instructor promotion email');
    // Don't throw - return false instead to allow app to continue
    return false;
  }
}
