import db from '../utils/db.js';

export async function findTopWeekCourses() {
  try {
    const rows = await db('top_week_courses').select('*');
    console.log('Top week courses loaded:', rows.length);
    return rows.map(r => ({
      ...r,
      instructor_avatar: r.avatar_url || r.instructor_avatar || '/images/default-avatar.png'
    }));
  } catch (err) {
    console.error('Error loading top week courses:', err);
    return [];
  }
}

export async function findTopCategories() {
  try {
    const rows = await db('vw_top_categories').select('*');
    console.log('Top categories loaded:', rows.length);
    // Map 'name' to 'category_name' for template compatibility
    return rows.map(r => ({
      category_id: r.category_id,
      category_name: r.name || r.category_name,
      total_courses: r.total_courses || 0
    }));
  } catch (err) {
    console.error('Error loading top categories:', err);
    // Fall back to base categories with minimal fields expected by templates
    const rows = await db('categories')
      .select('category_id', 'name')
      .whereNull('parent_category_id')
      .limit(8);
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
