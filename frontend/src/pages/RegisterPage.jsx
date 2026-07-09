import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { useNotificationContext } from '../components/Notification';
import { showError } from '../utils/notificationService';
import { Eye, EyeOff, Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import loginField from '../assets/login-field.jpg';
import { AuthLanguageSelect } from '../components/AuthLanguageSelect';

const adminForm = { name: '', email: '', password: '', confirmPassword: '' };
const farmerForm = {
  name: '',
  username: '',
  email: '',
  mobileNumber: '',
  adminEmail: '',
  password: '',
  confirmPassword: '',
  address: '',
  village: '',
  taluk: '',
  district: '',
  state: '',
  preferredLanguage: 'en',
  profilePhoto: '',
};

const fieldLabels = {
  name: 'auth.fullName',
  username: 'Username',
  email: 'auth.email',
  mobileNumber: 'auth.phone',
  adminEmail: 'auth.adminStoreEmail',
  password: 'auth.password',
  confirmPassword: 'auth.confirmPassword',
  address: 'auth.address',
  village: 'auth.village',
  taluk: 'auth.taluk',
  district: 'auth.district',
  state: 'auth.state',
  preferredLanguage: 'auth.preferredLanguage',
  profilePhoto: 'auth.profilePhoto',
};

const fieldPlaceholders = {
  name: 'Enter full name',
  username: 'Optional username',
  email: 'name@example.com (Optional)',
  mobileNumber: '10 digit phone number',
  adminEmail: 'auth.adminStoreEmailPlaceholder',
  password: 'At least 8 characters',
  confirmPassword: 'Repeat password',
  address: 'Village, city, or street address',
  village: 'Village',
  taluk: 'Taluk',
  district: 'District',
  state: 'State',
};

export const RegisterPage = () => {
  const { type } = useParams();
  const isFarmer = type === 'farmer';
  const [formData, setFormData] = useState(isFarmer ? farmerForm : adminForm);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addNotification } = useNotificationContext();
  const { t } = useTranslation();

  useEffect(() => {
    setFormData(isFarmer ? farmerForm : adminForm);
  }, [isFarmer]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (formData.password.length < 8) {
      addNotification('Password must be at least 8 characters', 'error');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      addNotification('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...payload } = formData;
      await api.post(`/auth/register/${isFarmer ? 'farmer' : 'admin'}`, payload);
      addNotification(`${isFarmer ? 'Farmer' : 'Admin'} account created successfully`, 'success');
      const params = new URLSearchParams({
        portal: isFarmer ? 'farmer' : 'admin',
        identifier: (formData.email || formData.mobileNumber || '').trim(),
      });
      navigate(`/login?${params.toString()}`, { replace: true });
    } catch (error) {
      showError(error, 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 p-4"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(9, 18, 13, 0.82), rgba(9, 18, 13, 0.58)), url(${loginField})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <AuthLanguageSelect />
      </div>
      <div className="w-full max-w-lg rounded-lg border border-white/15 bg-white/95 p-6 shadow-2xl backdrop-blur dark:bg-[#151d19]/95 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md">
            <Leaf className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">{isFarmer ? t('auth.createFarmer') : t('auth.createAdmin')}</h1>
          <p className="text-sm text-slate-500 dark:text-gray-400">{t('app.subtitle')}</p>
        </div>
        <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1 dark:bg-gray-900">
          <button type="button" onClick={() => navigate('/register/admin')} className={`btn border-0 shadow-none ${!isFarmer ? 'btn-primary' : 'bg-transparent text-slate-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800'}`}>
            {t('auth.createAdmin')}
          </button>
          <button type="button" onClick={() => navigate('/register/farmer')} className={`btn border-0 shadow-none ${isFarmer ? 'btn-primary' : 'bg-transparent text-slate-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800'}`}>
            {t('auth.createFarmer')}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {Object.entries(formData).map(([field, value]) => (
            <div key={field}>
              <label className="block text-sm font-medium mb-1">{t(fieldLabels[field] || field)}</label>
              <div className="relative">
                {field === 'preferredLanguage' ? (
                  <select value={value} onChange={(e) => setFormData({ ...formData, [field]: e.target.value })} className="input">
                    <option value="en">{t('app.english')}</option>
                    <option value="kn">{t('app.kannada')}</option>
                  </select>
                ) : field === 'profilePhoto' ? (
                  <input
                    type="url"
                    value={value}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                    className="input"
                    placeholder="Optional profile photo URL"
                  />
                ) : (
                <input
                  type={field === 'password' || field === 'confirmPassword' ? (showPassword ? 'text' : 'password') : field === 'email' || field === 'adminEmail' ? 'email' : 'text'}
                  value={value}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  className={`input ${field === 'password' || field === 'confirmPassword' ? 'pr-12' : ''}`}
                  placeholder={fieldPlaceholders[field]?.startsWith('auth.') ? t(fieldPlaceholders[field]) : fieldPlaceholders[field] || ''}
                  minLength={field === 'password' || field === 'confirmPassword' ? 8 : undefined}
                  required={!['address', 'profilePhoto', 'email', 'username'].includes(field)}
                />
                )}
                {(field === 'password' || field === 'confirmPassword') && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-800 dark:text-gray-300 dark:hover:text-white"
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" disabled={loading}>{loading ? t('auth.creating') : t('auth.createAccount')}</button>
            <button type="button" onClick={() => navigate('/login')} className="btn btn-secondary flex-1">{t('auth.back')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
