# Deploy VietEdu lên Render

## Các bước deploy:

### 1. Push code lên GitHub

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Tạo tài khoản Render
- Truy cập: https://render.com/
- Đăng ký/Đăng nhập bằng tài khoản GitHub

### 3. Tạo Web Service mới
1. Click **"New +"** → Chọn **"Web Service"**
2. Kết nối với GitHub repository của bạn (TVNPeter/VietEdu)
3. Cấu hình như sau:

   - **Name**: `vietedu` (hoặc tên bạn muốn)
   - **Region**: Singapore (gần Việt Nam nhất)
   - **Branch**: `main`
   - **Root Directory**: để trống
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

### 4. Cấu hình Environment Variables
Trong phần **Environment**, thêm các biến sau (lấy từ file .env):

#### Database:
- `DB_HOST`: `aws-1-ap-southeast-1.pooler.supabase.com`
- `DB_PORT`: `5432`
- `DB_USER`: `postgres.zbmwdwbgdwzaxnfazjdx`
- `DB_PASSWORD`: `FinalProjectSPK@@`
- `DB_NAME`: `postgres`

#### Email:
- `EMAIL_USER`: `tracphuc2005@gmail.com`
- `EMAIL_PASS`: `ckal mkjv hzef qjfq`

#### App Config:
- `NODE_ENV`: `production`
- `BASE_URL`: `https://vietedu.onrender.com` (thay bằng URL Render cấp cho bạn)
- `APP_NAME`: `VietEdu`
- `SESSION_SECRET`: `jgiejghewhuoweofijw2t498hjwoifjw4twnfowejhf`

#### Google OAuth:
- `GOOGLE_CLIENT_ID`: `809778923105-bimvt6nrrj6ln6hl234muk1d24f5rkjh.apps.googleusercontent.com`
- `GOOGLE_CLIENT_SECRET`: `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`
- `GOOGLE_CALLBACK_URL`: `https://vietedu.onrender.com/auth/google/callback`

#### reCAPTCHA:
- `RECAPTCHA_SITE_KEY`: `6Lf90_grAAAAAH1WiTo_IcRChfpxwuqOooRiBHHm`
- `RECAPTCHA_SECRET_KEY`: `6Lf90_grAAAAAN6nJYCGGVFrIO5KUa4Wv19JFRjP`

#### CORS (Optional):
- `CORS_ALLOWED_ORIGINS`: `https://vietedu.onrender.com`

### 5. Deploy
- Click **"Create Web Service"**
- Render sẽ tự động build và deploy
- Chờ 3-5 phút để hoàn tất

### 6. Cập nhật Google OAuth Redirect URIs
Sau khi có URL từ Render, cập nhật trong Google Cloud Console:
1. Truy cập: https://console.cloud.google.com/
2. Chọn project của bạn
3. Vào **APIs & Services** → **Credentials**
4. Chỉnh sửa OAuth 2.0 Client ID
5. Thêm vào **Authorized redirect URIs**:
   - `https://vietedu.onrender.com/auth/google/callback`

### 7. Kiểm tra Database Migration
Nếu cần chạy migration:
- Vào tab **Shell** trong Render Dashboard
- Chạy các file SQL trong thư mục `migrations/`

## Lưu ý quan trọng:

### ⚠️ Free Plan Limitations:
- Service sẽ sleep sau 15 phút không hoạt động
- Khởi động lại mất 30-60 giây khi có request đầu tiên
- 750 giờ free/tháng

### 🔒 Bảo mật:
- **KHÔNG** commit file `.env` lên GitHub
- Thay đổi `SESSION_SECRET` thành giá trị mới và mạnh hơn
- Cân nhắc tạo Google OAuth credentials riêng cho production
- Tạo reCAPTCHA keys riêng cho production

### 📊 Monitoring:
- Xem logs tại tab **Logs** trong Render Dashboard
- Theo dõi resource usage tại tab **Metrics**

## Troubleshooting:

### Nếu deploy fail:
1. Kiểm tra logs trong Render Dashboard
2. Đảm bảo `package.json` có đúng `"start": "node app.js"`
3. Kiểm tra port: app phải lắng nghe trên `process.env.PORT`

### Nếu không kết nối được database:
1. Kiểm tra Supabase database có bật pooler mode
2. Kiểm tra credentials trong Environment Variables
3. Kiểm tra IP whitelist trong Supabase (nếu có)

### Nếu Google OAuth không hoạt động:
1. Kiểm tra `GOOGLE_CALLBACK_URL` đúng với URL Render
2. Kiểm tra redirect URIs trong Google Cloud Console
3. Đảm bảo `BASE_URL` đúng

## Tự động deploy:
- Mỗi khi push code lên branch `main`, Render sẽ tự động deploy lại
- Có thể tắt auto-deploy trong Settings nếu muốn deploy thủ công

## Nâng cấp:
- Nếu cần tốc độ tốt hơn và không bị sleep: nâng lên plan trả phí ($7/tháng)
- Có thể thêm custom domain trong Settings → Custom Domain
