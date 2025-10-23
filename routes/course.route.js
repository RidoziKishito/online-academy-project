import express from 'express';
import * as courseModel from '../models/courses.model.js';
import * as categoryModel from '../models/category.model.js';
import * as instructorModel from '../models/instructors.model.js';
import * as chapterModel from '../models/chapter.model.js';
import * as enrollmentModel from '../models/enrollment.model.js';
import * as reviewModel from '../models/review.model.js';
import { restrict } from '../middlewares/auth.mdw.js';
const router = express.Router();

// Route hiển thị tất cả khóa học (Trang chủ)
router.get('/', async (req, res) =>
{
  // Fetch courses and enrich with instructor name and normalized fields
  const coursesRaw = await courseModel.findAll();

  // Map fields to what the template expects. If instructor name isn't available
  // in the courses table, we'll attempt to load it from instructors model.
  const instructorIds = [...new Set(coursesRaw.map(c => c.instructor_id).filter(Boolean))];

  let instructorsMap = {};
  if (instructorIds.length)
  {
    const instructors = await Promise.all(instructorIds.map(id => instructorModel.findById(id)));
    instructors.forEach(i =>
    {
      if (i) instructorsMap[i.user_id || i.instructor_id] = i.name || i.fullname || i.username || i.name;
    });
  }

  const courses = coursesRaw.map(c => ({
    // keep original fields but provide normalized aliases for templates
    ...c,
    course_id: c.course_id,
    title: c.title,
    description: c.full_description || c.short_description || '',
    image_url: c.image_url || c.large_image_url || null,
    current_price: (c.sale_price != null && c.sale_price > 0) ? c.sale_price : c.price,
    original_price: (c.sale_price != null && c.sale_price > 0) ? c.price : null,
    instructor_name: instructorsMap[c.instructor_id] || 'Unknown',
    rating_avg: (c.rating_avg != null ? Number(parseFloat(c.rating_avg).toFixed(1)) : (c.rating != null ? Number(parseFloat(c.rating).toFixed(1)) : 0)),
    rating_count: c.rating_count || c.total_reviews || 0,
    total_hours: c.total_hours || 0,
    total_lectures: c.total_lectures || 0,
  }));

  res.render('vwCourse/list', { courses, layout: 'main' });
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
// Route xem chi tiết một khóa học
router.get('/detail/:id', async (req, res) =>
{
  const courseId = req.params.id;

  const course = await courseModel.findById(courseId);
  if (!course) return res.redirect('/courses');

  const [chapters, instructor, reviews, ratingStats] = await Promise.all([
    chapterModel.findByCourseId(courseId),
    instructorModel.findById(course.instructor_id),
    reviewModel.getReviewsByCourse(courseId),
    reviewModel.getCourseRatingStats(courseId)
  ]);

  // Kiểm tra đã ghi danh chưa
  let isEnrolled = false;
  let userReview = null;
  if (req.session?.authUser)
  {
    const userId = req.session.authUser.user_id;
    isEnrolled = await enrollmentModel.checkEnrollment(userId, courseId);
    userReview = await reviewModel.getUserReview(userId, courseId);
  }

  res.render('vwCourse/details', {
    course,
    chapters,
    instructor,
    reviews,
    ratingStats,
    isEnrolled,
    userReview,
    layout: 'main'
  });
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


// Route xem các khóa học theo lĩnh vực (category)
router.get('/by-category/:id', async (req, res) =>
{
  const categoryId = req.params.id;
  const [category, coursesRawByCat] = await Promise.all([
    categoryModel.findById(categoryId),
    courseModel.findByCategory(categoryId)
  ]);

  if (!category)
  {
    return res.redirect('/');
  }

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

  res.render('vwCourse/byCategory', {
    category,
    courses,
    empty: courses.length === 0,
    layout: 'main'
  });
});

export default router;
