import { useState } from 'react';
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

// Demo practitioner user — no login required
const DEMO_USER = {
  id: 'demo-practitioner-001',
  email: 'dr.demo@isiqalo.co.za',
  firstName: 'Demo',
  lastName: 'Practitioner',
  role: 'practitioner',
  hpcsaNumber: 'MP1234567',
  speciality: 'General Medicine',
  practiceName: 'Isiqalo Demo Practice',
  practiceNumber: '1234567',
  subscriptionPlan: 'professional',
};

export default function App() {
  const [user, setUser] = useState(DEMO_USER);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Toast notifications manager
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Determine Tab Label Title
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Practitioner Operations Console';
      case 'upload': return 'Clinical Record Upload';
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

          <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius)', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Demo Mode Active
            </span>
          </div>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#fef3c7', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid #fde68a' }}>
              <ShieldCheck size={16} style={{ color: '#d97706' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>
                Demo API
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
