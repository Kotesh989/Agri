# Production Deployment

## Targets

- Frontend: Vercel
- Backend: Render
- Database: Supabase PostgreSQL for Prisma deployments, or MongoDB Atlas for the current Mongoose runtime
- Storage: Supabase Storage

## Hardening Checklist

1. Set `NODE_ENV=production`.
2. Use HTTPS-only frontend and backend URLs.
3. Configure `FRONTEND_URLS` with the exact Vercel origins.
4. Set a strong `JWT_SECRET`.
5. Configure `MSG91` or another SMS provider plus `RESEND` or SMTP.
6. Create private Supabase buckets for `invoices`, `profile-photos`, `product-images`, `store-logos`, and `backups`.
7. Apply bucket policies so server-side service-role uploads are the only write path.
8. Keep signed URL TTLs short and monitor upload usage.
9. Enable Render logs, Supabase logs, and uptime monitoring.
10. Schedule database backups and test restore procedures.

## Render Backend

```text
Build command: npm install
Start command: npm start
Root directory: backend
```

## Vercel Frontend

```text
Build command: npm run build
Output directory: dist
Root directory: frontend
```

## Storage Flow

The backend issues signed upload URLs through `POST /api/uploads/signed-url`. Clients upload directly to Supabase Storage, and downloads use short-lived signed URLs. Supabase recommends signed upload URLs and storage access controls for private files. See official Supabase storage guidance. 

## Monitoring

- Alert on HTTP 5xx rate, OTP send failures, and upload failures.
- Monitor login failure bursts and rate-limit triggers.
- Review low-stock and expiry notification jobs daily.
