# Complete Troubleshooting Guide

Comprehensive solutions for common issues in the Agri Fertilizer Shop Management System.

## Setup Issues

### Issue 1: Node.js Not Installed

**Error:** `'npm' is not recognized as an internal or external command`

**Solution:**
1. Download Node.js 18+ LTS from https://nodejs.org
2. Install with default settings
3. Restart terminal/computer
4. Verify: `node --version` and `npm --version`

---

### Issue 2: PostgreSQL Not Running

**Error:** `connect ECONNREFUSED 127.0.0.1:5432`

**Diagnosis:**
```bash
# Check if PostgreSQL is running
psql --version

# Try to connect
psql -U postgres
```

**Windows Solution:**
1. Open Services (Ctrl + R → services.msc)
2. Search for "PostgreSQL"
3. Click Start if stopped
4. Or: `net start postgresql-x64-15`

**Mac Solution:**
```bash
# If using Homebrew
brew services start postgresql

# If using PostgreSQL.app
# Click "Initialize" in the app
```

**Linux Solution:**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

### Issue 3: Database Connection Error

**Error:** `database "agri_fertilizer" does not exist`

**Solution:**
```bash
# Create database
createdb agri_fertilizer

# Or if authenticated
psql -U postgres
CREATE DATABASE agri_fertilizer;
```

**With Docker:**
```bash
# Database auto-created by docker-compose
docker-compose up -d
docker-compose logs db  # Check logs
```

---

### Issue 4: Prisma Migration Failures

**Error:** `Error: P3000 Failed to create database` or similar

**Solutions:**

```bash
# Reset and try again
npm run prisma:migrate:reset  # DELETES ALL DATA

# Or step by step
npm run prisma:generate
npm run prisma:migrate -- --skip-generate
npm run prisma:seed
```

**Manual Database Reset:**
```bash
# In psql
DROP DATABASE agri_fertilizer;
CREATE DATABASE agri_fertilizer;

# Then run migrations
npm run prisma:migrate
npm run prisma:seed
```

---

### Issue 5: Port Already in Use

**Error:** `Error: listen EADDRINUSE :::5000` or `:::5173`

**Windows Solution:**
```powershell
# Find process on port 5000
netstat -ano | findstr :5000

# Kill the process
taskkill /PID <PID_NUMBER> /F

# Or use different port (in code)
```

**Mac/Linux Solution:**
```bash
# Find process
lsof -i :5000

# Kill it
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

**Change Port in Code:**

Backend (.env):
```
PORT=5001
```

Frontend (vite.config.js):
```javascript
server: {
  port: 5174
}
```

---

## Installation Issues

### Issue 6: npm install Fails

**Error:** `npm ERR! code ERESOLVE` or dependency conflicts

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Install with legacy peer deps
npm install --legacy-peer-deps

# Or use yarn
yarn install

# Or reinstall everything
rm -rf node_modules package-lock.json
npm install
```

---

### Issue 7: Dependencies Missing After Clone

**Error:** `Cannot find module 'express'`

**Solution:**
```bash
# Reinstall dependencies
npm install

# Or in both backend and frontend
cd backend && npm install
cd ../frontend && npm install
```

---

## Frontend Issues

### Issue 8: Frontend Not Loading

**Error:** Blank page or connection error in browser

**Diagnosis:**
1. Open browser console (F12)
2. Check for red errors
3. Check Network tab for failed requests
4. Check backend status

**Solutions:**

```bash
# Ensure backend is running
cd backend
npm run dev

# In new terminal, start frontend
cd frontend
npm run dev

# Check environment variable
cat frontend/.env

# Should have:
# VITE_API_URL=http://localhost:5000/api
```

---

### Issue 9: API Connection Failed

**Error:** `Failed to fetch from API` or 404 errors

**Check Checklist:**
1. ✅ Backend running on port 5000?
   ```bash
   curl http://localhost:5000/api/health
   ```

2. ✅ Correct API URL in frontend/.env?
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

3. ✅ CORS enabled in backend?
   ```javascript
   // Check backend/src/index.js
   app.use(cors({
     origin: process.env.FRONTEND_URL || '*',
     credentials: true,
   }));
   ```

4. ✅ Network request reaching backend?
   ```
   Browser Network tab → check request URL
   ```

**Fix:**
```bash
# Restart both services
npm run dev  # In both directories
```

---

### Issue 10: Dark Mode Not Working

**Error:** Dark mode toggle doesn't change theme

**Check:**
1. Open browser DevTools
2. Go to Elements tab
3. Check if `dark` class added to `<html>` tag
4. Check localStorage for `theme` key

**Fix:**
```javascript
// In frontend/src/context/ThemeContext.jsx
// Ensure localStorage is being set

// Or clear localStorage and refresh
localStorage.clear()
// Then click dark mode button again
```

---

### Issue 11: Forms Not Submitting

**Error:** Click button but nothing happens

**Diagnosis:**
1. Check browser console for JavaScript errors
2. Check Network tab - is request being sent?
3. Check if form validation is blocking

**Common Causes:**
```javascript
// Missing preventDefault
form.addEventListener('submit', (e) => {
  e.preventDefault();  // Required!
});

// Validation preventing submit
if (!email || !validateEmail(email)) {
  return;  // Exits early
}
```

**Fix:**
1. Check console for specific error
2. Verify all required fields filled
3. Try in incognito window (cache issue)

---

### Issue 12: PDF Download Not Working

**Error:** PDF link opens in new tab but doesn't download

**Causes & Solutions:**

```html
<!-- Use download attribute -->
<a href="pdf-url" download="invoice.pdf">Download</a>

<!-- Instead of -->
<a href="pdf-url" target="_blank">View</a>
```

**If Supabase Integration Issue:**
1. Check bucket name is "invoices"
2. Verify bucket is public
3. Check Supabase credentials in .env

---

### Issue 13: Login Stuck / Infinite Loading

**Error:** Click login, page keeps loading

**Check:**
1. Is backend running?
2. Check browser console
3. Check Network tab - what's the request status?

**Fix:**
```bash
# Restart backend
npm run dev  # In backend directory

# Check credentials
# Email: admin@fertilizershop.com
# Password: Admin@123

# If custom credentials, verify in database
npm run prisma:studio
# Find user and check email/password
```

---

### Issue 14: Search Not Working

**Error:** Enter search term but results don't filter

**Check:**
1. API returning results?
   ```bash
   curl "http://localhost:5000/api/products?search=urea"
   ```

2. Frontend making request?
   - Open Network tab
   - Type in search box
   - Should see API request

**Fix:**
- Clear database and seed again
- Check if search parameters match API
- Verify API controller has search logic

---

## Backend Issues

### Issue 15: Backend Crashes on Start

**Error:** `npm run dev` starts then immediately exits

**Diagnosis:**
```bash
# Run with error output visible
npm run dev  # Watch the console

# Check specific error
node backend/src/index.js
```

**Common Causes:**
- Database not connected
- Missing environment variables
- Port already in use
- Syntax error in code

**Fix:**
```bash
# Check .env file exists
ls backend/.env

# Verify DATABASE_URL
cat backend/.env | grep DATABASE_URL

# Check port isn't in use
lsof -i :5000

# Check syntax
npm run lint
```

---

### Issue 16: 401 Unauthorized Error

**Error:** `"Unauthorized"` or `"Invalid token"`

**Causes:**
1. No token sent
2. Token expired (24 hours)
3. Token invalid/malformed
4. Wrong secret key

**Fix:**
```bash
# Frontend
1. Open DevTools → Application → Storage
2. Check for 'token' in localStorage
3. If exists, copy it
4. Decode at https://jwt.io
5. Check expiration (exp field)

# If expired, login again

# Backend
# Check JWT_SECRET is same in all places
echo $JWT_SECRET
cat backend/.env | grep JWT_SECRET
```

---

### Issue 17: Database Connection Pooling Error

**Error:** `Error: connect timeout`

**Causes:**
- Too many connections
- Connection pool exhausted
- Database not responsive

**Fix:**
```javascript
// Increase pool size in connection string
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&connection_limit=20"

// Or reset connections
npm run prisma:studio
// Then close and reopen
```

---

### Issue 18: Transaction/Invoice Not Saving

**Error:** Submit form, see success message, but data not in database

**Check:**
1. Database connected?
2. Prisma migrations ran?
3. User has permission?

**Debug:**
```bash
# Check database directly
npm run prisma:studio

# Look for the record
# If not there, check backend logs

# Check API response
curl -X POST http://localhost:5000/api/invoices \
  -H "Authorization: Bearer <token>" \
  -d '...'
# Look for error in response
```

---

## Database Issues

### Issue 19: Prisma Studio Won't Open

**Error:** `Failed to open Prisma Studio`

**Solution:**
```bash
# Try again
npm run prisma:studio

# If still fails, use direct connection
psql -U postgres -d agri_fertilizer

# Or reset Prisma cache
rm -rf node_modules/.prisma
npm run prisma:generate
npm run prisma:studio
```

---

### Issue 20: Data Not Seeding

**Error:** Run seed but tables remain empty

**Check:**
```bash
# Verify tables exist
npm run prisma:studio

# Check seed output
npm run prisma:seed  # Watch console for errors

# Check if user already exists
npm run prisma:studio
# Look in User table
```

**If User Exists:**
```bash
# Seed is idempotent, won't duplicate
# Verify sample data in Product table

# If truly empty, reset
npm run prisma:migrate:reset
npm run prisma:seed
```

---

### Issue 21: Schema Validation Error

**Error:** `Error: error validating datasource \`db\``

**Causes:**
- Syntax error in schema.prisma
- Invalid field type
- Missing required field

**Fix:**
```bash
# Check schema syntax
npm run prisma:validate

# If still error, review syntax
cat backend/prisma/schema.prisma | grep -n "model"

# Reset to working version
git checkout backend/prisma/schema.prisma
npm run prisma:generate
```

---

## Deployment Issues

### Issue 22: Vercel Deploy Fails

**Error:** Build fails on Vercel

**Check:**
1. Build logs on Vercel dashboard
2. Look for specific error
3. Environment variables set?

**Common Causes:**
```
1. Missing VITE_API_URL variable
2. Port conflicts in build
3. Dependency errors
4. TypeScript errors

# Fix environment variables
1. Go to Vercel Project Settings
2. Environment Variables
3. Add VITE_API_URL=<backend-url>/api
4. Redeploy
```

---

### Issue 23: Render Deploy Fails

**Error:** Backend deployment fails

**Check:**
1. render.yaml correct?
2. DATABASE_URL set?
3. Log files on Render

**Common Causes:**
```
1. Missing environment variables
2. Database migration fails
3. Port already in use
4. Prisma issues

# Check logs
Render Dashboard → Service → Logs

# Verify variables
Render Dashboard → Service → Environment
# Ensure DATABASE_URL, JWT_SECRET, etc. are set
```

---

### Issue 24: CORS Error in Production

**Error:** `CORS policy: No 'Access-Control-Allow-Origin' header`

**Fix:**
```javascript
// backend/src/index.js
app.use(cors({
  origin: process.env.FRONTEND_URL,  // Set to actual URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
```

**Then:**
1. Ensure FRONTEND_URL env variable set correctly
2. Restart backend service

---

### Issue 25: PDF Generation Fails in Production

**Error:** `Error uploading file to Supabase` or PDF not generating

**Check:**
1. SUPABASE_URL set?
2. SUPABASE_SERVICE_ROLE_KEY set?
3. Storage bucket "invoices" exists?
4. Bucket is public?

**Fix:**
```bash
# Verify Supabase credentials
cat backend/.env | grep SUPABASE

# Check bucket
1. Go to Supabase dashboard
2. Storage → buckets
3. Look for "invoices"
4. If not there, create it
5. Set to public
6. Redeploy backend
```

---

## Performance Issues

### Issue 26: Slow Page Load

**Error:** Page takes >3 seconds to load

**Cause:** Usually database queries

**Optimize:**
```javascript
// Add database indexes for frequently searched fields
// In schema.prisma
model Product {
  id Int @id @default(autoincrement())
  name String @db.VarChar(255)
  brand String? @db.VarChar(255)
  
  @@index([name])  // Add index for search
  @@index([brand])
}

// Then run migration
npm run prisma:migrate
```

---

### Issue 27: High Memory Usage

**Error:** Backend crashes with out of memory

**Causes:**
- Large dataset operations
- Unbounded queries
- Memory leaks

**Fix:**
```javascript
// Add pagination
const skip = (page - 1) * limit;
const data = await prisma.product.findMany({
  skip,
  take: limit,
});

// Limit query results
const products = await prisma.product.findMany({
  take: 100,  // Max 100 results
  where: { name: { contains: search } },
});
```

---

## Docker Issues

### Issue 28: Docker Container Won't Start

**Error:** `docker: command not found` or container exits

**Check:**
```bash
# Is Docker installed?
docker --version

# Is service running?
# Windows: Docker Desktop must be open
# Mac: Docker Desktop must be running
# Linux: sudo systemctl start docker

# View logs
docker-compose logs
docker-compose logs backend
```

**Common Fix:**
```bash
# Rebuild containers
docker-compose down
docker-compose up --build

# Or full reset
docker-compose down -v  # -v removes volumes
docker-compose up -d
```

---

### Issue 29: Docker Port Conflict

**Error:** `Port 5000 already allocated`

**Fix Option 1 - Change Port:**
```yaml
# docker-compose.yml
ports:
  - "5001:5000"  # Changed from 5000:5000
```

**Fix Option 2 - Stop Conflicting Container:**
```bash
docker ps  # List all containers
docker stop <container_id>
docker-compose up
```

---

## Security Issues

### Issue 30: Weak Password Accepted

**Error:** Can create user with weak password

**Fix:**
```javascript
// backend/src/controllers/authController.js
const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/;
if (!passwordRegex.test(password)) {
  throw new Error('Password must contain uppercase, number, and special char');
}
```

---

## General Debugging Steps

### Step 1: Check All Services Running

```bash
# Frontend
curl http://localhost:5173

# Backend
curl http://localhost:5000/api/health

# Database
psql -U postgres -d agri_fertilizer -c "SELECT 1"
```

### Step 2: Check Console Errors

**Frontend:**
1. Open browser (F12)
2. Go to Console tab
3. Look for red errors
4. Note error message

**Backend:**
1. Terminal where `npm run dev` is running
2. Look for red text errors
3. Note stack trace

### Step 3: Check Environment Variables

```bash
# Backend
cat backend/.env

# Frontend
cat frontend/.env

# Look for:
# - DATABASE_URL (backend)
# - JWT_SECRET (backend)
# - VITE_API_URL (frontend)
```

### Step 4: Check Network Requests

1. Open browser DevTools
2. Go to Network tab
3. Perform action that fails
4. Click on failed request
5. View request URL and response
6. Look for 4xx/5xx status codes

### Step 5: Reset and Start Fresh

```bash
# Complete reset
rm -rf backend/node_modules frontend/node_modules
npm install  # In both directories
npm run prisma:seed
npm run dev  # In both terminals
```

---

## Still Having Issues?

1. **Collect Information:**
   - Error message (exact text)
   - Steps to reproduce
   - What were you doing?
   - Operating system and version
   - Node.js version
   - Terminal/console output

2. **Search:**
   - Search FAQ.md
   - Search GitHub issues
   - Google the error message

3. **Create Issue:**
   - Go to GitHub Issues
   - Provide all information above
   - Attach screenshots/logs
   - Describe what you've tried

4. **Check Documentation:**
   - README.md
   - API_DOCUMENTATION.md
   - DEPLOYMENT_GUIDE.md
   - SECURITY.md

---

**Good debugging is 90% of the solution!** 🔍
# Documentation Status

This troubleshooting guide contains older Prisma/PostgreSQL sections kept for reference. For active MongoDB/Mongoose setup issues, start with `README.md`, `QUICK_START.md`, and `DEPLOYMENT_GUIDE.md`.
