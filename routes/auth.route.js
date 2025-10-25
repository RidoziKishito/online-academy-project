import express from 'express';
import passport, { GOOGLE_ENABLED } from '../utils/passport.js';

const router = express.Router();

// Guard: if Google not enabled, redirect with message instead of throwing unknown strategy
function ensureGoogleEnabled(req, res, next) {
  if (!GOOGLE_ENABLED) {
    const url = '/account/signin?error=oauth_config';
    return res.redirect(url);
  }
  next();
}

// Initiate Google OAuth
router.get('/google', ensureGoogleEnabled, passport.authenticate('google', { scope: ['profile', 'email'] }));

// Handle callback
router.get('/google/callback', ensureGoogleEnabled,
  passport.authenticate('google', { failureRedirect: '/account/signin?error=oauth' }),
  (req, res) => {
    // On success, persist session flags similar to local signin
    req.session.isAuthenticated = true;
    req.session.authUser = req.user;

    // If this is a freshly created account via OAuth, always go home
    const ret = (req.user && req.user._justCreated) ? '/' : (req.session.retUrl || '/');
    delete req.session.retUrl;
    res.redirect(ret);
  }
);

// Optional: logout via /auth/logout
router.post('/logout', (req, res) => {
  req.logout?.(() => {});
  req.session.destroy(() => {
    res.redirect('/');
  });
});

export default router;
