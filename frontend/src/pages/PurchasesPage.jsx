import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { Modal } from '../components/Modal';
import { useNotificationContext } from '../components/Notification';
import { useConfirm } from '../components/ConfirmProvider';
import { showError } from '../utils/notificationService';
import api from '../utils/api';
import { formatDate, formatCurrency } from '../utils/helpers';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const emptyPurchaseForm = {
  supplierId: '',
  items: [{ productId: '', quantity: 0, unitPrice: 0, batchNumber: '', expiryDate: '', gstRate: 0 }],
  purchaseDate: new Date().toISOString().slice(0, 10),
  status: 'PENDING',
  notes: '',
};

export const PurchasesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'customer' ? 'CUSTOMER' : 'SUPPLIER');
  const [supplierPurchases, setSupplierPurchases] = useState([]);
  const [customerPurchases, setCustomerPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState(emptyPurchaseForm);
  const { addNotification } = useNotificationContext();
  const { confirm } = useConfirm();
  const { t } = useTranslation();

  useEffect(() => {
    fetchSupplierPurchases();
    fetchCustomerPurchases();
    api.get('/suppliers').then((response) => setSuppliers(response.data.data || [])).catch(() => {});
    api.get('/products').then((response) => setProducts(response.data.data || [])).catch(() => {});
  }, [search]);

  const fetchSupplierPurchases = async () => {
    try {
      const params = search ? { search } : {};
      const response = await api.get('/purchases', { params });
      setSupplierPurchases(response.data.data || []);
    } catch (error) {
      showError(error, 'Error fetching purchases');
    }
  };

  const fetchCustomerPurchases = async () => {
    try {
      const params = {};
      if (searchParams.get('customerId')) params.customerId = searchParams.get('customerId');
      const response = await api.get('/customer-purchases', { params });
      setCustomerPurchases(response.data.data || []);
    } catch (error) {
      showError(error, 'Error fetching customer purchases');
    }
  };

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setSearchParams(nextTab === 'CUSTOMER' ? { tab: 'customer' } : {});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.supplierId) {
      showError('Supplier is required');
      return;
    }

    if (formData.items.some((item) => !item.productId || item.quantity <= 0 || item.unitPrice < 0)) {
      showError('Each item requires a product, quantity, and price');
      return;
    }

    try {
      if (editingPurchase) {
        await api.put(`/purchases/${editingPurchase.id}`, formData);
        addNotification('Purchase updated successfully', 'success');
      } else {
        await api.post('/purchases', formData);
        addNotification('Purchase created successfully', 'success');
      }
      if (formData.status === 'RECEIVED') {
        addNotification('Stock was updated for received purchase', 'info');
      }
      setShowModal(false);
      setEditingPurchase(null);
      setFormData(emptyPurchaseForm);
      fetchSupplierPurchases();
    } catch (error) {
      showError(error, 'Error saving purchase');
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 0, unitPrice: 0, batchNumber: '', expiryDate: '', gstRate: 0 }],
    });
  };

  const handleItemChange = (index, changes) => {
    const items = [...formData.items];
    items[index] = { ...items[index], ...changes };
    setFormData({ ...formData, items });
  };

  const handleEdit = (purchase) => {
    if (purchase.status === 'RECEIVED') {
      addNotification('Received purchases cannot be edited', 'warning');
      return;
    }
    setEditingPurchase(purchase);
    setFormData({
      supplierId: purchase.supplierId?.id || purchase.supplierId || '',
      items: purchase.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        batchNumber: item.batchNumber || '',
        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : '',
        gstRate: item.gstRate || 0,
      })),
      purchaseDate: purchase.purchaseDate ? new Date(purchase.purchaseDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      status: purchase.status || 'PENDING',
      notes: purchase.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete purchase',
      description: 'This purchase record will be permanently removed. Continue?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/purchases/${id}`);
      addNotification('Purchase deleted successfully', 'success');
      fetchSupplierPurchases();
    } catch (error) {
      showError(error, 'Error deleting purchase');
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{t('purchases.title')}</h1>
            {tab === 'SUPPLIER' && (
              <button onClick={() => setShowModal(true)} className="btn btn-primary">
                <Plus className="w-4 h-4 mr-2" /> {t('purchases.newPurchase')}
              </button>
            )}
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={() => changeTab('CUSTOMER')} className={`btn btn-sm ${tab === 'CUSTOMER' ? 'btn-primary' : 'btn-secondary'}`}>
              {t('purchases.customerPurchases')}
            </button>
            <button onClick={() => changeTab('SUPPLIER')} className={`btn btn-sm ${tab === 'SUPPLIER' ? 'btn-primary' : 'btn-secondary'}`}>
              {t('purchases.supplierPurchases')}
            </button>
          </div>

          <div className="card mb-6 flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="input" placeholder={t('purchases.searchPlaceholder')} />
          </div>

          <div className="card overflow-x-auto">
            {tab === 'CUSTOMER' ? (
              <table className="table min-w-[900px]">
                <thead>
                  <tr>
                    <th>{t('common.farmer')}</th>
                    <th>{t('common.product')}</th>
                    <th>{t('common.category')}</th>
                    <th>{t('common.quantity')}</th>
                    <th>{t('sales.weight')}</th>
                    <th>{t('common.total')}</th>
                    <th>{t('common.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {customerPurchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>{purchase.customer?.name}</td>
                      <td>{purchase.productName}</td>
                      <td>{purchase.category}</td>
                      <td>{purchase.quantity} {purchase.unitType}</td>
                      <td>{purchase.category === 'PESTICIDE' ? `${purchase.pesticideWeight || '-'} ${purchase.pesticideWeightUnit || ''}` : '-'}</td>
                      <td>{formatCurrency(purchase.totalAmount)}</td>
                      <td>{formatDate(purchase.purchaseDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="table min-w-[900px]">
                <thead>
                  <tr>
                    <th>{t('purchases.purchaseNumber')}</th>
                    <th>{t('purchases.supplier')}</th>
                    <th>{t('common.date')}</th>
                    <th>{t('common.amount')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierPurchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>{purchase.purchaseNumber}</td>
                      <td>{purchase.supplier?.name}</td>
                      <td>{formatDate(purchase.purchaseDate)}</td>
                      <td>{formatCurrency(purchase.totalAmount)}</td>
                      <td><span className={`badge ${purchase.status === 'RECEIVED' ? 'badge-green' : 'badge-yellow'}`}>{purchase.status}</span></td>
                      <td className="flex gap-2">
                        {purchase.status !== 'RECEIVED' && (
                          <button onClick={() => handleEdit(purchase)} className="btn btn-secondary btn-sm" title="Edit purchase">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(purchase.id)} className="btn btn-danger btn-sm" title="Delete purchase">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <Modal isOpen={showModal} title={editingPurchase ? 'Edit Purchase' : 'New Purchase'} onClose={() => setShowModal(false)} size="xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Supplier *</label>
                <select value={formData.supplierId} onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })} className="input" required>
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-2 mb-2 p-3 bg-gray-100 rounded">
                    <select value={item.productId} onChange={(e) => {
                      const selected = products.find((product) => product.id === e.target.value);
                      const nextItems = [...formData.items];
                      nextItems[index] = {
                        ...nextItems[index],
                        productId: e.target.value,
                        unitPrice: Number(selected?.purchasePrice ?? selected?.pricePerUnit ?? selected?.sellingPrice ?? 0),
                      };
                      setFormData({ ...formData, items: nextItems });
                    }} className="input" required>
                      <option value="">Select Product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                    </select>
                    <input type="number" value={item.quantity} min="0" step="1" className="input" placeholder="Qty" onChange={(e) => handleItemChange(index, { quantity: Number(e.target.value) })} required />
                    <input type="number" value={item.unitPrice} min="0" step="0.01" className="input" placeholder="Unit price" onChange={(e) => handleItemChange(index, { unitPrice: Number(e.target.value) })} required />
                    <input type="number" value={item.gstRate} min="0" step="0.01" className="input" placeholder="GST %" onChange={(e) => handleItemChange(index, { gstRate: Number(e.target.value) })} />
                    <input type="text" value={item.batchNumber} className="input" placeholder="Batch no" onChange={(e) => handleItemChange(index, { batchNumber: e.target.value })} />
                    <input type="date" value={item.expiryDate} className="input" onChange={(e) => handleItemChange(index, { expiryDate: e.target.value })} />
                  </div>
                ))}
              </div>

              <button type="button" onClick={handleAddItem} className="btn btn-secondary btn-sm">Add item</button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Purchase Date</label>
                  <input type="date" value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} className="input" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input">
                    <option value="PENDING">Pending</option>
                    <option value="RECEIVED">Received</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input min-h-[90px]" />
              </div>

              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary flex-1">{editingPurchase ? 'Update Purchase' : 'Create Purchase'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </Modal>
        </main>
      </div>
    </div>
  );
};
