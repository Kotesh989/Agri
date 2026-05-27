import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { useNotificationContext } from '../components/Notification';
import { useConfirm } from '../components/ConfirmProvider';
import { showError, showWarning } from '../utils/notificationService';
import api from '../utils/api';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '../utils/helpers';

const emptyProductForm = {
  name: '',
  category: 'FERTILIZER',
  brandName: '',
  stockQuantity: '0',
  unitType: 'Kg',
  pricePerUnit: '0',
  pesticideWeight: '',
  pesticideWeightUnit: 'ML',
  lowStockAlert: '0',
  minimumStock: '0',
  gstRate: '0',
  batchNumber: '',
  expiryDate: '',
  supplierId: '',
  description: '',
};

export const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProductForm);
  const [searchParams] = useSearchParams();

  const { addNotification } = useNotificationContext();
  const { t } = useTranslation();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter]);

  useEffect(() => {
    api.get('/suppliers').then((response) => setSuppliers(response.data.data || [])).catch(() => {});
  }, []);

  const fetchProducts = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      const response = await api.get('/products', { params });
      const items = response.data.data || [];
      setProducts(items);
      const lowStockCount = items.filter((product) => Number(product.stockQuantity ?? product.currentStock ?? 0) <= Number(product.lowStockAlert ?? product.minimumStock ?? 0)).length;
      const expiringSoonCount = items.filter((product) => product.expiryDate && new Date(product.expiryDate) <= new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)).length;
      if (lowStockCount > 0) showWarning(`${lowStockCount} product${lowStockCount === 1 ? '' : 's'} have low stock.`, 5000);
      if (expiringSoonCount > 0) showWarning(`${expiringSoonCount} product${expiringSoonCount === 1 ? '' : 's'} are expiring soon.`, 5000);
    } catch (error) {
      showError(error, 'Error fetching store inventory');
    } finally {
      setLoading(false);
    }
  };

  const stockSummary = useMemo(() => ({
    totalItems: products.length,
    fertilizerItems: products.filter((product) => product.category === 'FERTILIZER').length,
    pesticideItems: products.filter((product) => product.category === 'PESTICIDE').length,
    lowStockItems: products.filter((product) => Number(product.stockQuantity ?? product.currentStock ?? 0) <= Number(product.lowStockAlert ?? product.minimumStock ?? 0)).length,
  }), [products]);

  const handleOpenModal = (product = null) => {
    setEditingProduct(product);
    setFormData(product ? {
      name: product.name || '',
      category: product.category || 'FERTILIZER',
      brandName: product.brandName || product.brand || '',
      stockQuantity: String(product.stockQuantity ?? product.currentStock ?? 0),
      unitType: product.unitType || product.unit || 'Kg',
      pricePerUnit: String(product.pricePerUnit ?? product.sellingPrice ?? 0),
      pesticideWeight: product.pesticideWeight ? String(product.pesticideWeight) : '',
      pesticideWeightUnit: product.pesticideWeightUnit || 'ML',
      lowStockAlert: String(product.lowStockAlert ?? product.minimumStock ?? 0),
      minimumStock: String(product.minimumStock ?? product.lowStockAlert ?? 0),
      gstRate: String(product.gstRate ?? product.gstPercentage ?? 0),
      batchNumber: product.batchNumber || '',
      expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().slice(0, 10) : '',
      supplierId: product.supplierId?.id || product.supplierId || '',
      description: product.description || '',
    } : emptyProductForm);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      stockQuantity: Number(formData.stockQuantity),
      pricePerUnit: Number(formData.pricePerUnit),
      lowStockAlert: Number(formData.lowStockAlert),
      minimumStock: Number(formData.minimumStock),
      gstRate: Number(formData.gstRate),
      batchNumber: formData.batchNumber || undefined,
      expiryDate: formData.expiryDate || undefined,
      pesticideWeight: formData.category === 'PESTICIDE' && formData.pesticideWeight ? Number(formData.pesticideWeight) : undefined,
      pesticideWeightUnit: formData.category === 'PESTICIDE' ? formData.pesticideWeightUnit : undefined,
    };

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        addNotification('Inventory item updated successfully', 'success');
      } else {
        await api.post('/products', payload);
        addNotification('Inventory item added successfully', 'success');
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData(emptyProductForm);
      fetchProducts();
    } catch (error) {
      addNotification(error.response?.data?.message || 'Error saving inventory item', 'error');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete inventory item',
      description: 'This action cannot be undone. Do you want to continue?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await api.delete(`/products/${id}`);
      addNotification('Inventory item deleted successfully', 'success');
      fetchProducts();
    } catch (error) {
      showError(error, 'Error deleting inventory item');
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
            <h1 className="text-3xl font-bold">Inventory</h1>
            <button onClick={() => handleOpenModal()} className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <div className="card">
              <p className="text-sm text-gray-500">Total items</p>
              <p className="text-2xl font-bold">{stockSummary.totalItems}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Fertilizers</p>
              <p className="text-2xl font-bold">{stockSummary.fertilizerItems}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Pesticides</p>
              <p className="text-2xl font-bold">{stockSummary.pesticideItems}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Low stock alerts</p>
              <p className="text-2xl font-bold">{stockSummary.lowStockItems}</p>
            </div>
          </div>

          <div className="card mb-6">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search inventory..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input"
                />
              </div>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input">
                <option value="ALL">All categories</option>
                <option value="FERTILIZER">Fertilizer</option>
                <option value="PESTICIDE">Pesticide</option>
                <option value="SEEDS">Seeds</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="table min-w-[980px]">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Min Stock</th>
                  <th>GST Rate</th>
                  <th>Batch</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products
                  .filter((product) => {
                    const filter = searchParams.get('filter');
                    const stockQuantity = Number(product.stockQuantity ?? product.currentStock ?? 0);
                    const minimumStock = Number(product.lowStockAlert ?? product.minimumStock ?? 0);
                    const expiryDate = product.expiryDate ? new Date(product.expiryDate) : null;
                    if (filter === 'low-stock') return stockQuantity <= minimumStock;
                    if (filter === 'expiring') return expiryDate && expiryDate <= new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
                    return true;
                  })
                  .map((product) => {
                  const stockQuantity = Number(product.stockQuantity ?? product.currentStock ?? 0);
                  const minimumStock = Number(product.lowStockAlert ?? product.minimumStock ?? 0);
                  const isLowStock = stockQuantity <= minimumStock;
                  const expiryDate = product.expiryDate ? new Date(product.expiryDate) : null;
                  const expiringSoon = expiryDate && expiryDate <= new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
                  return (
                    <tr key={product.id} className={isLowStock ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                      <td>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-gray-500">{product.brandName || product.brand || ''}</div>
                      </td>
                      <td>{product.category}</td>
                      <td className={isLowStock ? 'text-red-600 dark:text-red-400' : 'font-semibold'}>{stockQuantity}</td>
                      <td>{minimumStock}</td>
                      <td>{formatCurrency(product.gstRate ?? product.gstPercentage ?? 0).replace('INR', '').trim() || '0%'}</td>
                      <td>{product.batchNumber || '-'}</td>
                      <td>{expiryDate ? formatDate(expiryDate) : '-'}</td>
                      <td>
                        <span className={`badge ${isLowStock ? 'badge-red' : expiringSoon ? 'badge-yellow' : 'badge-blue'}`}>
                          {isLowStock ? 'Low stock' : expiringSoon ? 'Expiring soon' : 'In stock'}
                        </span>
                      </td>
                      <td className="flex gap-2">
                        <button onClick={() => handleOpenModal(product)} className="btn btn-secondary btn-sm">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="btn btn-danger btn-sm">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && products.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center text-gray-500 py-8">
                      No inventory items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Modal isOpen={showModal} title={editingProduct ? 'Edit Inventory Item' : 'Add Inventory Item'} onClose={() => setShowModal(false)} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="FERTILIZER">Fertilizer</option>
                    <option value="PESTICIDE">Pesticide</option>
                    <option value="SEEDS">Seeds</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Brand Name *</label>
                  <input
                    type="text"
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Minimum Stock</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.minimumStock}
                    onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Type *</label>
                  <input
                    type="text"
                    value={formData.unitType}
                    onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
                    className="input"
                    placeholder="Kg, Litre, Packet, Bag"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price Per Unit *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.pricePerUnit}
                    onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Supplier</label>
                <select value={formData.supplierId} onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })} className="input">
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select>
              </div>

              {formData.category === 'PESTICIDE' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Pesticide Weight</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={formData.pesticideWeight}
                      onChange={(e) => setFormData({ ...formData, pesticideWeight: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Weight Unit</label>
                    <select
                      value={formData.pesticideWeightUnit}
                      onChange={(e) => setFormData({ ...formData, pesticideWeightUnit: e.target.value })}
                      className="input"
                    >
                      <option value="Gram">Gram</option>
                      <option value="Kg">Kg</option>
                      <option value="ML">ML</option>
                      <option value="Litre">Litre</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input min-h-[90px]"
                />
              </div>

              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary flex-1">Save</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </Modal>
        </main>
      </div>
    </div>
  );
};
