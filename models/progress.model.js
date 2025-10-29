import db from '../utils/db.js';
import logger from '../utils/logger.js';

const TABLE_NAME = 'user_lesson_progress'; // Use a single consistent table name

// Mark a lesson as completed
// progress.model.js
// Assume `db` is a Knex instance and TABLE_NAME is the table name (e.g., 'user_lesson_progress')
export async function markAsCompleted(userId, lessonId) {
  // Use DB timestamp to avoid timezone issues between server and DB
  const now = db.fn.now();

  try {
    // Perform INSERT; on conflict (user_id, lesson_id) do MERGE (update) instead of creating a new row.
    // This is atomic at the DB level — avoids race conditions vs. check-then-insert.
    const rows = await db(TABLE_NAME)
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        // Mark as completed
        is_completed: true,
        // completed_at from DB
        completed_at: now
      })
      // onConflict requires a unique constraint on (user_id, lesson_id)
      .onConflict(['user_id', 'lesson_id'])
      // merge: update columns if row already exists
      .merge({
        is_completed: true,
        completed_at: now
      })
      // .returning(...) (Postgres) returns the inserted/updated row if needed
      .returning(['progress_id', 'user_id', 'lesson_id', 'is_completed', 'completed_at']);

    // rows is typically an array; return first row or true depending on app flow
    return rows && rows[0] ? rows[0] : true;
  } catch (error) {
    // Log error for debugging
    logger.error({ err: error, userId, lessonId }, 'markAsCompleted error');
    // Depending on workflow: rethrow to let caller handle
    throw error;
  }
}

// Get list of lessons completed by user in a course (if any)
export function findCompletedLessonsByUser(userId, courseId = null) {
  let query = db(TABLE_NAME)
    .join('lessons', `${TABLE_NAME}.lesson_id`, '=', 'lessons.lesson_id')
    .join('chapters', 'lessons.chapter_id', '=', 'chapters.chapter_id')
    .where(`${TABLE_NAME}.user_id`, userId);

  if (courseId) {
    query = query.where('chapters.course_id', courseId);
  }

  return query.select(`${TABLE_NAME}.lesson_id`);
}

// Count total lessons in a course
export async function countLessonsByCourse(courseId) {
  const result = await db('lessons')
    .join('chapters', 'lessons.chapter_id', 'chapters.chapter_id')
    .where('chapters.course_id', courseId)
    .count('lessons.lesson_id as total')
    .first();
  
  return parseInt(result?.total) || 0;
}

// Count lessons completed by user in a course
export async function countCompletedLessons(courseId, userId) {
  const result = await db(TABLE_NAME)
    .join('lessons', `${TABLE_NAME}.lesson_id`, '=', 'lessons.lesson_id')
    .join('chapters', 'lessons.chapter_id', '=', 'chapters.chapter_id')
    .where('chapters.course_id', courseId)
    .andWhere(`${TABLE_NAME}.user_id`, userId)
    .count(`${TABLE_NAME}.lesson_id as completed`)
    .first();
  
  return parseInt(result?.completed) || 0;
}

// Get detailed learning progress of a user in a course
export function findLessonProgressOfUser(courseId, userId) {
  return db('lessons')
    .join('chapters', 'lessons.chapter_id', 'chapters.chapter_id')
    .leftJoin(TABLE_NAME, function () {
      this.on(`${TABLE_NAME}.lesson_id`, '=', 'lessons.lesson_id')
        .andOn(`${TABLE_NAME}.user_id`, '=', db.raw('?', [userId]));
    })
    .where('chapters.course_id', courseId)
    .select(
      'chapters.title as chapter_title',
      'lessons.title as lesson_title',
      db.raw(`CASE WHEN ${TABLE_NAME}.lesson_id IS NULL THEN 0 ELSE 1 END as is_completed`),
      `${TABLE_NAME}.completed_at as completed_at`
    )
    .orderBy('chapters.chapter_id')
    .orderBy('lessons.lesson_id');
}

// Get all lessons completed by user (across all courses)
export async function findCompletedLessonsByUserAll(userId) {
  return db(TABLE_NAME)
    .where('user_id', userId)
    .select('*');
}