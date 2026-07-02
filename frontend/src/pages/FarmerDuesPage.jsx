import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import {
  Calendar,
  Clock,
  Download,
  Edit,
  Eye,
  FileDown,
  FileSpreadsheet,
  MessageCircle,
  Plus,
  Printer,
  Search,
  Trash2,
  WalletCards,
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { Modal } from '../components/Modal';
import { StatCard } from '../components/StatCard';
import { useConfirm } from '../components/ConfirmProvider';
import { useNotificationContext } from '../components/Notification';
import { useDebounce } from '../hooks/useDebounce';
import api from '../utils/api';
import { formatCurrency, formatDate, validatePhone } from '../utils/helpers';
import { showError } from '../utils/notificationService';
import { useTranslation } from 'react-i18next';

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, Tooltip);

const emptyForm = {
  farmerName: '',
  phoneNumber: '',
  village: '',
  dueAmount: '',
  description: '',
};

const statuses = ['', 'Pending', 'Partially Paid', 'Paid'];
const sortOptions = ['latest', 'oldest', 'highestDue', 'lowestDue', 'farmerNameAZ'];

const statusBadge = (status) => {
  if (status === 'Paid') return 'badge badge-green';
  if (status === 'Partially Paid') return 'badge badge-blue';
  return 'badge badge-yellow';
};

const STATUS_COLORS = {
  Pending: '#f59e0b',
  'Partially Paid': '#3b82f6',
  Paid: '#10b981',
};

const PAYMENT_METHODS = ['Cash', 'UPI', 'Cheque', 'Bank Transfer', 'Other'];

const buildExportRows = (dues, t) => dues.map((due) => ({
  [t('farmerDues.fields.farmerName')]: due.farmerName,
  [t('farmerDues.fields.phoneNumber')]: due.phoneNumber,
  [t('farmerDues.fields.village')]: due.village,
  [t('farmerDues.fields.dueAmount')]: Number(due.dueAmount || 0).toFixed(2),
  [t('farmerDues.fields.paidAmount')]: Number(due.paidAmount || 0).toFixed(2),
  [t('farmerDues.fields.remainingAmount')]: Number(due.remainingAmount || 0).toFixed(2),
  [t('common.status')]: t(`farmerDues.status.${due.status}`),
  [t('farmerDues.fields.createdDate')]: formatDate(due.createdAt),
  [t('farmerDues.fields.description')]: due.description || '',
}));

const downloadTextFile = (content, fileName, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const toCsv = (rows) => {
  const headers = Object.keys(rows[0] || {});
  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(','))].join('\n');
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const toHtmlTable = (rows) => {
  const headers = Object.keys(rows[0] || {});
  const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
  const bodyHtml = rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
};

const openPrintReport = (dues, title, t) => {
  const rows = buildExportRows(dues, t);
  const printWindow = window.open('', '_blank', 'width=1100,height=800');
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
          h1 { margin: 0 0 16px; font-size: 22px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background: #ecfdf5; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        ${toHtmlTable(rows)}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const downloadPdf = (rows, title) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 22);
  const headers = Object.keys(rows[0] || {});
  doc.autoTable({
    startY: 28,
    head: [headers],
    body: rows.map((row) => headers.map((h) => row[h])),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 185, 129] },
  });
  doc.save(`farmer-dues-${new Date().toISOString().slice(0, 10)}.pdf`);
};

const getDueAge = (createdAt) => {
  const days = Math.floor((Date.now() - new Date(createdAt)) / (1000 * 60 * 60 * 24));
  if (days <= 7) return { label: 'New', className: 'badge badge-green' };
  if (days <= 30) return { label: `${days}d`, className: 'badge badge-yellow' };
  if (days <= 90) return { label: `${days}d`, className: 'badge badge-orange' };
  return { label: `${days}d ⚠️`, className: 'badge badge-red' };
};

export const FarmerDuesPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialStatus = statuses.includes(searchParams.get('status')) ? searchParams.get('status') : '';
  const [dues, setDues] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    farmerName: '',
    phoneNumber: '',
    village: '',
    status: initialStatus,
    startDate: '',
    endDate: '',
    sort: 'latest',
  });
  const [formData, setFormData] = useState(emptyForm);
  const [editingDue, setEditingDue] = useState(null);
  const [viewingDue, setViewingDue] = useState(null);
  const [paymentDue, setPaymentDue] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const { addNotification } = useNotificationContext();
  const { confirm } = useConfirm();
  const debouncedFilters = useDebounce(filters, 400);

  const queryParams = useMemo(() => ({
    ...Object.fromEntries(Object.entries(debouncedFilters).filter(([, value]) => value)),
    page: pagination.page,
    limit: pagination.limit,
  }), [debouncedFilters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchDues();
  }, [queryParams]);

  useEffect(() => {
    fetchSummary();
  }, [debouncedFilters]);

  const fetchDues = async () => {
    try {
      setLoading(true);
      const response = await api.get('/farmer-dues', { params: queryParams });
      setDues(response.data.data || []);
      setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (error) {
      showError(error, t('farmerDues.errors.fetchDues'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = {};
      if (debouncedFilters.startDate) params.startDate = debouncedFilters.startDate;
      if (debouncedFilters.endDate) params.endDate = debouncedFilters.endDate;
      if (debouncedFilters.status) params.status = debouncedFilters.status;
      const response = await api.get('/farmer-dues/summary', { params });
      setSummary(response.data.data);
    } catch (error) {
      showError(error, t('farmerDues.errors.fetchSummary'));
    }
  };

  const fetchAllForExport = async () => {
    try {
      setExporting(true);
      const params = { ...Object.fromEntries(Object.entries(debouncedFilters).filter(([, v]) => v)), page: 1, limit: 1000 };
      const response = await api.get('/farmer-dues', { params });
      return response.data.data || [];
    } catch (error) {
      showError(error, t('farmerDues.errors.fetchDues'));
      return [];
    } finally {
      setExporting(false);
    }
  };

  const handleExport = async (exportFn) => {
    const allDues = await fetchAllForExport();
    if (allDues.length === 0) return;
    const rows = buildExportRows(allDues, t);
    exportFn(rows);
  };

  const validateForm = () => {
    if (!formData.farmerName.trim()) return t('farmerDues.validation.farmerNameRequired');
    if (!validatePhone(formData.phoneNumber)) return t('farmerDues.validation.phoneInvalid');
    if (!formData.village.trim()) return t('farmerDues.validation.villageRequired');
    if (!Number.isFinite(Number(formData.dueAmount)) || Number(formData.dueAmount) <= 0) return t('farmerDues.validation.dueAmountPositive');
    if (editingDue && Number(formData.dueAmount) < Number(editingDue.paidAmount || 0)) return t('farmerDues.validation.dueAmountBelowPaid');
    return null;
  };

  const openAddForm = () => {
    setEditingDue(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (due) => {
    setEditingDue(due);
    setFormData({
      farmerName: due.farmerName || '',
      phoneNumber: due.phoneNumber || '',
      village: due.village || '',
      dueAmount: String(due.dueAmount || ''),
      description: due.description || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const error = validateForm();
    if (error) {
      addNotification(error, 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = { ...formData, dueAmount: Number(formData.dueAmount), phoneNumber: formData.phoneNumber.replace(/\D/g, '') };
      if (editingDue) {
        await api.put(`/farmer-dues/${editingDue.id}`, payload);
        addNotification(t('farmerDues.toasts.updated'), 'success');
      } else {
        await api.post('/farmer-dues', payload);
        addNotification(t('farmerDues.toasts.added'), 'success');
      }
      setIsFormOpen(false);
      await Promise.all([fetchDues(), fetchSummary()]);
    } catch (requestError) {
      showError(requestError, editingDue ? t('farmerDues.errors.updateDue') : t('farmerDues.errors.addDue'));
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async (event) => {
    event.preventDefault();
    const amount = Number(paymentAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      addNotification(t('farmerDues.validation.paymentAmountPositive'), 'error');
      return;
    }
    if (amount > Number(paymentDue?.remainingAmount || 0)) {
      addNotification(t('farmerDues.validation.paymentExceedsRemaining'), 'error');
      return;
    }

    try {
      setSaving(true);
      await api.post(`/farmer-dues/${paymentDue.id}/payment`, { paymentAmount: amount, paymentMethod, notes: paymentNotes });
      addNotification(t('farmerDues.toasts.paymentRecorded'), 'success');
      setPaymentDue(null);
      setPaymentAmount('');
      setPaymentMethod('Cash');
      setPaymentNotes('');
      await Promise.all([fetchDues(), fetchSummary()]);
    } catch (error) {
      showError(error, t('farmerDues.errors.recordPayment'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (due) => {
    const confirmed = await confirm({
      title: t('farmerDues.confirmDeleteTitle'),
      description: t('farmerDues.confirmDeleteDescription', { name: due.farmerName }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
    });
    if (!confirmed) return;

    try {
      await api.delete(`/farmer-dues/${due.id}`);
      addNotification(t('farmerDues.toasts.deleted'), 'success');
      await Promise.all([fetchDues(), fetchSummary()]);
    } catch (error) {
      showError(error, t('farmerDues.errors.deleteDue'));
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({ search: '', farmerName: '', phoneNumber: '', village: '', status: '', startDate: '', endDate: '', sort: 'latest' });
    setPagination((current) => ({ ...current, page: 1 }));
  };


  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="page-heading mb-0">
              <span className="eyebrow">{t('farmerDues.admin')}</span>
              <h1 className="text-3xl font-bold">{t('farmerDues.title')}</h1>
            </div>
            <button type="button" onClick={openAddForm} className="btn btn-primary">
              <Plus className="h-4 w-4" /> {t('farmerDues.addDue')}
            </button>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title={t('farmerDues.cards.totalDueAmount')} value={formatCurrency(summary?.totalDueAmount)} icon={WalletCards} color="red" />
            <StatCard title={t('farmerDues.cards.totalPendingFarmers')} value={summary?.totalPendingFarmers || 0} icon={WalletCards} color="yellow" />
            <StatCard title={t('farmerDues.cards.totalPartiallyPaid')} value={summary?.totalPartiallyPaid || 0} icon={WalletCards} color="blue" />
            <StatCard title={t('farmerDues.cards.totalPaidToday')} value={formatCurrency(summary?.totalPaidToday)} icon={WalletCards} color="emerald" />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
            <div className="card">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative col-span-1 md:col-span-2 xl:col-span-4">
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input className="input pl-10" value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} placeholder={t('farmerDues.searchPlaceholder')} />
                </div>
                <select className="input" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                  {statuses.map((status) => <option key={status || 'all'} value={status}>{status ? t(`farmerDues.status.${status}`) : t('farmerDues.filters.allStatuses')}</option>)}
                </select>
                <select className="input" value={filters.sort} onChange={(e) => handleFilterChange('sort', e.target.value)}>
                  {sortOptions.map((sort) => <option key={sort} value={sort}>{t(`farmerDues.sort.${sort}`)}</option>)}
                </select>
                <input className="input" type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} />
                <input className="input" type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>{t('common.reset')}</button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={exporting} onClick={() => handleExport((rows) => downloadTextFile(toCsv(rows), 'farmer-dues.csv', 'text/csv'))}>
                  <Download className="h-4 w-4" /> {exporting ? '...' : t('farmerDues.export.csv')}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={exporting} onClick={() => handleExport((rows) => downloadTextFile(toHtmlTable(rows), 'farmer-dues.xls', 'application/vnd.ms-excel'))}>
                  <FileSpreadsheet className="h-4 w-4" /> {exporting ? '...' : t('farmerDues.export.excel')}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={exporting} onClick={async () => { const allDues = await fetchAllForExport(); if (allDues.length) openPrintReport(allDues, t('farmerDues.report.listTitle'), t); }}>
                  <Printer className="h-4 w-4" /> {exporting ? '...' : t('farmerDues.export.print')}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={exporting} onClick={() => handleExport((rows) => downloadPdf(rows, t('farmerDues.report.pdfTitle')))}>
                  <FileDown className="h-4 w-4" /> {exporting ? '...' : t('farmerDues.export.pdf')}
                </button>
              </div>
            </div>

            <div className="card h-80">
              <h2 className="mb-4 text-xl font-bold">{t('farmerDues.chart.pendingVsPaid')}</h2>
              <Bar
                options={chartOptions}
                data={{
                  labels: (summary?.statusChart || []).map((item) => t(`farmerDues.status.${item.status}`)),
                  datasets: [{ label: t('farmerDues.chart.farmers'), data: (summary?.statusChart || []).map((item) => item.count), backgroundColor: (summary?.statusChart || []).map((item) => STATUS_COLORS[item.status] || '#94a3b8') }],
                }}
              />
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="table min-w-[1050px]">
              <thead>
                <tr>
                  <th>{t('farmerDues.fields.farmerName')}</th>
                  <th>{t('farmerDues.fields.phoneNumber')}</th>
                  <th>{t('farmerDues.fields.village')}</th>
                  <th>{t('farmerDues.fields.dueAmount')}</th>
                  <th>{t('farmerDues.fields.paidAmount')}</th>
                  <th>{t('farmerDues.fields.remainingAmount')}</th>
                  <th>Progress</th>
                  <th>{t('common.status')}</th>
                  <th>Age</th>
                  <th>{t('farmerDues.fields.createdDate')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="11">{t('common.loading')}</td></tr>
                ) : dues.length === 0 ? (
                  <tr><td colSpan="11">{t('farmerDues.empty')}</td></tr>
                ) : dues.map((due) => (
                  <tr key={due.id}>
                    <td className="font-semibold">{due.farmerName}</td>
                    <td>{due.phoneNumber}</td>
                    <td>{due.village}</td>
                    <td>{formatCurrency(due.dueAmount)}</td>
                    <td>{formatCurrency(due.paidAmount)}</td>
                    <td>{formatCurrency(due.remainingAmount)}</td>
                    <td>
                      {(() => {
                        const paidPercent = due.dueAmount > 0 ? Math.min((due.paidAmount / due.dueAmount) * 100, 100) : 0;
                        const barColor = paidPercent >= 100 ? '#10b981' : paidPercent >= 50 ? '#3b82f6' : paidPercent >= 1 ? '#f59e0b' : '#e2e8f0';
                        return (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 rounded-full bg-slate-200 dark:bg-gray-700">
                              <div className="h-2 rounded-full transition-all" style={{ width: `${paidPercent}%`, backgroundColor: barColor }} />
                            </div>
                            <span className="text-xs font-medium text-slate-500">{Math.round(paidPercent)}%</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td><span className={statusBadge(due.status)}>{t(`farmerDues.status.${due.status}`)}</span></td>
                    <td>
                      {due.status === 'Paid'
                        ? <span className="badge badge-green">✓ Cleared</span>
                        : (() => { const age = getDueAge(due.createdAt); return <span className={age.className}><Clock className="mr-1 inline h-3 w-3" />{age.label}</span>; })()
                      }
                    </td>
                    <td>{formatDate(due.createdAt)}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setViewingDue(due)} title={t('common.view')}><Eye className="h-4 w-4" /></button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditForm(due)} title={t('common.edit')}><Edit className="h-4 w-4" /></button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setPaymentDue(due); setPaymentAmount(''); }} disabled={Number(due.remainingAmount || 0) <= 0} title={t('farmerDues.recordPayment')}><WalletCards className="h-4 w-4" /></button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(`/installment-planner?dueId=${due.id}`)} title="Installment Planner"><Calendar className="h-4 w-4" /></button>
                        {Number(due.remainingAmount || 0) > 0 && (
                          <a
                            href={`https://wa.me/91${due.phoneNumber}?text=${encodeURIComponent(`Dear ${due.farmerName}, you have a pending due of ₹${due.remainingAmount} at our shop. Kindly clear it at your earliest convenience. Thank you.`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm"
                            style={{ backgroundColor: '#25D366', color: '#fff' }}
                            title="Send WhatsApp Reminder"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(due)} title={t('common.delete')}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-500">{t('farmerDues.pagination', { page: pagination.page, totalPages: pagination.totalPages, total: pagination.total })}</span>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary btn-sm" disabled={pagination.page <= 1} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}>{t('common.previous')}</button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}>{t('common.next')}</button>
            </div>
          </div>

          <Modal isOpen={isFormOpen} title={editingDue ? t('farmerDues.editDue') : t('farmerDues.addDue')} onClose={() => setIsFormOpen(false)} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="form-label">{t('farmerDues.fields.farmerName')} *</label>
                  <input className="input" value={formData.farmerName} onChange={(e) => setFormData({ ...formData, farmerName: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">{t('farmerDues.fields.phoneNumber')} *</label>
                  <input className="input" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">{t('farmerDues.fields.village')} *</label>
                  <input className="input" value={formData.village} onChange={(e) => setFormData({ ...formData, village: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">{t('farmerDues.fields.dueAmount')} *</label>
                  <input className="input" type="number" min="0.01" step="0.01" value={formData.dueAmount} onChange={(e) => setFormData({ ...formData, dueAmount: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="form-label">{t('farmerDues.fields.description')}</label>
                <textarea className="textarea" rows="3" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary flex-1" disabled={saving}>{t('common.save')}</button>
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setIsFormOpen(false)}>{t('common.cancel')}</button>
              </div>
            </form>
          </Modal>

          <Modal isOpen={Boolean(paymentDue)} title={t('farmerDues.recordPayment')} onClose={() => setPaymentDue(null)} size="md">
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-gray-900">
                <div className="text-sm text-slate-500">{t('farmerDues.fields.remainingAmount')}</div>
                <div className="text-2xl font-bold">{formatCurrency(paymentDue?.remainingAmount)}</div>
              </div>
              <div>
                <label className="form-label">{t('farmerDues.fields.paymentAmount')} *</label>
                <input className="input" type="number" min="0.01" max={paymentDue?.remainingAmount || undefined} step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
              </div>
              <div>
                <label className="form-label">{t('farmerDues.fields.paymentMethod') || 'Payment Method'}</label>
                <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Notes</label>
                <input className="input" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="Optional payment notes" />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={saving}>{t('farmerDues.savePayment')}</button>
            </form>
          </Modal>

          <Modal isOpen={Boolean(viewingDue)} title={t('farmerDues.dueDetails')} onClose={() => setViewingDue(null)} size="lg">
            {viewingDue && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    [t('farmerDues.fields.farmerName'), viewingDue.farmerName],
                    [t('farmerDues.fields.phoneNumber'), viewingDue.phoneNumber],
                    [t('farmerDues.fields.village'), viewingDue.village],
                    [t('farmerDues.fields.dueAmount'), formatCurrency(viewingDue.dueAmount)],
                    [t('farmerDues.fields.paidAmount'), formatCurrency(viewingDue.paidAmount)],
                    [t('farmerDues.fields.remainingAmount'), formatCurrency(viewingDue.remainingAmount)],
                    [t('common.status'), t(`farmerDues.status.${viewingDue.status}`)],
                    [t('farmerDues.fields.createdDate'), formatDate(viewingDue.createdAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-3 dark:bg-gray-900">
                      <div className="text-xs uppercase text-slate-500">{label}</div>
                      <div className="font-semibold">{value || '-'}</div>
                    </div>
                  ))}
                </div>
                {viewingDue.description && <p className="rounded-lg bg-slate-50 p-3 dark:bg-gray-900">{viewingDue.description}</p>}
                <div>
                  <h3 className="mb-2 text-lg font-bold">{t('farmerDues.paymentHistory')}</h3>
                  <div className="space-y-2">
                    {(viewingDue.paymentHistory || []).length === 0 && <p className="text-sm text-slate-500">{t('farmerDues.noPayments')}</p>}
                    {(viewingDue.paymentHistory || []).map((payment) => (
                      <div key={payment.id || payment._id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm dark:bg-gray-900">
                        <span>{formatDate(payment.paymentDate)}</span>
                        <span className="badge badge-blue">{payment.paymentMethod || 'Cash'}</span>
                        {payment.notes && <span className="text-xs text-slate-400" title={payment.notes}>📝</span>}
                        <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Modal>
        </main>
      </div>
    </div>
  );
};
