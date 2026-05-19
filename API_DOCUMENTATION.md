# API Documentation

Complete API reference for the Agri Fertilizer Shop Management System.

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-backend-url/api
```

## Authentication

All endpoints (except login/register) require JWT token in header:

```
Authorization: Bearer <token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": {}
}
```

## HTTP Status Codes

- `200 OK`: Successful GET request
- `201 Created`: Successful POST request
- `204 No Content`: Successful DELETE request
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Server Error`: Internal server error

---

## Authentication API

### Register User

**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "User Name",
  "role": "STAFF"  // Optional: ADMIN or STAFF
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "role": "STAFF"
    },
    "token": "jwt_token"
  }
}
```

---

### Login

**POST** `/auth/login`

Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "admin@fertilizershop.com",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "admin@fertilizershop.com",
      "name": "Admin User",
      "role": "ADMIN"
    },
    "token": "jwt_token"
  }
}
```

---

### Get Profile

**GET** `/auth/profile`

Get current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "admin@fertilizershop.com",
    "name": "Admin User",
    "role": "ADMIN",
    "isActive": true
  }
}
```

---

## Product API

### Create Product

**POST** `/products`

**Authentication:** Required (ADMIN, STAFF)

**Request Body:**
```json
{
  "name": "Urea",
  "brand": "National Fertilizer",
  "category": "Nitrogenous",
  "npkRatio": "46:0:0",
  "batchNumber": "UREA001",
  "expiryDate": "2026-12-31",
  "purchasePrice": 250,
  "sellingPrice": 300,
  "gstPercentage": 5,
  "unit": "kg",
  "currentStock": 500,
  "minimumStock": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "product_id",
    "name": "Urea",
    "brand": "National Fertilizer",
    ...
  }
}
```

---

### List Products

**GET** `/products`

**Query Parameters:**
- `search` (optional): Search by name, brand, NPK ratio
- `category` (optional): Filter by category
- `brand` (optional): Filter by brand

**Example:**
```
GET /products?search=Urea&category=Nitrogenous
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "product_id",
      "name": "Urea",
      ...
    }
  ]
}
```

---

### Get Product

**GET** `/products/:id`

Get specific product details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "product_id",
    "name": "Urea",
    ...
  }
}
```

---

### Update Product

**PUT** `/products/:id`

**Request Body:** (Same as create, only changed fields)

---

### Delete Product

**DELETE** `/products/:id`

---

## Customer API

### Create Customer

**POST** `/customers`

**Request Body:**
```json
{
  "name": "Customer Name",
  "mobileNumber": "9876543210",
  "email": "customer@example.com",
  "address": "123 Market Street",
  "city": "Bangalore",
  "state": "Karnataka",
  "pinCode": "560001",
  "creditLimit": 50000
}
```

---

### List Customers

**GET** `/customers`

**Query Parameters:**
- `search`: Search by name or phone

---

### Get Customer

**GET** `/customers/:id`

Includes invoices and payments.

---

### Update Customer

**PUT** `/customers/:id`

---

### Delete Customer

**DELETE** `/customers/:id`

---

## Invoice API

### Create Invoice

**POST** `/invoices`

**Request Body:**
```json
{
  "customerId": "customer_id",
  "items": [
    {
      "productId": "product_id",
      "quantity": 10,
      "unitPrice": 300,
      "gstPercentage": 5
    }
  ],
  "paymentMethod": "CASH",
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "invoice_id",
    "invoiceNumber": "INV-1234567890",
    "customerId": "customer_id",
    "totalAmount": 3150,
    "paidAmount": 3150,
    "status": "PAID",
    "pdfUrl": "https://..."
  }
}
```

---

### List Invoices

**GET** `/invoices`

**Query Parameters:**
- `customerId`: Filter by customer
- `status`: Filter by status (PENDING, PAID, PARTIAL, OVERDUE)
- `startDate`: Date range start (YYYY-MM-DD)
- `endDate`: Date range end (YYYY-MM-DD)

---

### Get Invoice

**GET** `/invoices/:id`

Includes customer and all line items.

---

### Update Invoice Status

**PATCH** `/invoices/:id/status`

**Request Body:**
```json
{
  "status": "PAID"
}
```

---

### Delete Invoice

**DELETE** `/invoices/:id`

Reverts stock changes automatically.

---

## Payment API

### Record Payment

**POST** `/payments`

**Request Body:**
```json
{
  "invoiceId": "invoice_id",  // Optional
  "customerId": "customer_id",
  "amount": 5000,
  "paymentMethod": "CASH",  // CASH, CHEQUE, TRANSFER
  "referenceNumber": "CHQ001",  // Optional
  "notes": "Optional notes"
}
```

---

### List Payments

**GET** `/payments`

**Query Parameters:**
- `customerId`: Filter by customer
- `invoiceId`: Filter by invoice
- `startDate`: Date range start
- `endDate`: Date range end

---

### Get Customer Credit

**GET** `/customers/:customerId/credit`

Get customer's credit limit and due amount.

**Response:**
```json
{
  "success": true,
  "data": {
    "customerId": "customer_id",
    "customerName": "Customer Name",
    "creditLimit": 50000,
    "totalCredit": 15000,
    "totalDue": 10000,
    "invoicesPending": 2
  }
}
```

---

## Supplier API

### Create Supplier

**POST** `/suppliers`

**Request Body:**
```json
{
  "name": "Supplier Name",
  "contactPerson": "Contact Name",
  "mobileNumber": "9876543210",
  "email": "supplier@example.com",
  "address": "Supplier Address",
  "city": "Delhi",
  "state": "Delhi",
  "pinCode": "110001",
  "gstNumber": "29AAPCP1234H1Z5"
}
```

---

### List Suppliers

**GET** `/suppliers`

**Query Parameters:**
- `search`: Search by name or email

---

### Get Supplier

**GET** `/suppliers/:id`

Includes purchase history.

---

### Update Supplier

**PUT** `/suppliers/:id`

---

### Delete Supplier

**DELETE** `/suppliers/:id`

---

## Purchase API

### Create Purchase

**POST** `/purchases`

**Request Body:**
```json
{
  "supplierId": "supplier_id",
  "purchaseDate": "2024-01-15",
  "deliveryDate": "2024-01-20",  // Optional
  "items": [
    {
      "productId": "product_id",
      "quantity": 100,
      "unitPrice": 250
    }
  ],
  "notes": "Optional notes"
}
```

**Note:** Stock is NOT updated until status changes to RECEIVED.

---

### List Purchases

**GET** `/purchases`

**Query Parameters:**
- `supplierId`: Filter by supplier
- `status`: Filter by status (PENDING, RECEIVED, COMPLETED)
- `startDate`: Date range start
- `endDate`: Date range end

---

### Get Purchase

**GET** `/purchases/:id`

---

### Update Purchase Status

**PATCH** `/purchases/:id/status`

**Request Body:**
```json
{
  "status": "RECEIVED"
}
```

**Note:** Changing to RECEIVED will update product stock.

---

### Delete Purchase

**DELETE** `/purchases/:id`

---

## Dashboard API

### Get Dashboard Stats

**GET** `/dashboard/stats`

Get real-time dashboard statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProducts": 100,
    "lowStockProducts": 5,
    "totalCustomers": 50,
    "todaySales": 25000,
    "monthlySales": 500000,
    "pendingInvoices": 3,
    "totalDue": 50000,
    "expiringProducts": 2
  }
}
```

---

## Reports API

### Get Sales Report

**GET** `/reports/sales`

**Query Parameters:**
- `groupBy`: daily or monthly
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "totalInvoices": 10,
      "totalAmount": 50000,
      "totalItems": 100
    }
  ]
}
```

---

### Get Profit Report

**GET** `/reports/profit`

**Query Parameters:**
- `startDate`: Start date
- `endDate`: End date

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": "500000.00",
    "totalCost": "350000.00",
    "profit": "150000.00",
    "profitMargin": "30.00%"
  }
}
```

---

## Settings API

### Get Settings

**GET** `/settings`

Get shop settings.

---

### Update Settings

**PUT** `/settings`

**Authentication:** Required (ADMIN only)

**Request Body:**
```json
{
  "shopName": "Agri Fertilizer Shop",
  "shopAddress": "123 Market Street",
  "shopCity": "Bangalore",
  "shopState": "Karnataka",
  "shopPinCode": "560001",
  "shopPhone": "+91-80-12345678",
  "shopEmail": "info@shop.com",
  "gstNumber": "29AAPCP1234H1Z5",
  "invoicePrefix": "INV",
  "receiptPrefix": "RCP",
  "currencySymbol": "₹",
  "expiryAlertDays": 30
}
```

---

## Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Include valid JWT token |
| 403 | Forbidden | Check user role/permissions |
| 404 | Not Found | Check resource ID |
| 409 | Conflict | Resource already exists |
| 500 | Server Error | Contact support |

---

## Rate Limiting

Currently no rate limiting. Consider implementing for production:
- 100 requests per minute per IP
- 1000 requests per hour per user

---

## Pagination

To implement pagination, add query params:

```
GET /products?page=1&limit=10
```

Currently returns all results.

---

## Webhooks

Webhooks not currently implemented. Consider adding for:
- Invoice created
- Payment received
- Stock low alert
- Product expiring

---

## Testing

### Using cURL

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fertilizershop.com","password":"Admin@123"}'

# Get products with token
curl -X GET http://localhost:5000/api/products \
  -H "Authorization: Bearer <token>"
```

### Using Postman

1. Import endpoints
2. Set token in Authorization tab
3. Set BASE_URL variable
4. Run requests

### Using ThunderClient (VS Code)

Install ThunderClient extension in VS Code for easy API testing.

---

## Support

For API issues:
1. Check error response message
2. Verify request format
3. Check authentication token
4. Review database logs
5. Contact support

---

Happy coding! 🚀
