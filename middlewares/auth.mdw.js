export function restrict(req, res, next) {
  if (req.session.isAuthenticated) {
    return next();
  }
  req.session.retUrl = req.originalUrl;
  res.redirect('/account/signin');
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