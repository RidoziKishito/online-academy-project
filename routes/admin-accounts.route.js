import express from 'express';
import * as userModel from '../models/user.model.js';
import { restrict, isAdmin } from '../middlewares/auth.mdw.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// list all users
router.get('/', restrict, isAdmin, async (req, res, next) => {
  try {
    const users = await userModel.findAll();
    res.render('vwAdmin/accounts-list', { users });
  } catch (err) {
    next(err);
  }
});

// edit or create form
router.get('/edit', restrict, isAdmin, async (req, res, next) => {
  const id = req.query.id;
  if (!id) {
    // render create form
    return res.render('vwAdmin/account-edit');
  }
  try {
    const user = await userModel.findById(id);
    res.render('vwAdmin/account-edit', { user });
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

export default router;
