import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { Modal } from '../components/Modal';
import { useNotificationContext } from '../components/Notification';
import { useConfirm } from '../components/ConfirmProvider';
import { showError } from '../utils/notificationService';
import api from '../utils/api';
import { formatDate, formatCurrency } from '../utils/helpers';
import { Plus, Trash2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    invoiceId: '',
    customerId: '',
    amount: '',
    paymentMethod: 'CASH',
    referenceNumber: '',
    notes: '',
  });

  const { addNotification } = useNotificationContext();
  const { confirm } = useConfirm();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchPayments();
    fetchCustomers();
    fetchInvoices();
  }, [search]);

  const fetchPayments = async () => {
    try {
      const params = search ? { search } : {};
      const response = await api.get('/payments', { params });
      setPayments(response.data.data);
    } catch (error) {
      showError(error, 'Error fetching payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/invoices');
      setInvoices(response.data.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
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

  const unpaidInvoices = invoices.filter((invoice) => getInvoiceDueAmount(invoice) > 0 && invoice.status !== 'PAID' && invoice.paymentStatus !== 'PAID');
  const showPending = searchParams.get('filter') === 'pending';

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        invoiceId: formData.invoiceId,
        customerId: formData.customerId,
        amountPaid: Number(formData.amount || 0),
        paymentMethod: formData.paymentMethod,
        referenceNumber: formData.referenceNumber || undefined,
        note: formData.notes || undefined,
      };
      await api.post('/payments', payload);
      addNotification('Payment recorded successfully', 'success');
      setShowModal(false);
      setFormData({
        invoiceId: '',
        customerId: '',
        amount: '',
        paymentMethod: 'CASH',
        referenceNumber: '',
        notes: '',
      });
      fetchPayments();
      fetchInvoices();
      fetchCustomers();
    } catch (error) {
      showError(error, 'Error recording payment');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete payment record',
      description: 'This payment deletion is irreversible. Continue?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      // API endpoint for deleting payment would need to be implemented
      addNotification('Payment delete feature coming soon', 'info');
    } catch (error) {
      showError(error, 'Error deleting payment');
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{t('nav.payments')}</h1>
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2" /> Record Payment
            </button>
          </div>

          <div className="card mb-6">
            <div className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search payments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('customers.title')}</th>
                  <th>{t('common.amount')}</th>
                  <th>Method</th>
                  <th>{t('common.date')}</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {showPending
                  ? unpaidInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.customer?.name || invoice.customerSnapshot?.name || '-'}</td>
                      <td>{formatCurrency(getInvoiceDueAmount(invoice))}</td>
                      <td>{invoice.paymentMethod || '-'}</td>
                      <td>{formatDate(invoice.invoiceDate)}</td>
                      <td>{invoice.invoiceNumber || '-'}</td>
                    </tr>
                  ))
                  : payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.customer?.name}</td>
                      <td>{formatCurrency(payment.amount)}</td>
                      <td>{payment.paymentMethod}</td>
                      <td>{formatDate(payment.paymentDate)}</td>
                      <td>{payment.invoice?.invoiceNumber || '-'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <Modal isOpen={showModal} title="Record Payment" onClose={() => setShowModal(false)} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Customer *</label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value, invoiceId: '', amount: '' })}
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

              <div>
                <label className="block text-sm font-medium mb-1">Unpaid Invoice *</label>
                <select
                  value={formData.invoiceId}
                  onChange={(e) => {
                    const invoice = unpaidInvoices.find((item) => item.id === e.target.value);
                    setFormData({
                      ...formData,
                      invoiceId: e.target.value,
                      customerId: invoice ? getInvoiceCustomerId(invoice) : formData.customerId,
                      amount: invoice ? String(getInvoiceDueAmount(invoice)) : '',
                    });
                  }}
                  className="input"
                  required
                >
                  <option value="">Select unpaid invoice</option>
                  {unpaidInvoices
                    .filter((invoice) => !formData.customerId || getInvoiceCustomerId(invoice) === formData.customerId)
                    .map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} - {invoice.customerSnapshot?.name || invoice.customer?.name || 'Customer'} - Due {formatCurrency(getInvoiceDueAmount(invoice))}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="input"
                  min="0.01"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">Payment must clear the selected invoice due amount.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Method *</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="input"
                >
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reference Number</label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="input"
                />
              </div>

              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary flex-1">
                  Record Payment
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
