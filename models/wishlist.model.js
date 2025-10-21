import db from '../utils/db.js';

const TABLE_NAME = 'user_wishlist';

export function add(userId, courseId) {
  return db(TABLE_NAME).insert({ user_id: userId, course_id: courseId });
}

export function remove(userId, courseId) {
  return db(TABLE_NAME).where({ user_id: userId, course_id: courseId }).del();
}

export function findCoursesByUserId(userId) {
  return db(TABLE_NAME)
    .join('courses', 'user_wishlist.course_id', '=', 'courses.course_id')
    .where('user_wishlist.user_id', userId);
}