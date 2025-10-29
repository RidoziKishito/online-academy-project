import express from 'express';
import * as reviewModel from '../models/review.model.js';
import * as enrollmentModel from '../models/enrollment.model.js';
import * as courseModel from '../models/courses.model.js';
import { restrict } from '../middlewares/auth.mdw.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.use(restrict);

// POST: Add or update a review
router.post('/course/:courseId', async (req, res) => {
  try {
    const userId = req.session.authUser.user_id;
    const courseId = Number(req.params.courseId);
    const { rating, comment } = req.body;

    // 1️⃣ Ensure the user is enrolled
    const isEnrolled = await enrollmentModel.checkEnrollment(userId, courseId);
    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'You must enroll in the course to leave a review.',
      });
    }

    // 2️⃣ Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5.',
      });
    }

    // 3️⃣ Insert or update review
    const existing = await reviewModel.getUserReview(userId, courseId);
    if (existing) {
      await reviewModel.updateReview(userId, courseId, rating, comment);
    } else {
      await reviewModel.addReview(userId, courseId, rating, comment);
    }

    // 4️⃣ After saving, recalculate average rating and count
    const stats = await reviewModel.getCourseRatingStats(courseId);

    // ✅ Ensure valid values (fix for empty .update())
    const avg = stats && stats.avg_rating !== undefined && stats.avg_rating !== null
      ? Number(stats.avg_rating)
      : 0;
    const count = stats && stats.total_reviews !== undefined && stats.total_reviews !== null
      ? Number(stats.total_reviews)
      : 0;

    // 5️⃣ Update the courses table
    await courseModel.updateCourseRating(courseId, avg, count);

    // 6️⃣ Return JSON matching frontend expectations
    res.json({
      success: true,
      message: existing
        ? 'Review updated successfully!'
        : 'Review submitted successfully!',
      rating_avg: avg,
      rating_count: count,
    });
  } catch (error) {
    logger.error({ err: error, userId: req.session?.authUser?.user_id, courseId: req.params?.courseId }, 'Review error');
    res.status(500).json({ success: false, message: 'Server error!' });
  }
});

// DELETE: Delete a review
router.delete('/course/:courseId', async (req, res) => {
  try {
    const userId = req.session.authUser.user_id;
    const courseId = Number(req.params.courseId);

    await reviewModel.deleteReview(userId, courseId);

    // 1️⃣ After deletion, recalculate average rating
    const stats = await reviewModel.getCourseRatingStats(courseId);

    // ✅ Safe fallback (same fix)
    const avg = stats && stats.avg_rating !== undefined && stats.avg_rating !== null
      ? Number(stats.avg_rating)
      : 0;
    const count = stats && stats.total_reviews !== undefined && stats.total_reviews !== null
      ? Number(stats.total_reviews)
      : 0;

    // 2️⃣ Update the courses table again
    await courseModel.updateCourseRating(courseId, avg, count);

    res.json({
      success: true,
      message: 'Review deleted!',
      rating_avg: avg,
      rating_count: count,
    });
  } catch (error) {
    logger.error({ err: error, userId: req.session?.authUser?.user_id, courseId: req.params?.courseId }, 'Delete review error');
    res.status(500).json({ success: false, message: 'Server error!' });
  }
});

export default router;
