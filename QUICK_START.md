# Quick Start

This guide reflects the active MongoDB/Mongoose backend.

## Prerequisites

- Node.js 18+
- npm
- MongoDB running locally or a MongoDB Atlas URI

## 1. Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Minimum `backend/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/agri_fertilizer
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
FRONTEND_URLS=http://localhost:5173,http://127.0.0.1:5173
PORT=5000
NODE_ENV=development
RUN_SEED_ON_START=false
```

Backend URL: `http://localhost:5000`

Health check:

```bash
curl http://localhost:5000/health
```

## 2. Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Minimum `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Frontend URL: `http://localhost:5173`

## 3. Production API URL

For deployed frontend builds:

```env
VITE_API_URL=https://your-backend.onrender.com/api
```

## Deprecated Prisma Files

Old Prisma/PostgreSQL files were moved to `deprecated/prisma/`. They are not used by the active backend.
