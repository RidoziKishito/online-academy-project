import db from '../utils/db.js';

const TABLE_NAME = 'user_lesson_progress'; // Sử dụng thống nhất 1 tên bảng

// Đánh dấu bài học đã hoàn thành
// progress.model.js
// Giả sử `db` là instance Knex và TABLE_NAME là tên bảng (ví dụ 'user_lesson_progress')
export async function markAsCompleted(userId, lessonId) {
  // Dùng timestamp của DB để tránh vấn đề timezone giữa server và DB
  const now = db.fn.now();

  try {
    // Thực hiện INSERT; nếu có conflict trên (user_id, lesson_id) thì MERGE (update) thay vì tạo row mới.
    // Điều này chạy nguyên tử ở phía DB — tránh race condition so với check-then-insert.
    const rows = await db(TABLE_NAME)
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        // Đánh dấu hoàn thành
        is_completed: true,
        // completed_at lấy từ DB
        completed_at: now
      })
      // onConflict yêu cầu tồn tại unique constraint trên (user_id, lesson_id)
      .onConflict(['user_id', 'lesson_id'])
      // merge: cập nhật các cột nếu đã tồn tại row
      .merge({
        is_completed: true,
        completed_at: now
      })
      // .returning(...) chỉ dùng trên Postgres để trả về row vừa insert/update (tùy cần)
      .returning(['progress_id', 'user_id', 'lesson_id', 'is_completed', 'completed_at']);

    // rows thường là mảng; trả về row đầu (inserted/updated) hoặc true tuỳ luồng app của bạn
    return rows && rows[0] ? rows[0] : true;
  } catch (error) {
    // Log lỗi để debug
    console.error('markAsCompleted error:', error);
    // Tùy workflow: ném lỗi lên caller hoặc trả false/true; ở đây mình rethrow để caller biết có vấn đề
    throw error;
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