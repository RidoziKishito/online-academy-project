import express from 'express';
import ContactModel from '../models/contact.model.js';

const router = express.Router();

// Contact list page
router.get('/', async (req, res) => {
  const contacts = await ContactModel.all();
  res.render('vwAdmin/contact', {
    title: 'Manage Contacts',
    contacts
  });
});

// API: Get details (used by fetch on the client)
router.get('/:id', async (req, res) => {
  const contact = await ContactModel.findById(req.params.id);
  if (!contact) return res.status(404).json({ message: 'Not found' });
  res.json(contact);
});

export default router;
