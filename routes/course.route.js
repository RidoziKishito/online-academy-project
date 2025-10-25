import express from 'express';
import * as courseModel from '../models/courses.model.js';
import * as categoryModel from '../models/category.model.js';
import * as instructorModel from '../models/instructors.model.js';
import * as chapterModel from '../models/chapter.model.js';
import * as reviewModel from '../models/review.model.js';
import * as lessonModel from '../models/lesson.model.js';
import { ca } from 'zod/locales';

const router = express.Router();

// All courses
router.get('/', async (req, res) => {
  // 1️⃣ Lấy tất cả khóa học
  const courses = await courseModel.findAll();
  const courseIds = courses.map(c => c.course_id);

  // 2️⃣ Lấy tất cả chapters theo course_ids
  const allChapters = (await Promise.all(
    courseIds.map(id => chapterModel.findByCourseId(id))
  )).flat();

  // 3️⃣ Lấy tất cả lessons theo chapter_ids
  const chapterIds = allChapters.map(ch => ch.chapter_id);
  const allLessons = (await Promise.all(
    chapterIds.map(id => lessonModel.findByChapterIds([id]))
  )).flat();

  // 4️⃣ Gom bài học theo course_id thông qua chapter_id
  const lessonsByCourse = {};
  for (const lesson of allLessons) {
    const chapter = allChapters.find(ch => ch.chapter_id === lesson.chapter_id);
    if (!chapter) continue;
    const courseId = chapter.course_id;
    if (!lessonsByCourse[courseId]) lessonsByCourse[courseId] = [];
    lessonsByCourse[courseId].push(lesson);
  }

  // 5️⃣ Lấy instructors (nếu có)
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

  // 6️⃣ Tổng hợp dữ liệu course (thống kê giờ học, bài học)
  const courseList = courses.map(c => {
    const lessons = lessonsByCourse[c.course_id] || [];
    const totalSeconds = lessons.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
    const totalLectures = lessons.length;
    const totalHours = +(totalSeconds / 3600).toFixed(1);

    return {
      ...c,
      description: c.full_description || c.short_description || '',
      image_url: c.image_url || c.large_image_url || null,
      current_price: (c.sale_price != null && c.sale_price > 0) ? c.sale_price : c.price,
      original_price: (c.sale_price != null && c.sale_price > 0) ? c.price : null,
      instructor_name: instructorsMap[c.instructor_id] || 'Unknown',
      rating_avg: (c.rating_avg != null ? +parseFloat(c.rating_avg).toFixed(1)
                  : (c.rating != null ? +parseFloat(c.rating).toFixed(1) : 0)),
      rating_count: c.rating_count || c.total_reviews || 0,
      total_hours: totalHours,
      total_lectures: totalLectures,
    };
  });

  res.render('vwCourse/list', { courses: courseList, layout: 'main' });
});




// Route search: GET /courses/search?q=...
router.get('/search', async (req, res) => {
  const q = (req.query.q || req.query.q || '').trim();
  if (!q) {
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

router.get('/detail/:id', async (req, res) => {
  try {
    const courseId = req.params.id;

    // 1) Lấy course
    const course = await courseModel.findById(courseId);
    if (!course) return res.redirect('/courses');

    // 2) Lấy chapters, instructor, related, reviews
    const [chapters, instructor, relatedCourses, reviews, categoriesRaw] = await Promise.all([
      chapterModel.findByCourseId(courseId),
      instructorModel.findById(course.instructor_id),
      courseModel.findRelated(course.category_id, courseId, 4),
      reviewModel.findByCourseId(courseId), 
      categoryModel.findParentSon(course.category_id) // có parent và con
    ]);

    const categories = categoriesRaw || {
      parent: { id: null, name: null },
      child:  { id: null, name: null }
    };

    // 3) Lấy lessons theo chapterIds (nếu có chapters)
    const chapterIds = (chapters || []).map(ch => ch.chapter_id ?? ch.id).filter(Boolean);
    const lessons = chapterIds.length ? await lessonModel.findByChapterIds(chapterIds) : [];

    // 4) Gộp lesson vào sections theo chapter_id
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

    // 5) Chuẩn hóa course (bổ sung fields cần thiết)
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
      reviews: (reviews || []).map(r => ({
        name: r.full_name,
        avatar: r.avatar_url || '/img/default-avatar.png',
        rating: r.rating,
        comment: r.comment
      }))
    };


    // 6) Render
    res.render('vwCourse/details', {
      layout: 'main',
      course: normalizedCourse,
      related_courses: relatedCourses,
      categories
    });

  } catch (err) {
    console.error('❌ Error loading course details:', err);
    res.redirect('/courses');
  }
});




// Route xem các khóa học theo lĩnh vực (category)
router.get('/by-category/:id', async (req, res) => {
  const categoryId = req.params.id;
  const [category, coursesRawByCat] = await Promise.all([
    categoryModel.findById(categoryId),
    courseModel.findByCategory(categoryId)
  ]);

  if (!category) {
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
