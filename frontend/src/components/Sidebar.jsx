import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

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

  // Keyboard shortcut Ctrl + B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent('open-command-menu'));
  };

  const activeMenuItems = user?.role === 'FARMER' ? farmerMenuItems : menuItems;

  return (
    <motion.aside
      layout
      className="sticky hidden shrink-0 lg:flex flex-col bg-[#FFFFFF] dark:bg-[#0F1512] border-r border-slate-200/60 dark:border-white/5"
      style={{
        width: collapsed ? '80px' : '260px',
        height: 'calc(100vh - 64px)',
        top: '64px',
      }}
      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
    >
      {/* Sidebar Header / Collapse Action */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200/40 dark:border-white/5">
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider"
            >
              Navigation
            </motion.span>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className="rounded-lg border border-slate-200/40 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
        >
          <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Sidebar Search Trigger */}
      {user?.role !== 'FARMER' && (
        <div className="px-4 py-3">
          <button
            onClick={openSearch}
            className={`flex items-center gap-3 w-full rounded-xl border border-slate-200/60 bg-slate-50 px-3 py-2 text-left text-xs text-slate-400 transition hover:bg-slate-100 dark:border-white/5 dark:bg-[#151D19]/40 dark:hover:bg-[#151D19]/80 ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Search dashboard (Ctrl+K)"
          >
            <Search className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <span className="flex-1 flex justify-between items-center">
                <span>{t('common.search')}...</span>
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  ⌘K
                </kbd>
              </span>
            )}
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <div className="flex-1 space-y-1 px-3 overflow-y-auto py-2">
        {activeMenuItems
          .filter((item) => !item.adminOnly || user?.role === 'ADMIN')
          .map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.labelKey}
                to={item.path}
                className={`group relative flex items-center rounded-xl py-3 transition-colors duration-200 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#151D19]/40'
                } ${collapsed ? 'justify-center px-0' : 'justify-between px-4'}`}
                title={collapsed ? t(item.labelKey) : undefined}
              >
                {/* Active Indicator Spring animation */}
                {isActive && (
                  <motion.div
                    layoutId="active-sidebar-bg"
                    className="absolute inset-0 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 rounded-xl"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                <div className="flex items-center gap-3 relative z-10">
                  <motion.span
                    whileHover={{ scale: 1.15 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    className="shrink-0"
                  >
                    <Icon className="h-5 w-5" />
                  </motion.span>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm font-medium"
                    >
                      {t(item.labelKey)}
                    </motion.span>
                  )}
                </div>

                {isActive && !collapsed && (
                  <ChevronRight className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-0.5" />
                )}
              </Link>
            );
          })}
      </div>
    </motion.aside>
  );
};
