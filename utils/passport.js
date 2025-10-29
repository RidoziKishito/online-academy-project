import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import * as userModel from '../models/user.model.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import logger from './logger.js';

dotenv.config();

// Serialize only the user_id into the session
passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

// Hydrate user from DB on each request
passport.deserializeUser(async (id, done) => {
  try {
    const user = await userModel.findById(id);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || `${BASE_URL}/auth/google/callback`;

export const GOOGLE_ENABLED = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

if (GOOGLE_ENABLED) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const provider = 'google';
      const oauthId = profile.id;
      const email = profile.emails && profile.emails[0] && profile.emails[0].value ? profile.emails[0].value : null;
      const fullName = profile.displayName || null;
      const avatar = profile.photos && profile.photos[0] && profile.photos[0].value ? profile.photos[0].value : null;

      // 1) Try find by oauth mapping
      let user = await userModel.findByOAuth(provider, oauthId);

      // 2) If not bound but email exists, link it
      if (!user && email) {
        const existingByEmail = await userModel.findByEmail(email);
        if (existingByEmail) {
          await userModel.linkOAuth(existingByEmail.user_id, provider, oauthId, avatar, fullName);
          user = await userModel.findById(existingByEmail.user_id);
        }
      }

      // 3) Create new account if still not found
      if (!user) {
        // Generate a random password that the user won't use
        const randomPassword = crypto.randomBytes(24).toString('base64url');
        const passwordHash = await bcrypt.hash(randomPassword, 10);

        const createdId = await userModel.createOAuthUser({
          email,
          full_name: fullName,
          avatar_url: avatar,
          oauth_provider: provider,
          oauth_id: oauthId,
          is_verified: true, // trusted from provider
          role: 'student',
          password_hash: passwordHash,
        });
        const userId = Array.isArray(createdId) ? createdId[0] : createdId;
        user = await userModel.findById(userId?.user_id || userId);
        if (user) {
          // mark for redirect behavior in callback
          user._justCreated = true;
        }
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
} else {
  // Warn at startup so dev knows why Google strategy isn't available
  logger.warn('[Auth] Google OAuth not configured: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
}

export default passport;
