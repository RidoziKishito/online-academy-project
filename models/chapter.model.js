import db from '../utils/db.js';

const TABLE_NAME = 'chapters';

export function findAll() {
  return db(TABLE_NAME);
}

export function add(chapter) {
  return db(TABLE_NAME).insert(chapter).returning('chapter_id');
}

export function findById(id) {
  return db(TABLE_NAME).where('chapter_id', id).first();
}

export function del(id) {
  return db(TABLE_NAME).where('chapter_id', id).del();
}

export function patch(id, chapter) {
  return db(TABLE_NAME).where('chapter_id', id).update(chapter);
}

export function findByCourseId(courseId) {
  return db(TABLE_NAME)
    .where('course_id', courseId)
    .orderBy('order_index', 'asc');
}

export async function findChaptersWithLessonsByCourseId(courseId) {
  const chapters = await db(TABLE_NAME)
    .where('course_id', courseId)
    .orderBy('order_index', 'asc');

  for (const chapter of chapters) {
    chapter.lessons = await db('lessons')
      .where('chapter_id', chapter.chapter_id)
      .orderBy('order_index', 'asc');
  }
  return chapters;
}

export function findChaptersWithLessonsQuery(courseId) {
  return db(TABLE_NAME)
    .select(
      'chapters.*',
      db.raw(`(
        SELECT json_agg(l.* ORDER BY l.order_index)
        FROM lessons l
        WHERE l.chapter_id = chapters.chapter_id
      ) as lessons`)
    )
    .where('course_id', courseId)
    .orderBy('order_index', 'asc');
}

export function updateOrder(chapterId, newOrder) {
  return db(TABLE_NAME)
    .where('chapter_id', chapterId)
    .update({ order_index: newOrder });
}

export function getMaxOrder(courseId) {
  return db(TABLE_NAME)
    .where('course_id', courseId)
    .max('order_index as max_order')
    .first()
    .then(result => (result.max_order || 0) + 1);
}

export async function reorderChapters(courseId, chapterOrders) {
  const trx = await db.transaction();
  try {
    for (const { chapter_id, order_index } of chapterOrders) {
      await trx(TABLE_NAME)
        .where('chapter_id', chapter_id)
        .andWhere('course_id', courseId)
        .update({ order_index });
    }
    await trx.commit();
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}