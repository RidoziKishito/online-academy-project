import db from '../utils/db.js';

const TABLE_NAME = 'user_enrollments';

export function enroll(userId, courseId) {
  return db(TABLE_NAME).insert({ user_id: userId, course_id: courseId });
}

export function findCoursesByUserId(userId) {
  return db(TABLE_NAME)
    .join('courses', 'user_enrollments.course_id', '=', 'courses.course_id')
    .where('user_enrollments.user_id', userId);
}

export function checkEnrollment(userId, courseId) {
  return db(TABLE_NAME).where({ user_id: userId, course_id: courseId }).first();
}