# Quick Start Guide

Get the Agri Fertilizer Shop Management System running in 5 minutes!

## 🚀 Fastest Setup (Using Docker)

### Prerequisites
- Docker and Docker Compose installed
- Git installed

### Steps

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd Agri
   ```

2. **Start Services**
   ```bash
   docker-compose up -d
   ```

3. **Wait for Setup** (2-3 minutes)
   - Database initialization
   - Backend startup
   - Frontend build

4. **Access Application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5000
   - Database: localhost:5432

5. **Login**
   ```
   Email: admin@fertilizershop.com
   Password: Admin@123
   ```

That's it! Your system is running! 🎉

## 💻 Local Setup (Without Docker)

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure database in .env
# DATABASE_URL=postgresql://user:password@localhost:5432/agri_fertilizer

# Setup database
npm run prisma:migrate
npm run prisma:seed

# Start backend
npm run dev
```

Backend runs at: `http://localhost:5000`

### Frontend Setup (New Terminal)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Make sure VITE_API_URL=http://localhost:5000/api

# Start frontend
npm run dev
```

Frontend runs at: `http://localhost:5173`

## 📱 First Steps After Login

1. **Update Shop Settings**
   - Go to Settings
   - Add your shop name, address, GST number
   - Configure invoice prefix

2. **Add Products**
   - Go to Products
   - Click "New Product"
   - Add your fertilizer products (pre-filled with samples)

3. **Add Customers**
   - Go to Customers
   - Click "New Customer"
   - Add your customers

4. **Create First Invoice**
   - Go to Sales/Invoices
   - Click "New Invoice"
   - Select customer and products
   - PDF automatically generated!

5. **View Dashboard**
   - Go to Dashboard
   - See real-time statistics
   - Monitor stock levels

## 🔗 Important URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| API Documentation | http://localhost:5000/api |
| Database | localhost:5432 |
| Adminer (DB UI) | http://localhost:8080 |

## 🆘 Common Issues

### Port Already in Use
```bash
# Kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Database Connection Error
```bash
# Ensure PostgreSQL is running
psql -U postgres

# Or use Supabase instead
# Update DATABASE_URL to Supabase connection string
```

### Permissions Error
```bash
# Linux/Mac
sudo chown -R $USER:$USER .

# Windows
icacls . /grant %USERNAME%:F /T
```

## 📚 Default Data

After seeding, you have:

**Products:**
- Urea (46:0:0)
- DAP (18:46:0)
- MOP (0:0:60)
- NPK (20:20:0:13)
- Potassium Chloride (0:0:50)
- Ammonium Sulfate (21:0:0:24)

**Supplier:**
- National Fertilizer Limited

**Shop Settings:**
- Name: Agri Fertilizer Shop
- Location: Bangalore, Karnataka
- GST: 29AAPCP1234H1Z5

## 🎯 What to Try Next

1. **Create a Sample Invoice**
   - Add a customer
   - Select products
   - Set payment method
   - Download PDF

2. **Check Reports**
   - View daily sales
   - Check profit margins
   - Analyze trends

3. **Manage Stock**
   - Add low stock items
   - See alerts
   - Plan purchases

4. **Add More Users**
   - Create staff accounts
   - Set different roles
   - Track transactions

## 🚀 Deploy to Production

When ready to go live:

```bash
# See DEPLOYMENT_GUIDE.md for complete instructions
```

Quick summary:
1. Set up Supabase database
2. Deploy backend to Render
3. Deploy frontend to Vercel
4. Update environment variables
5. Run database migrations

## 💡 Tips

- **Search**: Use search bars in Products, Customers, Invoices
- **Dark Mode**: Toggle in top-right corner
- **Export**: PDFs auto-generate for all invoices
- **Mobile**: Fully responsive - works on phones too!

## 📞 Need Help?

- Check README.md for detailed documentation
- See DEPLOYMENT_GUIDE.md for production setup
- Review API documentation in backend

## 🎉 You're Ready!

Your fertilizer shop management system is ready to use. Start adding your data and automate your business! 🌾

---

**Happy selling!** 📊
