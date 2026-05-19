import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, Store } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { FarmerMobileNav } from '../components/FarmerMobileNav';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '-');

export const FarmerShopProductsPage = () => {
  const { storeId } = useParams();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/farmer/stores/${storeId}/products`, { params: { search, category } })
      .then((response) => setProducts(response.data.data || []))
      .finally(() => setLoading(false));
  }, [storeId, search, category]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main pb-24 lg:pb-8">
          <div className="page-heading">
            <span className="eyebrow">Available Stock</span>
            <h1 className="text-3xl font-bold">Shop Products</h1>
            <p className="mt-1 text-sm text-slate-500">Public product details only. Purchase price and supplier details stay private.</p>
          </div>

          <div className="card mb-6 grid gap-3 md:grid-cols-[1fr_220px]">
            <label className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="input" placeholder="Search product, brand, or NPK ratio" />
            </label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="input">
              <option value="ALL">All categories</option>
              <option value="FERTILIZER">Fertilizer</option>
              <option value="PESTICIDE">Pesticide</option>
            </select>
          </div>

          {loading && <LoadingSkeleton rows={4} />}
          {!loading && products.length === 0 && <EmptyState title="No public products found" message="Try another search or category." />}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="card flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-emerald-700">{product.brandName || product.brand}</p>
                    <h2 className="text-xl font-bold">{product.name}</h2>
                    <p className="text-sm text-slate-500">{product.category} | {product.npkRatio || 'NPK not specified'}</p>
                  </div>
                  <span className={`badge ${product.stockStatus === 'IN_STOCK' ? 'badge-green' : product.stockStatus === 'LOW_STOCK' ? 'badge-yellow' : 'badge-red'}`}>
                    {product.stockStatus?.replaceAll('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-gray-800">
                    <p className="text-slate-500">Available</p>
                    <p className="text-lg font-bold">{product.availableStock} {product.unitType}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-gray-800">
                    <p className="text-slate-500">Selling price</p>
                    <p className="text-lg font-bold">{formatCurrency(product.sellingPrice)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-gray-800">
                    <p className="text-slate-500">GST</p>
                    <p className="text-lg font-bold">{product.gstRate || 0}%</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-gray-800">
                    <p className="text-slate-500">Expiry</p>
                    <p className="text-lg font-bold">{formatDate(product.expiryDate)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <Link to="/farmer/stores" className="btn btn-secondary mt-6 w-full justify-center sm:w-fit">
            <Store className="h-4 w-4" />
            Back to Shops
          </Link>
        </main>
      </div>
      <FarmerMobileNav />
    </div>
  );
};
