import db from '../utils/db.js';

export async function findTop3WeekCourses() {
  // View nên chỉ đọc → dùng select *
  return await db('top3_week_courses').select('*');
}

export async function findTopCategories() {
    return await db('vw_root_categories').select('*');
}

export async function findNewestCourses() {
    return await db('vw_newest_courses').select('*');
}

export async function findMostViewCourses() {
    return await db('vw_most_view_courses').select('*');
}
