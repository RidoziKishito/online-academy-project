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
  // Khi admin tạo instructor, cần tạo mật khẩu cho họ
  const raw_password = Math.random().toString(36).slice(-8); // Tạo pass ngẫu nhiên
  const password_hash = bcrypt.hashSync(raw_password, 10);

  const instructor = {
    full_name: req.body.fullName,
    email: req.body.email,
    password_hash: password_hash,
    bio: req.body.bio || null
    // role sẽ được model tự động thêm vào
  };

  await instructorModel.add(instructor);
  // Nên có cơ chế thông báo mật khẩu cho instructor mới
  res.render('vwAdminInstructor/add', { success: true, new_pass: raw_password });
});

// Các route edit, patch, del có thể giữ nguyên vì model đã được sửa đúng
// Chỉ cần đảm bảo form gửi lên đúng tên trường (user_id, full_name, email, bio...)

export default router;
