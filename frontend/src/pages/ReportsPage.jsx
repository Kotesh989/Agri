import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Download,
  FileText,
  IndianRupee,
  Percent,
  RefreshCw,
  Search,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { showError } from '../utils/notificationService';
import api from '../utils/api';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';
import { useTranslation } from 'react-i18next';

const reportTabs = [
  {
    id: 'sales',
    label: 'Sales Report',
    icon: BarChart3,
    endpoint: '/reports/sales',
    dataPath: (data) => data,
    columns: [
      { key: 'invoiceNumber', label: 'Invoice No.' },
      { key: 'customerName', label: 'Customer/Farmer' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'totalAmount', label: 'Total Amount', type: 'currency' },
      { key: 'paidAmount', label: 'Paid Amount', type: 'currency' },
      { key: 'balanceDue', label: 'Balance Due', type: 'currency' },
      { key: 'paymentStatus', label: 'Status', type: 'status' },
    ],
  },
  {
    id: 'profit',
    label: 'Profit Report',
    icon: IndianRupee,
    endpoint: '/reports/profit',
    dataPath: (data) => data?.rows || [],
    columns: [
      { key: 'productName', label: 'Product' },
      { key: 'quantitySold', label: 'Qty Sold', type: 'number' },
      { key: 'purchasePrice', label: 'Purchase Price', type: 'currency' },
      { key: 'sellingPrice', label: 'Selling Price', type: 'currency' },
      { key: 'profitAmount', label: 'Profit', type: 'currency' },
      { key: 'profitPercentage', label: 'Profit %', type: 'percent' },
    ],
  },
  {
    id: 'gst',
    label: 'GST Report',
    icon: Percent,
    endpoint: '/reports/gst',
    dataPath: (data) => data,
    columns: [
      { key: 'invoiceNumber', label: 'Invoice No.' },
      { key: 'gstRate', label: 'GST Rate', type: 'percent' },
      { key: 'taxableAmount', label: 'Taxable Amount', type: 'currency' },
      { key: 'cgst', label: 'CGST', type: 'currency' },
      { key: 'sgst', label: 'SGST', type: 'currency' },
      { key: 'totalGst', label: 'Total GST', type: 'currency' },
      { key: 'grandTotal', label: 'Grand Total', type: 'currency' },
    ],
  },
  {
    id: 'stock',
    label: 'Stock / Expiry',
    icon: Boxes,
    endpoint: '/reports/stock',
    dataPath: (data) => data,
    columns: [
      { key: 'name', label: 'Product' },
      { key: 'batchNumber', label: 'Batch No.' },
      { key: 'quantity', label: 'Current Stock', type: 'number' },
      { key: 'minimumStock', label: 'Minimum Stock', type: 'number' },
      { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
      { key: 'lowStock', label: 'Low Stock', type: 'boolean' },
      { key: 'expiryWarning', label: 'Expiry Warning' },
    ],
  },
  {
    id: 'low-stock',
    label: 'Low-stock Report',
    icon: AlertTriangle,
    endpoint: '/reports/stock',
    dataPath: (data) => (data || []).filter((row) => row.lowStock),
    columns: [
      { key: 'name', label: 'Product' },
      { key: 'batchNumber', label: 'Batch No.' },
      { key: 'quantity', label: 'Current Stock', type: 'number' },
      { key: 'minimumStock', label: 'Minimum Stock', type: 'number' },
      { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
    ],
  },
  {
    id: 'expiry',
    label: 'Expiry Report',
    icon: AlertTriangle,
    endpoint: '/reports/stock',
    dataPath: (data) => (data || []).filter((row) => row.expiryWarning && row.expiryWarning !== 'OK'),
    columns: [
      { key: 'name', label: 'Product' },
      { key: 'batchNumber', label: 'Batch No.' },
      { key: 'quantity', label: 'Current Stock', type: 'number' },
      { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
      { key: 'expiryWarning', label: 'Expiry Warning' },
    ],
  },
  {
    id: 'purchases',
    label: 'Purchase Report',
    icon: ShoppingBag,
    endpoint: '/reports/purchases',
    dataPath: (data) => data,
    columns: [
      { key: 'supplierName', label: 'Supplier' },
      { key: 'productName', label: 'Product' },
      { key: 'quantityPurchased', label: 'Qty Purchased', type: 'number' },
      { key: 'purchaseDate', label: 'Purchase Date', type: 'date' },
      { key: 'batchNumber', label: 'Batch No.' },
      { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
      { key: 'totalCost', label: 'Total Cost', type: 'currency' },
    ],
  },
  {
    id: 'outstanding',
    label: 'Customer Outstanding',
    icon: Users,
    endpoint: '/reports/customer-outstanding',
    dataPath: (data) => data,
    columns: [
      { key: 'name', label: 'Farmer/Customer' },
      { key: 'mobileNumber', label: 'Mobile' },
      { key: 'village', label: 'Village' },
      { key: 'totalInvoices', label: 'Invoices', type: 'number' },
      { key: 'totalPurchaseAmount', label: 'Purchase Amount', type: 'currency' },
      { key: 'totalPaid', label: 'Total Paid', type: 'currency' },
      { key: 'balanceDue', label: 'Balance Due', type: 'currency' },
    ],
  },
];

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatCell = (row, column, forExport = false) => {
  const value = row[column.key];
  if (value === null || value === undefined || value === '') return '-';
  if (column.type === 'currency') return formatCurrency(value);
  if (column.type === 'date') return value ? formatDate(value) : '-';
  if (column.type === 'percent') return `${Number(value || 0).toFixed(2)}%`;
  if (column.type === 'boolean') return value ? 'Yes' : 'No';
  if (column.type === 'number') return Number(value || 0).toLocaleString('en-IN');
  if (column.type === 'status' && forExport) return value;
  return value;
};

const buildCsv = (rows, columns) => {
  const csvRows = [
    columns.map((column) => `"${column.label.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      columns
        .map((column) => `"${String(formatCell(row, column, true)).replace(/"/g, '""')}"`)
        .join(',')
    ),
  ];
  return csvRows.join('\n');
};

const downloadFile = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const buildExcelHtml = (rows, columns) => `
  <html>
    <head><meta charset="UTF-8" /></head>
    <body>
      <table>
        <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(formatCell(row, column, true))}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </body>
  </html>
`;

const exportPdf = (title, rows, columns) => {
  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  if (!printWindow) {
    showError('Allow pop-ups to export this report as PDF.');
    return;
  }

  const tableRows = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((column) => `<td>${escapeHtml(formatCell(row, column, true))}</td>`)
          .join('')}</tr>`
    )
    .join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
          h1 { font-size: 22px; margin: 0 0 8px; }
          p { margin: 0 0 20px; color: #4b5563; }
          table { border-collapse: collapse; width: 100%; font-size: 11px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          th { background: #ecfdf5; color: #065f46; }
          tr:nth-child(even) { background: #f9fafb; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
        <table>
          <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead>
          <tbody>${tableRows || `<tr><td colspan="${columns.length}">No records found</td></tr>`}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

export const ReportsPage = () => {
  const [activeTabId, setActiveTabId] = useState('sales');
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const { t } = useTranslation();

  const activeTab = reportTabs.find((tab) => tab.id === activeTabId) || reportTabs[0];
  const rows = useMemo(() => reports[activeTabId]?.rows || [], [activeTabId, reports]);
  const rawData = reports[activeTabId]?.raw;

  const totals = useMemo(() => {
    if (activeTabId === 'profit') {
      return [
        { label: 'Revenue', value: formatCurrency(rawData?.totalRevenue || 0), tone: 'text-emerald-600' },
        { label: 'Cost', value: formatCurrency(rawData?.totalCost || 0), tone: 'text-rose-600' },
        { label: 'Net Profit', value: formatCurrency(rawData?.profit || 0), tone: 'text-blue-600' },
        { label: 'Margin', value: rawData?.profitMargin || '0%', tone: 'text-amber-600' },
      ];
    }

    const currencyKeys = activeTab.columns.filter((column) => column.type === 'currency').map((column) => column.key);
    return [
      { label: 'Records', value: rows.length.toLocaleString('en-IN'), tone: 'text-slate-900 dark:text-white' },
      ...currencyKeys.slice(0, 3).map((key) => ({
        label: activeTab.columns.find((column) => column.key === key)?.label || key,
        value: formatCurrency(rows.reduce((sum, row) => sum + Number(row[key] || 0), 0)),
        tone: key.toLowerCase().includes('due') || key.toLowerCase().includes('cost') ? 'text-rose-600' : 'text-emerald-600',
      })),
    ];
  }, [activeTab, activeTabId, rawData, rows]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = { view: 'detail' };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (search) params.search = search;
      const response = await api.get(activeTab.endpoint, { params });
      const raw = response.data.data;
      setReports((current) => ({
        ...current,
        [activeTab.id]: {
          raw,
          rows: activeTab.dataPath(raw),
        },
      }));
    } catch (error) {
      console.error('Report fetch error:', error);
      showError('Unable to fetch report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTabId]);

  const handleApplyFilters = () => {
    fetchReport();
  };

  const handleExportCsv = () => {
    downloadFile(buildCsv(rows, activeTab.columns), `${activeTab.id}-report.csv`, 'text/csv;charset=utf-8');
  };

  const handleExportPdf = () => {
    exportPdf(activeTab.label, rows, activeTab.columns);
  };

  const handleExportExcel = () => {
    downloadFile(buildExcelHtml(rows, activeTab.columns), `${activeTab.id}-report.xls`, 'application/vnd.ms-excel;charset=utf-8');
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <div className="page-heading">
            <span className="eyebrow">Business intelligence</span>
            <h1 className="text-3xl font-bold">{t('nav.reports')}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
              Sales, GST, inventory, purchases, profit, and credit reports in one workspace.
            </p>
          </div>

          <div className="mb-6 overflow-x-auto">
            <div className="inline-flex min-w-full gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-gray-800 dark:bg-[#151d19] lg:min-w-0">
              {reportTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTabId;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTabId(tab.id)}
                    className={`inline-flex whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-gray-300 dark:hover:bg-emerald-950/40'
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card mb-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1.4fr_auto_auto_auto_auto]">
              <div>
                <label className="form-label">Start date</label>
                <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="input" />
              </div>
              <div>
                <label className="form-label">End date</label>
                <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="input" />
              </div>
              <div>
                <label className="form-label">Search</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') fetchReport();
                    }}
                    placeholder="Invoice, customer, product, supplier..."
                    className="input pl-10"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button type="button" onClick={handleApplyFilters} className="btn btn-primary w-full">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Apply
                </button>
              </div>
              <div className="flex items-end">
                <button type="button" onClick={handleExportCsv} className="btn btn-secondary w-full" disabled={!rows.length}>
                  <Download className="h-4 w-4" />
                  CSV
                </button>
              </div>
              <div className="flex items-end">
                <button type="button" onClick={handleExportPdf} className="btn btn-secondary w-full" disabled={!rows.length}>
                  <FileText className="h-4 w-4" />
                  PDF
                </button>
              </div>
              <div className="flex items-end">
                <button type="button" onClick={handleExportExcel} className="btn btn-secondary w-full" disabled={!rows.length}>
                  <Download className="h-4 w-4" />
                  Excel
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {totals.map((item) => (
              <div key={item.label} className="card">
                <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">{item.label}</p>
                <p className={`mt-2 text-2xl font-bold ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">{activeTab.label}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{rows.length} records found</p>
              </div>
              {(activeTabId === 'stock' || activeTabId === 'outstanding') && (
                <span className="badge badge-yellow w-fit">
                  <AlertTriangle className="h-4 w-4" />
                  Actionable report
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="table min-w-[980px]">
                <thead>
                  <tr>
                    {activeTab.columns.map((column) => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={activeTab.columns.length} className="text-center text-slate-500">
                        Loading report...
                      </td>
                    </tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={activeTab.columns.length} className="text-center text-slate-500">
                        No report data found for the selected filters.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    rows.map((row, index) => (
                      <tr key={row.id || `${activeTabId}-${index}`}>
                        {activeTab.columns.map((column) => (
                          <td key={column.key}>
                            {column.type === 'status' ? (
                              <span className={`badge ${getStatusColor(row[column.key])}`}>{row[column.key] || '-'}</span>
                            ) : column.type === 'boolean' ? (
                              <span className={`badge ${row[column.key] ? 'badge-red' : 'badge-green'}`}>
                                {formatCell(row, column)}
                              </span>
                            ) : (
                              formatCell(row, column)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
