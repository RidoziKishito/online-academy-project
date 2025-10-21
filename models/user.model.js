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

export function patch(id, user) {
  return db(TABLE_NAME).where('user_id', id).update(user);
}

export function findAll() {
  return db(TABLE_NAME).select('*').orderBy('user_id', 'asc');
}