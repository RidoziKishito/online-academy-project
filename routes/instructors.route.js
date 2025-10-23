import express from 'express';
import * as userModel from '../models/user.model.js';
import * as courseModel from '../models/courses.model.js';

const router = express.Router();
// NOTE: Public listing route for instructors.
// Added to provide a public page that shows all instructor profiles.
// - Uses `userModel.findAllInstructors()` (new helper in models/user.model.js)
// - Renders `views/vwInstructorPublic/list.handlebars` with { instructors }
router.get('/', async (req, res) => {
    const instructors = await userModel.findAllInstructors();
    res.render('vwInstructorPublic/list', { instructors });
});
// Public instructor profile: /instructors/:id
// NOTE: Public instructor profile route.
// Added so students can view an instructor's public page and their courses.
// - Path: GET /instructors/:id
// - Validates that the user exists and has role === 'instructor'
// - Loads instructor's courses via `courseModel.findByInstructor`
// - Renders `views/vwInstructorPublic/profile.handlebars` with { instructor, courses }
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    const instructor = await userModel.findById(id);
    if (!instructor || instructor.role !== 'instructor') {
        return res.status(404).render('404');
    }

    const courses = await courseModel.findByInstructor(instructor.user_id);

    res.render('vwInstructorPublic/profile', { instructor, courses });
});

export default router;
