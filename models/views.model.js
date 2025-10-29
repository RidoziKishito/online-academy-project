import db from '../utils/db.js';

export async function findTopWeekCourses() {
    // Views are read-only → use select *
  return await db('top_week_courses').select('*');
}

export async function findTopCategories() {
    return await db('vw_top_categories').select('*');
}

export async function findNewestCourses() {
    return await db('vw_newest_courses').select('*');
}

export async function findMostViewCourses() {
    return await db('vw_most_view_courses').select('*');
}
