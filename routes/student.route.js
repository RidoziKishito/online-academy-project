import express from 'express';
import { restrict } from '../middlewares/auth.mdw.js';
import * as enrollmentModel from '../models/enrollment.model.js';
import * as wishlistModel from '../models/wishlist.model.js';
import * as courseModel from '../models/courses.model.js';
import * as progressModel from '../models/progress.model.js';
const router = express.Router();

// Áp dụng middleware cho tất cả route trong file này
router.use(restrict);

// Trang "Các khóa học của tôi"
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

// Trang "Danh sách yêu thích"
router.get('/my-wishlist', async (req, res) => {
    const userId = req.session.authUser.user_id;
    const courses = await wishlistModel.findCoursesByUserId(userId);
    res.render('vwStudent/my-wishlist', { courses });
});

// API thêm vào wishlist (dùng với fetch API từ client)
router.post('/wishlist/add', async (req, res) => {
    const userId = req.session.authUser.user_id;
    const { courseId } = req.body;
    await wishlistModel.add(userId, courseId);
    res.json({ success: true });
});

// API xóa khỏi wishlist
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
        
        // Lấy thông tin cơ bản
        const [enrolledCourses, wishlistCourses, completedLessons] = await Promise.all([
            enrollmentModel.findCoursesByUserId(userId),
            wishlistModel.findCoursesByUserId(userId),
            progressModel.findCompletedLessonsByUserAll(userId) // Use the new function
        ]);

        // Tính toán thống kê
        const stats = {
            totalCourses: enrolledCourses.length,
            totalWishlist: wishlistCourses.length,
            totalCompletedLessons: completedLessons.length,
            totalSpent: enrolledCourses.reduce((sum, course) => sum + (course.current_price || 0), 0)
        };

        // Tính tiến độ từng khóa học
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

        // Tính badges
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
        console.error('Profile error:', error);
        res.redirect('/student/my-courses');
    }
});

// Function tính badges
function calculateBadges(stats, courses) {
    const badges = [];
    
    // Badge đăng ký khóa học
    if (stats.totalCourses >= 1) badges.push({ name: 'First Course', icon: '🎓', description: 'Enrolled in first course' });
    if (stats.totalCourses >= 5) badges.push({ name: 'Course Collector', icon: '📚', description: 'Enrolled in 5+ courses' });
    if (stats.totalCourses >= 10) badges.push({ name: 'Learning Addict', icon: '🏆', description: 'Enrolled in 10+ courses' });
    
    // Badge hoàn thành bài học
    if (stats.totalCompletedLessons >= 10) badges.push({ name: 'Lesson Master', icon: '⭐', description: 'Completed 10+ lessons' });
    if (stats.totalCompletedLessons >= 50) badges.push({ name: 'Study Hero', icon: '💫', description: 'Completed 50+ lessons' });
    
    // Badge hoàn thành khóa học
    const completedCourses = courses.filter(c => c.progress === 100).length;
    if (completedCourses >= 1) badges.push({ name: 'Course Finisher', icon: '🥇', description: 'Completed first course' });
    if (completedCourses >= 3) badges.push({ name: 'Dedicated Learner', icon: '🏅', description: 'Completed 3+ courses' });
    
    // Badge chi tiêu
    if (stats.totalSpent >= 500000) badges.push({ name: 'Big Spender', icon: '💰', description: 'Spent 500K+ VND' });
    if (stats.totalSpent >= 1000000) badges.push({ name: 'VIP Learner', icon: '👑', description: 'Spent 1M+ VND' });
    
    return badges;
}
export default router;