# Pre-Deployment Checklist

Complete this checklist before deploying to production.

## 📋 Documentation Review

- [ ] Read README.md completely
- [ ] Reviewed DEPLOYMENT_GUIDE.md
- [ ] Checked SECURITY.md guidelines
- [ ] Understood API_DOCUMENTATION.md
- [ ] Reviewed PROJECT_STRUCTURE.md
- [ ] Checked FAQ.md for answers
- [ ] Reviewed TROUBLESHOOTING.md

## 🔐 Security Checks

### Passwords & Secrets
- [ ] JWT_SECRET is 32+ characters (generated, not default)
- [ ] Database password is strong (12+ chars, mixed case, numbers, symbols)
- [ ] No secrets committed to git
- [ ] .env.example doesn't contain real secrets
- [ ] .gitignore includes .env files

### Code Security
- [ ] No hardcoded API keys
- [ ] No console.log of sensitive data
- [ ] All passwords hashed (bcryptjs)
- [ ] JWT tokens have expiration
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS prevention (React escaping)

### Authentication
- [ ] JWT expiration set to 24 hours
- [ ] Role-based access control working
- [ ] Protected routes have authentication
- [ ] Admin-only endpoints checked

## 🗄️ Database Setup

### Local Testing
- [ ] PostgreSQL installed and running
- [ ] Database created: `agri_fertilizer`
- [ ] Migrations run successfully: `npm run prisma:migrate`
- [ ] Seed data loaded: `npm run prisma:seed`
- [ ] Can connect via psql or Prisma Studio
- [ ] Sample data visible

### Supabase Setup (Production)
- [ ] Supabase account created
- [ ] PostgreSQL database created
- [ ] Connection string copied
- [ ] Storage bucket "invoices" created
- [ ] Bucket set to public
- [ ] Service role key generated
- [ ] Anon key generated

## 🚀 Backend Preparation

### Code Quality
- [ ] No console errors when running
- [ ] No TypeScript/syntax errors
- [ ] All imports resolved
- [ ] Environment variables loaded correctly
- [ ] Database connection successful

### Testing
- [ ] Backend starts: `npm run dev`
- [ ] API responds: `curl http://localhost:5000/api/health`
- [ ] Can login: `POST /api/auth/login`
- [ ] Can create product: `POST /api/products`
- [ ] Can list products: `GET /api/products`
- [ ] Can create invoice: `POST /api/invoices`
- [ ] PDF generation works
- [ ] Reports endpoint working

### Configuration
- [ ] .env.example up to date
- [ ] port configured (default: 5000)
- [ ] CORS origin set correctly
- [ ] FRONTEND_URL environment variable set
- [ ] NODE_ENV=production for production

## 🎨 Frontend Preparation

### Code Quality
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] All imports resolved
- [ ] Environment variables correct
- [ ] No hardcoded URLs

### Testing
- [ ] Frontend starts: `npm run dev`
- [ ] Can access: `http://localhost:5173`
- [ ] Can login with demo credentials
- [ ] Dashboard loads
- [ ] Can navigate all pages
- [ ] Dark mode toggle works
- [ ] Search functionality works
- [ ] Forms submit successfully
- [ ] API calls working
- [ ] Responsive on mobile view

### Configuration
- [ ] .env.example up to date
- [ ] VITE_API_URL points to backend
- [ ] Build command correct: `npm run build`
- [ ] Output directory correct: `dist`
- [ ] vercel.json configured

### Build
- [ ] Production build successful: `npm run build`
- [ ] dist folder created
- [ ] Can serve locally: `npx serve dist`

## 📱 Responsive Design

- [ ] Mobile (375px width)
- [ ] Tablet (768px width)
- [ ] Desktop (1920px width)
- [ ] Sidebar collapses on mobile
- [ ] Forms are usable on mobile
- [ ] Tables are readable on mobile
- [ ] Images scale properly

## 🌙 Dark Mode

- [ ] Dark mode toggle appears
- [ ] Dark mode applies correctly
- [ ] Light mode applies correctly
- [ ] Preference persists on reload
- [ ] All colors readable in both modes

## 📊 Functionality Testing

### Authentication
- [ ] Can register new user (if enabled)
- [ ] Can login successfully
- [ ] Can view profile
- [ ] Can logout
- [ ] 401 error on expired token

### Products
- [ ] Can create product
- [ ] Can view all products
- [ ] Can search products
- [ ] Can update product
- [ ] Can delete product
- [ ] NPK ratio displayed correctly

### Customers
- [ ] Can create customer
- [ ] Can view all customers
- [ ] Can search customers
- [ ] Can update customer
- [ ] Can delete customer
- [ ] Mobile number unique constraint works

### Invoices
- [ ] Can create invoice
- [ ] Multi-item form works
- [ ] Stock decrements on invoice creation
- [ ] PDF generates automatically
- [ ] Can view invoice details
- [ ] Can update invoice status
- [ ] Can delete invoice
- [ ] Stock reverts on deletion

### Reports
- [ ] Dashboard stats accurate
- [ ] Sales report working
- [ ] Profit report working
- [ ] Date filtering works
- [ ] Charts display (if integrated)

### Settings
- [ ] Can view settings
- [ ] Can update settings
- [ ] Changes persist
- [ ] GST number validated

## 🌐 Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## 🐳 Docker Testing

- [ ] Docker installed
- [ ] docker-compose up works
- [ ] All 3 services start
- [ ] Frontend accessible on :5173
- [ ] Backend accessible on :5000
- [ ] Database accessible on :5432
- [ ] Can login and use application
- [ ] docker-compose down stops cleanly

## 📝 Documentation

- [ ] README.md complete
- [ ] API documentation complete
- [ ] Deployment guide complete
- [ ] Troubleshooting guide complete
- [ ] Security guide complete
- [ ] Contributing guide complete
- [ ] Example .env files present
- [ ] No broken links in docs

## 🚀 Deployment to Vercel (Frontend)

### Preparation
- [ ] GitHub repository created and pushed
- [ ] Vercel account created
- [ ] Frontend directory specified
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`

### Environment Variables
- [ ] VITE_API_URL set to backend URL
- [ ] No other secrets in environment
- [ ] vercel.json configured

### Deployment
- [ ] Select "Deploy" in Vercel
- [ ] Build succeeds
- [ ] Deployment succeeds
- [ ] Frontend accessible via Vercel URL
- [ ] Can login and use app

### Post-Deployment
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate valid
- [ ] Vercel analytics enabled

## 🚀 Deployment to Render (Backend)

### Preparation
- [ ] Render account created
- [ ] GitHub connected to Render
- [ ] render.yaml configured

### Environment Variables
- [ ] DATABASE_URL to Supabase
- [ ] JWT_SECRET set (strong value)
- [ ] FRONTEND_URL set to Vercel frontend
- [ ] SUPABASE_URL set
- [ ] SUPABASE_ANON_KEY set
- [ ] SUPABASE_SERVICE_ROLE_KEY set
- [ ] NODE_ENV=production

### Build Commands
- [ ] Build command correct
- [ ] Start command correct
- [ ] Migrations run automatically

### Deployment
- [ ] Select "Deploy" in Render
- [ ] Build succeeds
- [ ] Migrations run successfully
- [ ] Backend starts
- [ ] API accessible via Render URL

### Testing Production
- [ ] Can login
- [ ] Can create product
- [ ] Can create invoice
- [ ] PDF generates and downloads
- [ ] Dashboard stats display

## 📊 Supabase Setup Verification

- [ ] PostgreSQL database created
- [ ] Connection successful from backend
- [ ] All tables created
- [ ] Seed data present
- [ ] Storage bucket "invoices" exists
- [ ] Bucket is public
- [ ] Can upload/download files

## 🔗 Integration Testing

- [ ] Frontend → Backend API calls working
- [ ] Backend → Supabase database working
- [ ] Backend → Supabase storage working
- [ ] PDF generation and upload working
- [ ] Search functionality across 3 services working

## ⚡ Performance

- [ ] Frontend page load < 3 seconds
- [ ] API response time < 500ms
- [ ] PDF generation < 5 seconds
- [ ] Dashboard stats load quickly
- [ ] Search results instant

## 📱 Mobile Testing

- [ ] App works on iPhone
- [ ] App works on Android
- [ ] Touch interactions work
- [ ] No horizontal scroll needed
- [ ] Forms easy to fill on mobile
- [ ] Buttons easily clickable

## 🔔 Notifications

- [ ] Notifications appear on success
- [ ] Notifications appear on error
- [ ] Toast messages auto-dismiss
- [ ] No console warnings

## ⏰ Production Readiness

- [ ] No "TODO" comments in code
- [ ] No debug console.log statements
- [ ] All error messages user-friendly
- [ ] Logging configured
- [ ] Backup strategy in place
- [ ] Monitoring enabled

## ✅ Final Checks

- [ ] All tests pass
- [ ] No known bugs
- [ ] Performance acceptable
- [ ] Security review complete
- [ ] Documentation complete and accurate
- [ ] Backup created
- [ ] Rollback plan documented
- [ ] Team trained on system

## 🎉 Deployment Ready!

If all checkboxes are ✅, your system is ready for production!

---

## Post-Deployment Monitoring

After going live, monitor:

### Daily
- [ ] Check error logs
- [ ] Verify all features working
- [ ] Check database performance
- [ ] Monitor user feedback

### Weekly
- [ ] Review API usage
- [ ] Check security logs
- [ ] Verify backups running
- [ ] Update documentation if needed

### Monthly
- [ ] Security audit
- [ ] Performance analysis
- [ ] Database optimization
- [ ] Dependency updates

## Emergency Procedures

### If Service Goes Down
1. Check Render/Vercel status
2. Check Supabase status
3. Review recent deployments
4. Check error logs
5. Rollback if needed

### If Database Connection Fails
1. Verify Supabase is running
2. Check connection string
3. Verify IP whitelisting
4. Restart backend service
5. Check network connectivity

### If Losing Data
1. Stop all services immediately
2. Contact Supabase support
3. Restore from backup
4. Investigate root cause

---

**Ready to launch? Go live! 🚀**

For questions, see FAQ.md or TROUBLESHOOTING.md
# Deprecated Checklist

This checklist reflects the older Prisma/PostgreSQL deployment path. For the active MongoDB/Mongoose deployment, use `DEPLOYMENT_GUIDE.md` and the root `render.yaml`.
