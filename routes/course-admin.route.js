import express from 'express';
// import multer from 'multer';
import fs from 'fs';
import path from 'path';
import * as courseModel from '../models/courses.model.js';
import * as categoryModel from '../models/category.model.js';
import { z } from 'zod'; // <-- THÊM: Import Zod

const router = express.Router();

// --- THÊM: Định nghĩa Schema (khuôn mẫu) cho dữ liệu course ---
// Schema này sẽ tự động ép kiểu (string -> number) và kiểm tra dữ liệu
const courseSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống"),
  description: z.string().min(1, "Mô tả không được để trống"), // Bạn có thể tăng min(50) nếu muốn
  image_url: z.string().url("URL hình ảnh không hợp lệ"),

  // Sử dụng .pipe() để validate là string không rỗng, SAU ĐÓ mới ép kiểu
  instructor_id: z.string().min(1, "Vui lòng chọn giảng viên")
    .pipe(z.coerce.number().int()),

  rating: z.coerce.number().min(0, "Rating phải lớn hơn 0").max(5, "Rating không được quá 5"),
  total_reviews: z.coerce.number().int().min(0, "Reviews phải là số nguyên dương"),
  total_hours: z.coerce.number().min(0, "Giờ học phải là số dương"),
  total_lectures: z.coerce.number().int().min(0, "Số bài giảng phải là số nguyên dương"),
  level: z.string().min(1, "Vui lòng chọn cấp độ"),

  // Dùng preprocess để xóa dấu phẩy (,) trong giá tiền trước khi ép kiểu
  current_price: z.preprocess(
    (val) => String(val).replace(/,/g, ''),
    z.coerce.number().int().min(0)
  ),
  original_price: z.preprocess(
    (val) => String(val).replace(/,/g, ''),
    z.coerce.number().int().min(0)
  ),

  // Xử lý checkbox: nếu được check (value="true") -> true, nếu không (undefined) -> false
  is_bestseller: z.preprocess(
    (val) => val === 'true',
    z.boolean()
  )
});
// -------------------------------------------------------------


router.get('/', async (req, res) => {
  // Get filter and sort parameters from query string
  const filters = {
    categoryId: req.query.category ? parseInt(req.query.category) : null,
    sortBy: req.query.sortBy || null,
    order: req.query.order || 'asc'
  };

  const list = await courseModel.findAllWithCategoryFiltered(filters);
  const categories = await categoryModel.findAll();

  res.render('vwAdminCourse/list', { 
    courses: list,
    categories,
    currentCategory: filters.categoryId,
    currentSort: filters.sortBy,
    currentOrder: filters.order
  });
});

router.get('/create', (req, res) => {
  // Render with empty oldData only; do not pass an empty errorMessages object
  // because Handlebars treats an empty object as truthy and the template
  // would show the error alert on first load.
  res.render('vwAdminCourse/create-course', { oldData: {} });
});

// --- CHỈNH SỬA: Toàn bộ router.post('/create') ---
router.post('/create', async (req, res) => {
  try {
    // 1. Validate và dọn dẹp req.body bằng schema
    // .parse() sẽ tự động ép kiểu (string -> number, v.v.)
    // Nếu thất bại, nó sẽ ném ra lỗi và nhảy xuống khối catch
    const courseData = courseSchema.parse(req.body);

    // 2. Dữ liệu đã hợp lệ và đúng kiểu, chỉ cần gọi model
    const ret = await courseModel.add(courseData);

    // 3. Thành công, chuyển hướng về danh sách
    res.redirect('/courses');

  } catch (error) {
    // 4. Nếu validation thất bại
    if (error instanceof z.ZodError) {
      console.error(error.flatten().fieldErrors); // Log lỗi ra console

      // Render lại trang 'create-course' (use full view path)
      res.status(400).render('vwAdminCourse/create-course', {
        errorMessages: error.flatten().fieldErrors,
        oldData: req.body 
      });
    } else {
      // Xử lý các lỗi khác (ví dụ: lỗi database)
      console.error(error);
      res.status(500).send("Đã có lỗi xảy ra từ máy chủ.");
    }
  }
});

export default router;