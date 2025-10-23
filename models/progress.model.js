import db from '../utils/db.js';

const TABLE_NAME = 'user_lesson_progress';

export function markAsCompleted(userId, lessonId) {
  // Dùng onConflict để không bị lỗi nếu đã tồn tại (UPSERT)
  return db(TABLE_NAME)
    .insert({ user_id: userId, lesson_id: lessonId })
    .onConflict(['user_id', 'lesson_id'])
    .ignore();
}

export function findCompletedLessonsByUser(userId, courseId) {
  return db(TABLE_NAME)
    .join('lessons', 'user_lesson_progress.lesson_id', '=', 'lessons.lesson_id')
    .join('chapters', 'lessons.chapter_id', '=', 'chapters.chapter_id')
    .where('user_lesson_progress.user_id', userId)
    .andWhere('chapters.course_id', courseId)
    .select('user_lesson_progress.lesson_id');
}

// Đếm tổng lesson trong 1 khóa học
export async function countLessonsByCourse(courseId) {
  const result = await db('lessons')
    .join('chapters', 'lessons.chapter_id', 'chapters.chapter_id')
    .where('chapters.course_id', courseId)
    .count('lessons.lesson_id as total')
    .first();
  return result?.total || 0;
}

// Đếm số lesson học viên đã hoàn thành trong khóa
export async function countCompletedLessons(courseId, userId) {
  const result = await db(TABLE_NAME)
    .join('lessons', 'user_lesson_progress.lesson_id', '=', 'lessons.lesson_id')
    .join('chapters', 'lessons.chapter_id', '=', 'chapters.chapter_id')
    .where('chapters.course_id', courseId)
    .andWhere('user_lesson_progress.user_id', userId)
    .count('user_lesson_progress.lesson_id as completed')
    .first();
  return result?.completed || 0;
}

export function findLessonProgressOfUser(courseId, userId) {
  return db('lessons')
    .join('chapters', 'lessons.chapter_id', 'chapters.chapter_id')
    .leftJoin('user_lesson_progress', function () {
      this.on('user_lesson_progress.lesson_id', '=', 'lessons.lesson_id')
        .andOn('user_lesson_progress.user_id', '=', db.raw('?', [userId]));
    })
    .where('chapters.course_id', courseId)
    .select(
      'chapters.title as chapter_title',
      'lessons.title as lesson_title',
      db.raw('CASE WHEN user_lesson_progress.lesson_id IS NULL THEN 0 ELSE 1 END as is_completed'),
      'user_lesson_progress.completed_at as completed_at'
    )
    .orderBy('chapters.chapter_id')
    .orderBy('lessons.lesson_id');
}