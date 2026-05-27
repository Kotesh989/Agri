import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, Share2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { FarmerMobileNav } from '../components/FarmerMobileNav';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import api from '../utils/api';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';

export const FarmerInvoiceView = () => {
  const { invoiceId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/farmer/invoices/${invoiceId}`)
      .then((response) => setInvoice(response.data.data || null))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const paymentSettings = invoice?.paymentSettings || invoice?.farmerView?.paymentSettings;
  const items = useMemo(() => invoice?.items || invoice?.farmerView?.products || [], [invoice]);
  const dueAmount = Number(invoice?.balanceDue ?? invoice?.farmerView?.balanceDue ?? 0);
  const upiPaymentUrl = paymentSettings?.upiId
    ? `upi://pay?pa=${encodeURIComponent(paymentSettings.upiId)}&pn=${encodeURIComponent(paymentSettings.accountHolderName || '')}&am=${encodeURIComponent(dueAmount.toFixed(2))}&cu=INR`
    : '';
  const storeName = invoice?.farmerView?.storeName || invoice?.storeSnapshot?.storeName || invoice?.storeId?.name || 'Store';
  const whatsappText = encodeURIComponent([
    `Invoice ${invoice?.invoiceNumber || ''}`,
    `Store: ${storeName}`,
    `Total: ${formatCurrency(invoice?.totalAmount || 0)}`,
    `Paid: ${formatCurrency(invoice?.paidAmount || invoice?.amountPaid || 0)}`,
    `Balance: ${formatCurrency(dueAmount)}`,
    invoice?.pdfUrl ? `PDF: ${invoice.pdfUrl}` : '',
  ].filter(Boolean).join('\n'));

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main pb-24 lg:pb-8">
          {loading && <LoadingSkeleton rows={5} />}
          {!loading && invoice && (
            <>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="eyebrow">Invoice</span>
                  <h1 className="text-3xl font-bold">{invoice.invoiceNumber}</h1>
                  <p className="mt-1 text-sm text-slate-500">{storeName} - {formatDate(invoice.invoiceDate)}</p>
                </div>
                <span className={`badge ${getStatusColor(invoice.status)}`}>{invoice.status}</span>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <section className="space-y-6">
                  <div className="card">
                    <h2 className="mb-4 text-lg font-semibold">Items</h2>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id || item._id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 dark:bg-gray-800">
                          <div>
                            <p className="font-semibold">{item.product?.name || item.productName}</p>
                            <p className="text-sm text-slate-500">{item.quantity} {item.unit}</p>
                          </div>
                          <p className="font-bold">{formatCurrency(item.lineTotal ?? item.totalPrice ?? item.totalAmount ?? item.total)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card grid gap-4 sm:grid-cols-3">
                    <div><p className="text-sm text-slate-500">Total</p><p className="text-2xl font-bold">{formatCurrency(invoice.totalAmount)}</p></div>
                    <div><p className="text-sm text-slate-500">Paid</p><p className="text-2xl font-bold text-emerald-700">{formatCurrency(invoice.paidAmount || invoice.amountPaid)}</p></div>
                    <div><p className="text-sm text-slate-500">Due</p><p className="text-2xl font-bold text-rose-600">{formatCurrency(dueAmount)}</p></div>
                  </div>
                </section>

                <aside className="card h-fit">
                  <h2 className="mb-3 text-lg font-semibold">Scan to Pay</h2>
                  {paymentSettings?.upiId && dueAmount > 0 ? (
                    <>
                      <div className="flex justify-center rounded-lg border bg-white p-4">
                        {paymentSettings.customUpiQrImageUrl ? (
                          <img src={paymentSettings.customUpiQrImageUrl} alt="UPI QR" className="h-56 w-56 object-contain" />
                        ) : (
                          <QRCode value={upiPaymentUrl} size={224} />
                        )}
                      </div>
                      <div className="mt-4 space-y-1 text-sm">
                        <p className="font-semibold">{paymentSettings.upiId}</p>
                        {paymentSettings.accountHolderName && <p>{paymentSettings.accountHolderName}</p>}
                        {paymentSettings.bankName && <p>{paymentSettings.bankName}</p>}
                        <p className="pt-2 text-slate-500">Pay with any UPI app, then share the payment reference with the shop. The admin will manually confirm and mark this invoice paid.</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">{dueAmount <= 0 ? 'This invoice is already paid.' : 'UPI payment details are not available for this shop.'}</p>
                  )}
                  <div className="mt-4 grid gap-2">
                    {invoice.pdfUrl && <a href={invoice.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-primary w-full"><Download className="h-4 w-4" /> Download Invoice</a>}
                    <a href={`https://wa.me/?text=${whatsappText}`} target="_blank" rel="noreferrer" className="btn btn-secondary w-full"><Share2 className="h-4 w-4" /> Share on WhatsApp</a>
                  </div>
                </aside>
              </div>

              <Link to={`/farmer/stores/${invoice.farmerView?.storeId || invoice.storeId}/invoices`} className="btn btn-secondary mt-6">
                Back to invoices
              </Link>
            </>
          )}
        </main>
      </div>
      <FarmerMobileNav />
    </div>
  );
};
