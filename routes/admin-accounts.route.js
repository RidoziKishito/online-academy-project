import express from 'express';
import * as userModel from '../models/user.model.js';
import { restrict, isAdmin } from '../middlewares/auth.mdw.js';
import bcrypt from 'bcrypt';

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
      pagination: { currentPage: page, totalPages, totalItems: total, limit }
    });
  } catch (err) {
    next(err);
  }
});

// edit or create form
router.get('/edit', restrict, isAdmin, async (req, res, next) => {
  const id = req.query.id;
  const role = await userModel.getRoleOptions();
  if (!id) {
    // render create form
    return res.render('vwAdmin/account-edit', { role });
  }
  try {
    const user = await userModel.findById(id);
    res.render('vwAdmin/account-edit', { user, role });
  } catch (err) {
    next(err);
  }
});

// patch (create or update)
router.post('/patch', restrict, isAdmin, async (req, res, next) => {
  try {
    const { user_id, full_name, email, password, confirm_password, role } = req.body;
    const errorMessages = {};
    const oldData = { full_name, email, role, user_id };

    // If no user_id => create new (password required)
    if (!user_id) {
      if (!password || password.length < 6) {
        errorMessages.password = ['Password must be at least 6 characters.'];
      }
      if (password !== confirm_password) {
        errorMessages.confirm_password = ['Passwords do not match.'];
      }
      if (Object.keys(errorMessages).length > 0) {
        return res.render('vwAdmin/account-edit', { errorMessages, oldData });
      }

      const hash = await bcrypt.hash(password, 10);
      const newUser = { full_name, email, role, password_hash: hash };
      await userModel.add(newUser);
      return res.redirect('/admin/accounts');
    }

    // Update existing user: password optional
    if (password && password.trim().length > 0) {
      if (password.length < 6) {
        errorMessages.password = ['Password must be at least 6 characters.'];
      }
      if (password !== confirm_password) {
        errorMessages.confirm_password = ['Passwords do not match.'];
      }
    }

    if (Object.keys(errorMessages).length > 0) {
      return res.render('vwAdmin/account-edit', { errorMessages, oldData, user: { user_id, full_name, email, role } });
    }

    const patch = { full_name, email, role };
    if (password && password.trim().length > 0) {
      patch.password_hash = await bcrypt.hash(password, 10);
    }
    await userModel.patch(user_id, patch);
    res.redirect('/admin/accounts');
  } catch (err) {
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

export default router;
