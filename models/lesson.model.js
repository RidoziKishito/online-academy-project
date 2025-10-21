import db from '../utils/db.js';

const TABLE_NAME = 'lessons';

export function findByChapterId(chapterId) {
  return db(TABLE_NAME).where('chapter_id', chapterId).orderBy('order_index', 'asc');
}

export function add(lesson) {
  return db(TABLE_NAME).insert(lesson);
}

export function findById(id) {
  return db(TABLE_NAME).where('lesson_id', id).first();
}

export function patch(id, lesson) {
  return db(TABLE_NAME).where('lesson_id', id).update(lesson);
}

export function del(id) {
  return db(TABLE_NAME).where('lesson_id', id).del();
}