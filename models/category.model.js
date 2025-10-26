import db from '../utils/db.js';

const TABLE_NAME = 'categories';

export function findAll() {
  // Ensure categories are returned in ascending order by id for consistent listing
  return db(TABLE_NAME).orderBy('category_id', 'asc');
}

export function add(category) {
  return db(TABLE_NAME).insert(category);
}

export async function findParentCategories() {
  return db(TABLE_NAME)
    .whereNull('parent_category_id')
    .orderBy('name', 'asc');
}

export async function findSubcategories(parentId) {
  try {
    console.log('Finding subcategories for parent:', parentId);
    const results = await db(TABLE_NAME)
      .where('parent_category_id', parentId)
      .orderBy('name', 'asc');
    console.log('Found subcategories:', results);
    return results;
  } catch (err) {
    console.error('Error in findSubcategories:', err);
    throw err;
  }
}

// Thêm hàm để lấy thông tin category cùng với parent category
export async function findByIdWithParent(id) {
  const category = await db(TABLE_NAME)
    .where('category_id', id)
    .first();

  if (category && category.parent_category_id) {
    const parent = await db(TABLE_NAME)
      .where('category_id', category.parent_category_id)
      .first();
    category.parent = parent;
  }

  return category;
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