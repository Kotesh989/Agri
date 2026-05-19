import { useState, useEffect, useMemo } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { Modal } from '../components/Modal';
import { useNotificationContext } from '../components/Notification';
import { useConfirm } from '../components/ConfirmProvider';
import { showError } from '../utils/notificationService';
import api from '../utils/api';
import { formatDate, formatCurrency, getStatusColor } from '../utils/helpers';
import { CheckCircle2, Download, Plus, Printer, Search, Share2, Trash2 } from 'lucide-react';
import QRCode from 'react-qr-code';

export const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    customerId: '',
    items: [{ productId: '', quantity: 0, unitPrice: 0, gstPercentage: 0 }],
    paymentMethod: 'CASH',
    notes: '',
    discount: 0,
    roundOff: 0,
    amountPaid: 0,
    dueDate: '',
    overrideCreditLimit: false,
  });

  const { addNotification } = useNotificationContext();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchProducts();
    fetchSettings();
  }, [search]);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data.data || null);
    } catch (error) {
      setSettings(null);
    }
  };

  useEffect(() => {
    if (formData.customerId) {
      fetchCustomerDetails(formData.customerId);
    } else {
      setSelectedCustomer(null);
    }
  }, [formData.customerId]);

  const fetchInvoices = async () => {
    try {
      const params = search ? { search } : {};
      const response = await api.get('/invoices', { params });
      setInvoices(response.data.data || []);
    } catch (error) {
      showError(error, 'Error fetching invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data.data || []);
    } catch (error) {
      showError(error, 'Error fetching customers');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data.data || []);
    } catch (error) {
      showError(error, 'Error fetching products');
    }
  };

  const fetchCustomerDetails = async (customerId) => {
    try {
      const response = await api.get(`/customers/${customerId}`);
      setSelectedCustomer(response.data.data || null);
    } catch (error) {
      setSelectedCustomer(null);
    }
  };

  const getProductById = (id) => products.find((product) => product.id === id) || {};

  const upiPaymentUrl = settings?.upiId
    ? `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.accountHolderName || '')}&cu=INR`
    : '';

  const invoiceSummary = useMemo(() => {
    const subTotal = formData.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
    const gstAmount = formData.items.reduce((sum, item) => {
      const itemTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
      return sum + (itemTotal * (Number(item.gstPercentage || 0) / 100));
    }, 0);
    const discount = Number(formData.discount || 0);
    const roundOff = Number(formData.roundOff || 0);
    const totalAmount = Number((subTotal + gstAmount - discount + roundOff).toFixed(2));
    const paidAmount = Number(formData.amountPaid || 0);
    const balanceDue = Number((totalAmount - paidAmount).toFixed(2));
    return {
      subTotal,
      gstAmount,
      discount,
      roundOff,
      totalAmount,
      paidAmount,
      balanceDue: Math.max(balanceDue, 0),
    };
  }, [formData.items, formData.discount, formData.roundOff, formData.amountPaid]);

  const insufficientStockItems = useMemo(() => {
    return formData.items.filter((item) => {
      const product = getProductById(item.productId);
      const available = Number(product.stockQuantity ?? product.currentStock ?? 0);
      return item.productId && Number(item.quantity || 0) > available;
    });
  }, [formData.items, products]);

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 0, unitPrice: 0, gstPercentage: 0 }],
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (index, changes) => {
    const items = [...formData.items];
    items[index] = { ...items[index], ...changes };
    setFormData({ ...formData, items });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerId) {
      showError('Please select a customer');
      return;
    }
    if (formData.items.length === 0 || formData.items.some((item) => !item.productId || item.quantity <= 0)) {
      showError('Please add at least one valid product line item');
      return;
    }
    if (insufficientStockItems.length > 0) {
      showError('One or more invoice items exceed available stock. Adjust quantities before submitting');
      return;
    }

    try {
      const payload = {
        customerId: formData.customerId,
        items: formData.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
        })),
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
        discount: Number(formData.discount || 0),
        roundOff: Number(formData.roundOff || 0),
        amountPaid: Number(formData.amountPaid || 0),
        dueDate: formData.dueDate || undefined,
        overrideCreditLimit: formData.overrideCreditLimit,
      };

      await api.post('/invoices', payload);
      addNotification('Invoice created successfully', 'success');
      setShowModal(false);
      setFormData({
        customerId: '',
        items: [{ productId: '', quantity: 0, unitPrice: 0, gstPercentage: 0 }],
        paymentMethod: 'CASH',
        notes: '',
        discount: 0,
        roundOff: 0,
        amountPaid: 0,
        dueDate: '',
        overrideCreditLimit: false,
      });
      setSelectedCustomer(null);
      fetchInvoices();
    } catch (error) {
      showError(error, 'Error creating invoice');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete invoice',
      description: 'Delete this invoice permanently? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await api.delete(`/invoices/${id}`);
      addNotification('Invoice deleted successfully', 'success');
      fetchInvoices();
    } catch (error) {
      showError(error, 'Error deleting invoice');
    }
  };

  const getInvoiceCustomerId = (invoice) => {
    if (!invoice) return '';
    if (typeof invoice.customerId === 'string') return invoice.customerId;
    return invoice.customerId?.id || invoice.customer?._id || invoice.customer?.id || '';
  };

  const getInvoiceDueAmount = (invoice) => {
    const total = Number(invoice?.totalAmount || 0);
    const paid = Number(invoice?.paidAmount ?? invoice?.amountPaid ?? 0);
    return Number((Number(invoice?.balanceDue ?? invoice?.dueAmount ?? (total - paid))).toFixed(2));
  };

  const handleClearDue = async (invoice) => {
    const dueAmount = getInvoiceDueAmount(invoice);
    if (dueAmount <= 0 || invoice.status === 'PAID' || invoice.paymentStatus === 'PAID') {
      addNotification('Invoice already paid', 'info');
      return;
    }

    const confirmed = await confirm({
      title: 'Mark invoice as paid',
      description: `Clear due amount ${formatCurrency(dueAmount)} for invoice ${invoice.invoiceNumber}?`,
      confirmText: 'Mark as Paid',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await api.post('/payments', {
        invoiceId: invoice.id,
        customerId: getInvoiceCustomerId(invoice),
        farmerId: invoice.farmerUserId || undefined,
        amountPaid: dueAmount,
        paymentMethod: 'CASH',
        note: `Clear due for invoice ${invoice.invoiceNumber}`,
      });
      addNotification('Invoice marked as paid successfully', 'success');
      fetchInvoices();
      fetchCustomers();
    } catch (error) {
      showError(error, 'Error clearing invoice due');
    }
  };

  const openPdf = (url) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  const shareWhatsApp = (invoice) => {
    const text = `Invoice ${invoice.invoiceNumber} for ${formatCurrency(invoice.totalAmount)} is ready. Balance due: ${formatCurrency(invoice.balanceDue || 0)}.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const getCustomerSummary = () => {
    if (!selectedCustomer) return null;
    return (
      <div className="card mb-4">
        <h2 className="text-lg font-semibold mb-3">Customer details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Name</div>
            <div className="font-medium">{selectedCustomer.name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Mobile</div>
            <div className="font-medium">{selectedCustomer.mobileNumber}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Village</div>
            <div className="font-medium">{selectedCustomer.village || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">GST Number</div>
            <div className="font-medium">{selectedCustomer.gstNumber || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Outstanding Balance</div>
            <div className="font-medium text-red-600">{formatCurrency(selectedCustomer.totalCredit || 0)}</div>
          </div>
        </div>
      </div>
    );
  };

  const invoiceSummaryCard = () => (
    <div className="card mb-4">
      <h2 className="text-lg font-semibold mb-3">Invoice summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Subtotal</div>
          <div className="text-xl font-semibold">{formatCurrency(invoiceSummary.subTotal)}</div>
        </div>
        <div className="p-4 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">GST</div>
          <div className="text-xl font-semibold">{formatCurrency(invoiceSummary.gstAmount)}</div>
        </div>
        <div className="p-4 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Discount</div>
          <div className="text-xl font-semibold">-{formatCurrency(invoiceSummary.discount)}</div>
        </div>
        <div className="p-4 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Round Off</div>
          <div className="text-xl font-semibold">{formatCurrency(invoiceSummary.roundOff)}</div>
        </div>
        <div className="p-4 bg-white rounded border col-span-1 md:col-span-1">
          <div className="text-sm text-gray-600">Grand Total</div>
          <div className="text-2xl font-bold">{formatCurrency(invoiceSummary.totalAmount)}</div>
        </div>
        <div className="p-4 bg-white rounded border col-span-1 md:col-span-1">
          <div className="text-sm text-gray-600">Amount Paid</div>
          <div className="text-2xl font-bold">{formatCurrency(invoiceSummary.paidAmount)}</div>
        </div>
        <div className="p-4 bg-white rounded border col-span-1 md:col-span-2">
          <div className="text-sm text-gray-600">Balance Due</div>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(invoiceSummary.balanceDue)}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
            <h1 className="text-3xl font-bold">Sales / Invoices</h1>
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2" /> New Invoice
            </button>
          </div>

          <div className="card mb-6">
            <div className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="table min-w-[980px]">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceNumber}</td>
                    <td>{invoice.customerSnapshot?.name || invoice.customer?.name}</td>
                    <td>{formatDate(invoice.invoiceDate)}</td>
                    <td>{formatCurrency(invoice.totalAmount)}</td>
                    <td>{formatCurrency(invoice.paidAmount)}</td>
                    <td>{formatCurrency(invoice.balanceDue)}</td>
                    <td>
                      <span className={`badge ${getStatusColor(invoice.status)}`}>{invoice.status}</span>
                    </td>
                    <td className="flex items-center gap-2">
                      {getInvoiceDueAmount(invoice) > 0 && invoice.status !== 'PAID' && (
                        <button type="button" onClick={() => handleClearDue(invoice)} className="btn btn-primary btn-sm" title="Clear due and mark invoice paid">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="hidden xl:inline">Mark Paid</span>
                        </button>
                      )}
                      {invoice.pdfUrl && (
                        <button type="button" onClick={() => openPdf(invoice.pdfUrl)} className="btn btn-secondary btn-sm" title="Download PDF">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      {invoice.pdfUrl && (
                        <button type="button" onClick={() => openPdf(invoice.pdfUrl)} className="btn btn-secondary btn-sm" title="Print invoice">
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                      <button type="button" onClick={() => shareWhatsApp(invoice)} className="btn btn-secondary btn-sm" title="Share via WhatsApp">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(invoice.id)} className="btn btn-danger btn-sm" title="Delete invoice">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && invoices.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-500">
                      No invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Modal isOpen={showModal} title="New Invoice" onClose={() => setShowModal(false)} size="xl">
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1">Customer *</label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.mobileNumber}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && getCustomerSummary()}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method *</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="input"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CREDIT">Credit</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    checked={formData.overrideCreditLimit}
                    onChange={(e) => setFormData({ ...formData, overrideCreditLimit: e.target.checked })}
                  />
                  <span className="text-sm">Admin override credit limit</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Items</label>
                {formData.items.map((item, index) => {
                  const product = getProductById(item.productId);
                  const availableStock = Number(product.stockQuantity ?? product.currentStock ?? 0);
                  return (
                    <div key={index} className="grid grid-cols-1 xl:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 mb-2 p-3 bg-gray-100 rounded">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const productId = e.target.value;
                          const selectedProduct = getProductById(productId);
                          handleItemChange(index, {
                            productId,
                            unitPrice: Number(selectedProduct.pricePerUnit ?? selectedProduct.sellingPrice ?? 0),
                            gstPercentage: Number(selectedProduct.gstRate ?? selectedProduct.gstPercentage ?? 0),
                          });
                        }}
                        className="input"
                        required
                      >
                        <option value="">Select Product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.category})
                          </option>
                        ))}
                      </select>
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, { quantity: Number(e.target.value) })}
                          className="input"
                          placeholder="Qty"
                          required
                        />
                        {item.productId && (
                          <div className="text-xs text-gray-500 mt-1">In stock: {availableStock}</div>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, { unitPrice: Number(e.target.value) })}
                        className="input"
                        placeholder="Price"
                        required
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.gstPercentage}
                        onChange={(e) => handleItemChange(index, { gstPercentage: Number(e.target.value) })}
                        className="input"
                        placeholder="GST %"
                      />
                      <button type="button" onClick={() => handleRemoveItem(index)} className="btn btn-danger btn-sm">
                        Remove
                      </button>
                    </div>
                  );
                })}
                <button type="button" onClick={handleAddItem} className="btn btn-secondary btn-sm">
                  Add Item
                </button>
                {insufficientStockItems.length > 0 && (
                  <div className="mt-2 text-sm text-red-600">
                    Some items exceed available stock. Please lower quantities before creating the invoice.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Discount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Round Off</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.roundOff}
                    onChange={(e) => setFormData({ ...formData, roundOff: Number(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount Paid</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amountPaid}
                    onChange={(e) => setFormData({ ...formData, amountPaid: Number(e.target.value) })}
                    className="input"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, amountPaid: 0, paymentMethod: 'CREDIT' })}
                    className="btn btn-secondary btn-sm mt-2 w-full justify-center"
                  >
                    Create as Unpaid
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input min-h-[90px]"
                  />
                </div>
              </div>

              {(settings?.upiId || settings?.customUpiQrImageUrl) && (
                <div className="card mb-4">
                  <h2 className="text-lg font-semibold mb-3">Scan to Pay</h2>
                  <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
                    <div className="rounded border p-3 bg-white">
                      {settings?.customUpiQrImageUrl ? (
                        <img src={settings.customUpiQrImageUrl} alt="UPI QR" className="max-w-[180px]" />
                      ) : (
                        <QRCode value={upiPaymentUrl} size={180} />
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      <div className="font-medium">{settings?.upiId || 'UPI payment details'}</div>
                      {settings?.accountHolderName && <div>{settings.accountHolderName}</div>}
                      {settings?.bankName && <div>{settings.bankName}</div>}
                      <div className="text-xs text-gray-500">Use this QR code to pay the invoice via UPI.</div>
                    </div>
                  </div>
                </div>
              )}

              {invoiceSummaryCard()}

              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary flex-1">
                  Create Invoice
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </Modal>
        </main>
      </div>
    </div>
  );
};
