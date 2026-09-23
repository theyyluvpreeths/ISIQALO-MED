import React, { useState } from 'react';
import { Shield, Mail, Lock, User, Briefcase, FileText, CheckCircle } from 'lucide-react';
import { apiRequest } from '../utils/api';

interface PractitionerSignupViewProps {
  onBackToLogin: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function PractitionerSignupView({ onBackToLogin, showToast }: PractitionerSignupViewProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    hpcsaNumber: '',
    speciality: '',
    practiceName: '',
    practiceNumber: '',
    packageChoice: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectPackage = (pkg: string) => {
    setFormData(prev => ({ ...prev, packageChoice: pkg }));
    setStep(3); // Move to summary/submit
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    
    if (step === 3) {
      setLoading(true);
      try {
        await apiRequest('/auth/register/practitioner', 'POST', formData);
        showToast('Practitioner account created successfully! Please sign in.', 'success');
        onBackToLogin();
      } catch (err: any) {
        showToast(err.message || 'Registration failed.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '600px' }}>
        <div className="auth-header">
          <div className="auth-logo">
            <Shield size={32} />
            Isiqalo<span>Med</span>
          </div>
          <p className="auth-subtitle">
            {step === 1 && 'Practitioner Registration'}
            {step === 2 && 'Select Your Package'}
            {step === 3 && 'Confirm & Register'}
          </p>
        </div>

        <div className="auth-body">
          <form onSubmit={handleSignup} className="animate-fade-in">
            
            {/* STEP 1: Details */}
            {step === 1 && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} className="search-icon" style={{ left: '0.85rem' }} />
                      <input type="text" name="firstName" className="form-input" style={{ paddingLeft: '2.5rem' }} value={formData.firstName} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} className="search-icon" style={{ left: '0.85rem' }} />
                      <input type="text" name="lastName" className="form-input" style={{ paddingLeft: '2.5rem' }} value={formData.lastName} onChange={handleChange} required />
                    </div>
                  </div>
                </div>

                <div className="form-row">
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
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">HPCSA Number *</label>
                    <div style={{ position: 'relative' }}>
                      <FileText size={18} className="search-icon" style={{ left: '0.85rem' }} />
                      <input type="text" name="hpcsaNumber" className="form-input" style={{ paddingLeft: '2.5rem' }} value={formData.hpcsaNumber} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Speciality</label>
                    <div style={{ position: 'relative' }}>
                      <Briefcase size={18} className="search-icon" style={{ left: '0.85rem' }} />
                      <input type="text" name="speciality" className="form-input" style={{ paddingLeft: '2.5rem' }} value={formData.speciality} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Practice Name</label>
                    <div style={{ position: 'relative' }}>
                      <Briefcase size={18} className="search-icon" style={{ left: '0.85rem' }} />
                      <input type="text" name="practiceName" className="form-input" style={{ paddingLeft: '2.5rem' }} value={formData.practiceName} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Practice Number</label>
                    <div style={{ position: 'relative' }}>
                      <FileText size={18} className="search-icon" style={{ left: '0.85rem' }} />
                      <input type="text" name="practiceNumber" className="form-input" style={{ paddingLeft: '2.5rem' }} value={formData.practiceNumber} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                  Next Step: Choose Package
                </button>
              </>
            )}

            {/* STEP 2: Packages */}
            {step === 2 && (
              <div className="packages-container" style={{ display: 'grid', gap: '1rem' }}>
                <div 
                  className="package-card" 
                  style={{ border: '2px solid var(--border)', padding: '1.5rem', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => selectPackage('starter')}
                >
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Basic Starter <CheckCircle size={16} /></h3>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>Essential tools for individual practitioners. Includes basic case management.</p>
                  </div>
                </div>

                <div 
                  className="package-card" 
                  style={{ border: '2px solid var(--border)', padding: '1.5rem', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => selectPackage('professional')}
                >
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Professional <CheckCircle size={16} /></h3>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>Advanced PACS viewing, extraction tools, and collaboration features.</p>
                  </div>
                </div>

                <div 
                  className="package-card" 
                  style={{ border: '2px solid var(--border)', padding: '1.5rem', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => selectPackage('enterprise')}
                >
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Enterprise <CheckCircle size={16} /></h3>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>Full clinic management, unlimited storage, API access and priority support.</p>
                  </div>
                </div>

                <button type="button" className="btn" style={{ marginTop: '1rem', width: '100%', background: 'transparent', color: 'var(--muted-foreground)' }} onClick={() => setStep(1)}>
                  Back
                </button>
              </div>
            )}

            {/* STEP 3: Confirm */}
            {step === 3 && (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <CheckCircle size={48} style={{ margin: '0 auto 1rem', color: 'var(--success)' }} />
                <h3>Ready to join Isiqalo Med!</h3>
                <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>You have selected the <strong>{formData.packageChoice.toUpperCase()}</strong> package. You will be able to update your payment details later.</p>
                
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Creating Account...' : 'Complete Registration'}
                </button>
                
                <button type="button" className="btn" style={{ marginTop: '1rem', width: '100%', background: 'transparent', color: 'var(--muted-foreground)' }} onClick={() => setStep(2)}>
                  Change Package
                </button>
              </div>
            )}
            
            {step === 1 && (
              <button type="button" className="btn" style={{ marginTop: '0.5rem', width: '100%', background: 'transparent', color: 'var(--muted-foreground)' }} onClick={onBackToLogin}>
                Back to Login
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
