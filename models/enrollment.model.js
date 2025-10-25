import db from '../utils/db.js';

const TABLE_NAME = 'user_enrollments';

export async function enroll(userId, courseId) {
  const existed = await db(TABLE_NAME).where({ user_id: userId, course_id: courseId }).first();
  if (existed) return existed;
  const insertResult = await db(TABLE_NAME).insert({ user_id: userId, course_id: courseId });
  let id;
  if (Array.isArray(insertResult) && insertResult.length) {
    id = insertResult[0];
  } else if (typeof insertResult === 'number') {
    id = insertResult;
  } else if (insertResult && typeof insertResult === 'object') {
    id = insertResult.insertId || insertResult.id || insertResult.enrollment_id || null;
  }

  return { enrollment_id: id, user_id: userId, course_id: courseId };
}

export function findCoursesByUserId(userId) {
  return db(TABLE_NAME)
    .join('courses', 'user_enrollments.course_id', '=', 'courses.course_id')
    .where('user_enrollments.user_id', userId);
}

export async function checkEnrollment(userId, courseId, withDetail = false) {
  const row = await db(TABLE_NAME)
    .where({ user_id: userId, course_id: courseId })
    .first();
  console.log('[checkEnrollment]', { userId, courseId, found: !!row });
  return !!row;
}

export async function hasEnrollmentsByCourse(courseId) {
  const result = await db(TABLE_NAME)
    .where('course_id', courseId)
    .count({ count: '*' })
    .first();
  return parseInt(result.count) > 0;
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