import db from '../utils/db.js';

const TABLE_NAME = 'user_lesson_progress'; // Sử dụng thống nhất 1 tên bảng

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

export async function getTotalLessonsByCourse(courseId) {
  const result = await db('lessons')
    .join('chapters', 'lessons.chapter_id', 'chapters.chapter_id')
    .where('chapters.course_id', courseId)
    .count('lessons.lesson_id as total')
    .first();
  
  return parseInt(result.total) || 0;
}

export async function getCompletedLessonsByCourse(userId, courseId) {
  const result = await db(TABLE_NAME) // Sử dụng TABLE_NAME thống nhất
    .join('lessons', `${TABLE_NAME}.lesson_id`, 'lessons.lesson_id')
    .join('chapters', 'lessons.chapter_id', 'chapters.chapter_id')
    .where({
      [`${TABLE_NAME}.user_id`]: userId,
      'chapters.course_id': courseId
    })
    .count(`${TABLE_NAME}.lesson_id as completed`)
    .first();
  
  return parseInt(result.completed) || 0;
}

// Thêm function này để lấy tất cả lessons completed (không filter theo course)
export async function findCompletedLessonsByUserAll(userId) {
  const result = await db(TABLE_NAME)
    .where('user_id', userId)
    .select('*');
  
  return result;
}