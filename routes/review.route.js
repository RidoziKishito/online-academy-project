import express from 'express';
import * as reviewModel from '../models/review.model.js';
import * as enrollmentModel from '../models/enrollment.model.js';
import * as courseModel from '../models/courses.model.js';
import { restrict } from '../middlewares/auth.mdw.js';

const router = express.Router();

router.use(restrict);

// POST: Thêm hoặc cập nhật review
router.post('/course/:courseId', async (req, res) => {
  try {
    const userId = req.session.authUser.user_id;
    const courseId = Number(req.params.courseId);
    const { rating, comment } = req.body;

    // 1️⃣ Kiểm tra đã ghi danh chưa
    const isEnrolled = await enrollmentModel.checkEnrollment(userId, courseId);
    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'Bạn phải ghi danh khóa học để có thể đánh giá.',
      });
    }

    // 2️⃣ Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating phải từ 1 đến 5 sao.',
      });
    }

    // 3️⃣ Thêm hoặc cập nhật review
    const existing = await reviewModel.getUserReview(userId, courseId);
    if (existing) {
      await reviewModel.updateReview(userId, courseId, rating, comment);
    } else {
      await reviewModel.addReview(userId, courseId, rating, comment);
    }

    // 4️⃣ Sau khi lưu review → tính lại trung bình rating & số lượng
    const stats = await reviewModel.getCourseRatingStats(courseId);

    // ✅ Đảm bảo giá trị hợp lệ (fix lỗi Empty .update())
    const avg = stats && stats.avg_rating !== undefined && stats.avg_rating !== null
      ? Number(stats.avg_rating)
      : 0;
    const count = stats && stats.total_reviews !== undefined && stats.total_reviews !== null
      ? Number(stats.total_reviews)
      : 0;

    // 5️⃣ Cập nhật vào bảng courses
    await courseModel.updateCourseRating(courseId, avg, count);

    // 6️⃣ Trả kết quả JSON khớp với fetch ở frontend
    res.json({
      success: true,
      message: existing
        ? 'Cập nhật đánh giá thành công!'
        : 'Gửi đánh giá thành công!',
      rating_avg: avg,
      rating_count: count,
    });
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// DELETE: Xóa review
router.delete('/course/:courseId', async (req, res) => {
  try {
    const userId = req.session.authUser.user_id;
    const courseId = Number(req.params.courseId);

    await reviewModel.deleteReview(userId, courseId);

    // 1️⃣ Sau khi xóa, tính lại rating trung bình
    const stats = await reviewModel.getCourseRatingStats(courseId);

    // ✅ Fallback an toàn (fix lỗi tương tự)
    const avg = stats && stats.avg_rating !== undefined && stats.avg_rating !== null
      ? Number(stats.avg_rating)
      : 0;
    const count = stats && stats.total_reviews !== undefined && stats.total_reviews !== null
      ? Number(stats.total_reviews)
      : 0;

    // 2️⃣ Cập nhật lại vào bảng courses
    await courseModel.updateCourseRating(courseId, avg, count);

    res.json({
      success: true,
      message: 'Đã xóa đánh giá!',
      rating_avg: avg,
      rating_count: count,
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

export default router;
