# Deployment Guide

This project now deploys as a MongoDB/Mongoose application.

## Active Strategy

Use the root `render.yaml` as the single Render blueprint.

It defines:

- `agri-fertilizer-api`: backend service from `backend/`
- `agri-fertilizer-web`: static frontend from `frontend/dist`

The deprecated backend-only Prisma/PostgreSQL blueprint is stored at `deprecated/backend-render-prisma.yaml` for reference only.

## Backend Environment Variables

Set these on Render:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=
JWT_SECRET=
CLIENT_URL=https://your-frontend-domain.com
FRONTEND_URLS=https://your-frontend-domain.com
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RUN_SEED_ON_START=false
RATE_LIMIT_MAX=300
```

Optional delivery variables:

```env
EMAIL_PROVIDER=
RESEND_API_KEY=
RESEND_FROM=
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMS_PROVIDER=
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=
FAST2SMS_API_KEY=
SMS_WEBHOOK_URL=
SMS_WEBHOOK_TOKEN=
```

## Frontend Environment Variables

Set this before building the frontend:

```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_APP_NAME=Agri Fertilizer Shop
```

## Build Commands

Backend:

```bash
cd backend
npm ci --omit=dev
npm start
```

Frontend:

```bash
cd frontend
npm ci --include=dev
npm run build
```

## Database

Use MongoDB Atlas or another MongoDB-compatible service. The app reads `MONGODB_URI`; it does not run Prisma migrations.

## File Storage

Invoice PDFs use Supabase Storage. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for upload support.
