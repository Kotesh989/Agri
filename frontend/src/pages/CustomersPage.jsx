import { Fragment, useEffect, useMemo, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { Modal } from '../components/Modal';
import { useNotificationContext } from '../components/Notification';
import { useConfirm } from '../components/ConfirmProvider';
import { showError } from '../utils/notificationService';
import api from '../utils/api';
import { Plus, Edit2, Trash2, Search, Eye, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils/helpers';
import { AnimatePresence, motion } from 'framer-motion';

const customerTabs = [
  { id: 'PURCHASED_ITEMS', labelKey: 'customers.purchasedItems' },
  { id: 'FERTILIZER', labelKey: 'dashboard.fertilizers' },
  { id: 'PESTICIDE', labelKey: 'dashboard.pesticides' },
  { id: 'HISTORY', labelKey: 'customers.purchaseHistory' },
];

const emptyCustomerForm = {
  name: '',
  username: '',
  mobileNumber: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pinCode: '',
  creditLimit: '0',
  password: '',
};

const emptyItemForm = {
  productId: '',
  productName: '',
  category: 'FERTILIZER',
  quantity: '1',
  unitType: 'Kg',
  pricePerUnit: '0',
  pesticideWeight: '',
  pesticideWeightUnit: 'ML',
  availableStock: '0',
  purchaseDate: new Date().toISOString().slice(0, 10),
  notes: '',
};

const emptyManualSummary = {
  totalFertilizerPurchases: 0,
  totalPesticidePurchases: 0,
  totalQuantityBought: 0,
  totalAmountSpent: 0,
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const toDateInputValue = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

export const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('PURCHASED_ITEMS');
  const [manualFilter, setManualFilter] = useState('ALL');
  const [invoiceFilter, setInvoiceFilter] = useState('ALL');
  const [manualItems, setManualItems] = useState([]);
  const [manualSummary, setManualSummary] = useState(emptyManualSummary);
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [overrideCreditLimit, setOverrideCreditLimit] = useState(false);

  const { addNotification } = useNotificationContext();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const itemTotalAmount = useMemo(
    () => Number(itemForm.quantity || 0) * Number(itemForm.pricePerUnit || 0),
    [itemForm.quantity, itemForm.pricePerUnit]
  );

  const visibleManualItems = useMemo(() => {
    if (manualFilter === 'ALL') return manualItems;
    return manualItems.filter((item) => item.category === manualFilter);
  }, [manualItems, manualFilter]);

  const visibleInvoiceHistory = useMemo(() => {
    if (invoiceFilter === 'ALL') return invoiceHistory;
    return invoiceHistory.filter((item) => item.category === invoiceFilter);
  }, [invoiceHistory, invoiceFilter]);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return products;
    return products.filter((item) =>
      [item.name, item.brandName, item.brand, item.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [products, productSearch]);

  const visibleCustomers = useMemo(() => {
    if (searchParams.get('filter') !== 'credit-pending') return customers;
    return customers.filter((customer) =>
      Number(customer.totalCredit || 0) > 0 ||
      Number(customer.currentCreditUsed || 0) > 0 ||
      Number(customer.balanceDue || 0) > 0
    );
  }, [customers, searchParams]);

  const fetchCustomers = async () => {
    try {
      const params = search ? { search } : {};
      const response = await api.get('/customers', { params });
      setCustomers(response.data.data);
    } catch (error) {
      addNotification('Error fetching customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchManualPurchasedItems = async (customer, filter = manualFilter) => {
    const params = filter === 'ALL' ? {} : { category: filter };
    const response = await api.get(`/customers/${customer.id}/purchased-items`, { params });
    setManualItems(response.data.data);
    setManualSummary(response.data.summary || emptyManualSummary);
  };

  const fetchInvoiceHistory = async (customer, filter = invoiceFilter) => {
    const params = filter === 'ALL' ? {} : { category: filter };
    const response = await api.get(`/customers/${customer.id}/purchases`, { params });
    setInvoiceHistory(response.data.data);
  };

  const fetchProducts = async () => {
    const response = await api.get('/products');
    setProducts(response.data.data);
  };

  const fetchCustomerDetails = async (customer) => {
    setSelectedCustomer(customer);
    setDetailsLoading(true);

    try {
      await Promise.all([
        fetchManualPurchasedItems(customer),
        fetchInvoiceHistory(customer),
        fetchProducts(),
      ]);
    } catch (error) {
      addNotification('Error fetching customer purchase details', 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleManualFilterChange = async (filter) => {
    setManualFilter(filter);
    if (!selectedCustomer) return;

    try {
      await fetchManualPurchasedItems(selectedCustomer, filter);
    } catch (error) {
      addNotification('Error filtering purchased items', 'error');
    }
  };

  const handleInvoiceFilterChange = async (filter) => {
    setInvoiceFilter(filter);
    if (!selectedCustomer) return;

    try {
      await fetchInvoiceHistory(selectedCustomer, filter);
    } catch (error) {
      addNotification('Error filtering purchase history', 'error');
    }
  };

  const handleOpenCustomerModal = (customer = null) => {
    setEditingCustomer(customer);
    setCustomerForm(
      customer
        ? {
            name: customer.name || '',
            username: customer.username || '',
            mobileNumber: customer.mobileNumber || '',
            email: customer.email || '',
            address: customer.address || '',
            city: customer.city || '',
            state: customer.state || '',
            pinCode: customer.pinCode || '',
            creditLimit: String(customer.creditLimit || 0),
            password: '',
          }
        : emptyCustomerForm
    );
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();

    try {
      if (editingCustomer) {
        const response = await api.put(`/customers/${editingCustomer.id}`, customerForm);
        addNotification('Customer updated successfully', 'success');
        if (selectedCustomer?.id === editingCustomer.id) {
          setSelectedCustomer(response.data.data);
        }
      } else {
        const response = await api.post('/customers', customerForm);
        addNotification(response.data.message || 'Farmer account created successfully', 'success');
      }
      setShowCustomerModal(false);
      fetchCustomers();
    } catch (error) {
      showError(error, 'Error saving customer');
    }
  };

  const handleDeleteCustomer = async (id) => {
    const confirmed = await confirm({
      title: 'Delete customer',
      description: 'Deleting this customer cannot be undone. Continue?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await api.delete(`/customers/${id}`);
      addNotification('Customer deleted successfully', 'success');
      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null);
        setManualItems([]);
        setInvoiceHistory([]);
        setManualSummary(emptyManualSummary);
      }
      fetchCustomers();
    } catch (error) {
      showError(error, 'Error deleting customer');
    }
  };

  const handleOpenItemModal = (item = null) => {
    setEditingItem(item);
    setItemForm(
      item
        ? {
            productId: item.productId || '',
            productName: item.productName || '',
            category: item.category || 'FERTILIZER',
            quantity: String(item.quantity || 1),
            unitType: item.unitType || 'Kg',
            pricePerUnit: String(item.pricePerUnit || 0),
            pesticideWeight: item.pesticideWeight ? String(item.pesticideWeight) : '',
            pesticideWeightUnit: item.pesticideWeightUnit || 'ML',
            availableStock: '',
            purchaseDate: toDateInputValue(item.purchaseDate),
            notes: item.notes || '',
          }
        : emptyItemForm
    );
    setOverrideCreditLimit(false);
    fetchProducts().catch(() => addNotification('Error fetching products', 'error'));
    setShowItemModal(true);
  };

  const handleProductSelect = (productId) => {
    const product = products.find((item) => item.id === productId);
    if (!product) {
      setItemForm({ ...itemForm, productId });
      return;
    }

    setItemForm({
      ...itemForm,
      productId,
      productName: product.name,
      category: product.category,
      unitType: product.unitType || product.unit || '',
      pricePerUnit: String(product.pricePerUnit ?? product.sellingPrice ?? 0),
      pesticideWeight: product.pesticideWeight ? String(product.pesticideWeight) : '',
      pesticideWeightUnit: product.pesticideWeightUnit || 'ML',
      availableStock: String(product.stockQuantity ?? product.currentStock ?? 0),
    });
  };

  const handleSavePurchasedItem = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const payload = {
      ...itemForm,
      quantity: Number(itemForm.quantity),
      pricePerUnit: Number(itemForm.pricePerUnit),
      pesticideWeight: itemForm.category === 'PESTICIDE' ? Number(itemForm.pesticideWeight) : undefined,
      pesticideWeightUnit: itemForm.category === 'PESTICIDE' ? itemForm.pesticideWeightUnit : undefined,
      overrideCreditLimit,
    };

    try {
      if (editingItem) {
        await api.put(`/customers/${selectedCustomer.id}/purchased-items/${editingItem.id}`, payload);
        addNotification('Purchased item updated successfully', 'success');
      } else {
        await api.post(`/customers/${selectedCustomer.id}/purchased-items`, payload);
        addNotification('Purchased item added successfully', 'success');
        navigate(`/purchases?tab=customer&customerId=${selectedCustomer.id}`);
      }

      setShowItemModal(false);
      await fetchManualPurchasedItems(selectedCustomer, manualFilter);
      await fetchProducts();
    } catch (error) {
      showError(error, 'Error saving purchased item');
    }
  };

  const handleDeletePurchasedItem = async (itemId) => {
    if (!selectedCustomer) return;

    const confirmed = await confirm({
      title: 'Delete purchased item',
      description: 'This purchased item will be removed from the customer history. Continue?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await api.delete(`/customers/${selectedCustomer.id}/purchased-items/${itemId}`);
      addNotification('Purchased item deleted successfully', 'success');
      await fetchManualPurchasedItems(selectedCustomer, manualFilter);
      await fetchProducts();
    } catch (error) {
      showError(error, 'Error deleting purchased item');
    }
  };

  const handleResetPendingAmount = async () => {
    if (!selectedCustomer) return;

    const confirmed = await confirm({
      title: 'Reset pending amount',
      description: 'This will clear the pending amount for this customer. Continue?',
      confirmText: 'Reset',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      const response = await api.patch(`/customers/${selectedCustomer.id}/reset-pending`);
      setSelectedCustomer(response.data.data);
      addNotification('Pending amount reset successfully', 'success');
      fetchCustomers();
    } catch (error) {
      showError(error, 'Error resetting pending amount');
    }
  };

  const renderCategoryFilters = (activeFilter, onChange) => (
    <div className="flex flex-wrap items-center gap-2">
      {['ALL', 'FERTILIZER', 'PESTICIDE'].map((filter) => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={`btn btn-sm ${activeFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
        >
          {filter === 'ALL' ? t('common.all') : filter === 'FERTILIZER' ? t('dashboard.fertilizers') : t('dashboard.pesticides')}
        </button>
      ))}
    </div>
  );

  const renderManualItemsTable = (items) => (
    <div className="overflow-x-auto">
      <table className="table min-w-[860px]">
        <thead>
          <tr>
            <th>{t('inventory.productName')}</th>
            <th>{t('common.category')}</th>
            <th>{t('common.quantity')}</th>
            <th>{t('common.pricePerUnit')}</th>
            <th>{t('common.total')}</th>
            <th>{t('common.date')}</th>
            <th>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="font-medium">{item.productName}</div>
                {item.notes && <div className="text-xs text-gray-500 dark:text-gray-400">{item.notes}</div>}
              </td>
              <td>
                <span className={item.category === 'PESTICIDE' ? 'badge badge-yellow' : 'badge badge-green'}>
                  {item.category === 'PESTICIDE' ? t('dashboard.pesticides') : t('dashboard.fertilizers')}
                </span>
              </td>
              <td>{Number(item.quantity || 0)} {item.unitType}</td>
              <td>{formatCurrency(item.pricePerUnit)}</td>
              <td>{formatCurrency(item.totalAmount)}</td>
              <td>{formatDate(item.purchaseDate)}</td>
              <td>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleOpenItemModal(item)} className="btn btn-secondary btn-sm" title="Edit item">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeletePurchasedItem(item.id)} className="btn btn-danger btn-sm" title="Delete item">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan="7" className="text-center text-gray-500 dark:text-gray-400 py-8">
                {t('common.noData')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderInvoiceHistoryTable = (items) => (
    <div className="overflow-x-auto">
      <table className="table min-w-[760px]">
        <thead>
          <tr>
            <th>{t('inventory.productName')}</th>
            <th>{t('common.category')}</th>
            <th>{t('common.quantity')}</th>
            <th>{t('common.pricePerUnit')}</th>
            <th>{t('common.total')}</th>
            <th>{t('common.date')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.invoiceId}-${item.id}`}>
              <td>
                <div className="font-medium">{item.productName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{item.invoiceNumber}</div>
              </td>
              <td>
                <span className={item.category === 'PESTICIDE' ? 'badge badge-yellow' : 'badge badge-green'}>
                  {item.category === 'PESTICIDE' ? t('dashboard.pesticides') : t('dashboard.fertilizers')}
                </span>
              </td>
              <td>{item.quantity}</td>
              <td>{formatCurrency(item.pricePerQuantity)}</td>
              <td>{formatCurrency(item.totalCost)}</td>
              <td>{formatDate(item.purchaseDate)}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan="6" className="text-center text-gray-500 dark:text-gray-400 py-8">
                {t('common.noData')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const currentManualRows =
    activeTab === 'FERTILIZER'
      ? manualItems.filter((item) => item.category === 'FERTILIZER')
      : activeTab === 'PESTICIDE'
        ? manualItems.filter((item) => item.category === 'PESTICIDE')
        : visibleManualItems;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
            <h1 className="text-3xl font-bold">{t('customers.title')}</h1>
            <button onClick={() => handleOpenCustomerModal()} className="btn btn-primary">
              <Plus className="w-4 h-4" /> {t('customers.newCustomer')}
            </button>
          </div>

          <div className="card mb-6">
            <div className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('customers.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="card overflow-x-auto">
              <table className="table min-w-[760px]">
                <thead>
                  <tr>
                    <th>{t('common.name')}</th>
                    <th>{t('common.phone')}</th>
                    <th>{t('common.email')}</th>
                    <th>{t('common.city')}</th>
                    <th>{t('customers.creditLimit')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCustomers.map((customer) => (
                    <Fragment key={customer.id}>
                      <tr
                        tabIndex={0}
                        onClick={() => handleOpenCustomerModal(customer)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleOpenCustomerModal(customer);
                        }}
                        className={`cursor-pointer transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:hover:bg-gray-800 ${selectedCustomer?.id === customer.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}
                      >
                        <td>{customer.name}</td>
                        <td>{customer.mobileNumber}</td>
                        <td>{customer.email || '-'}</td>
                        <td>{customer.city || '-'}</td>
                        <td>{formatCurrency(customer.creditLimit)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button onClick={(event) => { event.stopPropagation(); selectedCustomer?.id === customer.id ? setSelectedCustomer(null) : fetchCustomerDetails(customer); }} className="btn btn-secondary btn-sm" title="View customer details">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={(event) => { event.stopPropagation(); handleOpenCustomerModal(customer); }} className="btn btn-secondary btn-sm" title="Edit customer">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={(event) => { event.stopPropagation(); handleDeleteCustomer(customer.id); }} className="btn btn-danger btn-sm" title="Delete customer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      <AnimatePresence>
                      {selectedCustomer?.id === customer.id && (
                        <tr className="bg-white dark:bg-[#151d19]">
                          <td colSpan="6" className="p-0">
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-slate-200 p-5 dark:border-gray-800">
                              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <div><p className="text-xs text-slate-500">Full Name</p><p className="font-semibold">{selectedCustomer.name}</p></div>
                                <div><p className="text-xs text-slate-500">Mobile Number</p><p className="font-semibold">{selectedCustomer.mobileNumber}</p></div>
                                <div><p className="text-xs text-slate-500">Username</p><p className="font-semibold">{selectedCustomer.username || '-'}</p></div>
                                <div><p className="text-xs text-slate-500">Email</p><p className="font-semibold">{selectedCustomer.email || '-'}</p></div>
                                <div><p className="text-xs text-slate-500">Address</p><p className="font-semibold">{selectedCustomer.address || '-'}</p></div>
                                <div><p className="text-xs text-slate-500">Village</p><p className="font-semibold">{selectedCustomer.village || '-'}</p></div>
                                <div><p className="text-xs text-slate-500">Taluk</p><p className="font-semibold">{selectedCustomer.taluk || '-'}</p></div>
                                <div><p className="text-xs text-slate-500">District</p><p className="font-semibold">{selectedCustomer.district || '-'}</p></div>
                                <div><p className="text-xs text-slate-500">Aadhaar Number</p><p className="font-semibold">{selectedCustomer.aadhaarNumber || '-'}</p></div>
                              </div>
                              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border border-slate-200 p-4 dark:border-gray-800">
                                  <p className="text-sm text-slate-500">Total Purchases</p>
                                  <p className="text-2xl font-bold">{manualSummary.totalFertilizerPurchases + manualSummary.totalPesticidePurchases}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 p-4 dark:border-gray-800">
                                  <p className="text-sm text-slate-500">Outstanding Due</p>
                                  <p className="text-2xl font-bold">{formatCurrency(selectedCustomer.currentCreditUsed || selectedCustomer.totalCredit)}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 p-4 dark:border-gray-800">
                                  <p className="text-sm text-slate-500">Last Purchase Date</p>
                                  <p className="text-2xl font-bold">{formatDate(manualItems[0]?.purchaseDate)}</p>
                                </div>
                              </div>
                              <div className="mt-5">
                                <h3 className="mb-3 text-lg font-bold">Purchase History</h3>
                                {renderManualItemsTable(manualItems)}
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                      </AnimatePresence>
                    </Fragment>
                  ))}
                  {!loading && customers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center text-gray-500 dark:text-gray-400 py-8">
                        {t('common.noData')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card">
              {selectedCustomer ? (
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{selectedCustomer.name}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{selectedCustomer.mobileNumber}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{selectedCustomer.address || selectedCustomer.city || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleOpenItemModal()} className="btn btn-primary btn-sm">
                        <Plus className="w-4 h-4" /> {t('inventory.addItem')}
                      </button>
                      <button onClick={() => setSelectedCustomer(null)} className="btn btn-secondary btn-sm" title="Close customer details">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('customers.totalFertilizerPurchases')}</p>
                      <p className="text-2xl font-bold">{manualSummary.totalFertilizerPurchases}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('customers.totalPesticidePurchases')}</p>
                      <p className="text-2xl font-bold">{manualSummary.totalPesticidePurchases}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('customers.totalQuantityBought')}</p>
                      <p className="text-2xl font-bold">{Number(manualSummary.totalQuantityBought || 0)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('customers.totalAmountSpent')}</p>
                      <p className="text-2xl font-bold">{formatCurrency(manualSummary.totalAmountSpent)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('customers.currentCreditUsed')}</p>
                      <p className="text-2xl font-bold">{formatCurrency(selectedCustomer.currentCreditUsed || selectedCustomer.totalCredit)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('customers.remainingCredit')}</p>
                      <p className="text-2xl font-bold">{formatCurrency(selectedCustomer.remainingCredit)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('customers.creditStatus')}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className={selectedCustomer.creditStatus === 'BLOCKED' ? 'badge badge-red' : 'badge badge-green'}>
                          {selectedCustomer.creditStatus || 'AVAILABLE'}
                        </span>
                        <button onClick={handleResetPendingAmount} className="btn btn-secondary btn-sm">{t('common.reset')}</button>
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap gap-2">
                      {customerTabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`px-4 py-2 text-sm font-medium border-b-2 ${
                            activeTab === tab.id
                              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                              : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                          }`}
                        >
                          {t(tab.labelKey)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeTab === 'PURCHASED_ITEMS' && renderCategoryFilters(manualFilter, handleManualFilterChange)}
                  {activeTab === 'HISTORY' && renderCategoryFilters(invoiceFilter, handleInvoiceFilterChange)}

                  {detailsLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
                  ) : activeTab === 'HISTORY' ? (
                    renderInvoiceHistoryTable(visibleInvoiceHistory)
                  ) : (
                    renderManualItemsTable(currentManualRows)
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Eye className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h2 className="text-lg font-semibold mb-1">{t('customers.selectCustomer')}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('customers.selectCustomerHint')}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Modal
            isOpen={showCustomerModal}
            title={editingCustomer ? 'Edit Customer' : 'New Customer'}
            onClose={() => setShowCustomerModal(false)}
            size="lg"
          >
            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={customerForm.mobileNumber}
                  onChange={(e) => setCustomerForm({ ...customerForm, mobileNumber: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username (Farmer Portal Logins)</label>
                <input
                  type="text"
                  value={customerForm.username}
                  onChange={(e) => setCustomerForm({ ...customerForm, username: e.target.value })}
                  className="input"
                  placeholder="Optional username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  className="input"
                  placeholder="Optional email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <input
                    type="text"
                    value={customerForm.state}
                    onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={customerForm.pinCode}
                    onChange={(e) => setCustomerForm({ ...customerForm, pinCode: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Credit Limit</label>
                <input
                  type="number"
                  min="0"
                  value={customerForm.creditLimit}
                  onChange={(e) => setCustomerForm({ ...customerForm, creditLimit: e.target.value })}
                  className="input"
                />
              </div>
              {!editingCustomer && (
                <div>
                  <label className="block text-sm font-medium mb-1">Farmer Password</label>
                  <input
                    type="password"
                    value={customerForm.password}
                    onChange={(e) => setCustomerForm({ ...customerForm, password: e.target.value })}
                    className="input"
                    placeholder="Optional; farmer can log in with email OTP"
                  />
                </div>
              )}
              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary flex-1">Save</button>
                <button type="button" onClick={() => setShowCustomerModal(false)} className="btn btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </Modal>

          <Modal
            isOpen={showItemModal}
            title={editingItem ? 'Edit Purchased Item' : 'Add Purchased Item'}
            onClose={() => setShowItemModal(false)}
            size="lg"
          >
            <form onSubmit={handleSavePurchasedItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Search Products</label>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="input"
                  placeholder="Search by product, brand, or category"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <select
                  value={itemForm.productId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select product</option>
                  {filteredProducts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {item.brandName || item.brand} ({item.stockQuantity ?? item.currentStock ?? 0} {item.unitType || item.unit} available)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <input
                    type="text"
                    value={itemForm.category}
                    className="input"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    value={itemForm.purchaseDate}
                    onChange={(e) => setItemForm({ ...itemForm, purchaseDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>
              {itemForm.category === 'PESTICIDE' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Pesticide Weight *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={itemForm.pesticideWeight}
                      className="input"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Weight Unit *</label>
                    <select
                      value={itemForm.pesticideWeightUnit}
                      className="input"
                      disabled
                    >
                      <option value="Gram">Gram</option>
                      <option value="Kg">Kg</option>
                      <option value="ML">ML</option>
                      <option value="Litre">Litre</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Type *</label>
                  <input
                    type="text"
                    value={itemForm.unitType}
                    className="input"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price Per Unit *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.pricePerUnit}
                    className="input"
                    readOnly
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Available Stock</label>
                <input type="text" value={`${itemForm.availableStock || 0} ${itemForm.unitType || ''}`} className="input" readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total Amount</label>
                <input type="text" value={formatCurrency(itemTotalAmount)} className="input" readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={itemForm.notes}
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                  className="input min-h-[90px]"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={overrideCreditLimit} onChange={(e) => setOverrideCreditLimit(e.target.checked)} />
                Admin override credit limit
              </label>
              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary flex-1">Save Item</button>
                <button type="button" onClick={() => setShowItemModal(false)} className="btn btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </Modal>
        </main>
      </div>
    </div>
  );
};
