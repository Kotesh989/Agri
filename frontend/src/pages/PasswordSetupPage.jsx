import { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useNotificationContext } from '../components/Notification';
import { showError } from '../utils/notificationService';
import { useTranslation } from 'react-i18next';
import loginField from '../assets/login-field.jpg';
import { AuthLanguageSelect } from '../components/AuthLanguageSelect';

export const PasswordSetupPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addNotification } = useNotificationContext();
  const { t } = useTranslation();

  const queryParams = new URLSearchParams(location.search);
  const userId = queryParams.get('userId') || '';
  const username = queryParams.get('username') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!userId) {
      addNotification('Invalid request: Missing User ID', 'error');
      return;
    }
    if (password.length < 8) {
      addNotification('Password must be at least 8 characters', 'error');
      return;
    }
    if (password !== confirmPassword) {
      addNotification('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/setup-password', {
        userId,
        password,
      });
      addNotification('Password created successfully! You can now log in.', 'success');
      const params = new URLSearchParams({
        portal: 'farmer',
        identifier: username,
      });
      navigate(`/login?${params.toString()}`, { replace: true });
    } catch (error) {
      showError(error, 'Unable to set password');
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
      <div className="w-full max-w-md rounded-lg border border-white/15 bg-white/95 p-6 shadow-2xl backdrop-blur dark:bg-[#151d19]/95 sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Farmer Portal
            </p>
            <h1 className="text-2xl font-bold">Password Setup</h1>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <ShieldCheck size={28} />
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          <p className="font-medium">Account found. Please create your password to activate your login.</p>
          {username && <p className="mt-1 font-semibold">Username: {username}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10 pr-12"
                minLength="8"
                placeholder="At least 8 characters"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((curr) => !curr)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              minLength="8"
              placeholder="Repeat new password"
              required
            />
          </div>
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Activating...' : 'Activate Login & Continue'}
          </button>
        </form>
        <button onClick={() => navigate('/login?portal=farmer')} className="btn btn-secondary w-full mt-3">Cancel</button>
      </div>
    </div>
  );
};
