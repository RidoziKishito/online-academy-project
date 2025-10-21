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
  const category = {
    name: req.body.name // Sửa thành name
  };
  await categoryModel.add(category);
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
  await categoryModel.del(id);
  res.redirect('/admin/categories');
});

router.post('/patch', async (req, res) => {
  const id = req.body.category_id || req.body.catid;
  const category = { name: req.body.name || req.body.catname };
  await categoryModel.patch(id, category);
  res.redirect('/admin/categories');
});

export default router;
