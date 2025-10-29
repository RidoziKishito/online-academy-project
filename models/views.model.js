import db from '../utils/db.js';

export async function findTopWeekCourses() {
  // Views are read-only → use select *
  try {
    // Use existing view name in schema
    return await db('top3_week_courses').select('*');
  } catch (err) {
    return [];
  }
}

export async function findTopCategories() {
  try {
    return await db('vw_root_categories').select('*');
  } catch (err) {
    // Fall back to base categories with minimal fields expected by templates
    const rows = await db('categories').select('category_id', 'name').limit(8);
    return rows.map(r => ({
      category_id: r.category_id,
      category_name: r.name,
      total_courses: 0,
    }));
  }
}

export async function findNewestCourses() {
    try {
        return await db('vw_newest_courses').select('*');
    } catch (err) {
        return [];
    }
}

export async function findMostViewCourses() {
    try {
        return await db('vw_most_view_courses').select('*');
    } catch (err) {
        return [];
    }
}
