import { useState, useEffect } from 'react';
import DashboardView from './views/DashboardView';
import UploadView from './views/UploadView';
import ExtractView from './views/ExtractView';
import BrowseView from './views/BrowseView';
import ManageCasesView from './views/ManageCasesView';
import MessagesView from './views/MessagesView';
import SettingsView from './views/SettingsView';
import AuthView from './views/AuthView';
import PatientSignupView from './views/PatientSignupView';
import PractitionerSignupView from './views/PractitionerSignupView';
import { 
  Shield, 
  LayoutDashboard, 
  UploadCloud, 
  Database, 
  BookOpen, 
  Settings as SettingsIcon, 
  Bell, 
  ShieldCheck,
  MessageSquare,
  LogOut
} from 'lucide-react';
import { apiRequest, setToken } from './utils/api';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('browse');
  
  // Auth state
  const [authMode, setAuthMode] = useState<'login' | 'patient_signup' | 'practitioner_signup'>('login');
  
  // Toast notifications manager
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    // Basic init check
    const checkAuth = async () => {
      const token = localStorage.getItem('isiqalo_token');
      if (token) {
        setToken(token);
        try {
          const res = await apiRequest('/auth/me', 'GET');
          setUser(res.user);
          setActiveTab(res.user.role === 'patient' ? 'browse' : 'dashboard');
        } catch (err) {
          localStorage.removeItem('isiqalo_token');
          setToken(null);
        }
      }
    };
    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isiqalo_token');
    setToken(null);
    setUser(null);
  };

  if (!user) {
    if (authMode === 'patient_signup') {
      return <PatientSignupView onBackToLogin={() => setAuthMode('login')} showToast={showToast} />;
    }
    if (authMode === 'practitioner_signup') {
      return <PractitionerSignupView onBackToLogin={() => setAuthMode('login')} showToast={showToast} />;
    }
    
    return <AuthView 
      onAuthSuccess={(u) => {
        setUser(u);
        setActiveTab(u.role === 'patient' ? 'browse' : 'dashboard');
      }} 
      showToast={showToast} 
      onNavigateSignup={(role) => setAuthMode(role === 'patient' ? 'patient_signup' : 'practitioner_signup')}
    />;
  }

  // Determine Tab Label Title
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Practitioner Operations Console';
      case 'upload': return 'Clinical Record Upload';
      case 'extract': return 'Data Extraction & Reporting Console';
      case 'browse': return 'Clinical Registry Directory';
      case 'manage': return 'Manage Cases';
      case 'messages': return 'Private Communications';
      case 'settings': return 'Practitioner Security & Account Settings';
      default: return 'Isiqalo Med';
    }
  };

  return (
    <div className="app-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className="app-sidebar">
        <div className="sidebar-header" style={{ padding: 0 }}>
          <div className="sidebar-logo" style={{ padding: 0, margin: 0, width: '100%', height: '100%', display: 'flex' }}>
            <img src="/generated_logo.png" alt="Isiqalo Med Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        </div>

        <nav className="sidebar-menu">
          {user.role !== 'patient' && (
            <>
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
            </>
          )}

          <button 
            className={`sidebar-item ${activeTab === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveTab('browse')}
          >
            <BookOpen size={18} /> Browse Cases
          </button>

          {user.role !== 'patient' && (
            <button 
              className={`sidebar-item ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              <Database size={18} /> Manage Cases
            </button>
          )}

          <button 
            className={`sidebar-item ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            <MessageSquare size={18} /> Private Chats
          </button>

          <button 
            className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={18} /> Settings
          </button>
          
          <button 
            className="sidebar-item"
            style={{ color: '#ef4444', marginTop: '1rem' }}
            onClick={handleLogout}
          >
            <LogOut size={18} /> Logout
          </button>
        </nav>

        <div className="sidebar-footer">
          {/* User profile capsule */}
          <div className="sidebar-profile" style={{ marginBottom: '0.75rem' }}>
            <div className="profile-avatar">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="profile-info">
              <p className="profile-name">
                {user.role === 'patient' ? `${user.firstName} ${user.lastName}` : `Dr. ${user.firstName} ${user.lastName}`}
              </p>
              <p className="profile-role">{user.role === 'patient' ? 'Patient' : user.speciality}</p>
            </div>
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
          {activeTab === 'browse' && <BrowseView user={user} showToast={showToast} />}
          {activeTab === 'manage' && <ManageCasesView showToast={showToast} />}
          {activeTab === 'messages' && <MessagesView user={user} />}
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
