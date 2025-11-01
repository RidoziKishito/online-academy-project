import express from 'express';
import * as userModel from '../models/user.model.js';
import { restrict, isAdmin } from '../middlewares/auth.mdw.js';
import bcrypt from 'bcrypt';
import { sendInstructorAccountEmail } from '../utils/mailer.js';
import logger from '../utils/logger.js';

const router = express.Router();

// list users with pagination (supports AJAX JSON)
router.get('/', restrict, isAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const filters = {
      role: req.query.role || null,
      isVerified: req.query.is_verified || null,
      isBanned: req.query.is_banned || null,
      limit,
      offset
    };

    const [users, total, roles] = await Promise.all([
      userModel.findAllFiltered(filters),
      userModel.countAllFiltered(filters),
      userModel.getRoleOptions()
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({
        users,
        pagination: { currentPage: page, totalPages, totalItems: total, limit }
      });
    }

    res.render('vwAdmin/accounts-list', {
      users,
      roles,
      currentRole: filters.role,
      currentVerified: filters.isVerified,
      currentBanned: filters.isBanned,
      pagination: { currentPage: page, totalPages, totalItems: total, limit }
    });
  } catch (err) {
    next(err);
  }
});

// create form
router.get('/create', restrict, isAdmin, async (req, res, next) => {
  try {
    const role = await userModel.getRoleOptions();
    res.render('vwAdmin/account-create', { role });
  } catch (err) {
    next(err);
  }
});

// edit form
router.get('/edit/:id', restrict, isAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const role = await userModel.getRoleOptions();
    const user = await userModel.findById(id);
    if (!user) return res.redirect('/admin/accounts?error=not_found');
    res.render('vwAdmin/account-edit', { user, role });
  } catch (err) {
    next(err);
  }
});

// backward-compat: redirect old query style to new routes
router.get('/edit', restrict, isAdmin, async (req, res) => {
  const id = req.query.id;
  if (!id) return res.redirect('/admin/accounts/create');
  return res.redirect(`/admin/accounts/edit/${id}`);
});

// patch (create or update)
// create user
router.post('/create', restrict, isAdmin, async (req, res, next) => {
  try {
    const { full_name, email, password, role } = req.body;
    const isJson = req.headers['content-type']?.includes('application/json');

      // No server-side validation: trust client-side checks
      const hash = await bcrypt.hash(password ?? '', 10);
      const newUser = { full_name, email, role, password_hash: hash };
      // Auto-verify instructors created by admin and email credentials
      if (role === 'instructor') {
        newUser.is_verified = true;
      }
      let insertedId;
      try {
        [insertedId] = await userModel.add(newUser);
      } catch (e) {
        // Handle unique constraint gracefully
        if (e && e.code === '23505') {
          const message = 'Email is already registered. Please edit the existing user or use another email.';
          if (isJson) return res.status(400).json({ success: false, message, code: 'email_exists' });
          return res.redirect('/admin/accounts?error=email_exists');
        }
        throw e;
      }

      // Send welcome email to instructor (non-blocking)
      let emailWarning = null;
      if (role === 'instructor') {
        const emailSent = await sendInstructorAccountEmail(email, full_name, password);
        if (!emailSent) {
          logger.warn({ email }, 'Failed to send instructor account email - admin should inform user manually');
          emailWarning = 'Account created successfully, but failed to send welcome email. Please inform the instructor manually.';
        }
      }

      if (isJson) {
        return res.json({ 
          success: true, 
          message: emailWarning || 'Account created successfully.',
          warning: emailWarning ? true : false
        });
      }
      
      // For non-JSON, redirect with success message (email failure is logged but not blocking)
      return res.redirect('/admin/accounts?success=created');

  } catch (err) {
  logger.error({ err }, 'Account create error');
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(500).json({ success: false, message: 'Server error occurred.' });
    }
    next(err);
  }
});

// update existing user
router.post('/edit/:id', restrict, isAdmin, async (req, res, next) => {
  try {
    const user_id = parseInt(req.params.id);
    const { full_name, email, password, role } = req.body;
    const isJson = req.headers['content-type']?.includes('application/json');

    const current = await userModel.findById(user_id);
    if (!current) {
      if (isJson) return res.status(404).json({ success: false, message: 'User not found' });
      return res.redirect('/admin/accounts?error=not_found');
    }

    const patchData = { full_name, email, role };
    if (password && password.trim().length > 0) {
      patchData.password_hash = await bcrypt.hash(password, 10);
    }

    try {
      await userModel.patch(user_id, patchData);
    } catch (e) {
      if (e && e.code === '23505') {
        const message = 'Email is already used by another account.';
        if (isJson) return res.status(400).json({ success: false, message, code: 'email_exists' });
        return res.redirect('/admin/accounts?error=email_exists');
      }
      throw e;
    }

    if (isJson) return res.json({ success: true, message: 'Account updated successfully.' });
    res.redirect('/admin/accounts');
  } catch (err) {
    logger.error({ err }, 'Account update error');
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(500).json({ success: false, message: 'Server error occurred.' });
    }
    next(err);
  }
});

// delete user (blocked if is_verified === true)
router.post('/delete/:id', restrict, isAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const user = await userModel.findById(id);
    if (!user) {
      const msg = 'User not found';
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(404).json({ ok: false, error: msg });
      }
      return res.redirect('/admin/accounts?error=not_found');
    }

    if (user.is_verified === true) {
      const msg = 'Cannot delete a verified user.';
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(400).json({ ok: false, error: msg, code: 'verified' });
      }
      return res.redirect('/admin/accounts?error=verified');
    }

    await userModel.del(id);

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ ok: true });
    }
    res.redirect('/admin/accounts?action=deleted');
  } catch (err) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ ok: false, error: 'Delete failed' });
    }
    next(err);
  }
});

// Ban a user (permanently or temporarily)
router.post('/ban/:id', restrict, isAdmin, async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id);
    const adminId = req.session.authUser?.user_id;
    const { type, reason, until, durationHours } = req.body || {};

    const user = await userModel.findById(targetId);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ ok: false, error: "Cannot ban an admin account." });

    let permanent = false;
    let untilDate = null;
    if (String(type) === 'permanent') {
      permanent = true;
    } else {
      if (until) {
        const parsed = new Date(until);
        if (isNaN(parsed.getTime())) return res.status(400).json({ ok: false, error: 'Invalid until datetime' });
        untilDate = parsed;
      } else if (durationHours) {
        const hours = parseFloat(durationHours);
        if (isNaN(hours) || hours <= 0) return res.status(400).json({ ok: false, error: 'Invalid duration hours' });
        untilDate = new Date(Date.now() + hours * 3600 * 1000);
      } else {
        return res.status(400).json({ ok: false, error: 'Provide until or durationHours for temporary ban' });
      }
    }

    await userModel.banUser(targetId, { permanent, until: untilDate, reason, adminId });
    return res.json({ ok: true });
  } catch (err) {
  logger.error({ err }, 'Ban error');
    return res.status(500).json({ ok: false, error: 'Ban failed' });
  }
});

// Unban a user
router.post('/unban/:id', restrict, isAdmin, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const user = await userModel.findById(targetId);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    await userModel.unbanUser(targetId);
    return res.json({ ok: true });
  } catch (err) {
  logger.error({ err }, 'Unban error');
    return res.status(500).json({ ok: false, error: 'Unban failed' });
  }
});

export default router;
