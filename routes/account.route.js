import express from 'express';
import bcrypt from 'bcrypt';
import * as userModel from '../models/user.model.js';
import { restrict } from '../middlewares/auth.mdw.js';
import { sendResetEmail, sendVerifyEmail } from '../utils/mailer.js';
import recaptcha from '../middlewares/recaptcha.mdw.js';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

const router = express.Router();

// Rate limiters for auth actions
const signinLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
const signupLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });
const forgotLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });
const resetLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

router.get('/signin', (req, res) => {
  if (req.query.ret) req.session.retUrl = req.query.ret;
  const { error, msg } = req.query;
  const vm = { error: false };
  if (error === 'ban') {
    vm.error = true;
    vm.banMessage = msg || 'Your account is banned.';
  }
  res.render('vwAccount/signin', vm);
});

router.post('/signup', signupLimiter, recaptcha.middleware.verify, async (req, res) => {
  const { fullName, email, password, confirm_password } = req.body;
  const oldData = { fullName, email };
  const errorMessages = {};

  // Check CAPTCHA
  if (req.recaptcha && req.recaptcha.error) {
    errorMessages._global = ['CAPTCHA verification failed. Please try again.'];
    return res.render('vwAccount/signup', { 
      oldData, 
      errorMessages,
      recaptcha: recaptcha.render()
    });
  }

  // Basic server-side validation
  if (!fullName || fullName.trim().length === 0) {
    errorMessages.fullName = ['Full name is required.'];
  }
  if (!email || email.trim().length === 0) {
    errorMessages.email = ['Email is required.'];
  }
  if (!password || password.length < 6) {
    errorMessages.password = ['Password must be at least 6 characters.'];
  }
  if (password !== confirm_password) {
    errorMessages.confirm_password = ['Passwords do not match.'];
  }

  if (Object.keys(errorMessages).length > 0) {
    return res.render('vwAccount/signup', { 
      oldData, 
      errorMessages,
      recaptcha: recaptcha.render()
    });
  }

  try {
    // Hash password
    const password_hash = bcrypt.hashSync(password, 10);
    const user = {
      full_name: fullName,
      email,
      password_hash,
      role: 'student',
      is_verified: false
    };

    const [insertedId] = await userModel.add(user); // returns user_id

    // Generate OTP for email verification (8 uppercase chars)
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await userModel.setResetToken(email, token, expiresAt);

    const emailSent = await sendVerifyEmail(email, token, fullName);
    if (!emailSent) {
      logger.warn({ email }, 'Failed to send verification email - user can request resend');
      // Still let user proceed to verification page; they can request resend
    }

    // Render verify email page
    return res.render('vwAccount/verify-email', { email });
  } catch (err) {
    // Handle unique constraint (email) for Postgres
    if (err && err.code === '23505') {
      // Unique violation
      errorMessages.email = ['Email already in use.'];
      return res.render('vwAccount/signup', { 
        oldData, 
        errorMessages,
        recaptcha: recaptcha.render()
      });
    }
    logger.error({ err }, 'Signup error');
    errorMessages._global = ['An unexpected error occurred. Please try again later.'];
    return res.render('vwAccount/signup', { 
      oldData, 
      errorMessages,
      recaptcha: recaptcha.render()
    });
  }
});

// Route to check if email already exists
router.get('/is-email-available', async (req, res) => {
  const email = req.query.email;
  const user = await userModel.findByEmail(email);
  if (!user) {
    return res.json(true);
  }
  res.json(false);
});

router.get('/signup', (req, res) => {
  res.render('vwAccount/signup', {
    recaptcha: recaptcha.render()
  });
});

router.post('/signin', signinLimiter, async (req, res) => {
  const isJson = req.headers['content-type']?.includes('application/json');
  const { email, password } = req.body;

  // Tìm user theo email
  const user = await userModel.findByEmail(email);
  if (!user) {
    const msg = 'Invalid email or password.';
    if (isJson) return res.status(401).json({ error: true, message: msg });
    return res.render('vwAccount/signin', { error: true, oldData: { email } });
  }

  // So sánh mật khẩu
  const password_match = bcrypt.compareSync(password, user.password_hash);
  if (!password_match) {
    const msg = 'Invalid email or password.';
    if (isJson) return res.status(401).json({ error: true, message: msg });
    return res.render('vwAccount/signin', { error: true, oldData: { email } });
  }

  // Kiểm tra xác thực email
  if (user.is_verified === false) {
    const msg = 'Your email is not verified.';
    if (isJson) return res.status(403).json({ error: true, message: msg });
    return res.render('vwAccount/verify-email', { email: user.email, error: msg });
  }

  // Kiểm tra trạng thái bị ban
  const banInfo = userModel.isCurrentlyBanned(user);
  if (banInfo.banned) {
    const msg = banInfo.permanent
      ? 'Your account has been permanently banned.'
      : `Your account is temporarily banned until ${new Date(banInfo.until).toLocaleString()}.`;
    if (isJson) return res.status(403).json({ error: true, message: msg, banned: true, permanent: !!banInfo.permanent, until: banInfo.until || null });
    return res.render('vwAccount/signin', { error: true, banMessage: msg, oldData: { email } });
  }

  // Lưu session
  req.session.isAuthenticated = true;
  req.session.authUser = user;

  const retUrl = req.session.retUrl || '/';
  delete req.session.retUrl;

  // ✅ Nếu là AJAX, trả JSON thay vì redirect
  if (isJson) {
    return res.json({ success: true, message: 'Login successful', redirect: retUrl });
  }

  // Nếu là form thường → redirect như cũ
  res.redirect(retUrl);
});

router.post('/signout', (req, res) => {
  req.session.isAuthenticated = false;
  req.session.authUser = null;
  req.session.retUrl = '/';
  res.redirect('/');
});

router.get('/profile', restrict, (req, res) => {
  res.render('vwAccount/profile'); // user is already in res.locals from middleware
});

// Change password routes
router.get('/change-pwd', restrict, (req, res) => {
  res.render('vwAccount/change-pwd');
});

router.post('/change-pwd', restrict, async (req, res) => {
  const { user_id } = req.session.authUser;
  const { current_password, new_password, confirm_password } = req.body;

  if (!new_password || new_password.length < 6) {
    return res.render('vwAccount/change-pwd', { error: 'New password must be at least 6 characters.' });
  }
  if (new_password !== confirm_password) {
    return res.render('vwAccount/change-pwd', { error: 'Passwords do not match.' });
  }

  // Verify current password
  const user = await userModel.findById(user_id);
  if (!user) return res.render('vwAccount/change-pwd', { error: 'User not found.' });

  const ok = bcrypt.compareSync(current_password, user.password_hash);
  if (!ok) return res.render('vwAccount/change-pwd', { error: 'Current password is incorrect.' });

  const newHash = bcrypt.hashSync(new_password, 10);
  await userModel.patch(user_id, { password_hash: newHash });

  return res.render('vwAccount/change-pwd', { success: true });
});

router.post('/profile', restrict, async (req, res) => {
  const { fullName, email, avt_url } = req.body;
  const { user_id } = req.session.authUser;

  // Validation backend (đề phòng bypass)
  if (!fullName || !email) {
    if (req.headers['content-type'].includes('application/json')) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc.' });
    }
    return res.render('vwAccount/profile', {
      authUser: req.session.authUser,
      error: 'Full name và email là bắt buộc.'
    });
  }

  await userModel.patch(user_id, { full_name: fullName, email, avatar_url: avt_url });

  // Cập nhật session
  req.session.authUser = { ...req.session.authUser, full_name: fullName, email, avatar_url: avt_url };

  // Nếu là AJAX → trả JSON
  if (req.headers['content-type'].includes('application/json')) {
    return res.json({ success: true });
  }

  // Nếu form thường → render lại view
  res.render('vwAccount/profile', { success: true, authUser: req.session.authUser });
});

  // Forgot Password - Request reset token
  router.get('/forgot-password', (req, res) => {
    res.render('vwAccount/forgot-password');
  });

  router.post('/forgot-password', forgotLimiter, async (req, res) => {
    const { email } = req.body;
  
    if (!email || email.trim().length === 0) {
      return res.render('vwAccount/forgot-password', {
        error: 'Please enter your email address.'
      });
    }

    try {
      const user = await userModel.findByEmail(email);
    
      // Check if user exists
      if (!user) {
        return res.json({
          success: false,
          message: 'Email address not found. Please check and try again.'
        });
      }
    
      // Generate random 8-character token
      const token = Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
      await userModel.setResetToken(email, token, expiresAt);
    
      // Send email with token
      const emailSent = await sendResetEmail(email, token, user.full_name);
      if (!emailSent) {
        logger.error({ email }, 'Failed to send reset email');
        return res.json({
          success: false,
          message: 'Failed to send reset email. Please try again later or contact support.'
        });
      }
    
      // Return success response
      res.json({
        success: true,
        email: email
      });
    } catch (err) {
      logger.error({ err, email }, 'Forgot password error');
      res.json({
        success: false,
        message: 'An error occurred. Please try again.'
      });
    }
  });

  // Reset Password - Enter new password with token
  router.get('/reset-password', (req, res) => {
    const { email, token } = req.query;
    res.render('vwAccount/reset-password', {
      oldData: { email, token }
    });
  });

  router.post('/reset-password', resetLimiter, async (req, res) => {
    const { email, token, password, confirm_password } = req.body;
    const errorMessages = {};
    const oldData = { email, token };
  
    // Validation
    if (!email || !token) {
      return res.render('vwAccount/reset-password', {
        error: 'Invalid reset link.',
        oldData
      });
    }
  
    if (!password || password.length < 6) {
      errorMessages.password = ['Password must be at least 6 characters.'];
    }
    if (password !== confirm_password) {
      errorMessages.confirm_password = ['Passwords do not match.'];
    }
  
    if (Object.keys(errorMessages).length > 0) {
      return res.render('vwAccount/reset-password', {
        errorMessages,
        oldData
      });
    }
  
    try {
      // Verify token
      const user = await userModel.findByResetToken(email, token);
    
      if (!user) {
        return res.render('vwAccount/reset-password', {
          error: 'Invalid or expired reset token. Please request a new one.',
          oldData
        });
      }
    
      // Reset password
      const newHash = bcrypt.hashSync(password, 10);
      await userModel.resetPassword(user.user_id, newHash);
    
      // Redirect to signin with success message
      res.redirect('/account/signin?reset=success');
    } catch (err) {
      logger.error({ err, email }, 'Reset password error');
      res.render('vwAccount/reset-password', {
        error: 'An error occurred. Please try again.',
        oldData
      });
    }
  });

// (Password change routes keep logic intact; ensure column name password_hash is correct)

// Email verification pages
router.get('/verify-email', (req, res) => {
  const { email } = req.query;
  res.render('vwAccount/verify-email', { email });
});

router.post('/verify-email', async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token) {
    if (req.headers.accept?.includes('application/json')) {
      return res.json({ success: false, message: 'Please enter the verification code.' });
    }
    return res.render('vwAccount/verify-email', { email, error: 'Please enter the verification code.' });
  }
  try {
    const user = await userModel.findByResetToken(email, token);
    if (!user) {
      if (req.headers.accept?.includes('application/json')) {
        return res.json({ success: false, message: 'Invalid or expired code. Please try again.' });
      }
      return res.render('vwAccount/verify-email', { email, error: 'Invalid or expired code. Please try again.' });
    }
    await userModel.verifyEmail(user.user_id);
    if (req.headers.accept?.includes('application/json')) {
      return res.json({ success: true });
    }
    return res.render('vwAccount/signin', { success: 'Your email has been verified. Please sign in.' });
  } catch (err) {
    logger.error({ err, email }, 'Verify email error');
    if (req.headers.accept?.includes('application/json')) {
      return res.json({ success: false, message: 'An error occurred. Please try again.' });
    }
    return res.render('vwAccount/verify-email', { email, error: 'An error occurred. Please try again.' });
  }
});

router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    if (req.headers.accept?.includes('application/json')) {
      return res.json({ success: false, message: 'Email is required to resend verification.' });
    }
    return res.render('vwAccount/verify-email', { error: 'Email is required to resend verification.' });
  }
  try {
    const user = await userModel.findByEmail(email);
    if (!user) {
      if (req.headers.accept?.includes('application/json')) {
        return res.json({ success: false, message: 'Email not found.' });
      }
      return res.render('vwAccount/verify-email', { error: 'Email not found.' });
    }
    if (user.is_verified) {
      if (req.headers.accept?.includes('application/json')) {
        return res.json({ success: true, alreadyVerified: true });
      }
      return res.render('vwAccount/signin', { success: 'This email is already verified. Please sign in.' });
    }

    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await userModel.setResetToken(email, token, expiresAt);
    
    const emailSent = await sendVerifyEmail(email, token, user.full_name);
    if (!emailSent) {
      logger.error({ email }, 'Resend verification email failed');
      if (req.headers.accept?.includes('application/json')) {
        return res.json({ success: false, message: 'Failed to send verification email. Email service may be unavailable.' });
      }
      return res.render('vwAccount/verify-email', { email, error: 'Failed to send verification email. Email service may be unavailable.' });
    }
    
    if (req.headers.accept?.includes('application/json')) {
      return res.json({ success: true });
    }
    return res.render('vwAccount/verify-email', { email, success: 'Verification code resent. Please check your inbox.' });
  } catch (err) {
    logger.error({ err, email }, 'Resend verification error');
    if (req.headers.accept?.includes('application/json')) {
      return res.json({ success: false, message: 'An error occurred. Please try again.' });
    }
    return res.render('vwAccount/verify-email', { email, error: 'An error occurred. Please try again.' });
  }
});

export default router;
