import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { StatCard } from '../components/StatCard';
import api from '../utils/api';
import { ArrowRight, CreditCard, Download, FileText, Landmark, Package, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils/helpers';
import { FarmerMobileNav } from '../components/FarmerMobileNav';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { WeatherWidget } from '../components/WeatherWidget';

const money = (value) => formatCurrency(value);
const date = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '-');
const displayStoreName = (store) => store?.storeName || store?.companyName || store?.shopName || store?.name || 'Unknown Store';

export const FarmerDashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [shops, setShops] = useState([]);
  const { t } = useTranslation();

  useEffect(() => {
    Promise.all([
      api.get('/farmer/dashboard'),
      api.get('/farmer/invoices'),
      api.get('/farmer/stores'),
    ]).then(([dashboardResponse, invoiceResponse, shopsResponse]) => {
      setDashboard(dashboardResponse.data.data);
      setInvoices(invoiceResponse.data.data || []);
      setShops(shopsResponse.data.data || []);
    });
  }, []);

  const totals = useMemo(() => ({
    total: invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0),
    paid: invoices.reduce((sum, invoice) => sum + Number(invoice.amountPaid || invoice.paidAmount || 0), 0),
    balance: invoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0),
  }), [invoices]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-3xl p-6 text-slate-800 dark:text-white mb-8 border border-white/40 dark:border-white/5" style={{ backgroundColor: 'var(--neo-card)', boxShadow: 'var(--shadow-out)' }}>
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-emerald-500/5 blur-2xl" />
            <div className="absolute left-1/3 bottom-0 translate-y-12 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                  Farmer Hub
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold mt-4 tracking-tight" style={{ color: 'var(--neo-text)' }}>
                  Welcome to {t('app.name')}
                </h1>
                <p className="mt-2 text-slate-500 dark:text-gray-400 text-sm max-w-xl font-medium">
                  Review credit dues, analyze weather forecasts for spraying, and lease community machineries.
                </p>
              </div>

              {/* Quick Actions Panel */}
              <div className="flex flex-wrap gap-3">
                <Link 
                  to="/farmer/stores" 
                  className="btn btn-primary text-xs"
                >
                  Browse Shops
                </Link>
                <Link 
                  to="/machinery" 
                  className="btn btn-secondary text-xs"
                >
                  Machinery Hub
                </Link>
              </div>
            </div>
          </div>

          {!dashboard && <LoadingSkeleton rows={4} />}

          {dashboard && <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard title="Invoices" value={dashboard?.totalInvoices || 0} icon={FileText} color="blue" />
            <StatCard title="Shops" value={dashboard?.shopCount || 0} icon={Landmark} color="emerald" />
            <StatCard title="Total Purchased" value={money(totals.total)} icon={Wallet} color="emerald" />
            <StatCard title="Paid" value={money(totals.paid)} icon={CreditCard} color="blue" />
            <StatCard title="Balance" value={money(totals.balance)} icon={CreditCard} color="red" />
          </div>}

          <div className="mb-6">
            <WeatherWidget />
          </div>

          <div id="stores" className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold">Shops visited</h2>
              <Link to="/farmer/stores" className="text-sm font-semibold text-emerald-700">View all</Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shops.slice(0, 3).map((shop) => (
                <article key={shop.storeId} className="card bg-gradient-to-br from-white to-emerald-50/70 dark:from-[#151d19] dark:to-emerald-950/20">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold">{displayStoreName(shop)}</h3>
                      <p className="text-sm text-slate-500">{shop.ownerName || shop.phone || '-'}</p>
                      {shop.isNear && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="badge badge-green text-[9px] px-1 py-0.5 font-bold uppercase tracking-wider">Near You</span>
                          {shop.matchType === 'village' && <span className="badge badge-blue text-[9px] px-1 py-0.5 font-bold uppercase tracking-wider">Same Village</span>}
                          {shop.matchType === 'taluk' && <span className="badge badge-blue text-[9px] px-1 py-0.5 font-bold uppercase tracking-wider">Same Taluk</span>}
                          {shop.matchType === 'district' && <span className="badge badge-blue text-[9px] px-1 py-0.5 font-bold uppercase tracking-wider">Same District</span>}
                          {shop.matchType === 'state' && <span className="badge badge-blue text-[9px] px-1 py-0.5 font-bold uppercase tracking-wider">Same State</span>}
                        </div>
                      )}
                    </div>
                    <span className="badge badge-green">{shop.totalInvoices} invoices</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-slate-500">Spent</p><p className="font-bold">{money(shop.totalAmountSpent)}</p></div>
                    <div><p className="text-slate-500">Pending</p><p className="font-bold text-rose-600">{money(shop.pendingBalance)}</p></div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Link to={`/farmer/stores/${shop.storeId}/invoices`} className="btn btn-primary justify-center">
                      <FileText className="h-4 w-4" />
                      Purchases
                    </Link>
                    <Link to={`/farmer/stores/${shop.storeId}/products`} className="btn btn-secondary justify-center">
                      <Package className="h-4 w-4" />
                      Stock
                    </Link>
                  </div>
                </article>
              ))}
              {dashboard && shops.length === 0 && <div className="col-span-full"><EmptyState title="No shops yet" message="Your shops will appear after an invoice is linked to your mobile number." /></div>}
            </div>
          </div>

          <div id="purchases" className="card overflow-x-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Recent invoices</h2>
              <Link to="/farmer/stores" className="flex items-center gap-1 text-sm font-semibold text-emerald-700">Choose shop <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <table className="table min-w-[980px]">
              <thead>
                <tr>
                  <th>{t('common.date')}</th>
                  <th>Shop Name</th>
                  <th>Invoice Number</th>
                  <th>Items</th>
                  <th>{t('common.total')}</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Download Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{date(invoice.invoiceDate)}</td>
                    <td>
                      <div className="font-medium">{displayStoreName(invoice)}</div>
                      <div className="text-xs text-slate-500">{invoice.adminName || '-'}</div>
                    </td>
                    <td>{invoice.invoiceNumber}</td>
                    <td>{(invoice.products || []).map((item) => item.productName).join(', ') || '-'}</td>
                    <td>{money(invoice.totalAmount)}</td>
                    <td>{money(invoice.amountPaid || invoice.paidAmount)}</td>
                    <td>{money(invoice.balanceDue)}</td>
                    <td><span className="badge badge-green">{invoice.status}</span></td>
                    <td>
                      {invoice.pdfUrl ? (
                        <a className="btn btn-secondary btn-sm" href={invoice.pdfUrl} target="_blank" rel="noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && <tr><td colSpan="9"><EmptyState title="No invoices yet" message="Invoices from every shop will appear here after purchase." /></td></tr>}
              </tbody>
            </table>
          </div>
        </main>
      </div>
      <FarmerMobileNav />
    </div>
  );
};
