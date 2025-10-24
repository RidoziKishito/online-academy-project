import express from 'express';
// import multer from 'multer';
import fs from 'fs';
import path from 'path';
import * as courseModel from '../models/courses.model.js';
import * as categoryModel from '../models/category.model.js';
import * as enrollmentModel from '../models/enrollment.model.js';
import { z } from 'zod'; // <-- THÊM: Import Zod

const router = express.Router();

// --- THÊM: Định nghĩa Schema (khuôn mẫu) cho dữ liệu course ---
// Schema này sẽ tự động ép kiểu (string -> number) và kiểm tra dữ liệu
const courseSchema = z.object({
  title: z.string().min(1, "Course title is required"),
  full_description: z.string().min(1, "Course description is required"),
  image_url: z.string().url("Invalid image URL"),

  // Category is required
  category_id: z.string().min(1, "Please select a category")
    .pipe(z.coerce.number().int()),

  // Sử dụng .pipe() để validate là string không rỗng, SAU ĐÓ mới ép kiểu
  instructor_id: z.string().min(1, "Please select an instructor")
    .pipe(z.coerce.number().int()),

  rating: z.coerce.number().min(0, "Rating must be at least 0").max(5, "Rating cannot exceed 5").optional().default(0),
  total_reviews: z.coerce.number().int().min(0, "Reviews must be a positive integer").optional().default(0),
  total_hours: z.coerce.number().min(0, "Total hours must be positive").optional().default(0),
  total_lectures: z.coerce.number().int().min(0, "Total lectures must be a positive integer").optional().default(0),
  level: z.string().min(1, "Please select a level"),

  // Dùng preprocess để xóa dấu phẩy (,) trong giá tiền trước khi ép kiểu
  current_price: z.preprocess(
    (val) => String(val || '0').replace(/,/g, ''),
    z.coerce.number().min(0).optional().default(0)
  ),
  original_price: z.preprocess(
    (val) => String(val || '0').replace(/,/g, ''),
    z.coerce.number().min(0).optional().default(0)
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
    status: req.query.status || null,
    sortBy: req.query.sortBy || null,
    order: req.query.order || 'asc'
  };

  const list = await courseModel.findAllWithCategoryFiltered(filters);
  const categories = await categoryModel.findAll();

  res.render('vwAdminCourse/list', { 
    courses: list,
    categories,
    currentCategory: filters.categoryId,
    currentStatus: filters.status,
    currentSort: filters.sortBy,
    currentOrder: filters.order
  });
});

// Admins do not create courses; instructors submit and admins review.

// No POST /create in admin: course creation is done by instructors

// Approve course
router.post('/approve/:id', async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    await courseModel.approveCourse(courseId);
    res.redirect('/admin/courses?action=approved');
  } catch (error) {
    console.error(error);
    res.redirect('/admin/courses?error=approve_failed');
  }
});

// Hide course
router.post('/hide/:id', async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    await courseModel.hideCourse(courseId);
    res.redirect('/admin/courses?action=hidden');
  } catch (error) {
    console.error(error);
    res.redirect('/admin/courses?error=hide_failed');
  }
});

// Show (unhide) course
router.post('/show/:id', async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    await courseModel.showCourse(courseId);
    res.redirect('/admin/courses?action=shown');
  } catch (error) {
    console.error(error);
    res.redirect('/admin/courses?error=show_failed');
  }
});

// Delete course
router.post('/delete/:id', async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    
    // Check if course has enrollments
    const hasEnrollments = await enrollmentModel.hasEnrollmentsByCourse(courseId);
    if (hasEnrollments) {
      return res.redirect('/admin/courses?error=has_enrollments');
    }
    
    await courseModel.del(courseId);
    res.redirect('/admin/courses?action=deleted');
  } catch (error) {
    console.error(error);
    res.redirect('/admin/courses?error=delete_failed');
  }
});

export default router;