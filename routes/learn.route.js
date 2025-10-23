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

// Route course overview -> redirect to first lesson
router.get('/:courseId', async (req, res) => {
  const userId = req.session.authUser.user_id;
  const courseId = req.params.courseId;

  const isEnrolled = await enrollmentModel.checkEnrollment(userId, courseId);
  if (!isEnrolled) {
    return res.redirect(`/courses/detail/${courseId}`);
  }

  // Get chapters and completed lessons
  const [allChapters, completedLessons] = await Promise.all([
    chapterModel.findChaptersWithLessonsByCourseId(courseId),
    progressModel.findCompletedLessonsByUser(userId, courseId)
  ]);

  const completedIds = new Set(completedLessons.map(l => l.lesson_id));
  
  // Find next unfinished lesson or first lesson
  let targetLesson = null;
  for (const chapter of allChapters) {
    for (const lesson of chapter.lessons) {
      if (!completedIds.has(lesson.lesson_id)) {
        targetLesson = lesson;
        break;
      }
    }
    if (targetLesson) break;
  }

  // If no unfinished lesson, go to first lesson
  if (!targetLesson && allChapters[0]?.lessons[0]) {
    targetLesson = allChapters[0].lessons[0];
  }

  if (targetLesson) {
    res.redirect(`/learn/${courseId}/lesson/${targetLesson.lesson_id}`);
  } else {
    res.redirect(`/courses/detail/${courseId}`);
  }
});
// Trang xem bài giảng
router.get('/:courseId/lesson/:lessonId', async (req, res) => {
  const userId = req.session.authUser.user_id;
  const courseId = req.params.courseId;
  const lessonId = req.params.lessonId;

  const isEnrolled = await enrollmentModel.checkEnrollment(userId, courseId);
  if (!isEnrolled) {
    return res.redirect(`/courses/detail/${courseId}`);
  }

  const [course, allChapters, currentLesson, completedLessons] = await Promise.all([
    courseModel.findById(courseId),
    chapterModel.findChaptersWithLessonsByCourseId(courseId),
    lessonModel.findById(lessonId),
    progressModel.findCompletedLessonsByUser(userId, courseId)
  ]);

  if (!course || !currentLesson) {
    return res.redirect('/student/my-courses');
  }

  // Đánh dấu bài học đã hoàn thành
  const completedLessonIds = new Set(completedLessons.map(l => l.lesson_id));

  currentLesson.is_completed = completedLessonIds.has(currentLesson.lesson_id);

  allChapters.forEach(chapter => {
    chapter.lessons.forEach(lesson => {
      lesson.isCompleted = completedLessonIds.has(lesson.lesson_id);
    });
  });

  // Tính toán previous/next lesson
  const allLessons = [];
  allChapters.forEach(chapter => {
    chapter.lessons.forEach(lesson => allLessons.push(lesson));
  });

  const currentIndex = allLessons.findIndex(l => l.lesson_id == lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // CHỈ render 1 lần duy nhất
  res.render('vwLearn/watch', {
    course,
    allChapters,
    currentLesson,
    prevLesson,
    nextLesson
  });
});

// API để đánh dấu bài học đã hoàn thành
router.post('/mark-complete', async (req, res) => {
  const userId = req.session.authUser.user_id;
  const { lessonId, courseId } = req.body;

  if (!lessonId || !courseId) {
    return res.status(400).json({ success: false, message: 'Missing data' });
  }

  await progressModel.markAsCompleted(userId, lessonId);

  // Find next lesson
  const [allChapters, completedLessons] = await Promise.all([
    chapterModel.findChaptersWithLessonsByCourseId(courseId),
    progressModel.findCompletedLessonsByUser(userId, courseId)
  ]);

  const completedIds = new Set([...completedLessons.map(l => l.lesson_id), parseInt(lessonId)]);
  
  let nextLesson = null;
  for (const chapter of allChapters) {
    for (const lesson of chapter.lessons) {
      if (!completedIds.has(lesson.lesson_id)) {
        nextLesson = lesson;
        break;
      }
    }
    if (nextLesson) break;
  }

  res.json({ 
    success: true, 
    nextLesson: nextLesson ? `/learn/${courseId}/lesson/${nextLesson.lesson_id}` : null 
  });
});
router.post('/progress', async (req, res) => {
    try {
        const userId = req.session.authUser.user_id;
        const { lessonId, watchTime } = req.body;
        
        // Lưu thời gian xem (nếu cần)
        // await progressModel.updateWatchTime(userId, lessonId, watchTime);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Progress save error:', error);
        res.status(500).json({ success: false });
    }
});

export default router;
