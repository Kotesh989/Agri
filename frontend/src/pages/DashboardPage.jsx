import { useEffect, useState } from 'react';
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

export const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

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
  const salesMixTotal = Math.max(fertilizerSales + pesticideSales, 1);
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <div className="page-heading">
            <span className="eyebrow">{t('nav.dashboard')}</span>
            <h1 className="text-3xl font-bold">{t('dashboard.adminTitle')}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{t('app.subtitle')}</p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title={t('dashboard.todaySales')} value={money(stats?.todaySales)} icon={DollarSign} color="emerald" />
            <StatCard title={t('dashboard.monthlySales')} value={money(stats?.monthlySales)} icon={TrendingUp} color="blue" />
            <StatCard title={t('dashboard.totalCustomers')} value={stats?.totalCustomers || 0} icon={Users} color="yellow" />
            <StatCard title={t('dashboard.totalInventory')} value={stats?.totalInventory || 0} icon={Package} color="blue" />
            <StatCard title={t('dashboard.lowStock')} value={stats?.lowStockProducts || 0} icon={AlertTriangle} color="yellow" />
            <StatCard title={t('dashboard.creditPending')} value={stats?.creditPendingCustomers || 0} icon={BarChart3} color="red" />
            <StatCard title="Pending Payments" value={stats?.pendingInvoices || 0} icon={WalletCards} color="red" />
            <StatCard title="Expiring Products" value={stats?.expiringProducts || 0} icon={AlertTriangle} color="yellow" />
            <StatCard title="Total Profit" value={money(stats?.totalProfit)} icon={TrendingUp} color="emerald" />
            <StatCard title={t('dashboard.fertilizerSales')} value={fertilizerSales} icon={Package} color="emerald" />
            <StatCard title={t('dashboard.pesticideSales')} value={pesticideSales} icon={FlaskConical} color="yellow" />
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
