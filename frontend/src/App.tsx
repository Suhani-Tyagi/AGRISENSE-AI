import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import './i18n';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('agrisense_token'));
  const [role, setRole] = useState<string>(localStorage.getItem('agrisense_role') || 'farmer');
  const [name, setName] = useState<string>(localStorage.getItem('agrisense_name') || '');
  const [userId, setUserId] = useState<number>(parseInt(localStorage.getItem('agrisense_userId') || '0', 10));

  // Determine API base url dynamically (supports both local development and docker-compose/cloud deploy)
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:8000');

  useEffect(() => {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      // In production or custom domains, point to current origin
      setApiBaseUrl(window.location.origin);
    }
  }, []);

  const handleLogin = (authToken: string, userRole: string, userName: string, id: number) => {
    localStorage.setItem('agrisense_token', authToken);
    localStorage.setItem('agrisense_role', userRole);
    localStorage.setItem('agrisense_name', userName);
    localStorage.setItem('agrisense_userId', id.toString());

    setToken(authToken);
    setRole(userRole);
    setName(userName);
    setUserId(id);
  };

  const handleRoleChange = (newRole: string) => {
    localStorage.setItem('agrisense_role', newRole);
    setRole(newRole);
  };

  const handleLogout = () => {
    localStorage.removeItem('agrisense_token');
    localStorage.removeItem('agrisense_role');
    localStorage.removeItem('agrisense_name');
    localStorage.removeItem('agrisense_userId');

    setToken(null);
    setName('');
    setUserId(0);
  };

  return (
    <Layout
      activeRole={role}
      onRoleChange={handleRoleChange}
      onLogout={handleLogout}
      userName={name || undefined}
    >
      {token ? (
        <Dashboard
          token={token}
          role={role}
          userId={userId}
          apiBaseUrl={apiBaseUrl}
        />
      ) : (
        <Auth
          onLogin={handleLogin}
          apiBaseUrl={apiBaseUrl}
        />
      )}
    </Layout>
  );
}

export default App;
