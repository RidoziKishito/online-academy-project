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
export function findStudentsByCourse(courseId) {
  return db(TABLE_NAME)
    .join('users', 'user_enrollments.user_id', '=', 'users.user_id')
    .select(
      'users.user_id',
      'users.full_name',
      'users.email',
      'user_enrollments.enrolled_at'
    )
    .where('user_enrollments.course_id', courseId)
    .orderBy('user_enrollments.enrolled_at', 'desc');
}

export function findStudentDetail(courseId, userId) {
  return db(TABLE_NAME)
    .join('users', 'user_enrollments.user_id', '=', 'users.user_id')
    .select(
      'users.user_id',
      'users.full_name',
      'users.email',
      'user_enrollments.enrolled_at'
    )
    .where('user_enrollments.course_id', courseId)
    .andWhere('user_enrollments.user_id', userId)
    .first();
}