import db from '../utils/db.js';
import logger from '../utils/logger.js';

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
export async function checkWishlist(userId, courseId) {
    try {
        const result = await db(TABLE_NAME)
            .where({ user_id: userId, course_id: courseId })
            .first();
        return !!result;
    } catch (error) {
      logger.error({ err: error, userId, courseId }, '[checkWishlist] Error');
        return false;
    }
}