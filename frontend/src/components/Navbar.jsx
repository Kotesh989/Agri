import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Menu, LogOut, Sun, Moon, BarChart3, User, Languages, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirm } from './ConfirmProvider';
import { useNotificationContext } from './Notification';

const adminLinks = [
  { labelKey: 'nav.dashboard', path: '/dashboard' },
  { labelKey: 'nav.inventory', path: '/products' },
  { labelKey: 'nav.customers', path: '/customers' },
  { labelKey: 'nav.soilHealth', path: '/soil-health' },
  { labelKey: 'nav.machinery', path: '/machinery' },
  { labelKey: 'nav.sales', path: '/sales' },
  { labelKey: 'nav.purchases', path: '/purchases' },
  { labelKey: 'nav.suppliers', path: '/suppliers' },
  { labelKey: 'nav.payments', path: '/payments' },
  { labelKey: 'nav.farmerDues', path: '/farmer-dues' },
  { labelKey: 'nav.reports', path: '/reports' },
  { labelKey: 'nav.settings', path: '/settings' },
];

const farmerLinks = [
  { labelKey: 'nav.farmerDashboard', path: '/farmer/dashboard' },
  { labelKey: 'nav.shops', path: '/farmer/stores' },
  { labelKey: 'nav.machinery', path: '/machinery' },
];

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const { t, i18n } = useTranslation();

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState('');
  const [queueLength, setQueueLength] = useState(0);

  useEffect(() => {
    const updateQueueInfo = () => {
      import('../services/offlineService').then(({ getOfflineQueue }) => {
        setQueueLength(getOfflineQueue().length);
      });
    };

    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('Syncing changes...');
      import('../services/offlineService').then(({ syncOfflineData }) => {
        syncOfflineData((progress) => {
          setSyncStatus(progress);
          updateQueueInfo();
        });
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('Offline mode active');
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-lg dark:border-gray-800 dark:bg-[#0f1512]/85 h-16">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3 group cursor-pointer hover:opacity-80 transition-opacity">
          <div className="rounded-lg bg-emerald-600 p-2.5 text-white shadow-sm transition-all duration-200 group-hover:bg-emerald-700">
            <BarChart3 className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">{t('app.name')}</span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Online/Offline Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#151d19] text-xs shadow-sm font-semibold">
            {isOnline ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Wifi className="w-4 h-4 text-emerald-500" />
                <span>Online</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <WifiOff className="w-4 h-4 text-rose-500" />
                <span>Offline {queueLength > 0 && `(${queueLength} pending)`}</span>
              </span>
            )}
            {syncStatus && (
              <span className="hidden sm:inline text-[10px] text-gray-500 font-normal border-l border-slate-200 pl-2">
                {syncStatus}
              </span>
            )}
          </div>

          <label className="hidden cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm shadow-sm transition-all duration-200 hover:border-emerald-300 dark:border-gray-700 dark:bg-[#151d19] sm:flex">
            <Languages className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="sr-only">{t('app.language')}</span>
            <select
              value={i18n.language}
              onChange={(event) => i18n.changeLanguage(event.target.value)}
              className="bg-transparent outline-none font-medium text-slate-700 dark:text-gray-300"
            >
              <option value="en">{t('app.english')}</option>
              <option value="kn">{t('app.kannada')}</option>
            </select>
          </label>

          <button 
            onClick={toggleTheme} 
            className="rounded-lg p-2.5 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-gray-800"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>

          <div className="hidden items-center space-x-3 rounded-lg border border-slate-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-[#151d19] md:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <User className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name}</span>
              <span className="text-xs text-slate-600 dark:text-gray-400">{user?.role}</span>
            </div>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)} 
              className="rounded-lg p-2.5 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-gray-800"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-gray-800 dark:bg-[#151d19] animate-slide-up">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-gray-700 md:hidden">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                      <p className="text-xs text-slate-600 dark:text-gray-400">{user?.role}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    i18n.changeLanguage(i18n.language === 'kn' ? 'en' : 'kn');
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center space-x-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors duration-200 sm:hidden border-b border-slate-200 dark:border-gray-700"
                >
                  <Languages className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium">{i18n.language === 'kn' ? t('app.english') : t('app.kannada')}</span>
                </button>

                <div className="border-b border-slate-200 py-2 dark:border-gray-700 lg:hidden">
                  {(user?.role === 'FARMER' ? farmerLinks : adminLinks).map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMenu(false)}
                      className="block px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      {t(item.labelKey)}
                    </Link>
                  ))}
                </div>

                <button
                  onClick={() => {
                    handleLogout();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center space-x-3 px-4 py-3 text-left hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors duration-200 text-rose-600 dark:text-rose-400 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('nav.logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
