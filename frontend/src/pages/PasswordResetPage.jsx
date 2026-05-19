import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useNotificationContext } from '../components/Notification';
import { showError } from '../utils/notificationService';
import { useTranslation } from 'react-i18next';
import loginField from '../assets/login-field.jpg';
import { AuthLanguageSelect } from '../components/AuthLanguageSelect';

const getInitialResetState = (search) => {
  const params = new URLSearchParams(search);
  const portalParam = params.get('portal');
  const identifier = (params.get('identifier') || '').trim();

  return {
    portal: portalParam === 'farmer' ? 'farmer' : 'admin',
    identifier,
    channel: 'EMAIL',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  };
};

export const PasswordResetPage = () => {
  const location = useLocation();
  const initialResetState = getInitialResetState(location.search);
  const [step, setStep] = useState('REQUEST');
  const [formData, setFormData] = useState(initialResetState);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpSentAt, setOtpSentAt] = useState(null);
  const navigate = useNavigate();
  const { addNotification } = useNotificationContext();
  const { t } = useTranslation();

  const updateForm = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const loginParams = new URLSearchParams({
    portal: formData.portal,
    identifier: formData.identifier.trim(),
  });

  const requestOtp = async (event, resend = false) => {
    event?.preventDefault();
    const identifier = formData.identifier.trim();
    if (!identifier) {
      addNotification('Enter your account email', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/password-reset/request', {
        identifier,
        channel: 'EMAIL',
      });
      addNotification(resend ? 'OTP sent again' : 'OTP sent if the account exists', 'success');
      setOtpSentAt(new Date());
      setStep('CONFIRM');
    } catch (error) {
      showError(error, 'Unable to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async (event) => {
    event.preventDefault();
    if (formData.otp.trim().length !== 6) {
      addNotification('Enter the 6 digit OTP', 'error');
      return;
    }
    if (formData.newPassword.length < 8) {
      addNotification('Password must be at least 8 characters', 'error');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      addNotification('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/password-reset/confirm', {
        identifier: formData.identifier.trim(),
        otp: formData.otp.trim(),
        newPassword: formData.newPassword,
      });
      addNotification('Password reset successfully', 'success');
      navigate(`/login?${loginParams.toString()}`, { replace: true });
    } catch (error) {
      showError(error, 'Unable to reset password');
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
      <div className="w-full max-w-2xl rounded-lg border border-white/15 bg-white/95 p-6 shadow-2xl backdrop-blur dark:bg-[#151d19]/95 sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              {formData.portal === 'admin' ? t('auth.adminLogin') : t('auth.farmerLogin')}
            </p>
            <h1 className="text-3xl font-bold">{t('auth.forgotPassword')}</h1>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <ShieldCheck size={28} />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateForm('portal', 'admin')}
            className={`btn ${formData.portal === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
          >
            {t('auth.adminLogin')}
          </button>
          <button
            type="button"
            onClick={() => updateForm('portal', 'farmer')}
            className={`btn ${formData.portal === 'farmer' ? 'btn-primary' : 'btn-secondary'}`}
          >
            {t('auth.farmerLogin')}
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 text-sm">
          <div className={`rounded-lg border px-4 py-3 ${step === 'REQUEST' ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}`}>
            <div className="flex items-center gap-2 font-semibold">
              <Mail size={16} />
              Request OTP
            </div>
          </div>
          <div className={`rounded-lg border px-4 py-3 ${step === 'CONFIRM' ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}`}>
            <div className="flex items-center gap-2 font-semibold">
              <KeyRound size={16} />
              Verify & Save
            </div>
          </div>
        </div>

        {step === 'REQUEST' ? (
          <form onSubmit={requestOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Account Email</label>
              <input
                type="email"
                value={formData.identifier}
                onChange={(e) => updateForm('identifier', e.target.value)}
                className="input"
                placeholder={t('auth.adminEmail')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Send OTP By</label>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                <div className="flex items-center gap-2 font-semibold">
                  <Mail size={18} />
                  Email OTP
                </div>
              </div>
            </div>
            <button className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={confirmReset} className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 size={18} />
                OTP request accepted
              </div>
              <p className="mt-1">
                Check the email inbox linked with {formData.identifier.trim()}.
              </p>
              {otpSentAt && <p className="mt-1 text-xs">Requested at {otpSentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">6 Digit OTP</label>
              <input
                value={formData.otp}
                onChange={(e) => updateForm('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input text-center text-lg tracking-widest"
                inputMode="numeric"
                maxLength="6"
                placeholder="000000"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => updateForm('newPassword', e.target.value)}
                  className="input pl-10 pr-12"
                  minLength="8"
                  placeholder="At least 8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('auth.confirmPassword')}</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => updateForm('confirmPassword', e.target.value)}
                className="input"
                minLength="8"
                placeholder="Repeat new password"
                required
              />
            </div>
            <button className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Reset Password'}
            </button>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" onClick={(event) => requestOtp(event, true)} className="btn btn-secondary flex items-center justify-center gap-2" disabled={loading}>
                <RefreshCw size={18} />
                Resend OTP
              </button>
              <button type="button" onClick={() => setStep('REQUEST')} className="btn btn-secondary flex items-center justify-center gap-2" disabled={loading}>
                <ArrowLeft size={18} />
                Change Details
              </button>
            </div>
          </form>
        )}
        <button onClick={() => navigate(`/login?${loginParams.toString()}`)} className="btn btn-secondary w-full mt-3">{t('auth.back')}</button>
      </div>
    </div>
  );
};
