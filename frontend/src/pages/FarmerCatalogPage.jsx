import { useEffect, useState } from 'react';
import { Bell, Heart, Search } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import { FarmerMobileNav } from '../components/FarmerMobileNav';
import { EmptyState } from '../components/EmptyState';

export const FarmerCatalogPage = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');

  useEffect(() => {
    api.get('/farmer/catalog', { params: { search, category } }).then((response) => setProducts(response.data.data));
  }, [search, category]);

  const toggleWishlist = async (productId) => {
    const response = await api.post(`/farmer/catalog/${productId}/wishlist`);
    setProducts((current) => current.map((item) => item.id === productId ? { ...item, wished: response.data.data.wished } : item));
  };

  const requestAvailability = async (productId) => {
    await api.post(`/farmer/catalog/${productId}/availability`);
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <div className="page-heading">
            <span className="eyebrow">Farmer Portal</span>
            <h1 className="text-3xl font-bold">Product Catalog</h1>
          </div>
          <div className="card mb-6 grid gap-3 md:grid-cols-[1fr_220px]">
            <label className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="input" placeholder="Search product, brand, or NPK ratio" />
            </label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="input">
              <option value="ALL">All Categories</option>
              <option value="FERTILIZER">Fertilizers</option>
              <option value="PESTICIDE">Pesticides</option>
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="card flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-emerald-700">{product.brandName}</p>
                    <h2 className="text-xl font-bold">{product.name}</h2>
                    <p className="text-sm text-slate-500">{product.npkRatio || 'NPK not specified'} | {product.packSize || product.unitType}</p>
                  </div>
                  <button type="button" onClick={() => toggleWishlist(product.id)} className={`rounded-lg p-2 ${product.wished ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`} title="Wishlist">
                    <Heart className={`h-5 w-5 ${product.wished ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(product.pricePerUnit)}</p>
                <span className={`badge w-fit ${product.stockStatus === 'IN_STOCK' ? 'badge-green' : product.stockStatus === 'LOW_STOCK' ? 'badge-yellow' : 'badge-red'}`}>
                  {product.stockStatus.replaceAll('_', ' ')}
                </span>
                <p className="text-sm text-slate-600 dark:text-gray-300">{product.description || 'No description available.'}</p>
                <div className="text-sm">
                  <p><span className="font-semibold">Recommended crops:</span> {(product.recommendedCrops || []).join(', ') || '-'}</p>
                  <p className="mt-1"><span className="font-semibold">Application:</span> {product.applicationInstructions || '-'}</p>
                </div>
                {product.stockStatus !== 'IN_STOCK' && (
                  <button type="button" onClick={() => requestAvailability(product.id)} className="btn btn-secondary mt-auto">
                    <Bell className="h-4 w-4" />
                    Notify me
                  </button>
                )}
              </article>
            ))}
            {products.length === 0 && <div className="col-span-full"><EmptyState title="No matching products" message="Try a different product name, brand, or category." /></div>}
          </div>
        </main>
      </div>
      <FarmerMobileNav />
    </div>
  );
};
