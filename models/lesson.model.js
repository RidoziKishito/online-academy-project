import db from '../utils/db.js';

const TABLE_NAME = 'lessons';

export function findByChapterId(chapterId) {
  return db(TABLE_NAME)
    .where('chapter_id', chapterId)
    .orderBy('order_index', 'asc');
}

export async function add(lesson, trx) {
  const client = trx || db;
  try {
    return await client(TABLE_NAME)
      .insert(lesson)
      .returning('lesson_id');
  } catch (err) {
    // Sequence likely out of sync. If we're inside a transaction, bubble up so caller can reset outside the aborted trx.
    if (err && err.code === '23505' && String(err.constraint || '').includes('lessons_pkey')) {
      if (trx) {
        err.sequenceOutOfSync = true;
        err.table = 'lessons';
        throw err;
      }
      // If not in a trx, we can self-heal
      await db.raw(
        `SELECT setval(pg_get_serial_sequence('lessons','lesson_id'), COALESCE((SELECT MAX(lesson_id) FROM lessons), 0) + 1, false)`
      );
      return await db(TABLE_NAME)
        .insert(lesson)
        .returning('lesson_id');
    }
    throw err;
  }
}

export function findById(id) {
  return db(TABLE_NAME)
    .where('lesson_id', id)
    .first();
}

export function patch(id, lesson, trx) {
  return (trx || db)(TABLE_NAME)
    .where('lesson_id', id)
    .update(lesson);
}

export function del(id) {
  return db(TABLE_NAME).where('lesson_id', id).del();
}

// Helper: find lessons by multiple chapter IDs
export function findByChapterIds(chapterIds = []) {
  if (!chapterIds || chapterIds.length === 0) return Promise.resolve([]);
  return db(TABLE_NAME)
    .whereIn('chapter_id', chapterIds)
    .orderBy(['chapter_id', 'order_index']);
}

// Get lesson by chapter_id + lesson_id
export function findByChapterAndLesson(chapterId, lessonId) {
  return db(TABLE_NAME)
    .where({ chapter_id: chapterId, lesson_id: lessonId })
    .first();
}

// Utilities
export function del_lesson(id) {
  return db(TABLE_NAME)
    .where('lesson_id', id)
    .del();
}

export function updateOrder(lessonId, newOrder) {
  return db(TABLE_NAME)
    .where('lesson_id', lessonId)
    .update({ order_index: newOrder });
}

export function getMaxOrder(chapterId) {
  return db(TABLE_NAME)
    .where('chapter_id', chapterId)
    .max('order_index as max_order')
    .first()
    .then(result => (result.max_order || 0) + 1);
}

export async function reorderLessons(chapterId, lessonOrders) {
  const trx = await db.transaction();
  try {
    for (const { lesson_id, order_index } of lessonOrders) {
      await trx(TABLE_NAME)
        .where('lesson_id', lesson_id)
        .andWhere('chapter_id', chapterId)
        .update({ order_index });
    }
    await trx.commit();
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

export async function moveToChapter(lessonId, newChapterId, newOrder) {
  return db(TABLE_NAME)
    .where('lesson_id', lessonId)
    .update({
      chapter_id: newChapterId,
      order_index: newOrder
    });
}

export function findWithContent(lessonId) {
  return db(TABLE_NAME)
    .select('lessons.*')
    .where('lesson_id', lessonId)
    .first();
}

export function updateContent(lessonId, content) {
  return db(TABLE_NAME)
    .where('lesson_id', lessonId)
    .update({
      content,
      updated_at: new Date()
    });
}