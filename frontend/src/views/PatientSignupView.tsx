import React, { useState } from 'react';
import { Shield, Mail, Lock, User, Calendar, FileText } from 'lucide-react';
import { apiRequest } from '../utils/api';

interface PatientSignupViewProps {
  onBackToLogin: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function PatientSignupView({ onBackToLogin, showToast }: PatientSignupViewProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dob: '',
    medicalNumber: '',
    email: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest('/auth/register/patient', 'POST', formData);
      showToast('Patient account created successfully! Please sign in.', 'success');
      onBackToLogin();
    } catch (err: any) {
      showToast(err.message || 'Registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <div className="auth-header">
          <div className="auth-logo">
            <Shield size={32} />
            Isiqalo<span>Med</span>
          </div>
          <p className="auth-subtitle">Patient Registration</p>
        </div>

        <div className="auth-body">
          <form onSubmit={handleSignup} className="animate-fade-in">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} className="search-icon" style={{ left: '0.85rem' }} />
                  <input type="text" name="firstName" className="form-input" style={{ paddingLeft: '2.5rem' }} value={formData.firstName} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Middle Name</label>
                <input type="text" name="middleName" className="form-input" value={formData.middleName} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <div style={{ position: 'relative' }}>
                <User size={18} className="search-icon" style={{ left: '0.85rem' }} />
                <input type="text" name="lastName" className="form-input" style={{ paddingLeft: '2.5rem' }} value={formData.lastName} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date of Birth *</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={18} className="search-icon" style={{ left: '0.85rem' }} />
                  <input type="date" name="dob" className="form-input" style={{ paddingLeft: '2.5rem' }} value={formData.dob} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Medical Number *</label>
                <div style={{ position: 'relative' }}>
                  <FileText size={18} className="search-icon" style={{ left: '0.85rem' }} />
                  <input type="text" name="medicalNumber" className="form-input" style={{ paddingLeft: '2.5rem' }} value={formData.medicalNumber} onChange={handleChange} required />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} className="search-icon" style={{ left: '0.85rem' }} />
                <input type="email" name="email" className="form-input" style={{ paddingLeft: '2.5rem' }} value={formData.email} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} className="search-icon" style={{ left: '0.85rem' }} />
                <input type="password" name="password" className="form-input" style={{ paddingLeft: '2.5rem' }} value={formData.password} onChange={handleChange} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up as Patient'}
            </button>
            
            <button type="button" className="btn" style={{ marginTop: '0.5rem', width: '100%', background: 'transparent', color: 'var(--muted-foreground)' }} onClick={onBackToLogin}>
              Back to Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
