import express from 'express';
import * as courseModel from '../models/courses.model.js';
import * as categoryModel from '../models/category.model.js';
import * as instructorModel from '../models/instructors.model.js';
import * as chapterModel from '../models/chapter.model.js';
import * as lessonModel from '../models/lesson.model.js';
import { ca } from 'zod/locales';
import * as enrollmentModel from '../models/enrollment.model.js';
import * as reviewModel from '../models/review.model.js';
import * as wishlistModel from '../models/wishlist.model.js';
import { restrict } from '../middlewares/auth.mdw.js';
import session from 'express-session';
import logger from '../utils/logger.js';

const router = express.Router();

// All courses (pagination + sort + keep query params)
router.get('/', async (req, res, next) => {
  try {
    // ----- paging -----
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 6;
    const offset = (page - 1) * limit;

    // ----- sorting (sanitize) -----
    const allowedSort = ['created_at', 'rating_avg', 'view_count', 'enrollment_count', 'course_id'];
    const sortBy = allowedSort.includes(req.query.sortBy) ? req.query.sortBy : 'created_at';
    const order = req.query.order === 'asc' ? 'asc' : 'desc';

    // ----- filters from query (extend if needed) -----
    let categoryId = req.query.categoryId || null;
    const status = req.query.status || null;
    const instructorId = req.query.instructorId || null;

    // ----- If categoryId is provided, include subcategories -----
    if (categoryId) {
      const parsedCategoryId = parseInt(categoryId, 10);
      if (!Number.isNaN(parsedCategoryId)) {
        const allCategories = await categoryModel.findAll();
        const findSubCategoryIds = (id) => {
          const children = allCategories.filter(c => c.parent_category_id === id);
          let ids = children.map(c => c.category_id);
          for (const child of children) {
            ids = ids.concat(findSubCategoryIds(child.category_id));
          }
          return ids;
        };
        const allIds = [parsedCategoryId, ...findSubCategoryIds(parsedCategoryId)];
        categoryId = allIds; // Now categoryId is an array
      }
    }

    // ----- decide whether to use badge-mode (no filters) -----
    const noFilters = !categoryId && !status && !instructorId;

    let totalCourses = 0;
    let courses = [];

    if (noFilters) {
      // Use badge-mode: bestseller first + is_new flag
      totalCourses = await courseModel.countAll();
      courses = await courseModel.getAllWithBadge({ limit, offset, sortBy, order, newDays: 7 });
    } else {
      // Filter-aware
      const filters = { categoryId, status, instructorId, sortBy, order, limit, offset };
      totalCourses = await courseModel.countAllWithCategoryFiltered(filters);
      courses = await courseModel.findAllWithCategoryFiltered(filters);
    }

    const totalPagesRaw = Math.ceil((totalCourses || 0) / limit);
    const totalPages = Math.max(0, totalPagesRaw);

    // ----- build baseUrl (keep other query params except page) -----
    const qs = new URLSearchParams(req.query);
    qs.delete('page');
    const baseQuery = qs.toString();
    const baseUrl = baseQuery ? `?${baseQuery}&` : '?';

    // ----- get chapters & lessons for these courses -----
    const courseIds = courses.map(c => c.course_id);
    const allChapters = (await Promise.all(
      courseIds.map(id => chapterModel.findByCourseId(id))
    )).flat();

    const chapterIds = allChapters.map(ch => ch.chapter_id);
    const allLessons = (chapterIds.length ? (await Promise.all(
      chapterIds.map(id => lessonModel.findByChapterIds([id]))
    )).flat() : []);

    // ----- group lessons by course_id -----
    const lessonsByCourse = {};
    for (const lesson of allLessons) {
      const chapter = allChapters.find(ch => ch.chapter_id === lesson.chapter_id);
      if (!chapter) continue;
      const courseId = chapter.course_id;
      if (!lessonsByCourse[courseId]) lessonsByCourse[courseId] = [];
      lessonsByCourse[courseId].push(lesson);
    }

    // ----- get instructors (only for the current page courses) -----
    const instructorIds = [...new Set(courses.map(c => c.instructor_id).filter(Boolean))];
    let instructorsMap = {};
    if (instructorIds.length) {
      const instructors = await Promise.all(instructorIds.map(id => instructorModel.findById(id)));
      instructors.forEach(i => {
        if (!i) return;
        const key = i.instructor_id || i.user_id || i.id;
        instructorsMap[key] = i.full_name || 'Unknown';
      });
    }

    // ----- get categories (only for the current page courses) -----
    const categoryIds = [...new Set(courses.map(c => c.category_id).filter(Boolean))];
    let categoriesMap = {};
    if (categoryIds.length) {
      const categories = await Promise.all(categoryIds.map(id => categoryModel.findById(id)));
      categories.forEach(cat => {
        if (!cat) return;
        categoriesMap[cat.category_id] = cat.category_name || cat.name || 'Uncategorized';
      });
    }

    // ----- assemble courseList for view -----
    const courseList = courses.map(c => {
      const lessons = lessonsByCourse[c.course_id] || [];
      const totalSeconds = lessons.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
      const totalLectures = lessons.length;
      const totalHours = +(totalSeconds / 3600).toFixed(1);

      return {
        ...c,
        instructor_name: c.instructor_name || instructorsMap[c.instructor_id] || 'Unknown',
        category_name: categoriesMap[c.category_id] || 'Uncategorized',
        description: c.full_description || c.short_description || '',
        image_url: c.image_url || c.large_image_url || null,
        current_price: (c.sale_price != null && c.sale_price > 0) ? c.sale_price : c.price,
        original_price: (c.sale_price != null && c.sale_price > 0) ? c.price : null,
        rating_avg: (c.rating_avg != null ? +parseFloat(c.rating_avg).toFixed(1)
          : (c.rating != null ? +parseFloat(c.rating).toFixed(1) : 0)),
        rating_count: c.rating_count || c.total_reviews || 0,
        total_hours: totalHours,
        total_lectures: totalLectures,
        is_new: !!c.is_new,
        is_bestseller: !!c.is_bestseller,
        is_complete: !!c.is_complete,
        status: c.status
      };
    });

    // ----- pagination object (include baseUrl so template can reuse) -----
    let pagination = null;
    if (totalPages > 1) {
      const currentPage = Math.max(1, Math.min(page, totalPages));
      pagination = {
        currentPage,
        totalPages,
        prevPage: currentPage > 1 ? currentPage - 1 : 1,
        nextPage: currentPage < totalPages ? currentPage + 1 : totalPages,
        isFirst: currentPage === 1,
        isLast: currentPage === totalPages,
        pages: Array.from({ length: totalPages }, (_, i) => ({
          number: i + 1,
          active: i + 1 === currentPage,
        })),
        baseUrl, // used in the view to preserve query params when changing pages
      };
    }

    // ----- render view (pass query so template shows selected sort/order) -----
    res.render('vwCourse/list', {
      courses: courseList,
      pagination,
      query: { sortBy, order, categoryId: categoryId || '', status: status || '', instructorId: instructorId || '' },
      layout: 'main',
    });
  } catch (err) {
    next(err);
  }
});


// Route search: GET /courses/search?q=...
router.get('/search', async (req, res) =>
{
  const q = (req.query.q || '').trim();
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const rawCategory = req.query.category || null;
  const sortBy = req.query.sortBy || null; // rating | price | newest | bestseller
  const order = req.query.order === 'asc' ? 'asc' : 'desc';

  if (!q) {
    return res.render('vwCourse/search', { courses: [], q: '', empty: true, layout: 'main' });
  }

  // If category is provided, include its subcategories as well
  let categoryFilter = null;
  if (rawCategory) {
    const possibleId = parseInt(rawCategory, 10);
    if (!Number.isNaN(possibleId)) {
      // numeric id provided: include subcategories
      const allCategories = await categoryModel.findAll();
      const findSubCategoryIds = (id) => {
        const children = allCategories.filter(c => c.parent_category_id === id);
        let ids = children.map(c => c.category_id);
        for (const child of children) {
          ids = ids.concat(findSubCategoryIds(child.category_id));
        }
        return ids;
      };
      const allIds = [possibleId, ...findSubCategoryIds(possibleId)];
      categoryFilter = allIds;
    } else {
      // non-numeric: try fuzzy lookup by category name (e.g. 'dev' -> 'development')
      try {
        const fuzzy = await categoryModel.findByNameFuzzy(rawCategory);
        if (fuzzy && fuzzy.category_id) {
          const allCategories = await categoryModel.findAll();
          const findSubCategoryIds = (id) => {
            const children = allCategories.filter(c => c.parent_category_id === id);
            let ids = children.map(c => c.category_id);
            for (const child of children) ids = ids.concat(findSubCategoryIds(child.category_id));
            return ids;
          };
          categoryFilter = [fuzzy.category_id, ...findSubCategoryIds(fuzzy.category_id)];
        }
      } catch (err) {
        logger.error({ err, rawCategory }, 'Error in fuzzy category lookup');
      }
    }
  }

  // use full-text search in model with filters, sorting and pagination
  const options = { categoryId: categoryFilter, sortBy, order, page, limit };
  const rows = await courseModel.search(q, options);
  const total = await courseModel.countSearch(q, categoryFilter);
  const totalPages = Math.ceil((total || 0) / limit);

  // build baseUrl so pagination keeps other query params (except page)
  const qs = new URLSearchParams(req.query);
  qs.delete('page');
  const baseQuery = qs.toString();
  const baseUrl = baseQuery ? `?${baseQuery}&` : '?';

  // normalize similar to other handlers - show short_description first
  const now = new Date();
  const NEW_WINDOW_DAYS = 7; // consider "new" if created within this many days

  const courses = rows.map(c => ({
    ...c,
    course_id: c.course_id,
    title: c.title,
    // prefer snippet (highlight) returned by DB, then short_description
    description: c.snippet || c.short_description || c.full_description || '',
    image_url: c.image_url || c.large_image_url || null,
    current_price: (c.sale_price != null && c.sale_price > 0) ? c.sale_price : c.price,
    original_price: (c.sale_price != null && c.sale_price > 0) ? c.price : null,
    rating_avg: (c.rating_avg != null ? Number(parseFloat(c.rating_avg).toFixed(1)) : (c.rating != null ? Number(parseFloat(c.rating).toFixed(1)) : 0)),
    rating_count: c.rating_count || c.total_reviews || 0,
    total_hours: c.total_hours || 0,
    total_lectures: c.total_lectures || 0,
    // mark as new if created recently
    is_new: (() => {
      try {
        const created = c.created_at ? new Date(c.created_at) : null;
        if (!created) return false;
        const diffMs = now - created;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays <= NEW_WINDOW_DAYS;
      } catch (e) { return false; }
    })(),
  }));

  // pagination object for view
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  const pagination = null;
  if (totalPages > 1) {
    const pages = Array.from({ length: totalPages }, (_, i) => ({ number: i + 1, active: i + 1 === currentPage }));
    Object.assign(pagination || {}, {});
    // create a pagination object similar to other handlers
    // Note: we intentionally create a fresh object so templates can use the same fields
    // as the main listing
  }

  // build a more complete pagination object (used in templates)
  const paginationObj = {
    currentPage: currentPage,
    totalPages,
    prevPage: currentPage > 1 ? currentPage - 1 : 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : totalPages,
    isFirst: currentPage === 1,
    isLast: currentPage === totalPages,
    pages: Array.from({ length: totalPages }, (_, i) => ({ number: i + 1, active: i + 1 === currentPage })),
    totalItems: total,
    limit,
    baseUrl,
  };
  res.render('vwCourse/search', { courses, q, empty: courses.length === 0, layout: 'main', pagination: paginationObj, query: { category: rawCategory, sortBy, order } });
});

// helper: format seconds -> H:MM:SS or MM:SS
function formatDuration(seconds = 0) {
  seconds = Number(seconds) || 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

// Route: view course details
router.get('/detail/:id', async (req, res) => {
  try {
    const courseId = req.params.id;

    // 1️⃣ Fetch course
    const course = await courseModel.findById(courseId);
    if (!course) return res.redirect('/courses');

    // 2️⃣ Fetch chapters, instructor, related, reviews, categories, rating stats
    const [
      chapters,
      instructor,
      relatedCourses,
      reviewsRaw,
      categoriesRaw,
      ratingStats
    ] = await Promise.all([
      chapterModel.findByCourseId(courseId),
      instructorModel.findById(course.instructor_id),
      courseModel.findRelated(course.category_id, courseId, 4),
      reviewModel.getReviewsByCourse ? reviewModel.getReviewsByCourse(courseId) : reviewModel.findByCourseId(courseId),
      categoryModel.findParentSon(course.category_id),
      reviewModel.getCourseRatingStats ? reviewModel.getCourseRatingStats(courseId) : null
    ]);

    const categories = categoriesRaw || {
      parent: { id: null, name: null },
      child: { id: null, name: null }
    };

    // 3️⃣ Fetch lessons for each chapter (if any)
    const chapterIds = (chapters || []).map(ch => ch.chapter_id ?? ch.id).filter(Boolean);
    const lessons = chapterIds.length ? await lessonModel.findByChapterIds(chapterIds) : [];

    // 4️⃣ Group lessons into sections
    const sections = (chapters || []).map(ch => {
      const chId = ch.chapter_id ?? ch.id;
      const chapterLessons = (lessons || [])
        .filter(l => String(l.chapter_id) === String(chId))
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map(l => ({
          chapter_id: l.chapter_id,
          lesson_id: l.lesson_id,
          title: l.title,
          video_url: l.video_url,
          duration_seconds: l.duration_seconds,
          duration: formatDuration(l.duration_seconds),
          is_previewable: !!l.is_previewable,
          order_index: l.order_index ?? 0
        }));

      return {
        id: chId,
        title: ch.title,
        lecture_count: chapterLessons.length,
        lectures: chapterLessons
      };
    });

    // 5️⃣ Check user state (if logged in)
    let isEnrolled = false;
    let userReview = null;
    let isInWishlist = false;
    if (req.session?.authUser) {
      const userId = req.session.authUser.user_id;
      [isEnrolled, userReview, isInWishlist] = await Promise.all([
        enrollmentModel.checkEnrollment(userId, courseId),
        reviewModel.getUserReview ? reviewModel.getUserReview(userId, courseId) : null,
        wishlistModel.checkWishlist ? wishlistModel.checkWishlist(userId, courseId) : false
      ]);
    }

    // 6️⃣ Normalize course for rendering
    const normalizedCourse = {
      id: course.course_id,
      title: course.title,
      short_description: course.short_description || '',
      full_description: course.full_description || '',
      category_id: course.category_id,
      category_name: course.category_name,
      image_url: course.image_url || 'https://via.placeholder.com/800x450?text=No+Image',
      instructor_id: course.instructor_id,
      instructor_name: instructor?.full_name || 'Unknown Instructor',
      instructor_avatar: instructor?.avatar_url || '/img/default-avatar.png',
      instructor_bio: instructor?.bio || '',
      price: course.price || 0,
      sale_price: course.sale_price,
      is_bestseller: course.is_bestseller || false,
      view_count: course.view_count || 0,
      enrollment_count: course.enrollment_count || 0,
      rating_avg: course.rating_avg ? Number(parseFloat(course.rating_avg).toFixed(1)) : 0,
      rating_count: course.rating_count || 0,
      updated_at: course.updated_at || new Date(),
      requirements: course.requirements || [],
      sections,
      reviews: (reviewsRaw || []).map(r => ({
        name: r.full_name,
        avatar: r.avatar_url || '/img/default-avatar.png',
        rating: r.rating,
        comment: r.comment
      }))
    };


    // 7️⃣ Render
    res.render('vwCourse/details', {
      layout: 'main',
      course: normalizedCourse,
      related_courses: relatedCourses,
      categories,
      ratingStats,
      isEnrolled,
      userReview,
      isInWishlist,
      session: req.session,
      retUrl: req.originalUrl, 
    });

  } catch (err) {
    logger.error({ err, courseId: req.params?.id }, 'Error loading course details');
    res.redirect('/courses');
  }
});

// Enroll route
router.post('/detail/:id/enroll', restrict, async (req, res) =>
{
  const courseId = req.params.id;
  const userId = req.session.authUser.user_id;

  const exists = await enrollmentModel.checkEnrollment(userId, courseId);
  if (!exists)
  {
    await enrollmentModel.enroll(userId, courseId);
  }

  return res.redirect('/student/my-courses');
});
router.post('/wishlist/toggle', restrict, async (req, res) => {
    try {
        const userId = req.session.authUser.user_id;
        const { courseId } = req.body;

        if (!courseId) {
            return res.status(400).json({ success: false, message: 'Missing courseId' });
        }

        // Check if already in wishlist
        const isInWishlist = await wishlistModel.checkWishlist(userId, courseId);
        
        if (isInWishlist) {
            // Remove from wishlist
            await wishlistModel.remove(userId, courseId);
            res.json({ 
                success: true, 
                action: 'removed',
                message: 'Removed from wishlist!' 
            });
        } else {
            // Add to wishlist
            await wishlistModel.add(userId, courseId);
            res.json({ 
                success: true, 
                action: 'added',
                message: 'Added to wishlist!' 
            });
        }
  } catch (error) {
    logger.error({ err: error, userId: req.session?.authUser?.user_id, courseId: req.body?.courseId }, 'Wishlist toggle error');
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// Route: view courses by category
router.get('/by-category/:id', async (req, res) => {
  const categoryId = parseInt(req.params.id);

  try {
    // Get all categories
    const allCategories = await categoryModel.findAll();

    // Recursive function to find all child IDs of the current category
    const findSubCategoryIds = (id) => {
      const children = allCategories.filter(c => c.parent_category_id === id);
      let ids = children.map(c => c.category_id);
      for (const child of children) {
        ids = ids.concat(findSubCategoryIds(child.category_id));
      }
      return ids;
    };

    // Collect all target IDs (including itself)
    const allIds = [categoryId, ...findSubCategoryIds(categoryId)];

    // Get the main category
    const category = await categoryModel.findById(categoryId);
    if (!category) return res.redirect('/');

    // Support sorting, pagination and mark "new" like search
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 6;
    const sortBy = req.query.sortBy || null; // rating | price | newest | bestseller
    const order = req.query.order === 'asc' ? 'asc' : 'desc';

    const options = { categoryId: allIds, sortBy, order, page, limit };
    const rows = await courseModel.search('', options);
    const total = await courseModel.countSearch('', allIds);
    const totalPages = Math.ceil((total || 0) / limit);

    const now = new Date();
    const NEW_WINDOW_DAYS = 7;

    const courses = rows.map(c => ({
      ...c,
      course_id: c.course_id,
      title: c.title,
      description: c.full_description || c.short_description || '',
      image_url: c.image_url || c.large_image_url || null,
      current_price: (c.sale_price != null && c.sale_price > 0) ? c.sale_price : c.price,
      original_price: (c.sale_price != null && c.sale_price > 0) ? c.price : null,
      rating_avg: (c.rating_avg != null ? Number(parseFloat(c.rating_avg).toFixed(1)) : (c.rating != null ? Number(parseFloat(c.rating).toFixed(1)) : 0)),
      rating_count: c.rating_count || c.total_reviews || 0,
      total_hours: c.total_hours || 0,
      total_lectures: c.total_lectures || 0,
      is_new: (() => {
        try {
          const created = c.created_at ? new Date(c.created_at) : null;
          if (!created) return false;
          const diffMs = now - created;
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          return diffDays <= NEW_WINDOW_DAYS;
        } catch (e) { return false; }
      })(),
    }));

    // build baseUrl so pagination keeps other query params (except page)
    const qs = new URLSearchParams(req.query);
    qs.delete('page');
    const baseQuery = qs.toString();
    const baseUrl = baseQuery ? `?${baseQuery}&` : '?';

    const currentPage = Math.max(1, Math.min(page, totalPages || 1));
    const pagination = totalPages > 1 ? {
      currentPage,
      totalPages,
      prevPage: currentPage > 1 ? currentPage - 1 : 1,
      nextPage: currentPage < totalPages ? currentPage + 1 : totalPages,
      isFirst: currentPage === 1,
      isLast: currentPage === totalPages,
      pages: Array.from({ length: totalPages }, (_, i) => ({ number: i + 1, active: i + 1 === currentPage })),
      totalItems: total,
      limit,
      baseUrl,
    } : null;

    res.render('vwCourse/byCat', {
      category,
      courses,
      empty: courses.length === 0,
      layout: 'main',
      pagination,
      query: { sortBy, order }
    });
  } catch (err) {
    logger.error({ err, categoryId }, 'Error loading courses by category');
    res.status(500).send('Internal server error');
  }
});
  
router.get('/allCat', async (req, res) => {
  try {
    const categories = await categoryModel.getAllWithChildren();

    res.render('vwCourse/allCat', {
      layout: 'main',
      categories,
      session: req.session,
    });
  } catch (err) {
    logger.error({ err }, 'Error loading categories');
    res.status(500).render('vwError/500', { layout: 'main' });
  }
});


router.post('/view/:id', async (req, res) => {
  const courseId = req.params.id;
  const now = Date.now();

  // ✅ Nếu session chưa có viewedCourses thì tạo mới
  if (!req.session.viewedCourses) {
    req.session.viewedCourses = {};
  }

  const lastViewed = req.session.viewedCourses[courseId] || 0;

  // ⏳ Nếu chưa đủ 30s kể từ lần cuối thì bỏ qua
  if (now - lastViewed < 30000) {
    return res.sendStatus(204);
  }

  // ✅ Nếu đủ 30s rồi thì tăng view + cập nhật lại thời điểm
  await courseModel.increaseView(courseId);
  req.session.viewedCourses[courseId] = now;

  res.sendStatus(200);
});


export default router;
