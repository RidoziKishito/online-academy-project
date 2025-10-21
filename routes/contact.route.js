import express from 'express';
import contactModel from '../models/contact.model.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.render('contact', { layout: 'main' });
});

router.post('/', async (req, res) => {
  const { name, email, message } = req.body;

  try {
    // store message in DB
    await contactModel.add({ name, email, message });

    // If AJAX (fetch) request, return JSON
    if (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
      return res.json({ success: true });
    }

    // otherwise render the page with success
    res.render('contact', { layout: 'main', success: true, name, email });
  } catch (err) {
    console.error('Error saving contact message:', err);
    if (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
      return res.status(500).json({ success: false, error: 'Internal error' });
    }
    res.status(500).render('contact', { layout: 'main', error: 'An error occurred while sending your message.' });
  }
});

export default router;
