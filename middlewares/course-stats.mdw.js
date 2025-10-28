import * as courseModel from '../models/courses.model.js';

// Middleware để tăng view_count khi xem chi tiết khóa học
export async function incrementViewCount(req, res, next) {
    try {
        const courseId = req.params.id;
        if (!courseId) return next();

        // Tránh đếm view từ instructor của khóa học
        const course = await courseModel.findById(courseId);
        if (course && course.instructor_id !== req.session?.authUser?.user_id) {
            await courseModel.incrementViewCount(courseId);
        }
        next();
    } catch (err) {
        next(err);
    }
}

// Middleware để cập nhật rating và enrollment khi có thay đổi
export async function updateCourseStats(courseId) {
    try {
        // Cập nhật rating trung bình và số lượng rating
        await courseModel.updateAverageRating(courseId);

        // Cập nhật số lượng học viên đăng ký
        const enrollmentCount = await courseModel.countEnrollmentsByCourse(courseId);
        await courseModel.patch(courseId, { enrollment_count: enrollmentCount });
    } catch (err) {
        console.error('Error updating course stats:', err);
    }
}