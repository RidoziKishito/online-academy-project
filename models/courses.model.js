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
  return db.transaction(async (trx) => {
    try {
      const chapterModel = await import('./chapter.model.js');
      const lessonModel = await import('./lesson.model.js');

      // Process each chapter
      for (const chapter of chapters) {
        if (chapter.chapter_id) {
          // Update existing chapter
          await chapterModel.patch(chapter.chapter_id, {
            title: chapter.title,
            order_index: chapter.order_index
          }, trx);
        } else {
          // Insert new chapter
          const [newChapterId] = await chapterModel.add({
            course_id: courseId,
            title: chapter.title,
            order_index: chapter.order_index
          }, trx);
          chapter.chapter_id = newChapterId;
        }

        // Process lessons for this chapter
        if (Array.isArray(chapter.lessons)) {
          for (const lesson of chapter.lessons) {
            const lessonData = {
              title: lesson.title,
              video_url: lesson.video_url,
              duration_seconds: lesson.duration_seconds,
              is_previewable: lesson.is_previewable,
              order_index: lesson.order_index,
              content: lesson.content
            };

            if (lesson.lesson_id) {
              // Update existing lesson
              await lessonModel.patch(lesson.lesson_id, lessonData, trx);
            } else {
              // Insert new lesson
              await lessonModel.add({
                ...lessonData,
                chapter_id: chapter.chapter_id
              }, trx);
            }
          }
        }
      }

      return true;
    } catch (err) {
      throw err;
    }
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
  const keywords = rawKeyword.split(/\s+/).filter(Boolean).join(' & ');

  let query = db(TABLE_NAME)
    .leftJoin('categories', 'courses.category_id', 'categories.category_id')
    .leftJoin('users', 'courses.instructor_id', 'users.user_id')
    .select(
      'courses.*',
      'categories.name as category_name',
      'users.full_name as instructor_name'
    );

  // Only return approved courses in search results
  query = query.where('courses.status', 'approved');

  if (rawKeyword) {
    const useTrigram = String(process.env.PG_TRGM || '').toLowerCase() === 'true';

    if (useTrigram) {
      query = query.where(function () {
        this.whereRaw(`fts_document @@ plainto_tsquery('simple', unaccent(?))`, [rawKeyword])
          .orWhereRaw(`similarity(unaccent(lower(courses.title)), unaccent(lower(?))) > 0.28`, [rawKeyword])
          .orWhereRaw(`unaccent(lower(courses.title)) ILIKE unaccent(lower(?))`, [`%${rawKeyword}%`]);
      });
    } else {
      query = query.where(function () {
        this.whereRaw(`fts_document @@ plainto_tsquery('simple', unaccent(?))`, [rawKeyword])
          .orWhereRaw(`unaccent(lower(courses.title)) ILIKE unaccent(lower(?))`, [`%${rawKeyword}%`]);
      });
    }

    query = query.select(db.raw("ts_rank(fts_document, plainto_tsquery('simple', unaccent(?))) as rank", [rawKeyword]));
    query = query.select(db.raw("ts_headline('simple', COALESCE(courses.short_description, courses.full_description, ''), plainto_tsquery('simple', unaccent(?)), 'MaxFragments=2, MinWords=5, MaxWords=20') as snippet", [rawKeyword]));
  }

  if (categoryId) {
    if (Array.isArray(categoryId)) {
      query = query.whereIn('courses.category_id', categoryId);
    } else {
      query = query.where('courses.category_id', categoryId);
    }
  }

  const direction = order && String(order).toLowerCase() === 'asc' ? 'asc' : 'desc';
  let effectiveSort = sortBy;
  if (!effectiveSort && rawKeyword) effectiveSort = 'relevance';

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
      query = query.orderByRaw('rank DESC NULLS LAST');
      query = query.orderBy('courses.is_bestseller', 'desc').orderBy('courses.rating_avg', 'desc');
      break;
    default:
      query = query.orderBy('courses.is_bestseller', 'desc').orderBy('courses.rating_avg', 'desc').orderBy('courses.created_at', 'desc');
  }

  const lim = parseInt(limit) || 10;
  const pg = Math.max(1, parseInt(page) || 1);
  const offset = (pg - 1) * lim;

  query = query.limit(lim).offset(offset);

  return query;
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

  if (opts.categoryId) query = query.where('courses.category_id', opts.categoryId);
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

  if (opts.categoryId) query = query.where('courses.category_id', opts.categoryId);
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