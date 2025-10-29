# Hướng dẫn cấu hình Google reCAPTCHA

## Bước 1: Lấy reCAPTCHA Keys

1. Truy cập: https://www.google.com/recaptcha/admin/create
2. Đăng nhập bằng tài khoản Google của bạn
3. Điền thông tin:
   - **Label**: Tên dự án của bạn (ví dụ: "VietEdu Online Academy")
   - **reCAPTCHA type**: Chọn "reCAPTCHA v2" → "I'm not a robot" Checkbox
   - **Domains**: Thêm `localhost` (cho môi trường phát triển)
   - Chấp nhận điều khoản dịch vụ
4. Click "Submit"
5. Bạn sẽ nhận được:
   - **Site Key** (Khóa trang web)
   - **Secret Key** (Khóa bí mật)

## Bước 2: Cấu hình trong dự án

1. Mở file `.env`
2. Thay thế các giá trị:

   ```
   RECAPTCHA_SITE_KEY=your_site_key_here
   RECAPTCHA_SECRET_KEY=your_secret_key_here
   ```

   Ví dụ:

   ```
   RECAPTCHA_SITE_KEY=6LcXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   RECAPTCHA_SECRET_KEY=6LcYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
   ```

## Bước 3: Khởi động lại server

Sau khi cập nhật file `.env`, khởi động lại server Node.js:

```bash
npm start
```

hoặc nếu đang dùng nodemon:

```bash
npm run dev
```

## Kiểm tra

1. Truy cập trang đăng ký: http://localhost:3000/account/signup
2. Bạn sẽ thấy checkbox "I'm not a robot" xuất hiện trước nút Sign Up
3. Phải tích vào checkbox này trước khi có thể đăng ký tài khoản

## Lưu ý

- **Site Key** được sử dụng ở phía client (hiển thị CAPTCHA trên trang web)
- **Secret Key** được sử dụng ở phía server (xác thực CAPTCHA)
- Không chia sẻ **Secret Key** với ai
- Khi deploy lên production, nhớ thêm domain thật vào danh sách domains trong Google reCAPTCHA admin

## Troubleshooting

Nếu CAPTCHA không hiển thị:

1. Kiểm tra xem đã cấu hình đúng keys trong `.env` chưa
2. Kiểm tra console browser có lỗi không
3. Đảm bảo domain `localhost` đã được thêm vào reCAPTCHA admin
4. Clear cache và reload trang
