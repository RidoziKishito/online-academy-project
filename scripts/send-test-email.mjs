#!/usr/bin/env node
import { sendResetEmail, testEmailConfig } from '../utils/mailer.js';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/send-test-email.mjs recipient@example.com');
  process.exit(2);
}

const recipient = args[0];

(async function main(){
  try {
    console.log('Verifying SMTP configuration...');
    const ok = await testEmailConfig();
    if (!ok) {
      console.error('SMTP verification failed. Check EMAIL_USER/EMAIL_PASS in your .env');
      process.exit(1);
    }

    console.log(`Sending test email to ${recipient}...`);
    const token = Math.random().toString(36).slice(2,10).toUpperCase();
    const sent = await sendResetEmail(recipient, token, 'Test User');
    if (sent) {
      console.log('Test email sent successfully.');
      process.exit(0);
    } else {
      console.error('Failed to send test email. See logs for details.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected error while sending test email:', err);
    process.exit(1);
  }
})();
