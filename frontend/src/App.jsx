import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './components/Notification';
import { ConfirmProvider } from './components/ConfirmProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { VoiceAssistant } from './components/VoiceAssistant';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { FarmerDuesPage } from './pages/FarmerDuesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SalesPage } from './pages/SalesPage';
import { SoilHealthPage } from './pages/SoilHealthPage';
import { CropAdvisorPage } from './pages/CropAdvisorPage';
import { InstallmentPlannerPage } from './pages/InstallmentPlannerPage';
import { MachineryHubPage } from './pages/MachineryHubPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { FarmerDashboardPage } from './pages/FarmerDashboardPage';
import { FarmerCatalogPage } from './pages/FarmerCatalogPage';
import { FarmerShopsPage } from './pages/FarmerShopsPage';
import { FarmerShopProductsPage } from './pages/FarmerShopProductsPage';
import { FarmerPurchaseHistoryPage } from './pages/FarmerPurchaseHistoryPage';
import { FarmerInvoiceView } from './pages/FarmerInvoiceView';
import { RegisterPage } from './pages/RegisterPage';
import { PasswordResetPage } from './pages/PasswordResetPage';

import './index.css';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <ConfirmProvider>
              <ErrorBoundary>
                <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register/:type" element={<RegisterPage />} />
              <Route path="/password-reset" element={<PasswordResetPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <ProductsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/store-inventory"
                element={<Navigate to="/products" replace />}
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <CustomersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <InvoicesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/purchases"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <PurchasesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payments"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <PaymentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer-dues"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <FarmerDuesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/soil-health"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <SoilHealthPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/crop-advisor"
                element={
                  <ProtectedRoute roles={['ADMIN', 'FARMER']}>
                    <CropAdvisorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/installment-planner"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <InstallmentPlannerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/machinery"
                element={
                  <ProtectedRoute roles={['ADMIN', 'FARMER']}>
                    <MachineryHubPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <SalesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/suppliers"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <SuppliersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/dashboard"
                element={
                  <ProtectedRoute roles={['FARMER']}>
                    <FarmerDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer-catalog"
                element={
                  <ProtectedRoute roles={['FARMER']}>
                    <FarmerCatalogPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/stores"
                element={
                  <ProtectedRoute roles={['FARMER']}>
                    <FarmerShopsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/stores/:storeId/products"
                element={
                  <ProtectedRoute roles={['FARMER']}>
                    <FarmerShopProductsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/invoices/:invoiceId"
                element={
                  <ProtectedRoute roles={['FARMER']}>
                    <FarmerInvoiceView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/stores/:storeId/invoices"
                element={
                  <ProtectedRoute roles={['FARMER']}>
                    <FarmerPurchaseHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/farmer-dashboard" element={<Navigate to="/farmer/dashboard" replace />} />
              <Route path="/farmer-shops" element={<Navigate to="/farmer/stores" replace />} />
              <Route path="/farmer-shops/:storeId/products" element={<Navigate to="/farmer/stores/:storeId/products" replace />} />
              <Route path="/farmer-shops/:storeId/purchases" element={<Navigate to="/farmer/stores/:storeId/invoices" replace />} />
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
              <VoiceAssistant />
          </ErrorBoundary>
          </ConfirmProvider>
        </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
