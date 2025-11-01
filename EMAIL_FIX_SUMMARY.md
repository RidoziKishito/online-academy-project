# Email Connection Timeout Fix

## Problem
The application was experiencing SMTP connection timeouts when trying to send emails through Gmail SMTP on Render hosting:

```
Error: Connection timeout
code: ETIMEDOUT
command: CONN
```

This caused:
- 500 Internal Server Errors
- Failed email sending for password resets, verification emails, and instructor account creation
- Application blocking/hanging on email operations

## Root Cause
Render (and many hosting providers) restrict or block outbound SMTP connections on ports 587/465 due to spam prevention policies. Gmail SMTP connections were timing out after 10 seconds.

## Solutions Implemented

### 1. **Reduced Connection Timeouts** ⚡
Changed from 10 seconds to 5 seconds for faster failure detection:
```javascript
connectionTimeout: 5000,
greetingTimeout: 5000,
socketTimeout: 5000
```

### 2. **Added Retry Logic with Exponential Backoff** 🔄
Implemented `sendMailWithRetry()` function that:
- Retries up to 2 times on transient failures
- Uses exponential backoff (1s, 2s delays)
- Skips retries on authentication errors
- Logs each attempt for debugging

### 3. **Graceful Degradation** ✅
Changed all email functions to:
- Return `false` instead of throwing errors
- Allow app to continue when email fails
- Log warnings instead of errors
- Check if email is configured before attempting to send

### 4. **Early Configuration Check** 🔍
Added startup check:
```javascript
const isEmailConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;
if (!isEmailConfigured) {
  logger.warn('Email credentials not configured - email features will be disabled');
}
```

### 5. **Updated All Route Handlers** 🛣️
Modified routes to handle email failures gracefully:
- **Signup**: User proceeds to verification page even if email fails
- **Password Reset**: Returns clear error message if email fails
- **Admin Account Creation**: Continues with warning if instructor email fails
- **Resend Verification**: Shows clear error message

## Files Modified
- ✅ `utils/mailer.js` - Core email functionality with retry logic
- ✅ `routes/account.route.js` - Signup, login, password reset handlers
- ✅ `routes/admin-accounts.route.js` - Admin account creation handlers

## Testing
Test the fix by:
1. Deploy to Render
2. Try signup/password reset
3. Check logs for warnings instead of errors
4. App should continue working even if email fails

## Recommended Long-Term Solution
For production, switch from Gmail SMTP to a dedicated email service:

### Option 1: SendGrid (Recommended) 🌟
- **Free tier**: 100 emails/day
- **Pros**: Reliable, analytics, no blocking issues
- **Setup**: See `EMAIL_CONFIG.md`

### Option 2: Mailgun
- **Free tier**: 5,000 emails/month
- **Pros**: Generous limits, easy setup
- **Setup**: See `EMAIL_CONFIG.md`

### Option 3: AWS SES
- **Free tier**: 62,000 emails/month (if on EC2)
- **Pros**: Very cheap, highly scalable
- **Cons**: Requires domain verification

## Environment Variables Needed
```env
# Current (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# Or for SendGrid (recommended)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

## Monitoring
Check Render logs for:
- `Email credentials not configured` - Email config missing
- `Cannot send X email - email not configured` - Attempted send without config
- `Email send attempt X failed` - Retry attempts
- `Error sending X email` - Final failure after all retries

## Status
✅ **FIXED** - Application no longer crashes on email failures
⚠️ **PARTIAL** - Email may still fail to send on Render with Gmail SMTP
🎯 **TODO** - Switch to SendGrid/Mailgun for production reliability

---
*Last updated: November 1, 2025*
