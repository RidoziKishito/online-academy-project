import express from 'express';
import { restrict } from '../middlewares/auth.mdw.js';
import * as enrollmentModel from '../models/enrollment.model.js';
import * as courseModel from '../models/courses.model.js';
import * as chapterModel from '../models/chapter.model.js';
import * as lessonModel from '../models/lesson.model.js';
import * as progressModel from '../models/progress.model.js';


const router = express.Router();

// Tất cả các route trong đây đều yêu cầu đăng nhập
router.use(restrict);

// Trang xem bài giảng
router.get('/:courseId/lesson/:lessonId', async (req, res) => {
  const userId = req.session.authUser.user_id;
  const courseId = req.params.courseId;
  const lessonId = req.params.lessonId;

  // 1. Kiểm tra xem học viên đã mua khóa học này chưa
  const isEnrolled = await enrollmentModel.checkEnrollment(userId, courseId);
  if (!isEnrolled) {
    // Nếu chưa mua, đá về trang chi tiết khóa học
    return res.redirect(`/courses/detail/${courseId}`);
  }

  // 2. Lấy toàn bộ dữ liệu cần thiết cho trang học
  const [course, allChapters, currentLesson, completedLessons] = await Promise.all([
    courseModel.findById(courseId),
    chapterModel.findChaptersWithLessonsByCourseId(courseId), // Cần hàm mới trong model
    lessonModel.findById(lessonId),
    progressModel.findCompletedLessonsByUser(userId, courseId)
  ]);

  if (!course || !currentLesson) {
    return res.redirect('/student/my-courses'); // Nếu course/lesson ko tồn tại
  }

  // 3. Đánh dấu bài học nào đã hoàn thành để hiển thị trên UI
  const completedLessonIds = new Set(completedLessons.map(l => l.lesson_id));
  allChapters.forEach(chapter => {
    chapter.lessons.forEach(lesson => {
      lesson.isCompleted = completedLessonIds.has(lesson.lesson_id);
    });
  });

  res.render('vwLearn/watch', {
    course,
    allChapters,
    currentLesson
  });
});

// API để đánh dấu bài học đã hoàn thành
router.post('/mark-complete', async (req, res) => {
  const userId = req.session.authUser.user_id;
  const { lessonId } = req.body;

  if (!lessonId) {
    return res.status(400).json({ success: false, message: 'Missing lessonId' });
  }

  await progressModel.markAsCompleted(userId, lessonId);
  res.json({ success: true });
});


export default router;
