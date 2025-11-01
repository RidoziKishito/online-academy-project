import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Testing Resend Email Service...\n');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '***' + process.env.RESEND_API_KEY.slice(-6) : 'NOT SET');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'onboarding@resend.dev (default)');
console.log('');

if (!process.env.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY not found in .env file');
  console.error('\n📝 Setup instructions:');
  console.error('1. Go to: https://resend.com/api-keys');
  console.error('2. Create an API key');
  console.error('3. Add to .env: RESEND_API_KEY=re_xxxxxxxxxxxxx');
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

async function testResend() {
  try {
    console.log('📧 Sending test email...');
    
    const { data, error } = await resend.emails.send({
      from: `Test <${EMAIL_FROM}>`,
      to: process.env.EMAIL_USER || 'delivered@resend.dev', // Send to yourself or test address
      subject: 'Test Email from VietEdu (Resend)',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 30px; border-radius: 10px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px; }
            .content { background: white; padding: 30px; margin-top: 20px; border-radius: 8px; }
            .success { color: #198754; font-size: 48px; text-align: center; }
            .footer { text-align: center; color: #666; margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Resend is Working!</h1>
            </div>
            <div class="content">
              <div class="success">✅</div>
              <h2 style="text-align: center; color: #333;">Email Service Active</h2>
              <p style="text-align: center;">Your VietEdu application can now send emails using Resend.</p>
              <ul style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <li><strong>Service:</strong> Resend</li>
                <li><strong>From:</strong> ${EMAIL_FROM}</li>
                <li><strong>Status:</strong> ✅ Operational</li>
                <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
              </ul>
              <p style="text-align: center; margin-top: 20px;">
                <a href="https://resend.com/emails" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View in Resend Dashboard →
                </a>
              </p>
            </div>
            <div class="footer">
              <p>Powered by Resend • VietEdu Online Academy</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      throw error;
    }

    console.log('✅ Test email sent successfully!\n');
    console.log('📊 Email Details:');
    console.log('- Email ID:', data.id);
    console.log('- From:', EMAIL_FROM);
    console.log('- To:', process.env.EMAIL_USER || 'delivered@resend.dev');
    console.log('');
    console.log('🔍 View email status:');
    console.log(`https://resend.com/emails/${data.id}`);
    console.log('');
    console.log('🎉 Resend is working perfectly!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Check your inbox for the test email');
    console.log('2. Add RESEND_API_KEY to Render environment variables');
    console.log('3. Deploy and test signup/password reset');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Resend test failed:\n');
    console.error('Error:', error.message);
    
    if (error.message?.includes('Invalid') || error.message?.includes('API key')) {
      console.error('\n⚠️  API Key Error!');
      console.error('Solution:');
      console.error('1. Go to: https://resend.com/api-keys');
      console.error('2. Create a new API key');
      console.error('3. Update RESEND_API_KEY in .env');
      console.error('4. Make sure it starts with: re_');
    } else if (error.message?.includes('Domain')) {
      console.error('\n⚠️  Domain Error!');
      console.error('Solution:');
      console.error('1. Use onboarding@resend.dev (no verification needed)');
      console.error('   Set: EMAIL_FROM=onboarding@resend.dev');
      console.error('2. Or verify your domain at: https://resend.com/domains');
    } else if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
      console.error('\n⚠️  Rate Limit Exceeded!');
      console.error('Free tier: 100 emails/day, 3,000/month');
      console.error('Solution: Wait 24h or upgrade plan');
    } else {
      console.error('\n⚠️  Unknown Error');
      console.error('Full error:', error);
      console.error('\nCheck Resend status: https://status.resend.com/');
    }
    
    process.exit(1);
  }
}

testResend();
