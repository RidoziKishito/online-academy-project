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
        const rows = await db('vw_newest_courses').select('*');
        return rows.map(r => ({
          // stable fields expected by templates
          course_id: r.course_id,
          title: r.title || r.course_title,
          image_url: r.image_url || r.thumbnail_url,
          instructor_name: r.instructor_name || r.full_name,
          category_name: r.category_name || r.name,
          sale_price: r.sale_price ?? r.price,
          rating_avg: r.rating_avg ?? r.avg_rating,
        }));
    } catch (err) {
        return [];
    }
}

export async function findMostViewCourses() {
    try {
        const rows = await db('vw_most_view_courses').select('*');
        return rows.map(r => ({
          course_id: r.course_id,
          title: r.title || r.course_title,
          image_url: r.image_url || r.thumbnail_url,
          instructor_name: r.instructor_name || r.full_name,
          category_name: r.category_name || r.name,
          sale_price: r.sale_price ?? r.price,
          rating_avg: r.rating_avg ?? r.avg_rating,
        }));
    } catch (err) {
        return [];
    }
}
