import express from 'express';
import * as categoryModel from '../models/category.model.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const list = await categoryModel.findAll();
  const categories = list.map(c => ({ ...c, catid: c.category_id, catname: c.name }));
  res.render('vwAdminCategory/list', { categories });
});

router.get('/add', (req, res) => {
  res.render('vwAdminCategory/add');
});

router.post('/add', async (req, res) => {
  const rawName = (req.body.catname || '').trim();

  // Basic validation
  if (!rawName) {
    return res.status(400).render('vwAdminCategory/add', {
      error: 'Category name cannot be empty.',
      old: { catname: '' }
    });
  }

  // Duplicate check (case-insensitive)
  const existed = await categoryModel.existsByName(rawName);
  if (existed) {
    return res.status(400).render('vwAdminCategory/add', {
      error: 'Category already exists, please choose a different name.',
      old: { catname: rawName }
    });
  }

  await categoryModel.add({ name: rawName });
  res.render('vwAdminCategory/add', { success: true });
});

router.get('/edit', async (req, res) => {
  const id = req.query.id || 0;
  const category = await categoryModel.findById(id);
  if (!category) return res.redirect('/admin/categories');
  // provide legacy keys for templates
  res.render('vwAdminCategory/edit', { category: { ...category, catid: category.category_id, catname: category.name } });
});

router.post('/del', async (req, res) => {
  // Accept legacy form field 'catid' as well
  const id = req.body.category_id || req.body.catid;
  
  // Kiểm tra xem category có khóa học nào không
  const hasCourses = await categoryModel.hasCourse(id);
  
  if (hasCourses) {
    // Nếu có khóa học, không cho phép xóa - render lại trang edit với thông báo lỗi
    const category = await categoryModel.findById(id);
    return res.render('vwAdminCategory/edit', {
      category: { ...category, catid: category.category_id, catname: category.name },
      error: 'Cannot delete this category because it has courses!'
    });
  }
  
  // Nếu không có khóa học, cho phép xóa
  try {
    await categoryModel.del(id);
    return res.redirect('/admin/categories');
  } catch (err) {
    // Phòng trường hợp vẫn dính ràng buộc FK (an toàn kép)
    const category = await categoryModel.findById(id);
    const isFkViolation = err && (err.code === '23503' || String(err.message).includes('foreign key'));
    return res.status(400).render('vwAdminCategory/edit', {
      category: { ...category, catid: category.category_id, catname: category.name },
      error: isFkViolation
        ? 'Cannot delete this category because it has courses!'
        : 'Cannot delete category due to system error, please try again.'
    });
  }
});

router.post('/patch', async (req, res) => {
  const id = req.body.category_id || req.body.catid;
  const rawName = (req.body.name || req.body.catname || '').trim();

  // Ensure category exists
  const existing = await categoryModel.findById(id);
  if (!existing) return res.redirect('/admin/categories');

  // Validate not empty
  if (!rawName) {
    return res.status(400).render('vwAdminCategory/edit', {
      category: { ...existing, catid: existing.category_id, catname: '' },
      error: 'Category name cannot be empty.'
    });
  }

  // Duplicate check excluding current id
  const duplicated = await categoryModel.existsByNameExceptId(rawName, id);
  if (duplicated) {
    return res.status(400).render('vwAdminCategory/edit', {
      category: { ...existing, catid: existing.category_id, catname: rawName },
      error: 'Category already exists, please choose a different name.'
    });
  }

  await categoryModel.patch(id, { name: rawName });
  res.redirect('/admin/categories');
});

export default router;
