// routes/payment.js
import express from 'express';
import { restrict } from '../middlewares/auth.mdw.js';
import * as enrollmentModel from '../models/enrollment.model.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Bảo đảm user đã đăng nhập
router.use(restrict);

// POST confirm payment -> ghi enrollment và redirect về /learn/:courseId
router.post('/confirm', async (req, res) => {
  try {
    const user = req.session?.authUser;
    if (!user) return res.status(401).send('Unauthorized');

    const courseId = parseInt(req.body.course_id, 10);
    if (!courseId) return res.status(400).send('Invalid course id');

    // 1) kiểm tra đã ghi danh chưa (tránh duplicate)
    const exists = await enrollmentModel.checkEnrollment(user.user_id, courseId);
    if (exists) {
      // Nếu đã có, chuyển thẳng tới trang học
      return res.redirect(`/student/my-courses`);
    }

    // 2) tạo enrollment
    await enrollmentModel.enroll({
      user_id: user.user_id,
      course_id: courseId,
      enrolled_at: new Date()
    });

    // 3) redirect tới trang học hoặc course detail (tuỳ bạn)
    return res.redirect(`/student/my-courses`);
  } catch (err) {
    logger.error({ err, userId: req.session?.authUser?.user_id, body: req.body }, 'payment.confirm error');
    // Tùy app của bạn: render error page hoặc redirect back with flash
    return res.status(500).render('500', { message: 'Có lỗi khi ghi danh' });
  }
});

export default router;
