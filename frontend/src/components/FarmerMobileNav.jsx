import { FileText, Home, Store } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/farmer/dashboard', label: 'Home', icon: Home },
  { to: '/farmer/stores', label: 'Shops', icon: Store },
  { to: '/farmer/dashboard#purchases', label: 'Invoices', icon: FileText },
];

export const FarmerMobileNav = () => (
  <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-slate-200 bg-white/95 px-1 py-2 backdrop-blur dark:border-gray-800 dark:bg-[#111814]/95 lg:hidden">
    {links.map(({ to, label, icon: Icon }) => (
      <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-1 text-[11px] ${isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}`}>
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </NavLink>
    ))}
  </nav>
);
