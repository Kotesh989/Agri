# Agri Fertilizer Shop Management System

A production-ready fertilizer shop management system built with React, Node.js, Express, and PostgreSQL. Designed specifically for Indian fertilizer shops with support for GST, invoicing, stock management, and comprehensive reporting.

## 🌟 Features

### Core Modules
- **Authentication**: Admin and Staff roles with JWT-based authentication
- **Customer Management**: Complete customer profiles with credit tracking
- **Product/Fertilizer Management**: Full product lifecycle with NPK ratios, batch tracking, and expiry management
- **Stock Management**: Real-time stock updates with low-stock alerts
- **Supplier Management**: Supplier database and purchase history
- **Purchase Management**: Track purchases from suppliers with delivery status
- **Sales & Invoicing**: Create and track sales with automatic PDF generation
- **Credit/Due Management**: Track customer credits and payments
- **Dashboard & Reports**: Real-time statistics, profit reports, sales analysis
- **Settings**: Configurable shop details, GST rates, invoice prefixes

### Advanced Features
- ✅ Automatic PDF invoice generation and storage
- ✅ Expiry date tracking with 30-day alerts
- ✅ Dark/Light mode support
- ✅ Responsive design (Desktop & Mobile)
- ✅ Profit reports with margin calculation
- ✅ Daily and monthly sales reports
- ✅ Customer-wise credit tracking
- ✅ Batch number and traceability
- ✅ GST calculation and compliance
- ✅ Search functionality across products, customers, and suppliers

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- React 18.2 with Hooks
- Vite build tool for faster development
- Tailwind CSS for styling
- React Router for navigation
- Axios for API calls
- Chart.js for analytics
- Lucide React for icons

**Backend:**
- Node.js 18+ with Express.js
- Prisma ORM for database management
- PostgreSQL for data persistence
- JWT for authentication
- bcryptjs for password hashing
- PDFKit for PDF generation

**Database:**
- PostgreSQL (Supabase for hosting)
- Prisma schema management

**Hosting:**
- Frontend: Vercel
- Backend: Render
- Database: Supabase PostgreSQL (free tier)
- File Storage: Supabase Storage for PDFs

## 📋 Prerequisites

- Node.js 18+ (LTS)
- npm or yarn
- PostgreSQL 12+ (for local development)
- Git
- GitHub account (for source control)

## 🚀 Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Agri
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update DATABASE_URL in .env
# Example: postgresql://user:password@localhost:5432/agri_fertilizer

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed sample data
npm run prisma:seed

# Start backend server
npm run dev
```

The backend will start at `http://localhost:5000`

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update VITE_API_URL in .env (should point to your backend)
# Example: http://localhost:5000/api

# Start development server
npm run dev
```

The frontend will start at `http://localhost:5173`

### 4. Default Credentials

```
Email: admin@fertilizershop.com
Password: Admin@123
```

## 🗄️ Database Setup

### Local PostgreSQL Setup

```bash
# Create database
createdb agri_fertilizer

# Update backend/.env
DATABASE_URL="postgresql://username:password@localhost:5432/agri_fertilizer"

# Run migrations
npm run prisma:migrate

# Seed data
npm run prisma:seed
```

### Using Supabase (Cloud)

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Get your PostgreSQL connection string
4. Update `DATABASE_URL` in backend/.env

```
DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]"
```

## 📦 Seed Data

The system includes seed data with:
- Admin user (admin@fertilizershop.com / Admin@123)
- 6 sample products (Urea, DAP, MOP, NPK 20:20:0:13, etc.)
- 1 sample supplier (National Fertilizer Limited)
- Default shop settings

To seed the database:

```bash
npm run prisma:seed
```

## 🐳 Docker Setup

### Using Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

Services will be available at:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- PostgreSQL: `localhost:5432`

### Build Individual Containers

```bash
# Backend
docker build -f Dockerfile.backend -t agri-backend .
docker run -p 5000:5000 --env-file backend/.env agri-backend

# Frontend
docker build -f Dockerfile.frontend -t agri-frontend .
docker run -p 5173:3000 agri-frontend
```

## 🚀 Deployment

### Automatic Deployment with GitHub Actions

1. Push code to main branch
2. GitHub Actions automatically deploys to Render (backend) and Vercel (frontend)
3. Set up the following secrets in GitHub:
   - `RENDER_API_KEY`: Your Render API key
   - `RENDER_SERVICE_ID`: Your Render service ID
   - `VERCEL_TOKEN`: Your Vercel token
   - `VERCEL_ORG_ID`: Your Vercel organization ID
   - `VERCEL_PROJECT_ID`: Your Vercel project ID

### Manual Deployment

#### Backend Deployment to Render

1. Go to [Render](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure environment variables:
   ```
   DATABASE_URL=<your-supabase-url>
   JWT_SECRET=<generate-secure-key>
   FRONTEND_URL=<your-vercel-frontend-url>
   NODE_ENV=production
   ```
5. Set build command: `npm install && npm run prisma:generate && npm run prisma:migrate`
6. Set start command: `npm start`

#### Frontend Deployment to Vercel

1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Configure environment variables:
   ```
   VITE_API_URL=<your-render-backend-url>/api
   VITE_APP_NAME=Agri Fertilizer Shop
   ```
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy

### Supabase Database Setup

1. Create Supabase project
2. Get PostgreSQL connection string
3. Set up storage bucket for PDFs:
   - Create bucket: `invoices`
   - Set to public for PDF access
4. Update backend `.env`:
   ```
   SUPABASE_URL=<your-url>
   SUPABASE_ANON_KEY=<your-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-key>
   ```

## 📝 API Documentation

### Authentication Endpoints

```
POST   /api/auth/register       - Register new user
POST   /api/auth/login          - Login user
GET    /api/auth/profile        - Get user profile
GET    /api/auth/users          - List all users (admin only)
PATCH  /api/auth/users/:id      - Toggle user status (admin only)
```

### Product Endpoints

```
POST   /api/products            - Create product
GET    /api/products            - List products
GET    /api/products/:id        - Get product details
PUT    /api/products/:id        - Update product
DELETE /api/products/:id        - Delete product
```

### Customer Endpoints

```
POST   /api/customers           - Create customer
GET    /api/customers           - List customers
GET    /api/customers/:id       - Get customer details
PUT    /api/customers/:id       - Update customer
DELETE /api/customers/:id       - Delete customer
```

### Invoice Endpoints

```
POST   /api/invoices            - Create invoice
GET    /api/invoices            - List invoices
GET    /api/invoices/:id        - Get invoice details
PATCH  /api/invoices/:id        - Update invoice status
DELETE /api/invoices/:id        - Delete invoice
```

### Payment Endpoints

```
POST   /api/payments            - Record payment
GET    /api/payments            - List payments
GET    /api/customers/:id/credit - Get customer credit info
```

### Report Endpoints

```
GET    /api/dashboard/stats     - Get dashboard statistics
GET    /api/reports/sales       - Get sales report
GET    /api/reports/profit      - Get profit report
```

## 📊 Database Schema

### User
- Email (unique)
- Password (hashed)
- Name
- Role (ADMIN, STAFF)
- Is Active

### Product
- Name, Brand, Category
- NPK Ratio, Batch Number
- Expiry Date
- Purchase Price, Selling Price
- GST Percentage
- Unit, Current Stock, Minimum Stock

### Customer
- Name, Mobile Number (unique)
- Email, Address
- Credit Limit, Total Credit

### Invoice
- Invoice Number (unique)
- Customer Reference
- Items with pricing and GST
- Total Amount, Paid Amount
- Status (PENDING, PAID, PARTIAL, OVERDUE)

### Purchase
- Purchase Number (unique)
- Supplier Reference
- Items with quantities and prices
- Status (PENDING, RECEIVED, COMPLETED)

### Payment
- Invoice Reference
- Customer Reference
- Amount, Date
- Payment Method

## 🎨 Customization

### Change Shop Details

Update in Settings page or modify `backend/prisma/seed.js`:

```javascript
await prisma.settings.create({
  data: {
    shopName: "Your Shop Name",
    shopAddress: "Your Address",
    gstNumber: "Your GST Number",
    // ... other fields
  }
});
```

### Add New Products

Use the Products page UI or seed via:

```javascript
await prisma.product.create({
  data: {
    name: "Product Name",
    npkRatio: "N:P:K:S",
    // ... other fields
  }
});
```

### Customize Invoice Template

Modify `backend/src/utils/pdfGenerator.js` to change PDF layout

## 🔒 Security Features

- ✅ Password hashing with bcryptjs
- ✅ JWT token-based authentication
- ✅ Role-based access control
- ✅ Protected API endpoints
- ✅ CORS configured
- ✅ Input validation
- ✅ SQL injection prevention (via Prisma)

## 📱 Responsive Design

The application is fully responsive:
- Desktop: Full sidebar navigation
- Tablet: Collapsible menu
- Mobile: Touch-friendly interface

## 🌙 Dark Mode

Toggle between light and dark themes using the theme button in the navbar. Preference is saved in localStorage.

## 🐛 Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432

Solution: Ensure PostgreSQL is running
- Linux/Mac: brew services start postgresql
- Windows: Open PostgreSQL service
- Or use Supabase cloud database
```

### API Connection Error
```
Error: Failed to fetch from API

Solution:
1. Ensure backend is running on port 5000
2. Check VITE_API_URL in frontend/.env
3. Check CORS settings in backend/src/index.js
4. Check Frontend URL in backend/.env
```

### PDF Generation Not Working
```
Solution:
1. Ensure PDFKit is installed (npm install pdfkit)
2. Check Supabase credentials
3. Verify storage bucket exists
4. Check file permissions
```

### Prisma Migration Issues
```
Solution:
npm run prisma:generate
npm run prisma:migrate -- --skip-generate
```

## 📞 Support & Contribution

For issues or contributions:
1. Create an issue describing the problem
2. Fork the repository
3. Create a feature branch
4. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🎯 Future Enhancements

- [ ] Kannada language support
- [ ] SMS notifications for low stock
- [ ] Email invoice sending
- [ ] Bulk product import
- [ ] Barcode scanning
- [ ] Inventory forecasting
- [ ] Customer loyalty points
- [ ] Multi-location support
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Express.js Documentation](https://expressjs.com)

## 🙏 Credits

Built with modern web technologies and best practices for Indian business requirements.

---

**Ready to deploy your fertilizer shop online!** 🌾
