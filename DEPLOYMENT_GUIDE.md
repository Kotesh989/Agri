# Deployment Guide for Agri Fertilizer Shop Management System

## Complete Deployment Instructions

This guide will walk you through deploying the Agri Fertilizer Shop Management System to production using free services.

## Prerequisites

- GitHub account with repository access
- Vercel account (free tier)
- Render account (free tier)
- Supabase account (free tier)

## Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or sign in
3. Click "New Project"
4. Configure:
   - Organization: Select or create
   - Name: `agri-fertilizer-db`
   - Database Password: Generate strong password
   - Region: Choose nearest to India (Singapore)
   - Pricing Plan: Free

### 1.2 Get Connection String

1. Go to project settings
2. Database → Connection pooling
3. Copy PostgreSQL connection string
4. Save for backend configuration

### 1.3 Create Storage Bucket

1. Go to Storage → Buckets
2. Create new bucket: `invoices`
3. Set to Public
4. This is for storing PDF invoices

### 1.4 Get Supabase Keys

1. Go to Settings → API
2. Copy:
   - Project URL (SUPABASE_URL)
   - anon public key (SUPABASE_ANON_KEY)
   - service_role secret key (SUPABASE_SERVICE_ROLE_KEY)

## Step 2: Deploy Backend to Render

### 2.1 Create Render Web Service

1. Go to [https://render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +"
4. Select "Web Service"
5. Connect GitHub repository

### 2.2 Configure Render Service

**Basic Settings:**
- Name: `agri-backend`
- Runtime: Node
- Build Command: 
  ```
  npm install && npm run prisma:generate && npx prisma migrate deploy
  ```
- Start Command: 
  ```
  npm start
  ```

**Environment Variables:**

Add the following:

```
DATABASE_URL=<paste-from-supabase>
JWT_SECRET=<generate-random-32-character-string>
FRONTEND_URL=<your-vercel-frontend-url>
NODE_ENV=production
SUPABASE_URL=<from-supabase>
SUPABASE_ANON_KEY=<from-supabase>
SUPABASE_SERVICE_ROLE_KEY=<from-supabase>
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.3 Deploy

1. Click "Create Web Service"
2. Wait for deployment to complete
3. Copy the deployed URL (e.g., https://agri-backend.onrender.com)
4. Save for frontend configuration

### 2.4 Seed Database

After deployment, run seed:

1. In your local terminal:
```bash
cd backend
DATABASE_URL="<your-render-postgres-url>" npm run prisma:seed
```

Or access Render shell and run:
```bash
npm run prisma:seed
```

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Project

1. Go to [https://vercel.com](https://vercel.com)
2. Sign up or sign in with GitHub
3. Click "New Project"
4. Import your repository
5. Select "frontend" directory as root

### 3.2 Configure Environment Variables

Add the following environment variables in Vercel:

```
VITE_API_URL=<your-render-backend-url>/api
VITE_APP_NAME=Agri Fertilizer Shop
```

Example:
```
VITE_API_URL=https://agri-backend.onrender.com/api
```

### 3.3 Configure Build Settings

**Framework:** Vite
**Build Command:** `npm run build`
**Output Directory:** `dist`
**Install Command:** `npm install`

### 3.4 Deploy

1. Click "Deploy"
2. Wait for deployment to complete
3. You'll get a Vercel URL (e.g., https://agri-shop.vercel.app)

## Step 4: Update Backend FRONTEND_URL

After frontend deployment, update the backend FRONTEND_URL:

1. Go to Render dashboard
2. Select agri-backend service
3. Go to Environment
4. Update FRONTEND_URL to your Vercel URL
5. Save changes (triggers re-deployment)

## Step 5: Test the Application

1. Open your Vercel frontend URL
2. Login with default credentials:
   - Email: `admin@fertilizershop.com`
   - Password: `Admin@123`
3. Test key features:
   - Create a product
   - Create a customer
   - Create an invoice
   - Generate PDF

## Step 6: Set Up GitHub Actions (Optional)

GitHub Actions will automatically deploy when you push to main branch.

### 6.1 Add Secrets to GitHub

1. Go to repository → Settings → Secrets and variables → Actions
2. Add the following secrets:

```
RENDER_API_KEY=<from-render-dashboard>
RENDER_SERVICE_ID=<your-service-id>
VERCEL_TOKEN=<from-vercel-settings>
VERCEL_ORG_ID=<your-org-id>
VERCEL_PROJECT_ID=<your-project-id>
```

**How to get these:**

- **RENDER_API_KEY**: Render Dashboard → Account Settings → API Keys
- **RENDER_SERVICE_ID**: From your service URL or dashboard
- **VERCEL_TOKEN**: Vercel Dashboard → Settings → Tokens
- **VERCEL_ORG_ID**: Vercel Dashboard → Settings → Team Settings
- **VERCEL_PROJECT_ID**: From Vercel project settings

## Custom Domain Setup

### Add Custom Domain to Vercel

1. Go to Vercel project settings
2. Domains
3. Add your domain
4. Update DNS records as shown
5. Wait for verification (usually 5-10 minutes)

### Add Custom Domain to Render

1. Go to Render service settings
2. Custom Domains
3. Add your domain
4. Update DNS records as shown

## Production Checklist

- [ ] Database backed up
- [ ] SSL certificates verified
- [ ] CORS properly configured
- [ ] JWT_SECRET is strong and unique
- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] Seed data loaded
- [ ] Email notifications configured (optional)
- [ ] Monitoring set up (optional)
- [ ] Backup strategy in place

## Monitoring & Maintenance

### View Logs

**Render:**
```
Service Dashboard → Logs
```

**Vercel:**
```
Project Settings → Analytics & Monitoring
```

### Database Backups

**Supabase:**
1. Go to project settings
2. Backups
3. Enable daily backups
4. Download backups regularly

### Update Dependencies

Regular updates for security:

```bash
# Backend
cd backend
npm update

# Frontend
cd frontend
npm update
```

## Troubleshooting

### Backend Not Starting

1. Check render.yaml syntax
2. Verify environment variables
3. Check database connection
4. Review logs in Render dashboard

### Frontend Not Loading

1. Check API URL in environment variables
2. Verify CORS is enabled in backend
3. Check browser console for errors
4. Clear Vercel cache and redeploy

### Database Connection Issues

1. Verify DATABASE_URL is correct
2. Check IP whitelisting in Supabase
3. Ensure network allows connections
4. Test connection locally first

### PDF Generation Not Working

1. Check Supabase storage bucket exists
2. Verify bucket permissions
3. Check service role key in environment
4. Ensure PDFKit is installed

## Cost Considerations

| Service | Free Tier | Cost |
|---------|-----------|------|
| Vercel | 100 GB bandwidth/month | Free |
| Render | 750 hours/month | Free |
| Supabase | 500 MB database, 1 GB storage | Free |
| **Total** | | **Free** |

## Scaling Tips

When your business grows:

1. **Database**: Upgrade Supabase plan
2. **Backend**: Upgrade Render instance
3. **Frontend**: Vercel auto-scales
4. **Storage**: Increase Supabase storage

## Security Best Practices

1. Rotate JWT_SECRET regularly
2. Keep dependencies updated
3. Use strong database passwords
4. Enable database backups
5. Monitor access logs
6. Use environment variables for secrets
7. Keep sensitive data encrypted
8. Regular security audits

## Next Steps

After deployment:

1. **Brand Customization**
   - Update shop details in settings
   - Add logo and colors
   - Configure invoicing

2. **User Management**
   - Add staff accounts
   - Set up roles and permissions
   - Configure access levels

3. **Integration** (Optional)
   - SMS notifications
   - Email invoicing
   - Payment gateway
   - Inventory sync

## Support

For issues:
1. Check application logs
2. Review error messages
3. Test with sample data
4. Consult documentation
5. Reach out to community

---

**Your application is now live and ready to serve your fertilizer shop!** 🌾
