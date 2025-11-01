import * as courseModel from '../models/courses.model.js';
import * as enrollModel from '../models/enrollment.model.js'
import * as userModel from '../models/user.model.js'

export function restrict(req, res, next) {
  if (req.session.isAuthenticated) {
    return next();
  }
  req.session.retUrl = req.originalUrl;
  res.redirect('/account/signin');
}

// Enforce that the current session user is not banned (permanent or currently active temp ban)
export async function enforceNotBanned(req, res, next) {
  try {
    if (!req.session.isAuthenticated || !req.session.authUser) return next();
    const userId = req.session.authUser.user_id;
    const fresh = await userModel.findById(userId);
    if (!fresh) {
      // user no longer exists; force signout
      req.session.isAuthenticated = false;
      req.session.authUser = null;
      return res.status(403).render('403');
    }

    const info = userModel.isCurrentlyBanned(fresh);
    if (!info.banned) return next();

    // Destroy session and block access
    req.session.isAuthenticated = false;
    req.session.authUser = null;

    const isJson = req.xhr || req.headers.accept?.includes('application/json');
    if (isJson) {
      return res.status(403).json({
        ok: false,
        error: info.permanent ? 'Account is permanently banned.' : `Account is temporarily banned until ${new Date(info.until).toLocaleString()}`
      });
    }
    return res.status(403).render('403');
  } catch (err) {
    console.error(err);
    return res.status(500).render('500');
  }
}

/**
 * Middleware kiểm tra xem người dùng có phải là Admin hay không.
 */
export function isAdmin(req, res, next) {
  if (req.session.isAuthenticated && req.session.authUser.role === 'admin') {
    return next();
  }
  res.status(403).render('403');
}

/**
 * Middleware kiểm tra xem người dùng có phải là Giảng viên hay không.
 */
export function isInstructor(req, res, next) {
  if (req.session.isAuthenticated && req.session.authUser.role === 'instructor') {
    return next();
  }
  res.status(403).render('403');
}

export function isStudent(req, res, next) {
  if (req.session.isAuthenticated && req.session.authUser.role === 'student') {
    return next();
  }
  res.status(403).render('403');
}


export async function canAccessCourse(req, res, next) {
  try {
    const user = req.session.authUser;
    const courseId = req.params.courseId;

    if (!user) return res.redirect('/account/signin');
    if (!courseId) return res.status(400).send('Missing course id');

    // Admin luôn qua
    if (user.role === 'admin') return next();

    // Instructor → chỉ course của mình
    if (user.role === 'instructor') {
      const course = await courseModel.findById(courseId);
      if (!course) return res.status(404).render('404');
      if (course.instructor_id === user.user_id) return next();
    }

    // Student → nếu đã enroll
    if (user.role === 'student') {
      const enrolled = await enrollModel.checkEnrollment(user.user_id, courseId);
      if (enrolled) return next();
    }

    return res.status(403).render('403');
  } catch (err) {
    console.error(err);
    res.status(500).render('500');
  }
}
