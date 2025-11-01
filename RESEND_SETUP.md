# Resend Email Setup Guide

## 🎯 Tại sao chuyển sang Resend?

✅ **Modern API** - Đơn giản hơn SMTP  
✅ **Không bị block** - Hoạt động tốt trên Render, Vercel, etc.  
✅ **Free tier**: 100 emails/day, 3,000/month  
✅ **Fast & Reliable** - Delivery rate cao  
✅ **Developer-friendly** - Setup trong 5 phút  

## 📋 Setup Instructions

### Bước 1: Đăng ký Resend

1. Truy cập: https://resend.com/
2. Sign up với GitHub hoặc email
3. Xác nhận email

### Bước 2: Lấy API Key

1. Vào Dashboard: https://resend.com/api-keys
2. Click **"Create API Key"**
3. Đặt tên: `VietEdu Production`
4. Chọn permission: **"Sending access"** (Full Access nếu cần)
5. Click **Create**
6. **Copy API key** (chỉ hiện 1 lần!) - Format: `re_xxxxxxxxxxxxx`

### Bước 3: Verify Domain (Tùy chọn nhưng khuyến nghị)

**Nếu không verify domain:**
- Chỉ có thể gửi từ `onboarding@resend.dev`
- Vẫn hoạt động tốt cho testing

**Nếu verify domain (recommended cho production):**
1. Vào: https://resend.com/domains
2. Click **Add Domain**
3. Nhập domain của bạn (ví dụ: `vietedu.onrender.com` hoặc custom domain)
4. Add DNS records theo hướng dẫn
5. Sau khi verify, có thể gửi từ `noreply@yourdomain.com`

### Bước 4: Update Environment Variables

#### Local Development (.env)
```env
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Email From (nếu đã verify domain)
EMAIL_FROM=noreply@yourdomain.com

# Hoặc dùng default Resend (không cần verify)
# EMAIL_FROM=onboarding@resend.dev

# Other settings
APP_NAME=VietEdu
BASE_URL=http://localhost:3000
```

#### Render Production
1. Vào Render Dashboard
2. Chọn your service
3. Vào **Environment** tab
4. Add/Update variables:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=onboarding@resend.dev
APP_NAME=VietEdu
BASE_URL=https://vietedu.onrender.com
NODE_ENV=production
```

**Lưu ý:** Xóa `EMAIL_USER` và `EMAIL_PASS` cũ (không cần nữa)

### Bước 5: Deploy

```bash
git add .
git commit -m "feat: Switch from nodemailer to Resend for better email delivery"
git push origin admin-advance
```

## 🧪 Testing

### Test Local
```bash
# Make sure .env has RESEND_API_KEY
npm run dev

# Try signup or password reset
```

### Test Production
1. Deploy lên Render
2. Kiểm tra logs: `Resend API key configured - email service ready`
3. Test signup → Nhận OTP
4. Test password reset → Nhận reset token
5. Admin tạo instructor → Instructor nhận email

## 📊 Monitor Email

### Resend Dashboard
1. Vào: https://resend.com/emails
2. Xem real-time:
   - Emails sent
   - Delivery status
   - Opens/clicks (nếu enable tracking)
   - Bounces/complaints

### Render Logs
Check logs for:
```json
// Success
{"level":30,"msg":"Email sent successfully","to":"user@example.com","messageId":"xxx"}

// Warning
{"level":40,"msg":"Cannot send verification email - RESEND_API_KEY not configured"}

// Error
{"level":50,"msg":"Error sending reset email"}
```

## 🔧 Troubleshooting

### Error: "Invalid API key"
- Kiểm tra RESEND_API_KEY trong environment variables
- Đảm bảo copy đúng key (bắt đầu với `re_`)
- Key có thể bị revoke → tạo key mới

### Error: "Domain not verified"
- Nếu dùng custom domain, cần verify DNS records
- Hoặc dùng `onboarding@resend.dev` (không cần verify)

### Email không gửi được
1. Check Render environment variables
2. Check Resend dashboard quota (100/day)
3. Check Resend logs: https://resend.com/emails

### Rate Limiting
- Free tier: 100 emails/day
- Nếu vượt quota → nâng cấp plan hoặc chờ 24h

## 💰 Pricing

| Plan | Price | Emails/month | Features |
|------|-------|--------------|----------|
| **Free** | $0 | 3,000 | Perfect for getting started |
| **Pro** | $20/mo | 50,000 | Custom domains, analytics |
| **Business** | $100/mo | 500,000 | Priority support, SLA |

**Free tier là đủ cho hầu hết ứng dụng nhỏ và vừa!**

## 🔐 Security Best Practices

1. **Không commit API key** vào git
2. **Rotate API key** định kỳ (3-6 tháng)
3. **Sử dụng restricted key** (chỉ sending access)
4. **Monitor usage** trên Resend dashboard
5. **Enable DKIM/SPF** khi verify domain

## 📚 Documentation

- Official Docs: https://resend.com/docs
- API Reference: https://resend.com/docs/api-reference
- Node.js SDK: https://resend.com/docs/send-with-nodejs
- Status Page: https://status.resend.com/

## ✅ Advantages vs Gmail SMTP

| Feature | Gmail SMTP | Resend |
|---------|-----------|--------|
| Setup | Phức tạp (App Password) | Đơn giản (API key) |
| Render Support | ❌ Timeout | ✅ Works perfectly |
| Rate Limit | 500/day (unofficial) | 3,000/month (official) |
| Delivery Rate | Good | Excellent |
| Analytics | ❌ None | ✅ Full dashboard |
| Support | ❌ None | ✅ Email support |
| Cost | Free | Free (100/day) |

## 🚀 Migration Checklist

- [x] Cài đặt package: `npm install resend`
- [x] Update `utils/mailer.js`
- [x] Đăng ký Resend account
- [x] Lấy API key
- [ ] Update local `.env`
- [ ] Update Render environment variables
- [ ] Deploy
- [ ] Test signup
- [ ] Test password reset
- [ ] Test instructor email
- [ ] Monitor Resend dashboard

---

**Ready to deploy? Let's go! 🎉**
