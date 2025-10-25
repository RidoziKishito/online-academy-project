import db from '../utils/db.js';

const TABLE_NAME = 'chapters';

export function findAll() {
  return db(TABLE_NAME);
}

export function add(category) {
  return db(TABLE_NAME).insert(category);
}

export function findById(id) {
  return db(TABLE_NAME).where('category_id', id).first();
}

export function del(id) {
  return db(TABLE_NAME).where('category_id', id).del();
}

export function patch(id, category) {
  return db(TABLE_NAME).where('category_id', id).update(category);
}
export function findByCourseId(courseId) {
    // Ví dụ với knex hoặc sequelize
    return db('chapters').where('course_id', courseId);
}
export async function findChaptersWithLessonsByCourseId(courseId) {
  const chapters = await db('chapters').where('course_id', courseId).orderBy('order_index', 'asc');
  for (const chapter of chapters) {
  chapter.lessons = await db('lessons').where('chapter_id', chapter.chapter_id).orderBy('order_index', 'asc');
  }
  return chapters;
}

export function findByCourseId(courseId) {
  return db(TABLE_NAME).where('course_id', courseId).orderBy('order_index', 'asc');
}
