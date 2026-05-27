# Environment Variables

## Backend

```text
NODE_ENV=production
PORT=5000
MONGODB_URI=
JWT_SECRET=
FRONTEND_URLS=https://your-vercel-domain.vercel.app
CLIENT_URL=https://your-vercel-domain.vercel.app
RATE_LIMIT_MAX=300
AUTH_RATE_LIMIT_MAX=25
OTP_RATE_LIMIT_MAX=5
SIGNED_URL_TTL_SECONDS=3600

EMAIL_PROVIDER=RESEND | SMTP
RESEND_API_KEY=
RESEND_FROM=
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

SMS_PROVIDER=MSG91 | FAST2SMS | WEBHOOK
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=
FAST2SMS_API_KEY=
SMS_WEBHOOK_URL=
SMS_WEBHOOK_TOKEN=

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Frontend

```text
VITE_API_URL=https://your-render-service.onrender.com/api
```

Use HTTPS in production so secure cookies and signed storage workflows behave correctly.
