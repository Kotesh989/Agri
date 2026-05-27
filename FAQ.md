# Frequently Asked Questions (FAQ)

Common questions and answers about the Agri Fertilizer Shop Management System.

## Installation & Setup

### Q: What are the system requirements?
**A:** 
- Node.js 18+ (LTS)
- PostgreSQL 12+
- 2GB RAM minimum
- 500MB disk space
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Q: How do I install the system locally?
**A:** Follow QUICK_START.md for the fastest setup. For detailed instructions, see README.md.

### Q: Can I use SQLite instead of PostgreSQL?
**A:** Yes, but not recommended for production. For development:
```
DATABASE_URL="file:./dev.db"
```

### Q: What if I already have PostgreSQL on port 5432?
**A:** Change the port in docker-compose.yml:
```yaml
ports:
  - "5433:5432"  # Changed from 5432
```

### Q: How do I seed sample data?
**A:** After running migrations:
```bash
npm run prisma:seed
```

---

## Authentication

### Q: How do I reset an admin password?
**A:** 
```bash
# In backend directory
npm run prisma:studio

# Find user and update password directly (not recommended for production)
# Or create a password reset endpoint
```

### Q: Can I use OAuth (Google, GitHub login)?
**A:** Currently not implemented. You can add it by:
1. Installing passport.js
2. Configuring strategy
3. Adding login endpoints
4. Updating frontend

### Q: What if a staff member forgets their password?
**A:** Admin can:
1. Go to Users (admin only)
2. Reset password functionality (to be implemented)

Or in development:
```bash
npm run prisma:studio
# Directly reset password
```

### Q: How do I create multiple admin users?
**A:** 
```bash
# Via API
POST /api/auth/register
{
  "email": "admin2@shop.com",
  "password": "SecurePass123",
  "name": "Admin 2",
  "role": "ADMIN"
}

# Or Prisma Studio
npm run prisma:studio
```

---

## Products & Inventory

### Q: How do I bulk import products?
**A:** Currently manual entry via UI. To add bulk import:
1. Create CSV file
2. Add upload endpoint
3. Parse CSV and insert products
4. Add to frontend

### Q: What if a product name already exists?
**A:** Product names are not unique. Duplicates are allowed but not recommended. For unique enforcement, modify Prisma schema:
```prisma
model Product {
  name String @unique
}
```

### Q: How do I track product batches?
**A:** Use the `batchNumber` field:
```json
{
  "name": "Urea",
  "batchNumber": "BATCH-2024-001",
  "expiryDate": "2025-12-31"
}
```

### Q: Can I edit product prices?
**A:** Yes, in Products page. Existing invoices retain original prices.

### Q: How are NPK ratios used?
**A:** For information and reporting. Format: "N:P:K" (e.g., "46:0:0" for Urea)

---

## Customers & Credit

### Q: Can I set customer credit limits?
**A:** Yes, in customer details. Update in Customers page.

### Q: How do I see customer payment history?
**A:** 
1. Go to Customers
2. Click on customer name
3. View all transactions

### Q: What if a customer exceeds credit limit?
**A:** System doesn't prevent it automatically. You can:
1. Check before creating invoice
2. Add validation in backend
3. Enable alert on dashboard

### Q: Can I export customer list?
**A:** Not in current version. You can:
1. Add CSV export feature
2. Copy from browser console
3. Access database directly

---

## Invoices & Sales

### Q: How is GST calculated?
**A:** Per line item:
```
GST Amount = (Unit Price × Quantity × GST%) / 100
Total = Subtotal + GST Amount
```

### Q: Can I edit invoices after creation?
**A:** Currently, you can:
1. Delete and recreate
2. Record payment adjustments
3. Add cancellation note

To enable editing, modify backend validation.

### Q: How do I generate PDF for an invoice?
**A:** Automatic on invoice creation. Download from:
- Invoice details page
- View PDF link in invoice list

### Q: What if PDF generation fails?
**A:** Check:
1. Supabase credentials
2. Storage bucket exists
3. File permissions
4. Backend logs

### Q: Can I customize invoice template?
**A:** Yes! Edit `backend/src/utils/pdfGenerator.js` to:
1. Change layout
2. Add logo/watermark
3. Modify fonts
4. Add custom fields

### Q: How do I change invoice prefix?
**A:** In Settings page:
1. Update Invoice Prefix (e.g., "INV" to "BILL")
2. Save

Next invoices use new prefix.

### Q: What payment methods are supported?
**A:** CASH, CREDIT, CHEQUE. Add more in:
1. Backend route validation
2. Frontend dropdown
3. Prisma schema enum

---

## Reports & Analytics

### Q: How do I calculate profit margin?
**A:**
```
Profit Margin = (Revenue - Cost) / Revenue × 100
```

### Q: Can I export reports?
**A:** Not in current version. Add by:
1. Creating CSV export function
2. Adding Excel export library
3. Frontend download button

### Q: How do I view daily vs monthly sales?
**A:** In Reports page, use "Group By" dropdown to switch between daily and monthly views.

### Q: Why is profit showing as negative?
**A:** Check:
1. Selling price < purchase price
2. High GST rates
3. Product cost calculation

---

## Payments

### Q: How do I record partial payments?
**A:**
1. Go to Payments
2. Select invoice and customer
3. Enter partial amount
4. Submit

Invoice status changes to PARTIAL.

### Q: Can I record advance payments?
**A:** Yes! Link to customer but not specific invoice:
1. Select customer only
2. Leave invoice blank
3. Advance credited to customer

### Q: How do I see customer dues?
**A:** 
1. Go to Payments
2. Click "Customer Credit" button
3. View all customers' dues
4. Or go to specific customer profile

---

## Suppliers & Purchases

### Q: How do I track purchase orders?
**A:** In Purchases page:
1. Create purchase order
2. Set status (PENDING)
3. Update to RECEIVED when delivered

Stock automatically updates on RECEIVED.

### Q: Can I cancel a purchase order?
**A:** Yes, change status to CANCELLED. Stock remains unchanged.

### Q: How do I compare supplier prices?
**A:** Create products from different suppliers and compare prices manually or export data.

---

## Settings & Configuration

### Q: How do I set the GST number?
**A:** In Settings page, enter your 15-digit GST number.

### Q: Can I change the shop name?
**A:** Yes, in Settings. All new invoices use updated name.

### Q: How do I set expiry alerts?
**A:** In Settings, update "Expiry Alert Days" (default: 30).

---

## Deployment

### Q: What's the cost to deploy?
**A:** Completely FREE using:
- Vercel (frontend)
- Render (backend)  
- Supabase (database)

### Q: How do I get custom domain?
**A:** See DEPLOYMENT_GUIDE.md for custom domain setup on both Vercel and Render.

### Q: Can I deploy to AWS/Google Cloud?
**A:** Yes, but not covered in this guide. You'll need to:
1. Set up instances
2. Configure databases
3. Update environment variables
4. Manage security

### Q: Is the application GDPR compliant?
**A:** Partially. You need to add:
1. Privacy policy page
2. Data deletion endpoints
3. User consent management
4. Terms of service

### Q: Can I deploy using Docker?
**A:** Yes! Run:
```bash
docker-compose up -d
```

See README.md for details.

### Q: How do I backup my database?
**A:** 
- **Supabase**: Automatic daily backups
- **Local PostgreSQL**: Use pg_dump

---

## Troubleshooting

### Q: Frontend not connecting to backend?
**A:** Check:
1. Backend is running on 5000
2. VITE_API_URL is correct in frontend/.env
3. CORS is enabled in backend
4. Check browser console for errors

### Q: Getting "Unauthorized" error?
**A:**
1. Check JWT token in localStorage
2. Token may have expired (24 hours)
3. Try logging in again
4. Clear cookies and cache

### Q: Database migrations failed?
**A:** Run:
```bash
npm run prisma:migrate -- --skip-generate
npm run prisma:generate
npm run prisma:migrate
```

### Q: Port already in use?
**A:** Kill the process or use different port:
```bash
# Linux/Mac
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Q: PDF not generating?
**A:** Check Supabase:
1. Bucket "invoices" exists
2. Bucket is public
3. Storage keys in .env
4. File permissions

---

## Performance

### Q: Application is slow?
**A:** Check:
1. Database query performance
2. Network latency
3. Server resources
4. Browser cache
5. Add indexes to frequently searched fields

### Q: How many products can I have?
**A:** Unlimited theoretically, but:
- UI pagination recommended above 1000
- Database indexes important
- Search may slow down

### Q: How do I optimize images?
**A:** Use:
- Compressed PNGs/JPGs
- WebP format where supported
- Lazy loading
- CDN caching

---

## Security

### Q: Is my data secure?
**A:** Yes, with HTTPS, password hashing, and JWT tokens. See SECURITY.md for full details.

### Q: Can I audit user actions?
**A:** Currently basic tracking. To add full audit:
1. Create audit log model
2. Log all actions
3. Create audit dashboard

### Q: How often should I update dependencies?
**A:** 
- Security patches: Immediately
- Major versions: Quarterly
- Minor versions: Monthly

Run: `npm audit` regularly

### Q: What if I suspect a breach?
**A:** See SECURITY.md Incident Response section.

---

## Development

### Q: How do I add a new feature?
**A:** See CONTRIBUTING.md for development workflow.

### Q: Can I customize the UI?
**A:** Yes! Using Tailwind CSS:
1. Modify tailwind.config.js for colors
2. Edit component styles
3. Add custom CSS classes

### Q: How do I add new models to database?
**A:**
1. Update schema.prisma
2. Run migration: `npm run prisma:migrate -- --name add_new_model`
3. Update controllers

### Q: Can I add new API endpoints?
**A:** Yes! Add to backend/src/routes/index.js:
```javascript
router.post('/api/newfeature', authenticate, newFeatureController);
```

### Q: How do I test the API?
**A:** Use:
- Postman (desktop app)
- ThunderClient (VS Code)
- cURL (command line)
- Insomnia (open source)

---

## Support

### Q: How do I report a bug?
**A:**
1. Go to GitHub Issues
2. Provide detailed description
3. Steps to reproduce
4. Expected vs actual behavior
5. Screenshots/logs if possible

### Q: Where can I get help?
**A:**
1. Read documentation (README, guides)
2. Check FAQ and troubleshooting
3. Review API documentation
4. Open GitHub issue
5. Contact maintainers

### Q: Can I request a feature?
**A:** Yes! Open a GitHub issue with:
1. Feature description
2. Why it's needed
3. Use case
4. Suggested implementation

---

## Legal

### Q: What license is this?
**A:** MIT License - free for commercial use.

### Q: Can I use this commercially?
**A:** Yes, with MIT license.

### Q: Do I need to credit you?
**A:** Attribution appreciated but not required by license.

---

## Miscellaneous

### Q: Can I use this for multiple shops?
**A:** Currently single-shop. For multi-shop:
1. Add shop_id to all models
2. Add shop management
3. Implement shop switching
4. Multi-tenant architecture

### Q: How do I add notification emails?
**A:** Install nodemailer:
```bash
npm install nodemailer
```

Then create notification service.

### Q: Can I add SMS notifications?
**A:** Yes, integrate Twilio or AWS SNS.

### Q: Is there a mobile app?
**A:** Not yet. You can build with React Native sharing 70% of code.

### Q: Can I use this as a template?
**A:** Yes! Clone and customize for your needs.

### Q: How do I contribute code?
**A:** See CONTRIBUTING.md for detailed instructions.

---

## Still Have Questions?

1. **Check Documentation:**
   - README.md - Getting started
   - DEPLOYMENT_GUIDE.md - Production setup
   - API_DOCUMENTATION.md - API reference
   - SECURITY.md - Security guidelines
   - PROJECT_STRUCTURE.md - Code organization

2. **Review Code:**
   - Controllers show business logic
   - Routes show API structure
   - Components show UI patterns

3. **Ask Community:**
   - Open GitHub Discussion
   - Create GitHub Issue
   - Check existing issues

4. **Debug:**
   - Check browser console (frontend errors)
   - Check terminal logs (backend errors)
   - Check database logs (query errors)

---

**Still stuck? Create an issue on GitHub with details!** 🚀
# Documentation Status

This FAQ contains older Prisma/PostgreSQL answers kept for reference. For the active MongoDB/Mongoose backend, use `README.md`, `QUICK_START.md`, and `ENVIRONMENT.md`.
