import express from 'express';
import db from '../utils/db.js';
import { restrict } from '../middlewares/auth.mdw.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Test page to show users and test chat functionality
router.get('/test-chat', restrict, async (req, res) => {
    try {
        const users = await db('users')
            .select('user_id', 'full_name', 'email', 'role')
            .where('user_id', '!=', req.session.authUser.user_id)
            .limit(10);

        res.render('test-chat', {
            users: users,
            currentUser: req.session.authUser
        });
    } catch (error) {
        logger.error({ err: error, userId: req.session?.authUser?.user_id }, 'Error loading test chat page');
        res.status(500).render('500');
    }
});

export default router;
