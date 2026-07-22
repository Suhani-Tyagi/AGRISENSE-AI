import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Sprout, Phone, Lock, User, Mail, ShieldCheck } from 'lucide-react';

interface AuthProps {
  onLogin: (token: string, role: string, name: string, userId: number) => void;
  apiBaseUrl: string;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, apiBaseUrl }) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  
  // Form fields
  const [phone, setPhone] = useState('9876543210'); // Default to Ramesh Kumar's phone
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('farmer');

  // OTP flow simulation
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // States
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isLogin) {
      try {
        // Mocking the OTP trigger
        setShowOtp(true);
        setLoading(false);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Connection to AgriSense API failed.");
        setLoading(false);
      }
    } else {
      if (!name || !phone || !password) {
        setError("Please fill in all required fields.");
        setLoading(false);
        return;
      }
      try {
        await axios.post(`${apiBaseUrl}/api/auth/signup`, {
          name,
          phone,
          email: email || undefined,
          role,
          password
        });
        setShowOtp(true);
        setLoading(false);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Signup failed. Phone number may already exist.");
        setLoading(false);
      }
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (otpCode !== '123456') {
      setError("Invalid OTP code. For demo mode, please enter '123456'.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${apiBaseUrl}/api/auth/login`, {
        phone,
        password
      });
      const { access_token, role: userRole, name: userName, userId } = res.data;
      onLogin(access_token, userRole, userName, userId);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Authentication verify failed.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="flex flex-col items-center mb-8">
        <div className="p-4 bg-forest-100 dark:bg-forest-800 rounded-3xl mb-4 border border-forest-200 dark:border-forest-700 shadow-inner">
          <Sprout className="w-14 h-14 text-forest-600 dark:text-forest-400" />
        </div>
        <h2 className="text-2xl font-black text-earth-900 dark:text-forest-100 font-sans tracking-tight">
          AgriSense AI
        </h2>
        <p className="text-xs text-earth-500 dark:text-forest-400 text-center font-medium mt-1 px-4">
          Empowering smallholder farmers with crop health, fair markets & smart finance.
        </p>
      </div>

      <div className="w-full bg-white dark:bg-forest-800 border border-earth-200 dark:border-forest-700 rounded-3xl p-6 shadow-md">
        
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3.5 bg-terracotta-100 text-terracotta-800 text-xs font-semibold rounded-xl border border-terracotta-200 dark:bg-terracotta-900/20 dark:text-terracotta-400 dark:border-terracotta-900/40">
            {error}
          </div>
        )}

        {/* OTP Simulation Panel */}
        {showOtp ? (
          <form onSubmit={handleOtpVerify} className="space-y-6">
            <div className="text-center">
              <ShieldCheck className="w-12 h-12 text-forest-500 mx-auto mb-3 animate-pulse" />
              <h3 className="text-base font-bold text-earth-900 dark:text-forest-100">{t('otp')}</h3>
              <p className="text-xs text-earth-500 dark:text-forest-400 mt-1">
                OTP sent to {phone}. For demo verification, enter <strong className="text-forest-600 font-bold">123456</strong>.
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="input-earth text-center text-lg font-bold letter-spacing-wide"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? t('loading') : t('submit')}
            </button>
            
            <button
              type="button"
              onClick={() => setShowOtp(false)}
              className="text-xs font-semibold text-earth-500 hover:text-earth-700 block mx-auto text-center mt-2"
            >
              Back to Form
            </button>
          </form>
        ) : (
          /* Main Login / Register Tabs */
          <div>
            <div className="flex border-b border-earth-200 dark:border-forest-700 mb-6">
              <button
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-all ${
                  isLogin
                    ? 'border-forest-500 text-forest-600 dark:text-forest-400'
                    : 'border-transparent text-earth-500 hover:text-earth-700'
                }`}
              >
                {t('login')}
              </button>
              <button
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-all ${
                  !isLogin
                    ? 'border-forest-500 text-forest-600 dark:text-forest-400'
                    : 'border-transparent text-earth-500 hover:text-earth-700'
                }`}
              >
                {t('signup')}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Name Field (Sign Up Only) */}
              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-earth-500 dark:text-forest-400 uppercase tracking-wider">{t('name')} *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-5 h-5 text-earth-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="input-earth pl-12"
                    />
                  </div>
                </div>
              )}

              {/* Phone Field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-earth-500 dark:text-forest-400 uppercase tracking-wider">{t('phone')} *</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 w-5 h-5 text-earth-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="input-earth pl-12"
                  />
                </div>
              </div>

              {/* Email Field (Sign Up Only) */}
              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-earth-500 dark:text-forest-400 uppercase tracking-wider">{t('email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-earth-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. name@agrisense.com"
                      className="input-earth pl-12"
                    />
                  </div>
                </div>
              )}

              {/* Password Field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-earth-500 dark:text-forest-400 uppercase tracking-wider">{t('password')} *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-earth-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-earth pl-12"
                  />
                </div>
              </div>

              {/* Role Field (Sign Up Only) */}
              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-earth-500 dark:text-forest-400 uppercase tracking-wider">{t('role')} *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="input-earth"
                  >
                    <option value="farmer">{t('farmer')}</option>
                    <option value="buyer">{t('buyer')}</option>
                    <option value="finance_officer">{t('financeOfficer')}</option>
                  </select>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
                {loading ? t('loading') : isLogin ? t('login') : t('signup')}
              </button>

              <div className="text-center mt-4">
                <p className="text-[11px] text-earth-400 leading-normal">
                  Demo Credentials: Password is <strong className="text-forest-600 font-bold">password123</strong><br/>
                  Farmer: <strong className="font-semibold text-earth-600">9876543210</strong> | Buyer: <strong className="font-semibold text-earth-600">8876543210</strong> | Officer: <strong className="font-semibold text-earth-600">7876543210</strong>
                </p>
              </div>

            </form>
          </div>
        )}

      </div>
    </div>
  );
};
