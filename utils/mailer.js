import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
// Create transporter using Gmail SMTP with explicit configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
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
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending reset email:', error);
    throw new Error('Failed to send reset email');
  }
}

/**
 * Test email configuration
 */
export async function testEmailConfig() {
  try {
    await transporter.verify();
    console.log('Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}
