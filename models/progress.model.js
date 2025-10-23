import db from '../utils/db.js';

const TABLE_NAME = 'user_lesson_progress';

export async function markAsCompleted(userId, lessonId) {
  try {
    // MySQL: ON DUPLICATE KEY UPDATE
    await db(TABLE_NAME)
      .insert({ 
        user_id: userId, 
        lesson_id: lessonId,
        completed_at: new Date()
      })
      .onDuplicateUpdate({
        completed_at: new Date()
      });
    
    return true;
  } catch (error) {
    console.error('markAsCompleted error:', error);
    
    // Fallback: dùng cách check-then-insert
    const exists = await db(TABLE_NAME)
      .where({ user_id: userId, lesson_id: lessonId })
      .first();
    
    if (!exists) {
      await db(TABLE_NAME).insert({
        user_id: userId,
        lesson_id: lessonId,
        completed_at: new Date()
      });
    }
    
    return true;
  }
}

export function findCompletedLessonsByUser(userId, courseId) {
  return db(TABLE_NAME)
    .join('lessons', 'user_lesson_progress.lesson_id', '=', 'lessons.lesson_id')
    .join('chapters', 'lessons.chapter_id', '=', 'chapters.chapter_id')
    .where('user_lesson_progress.user_id', userId)
    .andWhere('chapters.course_id', courseId)
    .select('user_lesson_progress.lesson_id');
}