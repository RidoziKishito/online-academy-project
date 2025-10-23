import db from '../utils/db.js';

const TABLE_NAME = 'user_enrollments';

export async function enroll(userId, courseId) {
  const existed = await db(TABLE_NAME).where({ user_id: userId, course_id: courseId }).first();
  if (existed) return existed;
  const [id] = await db(TABLE_NAME).insert({ user_id: userId, course_id: courseId });
  return { enrollment_id: id, user_id: userId, course_id: courseId };
}

export function findCoursesByUserId(userId) {
  return db(TABLE_NAME)
    .join('courses', 'user_enrollments.course_id', '=', 'courses.course_id')
    .where('user_enrollments.user_id', userId);
}

export async function checkEnrollment(userId, courseId) {
  const row = await db(TABLE_NAME)
    .where({ user_id: userId, course_id: courseId })
    .first();
  console.log('[checkEnrollment]', { userId, courseId, found: !!row });
  return !!row;
}