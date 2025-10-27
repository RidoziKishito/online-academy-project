import express from 'express';
import * as categoryModel from '../models/category.model.js';

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
    // Lấy tất cả category cha (parent_category_id IS NULL)
    const parentCategories = await categoryModel.findParentCategories();

    // Render ra view và truyền danh sách category cha
    res.render('vwAdminCategory/add', {
      categories: parentCategories
    });
  } catch (err) {
    console.error('Error fetching parent categories:', err);
    res.status(500).render('vwAdminCategory/add', {
      error: 'Failed to load parent categories.'
    });
  }
});

router.post('/add', async (req, res) => {
  const name = (req.body.catname || '').trim();
  const parentId = req.body.parent_id || null;

  // Validate rỗng
  if (!name) {
    const parentCategories = await categoryModel.findParentCategories();
    return res.status(400).render('vwAdminCategory/add', {
      error: 'Category name cannot be empty.',
      old: { catname: '', parent_id: parentId },
      categories: parentCategories
    });
  }

  // Kiểm tra trùng tên
  const existed = await categoryModel.existsByName(name);
  if (existed) {
    const parentCategories = await categoryModel.findParentCategories();
    return res.status(400).render('vwAdminCategory/add', {
      error: 'Category already exists, please choose a different name.',
      old: { catname: name, parent_id: parentId },
      categories: parentCategories
    });
  }

  // Gọi insert, DB tự tăng category_id
  await categoryModel.add({
    name,
    parent_category_id: parentId || null,
    created_at: new Date() // hoặc new Date().toISOString() tùy DB
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

    // Lấy danh sách category cha (loại trừ chính nó để tránh vòng lặp)
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
    console.error('Error fetching category for edit:', err);
    res.status(500).render('vwAdminCategory/edit', {
      error: 'Failed to load category for editing.'
    });
  }
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
  const name = (req.body.catname || req.body.name || '').trim();
  const parentId = req.body.parent_id || null;

  // 1️⃣ Kiểm tra category có tồn tại không
  const existing = await categoryModel.findById(id);
  if (!existing) return res.redirect('/admin/categories');

  // 2️⃣ Kiểm tra tên rỗng
  if (!name) {
    const parentCategories = await categoryModel.findParentCategories();
    return res.status(400).render('vwAdminCategory/edit', {
      category: { ...existing, catid: id, catname: '', parent_id: parentId },
      categories: parentCategories,
      error: 'Category name cannot be empty.'
    });
  }

  // 3️⃣ Kiểm tra trùng tên (ngoại trừ chính nó)
  const duplicated = await categoryModel.existsByNameExceptId(name, id);
  if (duplicated) {
    const parentCategories = await categoryModel.findParentCategories();
    return res.status(400).render('vwAdminCategory/edit', {
      category: { ...existing, catid: id, catname: name, parent_id: parentId },
      categories: parentCategories,
      error: 'Category already exists, please choose a different name.'
    });
  }

  // 4️⃣ Cập nhật category (không đổi created_at)
  await categoryModel.patch(id, {
    name,
    parent_category_id: parentId || null
  });

  // 5️⃣ Chuyển hướng lại danh sách
  res.redirect('/admin/categories?updated=true');
});


export default router;
