import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

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
  connectionTimeout: 10000, // 10 seconds timeout
  greetingTimeout: 10000,
  socketTimeout: 10000,
  pool: true, // Use connection pooling
  maxConnections: 5,
  maxMessages: 100,
  rateLimit: 10 // Max 10 messages per second
});

/**
 * Send password reset email with token
 * @param {string} email - Recipient email
 * @param {string} token - Reset token
 * @param {string} fullName - User's full name (optional)
 */
export async function sendResetEmail(email, token, fullName = 'User') {
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
    await transporter.sendMail(mailOptions);
    logger.info({ email }, 'Password reset email sent');
    return true;
  } catch (error) {
    logger.error({ err: error, email }, 'Error sending reset email');
    throw new Error('Failed to send reset email');
  }
}

/**
 * Send account verification email with OTP
 * @param {string} email - Recipient email
 * @param {string} token - Verification OTP
 * @param {string} fullName - User's full name (optional)
 */
export async function sendVerifyEmail(email, token, fullName = 'User') {
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
    await transporter.sendMail(mailOptions);
    logger.info({ email }, 'Verification email sent');
    return true;
  } catch (error) {
    logger.error({ err: error, email }, 'Error sending verification email');
    throw new Error('Failed to send verification email');
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
    await transporter.sendMail(mailOptions);
    logger.info({ email }, 'Instructor account email sent');
    return true;
  } catch (error) {
    logger.error({ err: error, email }, 'Error sending instructor account email');
    throw new Error('Failed to send instructor account email');
  }
}
