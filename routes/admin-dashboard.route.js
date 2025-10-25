import express from 'express';
import db from '../utils/db.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    // Aggregate metrics in parallel
    const [
      usersTotalRow,
      usersVerifiedRow,
      adminsRow,
      instructorsRow,
      studentsRow,
      coursesTotalRow,
      enrollmentsTotalRow,
      reviewsTotalRow,
      topCourses,
      recentUsers
    ] = await Promise.all([
      db('users').count('user_id as total').first(),
      db('users').where('is_verified', true).count('user_id as total').first(),
      db('users').where('role', 'admin').count('user_id as total').first(),
      db('users').where('role', 'instructor').count('user_id as total').first(),
      db('users').where('role', 'student').count('user_id as total').first(),
      db('courses').count('course_id as total').first(),
      db('user_enrollments').count('* as total').first(),
      db('reviews').count('* as total').first(),
      db('courses')
        .leftJoin('users', 'courses.instructor_id', 'users.user_id')
        .select(
          'courses.course_id',
          'courses.title',
          'courses.enrollment_count',
          'courses.view_count',
          'courses.rating_avg',
          'courses.rating_count',
          'users.full_name as instructor_name'
        )
        .orderBy([{ column: 'courses.enrollment_count', order: 'desc' }, { column: 'courses.view_count', order: 'desc' }])
        .limit(5),
      db('users')
        .select('user_id', 'full_name', 'email', 'role', 'is_verified')
        .orderBy('user_id', 'desc')
        .limit(5)
    ]);

    const metrics = {
      usersTotal: parseInt(usersTotalRow?.total || 0),
      usersVerified: parseInt(usersVerifiedRow?.total || 0),
      admins: parseInt(adminsRow?.total || 0),
      instructors: parseInt(instructorsRow?.total || 0),
      students: parseInt(studentsRow?.total || 0),
      coursesTotal: parseInt(coursesTotalRow?.total || 0),
      enrollmentsTotal: parseInt(enrollmentsTotalRow?.total || 0),
      reviewsTotal: parseInt(reviewsTotalRow?.total || 0)
    };

    res.render('vwAdmin/dashboard', {
      layout: 'main',
      metrics,
      topCourses,
      recentUsers
    });
  } catch (err) {
    next(err);
  }
});

export default router;
