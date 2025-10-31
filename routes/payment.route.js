// routes/payment.js
import express from 'express';
import { restrict } from '../middlewares/auth.mdw.js';
import * as enrollmentModel from '../models/enrollment.model.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Ensure the user is signed in
router.use(restrict);

// POST confirm payment -> create enrollment and redirect to learning page
router.post('/confirm', async (req, res) => {
  try {
    const user = req.session?.authUser;
    if (!user) return res.status(401).send('Unauthorized');

    const courseId = parseInt(req.body.course_id, 10);
    if (!courseId) return res.status(400).send('Invalid course id');

    // 1) Check if already enrolled (avoid duplicate)
    const exists = await enrollmentModel.checkEnrollment(user.user_id, courseId);
    if (exists) {
      // If already exists, go straight to learning page
      return res.redirect(`/student/my-courses`);
    }

    // 2) Create enrollment
    await enrollmentModel.enroll({
      user_id: user.user_id,
      course_id: courseId,
      enrolled_at: new Date()
    });

    // 3) Redirect to learning page or course detail
    return res.redirect(`/student/my-courses`);
  } catch (err) {
    logger.error({ err, userId: req.session?.authUser?.user_id, body: req.body }, 'payment.confirm error');
    // Render error page or redirect back
    return res.status(500).render('500', { message: 'An error occurred while enrolling' });
  }
});

export default router;
