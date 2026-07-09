import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Menu, LogOut, Sun, Moon, BarChart3, User, Languages, Wifi, WifiOff, Bell, Calendar, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirm } from './ConfirmProvider';
import { useNotificationContext } from './Notification';
import { motion, AnimatePresence } from 'framer-motion';

const routeMap = {
  '/dashboard': 'Dashboard',
  '/products': 'Inventory & Products',
  '/customers': 'Customer Relations',
  '/soil-health': 'Soil Health & NPK',
  '/machinery': 'Machinery Rental Hub',
  '/sales': 'New Sale Invoice',
  '/purchases': 'Purchase Management',
  '/suppliers': 'Wholesale Suppliers',
  '/payments': 'Payments Log',
  '/farmer-dues': 'Dues Ledger',
  '/reports': 'Financial Reports',
  '/settings': 'System Settings',
  '/farmer/dashboard': 'Farmer Portal',
  '/farmer/stores': 'Partner Shops',
};

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const { t, i18n } = useTranslation();

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState('');
  const [queueLength, setQueueLength] = useState(0);

  // Live ticking clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateQueueInfo = () => {
      import('../services/offlineService').then(({ getOfflineQueue }) => {
        setQueueLength(getOfflineQueue().length);
      });
    };

    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('Syncing...');
      import('../services/offlineService').then(({ syncOfflineData }) => {
        syncOfflineData((progress) => {
          setSyncStatus(progress);
          updateQueueInfo();
        });
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('Offline mode');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    updateQueueInfo();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const { confirm } = useConfirm();
  const { showInfo } = useNotificationContext();

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: t('nav.logoutConfirmTitle'),
      description: t('nav.logoutConfirmDescription'),
      confirmText: t('common.logout'),
      cancelText: t('common.cancel'),
    });

    if (!confirmed) return;

    await logout();
    showInfo(t('nav.loggedOutMessage'));
    navigate('/login');
  };

  const currentPathName = routeMap[location.pathname] || 'Dashboard';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/50 bg-[#FFFFFF]/85 backdrop-blur-md dark:border-white/5 dark:bg-[#090D0B]/85 h-16 transition-colors duration-300">
      <div className="flex w-full items-center justify-between px-6 h-full">
        {/* Left Side: Logo & Dynamic Breadcrumbs */}
        <div className="flex items-center space-x-2 md:space-x-6">
          {/* Mobile Sidebar Hamburger Trigger */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
            className="lg:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors duration-250 active:scale-95"
            aria-label="Open menu"
            title="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div onClick={() => navigate(user?.role === 'FARMER' ? '/farmer/dashboard' : '/dashboard')} className="flex items-center space-x-2.5 cursor-pointer group">
            <div className="rounded-lg bg-emerald-500 p-2 text-white shadow-md transition-all duration-300 group-hover:bg-emerald-600 active:scale-95">
              <BarChart3 className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{t('app.name')}</span>
          </div>

          {/* Dynamic Breadcrumbs */}
          <div className="hidden md:flex items-center text-xs font-semibold text-slate-400 dark:text-gray-500 border-l border-slate-200 dark:border-white/5 pl-6 gap-2">
            <span>ERP</span>
            <span>/</span>
            <motion.span 
              key={currentPathName}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-slate-600 dark:text-gray-300 font-medium"
            >
              {currentPathName}
            </motion.span>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-4">
          {/* Live Date and Time */}
          <div className="hidden xl:flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-gray-400 bg-slate-100/60 dark:bg-[#151D19]/40 border border-slate-200/40 dark:border-white/5 px-3 py-1.5 rounded-lg">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>{currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </span>
            <span className="border-l border-slate-300 dark:border-gray-800 h-3.5" />
            <span className="flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </span>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-white/5 bg-slate-50 dark:bg-[#151D19]/30 text-xs shadow-sm font-semibold">
            {isOnline ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline">Online</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <WifiOff className="w-3.5 h-3.5 text-rose-500" />
                <span>Offline {queueLength > 0 && `(${queueLength})`}</span>
              </span>
            )}
            {syncStatus && (
              <span className="hidden sm:inline text-[10px] text-gray-500 font-normal border-l border-slate-200 dark:border-gray-800 pl-2">
                {syncStatus}
              </span>
            )}
          </div>

          {/* Language Selector */}
          <label className="hidden cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm transition-all duration-200 hover:border-emerald-300 dark:border-white/5 dark:bg-[#151D19]/40 sm:flex">
            <Languages className="h-4 w-4 text-emerald-500" />
            <select
              value={i18n.language}
              onChange={(event) => i18n.changeLanguage(event.target.value)}
              className="bg-transparent outline-none font-semibold text-slate-700 dark:text-gray-300"
            >
              <option value="en">{t('app.english')}</option>
              <option value="kn">{t('app.kannada')}</option>
            </select>
          </label>

          {/* Theme Toggler */}
          <button 
            onClick={toggleTheme} 
            className="rounded-lg p-2 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-gray-800 active:scale-90"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
          </button>

          {/* User profile details */}
          <div className="hidden lg:flex items-center space-x-3 rounded-lg border border-slate-200/60 bg-white px-3 py-1.5 dark:border-white/5 dark:bg-[#151D19]/40">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <User className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 dark:text-white leading-tight">{user?.name}</span>
              <span className="text-[10px] text-slate-400 leading-none">{user?.role}</span>
            </div>
          </div>

          {/* Menu Dropdown Trigger */}
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)} 
              className="rounded-lg p-2 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-gray-800"
              aria-label="Menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/5 dark:bg-[#0F1512] z-50"
                >
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-gray-800 md:hidden">
                    <p className="text-xs font-bold text-slate-800 dark:text-white">{user?.name}</p>
                    <p className="text-[10px] text-slate-500">{user?.role}</p>
                  </div>

                  <button
                    onClick={() => {
                      i18n.changeLanguage(i18n.language === 'kn' ? 'en' : 'kn');
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center space-x-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-gray-800/40 transition-colors sm:hidden border-b border-slate-200 dark:border-gray-800"
                  >
                    <Languages className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-medium">{i18n.language === 'kn' ? t('app.english') : t('app.kannada')}</span>
                  </button>

                  <button
                    onClick={() => {
                      handleLogout();
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center space-x-3 px-4 py-3 text-left hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors text-rose-600 dark:text-rose-400 text-xs font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('nav.logout')}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
};
