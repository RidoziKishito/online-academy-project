-- ================================================
-- SCHEMA DATABASE CHO ĐỀ TÀI: ONLINE ACADEMY
-- Dựa trên tài liệu yêu cầu (10 ảnh)
-- Tương thích với PostgreSQL (Supabase)
-- ================================================

-- ----
-- 1. Dọn dẹp (chạy lại từ đầu)
-- ----
DROP TABLE IF EXISTS user_lesson_progress CASCADE;
DROP TABLE IF EXISTS user_wishlist CASCADE;
DROP TABLE IF EXISTS user_enrollments CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS chapters CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_role_enum;

-- ----
-- 2. Định nghĩa các kiểu dữ liệu (ENUMs)
-- ----
CREATE TYPE user_role_enum AS ENUM (
    'student', 
    'instructor', 
    'admin'
);

-- ----
-- 3. Tạo bảng USERS (Người dùng)
-- ----
-- Bảng này lưu tất cả các loại tài khoản: học viên, giảng viên, và admin
-- Phân biệt bằng cột 'role'
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Dùng để lưu hash từ bcrypt
    role user_role_enum NOT NULL DEFAULT 'student',
    
    -- Thông tin bổ sung cho giảng viên
    bio TEXT, -- Mô tả tiểu sử giảng viên
    avatar_url VARCHAR(1000), -- Ảnh đại diện
    
    -- Xác thực tài khoản (cho mục 1.6 Đăng ký)
    is_verified BOOLEAN DEFAULT FALSE,
    otp_secret VARCHAR(50),
    otp_expires_at TIMESTAMP,

    -- Đăng nhập qua Google/Facebook (mục 5.1)
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Đảm bảo email là duy nhất, hoặc cặp (provider, oauth_id) là duy nhất
    CONSTRAINT uq_oauth UNIQUE (oauth_provider, oauth_id)
);

-- ----
-- 4. Tạo bảng CATEGORIES (Lĩnh vực)
-- ----
-- Hỗ trợ 2 cấp (mục 1.1) bằng cách tự tham chiếu (parent_category_id)
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    parent_category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL, -- Nếu cha bị xoá, con lên làm cấp 1
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----
-- 5. Tạo bảng COURSES (Khoá học)
-- ----
CREATE TABLE courses (
    course_id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    short_description TEXT, -- Mô tả ngắn (mục 1.5)
    full_description TEXT, -- Mô tả chi tiết, hỗ trợ WYSIWYG (mục 1.5, 3.1)
    image_url VARCHAR(1000), -- Ảnh đại diện (mục 1.3)
    large_image_url VARCHAR(1000), -- Ảnh đại diện size lớn (mục 1.5)

    -- Giá (mục 1.3, 1.5)
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    sale_price DECIMAL(10, 2), -- Giá khuyến mãi

    -- Quan hệ
    instructor_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT, -- Không cho xoá giảng viên nếu còn khoá học
    category_id INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT, -- Không cho xoá lĩnh vực nếu còn khoá học (mục 4.1)

    -- Trạng thái (mục 3.1, 1.4)
    is_bestseller BOOLEAN DEFAULT FALSE, -- Đánh dấu bestseller (mục 1.4)
    is_complete BOOLEAN DEFAULT FALSE, -- Trạng thái "đã hoàn thành" (mục 3.1)

    -- Thống kê (mục 1.2, 1.3, 1.5)
    view_count INTEGER DEFAULT 0, -- Lượt xem (mục 1.2)
    enrollment_count INTEGER DEFAULT 0, -- "số lượng học viên đăng ký"
    rating_avg DECIMAL(2, 1) DEFAULT 0, -- "Điểm đánh giá"
    rating_count INTEGER DEFAULT 0, -- "số lượng học viên đánh giá"

    -- Thời gian
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Dùng cho "khoá học mới nhất" (mục 1.2)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- "Lần cập nhật cuối" (mục 1.5)

    -- Ràng buộc
    CHECK (sale_price IS NULL OR sale_price < price) -- Giá khuyến mãi phải nhỏ hơn giá gốc
);

-- ----
-- 6. Tạo bảng CHAPTERS (Chương học)
-- ----
-- "Đề cương khoá học" (mục 1.5)
CREATE TABLE chapters (
    chapter_id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE, -- Xoá khoá học thì xoá chương
    title VARCHAR(500) NOT NULL,
    order_index INTEGER NOT NULL, -- Để sắp xếp thứ tự chương
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(course_id, order_index) -- Thứ tự chương là duy nhất trong 1 khoá
);

-- ----
-- 7. Tạo bảng LESSONS (Bài giảng)
-- ----
-- "clip bài giảng" (mục 2.5)
CREATE TABLE lessons (
    lesson_id SERIAL PRIMARY KEY,
    chapter_id INTEGER NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE, -- Xoá chương thì xoá bài
    title VARCHAR(500) NOT NULL,
    video_url VARCHAR(1000), -- Đường dẫn tới video
    duration_seconds INTEGER, -- Thời lượng (nếu có)
    is_previewable BOOLEAN DEFAULT FALSE, -- Cho phép xem trước (mục 1.5)
    order_index INTEGER NOT NULL, -- Để sắp xếp thứ tự bài
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(chapter_id, order_index) -- Thứ tự bài là duy nhất trong 1 chương
);

-- ----
-- 8. Tạo bảng REVIEWS (Đánh giá & Feedback)
-- ----
-- "Danh sách feedback của học viên" (mục 1.5, 2.4)
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, -- Xoá user thì xoá review
    course_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE, -- Xoá khoá học thì xoá review
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- Đánh giá 1-5 sao
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Mỗi học viên chỉ review 1 khoá học 1 lần
    UNIQUE(user_id, course_id)
);

-- ----
-- 9. Bảng trung gian: USER_ENROLLMENTS (Đăng ký học)
-- ----
-- Lưu các khoá học mà học viên đã đăng ký (mua) (mục 2.2, 2.3)
CREATE TABLE user_enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Không cho đăng ký 1 khoá nhiều lần
    UNIQUE(user_id, course_id)
);

-- ----
-- 10. Bảng trung gian: USER_WISHLIST (Danh sách yêu thích)
-- ----
-- "Lưu khoá học vào danh sách yêu thích" (mục 2.1, 2.2)
CREATE TABLE user_wishlist (
    wishlist_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Không cho thêm 1 khoá vào wishlist nhiều lần
    UNIQUE(user_id, course_id)
);

-- ----
-- 11. Bảng trung gian: USER_LESSON_PROGRESS (Tiến độ học)
-- ----
-- "lưu trữ trạng thái các bài giảng (video clip) mà học viên đã xem" (mục 2.3)
CREATE TABLE user_lesson_progress (
    progress_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(lesson_id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT TRUE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Mỗi user chỉ có 1 record tiến độ cho 1 bài học
    UNIQUE(user_id, lesson_id)
);