# Production Deployment

The production backend is Node.js + Express + MongoDB/Mongoose.

## Required Backend Variables

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=
JWT_SECRET=
CLIENT_URL=
FRONTEND_URLS=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RUN_SEED_ON_START=false
```

`CLIENT_URL` and `FRONTEND_URLS` should include the deployed frontend origin, for example:

```env
CLIENT_URL=https://your-app.vercel.app
FRONTEND_URLS=https://your-app.vercel.app
```

## Required Frontend Variables

```env
VITE_API_URL=https://your-backend.onrender.com/api
```

## Render

Use the root `render.yaml`. Do not use `deprecated/backend-render-prisma.yaml` unless intentionally restoring the old Prisma/PostgreSQL path.

## Production Safety

- Keep `RUN_SEED_ON_START=false`.
- Use a long random `JWT_SECRET`.
- Do not commit `.env` files.
- Restrict CORS to deployed frontend origins.
