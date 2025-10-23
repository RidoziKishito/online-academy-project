import express from 'express';
import * as reviewModel from '../models/review.model.js';
import * as enrollmentModel from '../models/enrollment.model.js';
import { restrict } from '../middlewares/auth.mdw.js';

const router = express.Router();

router.use(restrict);

// POST: Thêm/cập nhật review
router.post('/course/:courseId', async (req, res) => {
    try {
        const userId = req.session.authUser.user_id;
        const courseId = req.params.courseId;
        const { rating, comment } = req.body;

        // Kiểm tra đã enroll khóa học chưa
        const isEnrolled = await enrollmentModel.checkEnrollment(userId, courseId);
        if (!isEnrolled) {
            return res.status(403).json({ 
                success: false, 
                message: 'Bạn phải ghi danh khóa học để có thể đánh giá' 
            });
        }

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ 
                success: false, 
                message: 'Rating phải từ 1 đến 5 sao' 
            });
        }

        // Kiểm tra đã review chưa
        const existingReview = await reviewModel.getUserReview(userId, courseId);
        
        if (existingReview) {
            await reviewModel.updateReview(userId, courseId, rating, comment);
        } else {
            await reviewModel.addReview(userId, courseId, rating, comment);
        }

        res.json({ success: true, message: 'Đánh giá đã được lưu!' });
    } catch (error) {
        console.error('Review error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// DELETE: Xóa review
router.delete('/course/:courseId', async (req, res) => {
    try {
        const userId = req.session.authUser.user_id;
        const courseId = req.params.courseId;

        await reviewModel.deleteReview(userId, courseId);
        res.json({ success: true, message: 'Đã xóa đánh giá!' });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

export default router;