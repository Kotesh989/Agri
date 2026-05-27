import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../LoginPage';
import { FarmerPurchaseHistoryPage } from '../FarmerPurchaseHistoryPage';
import { FarmerInvoiceView } from '../FarmerInvoiceView';
import { ReportsPage } from '../ReportsPage';
import api from '../../utils/api';

vi.mock('../../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    requestFarmerOtp: vi.fn(),
    verifyFarmerOtp: vi.fn(),
  }),
}));

vi.mock('../../components/Notification', () => ({
  useNotificationContext: () => ({ addNotification: vi.fn() }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

const renderWithRouter = (ui, initialEntries = ['/']) =>
  render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);

describe('stabilization smoke tests', () => {
  it('login page renders', () => {
    renderWithRouter(<LoginPage />, ['/login']);
    expect(screen.getByText('auth.adminLogin')).toBeInTheDocument();
  });

  it('farmer dashboard store invoices show filters and invoice download button', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: [{
          id: 'inv1',
          invoiceNumber: 'INV-1',
          invoiceDate: '2026-05-01',
          storeName: 'Green Agro',
          products: [{ id: 'p1', productName: 'Urea', quantity: 2 }],
          totalAmount: 500,
          paidAmount: 200,
          balanceDue: 300,
          status: 'PARTIAL',
          pdfUrl: 'https://example.com/inv1.pdf',
        }],
      },
    });

    renderWithRouter(
      <Routes>
        <Route path="/farmer/stores/:storeId/invoices" element={<FarmerPurchaseHistoryPage />} />
      </Routes>,
      ['/farmer/stores/store1/invoices']
    );

    expect(await screen.findByText('Green Agro')).toBeInTheDocument();
    expect(screen.getByLabelText('Start date')).toBeInTheDocument();
    expect(screen.getByLabelText('Payment status')).toBeInTheDocument();
    expect(screen.getByText('Download Invoice')).toBeInTheDocument();
  });

  it('farmer invoice download and WhatsApp buttons exist', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: {
          id: 'inv1',
          invoiceNumber: 'INV-1',
          invoiceDate: '2026-05-01',
          totalAmount: 500,
          paidAmount: 200,
          balanceDue: 300,
          status: 'PARTIAL',
          pdfUrl: 'https://example.com/inv1.pdf',
          items: [{ id: 'i1', productName: 'Urea', quantity: 2, unit: 'Bag', totalAmount: 500 }],
          farmerView: { storeName: 'Green Agro' },
        },
      },
    });

    renderWithRouter(
      <Routes>
        <Route path="/farmer/invoices/:invoiceId" element={<FarmerInvoiceView />} />
      </Routes>,
      ['/farmer/invoices/inv1']
    );

    expect(await screen.findByText('INV-1')).toBeInTheDocument();
    expect(screen.getByText('Download Invoice')).toBeInTheDocument();
    expect(screen.getByText('Share on WhatsApp')).toBeInTheDocument();
  });

  it('reports page tabs render', async () => {
    api.get.mockResolvedValue({ data: { data: [] } });
    renderWithRouter(<ReportsPage />, ['/reports']);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.getAllByText('Sales Report').length).toBeGreaterThan(0);
    expect(screen.getByText('Low-stock Report')).toBeInTheDocument();
    expect(screen.getByText('Expiry Report')).toBeInTheDocument();
  });
});
