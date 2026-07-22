import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sprout, Globe, User, LogOut, ShieldAlert, Sun, Moon, Bell, Info } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeRole: string;
  onRoleChange: (role: string) => void;
  onLogout: () => void;
  userName?: string;
  notifications: any[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeRole,
  onRoleChange,
  onLogout,
  userName,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead
}) => {
  const { t, i18n } = useTranslation();
  
  // Theme initialization with localStorage check
  const [isDark, setIsDark] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return document.body.classList.contains('dark');
  });

  const [showNotifications, setShowNotifications] = useState(false);

  // Apply dark mode theme class on change
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleLanguage = () => {
    const currentLang = i18n.language;
    const nextLang = currentLang === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('lng', nextLang);
  };

  const toggleDarkMode = () => {
    setIsDark(!isDark);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="bg-earth-100 dark:bg-forest-900 min-h-screen w-full flex justify-center items-start transition-colors duration-300">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md bg-earth-50 dark:bg-forest-900 min-h-screen shadow-2xl border-x border-earth-200 dark:border-forest-700 flex flex-col relative">
        
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
              aria-label="Toggle Dark Mode"
              className="p-2 rounded-xl bg-earth-100 dark:bg-forest-750 hover:bg-earth-200 dark:hover:bg-forest-700 transition active:scale-95"
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
              aria-label="Change Language"
              className="p-2 rounded-xl bg-earth-100 dark:bg-forest-750 hover:bg-earth-200 dark:hover:bg-forest-700 transition active:scale-95"
              title="Change Language"
            >
              <Globe className="w-5 h-5 text-earth-600 dark:text-forest-200" />
            </button>

            {/* Notification Bell */}
            {userName && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  aria-label="View Notifications"
                  className="p-2 rounded-xl bg-earth-100 dark:bg-forest-750 hover:bg-earth-200 dark:hover:bg-forest-700 transition relative active:scale-95"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5 text-earth-600 dark:text-forest-200" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-terracotta-500 text-white font-bold text-[9px] w-5 h-5 flex items-center justify-center rounded-full border border-white animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Role Switcher Dropdown */}
            {userName && (
              <div className="relative">
                <select
                  value={activeRole}
                  onChange={(e) => onRoleChange(e.target.value)}
                  aria-label="Select User Role"
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
                aria-label="Logout"
                className="p-2 rounded-xl bg-terracotta-100 hover:bg-terracotta-200 dark:bg-terracotta-900/30 dark:hover:bg-terracotta-900/50 transition active:scale-95"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-terracotta-600" />
              </button>
            )}
          </div>
        </header>

        {/* Notifications Dropdown Panel */}
        {showNotifications && userName && (
          <div className="absolute top-16 left-4 right-4 bg-white dark:bg-forest-800 border border-earth-200 dark:border-forest-700 rounded-2xl shadow-2xl p-4 z-40 space-y-3 max-h-[300px] overflow-y-auto animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-earth-100 dark:border-forest-700">
              <h3 className="text-xs font-bold uppercase tracking-wider text-earth-600 dark:text-forest-300">
                {t('notifications', 'Notifications')}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    onMarkAllNotificationsRead();
                  }}
                  className="text-[10px] text-forest-600 dark:text-forest-400 font-bold hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="space-y-2">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      onMarkNotificationRead(notif.id);
                    }}
                    className={`p-2.5 rounded-xl border flex items-start space-x-2.5 transition cursor-pointer text-xs ${
                      notif.isRead
                        ? 'bg-earth-50 border-earth-100 dark:bg-forest-900/10 dark:border-forest-800 opacity-60'
                        : 'bg-forest-50/50 border-forest-150 dark:bg-forest-850 dark:border-forest-700 font-medium'
                    }`}
                  >
                    <Info className="w-4 h-4 text-forest-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-0.5">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-earth-850 dark:text-forest-100">{notif.title}</span>
                        {!notif.isRead && (
                          <span className="w-1.5 h-1.5 bg-terracotta-500 rounded-full flex-shrink-0 mt-1"></span>
                        )}
                      </div>
                      <p className="text-[10px] text-earth-500 dark:text-forest-400 leading-normal">{notif.desc}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-earth-500 italic text-center py-4">No notifications yet.</p>
              )}
            </div>
            
            <button
              onClick={() => setShowNotifications(false)}
              className="w-full text-center text-[10px] text-earth-450 hover:underline pt-1"
            >
              Close Panel
            </button>
          </div>
        )}

        {/* Main Content Slot */}
        <main className="flex-1 overflow-y-auto px-4 py-6">
          {userName && (
            <div className="mb-6 flex justify-between items-center bg-white dark:bg-forest-800 p-4 rounded-xl border border-earth-200 dark:border-forest-700 shadow-sm animate-fade-in">
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
