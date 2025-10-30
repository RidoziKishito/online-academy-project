import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { restrict, isInstructor } from '../middlewares/auth.mdw.js';
import * as instructorModel from '../models/instructors.model.js';


const router = express.Router();

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute path to static/videos directory
const uploadDir = path.join(__dirname, '..', 'static', 'videos');
// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

router.get('/', async (req, res) =>
{
  const list = await instructorModel.findAll();
  res.render('vwAdminInstructor/list', { instructors: list });
});

router.get('/add', (req, res) =>
{
  res.render('vwAdminInstructor/add');
});

router.post('/add', async (req, res) =>
{
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

const storage = multer.diskStorage({
  destination: (req, file, cb) =>
  {
    cb(null, uploadDir); // Lưu vào thư mục static/videos (absolute)
  },
  filename: (req, file, cb) =>
  {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // Giới hạn 500MB
  fileFilter: (req, file, cb) =>
  {
    const allowedTypes = /mp4|avi|mov|wmv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname)
    {
      return cb(null, true);
    } else
    {
      cb(new Error('Only video files are allowed!'));
    }
  }
});
router.post('/upload-video', restrict, isInstructor, (req, res) =>
{
  upload.single('video')(req, res, (err) =>
  {
    try
    {
      if (err)
      {
        console.error('Multer error:', err);
        return res.status(400).json({ success: false, error: err.message });
      }

      if (!req.file)
      {
        return res.status(400).json({ success: false, error: 'No video file uploaded' });
      }

      // Đường dẫn file video (có thể lưu trong public/videos)
      const videoPath = `/videos/${req.file.filename}`;

      return res.json({
        success: true,
        videoPath: videoPath,
      });

    } catch (error)
    {
      console.error('Upload video error:', error);
      return res.status(500).json({ success: false, error: 'Failed to upload video' });
    }
  });
});


export default router;
