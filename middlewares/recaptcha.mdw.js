import { RecaptchaV2 } from 'express-recaptcha';
import logger from '../utils/logger.js';

// Prefer environment-specific keys when available
const isProd = process.env.NODE_ENV === 'production';
const SITE_KEY = (isProd ? process.env.RECAPTCHA_SITE_KEY_PROD : process.env.RECAPTCHA_SITE_KEY_DEV) || process.env.RECAPTCHA_SITE_KEY;
const SECRET_KEY = (isProd ? process.env.RECAPTCHA_SECRET_KEY_PROD : process.env.RECAPTCHA_SECRET_KEY_DEV) || process.env.RECAPTCHA_SECRET_KEY;

if (!SITE_KEY || !SECRET_KEY) {
  logger.warn('reCAPTCHA keys are missing or incomplete. Check environment variables.');
}

// Use v2 (checkbox) keys. Ensure the keys you create in Google Admin are type: reCAPTCHA v2 → “I’m not a robot” Checkbox
const recaptcha = new RecaptchaV2(
  SITE_KEY,
  SECRET_KEY,
  { callback: 'cb' }
);

export default recaptcha;
