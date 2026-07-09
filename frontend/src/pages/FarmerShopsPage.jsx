import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, FileText, MapPin, Package, Phone, Wallet } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { FarmerMobileNav } from '../components/FarmerMobileNav';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';

const displayStoreName = (store) => store?.storeName || store?.companyName || store?.shopName || store?.name || 'Unknown Store';

export const FarmerShopsPage = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/farmer/stores')
      .then((response) => setShops(response.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main pb-24 lg:pb-8">
          <div className="page-heading">
            <span className="eyebrow">Farmer Portal</span>
            <h1 className="text-3xl font-bold">My Shops</h1>
            <p className="mt-1 text-sm text-slate-500">All fertilizer shops where your mobile number has purchases.</p>
          </div>

          {loading && <LoadingSkeleton rows={4} />}
          {!loading && shops.length === 0 && <EmptyState title="No shops yet" message="Shops will appear here after your first invoice." />}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shops.map((shop, index) => (
              <motion.article
                key={shop.storeId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="card flex flex-col gap-4 border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 dark:from-[#151d19] dark:to-emerald-950/20"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-600 p-3 text-white">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{displayStoreName(shop)}</h2>
                    <p className="text-sm text-slate-600">{shop.ownerName || 'Owner'}</p>
                    {shop.isNear && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="badge badge-green text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider">Near You</span>
                        {shop.matchType === 'village' && <span className="badge badge-blue text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider">Same Village</span>}
                        {shop.matchType === 'taluk' && <span className="badge badge-blue text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider">Same Taluk</span>}
                        {shop.matchType === 'district' && <span className="badge badge-blue text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider">Same District</span>}
                        {shop.matchType === 'state' && <span className="badge badge-blue text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider">Same State</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600 dark:text-gray-300">
                  <p className="flex gap-2"><Phone className="h-4 w-4 text-emerald-600" /> {shop.phone || '-'}</p>
                  <p className="flex gap-2"><MapPin className="h-4 w-4 text-emerald-600" /> {shop.address || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-white/80 p-3 dark:bg-gray-900/50">
                    <p className="text-slate-500">Invoices</p>
                    <p className="text-lg font-bold">{shop.totalInvoices}</p>
                  </div>
                  <div className="rounded-lg bg-white/80 p-3 dark:bg-gray-900/50">
                    <p className="text-slate-500">Spent</p>
                    <p className="text-lg font-bold">{formatCurrency(shop.totalAmountSpent)}</p>
                  </div>
                  <div className="rounded-lg bg-white/80 p-3 dark:bg-gray-900/50">
                    <p className="text-slate-500">Paid</p>
                    <p className="text-lg font-bold">{formatCurrency(shop.paidAmount)}</p>
                  </div>
                  <div className="rounded-lg bg-white/80 p-3 dark:bg-gray-900/50">
                    <p className="text-slate-500">Pending</p>
                    <p className="text-lg font-bold text-rose-600">{formatCurrency(shop.pendingBalance)}</p>
                  </div>
                </div>

                <div className="mt-auto grid gap-2 sm:grid-cols-2">
                  <Link to={`/farmer/stores/${shop.storeId}/invoices`} className="btn btn-primary justify-center">
                    <FileText className="h-4 w-4" />
                    Purchases
                  </Link>
                  <Link to={`/farmer/stores/${shop.storeId}/products`} className="btn btn-secondary justify-center">
                    <Package className="h-4 w-4" />
                    Stock
                  </Link>
                </div>
                <div className="flex items-center justify-between border-t border-emerald-100 pt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> Balance due</span>
                  <Link to={`/farmer/stores/${shop.storeId}/invoices`} className="flex items-center gap-1 font-semibold text-emerald-700">
                    View details <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </main>
      </div>
      <FarmerMobileNav />
    </div>
  );
};
