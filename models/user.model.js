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

  // Optional filter: banned status
  if (filters.isBanned !== null && filters.isBanned !== undefined) {
    const banned = filters.isBanned === 'true' || filters.isBanned === true;
    if (banned) {
      // Consider currently banned: is_banned = true AND (banned_until IS NULL OR banned_until > now())
      q = q.where('is_banned', true)
           .andWhere(function() {
             this.whereNull('banned_until').orWhere('banned_until', '>', db.fn.now());
           });
    } else {
      // Not currently banned: is_banned = false OR (is_banned = true AND banned_until <= now())
      q = q.andWhere(function() {
        this.where('is_banned', false)
            .orWhere(function() {
              this.where('is_banned', true).andWhereNotNull('banned_until').andWhere('banned_until', '<=', db.fn.now());
            });
      });
    }
  }

  // Partial email search (case-insensitive)
  if (filters.emailQuery) {
    const like = `%${filters.emailQuery}%`;
    // Use ILIKE for Postgres (case-insensitive)
    q = q.where('email', 'ilike', like);
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

  if (filters.isBanned !== null && filters.isBanned !== undefined) {
    const banned = filters.isBanned === 'true' || filters.isBanned === true;
    if (banned) {
      q = q.where('is_banned', true)
           .andWhere(function() {
             this.whereNull('banned_until').orWhere('banned_until', '>', db.fn.now());
           });
    } else {
      q = q.andWhere(function() {
        this.where('is_banned', false)
            .orWhere(function() {
              this.where('is_banned', true).andWhereNotNull('banned_until').andWhere('banned_until', '<=', db.fn.now());
            });
      });
    }
  }

  // Partial email search for count as well
  if (filters.emailQuery) {
    const like = `%${filters.emailQuery}%`;
    q = q.where('email', 'ilike', like);
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

// ===== Ban / Unban helpers =====
export function banUser(userId, { permanent = false, until = null, reason = null, adminId = null } = {}) {
  const patch = {
    is_banned: true,
    banned_at: db.fn.now(),
    banned_by: adminId,
    ban_reason: reason || null,
    banned_until: permanent ? null : until
  };
  return db(TABLE_NAME).where('user_id', userId).update(patch);
}

export function unbanUser(userId) {
  return db(TABLE_NAME).where('user_id', userId).update({
    is_banned: false,
    banned_until: null,
    ban_reason: null,
    banned_by: null,
    banned_at: null
  });
}

export function getBanInfoById(userId) {
  return db(TABLE_NAME).select('is_banned', 'banned_until', 'ban_reason', 'banned_by', 'banned_at').where('user_id', userId).first();
}

export function isCurrentlyBanned(userRow) {
  if (!userRow) return { banned: false };
  const { is_banned, banned_until } = userRow;
  if (!is_banned) return { banned: false };
  if (!banned_until) return { banned: true, permanent: true };
  const now = new Date();
  const until = new Date(banned_until);
  if (until > now) {
    return { banned: true, permanent: false, until };
  }
  // expired temporary ban
  return { banned: false };
}