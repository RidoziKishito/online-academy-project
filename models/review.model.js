import db from '../utils/db.js';

const TABLE_NAME = 'reviews';

export function findByCourseId(courseId) {
  return db(TABLE_NAME)
    .join('users', 'reviews.user_id', '=', 'users.user_id')
    .where('reviews.course_id', courseId)
    .select('reviews.*', 'users.full_name', 'users.avatar_url')
    .orderBy('reviews.created_at', 'desc');
}

export function add(review) {
  return db(TABLE_NAME).insert(review);
}

export function findByUserAndCourse(userId, courseId) {
    return db(TABLE_NAME).where({ user_id: userId, course_id: courseId }).first();
}

export async function addReview(userId, courseId, rating, comment) {
    return await db(TABLE_NAME).insert({
        user_id: userId,
        course_id: courseId,
        rating: rating,
        comment: comment || null,
        created_at: new Date()
    });
}

export async function updateReview(userId, courseId, rating, comment) {
    return await db(TABLE_NAME)
        .where({ user_id: userId, course_id: courseId })
        .update({
            rating: rating,
            comment: comment || null,
            updated_at: new Date()
        });
}

export async function getUserReview(userId, courseId) {
    return await db(TABLE_NAME)
        .where({ user_id: userId, course_id: courseId })
        .first();
}

export async function getReviewsByCourse(courseId) {
    return await db(TABLE_NAME)
        .join('users', 'reviews.user_id', 'users.user_id')
        .select(
            'reviews.*',
            'users.full_name as user_name',    
            'users.avatar_url'
        )
        .where('reviews.course_id', courseId)
        .orderBy('reviews.created_at', 'desc');
}

export async function getCourseRatingStats(courseId) {
    const result = await db(TABLE_NAME)
        .where('course_id', courseId)
        .avg('rating as avg_rating')
        .count('* as total_reviews')
        .first();
    
    return {
        avg_rating: result.avg_rating ? parseFloat(result.avg_rating).toFixed(1) : 0,
        total_reviews: result.total_reviews
    };
}

export async function deleteReview(userId, courseId) {
    return await db(TABLE_NAME)
        .where({ user_id: userId, course_id: courseId })
        .del();
}