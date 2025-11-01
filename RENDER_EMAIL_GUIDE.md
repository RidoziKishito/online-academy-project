# Hướng dẫn Fix Lỗi Email Timeout trên Render

## ⚠️ Vấn đề
Email hoạt động tốt trên local nhưng bị timeout trên Render:
```
Error: Connection timeout
code: ETIMEDOUT
```

## ✅ Đã Fix

### 1. Cài đặt nodemailer (đã có trong package.json)
```bash
npm install
```

### 2. Cấu hình đã được cải thiện
- ✅ Tăng timeout từ 5s → 30s (Render cần thời gian kết nối lâu hơn)
- ✅ Retry logic: 3 lần với exponential backoff (2s, 4s, 8s)
- ✅ Better TLS config (minVersion: TLSv1.2)
- ✅ Giảm rate limit từ 10/s → 5/s
- ✅ Detailed logging để debug

### 3. Kiểm tra Environment Variables trên Render

Đảm bảo các biến sau đã được set trong Render Dashboard:

```
EMAIL_USER=tracphuc2005@gmail.com
EMAIL_PASS=ckal mkjv hzef qjfq
APP_NAME=VietEdu
BASE_URL=https://vietedu.onrender.com
NODE_ENV=production
```

## 🚀 Deploy

### Bước 1: Commit và Push
```bash
git add .
git commit -m "Fix: Email timeout - increased timeout, retry logic, better TLS config"
git push origin admin-advance
```

### Bước 2: Deploy trên Render
1. Vào Render Dashboard
2. Chọn service của bạn
3. Render sẽ tự động deploy
4. Chờ build hoàn tất

### Bước 3: Kiểm tra Logs
Vào Render → Logs và tìm:
- ✅ `Email sent successfully` = Thành công
- ⚠️ `Email send attempt X failed` = Đang retry
- ❌ `All email send attempts failed` = Thất bại hoàn toàn

## 🧪 Test Email trên Render

### Test 1: Signup mới
1. Vào https://vietedu.onrender.com/account/signup
2. Đăng ký với email mới
3. Kiểm tra email có nhận được OTP không

### Test 2: Password Reset
1. Vào https://vietedu.onrender.com/account/forgot-password
2. Nhập email
3. Kiểm tra email có nhận được reset token không

### Test 3: Admin tạo Instructor
1. Login vào admin
2. Tạo instructor mới
3. Kiểm tra email instructor có nhận được thông tin account không

## 🔧 Nếu Vẫn Timeout trên Render

### Nguyên nhân
Render có thể block hoặc throttle outbound SMTP connections đến Gmail. Đây là chính sách bảo mật của họ.

### Giải pháp 1: Chờ và Retry (Khuyến nghị thử trước)
- Code đã có retry logic
- Đôi khi chỉ cần chờ một lúc
- Render có thể đang rate limit

### Giải pháp 2: Chuyển sang SendGrid (Tốt nhất cho Production) 🌟

#### Ưu điểm:
- ✅ Free 100 emails/day
- ✅ Không bị block bởi hosting providers
- ✅ Có email analytics
- ✅ Reliable và professional

#### Setup:
1. Đăng ký: https://sendgrid.com/
2. Lấy API Key: Settings → API Keys → Create API Key
3. Update Render Environment Variables:
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   EMAIL_FROM=noreply@vietedu.onrender.com
   ```
4. Cài đặt package:
   ```bash
   npm install @sendgrid/mail
   ```
5. Update code (xem EMAIL_CONFIG.md)

### Giải pháp 3: Mailgun
- Free 5,000 emails/month
- Setup tương tự SendGrid
- Xem EMAIL_CONFIG.md

## 📊 So sánh

| Service | Local | Render | Free Tier | Recommendation |
|---------|-------|--------|-----------|----------------|
| Gmail SMTP | ✅ Works | ❌ Timeout | Unlimited* | Dùng cho dev |
| SendGrid | ✅ Works | ✅ Works | 100/day | ⭐ Dùng cho production |
| Mailgun | ✅ Works | ✅ Works | 5000/month | ⭐ Dùng cho production |

## 🎯 Action Plan

### Ngay bây giờ:
1. ✅ Deploy code đã fix
2. ✅ Test trên Render
3. ✅ Kiểm tra logs

### Nếu vẫn timeout sau 1-2 giờ:
1. ⚠️ Chuyển sang SendGrid
2. ⚠️ Hoặc liên hệ Render support

### Liên hệ Render Support:
```
Subject: Outbound SMTP Connections to Gmail Timing Out

Hi Render Team,

I'm experiencing connection timeouts when trying to send emails via 
Gmail SMTP (smtp.gmail.com:587) from my application.

Error: Connection timeout (ETIMEDOUT)

Could you please check if outbound SMTP connections are being blocked 
or throttled on my service?

Service: [Your service name]
Region: [Your region]

Thank you!
```

## 📝 Logs mẫu

### Thành công:
```json
{
  "level": 30,
  "msg": "Email sent successfully",
  "to": "user@example.com",
  "messageId": "<xxx@gmail.com>"
}
```

### Đang retry:
```json
{
  "level": 40,
  "msg": "Email send attempt 1 failed",
  "attempt": 1,
  "maxRetries": 3,
  "errorCode": "ETIMEDOUT"
}
```

### Thất bại hoàn toàn:
```json
{
  "level": 50,
  "msg": "All email send attempts failed",
  "to": "user@example.com"
}
```

---
**Lưu ý:** Code hiện tại đã được tối ưu để hoạt động tốt nhất với Gmail trên Render. Nếu vẫn timeout, nguyên nhân là từ phía Render infrastructure, không phải code.
