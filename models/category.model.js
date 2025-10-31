import db from '../utils/db.js';
import { findByCourseId } from './chapter.model.js';
import logger from '../utils/logger.js';

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
    const results = await db(TABLE_NAME)
      .where('parent_category_id', parentId)
      .orderBy('name', 'asc');
    return results;
  } catch (err) {
    logger.error({ err, parentId }, 'Error in findSubcategories');
    throw err;
  }
}

// Get category along with its parent category
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

// Find the best matching category by name using trigram similarity (requires pg_trgm)
export async function findByNameFuzzy(name, threshold = 0.28) {
  if (!name || String(name).trim().length === 0) return null;
  // Search by similarity in DB to get best candidate
  const row = await db(TABLE_NAME)
    .select('category_id', 'name')
    .whereRaw("similarity(unaccent(lower(name)), unaccent(lower(?))) > ?", [name, threshold])
    .orderByRaw("similarity(unaccent(lower(name)), unaccent(lower(?))) DESC", [name])
    .first();
  return row || null;
}

export function del(id) {
  return db(TABLE_NAME).where('category_id', id).del();
}

export function patch(id, category) {
  return db(TABLE_NAME).where('category_id', id).update(category);
}

export async function findParentSon(id) {
  // 🔹 Get child category info
  const child = await db(TABLE_NAME)
    .select('category_id', 'name', 'parent_category_id')
    .where('category_id', id)
    .first();

  if (!child) return null; // Category does not exist

  // 🔹 Get parent info (if any)
  let parent = null;
  if (child.parent_category_id) {
    parent = await db(TABLE_NAME)
      .select('category_id', 'name')
      .where('category_id', child.parent_category_id)
      .first();
  }

  // 🔹 Return a clean structure
  return {
    parent: parent
      ? { id: parent.category_id, name: parent.name }
      : { id: null, name: 'None' },
    child: { id: child.category_id, name: child.name },
  };
}

export async function hasCourse(categoryId) {
  return await db('courses')
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

// Get category hierarchy
export async function getCategoryHierarchy() {
  // Fetch all categories
  const allCategories = await db(TABLE_NAME)
    .select('*')
    .orderBy('name', 'asc');

  // Create a map for fast lookup
  const categoryMap = new Map();
  allCategories.forEach(cat => {
    categoryMap.set(cat.category_id, {
      ...cat,
      subcategories: []
    });
  });

  // Build the tree
  const rootCategories = [];
  allCategories.forEach(cat => {
    if (!cat.parent_category_id) {
      rootCategories.push(categoryMap.get(cat.category_id));
    } else {
      const parent = categoryMap.get(cat.parent_category_id);
      if (parent) {
        parent.subcategories.push(categoryMap.get(cat.category_id));
      }
    }
  });

  return rootCategories;
}

// Check if a category is a subcategory of another
export async function isSubcategoryOf(subcategoryId, parentId) {
  const category = await db(TABLE_NAME)
    .where({
      category_id: subcategoryId,
      parent_category_id: parentId
    })
    .first();
  return !!category;
}

// Get the full path of a category (from root to current category)
export async function getCategoryPath(categoryId) {
  const path = [];
  let currentId = categoryId;

  while (currentId) {
    const category = await db(TABLE_NAME)
      .where('category_id', currentId)
      .first();

    if (!category) break;

    path.unshift(category);
    currentId = category.parent_category_id;
  }

  return path;
}

export async function getAllWithChildren() {
  // Fetch all categories
  const categories = await db('categories').select('*').orderBy('category_id', 'asc');

  // Group by parent
  const parents = categories.filter(c => c.parent_category_id === null);
  const children = categories.filter(c => c.parent_category_id !== null);

  // Attach children to parents
  parents.forEach(parent => {
    parent.children = children.filter(ch => ch.parent_category_id === parent.category_id);
  });

  return parents;
}

