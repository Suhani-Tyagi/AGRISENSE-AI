import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sprout, Globe, User, LogOut, ShieldAlert, Sun, Moon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeRole: string;
  onRoleChange: (role: string) => void;
  onLogout: () => void;
  userName?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeRole, onRoleChange, onLogout, userName }) => {
  const { t, i18n } = useTranslation();
  const [isDark, setIsDark] = React.useState(document.body.classList.contains('dark'));

  const toggleLanguage = () => {
    const currentLang = i18n.language;
    i18n.changeLanguage(currentLang === 'en' ? 'hi' : 'en');
  };

  const toggleDarkMode = () => {
    if (document.body.classList.contains('dark')) {
      document.body.classList.remove('dark');
      setIsDark(false);
    } else {
      document.body.classList.add('dark');
      setIsDark(true);
    }
  };

  return (
    <div className="bg-earth-100 dark:bg-forest-900 min-h-screen w-full flex justify-center items-start">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md bg-earth-50 dark:bg-forest-900 min-h-screen shadow-2xl border-x border-earth-200 dark:border-forest-700 flex flex-col">
        
        {/* Demo Mode Banner */}
        <div className="bg-terracotta-50 text-terracotta-800 dark:bg-terracotta-900/30 dark:text-terracotta-400 text-xs font-bold py-2 px-4 flex items-center justify-between text-center border-b border-terracotta-200/50">
          <div className="flex items-center space-x-1 mx-auto">
            <ShieldAlert className="w-4 h-4 animate-pulse" />
            <span>{t('demoMode')}</span>
          </div>
        </div>

        {/* Navigation Bar */}
        <header className="sticky top-0 bg-white dark:bg-forest-800 border-b border-earth-200 dark:border-forest-700 z-50 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <Sprout className="w-6 h-6 text-forest-500" />
            <h1 className="text-lg font-bold text-forest-700 dark:text-forest-300 font-sans tracking-tight">
              {t('appName')}
            </h1>
          </div>

          <div className="flex items-center space-x-1">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl bg-earth-100 dark:bg-forest-750 hover:bg-earth-200 dark:hover:bg-forest-700 transition"
              title="Toggle Dark Mode"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-500" />
              ) : (
                <Moon className="w-5 h-5 text-earth-600" />
              )}
            </button>

            {/* Language Toggle Button */}
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-xl bg-earth-100 dark:bg-forest-750 hover:bg-earth-200 dark:hover:bg-forest-700 transition"
              title="Change Language"
            >
              <Globe className="w-5 h-5 text-earth-600 dark:text-forest-200" />
            </button>

            {/* Role Switcher Dropdown */}
            {userName && (
              <div className="relative">
                <select
                  value={activeRole}
                  onChange={(e) => onRoleChange(e.target.value)}
                  className="bg-earth-100 dark:bg-forest-700 text-earth-800 dark:text-forest-100 text-xs font-semibold py-2 px-3 rounded-xl border border-earth-200 dark:border-forest-600 focus:outline-none"
                >
                  <option value="farmer">{t('farmer')}</option>
                  <option value="buyer">{t('buyer')}</option>
                  <option value="finance_officer">{t('financeOfficer')}</option>
                </select>
              </div>
            )}

            {/* Logout Button */}
            {userName && (
              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-terracotta-100 hover:bg-terracotta-200 dark:bg-terracotta-900/30 dark:hover:bg-terracotta-900/50 transition"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-terracotta-600" />
              </button>
            )}
          </div>
        </header>

        {/* Main Content Slot */}
        <main className="flex-1 overflow-y-auto px-4 py-6">
          {userName && (
            <div className="mb-6 flex justify-between items-center bg-white dark:bg-forest-800 p-4 rounded-xl border border-earth-200 dark:border-forest-700 shadow-sm">
              <div>
                <span className="text-xs text-earth-500 dark:text-forest-400 font-medium uppercase tracking-wider">{t('welcome')}</span>
                <h2 className="text-base font-bold text-earth-900 dark:text-forest-100">{userName}</h2>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-forest-100 dark:bg-forest-700 text-forest-700 dark:text-forest-200 text-xs font-bold rounded-full">
                <User className="w-3.5 h-3.5" />
                <span>{activeRole === 'farmer' ? t('farmer') : activeRole === 'buyer' ? t('buyer') : t('financeOfficer')}</span>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
