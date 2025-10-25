import db from '../utils/db.js';

const TABLE_NAME = 'users';

export function add(user) {
  // Return the inserted user id for PostgreSQL (useful for further processing)
  return db(TABLE_NAME).insert(user).returning('user_id');
}

export function findByEmail(email) {
  return db(TABLE_NAME).where('email', email).first();
}

export function findById(id) {
  return db(TABLE_NAME).where('user_id', id).first();
}

export function findAllInstructors() {
  return db(TABLE_NAME).where('role', 'instructor').select('*').orderBy('full_name', 'asc');
}

export function patch(id, user) {
  return db(TABLE_NAME).where('user_id', id).update(user);
}

export function findAll() {
  return db(TABLE_NAME).select('*').orderBy('user_id', 'asc');
}

export function getRoleOptions() {
  return db(TABLE_NAME)
    .distinct('role')
    .whereNotNull('role')
    .orderBy('role', 'asc')
    .pluck('role');
}

// Pagination helpers
export function countAll() {
  return db(TABLE_NAME)
    .count('user_id as total')
    .first()
    .then(r => parseInt(r.total || 0));
}

export function findAllPaged(limit, offset) {
  let q = db(TABLE_NAME).select('*').orderBy('user_id', 'asc');
  if (limit) q = q.limit(limit);
  if (offset) q = q.offset(offset);
  return q;
}

// Filtered pagination
export function findAllFiltered(filters = {}) {
  let q = db(TABLE_NAME).select('*');
  
  if (filters.role) {
    q = q.where('role', filters.role);
  }
  
  if (filters.isVerified !== null && filters.isVerified !== undefined) {
    const verified = filters.isVerified === 'true' || filters.isVerified === true;
    q = q.where('is_verified', verified);
  }
  
  q = q.orderBy('user_id', 'asc');
  
  if (filters.limit) q = q.limit(filters.limit);
  if (filters.offset) q = q.offset(filters.offset);
  
  return q;
}

export function countAllFiltered(filters = {}) {
  let q = db(TABLE_NAME);
  
  if (filters.role) {
    q = q.where('role', filters.role);
  }
  
  if (filters.isVerified !== null && filters.isVerified !== undefined) {
    const verified = filters.isVerified === 'true' || filters.isVerified === true;
    q = q.where('is_verified', verified);
  }
  
  return q.count('user_id as total')
    .first()
    .then(r => parseInt(r.total || 0));
}

export function del(id) {
  return db(TABLE_NAME).where('user_id', id).del();
}

// OAuth helpers
export function findByOAuth(provider, oauthId) {
  return db(TABLE_NAME)
    .where('oauth_provider', provider)
    .where('oauth_id', oauthId)
    .first();
}

export function linkOAuth(userId, provider, oauthId, avatarUrl = null, fullName = null) {
  const patch = {
    oauth_provider: provider,
    oauth_id: oauthId,
  };
  if (avatarUrl) patch.avatar_url = avatarUrl;
  if (fullName) patch.full_name = fullName;
  // OAuth users are verified by provider
  patch.is_verified = true;
  return db(TABLE_NAME)
    .where('user_id', userId)
    .update(patch);
}

export function createOAuthUser(data) {
  const user = {
    email: data.email,
    full_name: data.full_name || null,
    avatar_url: data.avatar_url || null,
    oauth_provider: data.oauth_provider,
    oauth_id: data.oauth_id,
    is_verified: data.is_verified !== false,
    role: data.role || 'student',
    // optional random password hash for OAuth accounts
  };
  if (data.password_hash) user.password_hash = data.password_hash;
  return db(TABLE_NAME).insert(user).returning('user_id');
}

// Password reset functions
export function setResetToken(email, token, expiresAt) {
  return db(TABLE_NAME)
    .where('email', email)
    .update({
      otp_secret: token,
      otp_expires_at: expiresAt
    });
}

export function findByResetToken(email, token) {
  return db(TABLE_NAME)
    .where('email', email)
    .where('otp_secret', token)
    .where('otp_expires_at', '>', new Date())
    .first();
}

export function resetPassword(userId, newPasswordHash) {
  return db(TABLE_NAME)
    .where('user_id', userId)
    .update({
      password_hash: newPasswordHash,
      otp_secret: null,
      otp_expires_at: null
    });
}

// Email verification
export function verifyEmail(userId) {
  return db(TABLE_NAME)
    .where('user_id', userId)
    .update({
      is_verified: true,
      otp_secret: null,
      otp_expires_at: null
    });
}