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
    const filters = {
      categoryId: req.query.categoryId || null,
      status: req.query.status || null,
      instructorId: req.query.instructorId || null,
      sortBy,
      order,
      limit,
      offset,
    };

    // ----- count total with filters -----
    const totalCourses = await courseModel.countAllWithCategoryFiltered(filters);
    const totalPagesRaw = Math.ceil((totalCourses || 0) / limit);
    const totalPages = Math.max(0, totalPagesRaw);

    // ----- build baseUrl (keep other query params except page) -----
    const qs = new URLSearchParams(req.query);
    qs.delete('page');
    const baseQuery = qs.toString();
    const baseUrl = baseQuery ? `?${baseQuery}&` : '?';

    // ----- fetch paged & sorted courses (model handles sort & pagination) -----
    const courses = await courseModel.findAllWithCategoryFiltered(filters);
    const courseIds = courses.map(c => c.course_id);

    // ----- get chapters & lessons for these courses (current approach) -----
    const allChapters = (await Promise.all(
      courseIds.map(id => chapterModel.findByCourseId(id))
    )).flat();

    const chapterIds = allChapters.map(ch => ch.chapter_id);
    const allLessons = (await Promise.all(
      chapterIds.map(id => lessonModel.findByChapterIds([id]))
    )).flat();

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

    // ----- assemble courseList for view -----
    const courseList = courses.map(c => {
      const lessons = lessonsByCourse[c.course_id] || [];
      const totalSeconds = lessons.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
      const totalLectures = lessons.length;
      const totalHours = +(totalSeconds / 3600).toFixed(1);

      return {
        ...c,
        // prefer instructor_name from joined query if available, else from instructorsMap
        instructor_name: c.instructor_name || instructorsMap[c.instructor_id] || 'Unknown',
        description: c.full_description || c.short_description || '',
        image_url: c.image_url || c.large_image_url || null,
        current_price: (c.sale_price != null && c.sale_price > 0) ? c.sale_price : c.price,
        original_price: (c.sale_price != null && c.sale_price > 0) ? c.price : null,
        rating_avg: (c.rating_avg != null ? +parseFloat(c.rating_avg).toFixed(1)
          : (c.rating != null ? +parseFloat(c.rating).toFixed(1) : 0)),
        rating_count: c.rating_count || c.total_reviews || 0,
        total_hours: totalHours,
        total_lectures: totalLectures,
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
        baseUrl, // dùng trong view để giữ các query params khi chuyển trang
      };
    }

    // ----- render view (truyền query để template show selected sort/order) -----
    res.render('vwCourse/list', {
      courses: courseList,
      pagination,
      query: { sortBy, order },
      layout: 'main',
    });
  } catch (err) {
    next(err);
  }
});


// Route search: GET /courses/search?q=...
router.get('/search', async (req, res) =>
{
  const q = (req.query.q || req.query.q || '').trim();
  if (!q)
  {
    return res.render('vwCourse/search', { courses: [], q: '', empty: true, layout: 'main' });
  }

  // use full-text search in model
  const rows = await courseModel.search(q);

  // normalize similar to other handlers
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
  }));

  res.render('vwCourse/search', { courses, q, empty: courses.length === 0, layout: 'main' });
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

// Route xem chi tiết một khóa học
router.get('/detail/:id', async (req, res) => {
  try {
    const courseId = req.params.id;

    // 1️⃣ Lấy course
    const course = await courseModel.findById(courseId);
    if (!course) return res.redirect('/courses');

    // 2️⃣ Lấy chapters, instructor, related, reviews, categories, rating stats
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

    // 3️⃣ Lấy lessons cho từng chapter (nếu có)
    const chapterIds = (chapters || []).map(ch => ch.chapter_id ?? ch.id).filter(Boolean);
    const lessons = chapterIds.length ? await lessonModel.findByChapterIds(chapterIds) : [];

    // 4️⃣ Gộp lesson vào sections
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

    // 5️⃣ Kiểm tra trạng thái người dùng (nếu có đăng nhập)
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

    // 6️⃣ Chuẩn hóa course để render
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
    console.error('❌ Error loading course details:', err);
    res.redirect('/courses');
  }
});

// Route ghi danh (enroll)
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

        // Kiểm tra đã có trong wishlist chưa
        const isInWishlist = await wishlistModel.checkWishlist(userId, courseId);
        
        if (isInWishlist) {
            // Remove from wishlist
            await wishlistModel.remove(userId, courseId);
            res.json({ 
                success: true, 
                action: 'removed',
                message: 'Đã xóa khỏi danh sách yêu thích!' 
            });
        } else {
            // Add to wishlist
            await wishlistModel.add(userId, courseId);
            res.json({ 
                success: true, 
                action: 'added',
                message: 'Đã thêm vào danh sách yêu thích!' 
            });
        }
    } catch (error) {
        console.error('Wishlist toggle error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});



// Route xem các khóa học theo lĩnh vực (category)
router.get('/by-category/:id', async (req, res) => {
  const categoryId = parseInt(req.params.id);

  try {
    // Lấy tất cả danh mục
    const allCategories = await categoryModel.findAll();

    // Hàm đệ quy tìm toàn bộ ID con của category hiện tại
    const findSubCategoryIds = (id) => {
      const children = allCategories.filter(c => c.parent_category_id === id);
      let ids = children.map(c => c.category_id);
      for (const child of children) {
        ids = ids.concat(findSubCategoryIds(child.category_id));
      }
      return ids;
    };

    // Lấy tất cả ID cần tìm (bao gồm chính nó)
    const allIds = [categoryId, ...findSubCategoryIds(categoryId)];

    // Lấy category chính
    const category = await categoryModel.findById(categoryId);
    if (!category) return res.redirect('/');

    // Lấy tất cả khóa học thuộc các category con (và chính nó)
    const coursesRawByCat = await courseModel.findByCategories(allIds);

    const courses = coursesRawByCat.map(c => ({
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
    }));

    res.render('vwCourse/byCat', {
      category,
      courses,
      empty: courses.length === 0,
      layout: 'main'
    });
  } catch (err) {
    console.error(err);
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
    console.error('❌ Error loading categories:', err);
    res.status(500).render('vwError/500', { layout: 'main' });
  }
});


export default router;
