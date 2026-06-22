import { useEffect, useState } from 'react';
import { apiRequest, removeToken, getToken } from './utils/api';
import AuthView from './views/AuthView';
import DashboardView from './views/DashboardView';
import UploadView from './views/UploadView';
import ExtractView from './views/ExtractView';
import BrowseView from './views/BrowseView';
import SettingsView from './views/SettingsView';
import { 
  Shield, 
  LayoutDashboard, 
  UploadCloud, 
  Database, 
  BookOpen, 
  Settings as SettingsIcon, 
  LogOut, 
  Bell, 
  ShieldCheck
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  hpcsaNumber: string;
  speciality: string;
  practiceName: string;
  practiceNumber: string;
  subscriptionPlan: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Toast notifications manager
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    async function checkAuth() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiRequest('/auth/me');
        setUser(data.user);
      } catch (err) {
        removeToken();
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogout = () => {
    removeToken();
    setUser(null);
    setActiveTab('dashboard');
    showToast('Logged out securely.', 'success');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}>
        <div style={{ textAlign: 'center' }}>
          <Shield size={48} className="upload-icon" style={{ animation: 'pulseBorder 1.5s infinite', color: 'var(--primary)' }} />
          <p style={{ marginTop: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>Connecting to secure portal...</p>
        </div>
      </div>
    );
  }

  // Not Authenticated
  if (!user) {
    return <AuthView onAuthSuccess={setUser} showToast={showToast} />;
  }

  // Determine Tab Label Title
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Practitioner Operations Console';
      case 'upload': return 'Anonymized Clinical Record Upload';
      case 'extract': return 'Data Extraction & Reporting Console';
      case 'browse': return 'Clinical Registry Directory';
      case 'settings': return 'Practitioner Security & Account Settings';
      default: return 'Isiqalo Med';
    }
  };

  return (
    <div className="app-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Shield size={24} />
            Isiqalo<span>Med</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          <button 
            className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>

          <button 
            className={`sidebar-item ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <UploadCloud size={18} /> Upload Case
          </button>

          <button 
            className={`sidebar-item ${activeTab === 'extract' ? 'active' : ''}`}
            onClick={() => setActiveTab('extract')}
          >
            <Database size={18} /> Extract Data
          </button>

          <button 
            className={`sidebar-item ${activeTab === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveTab('browse')}
          >
            <BookOpen size={18} /> Browse Cases
          </button>

          <button 
            className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={18} /> Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          {/* User profile capsule */}
          <div className="sidebar-profile" style={{ marginBottom: '0.75rem' }}>
            <div className="profile-avatar">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="profile-info">
              <p className="profile-name">Dr. {user.firstName} {user.lastName}</p>
              <p className="profile-role">{user.speciality}</p>
            </div>
          </div>

          <button className="sidebar-item" style={{ width: '100%', color: '#f87171' }} onClick={handleLogout}>
            <LogOut size={18} /> Logout Portal
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="app-main">
        <header className="app-topbar">
          <h2 className="topbar-title">{getTabTitle()}</h2>

          <div className="topbar-actions">
            <div className="notification-badge" title="Security & system alerts">
              <Bell size={18} />
              <span className="badge-dot"></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#d1fae5', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid #a7f3d0' }}>
              <ShieldCheck size={16} style={{ color: 'var(--success)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>
                Secure Mode
              </span>
            </div>
          </div>
        </header>

        <div className="app-content">
          {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} showToast={showToast} />}
          {activeTab === 'upload' && <UploadView onNavigate={setActiveTab} showToast={showToast} />}
          {activeTab === 'extract' && <ExtractView showToast={showToast} />}
          {activeTab === 'browse' && <BrowseView showToast={showToast} />}
          {activeTab === 'settings' && <SettingsView user={user} onUserUpdate={setUser} showToast={showToast} />}
        </div>
      </main>

      {/* TOAST TO NOTIFY OCCURRENCES */}
      {toast && (
        <div className={`notification-toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
