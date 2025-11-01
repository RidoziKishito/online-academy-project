import express from 'express';
import fs from 'fs';
import path from 'path';
import * as courseModel from '../models/courses.model.js';
import * as progressModel from '../models/progress.model.js';
import * as instructorModel from '../models/instructors.model.js';
import * as categoryModel from '../models/category.model.js';
import * as enrollmentModel from '../models/enrollment.model.js';
import { z } from 'zod';
import logger from '../utils/logger.js';

const router = express.Router();

// Define Zod schema for course data
// This schema coerces types (string -> number) and validates input
const courseSchema = z.object({
  title: z.string().min(1, "Course title is required"),
  short_description: z.string().min(1, "Short description is required"),
  full_description: z.string().min(1, "Course description is required"),
  image_url: z.string().url("Invalid image URL"),
  large_image_url: z.string().url("Invalid large image URL").optional().or(z.literal('')),
  requirements: z.string().optional().or(z.literal('')),

  // Category is required
  category_id: z.string().min(1, "Please select a category")
    .pipe(z.coerce.number().int()),

  // Use .pipe() to validate non-empty string BEFORE coercing to number
  instructor_id: z.string().min(1, "Please select an instructor")
    .pipe(z.coerce.number().int()),

  rating_avg: z.coerce.number().min(0, "Rating average must be at least 0").max(5, "Rating average cannot exceed 5").optional().default(0),
  rating_count: z.coerce.number().int().min(0, "Rating count must be a positive integer").optional().default(0),
  view_count: z.coerce.number().int().min(0, "View count must be a positive integer").optional().default(0),
  enrollment_count: z.coerce.number().int().min(0, "Enrollment count must be a positive integer").optional().default(0),

  // Use preprocess to remove commas from price strings before coercion
  current_price: z.preprocess(
    (val) => String(val || '0').replace(/,/g, ''),
    z.coerce.number().min(0).optional().default(0)
  ),
  original_price: z.preprocess(
    (val) => String(val || '0').replace(/,/g, ''),
    z.coerce.number().min(0).optional().default(0)
  ),

  // Checkbox handling: if checked (value="true") -> true, otherwise (undefined) -> false
  is_bestseller: z.preprocess(
    (val) => val === 'true',
    z.boolean()
  )
});


router.get('/', async (req, res) => {
  // Get filter and sort parameters from query string
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const filters = {
    categoryId: req.query.category ? parseInt(req.query.category) : null,
    status: req.query.status || null,
    instructorId: req.query.instructor ? parseInt(req.query.instructor) : null,
    sortBy: req.query.sortBy || null,
    order: req.query.order || 'asc',
    limit: limit,
    offset: offset
  };

  const list = await courseModel.findAllWithCategoryFiltered(filters);
  const total = await courseModel.countAllWithCategoryFiltered(filters);
  const totalPages = Math.ceil(total / limit);

  // If AJAX request, return JSON
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.json({
      courses: list,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: total,
        limit: limit
      }
    });
  }

  // Otherwise, render the full page
  const categories = await categoryModel.findAll();
  const instructors = await instructorModel.findAll();
  res.render('vwAdminCourse/list', { 
    courses: list,
    categories,
    instructors,
    currentCategory: filters.categoryId,
    currentStatus: filters.status,
    currentInstructor: filters.instructorId,
    currentSort: filters.sortBy,
    currentOrder: filters.order,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalItems: total,
      limit: limit
    }
  });
});

//admin can create course
router.get('/create', async (req, res) => {
  const categories = await categoryModel.findAll();
  const instructors = await instructorModel.findAll();
  res.render('vwAdminCourse/create-course', { categories, instructors });
});

router.post('/create', async (req, res) => {
  try {
    // Validate and parse the request body using Zod schema
    const courseData = courseSchema.parse(req.body);

  // Map form fields to database fields:
  // original_price (form) -> price (database - original price)
  // current_price (form) -> sale_price (database - sale price)
    const price = courseData.original_price || 0;
    let salePrice = courseData.current_price || null;
    
    // Validate: sale_price must be NULL or less than price
    if (salePrice !== null && salePrice > 0) {
      if (salePrice >= price) {
        salePrice = null; // If sale price >= original price, set to null
      }
    } else {
      salePrice = null; // If sale price is 0 or empty, set to null
    }

    const newCourse = {
      title: courseData.title,
      short_description: courseData.short_description,
      full_description: courseData.full_description,
      image_url: courseData.image_url,
      large_image_url: courseData.large_image_url || null,
      requirements: courseData.requirements || null,
      category_id: courseData.category_id,
      instructor_id: courseData.instructor_id,
      rating_avg: courseData.rating_avg,
      rating_count: courseData.rating_count,
      view_count: courseData.view_count,
      enrollment_count: courseData.enrollment_count,
      is_bestseller: courseData.is_bestseller,
      price: price,
      sale_price: salePrice
    };

    await courseModel.add(newCourse);
    res.redirect('/admin/courses?action=created');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const categories = await categoryModel.findAll();
      const instructors = await instructorModel.findAll();
      return res.status(400).render('vwAdminCourse/create-course', {
        errorMessages: error.flatten().fieldErrors,
        oldData: req.body,
        categories,
        instructors
      });
    }
    logger.error({ err: error }, 'Create course error');
    res.status(500).send('Server error');
  }
});

// Approve course
router.post('/approve/:id', async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    await courseModel.approveCourse(courseId);
    res.redirect('/admin/courses?action=approved');
  } catch (error) {
    logger.error({ err: error, courseId }, 'Approve course error');
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
    logger.error({ err: error, courseId }, 'Hide course error');
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
    logger.error({ err: error, courseId }, 'Show course error');
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
    // Prevent deleting course that still has lessons
    const lessonCount = await progressModel.countLessonsByCourse(courseId);
    if (lessonCount > 0) {
      return res.redirect('/admin/courses?error=has_lessons');
    }
    
    await courseModel.del(courseId);
    res.redirect('/admin/courses?action=deleted');
  } catch (error) {
    logger.error({ err: error, courseId }, 'Delete course error');
    res.redirect('/admin/courses?error=delete_failed');
  }
});

export default router;