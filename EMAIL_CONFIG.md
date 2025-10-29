# Cấu hình Email cho Render

## ⚠️ Vấn đề
Render có thể block Gmail SMTP do:
- Firewall/security restrictions
- Port blocking
- Timeout issues

## ✅ Giải pháp

### Option 1: Sử dụng SendGrid (Khuyên dùng cho Production) 🌟

SendGrid có free tier (100 emails/day) và hoạt động tốt trên Render.

#### Bước 1: Đăng ký SendGrid
1. Truy cập: https://sendgrid.com/
2. Đăng ký tài khoản free
3. Verify email

#### Bước 2: Tạo API Key
1. Vào **Settings** → **API Keys**
2. Click **Create API Key**
3. Chọn **Full Access** hoặc **Restricted Access** (chỉ Mail Send)
4. Copy API Key (chỉ hiện 1 lần!)

#### Bước 3: Cập nhật Environment Variables trên Render
Thay vì `EMAIL_USER` và `EMAIL_PASS`, thêm:
```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

#### Bước 4: Cài đặt SendGrid
```bash
npm install @sendgrid/mail
```

#### Bước 5: Tạo file mới `utils/mailer-sendgrid.js`
(File này đã được tạo tự động - xem bên dưới)

---

### Option 2: Sử dụng Gmail với App Password (Backup)

Nếu vẫn muốn dùng Gmail:

#### Bước 1: Bật 2-Step Verification
1. Vào Google Account: https://myaccount.google.com/
2. Security → 2-Step Verification → Bật

#### Bước 2: Tạo App Password
1. Vào: https://myaccount.google.com/apppasswords
2. Chọn app: **Mail**
3. Chọn device: **Other** → nhập "VietEdu Render"
4. Click **Generate**
5. Copy mật khẩu 16 ký tự

#### Bước 3: Cập nhật Environment Variables
```
EMAIL_USER=tracphuc2005@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx  (16 ký tự từ bước 2)
```

---

### Option 3: Sử dụng Mailgun (Alternative)

Mailgun cũng có free tier và hoạt động tốt:
- 5,000 emails/month free
- Không cần verify domain cho sandbox

1. Đăng ký: https://www.mailgun.com/
2. Lấy SMTP credentials
3. Config tương tự Gmail

---

## 🔧 Đã sửa trong code

### 1. `utils/mailer.js` - Cải thiện:
- ✅ Đổi port 465 → 587 (STARTTLS)
- ✅ Thêm timeout settings
- ✅ Connection pooling
- ✅ Skip test trong production (không block app startup)

### 2. Thêm retry logic trong send functions

---

## 🚀 Deploy lại

Sau khi thay đổi:

```bash
git add .
git commit -m "Fix email configuration for Render"
git push origin main
```

Render sẽ tự động deploy lại.

---

## 🧪 Test email sau khi deploy

1. Truy cập app trên Render
2. Thử tính năng reset password hoặc signup
3. Check logs trong Render Dashboard

---

## ⚡ Khuyến nghị

**Cho Production:** Dùng **SendGrid** hoặc **Mailgun**
- Ổn định hơn
- Không bị block
- Có email analytics
- Professional

**Cho Development:** Gmail với App Password OK

---

## 📊 So sánh

| Service | Free Tier | Pros | Cons |
|---------|-----------|------|------|
| **SendGrid** | 100/day | Reliable, Analytics | Cần verify |
| **Mailgun** | 5000/month | Generous, Easy | Sandbox limit |
| **Gmail** | Unlimited* | Free, Simple | Bị block trên host |

\*Gmail có limit 500/day nhưng không official

