import db from '../utils/db.js';

const TABLE_NAME = 'categories';

export function findAll() {
  return db(TABLE_NAME);
}

export function add(category) {
  return db(TABLE_NAME).insert(category);
}

export function findById(id) {
  return db(TABLE_NAME).where('category_id', id).first();
}

export function del(id) {
  return db(TABLE_NAME).where('category_id', id).del();
}

export function patch(id, category) {
  return db(TABLE_NAME).where('category_id', id).update(category);
}

export function hasCourse(categoryId) {
  return db('courses')
    .where('category_id', categoryId)
    .count({ count: '*' })
    .first()
    .then((row) => Number(row?.count ?? 0) > 0);
}

export async function existsByName(name) {
  // Case-insensitive check, trim spaces
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return false;
  const row = await db(TABLE_NAME)
    .whereRaw('LOWER(name) = LOWER(?)', [trimmed])
    .first('category_id');
  return !!row;
}

export async function existsByNameExceptId(name, excludeId) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return false;
  const row = await db(TABLE_NAME)
    .whereRaw('LOWER(name) = LOWER(?)', [trimmed])
    .andWhereNot('category_id', excludeId)
    .first('category_id');
  return !!row;
}