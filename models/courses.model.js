// models/courses.model.js
import db from '../utils/db.js';

const TABLE_NAME = 'courses';
const allowedSortCols = ['created_at', 'rating_avg', 'view_count', 'enrollment_count', 'course_id'];

/* ---------------------------
   Basic getters / CRUD
   --------------------------- */
export function findById(id) {
  return db(TABLE_NAME).where('course_id', id).first();
}

export function findByCategory(categoryId) {
  return db(TABLE_NAME).where('category_id', categoryId);
}

export async function updateCourseContent(courseId, chapters) {
  // validate added: robust, transactional upsert to avoid unique (course_id, order_index) conflicts
  return db.transaction(async (trx) => {
    // Normalize input
    const inputChapters = Array.isArray(chapters) ? chapters : [];

    // 1) Temporarily free existing order_index values to avoid unique conflicts
    await trx('chapters').where('course_id', courseId)
      .update({ order_index: trx.raw('order_index + 10000') });

    // 2) Fetch existing chapters (after bump) for mapping
    const existing = await trx('chapters').where('course_id', courseId).select('chapter_id');
    const existingIds = new Set(existing.map(c => c.chapter_id));

    // 3) Upsert chapters according to incoming order
    for (let i = 0; i < inputChapters.length; i++) {
      const ch = inputChapters[i] || {};
      const desiredOrder = (typeof ch.order_index === 'number' && ch.order_index > 0) ? ch.order_index : (i + 1);
      const title = (ch.title ?? '').toString();

      const rawId = ch.chapter_id;
      const isExistingNumeric = rawId && !String(rawId).startsWith('new-') && Number.isFinite(Number(rawId));

      if (isExistingNumeric && existingIds.has(Number(rawId))) {
        // Update existing chapter
        await trx('chapters')
          .where({ chapter_id: Number(rawId), course_id: courseId })
          .update({ title, order_index: desiredOrder });
        ch.chapter_id = Number(rawId);
      } else {
        // Insert new chapter
        const inserted = await trx('chapters')
          .insert({ course_id: courseId, title, order_index: desiredOrder })
          .returning('chapter_id');
        const newId = Array.isArray(inserted)
          ? (typeof inserted[0] === 'object' ? inserted[0].chapter_id : inserted[0])
          : inserted;
        ch.chapter_id = Number(newId);
      }
    }

    // 4) Delete chapters not present in submission (and cascade delete their lessons)
    const keepChapterIds = inputChapters
      .map(ch => Number(ch.chapter_id))
      .filter(id => Number.isFinite(id));

    if (keepChapterIds.length > 0) {
      const toDelete = await trx('chapters')
        .where('course_id', courseId)
        .whereNotIn('chapter_id', keepChapterIds)
        .select('chapter_id');
      const delIds = toDelete.map(r => r.chapter_id);
      if (delIds.length > 0) {
        await trx('lessons').whereIn('chapter_id', delIds).del();
        await trx('chapters').whereIn('chapter_id', delIds).del();
      }
    } else {
      // If no chapters submitted, clear all
      const allIds = await trx('chapters').where('course_id', courseId).pluck('chapter_id');
      if (allIds.length > 0) {
        await trx('lessons').whereIn('chapter_id', allIds).del();
        await trx('chapters').whereIn('chapter_id', allIds).del();
      }
    }

    // 5) Upsert lessons per chapter by replacing the set for simplicity
    for (const ch of inputChapters) {
      const chapterId = Number(ch.chapter_id);
      const lessons = Array.isArray(ch.lessons) ? ch.lessons : [];

      // Replace-all strategy for clarity
      await trx('lessons').where('chapter_id', chapterId).del();

      for (let li = 0; li < lessons.length; li++) {
        const ls = lessons[li] || {};
        await trx('lessons').insert({
          chapter_id: chapterId,
          title: (ls.title ?? '').toString(),
          video_url: ls.video_url || null,
          duration_seconds: Number.isFinite(Number(ls.duration_seconds)) ? Number(ls.duration_seconds) : 0,
          is_previewable: !!ls.is_previewable,
          order_index: (typeof ls.order_index === 'number' && ls.order_index > 0) ? ls.order_index : (li + 1),
          content: ls.content || ''
        });
      }
    }

    // 6) Ensure final normalized ordering 1..N
    for (let i = 0; i < inputChapters.length; i++) {
      await trx('chapters')
        .where({ chapter_id: inputChapters[i].chapter_id, course_id: courseId })
        .update({ order_index: i + 1 });
    }

    return true;
  });
}

export function findPageByCategory(categoryId, offset, limit) {
  return db(TABLE_NAME)
    .where('category_id', categoryId)
    .offset(offset)
    .limit(limit);
}

export function countByCategory(categoryId) {
  return db(TABLE_NAME)
    .where('category_id', categoryId)
    .count('course_id as amount')
    .first();
}

export function findByInstructor(instructorId) {
  return db('courses as c')
    .leftJoin('categories as cat', 'c.category_id', 'cat.category_id')
    .select(
      'c.course_id',
      'c.title',
      'c.image_url',
      'c.price',
      'c.sale_price',
      'c.is_complete',
      'c.enrollment_count',
      'cat.name as category_name',
      'c.status'
    )
    .where('c.instructor_id', instructorId)
    .orderBy('c.created_at', 'desc');
}

export function findDetail(courseId, instructorId) {
  return db('courses as c')
    .leftJoin('categories as cat', 'c.category_id', 'cat.category_id')
    .select(
      'c.*',
      'cat.name as category_name',
      'cat.parent_category_id'
    )
    .where({
      'c.course_id': courseId,
      'c.instructor_id': instructorId
    })
    .first();
}

/* ---------------------------
   Search related (kept as-is)
   --------------------------- */

/**
 * Full-text search with optional filters, sorting and pagination.
 * options: { categoryId, sortBy, order, page, limit }
 */
export async function search(keyword, options = {}) {
  const { categoryId, sortBy, order = 'desc', page = 1, limit = 10 } = options;
  const rawKeyword = String(keyword || '').trim();
  const tokens = rawKeyword.split(/\s+/).filter(Boolean);

  // Nếu không có từ khóa thì trả về rỗng
  if (!tokens.length) {
    return [];
  }

  // Tìm kết quả cho từng token, rồi union lại
  let allResults = [];
  for (const token of tokens) {
    let query = db(TABLE_NAME)
      .leftJoin('categories', 'courses.category_id', 'categories.category_id')
      .leftJoin('users', 'courses.instructor_id', 'users.user_id')
      .select(
        'courses.*',
        'categories.name as category_name',
        'users.full_name as instructor_name'
      )
      .where('courses.status', 'approved');

    // FTS hoặc ILIKE cho từng token
    query = query.where(function () {
      this.whereRaw(`fts_document @@ plainto_tsquery('simple', unaccent(?))`, [token])
        .orWhereRaw(`unaccent(lower(courses.title)) ILIKE unaccent(lower(?))`, [`%${token}%`]);
    });

    // Thêm filter category nếu có
    if (categoryId) {
      if (Array.isArray(categoryId)) {
        query = query.whereIn('courses.category_id', categoryId);
      } else {
        query = query.where('courses.category_id', categoryId);
      }
    }

    // Sắp xếp
    const direction = order && String(order).toLowerCase() === 'asc' ? 'asc' : 'desc';
    let effectiveSort = sortBy;
    if (!effectiveSort) effectiveSort = 'relevance';
    switch (effectiveSort) {
      case 'rating':
        query = query.orderBy('courses.rating_avg', direction);
        break;
      case 'price':
        query = query.orderBy(db.raw('COALESCE(courses.sale_price, courses.price)'), direction === 'asc' ? 'asc' : 'desc');
        break;
      case 'newest':
        query = query.orderBy('courses.created_at', direction);
        break;
      case 'bestseller':
        query = query.orderBy('courses.is_bestseller', 'desc').orderBy('courses.enrollment_count', 'desc');
        break;
      case 'relevance':
        // Không có rank vì mỗi token riêng biệt
        query = query.orderBy('courses.is_bestseller', 'desc').orderBy('courses.rating_avg', 'desc');
        break;
      default:
        query = query.orderBy('courses.is_bestseller', 'desc').orderBy('courses.rating_avg', 'desc').orderBy('courses.created_at', 'desc');
    }

    // Không phân trang từng token, chỉ phân trang sau khi union
    const results = await query;
    allResults = allResults.concat(results);
  }

  // Loại bỏ trùng lặp theo course_id
  const uniqueResults = [];
  const seen = new Set();
  for (const course of allResults) {
    if (!seen.has(course.course_id)) {
      uniqueResults.push(course);
      seen.add(course.course_id);
    }
  }

  // Phân trang kết quả cuối cùng
  const lim = parseInt(limit) || 10;
  const pg = Math.max(1, parseInt(page) || 1);
  const offset = (pg - 1) * lim;
  return uniqueResults.slice(offset, offset + lim);
}

export async function countSearch(keyword, categoryId) {
  const raw = String(keyword || '').trim();
  const tokens = raw.split(/\s+/).filter(Boolean);
  let query = db(TABLE_NAME).count('course_id as total');

  // Count only approved courses
  query = query.where('status', 'approved');

  if (tokens.length) {
    // Use per-token FTS or title ILIKE to count broadly-matching rows (same logic as search())
    const ftsParts = tokens.map(() => "fts_document @@ plainto_tsquery('simple', unaccent(?))");
    const ilikeParts = tokens.map(() => "unaccent(lower(title)) ILIKE unaccent(lower(?))");
    const ftsBindings = [...tokens];
    const ilikeBindings = tokens.map(t => `%${t}%`);
    const combinedWhere = '(' + ftsParts.concat(ilikeParts).join(' OR ') + ')';
    query = query.whereRaw(combinedWhere, [...ftsBindings, ...ilikeBindings]);
  }

  if (categoryId) {
    if (Array.isArray(categoryId)) {
      query = query.whereIn('category_id', categoryId);
    } else {
      query = query.where('category_id', categoryId);
    }
  }

  const row = await query.first();
  return parseInt(row?.total || 0, 10);
}

/* ---------------------------
   Keep many existing utilities
   --------------------------- */

export function findAll() {
  return db(TABLE_NAME);
}

export function findAllWithCategory() {
  return db(TABLE_NAME)
    .leftJoin('categories', 'courses.category_id', 'categories.category_id')
    .select(
      'courses.*',
      'categories.name as category_name'
    )
    .orderBy('courses.course_id', 'asc');
}

/* ---------------------------
   REWRITTEN: Filtered list + count
   (Safer & consistent with Knex + allowed sort)
   --------------------------- */

/**
 * Find courses with optional filters, sorting and pagination.
 * opts: { categoryId, status, instructorId, sortBy, order, limit, offset }
 */
export function findAllWithCategoryFiltered(opts = {}) {
  const sortBy = allowedSortCols.includes(opts.sortBy) ? opts.sortBy : 'created_at';
  const direction = opts.order === 'asc' ? 'asc' : 'desc';
  const limit = opts.limit ? parseInt(opts.limit, 10) : null;
  const offset = opts.offset ? parseInt(opts.offset, 10) : null;

  let query = db(TABLE_NAME)
    .leftJoin('categories', 'courses.category_id', 'categories.category_id')
    .leftJoin('users', 'courses.instructor_id', 'users.user_id')
    .select(
      'courses.*',
      'categories.name as category_name',
      'users.full_name as instructor_name'
    );

  // Support both single categoryId and array of categoryIds (for subcategories)
  if (opts.categoryId) {
    if (Array.isArray(opts.categoryId)) {
      query = query.whereIn('courses.category_id', opts.categoryId);
    } else {
      query = query.where('courses.category_id', opts.categoryId);
    }
  }
  if (opts.status) query = query.where('courses.status', opts.status);
  if (opts.instructorId) query = query.where('courses.instructor_id', opts.instructorId);

  query = query.orderBy(`courses.${sortBy}`, direction);

  if (limit !== null) query = query.limit(limit);
  if (offset !== null) query = query.offset(offset);

  return query;
}

/**
 * Count courses matching filters
 * opts: { categoryId, status, instructorId }
 */
export async function countAllWithCategoryFiltered(opts = {}) {
  let query = db(TABLE_NAME)
    .leftJoin('categories', 'courses.category_id', 'categories.category_id')
    .leftJoin('users', 'courses.instructor_id', 'users.user_id');

  // Support both single categoryId and array of categoryIds (for subcategories)
  if (opts.categoryId) {
    if (Array.isArray(opts.categoryId)) {
      query = query.whereIn('courses.category_id', opts.categoryId);
    } else {
      query = query.where('courses.category_id', opts.categoryId);
    }
  }
  if (opts.status) query = query.where('courses.status', opts.status);
  if (opts.instructorId) query = query.where('courses.instructor_id', opts.instructorId);

  const result = await query.count('courses.course_id as total').first();
  return parseInt(result.total || 0, 10);
}

/* ---------------------------
   NEW: getAllWithBadge
   - returns courses with is_new flag (created within newDays)
   - orders by is_bestseller DESC first, then by sortBy/order
   opts: { limit, offset, sortBy, order, newDays }
   --------------------------- */
export async function getAllWithBadge(opts = {}) {
  const limit = opts.limit ? parseInt(opts.limit, 10) : 6;
  const offset = opts.offset ? parseInt(opts.offset, 10) : 0;
  const sortBy = allowedSortCols.includes(opts.sortBy) ? opts.sortBy : 'created_at';
  const order = opts.order === 'asc' ? 'asc' : 'desc';
  const newDays = Math.max(1, parseInt(opts.newDays || 7, 10));

  // compute threshold date in JS
  const ms = newDays * 24 * 60 * 60 * 1000;
  const thresholdDate = new Date(Date.now() - ms);

  const rows = await db
    .from('courses as c')
    .leftJoin('users as u', 'c.instructor_id', 'u.user_id')
    .leftJoin('categories as cat', 'c.category_id', 'cat.category_id')
    .select(
      'c.*',
      'cat.name as category_name',
      'u.full_name as instructor_name',
      'u.avatar_url as instructor_avatar',
      db.raw('(c.created_at >= ?) as is_new', [thresholdDate])
    )
    .orderBy([{ column: 'c.is_bestseller', order: 'desc' }, { column: `c.${sortBy}`, order }])
    .limit(limit)
    .offset(offset);

  return rows.map(r => ({
    ...r,
    is_new: !!r.is_new,
    is_bestseller: !!r.is_bestseller,
  }));
}



/* ---------------------------
   Remaining helpers (kept mostly unchanged)
   --------------------------- */

export async function countAll() {
  const result = await db(TABLE_NAME).count('course_id as total').first();
  return parseInt(result.total || 0, 10);
}

export function findPage(limit, offset) {
  return db(TABLE_NAME)
    .select('*')
    .orderBy('course_id', 'desc')
    .limit(limit)
    .offset(offset);
}

export async function findByCategories(categoryIds) {
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) return [];

  const rows = await db(TABLE_NAME)
    .whereIn('category_id', categoryIds)
    .select('*');

  return rows;
}

export async function updateCourseRating(courseId, avg_rating, total_reviews) {
  await db(TABLE_NAME)
    .where('course_id', courseId)
    .update({
      rating_avg: avg_rating,
      rating_count: total_reviews
    });
}

/* CRUD helpers */
export function add(course) {
  return db(TABLE_NAME).insert(course).returning('course_id');
}

export function patch(id, course) {
  return db(TABLE_NAME).where('course_id', id).update(course);
}

export function del(id) {
  return db(TABLE_NAME).where('course_id', id).del();
}

/* Status operations */
export function approveCourse(courseId) {
  return db(TABLE_NAME)
    .where('course_id', courseId)
    .update({ status: 'approved' });
}

export function hideCourse(courseId) {
  return db(TABLE_NAME)
    .where('course_id', courseId)
    .update({ status: 'hidden' });
}

export function showCourse(courseId) {
  return db(TABLE_NAME)
    .where('course_id', courseId)
    .update({ status: 'approved' });
}

/* Enrollment & view counters */
export function countEnrollmentsByCourse(courseId) {
  return db('user_enrollments')
    .where('course_id', courseId)
    .count('enrollment_id as count')
    .first()
    .then(result => parseInt(result.count || 0, 10));
}

export function incrementViewCount(courseId) {
  return db(TABLE_NAME)
    .where('course_id', courseId)
    .increment('view_count', 1);
}

export function incrementEnrollment(courseId) {
  return db(TABLE_NAME)
    .where('course_id', courseId)
    .increment('enrollment_count', 1);
}

/* Course status utilities */
export function updateStatus(courseId, status) {
  return db(TABLE_NAME)
    .where('course_id', courseId)
    .update({
      status,
      updated_at: new Date()
    });
}

/* Course completeness check */
export async function checkCourseCompletion(courseId) {
  const stats = await db('chapters as ch')
    .leftJoin('lessons as l', 'ch.chapter_id', 'l.chapter_id')
    .where('ch.course_id', courseId)
    .count('ch.chapter_id as chapter_count')
    .count('l.lesson_id as lesson_count')
    .first();

  const isComplete = parseInt(stats.chapter_count, 10) > 0 && parseInt(stats.lesson_count, 10) > 0;

  await db(TABLE_NAME)
    .where('course_id', courseId)
    .update({
      is_complete: isComplete,
      updated_at: new Date()
    });

  return isComplete;
}

/* Update average rating from reviews */
export async function updateAverageRating(courseId) {
  const stats = await db('reviews')
    .where('course_id', courseId)
    .avg('rating as avg_rating')
    .count('review_id as rating_count')
    .first();

  const avg_rating = parseFloat(stats.avg_rating || 0).toFixed(1);
  const rating_count = parseInt(stats.rating_count || 0, 10);

  return db(TABLE_NAME)
    .where('course_id', courseId)
    .update({ rating_avg: avg_rating, rating_count: rating_count });
}


/**
 * Get related courses (same category or same parent category group)
 */
export async function findRelated(catId, courseId, numCourses = 4) {
  // Step 1: Find parent of the current category
  const cat = await db('categories').where('category_id', catId).first();

  let relatedCatIds = [];

  if (!cat) return [];

  if (cat.parent_category_id === null) {
    // Parent category → take itself + all its children
    const subcats = await db('categories')
      .where('parent_category_id', cat.category_id)
      .select('category_id');
    relatedCatIds = [cat.category_id, ...subcats.map(c => c.category_id)];
  } else {
    // Child category → take all siblings + the parent
    const siblings = await db('categories')
      .where('parent_category_id', cat.parent_category_id)
      .select('category_id');
    relatedCatIds = [cat.parent_category_id, ...siblings.map(c => c.category_id)];
  }

  // Step 2: Query related courses
  return db('courses')
    .whereIn('category_id', relatedCatIds)
    .whereNot('course_id', courseId)
    .where('status', 'approved') 
    .orderBy('rating_avg', 'desc')
    .orderBy('enrollment_count', 'desc')
    .limit(numCourses);
}


/**
 * Safe version: only allow owner (instructor) to hide
 * Returns number of rows updated
 */
export async function hideCourseByInstructor(courseId, instructorId) {
  return await db('courses')
    .where({ course_id: courseId, instructor_id: instructorId })
    .update({
      status: 'hidden',
      updated_at: db.fn.now()
    });
}


/**
 * Safe version: only allow owner (instructor) to show
 * Returns number of rows updated
 */
export async function showCourseByInstructor(courseId, instructorId) {
  return await db('courses')
    .where({ course_id: courseId, instructor_id: instructorId })
    .update({
      status: 'approved',
      updated_at: db.fn.now()
    });
}

// Increase view 
export async function increaseView(courseId) {
  return await db('courses')
    .where('course_id', courseId)
    .increment('view_count', 1);
}