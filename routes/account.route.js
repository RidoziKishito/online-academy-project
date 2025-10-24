import express from 'express';
import bcrypt from 'bcryptjs';
import * as userModel from '../models/user.model.js';
import { restrict } from '../middlewares/auth.mdw.js';
import { sendResetEmail } from '../utils/mailer.js';

const router = express.Router();

router.get('/signup', (req, res) => {
  res.render('vwAccount/signup');
});

router.post('/signup', async (req, res) => {
  const { fullName, email, password, confirm_password, role } = req.body;
  const oldData = { fullName, email, role };
  const errorMessages = {};

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

  // Validate role (required, must be student or instructor)
  if (!role || (role !== 'student' && role !== 'instructor')) {
    errorMessages.role = ['Please select account type: student or instructor.'];
  }

  if (Object.keys(errorMessages).length > 0) {
    return res.render('vwAccount/signup', { oldData, errorMessages });
  }

  try {
    // Hash password
    const password_hash = bcrypt.hashSync(password, 10);
    const user = {
      full_name: fullName,
      email,
      password_hash,
      role: role || 'student'
    };

    const inserted = await userModel.add(user); // returns user_id
    // Optionally, you can auto-login here. For now, just show success.
    return res.render('vwAccount/signup', { success: true });
  } catch (err) {
    // Handle unique constraint (email) for Postgres
    if (err && err.code === '23505') {
      // Unique violation
      errorMessages.email = ['Email already in use.'];
      return res.render('vwAccount/signup', { oldData, errorMessages });
    }
    console.error(err);
    errorMessages._global = ['An unexpected error occurred. Please try again later.'];
    return res.render('vwAccount/signup', { oldData, errorMessages });
  }
});

// Route kiểm tra email đã tồn tại chưa
router.get('/is-email-available', async (req, res) => {
  const email = req.query.email;
  const user = await userModel.findByEmail(email);
  if (!user) {
    return res.json(true);
  }
  res.json(false);
});

router.get('/signin', (req, res) => {
  res.render('vwAccount/signin', { error: false });
});

router.post('/signin', async (req, res) => {
  // Tìm user bằng email, không phải username
  const user = await userModel.findByEmail(req.body.email);
  if (!user) {
    return res.render('vwAccount/signin', { error: true, oldData: { email: req.body.email } });
  }

  // So sánh mật khẩu với password_hash
  const password_match = bcrypt.compareSync(req.body.password, user.password_hash);
  if (password_match === false) {
    return res.render('vwAccount/signin', { error: true, oldData: { email: req.body.email } });
  }

  req.session.isAuthenticated = true;
  req.session.authUser = user;

  const retUrl = req.session.retUrl || '/';
  delete req.session.retUrl;
  res.redirect(retUrl);
});

router.post('/signout', (req, res) => {
  req.session.isAuthenticated = false;
  req.session.authUser = null;
  res.redirect(req.headers.referer || '/');
});

router.get('/profile', restrict, (req, res) => {
  res.render('vwAccount/profile'); // user đã có trong res.locals từ middleware
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
  const { user_id } = req.session.authUser;
  
  // Dữ liệu cần cập nhật
  const updatedUser = {
    full_name: req.body.fullName,
    email: req.body.email
  };
  await userModel.patch(user_id, updatedUser);

  // Cập nhật lại session
  req.session.authUser.full_name = req.body.fullName;
  req.session.authUser.email = req.body.email;

  res.render('vwAccount/profile', { success: true });
});

  // Forgot Password - Request reset token
  router.get('/forgot-password', (req, res) => {
    res.render('vwAccount/forgot-password');
  });

  router.post('/forgot-password', async (req, res) => {
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
      try {
        await sendResetEmail(email, token, user.full_name);
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError);
        return res.json({
          success: false,
          message: 'Failed to send reset email. Please try again later.'
        });
      }
    
      // Return success response
      res.json({
        success: true,
        email: email
      });
    } catch (err) {
      console.error('Forgot password error:', err);
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

  router.post('/reset-password', async (req, res) => {
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
      console.error('Reset password error:', err);
      res.render('vwAccount/reset-password', {
        error: 'An error occurred. Please try again.',
        oldData
      });
    }
  });

// (Các route đổi mật khẩu có thể giữ nguyên logic, chỉ cần đảm bảo tên cột password_hash là đúng)

export default router;
