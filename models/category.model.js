import db from '../utils/db.js';
import { findByCourseId } from './chapter.model.js';

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

export async function findParentSon(id) {
  // 🔹 Lấy thông tin category con
  console.log(id)
  const child = await db(TABLE_NAME)
    .select('category_id', 'name', 'parent_category_id')
    .where('category_id', id)
    .first();

  if (!child) return null; // Không tồn tại category này

  // 🔹 Lấy thông tin cha (nếu có)
  let parent = null;
  if (child.parent_category_id) {
    parent = await db(TABLE_NAME)
      .select('category_id', 'name')
      .where('category_id', child.parent_category_id)
      .first();
  }

  // 🔹 Trả về cấu trúc gọn gàng
  return {
    parent: parent
      ? { id: parent.category_id, name: parent.name }
      : { id: null, name: 'None' },
    child: { id: child.category_id, name: child.name },
  };
}