import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import api from '../utils/api';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils/helpers';

const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '-';

export const SalesPage = () => {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [category, setCategory] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tab, setTab] = useState('FERTILIZER');
  const { t } = useTranslation();

  useEffect(() => {
    api.get('/customers').then((response) => setCustomers(response.data.data));
  }, []);

  useEffect(() => {
    const params = { search, customerId, category, startDate, endDate };
    Object.keys(params).forEach((key) => !params[key] && delete params[key]);
    api.get('/sales', { params }).then((response) => setSales(response.data.data));
  }, [search, customerId, category, startDate, endDate]);

  const visibleSales = useMemo(
    () => sales.filter((sale) => sale.category === tab),
    [sales, tab]
  );

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <h1 className="text-3xl font-bold mb-6">{t('sales.title')}</h1>
          <div className="card mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="flex items-center gap-2 md:col-span-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} className="input" placeholder={t('sales.searchPlaceholder')} />
              </div>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input">
                <option value="">{t('sales.allFarmers')}</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                <option value="ALL">{t('inventory.allCategories')}</option>
                <option value="FERTILIZER">{t('dashboard.fertilizers')}</option>
                <option value="PESTICIDE">{t('dashboard.pesticides')}</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            {['FERTILIZER', 'PESTICIDE'].map((value) => (
              <button key={value} onClick={() => setTab(value)} className={`btn btn-sm ${tab === value ? 'btn-primary' : 'btn-secondary'}`}>
                {value === 'FERTILIZER' ? t('dashboard.fertilizers') : t('dashboard.pesticides')}
              </button>
            ))}
          </div>
          <div className="card overflow-x-auto">
            <table className="table min-w-[1100px]">
              <thead><tr><th>{t('sales.farmer')}</th><th>{t('common.product')}</th><th>{t('common.quantity')}</th><th>{t('sales.weight')}</th><th>{t('sales.unitType')}</th><th>{t('common.pricePerUnit')}</th><th>{t('common.total')}</th><th>{t('common.date')}</th><th>{t('common.category')}</th></tr></thead>
              <tbody>
                {visibleSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.customerName}</td>
                    <td>{sale.productName}</td>
                    <td>{sale.quantity}</td>
                    <td>{sale.weight ? `${(sale.quantity * sale.weight).toLocaleString('en-IN')} ${sale.weightUnit || 'Kg'} (${sale.weight} ${sale.weightUnit || 'Kg'}/${sale.unitType || 'Packet'})` : '-'}</td>
                    <td>{sale.unitType || '-'}</td>
                    <td>{formatCurrency(sale.pricePerUnit)}</td>
                    <td>{formatCurrency(sale.totalAmount)}</td>
                    <td>{formatDate(sale.purchaseDate)}</td>
                    <td>{sale.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
};
