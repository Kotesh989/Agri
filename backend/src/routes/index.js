import express from 'express';
import * as authController from '../controllers/authController.js';
import * as productController from '../controllers/productController.js';
import * as customerController from '../controllers/customerController.js';
import * as invoiceController from '../controllers/invoiceController.js';
import * as paymentController from '../controllers/paymentController.js';
import * as supplierController from '../controllers/supplierController.js';
import * as purchaseController from '../controllers/purchaseController.js';
import * as dashboardController from '../controllers/dashboardController.js';
import * as farmerDueController from '../controllers/farmerDueController.js';
import * as aiAssistantController from '../controllers/aiAssistantController.js';
import * as settingsController from '../controllers/settingsController.js';
import * as farmerController from '../controllers/farmerController.js';
import * as storeController from '../controllers/storeController.js';
import * as notificationController from '../controllers/notificationController.js';
import * as uploadController from '../controllers/uploadController.js';
import * as weatherController from '../controllers/weatherController.js';
import * as soilController from '../controllers/soilController.js';
import * as cropDiseaseController from '../controllers/cropDiseaseController.js';
import * as machineryController from '../controllers/machineryController.js';
import * as cropRecommendationController from '../controllers/cropRecommendationController.js';
import { authenticate, authorize, requireStoreAccess } from '../middleware/auth.js';

const router = express.Router();

// ============ AUTH ROUTES ============
router.post('/auth/register', authController.register);
router.post('/auth/register/admin', authController.registerAdmin);
router.post('/auth/register/farmer', authController.registerFarmer);
router.post('/auth/login', authController.login);
router.post('/auth/admin/login', authController.adminLogin);
router.post('/auth/farmer/login', authController.farmerLogin);
router.post('/auth/farmer/otp/request', authController.requestFarmerOtp);
router.post('/auth/farmer/otp/verify', authController.verifyFarmerOtp);
router.post('/auth/logout', authController.logout);
router.post('/auth/password-reset/request', authController.requestPasswordResetOtp);
router.post('/auth/password-reset/confirm', authController.resetPasswordWithOtp);
router.get('/auth/profile', authenticate, authController.getProfile);
router.get('/auth/users', authenticate, authorize('ADMIN'), authController.listUsers);
router.patch('/auth/users/:userId/toggle', authenticate, authorize('ADMIN'), authController.toggleUserStatus);

// ============ PRODUCT ROUTES ============
router.post('/products', authenticate, authorize('ADMIN'), requireStoreAccess, productController.createProduct);
router.get('/products', authenticate, authorize('ADMIN'), requireStoreAccess, productController.listProducts);
router.get('/products/:id', authenticate, authorize('ADMIN'), requireStoreAccess, productController.getProduct);
router.put('/products/:id', authenticate, authorize('ADMIN'), requireStoreAccess, productController.updateProduct);
router.delete('/products/:id', authenticate, authorize('ADMIN'), requireStoreAccess, productController.deleteProduct);

// ============ CUSTOMER ROUTES ============
router.post('/customers', authenticate, authorize('ADMIN'), requireStoreAccess, customerController.createCustomer);
router.get('/customers', authenticate, authorize('ADMIN'), requireStoreAccess, customerController.listCustomers);
router.post('/customers/:id/purchased-items', authenticate, authorize('ADMIN'), requireStoreAccess, customerController.addCustomerPurchasedItem);
router.get('/customers/:id/purchased-items', authenticate, authorize('ADMIN'), requireStoreAccess, customerController.listCustomerPurchasedItems);
router.get('/customer-purchases', authenticate, authorize('ADMIN'), requireStoreAccess, customerController.listAllCustomerPurchasedItems);
router.put('/customers/:id/purchased-items/:itemId', authenticate, authorize('ADMIN'), requireStoreAccess, customerController.updateCustomerPurchasedItem);
router.delete('/customers/:id/purchased-items/:itemId', authenticate, authorize('ADMIN'), requireStoreAccess, customerController.deleteCustomerPurchasedItem);
router.get('/customers/:id/purchases', authenticate, authorize('ADMIN'), requireStoreAccess, customerController.getCustomerPurchaseHistory);
router.get('/customers/:id/spending-summary', authenticate, authorize('ADMIN'), requireStoreAccess, customerController.getCustomerSpendingSummary);
router.get('/customers/:id', authenticate, authorize('ADMIN'), requireStoreAccess, customerController.getCustomer);
router.put('/customers/:id', authenticate, authorize('ADMIN'), requireStoreAccess, customerController.updateCustomer);
router.delete('/customers/:id', authenticate, authorize('ADMIN'), requireStoreAccess, customerController.deleteCustomer);
router.patch('/customers/:id/reset-pending', authenticate, authorize('ADMIN'), requireStoreAccess, customerController.resetCustomerPendingAmount);

// ============ INVOICE ROUTES ============
router.post('/invoices', authenticate, authorize('ADMIN'), requireStoreAccess, invoiceController.createInvoice);
router.get('/invoices', authenticate, authorize('ADMIN'), requireStoreAccess, invoiceController.listInvoices);
router.get('/sales', authenticate, authorize('ADMIN'), requireStoreAccess, invoiceController.listSales);
router.get('/invoices/:id', authenticate, authorize('ADMIN'), requireStoreAccess, invoiceController.getInvoice);
router.patch('/invoices/:id/status', authenticate, authorize('ADMIN'), requireStoreAccess, invoiceController.updateInvoiceStatus);
router.delete('/invoices/:id', authenticate, authorize('ADMIN'), requireStoreAccess, invoiceController.deleteInvoice);

// ============ PAYMENT ROUTES ============
router.post('/payments', authenticate, authorize('ADMIN'), requireStoreAccess, paymentController.recordPayment);
router.get('/payments', authenticate, authorize('ADMIN'), requireStoreAccess, paymentController.listPayments);
router.get('/customers/:customerId/credit', authenticate, authorize('ADMIN'), requireStoreAccess, paymentController.getCustomerCredit);

// ============ AI ASSISTANT ROUTES ============
router.post('/ai/assistant', authenticate, authorize('ADMIN'), requireStoreAccess, aiAssistantController.handleAssistantRequest);

// ============ WEATHER ROUTES ============
router.get('/weather/forecast', authenticate, weatherController.getWeatherAdvisory);

// ============ SOIL HEALTH ROUTES ============
router.post('/soil-health', authenticate, requireStoreAccess, soilController.calculateRecommendations);
router.get('/soil-health/:customerId/history', authenticate, requireStoreAccess, soilController.getCustomerHistory);

// ============ FARMER DUE ROUTES ============
router.post('/farmer-dues', authenticate, authorize('ADMIN'), requireStoreAccess, farmerDueController.createDue);
router.get('/farmer-dues', authenticate, authorize('ADMIN'), requireStoreAccess, farmerDueController.listDues);
router.get('/farmer-dues/summary', authenticate, authorize('ADMIN'), requireStoreAccess, farmerDueController.getDueSummary);
router.get('/farmer-dues/:id', authenticate, authorize('ADMIN'), requireStoreAccess, farmerDueController.getDue);
router.put('/farmer-dues/:id', authenticate, authorize('ADMIN'), requireStoreAccess, farmerDueController.updateDue);
router.post('/farmer-dues/:id/payment', authenticate, authorize('ADMIN'), requireStoreAccess, farmerDueController.recordPayment);
router.post('/farmer-dues/:id/installments', authenticate, authorize('ADMIN'), requireStoreAccess, farmerDueController.saveInstallmentsPlan);
router.post('/farmer-dues/:id/installments/:installmentId/pay', authenticate, authorize('ADMIN'), requireStoreAccess, farmerDueController.payInstallment);
router.delete('/farmer-dues/:id', authenticate, authorize('ADMIN'), requireStoreAccess, farmerDueController.deleteDue);

// ============ MACHINERY RENTAL ROUTES ============
router.get('/machinery', authenticate, machineryController.listMachinery);
router.post('/machinery', authenticate, machineryController.createMachinery);
router.post('/machinery/bookings', authenticate, machineryController.createBooking);
router.patch('/machinery/bookings/:id/status', authenticate, machineryController.updateBookingStatus);
router.get('/machinery/bookings', authenticate, machineryController.listBookings);
router.post('/machinery/bookings/:id/reviews', authenticate, machineryController.addReview);

// ============ CROP RECOMMENDATION ROUTES ============
router.post('/crop-recommendation/analyze', authenticate, cropRecommendationController.analyze);
router.get('/crop-recommendation/crops', authenticate, cropRecommendationController.listCrops);
router.get('/crop-recommendation/markets', authenticate, cropRecommendationController.listMarkets);
router.get('/crop-recommendation/price-history/:cropId', authenticate, cropRecommendationController.priceHistory);
router.get('/crop-recommendation/weather-analysis', authenticate, cropRecommendationController.weatherAnalysis);

// ============ SUPPLIER ROUTES ============
router.post('/suppliers', authenticate, authorize('ADMIN'), requireStoreAccess, supplierController.createSupplier);
router.get('/suppliers', authenticate, authorize('ADMIN'), requireStoreAccess, supplierController.listSuppliers);
router.get('/suppliers/:id', authenticate, authorize('ADMIN'), requireStoreAccess, supplierController.getSupplier);
router.put('/suppliers/:id', authenticate, authorize('ADMIN'), requireStoreAccess, supplierController.updateSupplier);
router.delete('/suppliers/:id', authenticate, authorize('ADMIN'), requireStoreAccess, supplierController.deleteSupplier);

// ============ PURCHASE ROUTES ============
router.post('/purchases', authenticate, authorize('ADMIN'), requireStoreAccess, purchaseController.createPurchase);
router.get('/purchases', authenticate, authorize('ADMIN'), requireStoreAccess, purchaseController.listPurchases);
router.get('/purchases/:id', authenticate, authorize('ADMIN'), requireStoreAccess, purchaseController.getPurchase);
router.put('/purchases/:id', authenticate, authorize('ADMIN'), requireStoreAccess, purchaseController.updatePurchase);
router.patch('/purchases/:id/status', authenticate, authorize('ADMIN'), requireStoreAccess, purchaseController.updatePurchaseStatus);
router.delete('/purchases/:id', authenticate, authorize('ADMIN'), requireStoreAccess, purchaseController.deletePurchase);

// ============ DASHBOARD ROUTES ============
router.get('/dashboard/stats', authenticate, authorize('ADMIN'), requireStoreAccess, dashboardController.getDashboardStats);
router.get('/reports/sales', authenticate, authorize('ADMIN'), requireStoreAccess, dashboardController.getSalesReport);
router.get('/reports/profit', authenticate, authorize('ADMIN'), requireStoreAccess, dashboardController.getProfitReport);
router.get('/reports/purchases', authenticate, authorize('ADMIN'), requireStoreAccess, dashboardController.getPurchasesReport);
router.get('/reports/gst', authenticate, authorize('ADMIN'), requireStoreAccess, dashboardController.getGstReport);
router.get('/reports/stock', authenticate, authorize('ADMIN'), requireStoreAccess, dashboardController.getStockReport);
router.get('/reports/customer-outstanding', authenticate, authorize('ADMIN'), requireStoreAccess, dashboardController.getCustomerOutstandingReport);

// ============ SETTINGS ROUTES ============
router.get('/settings', authenticate, authorize('ADMIN'), requireStoreAccess, settingsController.getSettings);
router.put('/settings', authenticate, authorize('ADMIN'), requireStoreAccess, settingsController.updateSettings);

// ============ STORE ROUTES ============
router.post('/stores', authenticate, authorize('ADMIN'), storeController.createStore);
router.get('/stores', authenticate, authorize('ADMIN'), storeController.listAdminStores);

// ============ FARMER ROUTES ============
router.get('/farmer/dashboard', authenticate, authorize('FARMER'), farmerController.getDashboard);
router.get('/farmer/stores', authenticate, authorize('FARMER'), farmerController.listShops);
router.get('/farmer/stores/:storeId/invoices', authenticate, authorize('FARMER'), farmerController.listShopInvoices);
router.get('/farmer/stores/:storeId/products', authenticate, authorize('FARMER'), farmerController.listShopProducts);
router.get('/farmer/shops', authenticate, authorize('FARMER'), farmerController.listShops);
router.get('/farmer/shops/:storeId/invoices', authenticate, authorize('FARMER'), farmerController.listShopInvoices);
router.get('/farmer/shops/:storeId/products', authenticate, authorize('FARMER'), farmerController.listShopProducts);
router.get('/farmer/invoices', authenticate, authorize('FARMER'), farmerController.listInvoices);
router.get('/farmer/invoices/:invoiceId', authenticate, authorize('FARMER'), farmerController.getInvoice);
router.get('/farmer/purchases', authenticate, authorize('FARMER'), requireStoreAccess, farmerController.listPurchases);
router.get('/farmer/credit', authenticate, authorize('FARMER'), requireStoreAccess, farmerController.getCredit);
router.post('/farmer/stores/:storeId/switch', authenticate, authorize('FARMER'), storeController.switchFarmerStore);
router.get('/farmer/catalog', authenticate, authorize('FARMER'), requireStoreAccess, farmerController.listCatalog);
router.post('/farmer/catalog/:productId/wishlist', authenticate, authorize('FARMER'), requireStoreAccess, farmerController.toggleWishlist);
router.post('/farmer/catalog/:productId/availability', authenticate, authorize('FARMER'), requireStoreAccess, farmerController.requestAvailability);

// ============ NOTIFICATION ROUTES ============
router.get('/notifications', authenticate, requireStoreAccess, notificationController.listNotifications);
router.patch('/notifications/:id/read', authenticate, requireStoreAccess, notificationController.markNotificationRead);
router.post('/uploads/signed-url', authenticate, requireStoreAccess, uploadController.createUploadUrl);

export default router;
