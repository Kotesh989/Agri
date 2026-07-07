import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { StatCard } from '../components/StatCard';
import { AlertTriangle, BarChart3, DollarSign, FlaskConical, Package, TrendingUp, Users, WalletCards } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils/helpers';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, Legend, LinearScale, LineElement, PointElement, Tooltip);

const money = (value) => formatCurrency(value);

import { WeatherWidget } from '../components/WeatherWidget';

export const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">{t('common.loading')}</div>;
  }

  const fertilizerSales = Number(stats?.fertilizerSales || 0);
  const pesticideSales = Number(stats?.pesticideSales || 0);
  const farmerDueSummary = stats?.farmerDueSummary || {};
  const salesMixTotal = Math.max(fertilizerSales + pesticideSales, 1);
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          {/* Welcome Banner */}
          <div className="card relative overflow-hidden mb-8">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-emerald-500/5 blur-2xl" />
            <div className="absolute left-1/3 bottom-0 translate-y-12 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-left">
                <span className="bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                  Admin Dashboard
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold mt-4 tracking-tight">
                  Welcome to {t('app.name')}
                </h1>
                <p className="mt-2 text-slate-500 dark:text-gray-400 text-sm max-w-xl font-medium">
                  Monitor live inventory, farmer credit ledger records, and coordinate machineries seamlessly.
                </p>
              </div>

              {/* Quick Actions Panel */}
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => navigate('/sales')} 
                  className="btn btn-primary text-xs"
                >
                  + New Sale
                </button>
                <button 
                  onClick={() => navigate('/soil-health')} 
                  className="btn btn-secondary text-xs"
                >
                  NPK Calculator
                </button>
                <button 
                  onClick={() => navigate('/machinery')} 
                  className="btn btn-secondary text-xs"
                >
                  Rentals Hub
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title={t('dashboard.todaySales')} value={money(stats?.todaySales)} icon={DollarSign} color="emerald" onClick={() => navigate('/invoices')} />
            <StatCard title={t('dashboard.monthlySales')} value={money(stats?.monthlySales)} icon={TrendingUp} color="blue" onClick={() => navigate('/invoices')} />
            <StatCard title={t('dashboard.totalCustomers')} value={stats?.totalCustomers || 0} icon={Users} color="yellow" onClick={() => navigate('/customers')} />
            <StatCard title={t('dashboard.totalInventory')} value={stats?.totalInventory || 0} icon={Package} color="blue" onClick={() => navigate('/products')} />
            <StatCard title={t('dashboard.lowStock')} value={stats?.lowStockProducts || 0} icon={AlertTriangle} color="yellow" onClick={() => navigate('/products?filter=low-stock')} />
            <StatCard title={t('dashboard.creditPending')} value={stats?.creditPendingCustomers || 0} icon={BarChart3} color="red" onClick={() => navigate('/customers?filter=credit-pending')} />
            <StatCard title="Pending Payments" value={stats?.pendingInvoices || 0} icon={WalletCards} color="red" onClick={() => navigate('/payments?filter=pending')} />
            <StatCard title="Expiring Products" value={stats?.expiringProducts || 0} icon={AlertTriangle} color="yellow" onClick={() => navigate('/products?filter=expiring')} />
            <StatCard title="Total Profit" value={money(stats?.totalProfit)} icon={TrendingUp} color="emerald" onClick={() => navigate('/reports')} />
            <StatCard title="Total Due Amount" value={money(farmerDueSummary.totalDueAmount)} icon={WalletCards} color="red" onClick={() => navigate('/farmer-dues')} />
            <StatCard title="Total Pending Farmers" value={farmerDueSummary.totalPendingFarmers || 0} icon={Users} color="yellow" onClick={() => navigate('/farmer-dues?status=Pending')} />
            <StatCard title="Total Partially Paid" value={farmerDueSummary.totalPartiallyPaid || 0} icon={WalletCards} color="blue" onClick={() => navigate('/farmer-dues?status=Partially%20Paid')} />
            <StatCard title="Total Paid Today" value={money(farmerDueSummary.totalPaidToday)} icon={DollarSign} color="emerald" onClick={() => navigate('/farmer-dues?status=Paid')} />
            <StatCard title={t('dashboard.fertilizerSales')} value={fertilizerSales} icon={Package} color="emerald" onClick={() => navigate('/invoices')} />
            <StatCard title={t('dashboard.pesticideSales')} value={pesticideSales} icon={FlaskConical} color="yellow" onClick={() => navigate('/invoices')} />
          </div>

          <div className="mb-6">
            <WeatherWidget />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card h-80">
              <h2 className="mb-4 text-xl font-bold">Sales by month</h2>
              <Line
                options={chartOptions}
                data={{
                  labels: (stats?.salesByMonth || []).map((item) => item.month),
                  datasets: [{ label: 'Sales', data: (stats?.salesByMonth || []).map((item) => item.total), borderColor: '#059669', backgroundColor: 'rgba(5, 150, 105, 0.18)', tension: 0.35 }],
                }}
              />
            </div>

            <div className="card h-80">
              <h2 className="mb-4 text-xl font-bold">Top selling products</h2>
              <Bar
                options={chartOptions}
                data={{
                  labels: (stats?.topSellingProducts || []).map((item) => item.name),
                  datasets: [{ label: 'Quantity', data: (stats?.topSellingProducts || []).map((item) => item.quantity), backgroundColor: '#84cc16' }],
                }}
              />
            </div>

            <div className="card h-80">
              <h2 className="mb-4 text-xl font-bold">Payment status</h2>
              <Doughnut
                options={chartOptions}
                data={{
                  labels: (stats?.paymentStatusChart || []).map((item) => item.status),
                  datasets: [{ data: (stats?.paymentStatusChart || []).map((item) => item.count), backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#64748b'] }],
                }}
              />
            </div>

            <div className="card h-80">
              <h2 className="mb-4 text-xl font-bold">Pending vs Paid Dues</h2>
              <Doughnut
                options={chartOptions}
                data={{
                  labels: (farmerDueSummary.statusChart || []).map((item) => item.status),
                  datasets: [{ data: (farmerDueSummary.statusChart || []).map((item) => item.count), backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'] }],
                }}
              />
            </div>

            <div className="card h-80">
              <h2 className="mb-4 text-xl font-bold">Stock level</h2>
              <Bar
                options={chartOptions}
                data={{
                  labels: (stats?.stockLevelChart || []).map((item) => item.name),
                  datasets: [
                    { label: 'Stock', data: (stats?.stockLevelChart || []).map((item) => item.stock), backgroundColor: '#22c55e' },
                    { label: 'Minimum', data: (stats?.stockLevelChart || []).map((item) => item.minimumStock), backgroundColor: '#fbbf24' },
                  ],
                }}
              />
            </div>

            <div className="card">
              <h2 className="mb-4 text-xl font-bold">{t('dashboard.financialSummary')}</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>{t('dashboard.totalDue')}</span>
                  <span className="font-bold">{money(stats?.totalDue)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard.expiringSoon')}</span>
                  <span className="font-bold">{stats?.expiringProducts || 0}</span>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{t('dashboard.fertilizerSales')}</span>
                    <span>{fertilizerSales}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 dark:bg-gray-800">
                    <div className="h-3 rounded-full bg-emerald-500" style={{ width: `${(fertilizerSales / salesMixTotal) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{t('dashboard.pesticideSales')}</span>
                    <span>{pesticideSales}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 dark:bg-gray-800">
                    <div className="h-3 rounded-full bg-amber-500" style={{ width: `${(pesticideSales / salesMixTotal) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="mb-4 text-xl font-bold">{t('dashboard.recentPurchases')}</h2>
              <div className="space-y-3">
                {(stats?.recentPurchases || []).map((purchase) => (
                  <div key={purchase.id} className="flex justify-between gap-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-gray-800">
                    <span>{purchase.purchaseNumber}</span>
                    <span>{purchase.supplier?.name || '-'}</span>
                    <span className="font-medium">{money(purchase.totalAmount)}</span>
                  </div>
                ))}
                {(stats?.recentPurchases || []).length === 0 && <p className="text-sm text-slate-500">{t('dashboard.noPurchasesYet')}</p>}
              </div>
            </div>

            <div className="card">
              <h2 className="mb-4 text-xl font-bold">{t('dashboard.quickActions')}</h2>
              <div className="space-y-2">
                <a href="/invoices" className="btn btn-primary w-full">
                  {t('dashboard.createInvoice')}
                </a>
                <a href="/products" className="btn btn-secondary w-full">
                  {t('dashboard.manageProducts')}
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
