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

// Thêm 
export function findByChapterIds(chapterIds = []) {
  if (!chapterIds || chapterIds.length === 0) return Promise.resolve([]);
  return db(TABLE_NAME)
    .whereIn('chapter_id', chapterIds)
    .orderBy(['chapter_id', 'order_index']);
}

// Lấy lesson theo chapter_id + lesson_id
export function findByChapterAndLesson(chapterId, lessonId) {
  return db(TABLE_NAME)
    .where({ chapter_id: chapterId, lesson_id: lessonId })
    .first();
}