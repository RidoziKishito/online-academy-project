import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { restrict, isInstructor } from '../middlewares/auth.mdw.js';
import * as courseModel from '../models/courses.model.js';
import * as progressModel from '../models/progress.model.js';
import * as enrollmentModel from '../models/enrollment.model.js';
import * as categoryModel from '../models/category.model.js';
import ChatService from '../services/chat.service.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup upload directory for videos
const uploadDir = path.join(__dirname, '..', 'static', 'videos');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /mp4|avi|mov|wmv/;
        const okExt = allowed.test(path.extname(file.originalname).toLowerCase());
        const okMime = allowed.test(file.mimetype);
        if (okExt && okMime) return cb(null, true);
        cb(new Error('Only video files are allowed!'));
    }
});

// All routes in this file require authentication AND instructor role
router.use(restrict, isInstructor);

// Main page: list of my courses
router.get('/', async (req, res) => {
    const instructorId = req.session.authUser.user_id;
    const courses = await courseModel.findByInstructor(instructorId);
    res.render('vwInstructor/dashboard', { courses });
});

// Manage a specific course (add/edit chapters, lessons)
router.get('/manage-course/:id', async (req, res) => {
    const instructorId = req.session.authUser.user_id;
    const courseId = req.params.id;

    // Get basic course info
    const course = await courseModel.findDetail(courseId, instructorId);
    if (!course) return res.status(404).render('404');

    // Fetch students and compute progress
    const enrollments = await enrollmentModel.findStudentsByCourse(courseId);
    const totalLessons = await progressModel.countLessonsByCourse(courseId);

    for (const enrollment of enrollments) {
        const completedLessons = await progressModel.countCompletedLessons(courseId, enrollment.user_id);
        enrollment.progress_percent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    }

    // Fetch categories for dropdown
    const parentCategories = await categoryModel.findParentCategories();

    // If the course has a category, get its full info
    let currentCategory = null;
    if (course.category_id) {
        currentCategory = await categoryModel.findByIdWithParent(course.category_id);
    }

    // Fetch subcategories based on parent category
    const currentParentId = currentCategory?.parent_category_id || course.category_id || parentCategories[0]?.category_id;
    const subcategories = currentParentId ? await categoryModel.findSubcategories(currentParentId) : [];

    // Fetch chapters and lessons for tab content
    const chapters = await (await import('../models/chapter.model.js')).findChaptersWithLessonsByCourseId(courseId);

    // Render with full data
    res.render('vwInstructor/manage-course', {
        course,
        students: enrollments,
        currentCategory,
        parentCategories,
        subcategories,
        chapters
    });
});

// Students chat page
router.get('/students-chat/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        const instructorId = req.session.authUser.user_id;

        // Get course details
        const course = await courseModel.findDetail(courseId, instructorId);
        if (!course) {
            return res.status(404).render('404');
        }

        // Get students enrolled in this course
        const students = await enrollmentModel.findStudentsByCourse(courseId);

        res.render('vwInstructor/students-chat', {
            course: course,
            students: students
        });
    } catch (error) {
        logger.error({ err: error, courseId: req.params?.courseId, instructorId: req.session?.authUser?.user_id }, 'Error loading students chat page');
        res.status(500).render('500');
    }
});

// Upload video for a lesson (instructor only)
router.post('/upload-video', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No video file uploaded' });
        }
        const videoPath = `/videos/${req.file.filename}`;
        return res.json({ success: true, videoPath });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Failed to upload video' });
    }
});

router.get('/student-progress/:courseId/:userId', async (req, res) => {
    const instructorId = req.session.authUser.user_id;
    const { courseId, userId } = req.params;

    // Check instructor permission
    const course = await courseModel.findDetail(courseId, instructorId);
    if (!course) return res.status(403).render('403');

    // Get student information (via enrollment model)
    const student = await enrollmentModel.findStudentDetail(courseId, userId);
    if (!student) return res.status(404).render('404');

    // Get list of lessons and completion status
    const lessons = await progressModel.findLessonProgressOfUser(courseId, userId);

    res.render('vwInstructor/student-progress', {
        course,
        student,
        lessons,
    });
});
// API Endpoints for Course Content Management
router.get('/api/courses/:courseId/content', async (req, res) => {
    try {
        const instructorId = req.session.authUser.user_id;
        const courseId = req.params.courseId;

        // Verify ownership
        const course = await courseModel.findDetail(courseId, instructorId);
        if (!course) return res.status(403).json({ error: 'Not authorized' });

        // Get chapters with lessons
        const chapterModel = await import('../models/chapter.model.js');
        const chapters = await chapterModel.findChaptersWithLessonsByCourseId(courseId);

        res.json({ chapters });
    } catch (err) {
        logger.error({ err, courseId: req.params?.courseId, instructorId: req.session?.authUser?.user_id }, 'Error fetching course content');
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/api/courses/:courseId/content', restrict, isInstructor, async (req, res) => {
  const courseId = Number(req.params.courseId);
  const { chapters = [] } = req.body || {};
  if (!Number.isInteger(courseId)) return res.status(400).json({ message: 'Invalid courseId' });

  const trx = await db.transaction();
  try {
    // Delete existing lessons & chapters for this course (clean replace)
    const existing = await trx('chapters').where({ course_id: courseId }).select('chapter_id');
    const existingIds = existing.map(r => r.chapter_id);
    if (existingIds.length) {
      await trx('lessons').whereIn('chapter_id', existingIds).del();
    }
    await trx('chapters').where({ course_id: courseId }).del();

    // Insert chapters and lessons fresh (order taken from array position)
    for (let ci = 0; ci < chapters.length; ci++) {
      const ch = chapters[ci] || {};
      const [insertedChapter] = await trx('chapters')
        .insert({
          course_id: courseId,
          title: ch.title || '',
          order_index: ci + 1
        })
        .returning(['chapter_id']);
      const chapterId = insertedChapter.chapter_id;

      const lessons = ch.lessons || [];
      for (let li = 0; li < lessons.length; li++) {
        const ls = lessons[li] || {};
        await trx('lessons')
          .insert({
            chapter_id: chapterId,
            title: ls.title || '',
            video_url: ls.video_url || null,
            duration_seconds: ls.duration_seconds || 0,
            is_previewable: !!ls.is_previewable,
            order_index: li + 1,
            content: ls.content || null
          });
      }
    }

    await trx.commit();
    return res.json({ success: true });
  } catch (err) {
    await trx.rollback();
    console.error('Error saving course content', { courseId: String(courseId), instructorId: req.session?.user_id, err });
    return res.status(500).json({ message: err.message || 'Save failed' });
  }
});

router.delete('/api/courses/:courseId/chapters/:chapterId', async (req, res) => {
    try {
        const { courseId, chapterId } = req.params;
        const instructorId = req.session.authUser.user_id;

        // Verify ownership
        const course = await courseModel.findDetail(courseId, instructorId);
        if (!course) return res.status(403).json({ error: 'Not authorized' });

        // Delete chapter using model (cascades to lessons)
        const chapterModel = await import('../models/chapter.model.js');
        await chapterModel.del(chapterId);

        // Reorder remaining chapters
        const chapters = await chapterModel.findByCourseId(courseId);
        await chapterModel.reorderChapters(courseId,
            chapters.map((ch, idx) => ({
                chapter_id: ch.chapter_id,
                order_index: idx + 1
            }))
        );

        res.json({ success: true });
    } catch (err) {
        logger.error({ err, courseId: req.params?.courseId, chapterId: req.params?.chapterId, instructorId: req.session?.authUser?.user_id }, 'Error deleting chapter');
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/create', async (req, res) => {
    try {
        const instructorId = req.session.authUser.user_id;
        // Fetch parent categories and subcategories
        const parentCategories = await categoryModel.findParentCategories();
        let subcategories = [];

        // If there are parent categories, fetch subcategories of the first parent
        if (parentCategories.length > 0) {
            subcategories = await categoryModel.findSubcategories(parentCategories[0].category_id);
        }

        res.render('vwInstructor/create', {
            parentCategories,
            subcategories,
            oldData: {},
            // Helper text for instructor
            helpText: {
                draft: 'Save as draft to continue editing later',
                submit: 'Submit for review to make your course available after approval'
            }
        });
    } catch (err) {
        logger.error({ err, instructorId: req.session?.authUser?.user_id }, 'Error loading create course page');
        req.session.flash = { error: 'Failed to load create course page' };
        res.redirect('/instructor/create');
    }
})

// Handle create course by instructor
router.post('/create', async (req, res) => {
    try {
        const instructorId = req.session.authUser.user_id;

        const {
            title,
            short_description,
            full_description,
            image_url,
            large_image_url,
            requirements,
            category_id,
            subcategory_id, // Add subcategory_id
            price,
            sale_price,
            save_type
        } = req.body;

        // Validate subcategory belongs to the selected parent category
        if (subcategory_id) {
            const subcategory = await categoryModel.findById(subcategory_id);
            if (!subcategory || subcategory.parent_category_id !== parseInt(category_id)) {
                throw new Error('Invalid subcategory selection');
            }
        }

        // Validate required fields
        if (!title || !short_description || !full_description || !image_url || !category_id || !price) {
            throw new Error('Missing required fields');
        }

        // normalize numeric fields (remove commas)
        const normalizedPrice = parseFloat(String(price).replace(/,/g, ''));
        const normalizedSalePrice = sale_price ? parseFloat(String(sale_price).replace(/,/g, '')) : null;

        // Validate price logic
        if (normalizedSalePrice && normalizedSalePrice >= normalizedPrice) {
            throw new Error('Sale price must be less than regular price');
        }

        const newCourse = {
            title: title.trim(),
            short_description: short_description.trim(),
            full_description,
            image_url,
            large_image_url: large_image_url || null,
            requirements: requirements || null,
            category_id: parseInt(category_id),
            instructor_id: instructorId,
            price: normalizedPrice,
            sale_price: normalizedSalePrice,
            status: save_type === 'draft' ? 'draft' : 'pending',
            is_complete: false,
            is_bestseller: false, // Only admin can set bestseller status
            view_count: 0,
            enrollment_count: 0,
            rating_avg: 0,
            rating_count: 0
        };

        await courseModel.add(newCourse);
        req.session.flash = { success: 'Course created.' };
        res.redirect('/instructor/create');
    } catch (err) {
        logger.error({ err, instructorId: req.session?.authUser?.user_id }, 'Instructor create course error');
        const categories = await categoryModel.findAll();
        return res.status(400).render('vwInstructor/create', { errorMessages: { general: ['Invalid data'] }, oldData: req.body, categories });
    }
});

// Instructor profile (view & update)
router.get('/profile', async (req, res) => {
    // authUser is provided via app middleware
    res.render('vwInstructor/profile');
});

router.post('/profile', async (req, res) => {
    const userId = req.session.authUser.user_id;
    const { full_name, avatar_url, bio } = req.body;

    // Basic validation
    if (!full_name || full_name.trim().length === 0) {
        req.session.flash = { error: 'Full name is required.' };
        return res.redirect('/instructor/profile');
    }

    await (await import('../models/user.model.js')).patch(userId, {
        full_name,
        avatar_url,
        bio
    });

    // Update session
    req.session.authUser.full_name = full_name;
    req.session.authUser.avatar_url = avatar_url;
    req.session.authUser.bio = bio;

    req.session.flash = { success: 'Profile updated.' };
    res.redirect('/instructor/profile');
});

// Handle form submit to update course (including is_complete)
router.post('/update-course/:id', async (req, res) => {
    const instructorId = req.session.authUser.user_id;
    const courseId = req.params.id;
    const { title, full_description, price, sale_price, category_id, status, image_url } = req.body;

    // Check permission
    const course = await courseModel.findDetail(courseId, instructorId);
    if (!course) return res.status(403).render('403');

    // Prepare patch data for editable fields
    const patchData = {
        title: title ?? course.title,
        full_description: full_description ?? course.full_description,
        price: price !== undefined && price !== '' ? parseFloat(String(price).replace(/,/g, '')) : course.price,
        sale_price: sale_price !== undefined && sale_price !== '' ? parseFloat(String(sale_price).replace(/,/g, '')) : course.sale_price,
        category_id: category_id ?? course.category_id,
        image_url: image_url ?? course.image_url,
        updated_at: new Date()
    };

    // Update DB depending on status
    if (status === 'completed') {
        // mark complete in DB
        await courseModel.patch(courseId, { ...patchData, is_complete: true });
        req.session.flash = { success: 'Course marked as completed.' };
    } else if (status === 'incomplete') {
        // mark incomplete
        await courseModel.patch(courseId, { ...patchData, is_complete: false });
        req.session.flash = { success: 'Course marked as incomplete.' };
    } else {
        // default: update fields only
        await courseModel.patch(courseId, patchData);
        req.session.flash = { success: 'Course updated.' };
    }

    res.redirect(`/instructor/manage-course/${courseId}`);
});

// API endpoint to fetch subcategories
router.get('/api/categories/:categoryId/subcategories', async (req, res) => {
    try {
        const categoryId = parseInt(req.params.categoryId, 10);
        if (isNaN(categoryId)) {
            return res.status(400).json({ error: 'Invalid Category ID' });
        }

        // Check if the category exists
        const category = await categoryModel.findById(categoryId);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const subcategories = await categoryModel.findSubcategories(categoryId);

        // Always return an array, even if there are no subcategories
        res.json(subcategories || []);
    } catch (err) {
            logger.error({ err, categoryId }, 'Error fetching subcategories');
        res.status(500).json({
            error: 'Internal server error',
            details: err.message
        });
    }
});

router.post('/courses/hide', isInstructor, async (req, res) => {
  try {
    const { course_id } = req.body;
    if (!course_id) return res.status(400).json({ ok:false, message: 'Missing course_id' });

    const instructorId = req.session.authUser.user_id;

        // If the model provides a permission-aware method (recommended)
    if (typeof courseModel.hideCourseByInstructor === 'function') {
      const updated = await courseModel.hideCourseByInstructor(course_id, instructorId);
            if (!updated) return res.status(403).json({ ok:false, message: 'Course not found or you do not have permission.' });
    } else {
            // Fallback: use simpler method (ensure permission is enforced elsewhere)
      const updated = await courseModel.hideCourse(course_id);
            if (!updated) return res.status(404).json({ ok:false, message: 'Unable to update course.' });
    }

        return res.json({ ok:true, message: 'Course has been hidden successfully.' });
    } catch (err) {
        logger.error({ err, body: req.body, instructorId: req.session?.authUser?.user_id }, 'POST /instructor/courses/hide error');
    return res.status(500).json({ ok:false, message: 'Server error' });
  }
});



router.post('/courses/show', isInstructor, async (req, res) => {
  try {
    const { course_id } = req.body;
    if (!course_id) return res.status(400).json({ success:false, message:'Missing course_id' });

    const userId = req.session.authUser.user_id;
    const updated = await courseModel.showCourseByInstructor(course_id, userId);
        if (!updated) return res.status(403).json({ success:false, message:'Course not found or you do not have permission.' });

        return res.json({ success:true, message:'Course is now visible.' });
  } catch (err) {
        logger.error({ err, body: req.body, instructorId: req.session?.authUser?.user_id }, 'POST /instructor/courses/show error');
    return res.status(500).json({ success:false, message:'Server error' });
  }
});

export default router;
