import express from 'express';
import { restrict } from '../middlewares/auth.mdw.js';
import * as enrollmentModel from '../models/enrollment.model.js';
import * as wishlistModel from '../models/wishlist.model.js';
import * as courseModel from '../models/courses.model.js';
import * as progressModel from '../models/progress.model.js';
import * as userModel from '../models/user.model.js';
import logger from '../utils/logger.js';
const router = express.Router();

// Apply middleware to all routes in this file
router.use(restrict);

// Page: My courses
router.get('/my-courses', async (req, res) =>
{
    const userId = req.session.authUser.user_id;

    const enrolledCourses = await enrollmentModel.findCoursesByUserId(userId);
    
    const coursesWithProgress = await Promise.all(
        enrolledCourses.map(async (course) =>
        {
            const [allLessons, completedInCourse] = await Promise.all([
                progressModel.countLessonsByCourse(course.course_id),
                progressModel.countCompletedLessons(course.course_id, userId)
            ]);

            const progress = allLessons > 0 ? Math.round((completedInCourse / allLessons) * 100) : 0;

            return {
                ...course,
                totalLessons: allLessons,
                completedLessons: completedInCourse,
                progress
            };
        })
    );

    res.render('vwStudent/my-courses', {
        courses: coursesWithProgress,
        layout: 'main'
    });
});

// Page: Wishlist
router.get('/my-wishlist', async (req, res) => {
    const userId = req.session.authUser.user_id;
    const courses = await wishlistModel.findCoursesByUserId(userId);
    res.render('vwStudent/my-wishlist', { courses });
});

// API: Add to wishlist (used by client fetch)
router.post('/wishlist/add', async (req, res) => {
    const userId = req.session.authUser.user_id;
    const { courseId } = req.body;
    await wishlistModel.add(userId, courseId);
    res.json({ success: true });
});

// API: Remove from wishlist
router.post('/wishlist/remove', async (req, res) => {
    const userId = req.session.authUser.user_id;
    const { courseId } = req.body;
    await wishlistModel.remove(userId, courseId);
    res.json({ success: true });
});
// Profile page
router.get('/profile', restrict, async (req, res) => {
    try {
        const userId = req.session.authUser.user_id;
        
        // Get basic information
        const [enrolledCourses, wishlistCourses, completedLessons] = await Promise.all([
            enrollmentModel.findCoursesByUserId(userId),
            wishlistModel.findCoursesByUserId(userId),
            progressModel.findCompletedLessonsByUserAll(userId) // Use the new function
        ]);

        // Compute statistics
        const stats = {
            totalCourses: enrolledCourses.length,
            totalWishlist: wishlistCourses.length,
            totalCompletedLessons: completedLessons.length,
            totalSpent: enrolledCourses.reduce((sum, course) => sum + (course.current_price || 0), 0)
        };

        // Compute progress per course
        const coursesWithProgress = await Promise.all(
            enrolledCourses.map(async (course) => {
                const [allLessons, completedInCourse] = await Promise.all([
                    progressModel.countLessonsByCourse(course.course_id),
                    progressModel.countCompletedLessons(course.course_id, userId)
                ]);
                
                const progress = allLessons > 0 ? Math.round((completedInCourse / allLessons) * 100) : 0;
                
                return {
                    ...course,
                    totalLessons: allLessons,
                    completedLessons: completedInCourse,
                    progress: progress
                };
            })
        );

        // Calculate badges
        const badges = calculateBadges(stats, coursesWithProgress);

        res.render('vwStudent/profile', {
            user: req.session.authUser,
            stats,
            coursesWithProgress,
            wishlistCourses,
            badges,
            layout: 'main'
        });
    } catch (error) {
        logger.error({ err: error, userId: req.session?.authUser?.user_id }, 'Profile error');
        res.redirect('/student/my-courses');
    }
});

// Badge calculation function
function calculateBadges(stats, courses) {
    const badges = [];
    
    // Enrollment badges
    if (stats.totalCourses >= 1) badges.push({ name: 'First Course', icon: '🎓', description: 'Enrolled in first course' });
    if (stats.totalCourses >= 5) badges.push({ name: 'Course Collector', icon: '📚', description: 'Enrolled in 5+ courses' });
    if (stats.totalCourses >= 10) badges.push({ name: 'Learning Addict', icon: '🏆', description: 'Enrolled in 10+ courses' });
    
    // Lesson completion badges
    if (stats.totalCompletedLessons >= 10) badges.push({ name: 'Lesson Master', icon: '⭐', description: 'Completed 10+ lessons' });
    if (stats.totalCompletedLessons >= 50) badges.push({ name: 'Study Hero', icon: '💫', description: 'Completed 50+ lessons' });
    
    // Course completion badges
    const completedCourses = courses.filter(c => c.progress === 100).length;
    if (completedCourses >= 1) badges.push({ name: 'Course Finisher', icon: '🥇', description: 'Completed first course' });
    if (completedCourses >= 3) badges.push({ name: 'Dedicated Learner', icon: '🏅', description: 'Completed 3+ courses' });
    
    // Spending badges
    if (stats.totalSpent >= 500000) badges.push({ name: 'Big Spender', icon: '💰', description: 'Spent 500K+ VND' });
    if (stats.totalSpent >= 1000000) badges.push({ name: 'VIP Learner', icon: '👑', description: 'Spent 1M+ VND' });
    
    return badges;
}


router.get('/public-profile', async (req, res) => {
    try {
        const userId = req.query.id;
        
        if (!userId) {
            return res.redirect('/');
        }

    // Fetch user info
        const user = await userModel.findById(userId);
        
        if (!user || user.role !== 'student') {
            return res.status(404).render('error', { 
                message: 'Student not found',
                layout: 'main'
            });
        }

        // Fetch public info
        const [enrolledCourses, completedLessons] = await Promise.all([
            enrollmentModel.findCoursesByUserId(userId),
            progressModel.findCompletedLessonsByUserAll(userId)
        ]);

        // Compute public stats
        const stats = {
            totalCourses: enrolledCourses.length,
            totalCompletedLessons: completedLessons.length
        };

        // Compute progress per course
        const coursesWithProgress = await Promise.all(
            enrolledCourses.map(async (course) => {
                const [allLessons, completedInCourse] = await Promise.all([
                    progressModel.countLessonsByCourse(course.course_id),
                    progressModel.countCompletedLessons(course.course_id, userId)
                ]);
                
                const progress = allLessons > 0 ? Math.round((completedInCourse / allLessons) * 100) : 0;
                
                return {
                    ...course,
                    totalLessons: allLessons,
                    completedLessons: completedInCourse,
                    progress: progress
                };
            })
        );

        // Calculate badges
        const badges = calculateBadges(stats, coursesWithProgress);

        res.render('vwStudent/public-profile', {
            profileUser: user, // The viewed user
            currentUser: req.session.authUser, // Current logged-in user (if any)
            stats,
            coursesWithProgress,
            badges,
            isOwnProfile: req.session.authUser?.user_id === parseInt(userId),
            layout: 'main'
        });
    } catch (error) {
        logger.error({ err: error, userId: req.query?.id }, 'Public profile error');
        res.status(500).render('error', { 
            message: 'Error loading profile',
            layout: 'main'
        });
    }
});


export default router;