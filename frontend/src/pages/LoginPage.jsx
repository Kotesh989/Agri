import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotificationContext } from '../components/Notification';
import { showError } from '../utils/notificationService';
import { Eye, EyeOff, Leaf, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import loginField from '../assets/login-field.jpg';
import { AuthLanguageSelect } from '../components/AuthLanguageSelect';

const loginDefaults = {
  admin: { email: 'admin@fertilizershop.com', password: 'Admin@123' },
  farmer: { email: '', password: '' },
};

const getLoginSeed = (search) => {
  const params = new URLSearchParams(search);
  const portalParam = params.get('portal');
  const portal = portalParam === 'farmer' ? 'farmer' : 'admin';
  const identifier = (params.get('identifier') || '').trim();

  return {
    portal,
    email: identifier || loginDefaults[portal].email,
    password: identifier ? '' : loginDefaults[portal].password,
    hasPrefilledIdentifier: Boolean(identifier),
  };
};

export const LoginPage = () => {
  const location = useLocation();
  const initialLogin = getLoginSeed(location.search);
  const [portal, setPortal] = useState(initialLogin.portal);
  const [email, setEmail] = useState(initialLogin.email);
  const [password, setPassword] = useState(initialLogin.password);
  const [hasPrefilledIdentifier, setHasPrefilledIdentifier] = useState(initialLogin.hasPrefilledIdentifier);
  const [showPassword, setShowPassword] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const { login, requestFarmerOtp, verifyFarmerOtp } = useAuth();
  const navigate = useNavigate();
  const { addNotification } = useNotificationContext();
  const { t } = useTranslation();

  useEffect(() => {
    const nextLogin = getLoginSeed(location.search);
    setPortal(nextLogin.portal);
    setEmail(nextLogin.email);
    setPassword(nextLogin.password);
    setOtpMode(false);
    setHasPrefilledIdentifier(nextLogin.hasPrefilledIdentifier);
  }, [location.search]);

  useEffect(() => {
    if (!otpCooldown) return undefined;
    const timer = setInterval(() => setOtpCooldown((current) => Math.max(current - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const switchPortal = (nextPortal) => {
    setPortal(nextPortal);
    setEmail(loginDefaults[nextPortal].email);
    setPassword(loginDefaults[nextPortal].password);
    setOtpMode(false);
    setOtpRequested(false);
    setOtp('');
    setHasPrefilledIdentifier(false);
    navigate(`/login?portal=${nextPortal}`, { replace: true });
  };

  const openPasswordReset = () => {
    const params = new URLSearchParams({ portal });
    const identifier = email.trim();
    if (identifier) params.set('identifier', identifier);
    navigate(`/password-reset?${params.toString()}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password, portal);
      addNotification('Login successful', 'success');
      navigate(user.role === 'FARMER' ? '/farmer/dashboard' : '/dashboard');
    } catch (error) {
      showError(error, 'Invalid email, mobile number, password, or OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setLoading(true);
    try {
      const data = await requestFarmerOtp(email, 'PHONE');
      setOtpRequested(true);
      setOtpCooldown(60);
      addNotification(data?.devOtp ? `OTP sent. Dev OTP: ${data.devOtp}` : t('auth.otpSent'), 'success');
    } catch (error) {
      showError(error, t('auth.otpFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await verifyFarmerOtp(email, otp);
      addNotification(t('auth.loginSuccessful'), 'success');
      navigate(user.role === 'FARMER' ? '/farmer/dashboard' : '/dashboard');
    } catch (error) {
      showError(error, t('auth.otpInvalid'));
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
      <div className="relative z-10 w-full max-w-md rounded-lg border border-white/15 bg-white/95 p-6 shadow-2xl backdrop-blur dark:bg-[#151d19]/95 sm:p-8">
        <div className="mb-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-lg">
            <Leaf className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">{t('app.name')}</h1>
            <p className="text-slate-600 dark:text-gray-400 text-sm">{t('app.subtitle')}</p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 rounded-lg bg-slate-100 p-1 dark:bg-gray-900">
          <button 
            onClick={() => switchPortal('admin')} 
            className={`btn border-0 shadow-none ${portal === 'admin' ? 'btn-primary' : 'bg-transparent text-slate-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800'}`}
          >
            {t('auth.adminLogin')}
          </button>
          <button 
            onClick={() => switchPortal('farmer')} 
            className={`btn border-0 shadow-none ${portal === 'farmer' ? 'btn-primary' : 'bg-transparent text-slate-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800'}`}
          >
            {t('auth.farmerLogin')}
          </button>
        </div>

        {portal === 'farmer' && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            Farmers can log in with email and password. Phone OTP is available if your mobile number is registered.
          </div>
        )}

        {hasPrefilledIdentifier && (
          <div className="mb-6 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-200 animate-slide-up">
            {portal === 'admin' ? t('auth.newAdminSelected') : t('auth.newFarmerSelected')}
          </div>
        )}

        <form onSubmit={otpMode && portal === 'farmer' ? handleVerifyOtp : handleSubmit} className="space-y-5">
          {!otpMode && (
          <div className="form-group">
            <label className="form-label">{portal === 'farmer' ? 'Farmer Email' : t('auth.adminEmail')}</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="input" 
              placeholder={portal === 'farmer' ? 'farmer@example.com' : 'admin@example.com'}
              required 
            />
          </div>
          )}

          {otpMode && portal === 'farmer' && (
            <>
              <div className="form-group">
                <label className="form-label">Mobile number</label>
                <input
                  type="tel"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/[^\d+]/g, '').slice(0, 15))}
                  className="input"
                  inputMode="tel"
                  placeholder="Enter farmer mobile number"
                  required
                />
              </div>
              <button
                type="button"
                onClick={handleRequestOtp}
                className="btn btn-secondary w-full"
                disabled={loading || otpCooldown > 0}
              >
                {otpCooldown > 0 ? `${t('auth.resendOtp')} (${otpCooldown}s)` : otpRequested ? t('auth.resendOtp') : t('auth.sendOtp')}
              </button>
              {otpRequested && (
                <div className="form-group">
                  <label className="form-label">{t('auth.enterOtp')}</label>
                  <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} className="input text-center text-lg tracking-[0.3em]" inputMode="numeric" maxLength="6" required />
                </div>
              )}
            </>
          )}

          {!(otpMode && portal === 'farmer') && <div className="form-group">
            <label className="form-label">{t('auth.password')}</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="input pr-12" 
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-3 text-slate-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors duration-200"
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>}

          {portal === 'farmer' && (
            <button
              type="button"
              onClick={() => {
                setOtpMode((current) => !current);
                setOtpRequested(false);
                setOtp('');
                setEmail('');
              }}
              className="btn btn-secondary w-full justify-center"
            >
              {otpMode ? 'Use Email + Password' : 'Use Phone OTP'}
            </button>
          )}

          <button 
            type="submit" 
            className="btn btn-primary w-full justify-center gap-2 group" 
            disabled={loading}
          >
            {loading ? (
              <span className="loading-dots">
                <span></span><span></span><span></span>
              </span>
            ) : (
              <>
                {otpMode && portal === 'farmer' ? t('auth.verifyOtp') : portal === 'admin' ? t('auth.loginAsAdmin') : t('auth.loginAsFarmer')}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-slate-600 dark:bg-[#151d19] dark:text-gray-400">{t('auth.newHere')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button onClick={() => navigate('/register/admin')} className="btn btn-secondary group hover:border-emerald-600 dark:hover:border-emerald-400">
              {t('auth.createAdmin')}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={() => navigate('/register/farmer')} className="btn btn-secondary group hover:border-emerald-600 dark:hover:border-emerald-400">
              {t('auth.createFarmer')}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <button 
            onClick={openPasswordReset} 
            className="btn btn-secondary w-full hover:border-emerald-600 dark:hover:border-emerald-400"
          >
            {t('auth.forgotPassword')}
          </button>
        </div>
      </div>
    </div>
  );
};
