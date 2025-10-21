import express from 'express';
import { restrict } from '../middlewares/auth.mdw.js';
import * as enrollmentModel from '../models/enrollment.model.js';
import * as wishlistModel from '../models/wishlist.model.js';

const router = express.Router();

// Áp dụng middleware cho tất cả route trong file này
router.use(restrict);

// Trang "Các khóa học của tôi"
router.get('/my-courses', async (req, res) => {
    const userId = req.session.authUser.user_id;
    const courses = await enrollmentModel.findCoursesByUserId(userId);
    res.render('vwStudent/my-courses', { courses });
});

// Trang "Danh sách yêu thích"
router.get('/my-wishlist', async (req, res) => {
    const userId = req.session.authUser.user_id;
    const courses = await wishlistModel.findCoursesByUserId(userId);
    res.render('vwStudent/my-wishlist', { courses });
});

// API thêm vào wishlist (dùng với fetch API từ client)
router.post('/wishlist/add', async (req, res) => {
    const userId = req.session.authUser.user_id;
    const { courseId } = req.body;
    await wishlistModel.add(userId, courseId);
    res.json({ success: true });
});

// API xóa khỏi wishlist
router.post('/wishlist/remove', async (req, res) => {
    const userId = req.session.authUser.user_id;
    const { courseId } = req.body;
    await wishlistModel.remove(userId, courseId);
    res.json({ success: true });
});

export default router;