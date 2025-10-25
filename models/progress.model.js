import db from '../utils/db.js';

const TABLE_NAME = 'user_lesson_progress'; // Sử dụng thống nhất 1 tên bảng

// Đánh dấu bài học đã hoàn thành
export async function markAsCompleted(userId, lessonId) {
  try {
    await db(TABLE_NAME)
      .insert({ 
        user_id: userId, 
        lesson_id: lessonId,
        completed_at: new Date()
      })
      .onDuplicateUpdate({
        completed_at: new Date()
      });
    
    return true;
  } catch (error) {
    console.error('markAsCompleted error:', error);
    
    // Fallback: dùng cách check-then-insert
    const exists = await db(TABLE_NAME)
      .where({ user_id: userId, lesson_id: lessonId })
      .first();
    
    if (!exists) {
      await db(TABLE_NAME).insert({
        user_id: userId,
        lesson_id: lessonId,
        completed_at: new Date()
      });
    }
    
    return true;
  }
}

// Lấy danh sách các bài học đã hoàn thành của user trong course (nếu có)
export function findCompletedLessonsByUser(userId, courseId = null) {
  let query = db(TABLE_NAME)
    .join('lessons', `${TABLE_NAME}.lesson_id`, '=', 'lessons.lesson_id')
    .join('chapters', 'lessons.chapter_id', '=', 'chapters.chapter_id')
    .where(`${TABLE_NAME}.user_id`, userId);

  if (courseId) {
    query = query.where('chapters.course_id', courseId);
  }

  return query.select(`${TABLE_NAME}.lesson_id`);
}

// Đếm tổng số lesson trong 1 khóa học
export async function countLessonsByCourse(courseId) {
  const result = await db('lessons')
    .join('chapters', 'lessons.chapter_id', 'chapters.chapter_id')
    .where('chapters.course_id', courseId)
    .count('lessons.lesson_id as total')
    .first();
  
  return parseInt(result?.total) || 0;
}

// Đếm số lesson mà user đã hoàn thành trong khóa học
export async function countCompletedLessons(courseId, userId) {
  const result = await db(TABLE_NAME)
    .join('lessons', `${TABLE_NAME}.lesson_id`, '=', 'lessons.lesson_id')
    .join('chapters', 'lessons.chapter_id', '=', 'chapters.chapter_id')
    .where('chapters.course_id', courseId)
    .andWhere(`${TABLE_NAME}.user_id`, userId)
    .count(`${TABLE_NAME}.lesson_id as completed`)
    .first();
  
  return parseInt(result?.completed) || 0;
}

// Lấy chi tiết tiến độ học của user trong một khóa học
export function findLessonProgressOfUser(courseId, userId) {
  return db('lessons')
    .join('chapters', 'lessons.chapter_id', 'chapters.chapter_id')
    .leftJoin(TABLE_NAME, function () {
      this.on(`${TABLE_NAME}.lesson_id`, '=', 'lessons.lesson_id')
        .andOn(`${TABLE_NAME}.user_id`, '=', db.raw('?', [userId]));
    })
    .where('chapters.course_id', courseId)
    .select(
      'chapters.title as chapter_title',
      'lessons.title as lesson_title',
      db.raw(`CASE WHEN ${TABLE_NAME}.lesson_id IS NULL THEN 0 ELSE 1 END as is_completed`),
      `${TABLE_NAME}.completed_at as completed_at`
    )
    .orderBy('chapters.chapter_id')
    .orderBy('lessons.lesson_id');
}

// Lấy tất cả bài học user đã hoàn thành (mọi khóa)
export async function findCompletedLessonsByUserAll(userId) {
  return db(TABLE_NAME)
    .where('user_id', userId)
    .select('*');
}