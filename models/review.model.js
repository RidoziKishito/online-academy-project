import db from '../utils/db.js';

const TABLE_NAME = 'reviews';

export function findByCourseId(courseId) {
  return db(TABLE_NAME)
    .join('users', 'reviews.user_id', '=', 'users.user_id')
    .where('reviews.course_id', courseId)
    .select('reviews.*', 'users.full_name', 'users.avatar_url');
}

export function add(review) {
  return db(TABLE_NAME).insert(review);
}

export function findByUserAndCourse(userId, courseId) {
    return db(TABLE_NAME).where({ user_id: userId, course_id: courseId }).first();
}