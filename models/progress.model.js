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