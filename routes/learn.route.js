// routes/learn.route.js
import express from 'express';
import { restrict } from '../middlewares/auth.mdw.js';
import * as enrollmentModel from '../models/enrollment.model.js';
import * as courseModel from '../models/courses.model.js';
import * as chapterModel from '../models/chapter.model.js';
import * as lessonModel from '../models/lesson.model.js';
import * as progressModel from '../models/progress.model.js';
import logger from '../utils/logger.js';

const router = express.Router();

// All routes below require authentication
router.use(restrict);

// Route course overview -> redirect to first lesson
router.get('/:courseId', async (req, res) => {
  try {
    const userId = req.session.authUser.user_id;
    const courseId = parseInt(req.params.courseId, 10);

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
      return res.redirect(`/learn/${courseId}/lesson/${targetLesson.lesson_id}`);
    } else {
      return res.redirect(`/courses/detail/${courseId}`);
    }
  } catch (err) {
    logger.error({ err, courseId: req.params?.courseId }, 'learn.index error');
    return res.status(500).render('500', { message: 'Server error' });
  }
});

// Lesson watch page
router.get('/:courseId/lesson/:lessonId', async (req, res) => {
  try {
    const userId = req.session.authUser.user_id;
    const courseId = parseInt(req.params.courseId, 10);
    const lessonId = parseInt(req.params.lessonId, 10);

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

  // Mark lesson completed state
    const completedLessonIds = new Set(completedLessons.map(l => l.lesson_id));
    currentLesson.is_completed = completedLessonIds.has(currentLesson.lesson_id);

    allChapters.forEach(chapter => {
      chapter.lessons.forEach(lesson => {
        lesson.is_completed = completedLessonIds.has(lesson.lesson_id);
      });
    });

  // Compute previous/next lesson (flatten)
    const allLessons = [];
    allChapters.forEach(chapter => {
      chapter.lessons.forEach(lesson => allLessons.push(lesson));
    });

    const currentIndex = allLessons.findIndex(l => l.lesson_id == lessonId);
    const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

    res.render('vwLearn/watch', {
      course,
      chapters: allChapters,
      currentLesson,
      prevLesson,
      nextLesson,
      isEnrolled
    });
  } catch (err) {
    logger.error({ err, courseId: req.params?.courseId, lessonId: req.params?.lessonId }, 'learn.watch error');
    return res.status(500).render('500', { message: 'Server error' });
  }
});

// API to mark a lesson as completed
router.post('/mark-complete', async (req, res) => {
  try {
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

    const completedIds = new Set([...completedLessons.map(l => l.lesson_id), parseInt(lessonId, 10)]);

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
  } catch (err) {
    logger.error({ err, body: req.body }, 'mark-complete error');
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API to save video watch time
router.post('/progress', async (req, res) => {
  try {
    const userId = req.session.authUser.user_id;
    const { lessonId, watchTime } = req.body;

    if (progressModel.updateWatchTime && lessonId) {
      try {
        await progressModel.updateWatchTime(userId, lessonId, watchTime);
      } catch (e) {
        logger.warn({ err: e, lessonId, watchTime }, 'updateWatchTime warning');
      }
    }

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error, body: req.body }, 'Progress save error');
    res.status(500).json({ success: false });
  }
});

export default router;