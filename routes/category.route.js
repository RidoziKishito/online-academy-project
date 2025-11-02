import express from 'express';
import * as categoryModel from '../models/category.model.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const list = await categoryModel.findAll();
  const categories = list.map(c => ({ ...c, catid: c.category_id, catname: c.name }));
  res.render('vwAdminCategory/list', { 
    categories,
    updated: req.query.updated === 'true'
  });
});


router.get('/add', async (req, res) => {
  try {
    // Fetch all parent categories (parent_category_id IS NULL)
    const parentCategories = await categoryModel.findParentCategories();

    // Render view and pass parent categories
    res.render('vwAdminCategory/add', {
      categories: parentCategories
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching parent categories');
    res.status(500).render('vwAdminCategory/add', {
      error: 'Failed to load parent categories.'
    });
  }
});

router.post('/add', async (req, res) => {
  const name = (req.body.catname || '').trim();
  const parentId = req.body.parent_id || null;

  // Validate empty name
  if (!name) {
    const parentCategories = await categoryModel.findParentCategories();
    return res.status(400).render('vwAdminCategory/add', {
      error: 'Category name cannot be empty.',
      old: { catname: '', parent_id: parentId },
      categories: parentCategories
    });
  }

  // Check for duplicate name
  const existed = await categoryModel.existsByName(name);
  if (existed) {
    const parentCategories = await categoryModel.findParentCategories();
    return res.status(400).render('vwAdminCategory/add', {
      error: 'Category already exists, please choose a different name.',
      old: { catname: name, parent_id: parentId },
      categories: parentCategories
    });
  }

  // Insert; DB will auto-increment category_id
  await categoryModel.add({
    name,
    parent_category_id: parentId || null,
    created_at: new Date() // or new Date().toISOString() depending on DB
  });

  const parentCategories = await categoryModel.findParentCategories();
  res.render('vwAdminCategory/add', { success: true, categories: parentCategories });
});


// 🟩 GET /admin/categories/edit/:id
router.get('/edit/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const category = await categoryModel.findById(id);

    if (!category) {
      return res.redirect('/admin/categories');
    }

    // Get parent categories (exclude itself to avoid loops)
    const parentCategories = await categoryModel.findParentCategories();
    const parentOptions = parentCategories.filter(c => c.category_id !== Number(id));

    res.render('vwAdminCategory/edit', {
      category: {
        ...category,
        catid: category.category_id,
        catname: category.name
      },
      categories: parentOptions
    });
  } catch (err) {
    logger.error({ err, id: req.params?.id }, 'Error fetching category for edit');
    res.status(500).render('vwAdminCategory/edit', {
      error: 'Failed to load category for editing.'
    });
  }
});


router.post('/del', async (req, res) => {
  // Accept legacy form field 'catid' as well
  const id = req.body.category_id || req.body.catid;
  
  // Check if the category has any courses
  const hasCourses = await categoryModel.hasCourse(id);
  
  if (hasCourses) {
    // If it has courses, do not allow deletion - render edit page with error
    const category = await categoryModel.findById(id);
    const parentCategories = await categoryModel.findParentCategories();
    const parentOptions = parentCategories.filter(c => c.category_id !== Number(id));
    return res.render('vwAdminCategory/edit', {
      category: { ...category, catid: category.category_id, catname: category.name },
      categories: parentOptions,
      error: 'Cannot delete this category because it has courses!'
    });
  }
  
  // Check if the category has child categories (is being used as a parent)
  const hasChildren = await categoryModel.hasChildCategories(id);
  
  if (hasChildren) {
    // If it has child categories, do not allow deletion
    const category = await categoryModel.findById(id);
    const parentCategories = await categoryModel.findParentCategories();
    const parentOptions = parentCategories.filter(c => c.category_id !== Number(id));
    return res.render('vwAdminCategory/edit', {
      category: { ...category, catid: category.category_id, catname: category.name },
      categories: parentOptions,
      error: 'Cannot delete this category because it has subcategories!'
    });
  }
  
  // If no courses and no children, allow deletion
  try {
    await categoryModel.del(id);
    return res.redirect('/admin/categories');
  } catch (err) {
    // Safety net in case of lingering FK constraints
    const category = await categoryModel.findById(id);
    const parentCategories = await categoryModel.findParentCategories();
    const parentOptions = parentCategories.filter(c => c.category_id !== Number(id));
    const isFkViolation = err && (err.code === '23503' || String(err.message).includes('foreign key'));
    return res.status(400).render('vwAdminCategory/edit', {
      category: { ...category, catid: category.category_id, catname: category.name },
      categories: parentOptions,
      error: isFkViolation
        ? 'Cannot delete this category because it is referenced by other data!'
        : 'Cannot delete category due to system error, please try again.'
    });
  }
});

router.post('/patch', async (req, res) => {
  const id = req.body.category_id || req.body.catid;
  const name = (req.body.catname || req.body.name || '').trim();
  const parentId = req.body.parent_id || null;

  // 1️⃣ Check if the category exists
  const existing = await categoryModel.findById(id);
  if (!existing) return res.redirect('/admin/categories');

  // 2️⃣ Validate empty name
  if (!name) {
    const parentCategories = await categoryModel.findParentCategories();
    return res.status(400).render('vwAdminCategory/edit', {
      category: { ...existing, catid: id, catname: '', parent_id: parentId },
      categories: parentCategories,
      error: 'Category name cannot be empty.'
    });
  }

  // 3️⃣ Check for duplicate name (excluding itself)
  const duplicated = await categoryModel.existsByNameExceptId(name, id);
  if (duplicated) {
    const parentCategories = await categoryModel.findParentCategories();
    return res.status(400).render('vwAdminCategory/edit', {
      category: { ...existing, catid: id, catname: name, parent_id: parentId },
      categories: parentCategories,
      error: 'Category already exists, please choose a different name.'
    });
  }

  // 4️⃣ Update category (do not change created_at)
  await categoryModel.patch(id, {
    name,
    parent_category_id: parentId || null
  });

  // 5️⃣ Redirect back to the list
  res.redirect('/admin/categories?updated=true');
});


export default router;
