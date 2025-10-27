import express from 'express';
import ContactModel from '../models/contact.model.js';

const router = express.Router();

// Trang danh sách contact
router.get('/', async (req, res) => {
  const contacts = await ContactModel.all();
  res.render('vwAdmin/contact', {
    title: 'Manage Contacts',
    contacts
  });
});

// API xem chi tiết (fetch dùng JS)
router.get('/:id', async (req, res) => {
  const contact = await ContactModel.findById(req.params.id);
  if (!contact) return res.status(404).json({ message: 'Not found' });
  res.json(contact);
});

export default router;
