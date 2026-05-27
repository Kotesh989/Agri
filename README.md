# Agri Fertilizer Shop ERP

A Fertilizer Shop ERP for Indian agri retailers and farmers. The active app uses React + Vite on the frontend and Node.js + Express + MongoDB/Mongoose on the backend, with GST-aware invoicing, stock tracking, payments, reports, and a farmer portal.

## 🌟 Features

- Admin and farmer authentication with JWT
- Multi-store inventory for fertilizers and pesticides
- Customer/farmer profiles with credit tracking
- Sales invoices with GST, paid amount, and balance due
- Supplier purchases and stock movement tracking
- Farmer portal for store-wise purchases and invoices
- PDF invoice generation and Supabase Storage uploads
- English and Kannada UI translations
- Responsive React/Vite frontend

## 🏗️ Active Architecture

**Frontend**
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios
- Chart.js
- i18next

**Backend**
- Node.js 18+
- Express
- MongoDB
- Mongoose
- JWT authentication
- bcryptjs password hashing
- PDFKit invoice generation

**Deployment**
- Backend: Render
- Frontend: Vercel or Render static site
- Database: MongoDB Atlas or another MongoDB connection
- File storage: Supabase Storage

## 📋 Prerequisites

- Node.js 18+
- npm
- MongoDB connection string
- Git

## 🚀 Local Development

### Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Set at least these backend variables:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/agri_fertilizer
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
FRONTEND_URLS=http://localhost:5173,http://127.0.0.1:5173
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The backend starts at `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Set:

```env
VITE_API_URL=http://localhost:5000/api
```

The frontend starts at `http://localhost:5173`.

## 🔐 Production Environment

Backend:

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
```

Frontend:

```env
VITE_API_URL=https://your-backend.onrender.com/api
```

## 🚢 Deployment

The active Render blueprint is the root [`render.yaml`](render.yaml). It deploys:

- `agri-fertilizer-api`: Node/Express backend from `backend/`
- `agri-fertilizer-web`: static frontend from `frontend/dist`

The old backend-only Prisma/PostgreSQL Render config has been moved to `deprecated/backend-render-prisma.yaml`.

## 🗄️ Database Note

The active backend uses MongoDB/Mongoose models in `backend/src/models/index.js`.

The old Prisma/PostgreSQL schema and seed files are deprecated and kept only for reference in `deprecated/prisma/`. They are not used by the running backend.

## 🧪 Useful Commands

Backend:

```bash
cd backend
npm test
npm run dev
npm start
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm run lint
```

## 🌐 Kannada/Unicode

The app uses UTF-8 source files and Vite serves `index.html` with:

```html
<meta charset="UTF-8" />
```

Translations live in:

- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/kn.json`

If Kannada or emojis appear as mojibake, the file was saved with the wrong encoding and should be restored as UTF-8.
