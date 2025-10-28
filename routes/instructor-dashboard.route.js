import express from 'express';
import { restrict, isInstructor } from '../middlewares/auth.mdw.js';
import * as courseModel from '../models/courses.model.js';
import * as progressModel from '../models/progress.model.js';
import * as enrollmentModel from '../models/enrollment.model.js';
import * as categoryModel from '../models/category.model.js';
import ChatService from '../services/chat.service.js';

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
        console.error('Error loading students chat page:', error);
        res.status(500).render('500');
    }
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
    try {
        const instructorId = req.session.authUser.user_id;
        const courseId = req.params.courseId;
        const { chapters } = req.body;

        // Verify ownership
        const course = await courseModel.findDetail(courseId, instructorId);
        if (!course) return res.status(403).json({ error: 'Not authorized' });

        // Gọi model xử lý toàn bộ DB logic
        await courseModel.updateCourseContent(courseId, chapters);

        res.json({ success: true });
    } catch (err) {
        console.error('Error saving course content:', err);
        res.status(500).json({ error: 'Internal server error' });
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
        console.error('Error deleting chapter:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/create', async (req, res) => {
    try {
        const instructorId = req.session.authUser.user_id;
        // Lấy danh sách parent categories và subcategories
        const parentCategories = await categoryModel.findParentCategories();
        let subcategories = [];

        // Nếu có parent categories, lấy subcategories của parent đầu tiên
        if (parentCategories.length > 0) {
            subcategories = await categoryModel.findSubcategories(parentCategories[0].category_id);
        }

        res.render('vwInstructor/create', {
            parentCategories,
            subcategories,
            oldData: {},
            // Thêm helper text cho instructor
            helpText: {
                draft: 'Save as draft to continue editing later',
                submit: 'Submit for review to make your course available after approval'
            }
        });
    } catch (err) {
        console.error('Error loading create course page:', err);
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
            subcategory_id, // Thêm subcategory_id
            price,
            sale_price,
            save_type
        } = req.body;

        // Kiểm tra subcategory có thuộc parent category không
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
        console.error(err);
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

// API endpoint để lấy subcategories
router.get('/api/categories/:categoryId/subcategories', async (req, res) => {
    try {
        const categoryId = parseInt(req.params.categoryId, 10);
        if (isNaN(categoryId)) {
            return res.status(400).json({ error: 'Invalid Category ID' });
        }

        // Kiểm tra xem category có tồn tại không
        const category = await categoryModel.findById(categoryId);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const subcategories = await categoryModel.findSubcategories(categoryId);

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

router.post('/courses/hide', isInstructor, async (req, res) => {
  try {
    const { course_id } = req.body;
    if (!course_id) return res.status(400).json({ ok:false, message: 'Missing course_id' });

    const instructorId = req.session.authUser.user_id;

    // Nếu model có hàm kiểm tra quyền (recommended)
    if (typeof courseModel.hideCourseByInstructor === 'function') {
      const updated = await courseModel.hideCourseByInstructor(course_id, instructorId);
      if (!updated) return res.status(403).json({ ok:false, message: 'Không tìm thấy khóa học hoặc không có quyền.' });
    } else {
      // Fallback: dùng hàm đơn giản (cần chắc server kiểm soát quyền khác)
      const updated = await courseModel.hideCourse(course_id);
      if (!updated) return res.status(404).json({ ok:false, message: 'Không thể cập nhật khóa học.' });
    }

    return res.json({ ok:true, message: 'Khóa học đã được ẩn thành công.' });
  } catch (err) {
    console.error('POST /instructor/courses/hide error:', err);
    return res.status(500).json({ ok:false, message: 'Server error' });
  }
});



router.post('/courses/show', isInstructor, async (req, res) => {
  try {
    const { course_id } = req.body;
    if (!course_id) return res.status(400).json({ success:false, message:'Missing course_id' });

    const userId = req.session.authUser.user_id;
    const updated = await courseModel.showCourseByInstructor(course_id, userId);
    if (!updated) return res.status(403).json({ success:false, message:'Không tìm thấy khóa học hoặc không có quyền.' });

    return res.json({ success:true, message:'Khóa học đã được hiện.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success:false, message:'Server error' });
  }
});

export default router;
