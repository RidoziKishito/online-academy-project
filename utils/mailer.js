import { Resend } from 'resend';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

// Using Resend - modern email API service
// Free tier: 100 emails/day, 3,000/month
// Sign up: https://resend.com/
// Get API key: https://resend.com/api-keys

// Check if email is properly configured
const isEmailConfigured = process.env.RESEND_API_KEY;
if (!isEmailConfigured) {
  logger.warn('RESEND_API_KEY not configured - email features will be disabled');
}

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'onboarding@resend.dev';
const APP_NAME = process.env.APP_NAME || 'Online Academy';

/**
 * Send email with retry logic and better error handling
 * @param {Object} emailData - Email data with from, to, subject, html
 * @param {number} maxRetries - Maximum retry attempts (default: 2)
 */
async function sendMailWithRetry(emailData, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await resend.emails.send(emailData);
      
      if (error) {
        throw error;
      }
      
      logger.info({ to: emailData.to, messageId: data.id }, 'Email sent successfully');
      return data;
    } catch (error) {
      lastError = error;
      logger.warn({ 
        err: error, 
        attempt, 
        maxRetries,
        to: emailData.to,
        errorMessage: error.message
      }, `Email send attempt ${attempt} failed`);
      
      // Don't retry on authentication errors
      if (error.message?.includes('Invalid API key') || error.message?.includes('Unauthorized')) {
        logger.error({ err: error }, 'Resend API key invalid - check RESEND_API_KEY');
        throw error;
      }
      
      // Wait before retry (exponential backoff: 1s, 2s)
      if (attempt < maxRetries) {
        const waitTime = 1000 * attempt;
        logger.info({ waitTime, attempt }, `Waiting before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // All retries failed
  logger.error({ err: lastError, to: emailData.to }, 'All email send attempts failed');
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
    logger.warn({ email }, 'Cannot send reset email - RESEND_API_KEY not configured');
    return false;
  }
  
  const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/account/reset-password?email=${encodeURIComponent(email)}&token=${token}`;
  
  const emailData = {
    from: `${APP_NAME} <${EMAIL_FROM}>`,
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
            <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await sendMailWithRetry(emailData);
    logger.info({ email }, 'Password reset email sent');
    return true;
  } catch (error) {
    logger.error({ err: error, email }, 'Error sending reset email');
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
    logger.warn({ email }, 'Cannot send verification email - RESEND_API_KEY not configured');
    return false;
  }
  
  const verifyUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/account/verify-email?email=${encodeURIComponent(email)}`;
  
  const emailData = {
    from: `${APP_NAME} <${EMAIL_FROM}>`,
    to: email,
    subject: `Verify your ${APP_NAME} account`,
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
            <p>Welcome to ${APP_NAME}! Use the verification code below to activate your account:</p>
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
            <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await sendMailWithRetry(emailData);
    logger.info({ email }, 'Verification email sent');
    return true;
  } catch (error) {
    logger.error({ err: error, email }, 'Error sending verification email');
    return false;
  }
}

/**
 * Test email configuration (non-blocking)
 */
export async function testEmailConfig() {
  if (!isEmailConfigured) {
    logger.warn('RESEND_API_KEY not configured - email test skipped');
    return false;
  }
  
  // Resend doesn't have a verify method like nodemailer
  // We just check if API key is configured
  logger.info('Resend API key configured - email service ready');
  return true;
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
    logger.warn({ email }, 'Cannot send instructor account email - RESEND_API_KEY not configured');
    return false;
  }
  
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const signinUrl = `${baseUrl}/account/signin`;

  const emailData = {
    from: `${APP_NAME} <${EMAIL_FROM}>`,
    to: email,
    subject: `Your ${APP_NAME} Instructor Account`,
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
            <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await sendMailWithRetry(emailData);
    logger.info({ email }, 'Instructor account email sent');
    return true;
  } catch (error) {
    logger.error({ err: error, email }, 'Error sending instructor account email');
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
    logger.warn({ email }, 'Cannot send instructor promotion email - RESEND_API_KEY not configured');
    return false;
  }
  
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const dashboardUrl = `${baseUrl}/instructor`;

  const emailData = {
    from: `${APP_NAME} <${EMAIL_FROM}>`,
    to: email,
    subject: `You're now an Instructor at ${APP_NAME}`,
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
            <p>Your account has been upgraded to <strong>Instructor</strong> at ${APP_NAME}. You can now create and manage courses.</p>
            <p style="text-align:center"><a class="button" href="${dashboardUrl}">Go to Instructor Dashboard</a></p>
            <p>If this wasn't expected, please contact our support.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await sendMailWithRetry(emailData);
    logger.info({ email }, 'Instructor promotion email sent');
    return true;
  } catch (error) {
    logger.error({ err: error, email }, 'Error sending instructor promotion email');
    return false;
  }
}
