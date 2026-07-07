import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Users,
  FlaskConical,
  Wrench,
  ShoppingCart,
  Truck,
  CreditCard,
  WalletCards,
  FileText,
  Settings,
  Search,
  CornerDownLeft,
  Store,
} from 'lucide-react';

const destinations = [
  // Admin-only pages
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', keywords: 'home admin status stats overview', roles: ['ADMIN'] },
  { label: 'Inventory & Products', icon: Package, path: '/products', keywords: 'stock items fertilizer seed pesticide chemical', roles: ['ADMIN'] },
  { label: 'Customer Directory', icon: Users, path: '/customers', keywords: 'farmers credit profile', roles: ['ADMIN'] },
  { label: 'Soil Health & NPK Calculator', icon: FlaskConical, path: '/soil-health', keywords: 'soil npk nitrogen phosphorus potassium recommendation lab', roles: ['ADMIN'] },
  { label: 'New Sale / Billing', icon: ShoppingCart, path: '/sales', keywords: 'invoice bill checkout sell cashier', roles: ['ADMIN'] },
  { label: 'Purchase Invoices', icon: Truck, path: '/purchases', keywords: 'wholesaler items buy stock update receive', roles: ['ADMIN'] },
  { label: 'Supplier Profiles', icon: Truck, path: '/suppliers', keywords: 'distributor wholesaler factory company source', roles: ['ADMIN'] },
  { label: 'Payments History', icon: CreditCard, path: '/payments', keywords: 'upi cash receipt logs balance clear', roles: ['ADMIN'] },
  { label: 'Dues Ledger', icon: WalletCards, path: '/farmer-dues', keywords: 'credit log pending outstanding debt', roles: ['ADMIN'] },
  { label: 'Reports & Analytics', icon: FileText, path: '/reports', keywords: 'gst profit sales margins tax audit chart', roles: ['ADMIN'] },
  { label: 'Store Settings', icon: Settings, path: '/settings', keywords: 'profile shop address printer toggle customize', roles: ['ADMIN'] },

  // Shared pages
  { label: 'Machinery Rentals', icon: Wrench, path: '/machinery', keywords: 'tractor harvest rent tools gear', roles: ['ADMIN', 'FARMER'] },

  // Farmer-only pages
  { label: 'Farmer Dashboard', icon: LayoutDashboard, path: '/farmer/dashboard', keywords: 'home farmer summary purchase overview', roles: ['FARMER'] },
  { label: 'Partner Shops', icon: Store, path: '/farmer/stores', keywords: 'catalog shopping store product order merchant', roles: ['FARMER'] },
];

export const CommandMenu = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const menuRef = useRef(null);

  // Toggle Command Menu via Ctrl + K or Cmd + K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to custom 'open-command-menu' event (from Sidebar or Header search)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-command-menu', handleOpen);
    return () => window.removeEventListener('open-command-menu', handleOpen);
  }, []);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      setQuery('');
      setSelectedIndex(0);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const filtered = destinations
    .filter((item) => item.roles.includes(user?.role))
    .filter((item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.keywords.toLowerCase().includes(query.toLowerCase())
    );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside list
  const handleKeyDown = (e) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(filtered.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        navigate(filtered[selectedIndex].path);
        setIsOpen(false);
      }
    }
  };

  const handleSelect = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-[#090D0B]/40 dark:bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/5 dark:bg-[#0F1512] overflow-hidden"
          >
            {/* Search Header */}
            <div className="flex items-center gap-3 border-b border-slate-200/60 px-4 py-3.5 dark:border-white/5">
              <Search className="h-5 w-5 text-slate-400 dark:text-gray-500 shrink-0" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-gray-500"
                placeholder="Type a page command or keywords..."
              />
              <button
                onClick={() => setIsOpen(false)}
                className="rounded border border-slate-200/60 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-500"
              >
                ESC
              </button>
            </div>

            {/* Scrollable Results List */}
            <div className="max-h-[320px] overflow-y-auto p-2 space-y-0.5">
              {filtered.length > 0 ? (
                filtered.map((item, index) => {
                  const Icon = item.icon;
                  const isSelected = index === selectedIndex;

                  return (
                    <div
                      key={item.path}
                      onClick={() => handleSelect(item.path)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-3 cursor-pointer transition-colors duration-150 ${
                        isSelected
                          ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'text-slate-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-[#151D19]/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4.5 w-4.5 shrink-0 ${isSelected ? 'text-emerald-500' : 'text-slate-400 dark:text-gray-500'}`} />
                        <span className="text-xs font-semibold">{item.label}</span>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500 opacity-80">
                          <span>Go</span>
                          <CornerDownLeft className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-gray-500">
                  No commands matching "{query}" found.
                </div>
              )}
            </div>

            {/* Footer guide */}
            <div className="flex justify-between items-center bg-slate-50/60 px-4 py-2 text-[10px] text-slate-400 border-t border-slate-200/60 dark:bg-[#151D19]/10 dark:border-white/5 dark:text-gray-500">
              <span>Use ↑↓ to navigate, ↵ to select</span>
              <span>Ctrl+K to toggle</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
