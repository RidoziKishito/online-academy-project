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
    // TODO: Thêm logic để lấy chi tiết khóa học, chương, bài giảng
    // Tương tự như route /learn
    const instructorId = req.session.authUser.user_id;
    const courseId = req.params.id;
    const course = await courseModel.findDetail(courseId, instructorId);
    const enrollments = await enrollmentModel.findStudentsByCourse(courseId);
    const totalLessons = await progressModel.countLessonsByCourse(courseId);
    // compute progress_percent (view expects `progress_percent` and `students` variable name)
    for (const enrollment of enrollments) {
        const completedLessons = await progressModel.countCompletedLessons(courseId, enrollment.user_id);
        enrollment.progress_percent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    }
    const categories = await categoryModel.findAll();
    // pass students (renamed from enrollments) and categories to match the view
    res.render('vwInstructor/manage-course', { course, students: enrollments, categories });
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
router.get('/create', async (req, res) => {
    const instructorId = req.session.authUser.user_id
    const categories = await categoryModel.findAll();
    // pass empty oldData and categories so the select can render
    res.render('vwInstructor/create', { categories, oldData: {} })
})

// Handle create course by instructor
router.post('/create', async (req, res) => {
    try {
        const instructorId = req.session.authUser.user_id;

        // Basic mapping from form fields to course model fields
        const {
            title,
            full_description,
            image_url,
            large_image_url,
            requirements,
            category_id,
            current_price,
            original_price,
            is_bestseller
        } = req.body;

        // normalize numeric fields (remove commas)
        const sale_price = current_price && String(current_price).trim() !== '' ? parseFloat(String(current_price).replace(/,/g, '')) : null;
        const price = original_price && String(original_price).trim() !== '' ? parseFloat(String(original_price).replace(/,/g, '')) : 0;

        const newCourse = {
            title,
            full_description,
            image_url,
            large_image_url: large_image_url || null,
            requirements: requirements || null,
            category_id: category_id ? parseInt(category_id) : null,
            instructor_id: instructorId,
            price,
            sale_price,
            is_bestseller: is_bestseller === 'true' || is_bestseller === 'on' || is_bestseller === '1'
        };

        await courseModel.add(newCourse);
        req.session.flash = { success: 'Course created.' };
        res.redirect('/instructor');
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

export default router;
