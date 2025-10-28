import db from '../utils/db.js';

const TABLE_NAME = 'courses';

export function findById(id) {
  return db(TABLE_NAME).where('course_id', id).first();
}

export function findByCategory(categoryId) {
  return db(TABLE_NAME).where('category_id', categoryId);
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
      'cat.name as category_name'
    )
    .where('c.instructor_id', instructorId)
    .orderBy('c.created_at', 'desc');
}

export function findDetail(courseId, instructorId) {
  return db('courses as c')
    .leftJoin('categories as cat', 'c.category_id', 'cat.category_id')
    .select('c.*', 'cat.name as category_name')
    .where({ 'c.course_id': courseId, 'c.instructor_id': instructorId })
    .first();
}

/**
 * Full-text search with optional filters, sorting and pagination.
 * options: { categoryId, sortBy, order, page, limit }
 */
export async function search(keyword, options = {}) {
  const { categoryId, sortBy, order = 'desc', page = 1, limit = 10 } = options;

  // Keep rawKeyword for bindings (use plainto_tsquery for safer parsing)
  const rawKeyword = String(keyword || '').trim();
  // Build tsquery string (used earlier for legacy to_tsquery if needed)
  const keywords = rawKeyword.split(/\s+/).filter(Boolean).join(' & ');

  let query = db(TABLE_NAME)
    .leftJoin('categories', 'courses.category_id', 'categories.category_id')
    .leftJoin('users', 'courses.instructor_id', 'users.user_id')
    .select(
      'courses.*',
      'categories.name as category_name',
      'users.full_name as instructor_name'
    );

  if (rawKeyword) {
    // Use unaccent + plainto_tsquery for safer user input handling
    // We optionally include trigram-based fuzzy matching (pg_trgm) when enabled via env var
    const useTrigram = String(process.env.PG_TRGM || '').toLowerCase() === 'true';

    if (useTrigram) {
      // Combine FTS with trigram similarity and ILIKE fallback
      query = query.where(function () {
        this.whereRaw(`fts_document @@ plainto_tsquery('simple', unaccent(?))`, [rawKeyword])
          .orWhereRaw(`similarity(unaccent(lower(courses.title)), unaccent(lower(?))) > 0.28`, [rawKeyword])
          .orWhereRaw(`unaccent(lower(courses.title)) ILIKE unaccent(lower(?))`, [`%${rawKeyword}%`]);
      });
    } else {
      // Fallback: only use FTS and ILIKE fallback to avoid DB errors when pg_trgm not installed
      query = query.where(function () {
        this.whereRaw(`fts_document @@ plainto_tsquery('simple', unaccent(?))`, [rawKeyword])
          .orWhereRaw(`unaccent(lower(courses.title)) ILIKE unaccent(lower(?))`, [`%${rawKeyword}%`]);
      });
    }

    // Select relevance rank and a snippet to show in search results (if FTS available)
    query = query.select(db.raw("ts_rank(fts_document, plainto_tsquery('simple', unaccent(?))) as rank", [rawKeyword]));
    query = query.select(db.raw("ts_headline('simple', COALESCE(courses.short_description, courses.full_description, ''), plainto_tsquery('simple', unaccent(?)), 'MaxFragments=2, MinWords=5, MaxWords=20') as snippet", [rawKeyword]));
  }

  if (categoryId) {
    // support passing either a single id or an array of ids (for parent + subcategories)
    if (Array.isArray(categoryId)) {
      query = query.whereIn('courses.category_id', categoryId);
    } else {
      query = query.where('courses.category_id', categoryId);
    }
  }

  // Sorting
  const direction = order && String(order).toLowerCase() === 'asc' ? 'asc' : 'desc';
  // If user didn't specify a sort and there is a keyword, default to relevance
  let effectiveSort = sortBy;
  if (!effectiveSort && rawKeyword) effectiveSort = 'relevance';

  switch (effectiveSort) {
    case 'rating':
      query = query.orderBy('courses.rating_avg', direction);
      break;
    case 'price':
      // order by effective price (sale_price if present, otherwise price)
      query = query.orderBy(db.raw('COALESCE(courses.sale_price, courses.price)'), direction === 'asc' ? 'asc' : 'desc');
      break;
    case 'newest':
      query = query.orderBy('courses.created_at', direction);
      break;
    case 'bestseller':
      // bestseller flag first, then enrollment_count
      query = query.orderBy('courses.is_bestseller', 'desc').orderBy('courses.enrollment_count', 'desc');
      break;
    case 'relevance':
      // order by computed rank (selected above)
      query = query.orderByRaw('rank DESC NULLS LAST');
      // fallback ordering
      query = query.orderBy('courses.is_bestseller', 'desc').orderBy('courses.rating_avg', 'desc');
      break;
    default:
      // default relevance: order by is_bestseller then rating then created_at
      query = query.orderBy('courses.is_bestseller', 'desc').orderBy('courses.rating_avg', 'desc').orderBy('courses.created_at', 'desc');
  }

  // Pagination
  const lim = parseInt(limit) || 10;
  const pg = Math.max(1, parseInt(page) || 1);
  const offset = (pg - 1) * lim;

  query = query.limit(lim).offset(offset);

  return query;
}

export async function countSearch(keyword, categoryId) {
  const keywords = String(keyword || '').trim().split(/\s+/).filter(Boolean).join(' & ');
  let query = db(TABLE_NAME).count('course_id as total');
  if (keywords) {
    query = query.whereRaw(`fts_document @@ to_tsquery('simple', unaccent(?))`, [keywords]);
  }
  if (categoryId) {
    if (Array.isArray(categoryId)) {
      query = query.whereIn('category_id', categoryId);
    } else {
      query = query.where('category_id', categoryId);
    }
  }
  const row = await query.first();
  return parseInt(row?.total || 0);
}

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
export function findAllWithCategoryFiltered(filters = {}) {
  let query = db(TABLE_NAME)
    .leftJoin('categories', 'courses.category_id', 'categories.category_id')
    .leftJoin('users', 'courses.instructor_id', 'users.user_id')
    .select(
      'courses.*',
      'categories.name as category_name',
      'users.full_name as instructor_name'
    );

  if (filters.categoryId) query = query.where('courses.category_id', filters.categoryId);
  if (filters.status) query = query.where('courses.status', filters.status);
  if (filters.instructorId) query = query.where('courses.instructor_id', filters.instructorId);

  // Sorting: support created_at, rating_avg, view_count, enrollment_count
  const allowedSort = ['created_at', 'rating_avg', 'view_count', 'enrollment_count', 'course_id'];
  const sortBy = allowedSort.includes(filters.sortBy) ? filters.sortBy : 'created_at';
  const direction = filters.order === 'asc' ? 'asc' : 'desc';

  query = query.orderBy(`courses.${sortBy}`, direction);

  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset) query = query.offset(filters.offset);

  return query;
}


export async function countAllWithCategoryFiltered(filters = {}) {
  let query = db(TABLE_NAME)
    .leftJoin('categories', 'courses.category_id', 'categories.category_id')
    .leftJoin('users', 'courses.instructor_id', 'users.user_id');

  // Filter by category if provided
  if (filters.categoryId) {
    query = query.where('courses.category_id', filters.categoryId);
  }

  // Filter by status if provided
  if (filters.status) {
    query = query.where('courses.status', filters.status);
  }

  // Filter by instructor if provided
  if (filters.instructorId) {
    query = query.where('courses.instructor_id', filters.instructorId);
  }

  const result = await query.count('courses.course_id as total').first();
  return parseInt(result.total || 0);
}

export function add(course) {
  return db(TABLE_NAME).insert(course).returning('course_id');
}

export function patch(id, course) {
  return db(TABLE_NAME).where('course_id', id).update(course);
}

export function del(id) {
  return db(TABLE_NAME).where('course_id', id).del();
}

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

export function countEnrollmentsByCourse(courseId) {
  return db('enrollments')
    .where('course_id', courseId)
    .count('enrollment_id as count')
    .first()
    .then(result => parseInt(result.count || 0));
}

export function incrementEnrollment(courseId) {
  return db(TABLE_NAME).where('course_id', courseId).increment('enrollment_count', 1);
}

export async function updateAverageRating(courseId) {
  const stats = await db('reviews')
    .where('course_id', courseId)
    .avg('rating as avg_rating')
    .count('review_id as rating_count')
    .first();

  const avg_rating = parseFloat(stats.avg_rating || 0).toFixed(1);
  const rating_count = parseInt(stats.rating_count || 0);

  return db(TABLE_NAME)
    .where('course_id', courseId)
    .update({ rating_avg: avg_rating, rating_count: rating_count });
};

export function findRelated(catId, courseId, numCourses = 4) {
  return db('courses')
    .where('category_id', catId)
    .whereNot('course_id', courseId)
    .orderBy('rating_avg', 'desc')
    .orderBy('enrollment_count', 'desc')
    .limit(numCourses);
}

// Đếm tổng số khóa học
export async function countAll() {
  const result = await db(TABLE_NAME).count('course_id as total').first();
  return parseInt(result.total || 0);
}

// Lấy khóa học theo phân trang (Knex thuần)
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