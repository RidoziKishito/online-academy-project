import express from 'express';
import { restrict, isInstructor } from '../middlewares/auth.mdw.js';
import * as courseModel from '../models/courses.model.js';
import * as progressModel from '../models/progress.model.js';
import * as enrollmentModel from '../models/enrollment.model.js';
import * as categoryModel from '../models/category.model.js';

const router = express.Router();

// Tất cả route trong đây yêu cầu đăng nhập VÀ phải là instructor
router.use(restrict, isInstructor);

// Trang chính: danh sách các khóa học của tôi
router.get('/', async (req, res) => {
    const instructorId = req.session.authUser.user_id;
    const courses = await courseModel.findByInstructor(instructorId);
    res.render('vwInstructor/dashboard', { courses });
});

// Trang quản lý chi tiết 1 khóa học (thêm/sửa chương, bài giảng)
router.get('/manage-course/:id', async (req, res) => {
    const instructorId = req.session.authUser.user_id;
    const courseId = req.params.id;

    // Lấy thông tin cơ bản của khóa học
    const course = await courseModel.findDetail(courseId, instructorId);
    if (!course) return res.status(404).render('404');

    // Lấy danh sách học viên và tính progress
    const enrollments = await enrollmentModel.findStudentsByCourse(courseId);
    const totalLessons = await progressModel.countLessonsByCourse(courseId);

    for (const enrollment of enrollments) {
        const completedLessons = await progressModel.countCompletedLessons(courseId, enrollment.user_id);
        enrollment.progress_percent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    }

    // Lấy categories cho dropdown
    const parentCategories = await categoryModel.findParentCategories();

    // Nếu course đã có category, lấy thông tin đầy đủ của nó
    let currentCategory = null;
    if (course.category_id) {
        currentCategory = await categoryModel.findByIdWithParent(course.category_id);
    }

    // Lấy subcategories dựa trên parent category
    const currentParentId = currentCategory?.parent_category_id || course.category_id || parentCategories[0]?.category_id;
    const subcategories = currentParentId ? await categoryModel.findSubcategories(currentParentId) : [];

    // Lấy chapters và lessons cho tab content
    const chapters = await (await import('../models/chapter.model.js')).findChaptersWithLessonsByCourseId(courseId);

    // Render với đầy đủ data
    res.render('vwInstructor/manage-course', {
        course,
        students: enrollments,
        currentCategory,
        parentCategories,
        subcategories,
        chapters
    });
});

router.get('/student-progress/:courseId/:userId', async (req, res) => {
    const instructorId = req.session.authUser.user_id;
    const { courseId, userId } = req.params;

    // Kiểm tra quyền instructor
    const course = await courseModel.findDetail(courseId, instructorId);
    if (!course) return res.status(403).render('403');

    // Lấy thông tin học viên (từ model enrollment)
    const student = await enrollmentModel.findStudentDetail(courseId, userId);
    if (!student) return res.status(404).render('404');

    // Lấy danh sách bài học & trạng thái hoàn thành
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
        console.error('Error fetching course content:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/api/courses/:courseId/content', async (req, res) => {
    const trx = await db.transaction();
    try {
        const instructorId = req.session.authUser.user_id;
        const courseId = req.params.courseId;
        const { chapters } = req.body;

        // Verify ownership
        const course = await courseModel.findDetail(courseId, instructorId);
        if (!course) return res.status(403).json({ error: 'Not authorized' });

        const chapterModel = await import('../models/chapter.model.js');
        const lessonModel = await import('../models/lesson.model.js');

        // Process each chapter
        for (const chapter of chapters) {
            if (chapter.chapter_id) {
                // Update existing chapter
                await chapterModel.patch(chapter.chapter_id, {
                    title: chapter.title,
                    order_index: chapter.order_index
                });
            } else {
                // Insert new chapter
                const [newChapterId] = await chapterModel.add({
                    course_id: courseId,
                    title: chapter.title,
                    order_index: chapter.order_index
                });
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
                        await lessonModel.patch(lesson.lesson_id, lessonData);
                    } else {
                        // Insert new lesson
                        await lessonModel.add({
                            ...lessonData,
                            chapter_id: chapter.chapter_id
                        });
                    }
                }
            }
        }

        await trx.commit();
        res.json({ success: true });
    } catch (err) {
        await trx.rollback();
        console.error('Error saving course content:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});// Delete chapter endpoint
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
        console.error('Error deleting chapter:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/create', async (req, res) => {
    const instructorId = req.session.authUser.user_id;
    res.render('vwInstructor/create');
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

// API endpoint để lấy subcategories
router.get('/api/categories/:categoryId/subcategories', async (req, res) => {
    try {
        const categoryId = parseInt(req.params.categoryId, 10);
        if (isNaN(categoryId)) {
            return res.status(400).json({ error: 'Invalid Category ID' });
        }

        console.log('Fetching subcategories for category:', categoryId); // Debug log

        // Kiểm tra xem category có tồn tại không
        const category = await categoryModel.findById(categoryId);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const subcategories = await categoryModel.findSubcategories(categoryId);
        console.log('Found subcategories:', subcategories); // Debug log

        // Luôn trả về một mảng, ngay cả khi không có subcategories
        res.json(subcategories || []);
    } catch (err) {
        console.error('Error fetching subcategories:', err);
        res.status(500).json({
            error: 'Internal server error',
            details: err.message
        });
    }
});

export default router;
