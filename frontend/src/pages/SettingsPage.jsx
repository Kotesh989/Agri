import { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { useNotificationContext } from '../components/Notification';
import { showError } from '../utils/notificationService';
import api from '../utils/api';
import { useTranslation } from 'react-i18next';

export const SettingsPage = () => {
  const [settings, setSettings] = useState({
    shopName: '',
    shopAddress: '',
    shopCity: '',
    shopState: '',
    shopPinCode: '',
    shopPhone: '',
    shopEmail: '',
    gstNumber: '',
    upiId: '',
    accountHolderName: '',
    bankName: '',
    customUpiQrImageUrl: '',
    invoicePrefix: '',
    receiptPrefix: '',
    currencySymbol: '₹',
    expiryAlertDays: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { addNotification } = useNotificationContext();
  const { t } = useTranslation();

  const isValidUpiId = (value) => {
    return /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(String(value || '').trim());
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data.data);
    } catch (error) {
      showError(error, 'Error fetching settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (settings.upiId && !isValidUpiId(settings.upiId)) {
      showError('Please enter a valid UPI ID');
      setSaving(false);
      return;
    }
    if (settings.customUpiQrImageUrl && !/^https?:\/\//i.test(settings.customUpiQrImageUrl)) {
      showError('Custom QR image URL must start with http:// or https://');
      setSaving(false);
      return;
    }

    try {
      await api.put('/settings', settings);
      addNotification('Settings saved successfully', 'success');
    } catch (error) {
      showError(error, 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <h1 className="text-3xl font-bold mb-6">{t('nav.settings')}</h1>

          <div className="max-w-2xl">
            <form onSubmit={handleSubmit} className="card space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Shop Name</label>
                  <input
                    type="text"
                    value={settings.shopName}
                    onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Shop Phone</label>
                  <input
                    type="tel"
                    value={settings.shopPhone}
                    onChange={(e) => setSettings({ ...settings, shopPhone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Shop Email</label>
                  <input
                    type="email"
                    value={settings.shopEmail}
                    onChange={(e) => setSettings({ ...settings, shopEmail: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">GST Number</label>
                  <input
                    type="text"
                    value={settings.gstNumber}
                    onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">UPI ID</label>
                  <input
                    type="text"
                    value={settings.upiId}
                    onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                    className="input"
                    placeholder="example@bank"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    value={settings.accountHolderName}
                    onChange={(e) => setSettings({ ...settings, accountHolderName: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={settings.bankName}
                    onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                    className="input"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Custom UPI QR Image URL</label>
                  <input
                    type="url"
                    value={settings.customUpiQrImageUrl}
                    onChange={(e) => setSettings({ ...settings, customUpiQrImageUrl: e.target.value })}
                    className="input"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Invoice Prefix</label>
                  <input
                    type="text"
                    value={settings.invoicePrefix}
                    onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expiry Alert Days</label>
                  <input
                    type="number"
                    value={settings.expiryAlertDays}
                    onChange={(e) => setSettings({ ...settings, expiryAlertDays: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={settings.shopAddress}
                  onChange={(e) => setSettings({ ...settings, shopAddress: e.target.value })}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={settings.shopCity}
                    onChange={(e) => setSettings({ ...settings, shopCity: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <input
                    type="text"
                    value={settings.shopState}
                    onChange={(e) => setSettings({ ...settings, shopState: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pin Code</label>
                  <input
                    type="text"
                    value={settings.shopPinCode}
                    onChange={(e) => setSettings({ ...settings, shopPinCode: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};
