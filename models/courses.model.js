import db from '../utils/db.js';

const TABLE_NAME = 'courses';

export function findById(id) {
  return db(TABLE_NAME).where('course_id', id).first();
}

export function findByCategory(categoryId) {
  return db(TABLE_NAME).where('category_id', categoryId);
}

export function findPageByCategory(categoryId, offset, limit) {
  return db(TABLE_NAME)
    .where('category_id', categoryId)
    .offset(offset)
    .limit(limit);
}

export function countByCategory(categoryId) {
  return db(TABLE_NAME)
    .where('category_id', categoryId)
    .count('course_id as amount')
    .first();
}

export function findByInstructor(instructorId) {
  return db('courses as c')
    .leftJoin('categories as cat', 'c.category_id', 'cat.category_id')
    .select(
      'c.course_id',
      'c.title',
      'c.image_url',
      'c.price',
      'c.sale_price',
      'c.is_complete',
      'c.enrollment_count',
      'cat.name as category_name'
    )
    .where('c.instructor_id', instructorId)
    .orderBy('c.created_at', 'desc');
}

export function findDetail(courseId, instructorId) {
  return db('courses as c')
    .leftJoin('categories as cat', 'c.category_id', 'cat.category_id')
    .select('c.*', 'cat.name as category_name')
    .where({ 'c.course_id': courseId, 'c.instructor_id': instructorId })
    .first();
}

export function search(keyword) {
  const keywords = keyword.split(' ').join(' & ');
  return db(TABLE_NAME)
    .whereRaw(`fts_document @@ to_tsquery('simple', remove_accents(?))`, [keywords]);
}

export function findAll() {
  return db(TABLE_NAME);
}

export function add(course) {
  return db(TABLE_NAME).insert(course).returning('course_id');
}

export function patch(id, course) {
  return db(TABLE_NAME).where('course_id', id).update(course);
}

export function del(id) {
  return db(TABLE_NAME).where('course_id', id).del();
}

export function incrementEnrollment(courseId) {
  return db(TABLE_NAME).where('course_id', courseId).increment('enrollment_count', 1);
}

export async function updateAverageRating(courseId) {
  const stats = await db('reviews')
    .where('course_id', courseId)
    .avg('rating as avg_rating')
    .count('review_id as rating_count')
    .first();

  const avg_rating = parseFloat(stats.avg_rating || 0).toFixed(1);
  const rating_count = parseInt(stats.rating_count || 0);

  return db(TABLE_NAME)
    .where('course_id', courseId)
    .update({ rating_avg: avg_rating, rating_count: rating_count });
}