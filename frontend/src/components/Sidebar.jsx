import { Link, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FileText,
  CreditCard,
  WalletCards,
  Truck,
  Settings,
  ChevronRight,
  Store,
  FlaskConical,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

const menuItems = [
  { labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { labelKey: 'nav.inventory', icon: Package, path: '/products' },
  { labelKey: 'nav.customers', icon: Users, path: '/customers' },
  { labelKey: 'nav.soilHealth', icon: FlaskConical, path: '/soil-health' },
  { labelKey: 'nav.machinery', icon: Wrench, path: '/machinery' },
  { labelKey: 'nav.sales', icon: ShoppingCart, path: '/sales' },
  { labelKey: 'nav.purchases', icon: Truck, path: '/purchases' },
  { labelKey: 'nav.suppliers', icon: Truck, path: '/suppliers' },
  { labelKey: 'nav.payments', icon: CreditCard, path: '/payments' },
  { labelKey: 'nav.farmerDues', icon: WalletCards, path: '/farmer-dues' },
  { labelKey: 'nav.reports', icon: FileText, path: '/reports' },
  { labelKey: 'nav.settings', icon: Settings, path: '/settings', adminOnly: true },
];

const farmerMenuItems = [
  { labelKey: 'nav.farmerDashboard', icon: LayoutDashboard, path: '/farmer/dashboard' },
  { labelKey: 'nav.shops', icon: Store, path: '/farmer/stores' },
  { labelKey: 'nav.machinery', icon: Wrench, path: '/machinery' },
];

export const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sticky top-0 hidden min-h-screen shrink-0 border-r border-slate-200/80 bg-white transition-[width] duration-200 dark:border-gray-800 dark:bg-[#111814] lg:block ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex justify-end p-4 pb-2">
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-gray-800 dark:text-gray-300 dark:hover:border-emerald-700 dark:hover:text-emerald-300"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <div className="space-y-1 px-4 pb-4">
        {(user?.role === 'FARMER' ? farmerMenuItems : menuItems)
          .filter((item) => !item.adminOnly || user?.role === 'ADMIN')
          .map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.labelKey}
                to={item.path}
                title={collapsed ? t(item.labelKey) : undefined}
                className={`group relative flex items-center overflow-hidden rounded-lg py-3 transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-800/70'
                } ${collapsed ? 'justify-center px-0' : 'justify-between px-4'}`}
              >
                <div className="flex items-center space-x-3 relative z-10">
                  <Icon className="h-5 w-5" />
                  {!collapsed && <span className="font-semibold">{t(item.labelKey)}</span>}
                </div>

                {isActive && !collapsed && (
                  <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                )}
              </Link>
            );
          })}
      </div>
    </aside>
  );
};
