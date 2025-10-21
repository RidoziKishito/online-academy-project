import express from 'express';
import { restrict, isInstructor } from '../middlewares/auth.mdw.js';
import * as courseModel from '../models/courses.model.js';

const router = express.Router();

// Tất cả route trong đây yêu cầu đăng nhập VÀ phải là instructor
router.use(restrict, isInstructor);

// Trang chính: danh sách các khóa học của tôi
router.get('/', async (req, res) => {
    const instructorId = req.session.authUser.user_id;
    const courses = await courseModel.findByInstructor(instructorId);
    res.render('vwInstructor/dashboard', { courses });
});

// Trang quản lý chi tiết 1 khóa học (thêm/sửa chương, bài giảng)
router.get('/manage-course/:id', async (req, res) => {
    // TODO: Thêm logic để lấy chi tiết khóa học, chương, bài giảng
    // Tương tự như route /learn
    res.send(`Trang quản lý cho khóa học ID: ${req.params.id}`);
});


export default router;
