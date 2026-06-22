import React, { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { User, Stethoscope, Link2, Shield, Save, Check } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  ip_address: string;
  details: string;
  created_at: string;
}

interface SettingsViewProps {
  user: any;
  onUserUpdate: (updatedUser: any) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function SettingsView({ user, onUserUpdate, showToast }: SettingsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'practice' | 'integrations' | 'subscription'>('profile');
  const [loading, setLoading] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [speciality, setSpeciality] = useState(user.speciality || '');
  const [practiceName, setPracticeName] = useState(user.practiceName || '');
  const [practiceNumber, setPracticeNumber] = useState(user.practiceNumber || '');
  const [subscriptionPlan, setSubscriptionPlan] = useState(user.subscriptionPlan || 'starter');

  // Integrations State
  const [nhlsConnected, setNhlsConnected] = useState(true);
  const [discoveryConnected, setDiscoveryConnected] = useState(false);

  // Security logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (activeSubTab === 'subscription') {
      fetchAuditLogs();
    }
  }, [activeSubTab]);

  async function fetchAuditLogs() {
    try {
      const logs = await apiRequest('/settings/audit-logs');
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to retrieve compliance audit logs:', err);
    }
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest('/settings/profile', 'PUT', {
        firstName,
        lastName,
        speciality,
        practiceName,
        practiceNumber
      });
      showToast('Practitioner profiles and settings saved successfully.', 'success');
      onUserUpdate({
        ...user,
        firstName,
        lastName,
        speciality,
        practiceName,
        practiceNumber
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeSubscription = async (plan: 'starter' | 'professional' | 'enterprise') => {
    setLoading(true);
    try {
      await apiRequest('/settings/subscription', 'PUT', { plan });
      setSubscriptionPlan(plan);
      onUserUpdate({
        ...user,
        subscriptionPlan: plan
      });
      showToast(`Subscription plan updated to: ${plan}`, 'success');
      fetchAuditLogs(); // Refresh logs
    } catch (err: any) {
      showToast(err.message || 'Failed to change subscription plan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel-card animate-slide-up">
      {/* Sub Tabs */}
      <div className="settings-tabs">
        <button
          className={`settings-tab-btn ${activeSubTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('profile')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <User size={16} /> Profile Info
          </span>
        </button>
        <button
          className={`settings-tab-btn ${activeSubTab === 'practice' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('practice')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Stethoscope size={16} /> Practice Details
          </span>
        </button>
        <button
          className={`settings-tab-btn ${activeSubTab === 'integrations' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('integrations')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Link2 size={16} /> Integrations
          </span>
        </button>
        <button
          className={`settings-tab-btn ${activeSubTab === 'subscription' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('subscription')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Shield size={16} /> Security & Subscription
          </span>
        </button>
      </div>

      {/* Profile Info Tab */}
      {activeSubTab === 'profile' && (
        <form onSubmit={handleProfileSave} className="animate-fade-in" style={{ maxWidth: '600px' }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input
                type="text"
                className="form-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                className="form-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">HPCSA Registration Number</label>
            <input
              type="text"
              className="form-input"
              value={user.hpcsaNumber}
              disabled
              style={{ background: 'var(--muted)', cursor: 'not-allowed' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>HPCSA license numbers are verified on registry and cannot be modified.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Specialist Speciality</label>
            <input
              type="text"
              className="form-input"
              value={speciality}
              onChange={(e) => setSpeciality(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto', marginTop: '1rem' }}>
            <Save size={18} /> {loading ? 'Saving Profile...' : 'Save Settings'}
          </button>
        </form>
      )}

      {/* Practice Details Tab */}
      {activeSubTab === 'practice' && (
        <form onSubmit={handleProfileSave} className="animate-fade-in" style={{ maxWidth: '600px' }}>
          <div className="form-group">
            <label className="form-label">Practice Group Name</label>
            <input
              type="text"
              className="form-input"
              value={practiceName}
              onChange={(e) => setPracticeName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Practice Number (7 digits)</label>
            <input
              type="text"
              className="form-input"
              value={practiceNumber}
              onChange={(e) => setPracticeNumber(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto', marginTop: '1rem' }}>
            <Save size={18} /> {loading ? 'Saving Details...' : 'Save Settings'}
          </button>
        </form>
      )}

      {/* Integrations Tab */}
      {activeSubTab === 'integrations' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--input-bg)' }}>
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>National Health Laboratory Service (NHLS)</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Auto-pull diagnostic records into clinical registries</span>
            </div>
            <button
              type="button"
              className={`btn ${nhlsConnected ? 'btn-primary' : 'btn-outline'}`}
              style={{ width: 'auto', padding: '0.4rem 1rem' }}
              onClick={() => setNhlsConnected(!nhlsConnected)}
            >
              {nhlsConnected ? 'Connected' : 'Connect'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--input-bg)' }}>
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>Discovery Health Provider API</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Send medical charts securely for claim verification audits</span>
            </div>
            <button
              type="button"
              className={`btn ${discoveryConnected ? 'btn-primary' : 'btn-outline'}`}
              style={{ width: 'auto', padding: '0.4rem 1rem' }}
              onClick={() => setDiscoveryConnected(!discoveryConnected)}
            >
              {discoveryConnected ? 'Connected' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      {/* Security & Subscription Tab */}
      {activeSubTab === 'subscription' && (
        <div className="animate-fade-in">
          {/* Subscription Section */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Active Plan: <span style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{subscriptionPlan}</span></h4>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Change subscription level matching practitioner requirements.</p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {(['starter', 'professional', 'enterprise'] as const).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  className={`btn ${subscriptionPlan === plan ? 'btn-primary' : 'btn-outline'}`}
                  style={{ width: 'auto', flex: '1', minWidth: '150px', textTransform: 'capitalize' }}
                  onClick={() => handleUpgradeSubscription(plan)}
                  disabled={loading}
                >
                  {subscriptionPlan === plan && <Check size={16} style={{ marginRight: '0.25rem' }} />} {plan} Tier
                </button>
              ))}
            </div>
          </div>

          {/* Compliance Audit Logs List */}
          <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Compliance Security Audit Logs</h4>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Trace security occurrences logged for HPCSA license verification audits.</p>

            <div className="data-table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Action</th>
                    <th>IP Address</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                      <td>
                        <span className="status-badge status-info" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{log.ip_address}</td>
                      <td style={{ fontSize: '0.85rem' }}>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
