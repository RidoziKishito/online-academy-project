import { RecaptchaV2 } from 'express-recaptcha';

const recaptcha = new RecaptchaV2(
  process.env.RECAPTCHA_SITE_KEY,
  process.env.RECAPTCHA_SECRET_KEY,
  { callback: 'cb' }
);

export default recaptcha;
