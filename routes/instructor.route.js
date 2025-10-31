import express from 'express';
import bcrypt from 'bcrypt';
import * as instructorModel from '../models/instructors.model.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const list = await instructorModel.findAll();
  res.render('vwAdminInstructor/list', { instructors: list });
});

router.get('/add', (req, res) => {
  res.render('vwAdminInstructor/add');
});

router.post('/add', async (req, res) => {
  // When admin creates an instructor, generate a password for them
  const raw_password = Math.random().toString(36).slice(-8); // Generate random password
  const password_hash = bcrypt.hashSync(raw_password, 10);

  const instructor = {
    full_name: req.body.fullName,
    email: req.body.email,
    password_hash: password_hash,
    bio: req.body.bio || null
    // role will be added by the model automatically
  };

  await instructorModel.add(instructor);
  // Consider notifying the new instructor of their password
  res.render('vwAdminInstructor/add', { success: true, new_pass: raw_password });
});

// Edit, patch, and delete routes can remain the same as the model is correct
// Ensure form fields use correct names (user_id, full_name, email, bio...)

export default router;
