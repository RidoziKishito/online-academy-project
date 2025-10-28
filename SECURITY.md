# 🔒 HƯỚNG DẪN BẢO MẬT - QUAN TRỌNG

## ⚠️ CẦN LÀM NGAY SAU KHI CLONE PROJECT

### 1. Tạo file .env từ .env.example

```bash
cp .env.example .env
```

### 2. Cập nhật các giá trị trong .env

#### Generate SESSION_SECRET mới:
```bash
# Trên Linux/Mac:
openssl rand -base64 32

# Trên Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Hoặc trên Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Sau đó thay giá trị `SESSION_SECRET` trong .env

#### Các thông tin cần cấu hình:

**Database:**
- `HOST`: Database host của bạn
- `PORT`: Database port (mặc định PostgreSQL: 5432)
- `USER`: Database username
- `PASSWORD`: Database password (PHẢI ĐỔI, không dùng password mẫu)

**Email (Gmail):**
- `EMAIL_USER`: Địa chỉ Gmail của bạn
- `EMAIL_PASS`: App Password của Gmail (không phải password thường)
  - Tạo App Password: https://myaccount.google.com/apppasswords

**Google OAuth:**
- Tạo credentials tại: https://console.cloud.google.com/
- `GOOGLE_CLIENT_ID`: Client ID
- `GOOGLE_CLIENT_SECRET`: Client Secret
- `GOOGLE_CALLBACK_URL`: Callback URL (thêm vào Authorized redirect URIs)

**Google reCAPTCHA:**
- Tạo keys tại: https://www.google.com/recaptcha/admin
- Chọn reCAPTCHA v2 ("I'm not a robot" Checkbox)
- `RECAPTCHA_SITE_KEY`: Site key
- `RECAPTCHA_SECRET_KEY`: Secret key

### 3. ⚠️ KHÔNG BAO GIỜ COMMIT FILE .env

File `.env` đã được thêm vào `.gitignore`. Hãy chắc chắn:

```bash
# Kiểm tra file .env không bị track:
git status

# Nếu .env xuất hiện, xóa khỏi git:
git rm --cached .env
git commit -m "Remove .env from git"
```

### 4. ⚠️ NẾU ĐÃ COMMIT .env TRƯỚC ĐÓ

File .env có thể đã bị lưu trong git history. Cần xóa hoàn toàn:

```bash
# Xóa .env khỏi toàn bộ git history (NGUY HIỂM - backup trước)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (cẩn thận với team)
git push origin --force --all
```

**SAU ĐÓ PHẢI ĐỔI TẤT CẢ:**
- Database passwords
- Email passwords
- Google OAuth secrets
- reCAPTCHA keys
- Session secret

### 5. Production Checklist

Trước khi deploy production:

- [ ] Đã đổi tất cả passwords và secrets
- [ ] `SESSION_SECRET` là random string mạnh (min 32 chars)
- [ ] `NODE_ENV=production` trong production server
- [ ] Database password mạnh
- [ ] Email sử dụng App Password (không phải password thường)
- [ ] HTTPS enabled (để `cookie.secure = true` hoạt động)
- [ ] Backup database thường xuyên
- [ ] Rate limiting đã bật
- [ ] Error logging được setup
- [ ] Monitor server resources

### 6. Đổi Session Secret

```javascript
// Tạo session secret mạnh bằng Node.js:
require('crypto').randomBytes(64).toString('hex')
```

Copy output và dán vào `SESSION_SECRET` trong file .env

---

## 📝 Các thay đổi đã thực hiện

### ✅ 1. Thêm .env vào .gitignore
- File .env đã được gitignore (dòng 81 trong .gitignore)
- Tạo .env.example làm template

### ✅ 2. Session Secret chuyển sang Environment Variable
- **Trước:** Hardcoded trong app.js
- **Sau:** Đọc từ `process.env.SESSION_SECRET`
- Cookie config cải thiện:
  - `httpOnly: true` - Chống XSS
  - `secure: true` trong production - Chỉ qua HTTPS
  - `maxAge` - Auto expire sau 24h

### ✅ 3. Database Connection Pool cải thiện
- **Trước:** `min: 0, max: 15`
- **Sau:** `min: 2, max: 10`
- Lý do:
  - `min: 2`: Luôn có 2 connections sẵn sàng → giảm latency
  - `max: 10`: Đủ cho app nhỏ-trung, tránh exhaust DB

---

## 🔐 Best Practices

1. **Không bao giờ commit secrets vào git**
2. **Rotate secrets định kỳ** (3-6 tháng)
3. **Sử dụng different secrets cho dev/staging/production**
4. **Backup .env file ở nơi an toàn** (password manager, vault)
5. **Review access logs thường xuyên**
6. **Enable 2FA cho tất cả accounts quan trọng**

---

## 📞 Support

Nếu phát hiện lỗ hổng bảo mật, liên hệ ngay team admin.
