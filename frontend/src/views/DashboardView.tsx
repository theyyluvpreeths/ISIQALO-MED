import { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { FileText, Download, Eye, Award, Plus, Database, ShieldAlert } from 'lucide-react';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  sufferingFrom: string;
  organisationName: string;
  viewsCount: number;
  downloadsCount: number;
  createdAt: string;
}

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function DashboardView({ onNavigate, showToast }: DashboardViewProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [extractionsCount, setExtractionsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const patientsData = await apiRequest('/patients');
        setPatients(patientsData || []);

        const extractHistory = await apiRequest('/extract/history');
        setExtractionsCount(extractHistory.length);
      } catch (err: any) {
        showToast('Failed to load dashboard metrics.', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalViews = patients.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <p style={{ color: 'var(--muted-foreground)' }}>Loading portal metrics...</p>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* KPI METRICS ROW */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">
            <FileText size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Cases Uploaded</span>
            <span className="kpi-value">{patients.length}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <Download size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Cases Extracted</span>
            <span className="kpi-value">{extractionsCount}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
            <Eye size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Case Views</span>
            <span className="kpi-value">{totalViews}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#d1fae5', color: '#059669' }}>
            <Award size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Compliance Index</span>
            <span className="kpi-value">100%</span>
          </div>
        </div>
      </div>

      {/* DASHBOARD DETAILS GRID */}
      <div className="dashboard-grid">
        {/* RECENT UPLOADS TABLE */}
        <div className="panel-card">
          <div className="panel-header">
            <h3 className="panel-title">Recent Clinical Records</h3>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              onClick={() => onNavigate('browse')}
            >
              Browse Registry
            </button>
          </div>

          <div className="data-table-container">
            {patients.length === 0 ? (
              <p style={{ color: 'var(--muted-foreground)', padding: '2rem', textAlign: 'center' }}>
                No clinical records logged yet. Get started by uploading a case.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Name</th>
                    <th>Condition</th>
                    <th>Institution</th>
                    <th>Upload Date</th>
                    <th>Stats</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.slice(0, 5).map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{p.id}</td>
                      <td>{p.firstName} {p.lastName}</td>
                      <td>
                        <span className="status-badge status-info">{p.sufferingFrom}</span>
                      </td>
                      <td>{p.organisationName}</td>
                      <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                          {p.viewsCount || 0} views / {p.downloadsCount || 0} dl
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* QUICK ACTIONS SIDE BAR PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="panel-card" style={{ flex: 1 }}>
            <div className="panel-header">
              <h3 className="panel-title">Quick Actions</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                onClick={() => onNavigate('upload')}
              >
                <Plus size={18} /> Upload Clinical Record
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ width: '100%' }}
                onClick={() => onNavigate('extract')}
              >
                <Database size={18} /> Run Data Extraction
              </button>
            </div>
          </div>

          <div className="panel-card" style={{ flex: 1, borderLeft: '4px solid var(--primary)' }}>
            <div className="panel-header">
              <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={18} style={{ color: 'var(--primary)' }} /> Privacy & Zero-Trust
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', lineHeight: '1.4' }}>
              Isiqalo Med operates on a strict zero-trust information structure. Every case summary and patient attachment is dynamically encrypted using AES-256-GCM. 
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', lineHeight: '1.4', marginTop: '0.5rem' }}>
              HPCSA practitioners are audited for all database reads, data extractions, and logins. Keep keys secure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
