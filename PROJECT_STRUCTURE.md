# Project Structure Overview

```
Agri/
│
├── 📁 backend/                     # Node.js + Express Backend
│   ├── 📁 src/
│   │   ├── 📁 controllers/         # Request handlers
│   │   │   ├── authController.js
│   │   │   ├── productController.js
│   │   │   ├── customerController.js
│   │   │   ├── invoiceController.js
│   │   │   ├── paymentController.js
│   │   │   ├── supplierController.js
│   │   │   ├── purchaseController.js
│   │   │   ├── dashboardController.js
│   │   │   └── settingsController.js
│   │   │
│   │   ├── 📁 middleware/         # Custom middleware
│   │   │   ├── auth.js            # JWT authentication
│   │   │   └── errorHandler.js    # Error handling
│   │   │
│   │   ├── 📁 routes/             # API routes
│   │   │   └── index.js           # All routes
│   │   │
│   │   ├── 📁 utils/              # Utility functions
│   │   │   ├── api.js
│   │   │   ├── jwt.js             # Token management
│   │   │   ├── password.js        # Password hashing
│   │   │   ├── pdfGenerator.js    # PDF creation
│   │   │   └── supabase.js        # Storage handling
│   │   │
│   │   └── index.js               # Main Express app
│   │
│   ├── 📁 prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── seed.js                # Seed data script
│   │
│   ├── .env.example               # Environment template
│   ├── package.json               # Backend dependencies
│   └── render.yaml                # Render deployment config
│
├── 📁 frontend/                    # React + Vite Frontend
│   ├── 📁 src/
│   │   ├── 📁 components/         # Reusable React components
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Notification.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── StatCard.jsx
│   │   │
│   │   ├── 📁 pages/              # Page components
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ProductsPage.jsx
│   │   │   ├── CustomersPage.jsx
│   │   │   ├── InvoicesPage.jsx
│   │   │   ├── PurchasesPage.jsx
│   │   │   ├── PaymentsPage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   └── index.js           # Page exports
│   │   │
│   │   ├── 📁 context/            # React context
│   │   │   ├── AuthContext.jsx    # Authentication state
│   │   │   └── ThemeContext.jsx   # Dark/Light mode
│   │   │
│   │   ├── 📁 hooks/              # Custom React hooks
│   │   │   ├── useFetch.js        # Data fetching hook
│   │   │   └── useNotification.js # Notification hook
│   │   │
│   │   ├── 📁 utils/              # Utility functions
│   │   │   ├── api.js             # Axios instance
│   │   │   └── helpers.js         # Helper functions
│   │   │
│   │   ├── App.jsx                # Main app component
│   │   ├── main.jsx               # Entry point
│   │   └── index.css              # Global styles
│   │
│   ├── 📁 public/                 # Static assets
│   ├── index.html                 # HTML template
│   ├── .env.example               # Environment template
│   ├── vite.config.js             # Vite configuration
│   ├── tailwind.config.js         # Tailwind CSS config
│   ├── postcss.config.js          # PostCSS configuration
│   ├── vercel.json                # Vercel deployment config
│   └── package.json               # Frontend dependencies
│
├── 📁 .github/
│   └── 📁 workflows/              # GitHub Actions CI/CD
│       ├── deploy-backend.yml
│       └── deploy-frontend.yml
│
├── 📄 README.md                   # Project documentation
├── 📄 QUICK_START.md              # Quick start guide
├── 📄 DEPLOYMENT_GUIDE.md         # Deployment instructions
├── 📄 CONTRIBUTING.md             # Contributing guidelines
├── 📄 PROJECT_STRUCTURE.md        # This file
├── .gitignore                     # Git ignore file
├── docker-compose.yml             # Docker compose setup
├── Dockerfile.backend             # Backend Docker image
├── Dockerfile.frontend            # Frontend Docker image
└── LICENSE                        # MIT License

```

## File Descriptions

### Backend Files

**src/controllers/**
- Handle business logic and API responses
- Each module has its own controller
- No direct database queries (use Prisma)

**src/middleware/**
- `auth.js`: JWT authentication and authorization
- `errorHandler.js`: Global error handling

**src/routes/index.js**
- All API route definitions
- Protected and public routes
- Role-based access control

**src/utils/**
- `jwt.js`: Token generation and verification
- `password.js`: Password hashing and comparison
- `pdfGenerator.js`: PDF invoice creation
- `supabase.js`: File storage operations

**prisma/schema.prisma**
- Complete database schema definition
- All models and relationships
- Enums for status fields

### Frontend Files

**src/components/**
- Reusable React components
- Layout components (Navbar, Sidebar)
- UI components (Modal, StatCard)

**src/pages/**
- Full page components for routes
- Manage state for each page
- API calls for data fetching

**src/context/**
- Global state management
- Authentication state
- Theme preferences

**src/hooks/**
- Custom React hooks
- `useFetch`: API data fetching
- `useNotification`: Toast notifications

**src/utils/**
- `api.js`: Axios configuration with interceptors
- `helpers.js`: Formatting and validation functions

## Database Schema

### User
- Email, password, name
- Role (ADMIN, STAFF)
- Active status

### Product
- NPK ratio, batch number, expiry date
- Purchase & selling prices
- Stock levels with minimums

### Customer
- Contact information
- Credit limit and tracking
- Address details

### Invoice
- Items with individual GST calculation
- Multiple payment statuses
- PDF URL storage

### Purchase
- Supplier reference
- Item quantities and prices
- Status tracking

### Payment
- Customer & invoice links
- Payment method tracking
- Amount and date

### Supplier
- Contact information
- GST number
- Address details

### Settings
- Shop configuration
- GST rates
- Invoice prefixes

### StockAlert
- Low stock alerts
- Expiry notifications
- Alert resolution tracking

## Key Features Implementation

### Authentication
- Backend: JWT tokens with expiration
- Frontend: Token storage in localStorage
- Automatic redirect on expiration

### PDF Generation
- PDFKit library for server-side generation
- Supabase Storage for file hosting
- Automatic invoice number and formatting

### Real-time Stock Updates
- Stock deducted on invoice creation
- Stock added on purchase receipt
- Minimum stock alerts configured

### Reports
- Sales analysis by date range
- Profit calculation with margins
- Customer-wise transactions

### Dark Mode
- CSS class toggle
- localStorage persistence
- Tailwind CSS support

## Deployment Architecture

```
User Browser
    │
    ├─────────────────────────────────┐
    │                                  │
    ▼                                  ▼
Vercel Frontend              Render Backend
(React + Vite)               (Node + Express)
    │                              │
    │                              ▼
    │                        Supabase
    │                    (PostgreSQL + Storage)
    │                              │
    └──────────────────────────────┘
              HTTPS
```

## API Architecture

```
/api
├── /auth
│   ├── POST /register
│   ├── POST /login
│   ├── GET /profile
│   ├── GET /users
│   └── PATCH /users/:id
├── /products
│   ├── POST
│   ├── GET
│   ├── GET /:id
│   ├── PUT /:id
│   └── DELETE /:id
├── /customers
│   ├── POST
│   ├── GET
│   ├── GET /:id
│   ├── PUT /:id
│   └── DELETE /:id
├── /invoices
│   ├── POST
│   ├── GET
│   ├── GET /:id
│   ├── PATCH /:id
│   └── DELETE /:id
├── /payments
│   ├── POST
│   ├── GET
│   └── GET /customers/:id/credit
├── /suppliers
│   ├── POST
│   ├── GET
│   ├── GET /:id
│   ├── PUT /:id
│   └── DELETE /:id
├── /purchases
│   ├── POST
│   ├── GET
│   ├── GET /:id
│   ├── PATCH /:id
│   └── DELETE /:id
├── /dashboard
│   └── GET /stats
├── /reports
│   ├── GET /sales
│   └── GET /profit
└── /settings
    ├── GET
    └── PUT
```

## Development Workflow

1. **Local Development**
   - Backend runs on http://localhost:5000
   - Frontend runs on http://localhost:5173
   - Database on localhost:5432

2. **Testing**
   - Create test data via UI
   - Test all CRUD operations
   - Verify PDF generation

3. **Deployment**
   - Push to GitHub
   - CI/CD triggers automatically
   - Tests run on Vercel/Render

4. **Monitoring**
   - Check logs on deployment platform
   - Monitor database performance
   - Track error rates

## Environment Variables

### Backend (.env)
```
DATABASE_URL=...
JWT_SECRET=...
FRONTEND_URL=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PORT=5000
NODE_ENV=development
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Agri Fertilizer Shop
```

## Build & Deployment

**Frontend:**
- Vite builds to `dist/` folder
- Minified and optimized
- Deployed to Vercel CDN

**Backend:**
- Docker containerized
- Environment-based configuration
- Auto-deploying on Render

## Performance Optimizations

- Lazy loading components
- Image optimization
- Database query optimization
- Caching strategies
- CDN for static assets

## Security Features

- Password hashing with bcryptjs
- JWT token validation
- CORS configuration
- Input validation
- SQL injection prevention
- XSS protection

---

This structure keeps code organized, maintainable, and scalable for future growth! 🚀
