import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, Package, Share2, Store } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { FarmerMobileNav } from '../components/FarmerMobileNav';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '-');
const displayStoreName = (store) => store?.storeName || store?.companyName || store?.shopName || store?.name || 'Unknown Store';
const upiPaymentUrl = (settings) => settings?.upiId
  ? `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.accountHolderName || '')}&cu=INR`
  : '';

export const FarmerPurchaseHistoryPage = () => {
  const { storeId } = useParams();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', status: 'ALL' });

  useEffect(() => {
    api.get(`/farmer/stores/${storeId}/invoices`)
      .then((response) => setInvoices(response.data.data || []))
      .finally(() => setLoading(false));
  }, [storeId]);

  const filteredInvoices = useMemo(() => invoices.filter((invoice) => {
    const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : null;
    if (filters.startDate && invoiceDate && invoiceDate < new Date(filters.startDate)) return false;
    if (filters.endDate && invoiceDate && invoiceDate > new Date(`${filters.endDate}T23:59:59`)) return false;
    if (filters.status !== 'ALL' && invoice.status !== filters.status) return false;
    return true;
  }), [filters, invoices]);

  const totals = useMemo(() => filteredInvoices.reduce((summary, invoice) => ({
    amount: summary.amount + Number(invoice.totalAmount || 0),
    paid: summary.paid + Number(invoice.amountPaid || invoice.paidAmount || 0),
    due: summary.due + Number(invoice.balanceDue || 0),
  }), { amount: 0, paid: 0, due: 0 }), [filteredInvoices]);

  const shopName = displayStoreName(invoices[0]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main pb-24 lg:pb-8">
          <div className="page-heading">
            <span className="eyebrow">Purchase History</span>
            <h1 className="text-3xl font-bold">{shopName}</h1>
            <p className="mt-1 text-sm text-slate-500">Invoices, paid amount, and balance due from this shop.</p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="card"><p className="text-sm text-slate-500">Total amount</p><p className="text-2xl font-bold">{formatCurrency(totals.amount)}</p></div>
            <div className="card"><p className="text-sm text-slate-500">Paid amount</p><p className="text-2xl font-bold text-emerald-700">{formatCurrency(totals.paid)}</p></div>
            <div className="card"><p className="text-sm text-slate-500">Due amount</p><p className="text-2xl font-bold text-rose-600">{formatCurrency(totals.due)}</p></div>
          </div>

          <div className="card mb-6 grid gap-3 md:grid-cols-[1fr_1fr_180px]">
            <input className="input" type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} aria-label="Start date" />
            <input className="input" type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} aria-label="End date" />
            <select className="input" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} aria-label="Payment status">
              <option value="ALL">All statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>

          {loading && <LoadingSkeleton rows={5} />}
          {!loading && filteredInvoices.length === 0 && <EmptyState title="No invoices found" message="Only shops where you purchased are visible." />}

          <div className="space-y-4 md:hidden">
            {filteredInvoices.map((invoice) => {
              const shareText = encodeURIComponent(`Invoice ${invoice.invoiceNumber}\nStore: ${displayStoreName(invoice)}\nTotal: ${formatCurrency(invoice.totalAmount)}\nPaid: ${formatCurrency(invoice.amountPaid || invoice.paidAmount || 0)}\nBalance: ${formatCurrency(invoice.balanceDue || 0)}${invoice.pdfUrl ? `\nPDF: ${invoice.pdfUrl}` : ''}`);
              return (
              <article key={invoice.id} className="card">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-slate-500">{formatDate(invoice.invoiceDate)}</p>
                  </div>
                  <span className="badge badge-green">{invoice.status}</span>
                </div>
                <div className="mb-4 space-y-2 text-sm">
                  {(invoice.products || []).map((item) => (
                    <div key={item.id || item.productId} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-2 dark:bg-gray-800">
                      <span>{item.productName}</span>
                      <span className="font-semibold">{item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div><p className="text-slate-500">Total</p><p className="font-bold">{formatCurrency(invoice.totalAmount)}</p></div>
                  <div><p className="text-slate-500">Paid</p><p className="font-bold">{formatCurrency(invoice.amountPaid || invoice.paidAmount)}</p></div>
                  <div><p className="text-slate-500">Due</p><p className="font-bold text-rose-600">{formatCurrency(invoice.balanceDue)}</p></div>
                </div>
                {invoice.paymentSettings?.upiId && Number(invoice.balanceDue || 0) > 0 && (
                  <div className="mt-4 flex items-center gap-3 rounded-lg border bg-white p-3 dark:bg-gray-900">
                    {invoice.paymentSettings.customUpiQrImageUrl ? (
                      <img src={invoice.paymentSettings.customUpiQrImageUrl} alt="UPI QR" className="h-20 w-20 object-contain" />
                    ) : (
                      <QRCode value={upiPaymentUrl(invoice.paymentSettings)} size={80} />
                    )}
                    <div className="text-sm">
                      <p className="font-semibold">Scan to Pay</p>
                      <p className="text-slate-600">{invoice.paymentSettings.upiId}</p>
                      <p className="text-xs text-slate-500">Admin will confirm after payment.</p>
                    </div>
                  </div>
                )}
                {!String(invoice.id).startsWith('manual-') && <Link to={`/farmer/invoices/${invoice.id}`} className="btn btn-secondary mt-4 w-full justify-center">View Payment Details</Link>}
                {invoice.pdfUrl && <a href={invoice.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-primary mt-4 w-full justify-center"><Download className="h-4 w-4" /> Download Invoice</a>}
                <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer" className="btn btn-secondary mt-3 w-full justify-center"><Share2 className="h-4 w-4" /> Share on WhatsApp</a>
              </article>
            );})}
          </div>

          <div className="card hidden overflow-x-auto md:block">
            <table className="table min-w-[980px]">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Products</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const shareText = encodeURIComponent(`Invoice ${invoice.invoiceNumber}\nStore: ${displayStoreName(invoice)}\nTotal: ${formatCurrency(invoice.totalAmount)}\nPaid: ${formatCurrency(invoice.amountPaid || invoice.paidAmount || 0)}\nBalance: ${formatCurrency(invoice.balanceDue || 0)}${invoice.pdfUrl ? `\nPDF: ${invoice.pdfUrl}` : ''}`);
                  return (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceNumber}</td>
                    <td>{formatDate(invoice.invoiceDate)}</td>
                    <td>{(invoice.products || []).map((item) => item.productName).join(', ') || '-'}</td>
                    <td>{(invoice.products || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</td>
                    <td>{formatCurrency(invoice.totalAmount)}</td>
                    <td>{formatCurrency(invoice.amountPaid || invoice.paidAmount)}</td>
                    <td>{formatCurrency(invoice.balanceDue)}</td>
                    <td><span className="badge badge-green">{invoice.status}</span></td>
                    <td>
                      {!String(invoice.id).startsWith('manual-') ? (
                        <Link to={`/farmer/invoices/${invoice.id}`} className="btn btn-secondary btn-sm">
                          Scan to Pay
                        </Link>
                      ) : invoice.paymentSettings?.upiId && Number(invoice.balanceDue || 0) > 0 ? (
                        <span className="text-sm">{invoice.paymentSettings.upiId}</span>
                      ) : '-'}
                    </td>
                    <td className="flex gap-2">{invoice.pdfUrl ? <a className="btn btn-secondary btn-sm" href={invoice.pdfUrl} target="_blank" rel="noreferrer"><Download className="h-4 w-4" /></a> : '-'}<a className="btn btn-secondary btn-sm" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer"><Share2 className="h-4 w-4" /></a></td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>

          <Link to={`/farmer/stores/${storeId}/products`} className="btn btn-secondary mt-6 w-full justify-center sm:w-fit">
            <Package className="h-4 w-4" />
            View Available Stock
          </Link>
          <Link to="/farmer/stores" className="btn btn-secondary ml-0 mt-3 w-full justify-center sm:ml-3 sm:w-fit">
            <Store className="h-4 w-4" />
            Back to Shops
          </Link>
        </main>
      </div>
      <FarmerMobileNav />
    </div>
  );
};
