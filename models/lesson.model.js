import db from '../utils/db.js';

const TABLE_NAME = 'lessons';

export function findByChapterId(chapterId) {
  return db(TABLE_NAME)
    .where('chapter_id', chapterId)
    .orderBy('order_index', 'asc');
}

export function add(lesson) {
  return db(TABLE_NAME)
    .insert(lesson)
    .returning('lesson_id');
}

export function findById(id) {
  return db(TABLE_NAME)
    .where('lesson_id', id)
    .first();
}

export function patch(id, lesson) {
  return db(TABLE_NAME)
    .where('lesson_id', id)
    .update(lesson);
}

export function del(id) {
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