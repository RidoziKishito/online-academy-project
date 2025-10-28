import db from '../utils/db.js';

const TABLE_NAME = 'contact_messages';

export function add(message) {
  // message: { name, email, message }
  return db(TABLE_NAME).insert(message).returning('id');
}

export async function all() {
  return await db(TABLE_NAME).select('*').orderBy('created_at', 'desc');
}

export async function findById(id) {
  return await db(TABLE_NAME).where('id', id).first();
}

export default {
  add,
  all,
  findById
};