import express from 'express';
import { restrict, isInstructor } from '../middlewares/auth.mdw.js';
import * as courseModel from '../models/courses.model.js';
import * as categoryModel from '../models/category.model.js';
import { z } from 'zod';

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
    res.send(`Trang quản lý cho khóa học ID: ${req.params.id}`);
});


export default router;
 
// ====== Course creation by instructor ======
const courseSchema = z.object({
    title: z.string().min(1, 'Course title is required'),
    full_description: z.string().min(1, 'Course description is required'),
    image_url: z.string().url('Invalid image URL'),
    category_id: z.string().min(1, 'Please select a category').pipe(z.coerce.number().int()),
    // Level is under consideration; make optional and do not persist until finalized
    level: z.string().optional(),
    current_price: z.preprocess(
        (val) => String(val || '0').replace(/,/g, ''),
        z.coerce.number().min(0).optional().default(0)
    ),
    original_price: z.preprocess(
        (val) => String(val || '0').replace(/,/g, ''),
        z.coerce.number().min(0).optional().default(0)
    ),
    is_bestseller: z.preprocess((val) => val === 'true', z.boolean()).optional().default(false)
});

// Show create course form
router.get('/courses/create', async (req, res) => {
    const categories = await categoryModel.findAll();
    res.render('vwInstructorCourse/create-course', { oldData: {}, categories });
});

// Handle create course submission
router.post('/courses/create', async (req, res) => {
    try {
        const instructorId = req.session.authUser.user_id;
        const validated = courseSchema.parse(req.body);

            // Map price and sale_price according to DB constraint: sale_price must be NULL or < price
            const basePrice = validated.original_price || validated.current_price || 0;
            let salePrice = validated.current_price || null;
            if (salePrice !== null) {
                // If salePrice is not strictly less than basePrice, set it to NULL to satisfy constraint
                if (salePrice >= basePrice || salePrice <= 0) {
                    salePrice = null;
                }
            }

            const courseData = {
            title: validated.title,
            full_description: validated.full_description,
            image_url: validated.image_url,
            category_id: validated.category_id,
            instructor_id: instructorId,
            is_bestseller: validated.is_bestseller,
                price: basePrice,
                sale_price: salePrice,
            rating_avg: 0,
            rating_count: 0,
            enrollment_count: 0,
            view_count: 0,
            is_complete: false,
            status: 'pending'
        };

        await courseModel.add(courseData);
        res.redirect('/instructor?action=submitted');
    } catch (error) {
        if (error instanceof z.ZodError) {
            const categories = await categoryModel.findAll();
            return res.status(400).render('vwInstructorCourse/create-course', {
                errorMessages: error.flatten().fieldErrors,
                oldData: req.body,
                categories
            });
        }
        console.error(error);
        res.status(500).send('Server error');
    }
});
