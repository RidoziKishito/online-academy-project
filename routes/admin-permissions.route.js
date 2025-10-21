import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.render('vwAdmin/admin-permissions', { layout: 'main' });
});

export default router;
