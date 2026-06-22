import React, { useState } from 'react';
import { apiRequest, setToken } from '../utils/api';
import { Shield, Lock, Mail, Stethoscope, Briefcase, ChevronRight, Check } from 'lucide-react';

interface AuthViewProps {
  onAuthSuccess: (user: any) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function AuthView({ onAuthSuccess, showToast }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1 = Details, 2 = Practice, 3 = Plans
  const [loading, setLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [hpcsaNumber, setHpcsaNumber] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [practiceName, setPracticeName] = useState('');
  const [practiceNumber, setPracticeNumber] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'professional' | 'enterprise'>('starter');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please fill in all credentials.', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', 'POST', { email, password });
      setToken(data.token);
      showToast('Welcome back to Isiqalo Med!', 'success');
      onAuthSuccess(data.user);
    } catch (err: any) {
      showToast(err.message || 'Login failed. Please check credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/auth/register', 'POST', {
        email,
        password,
        firstName,
        lastName,
        hpcsaNumber,
        speciality,
        practiceName,
        practiceNumber,
        subscriptionPlan: selectedPlan,
      });
      setToken(data.token);
      showToast('Registration successful! Welcome to the network.', 'success');
      onAuthSuccess(data.user);
    } catch (err: any) {
      showToast(err.message || 'Registration failed. Please check validation errors.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateStep1 = () => {
    if (!email || !password || !firstName || !lastName || !hpcsaNumber || !speciality) {
      showToast('Please fill in all practitioner fields.', 'error');
      return false;
    }
    const hpcsaRegex = /^MP\s?\d{7}$/i;
    if (!hpcsaRegex.test(hpcsaNumber)) {
      showToast('HPCSA number must match standard format e.g. MP1234567', 'error');
      return false;
    }
    if (password.length < 8) {
      showToast('Password must be at least 8 characters long.', 'error');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!practiceName || !practiceNumber) {
      showToast('Please fill in all practice fields.', 'error');
      return false;
    }
    const practiceRegex = /^\d{7}$/;
    if (!practiceRegex.test(practiceNumber)) {
      showToast('Practice number must be a 7-digit identifier', 'error');
      return false;
    }
    return true;
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Shield size={32} />
            Isiqalo<span>Med</span>
          </div>
          <p className="auth-subtitle">
            {isLogin 
              ? 'Secure Practitioner Clinical Portal' 
              : 'Secure Practitioner Registration Protocol'}
          </p>
        </div>

        <div className="auth-body">
          {isLogin ? (
            // LOGIN FORM
            <form onSubmit={handleLoginSubmit} className="animate-fade-in">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} className="search-icon" style={{ left: '0.85rem' }} />
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="practitioner@institution.co.za"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Secure Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} className="search-icon" style={{ left: '0.85rem' }} />
                  <input
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
              </button>

              <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                Need clinical access?{' '}
                <button type="button" className="link-btn" onClick={() => setIsLogin(false)} style={{ color: 'var(--primary)', fontWeight: '600' }}>
                  Register Practitioner
                </button>
              </p>
            </form>
          ) : (
            // SIGNUP MULTI-STEP FLOW
            <div className="animate-fade-in">
              {/* Steps Progress Indicator */}
              <div className="auth-steps">
                <div className={`auth-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>1</div>
                <div className={`auth-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>2</div>
                <div className={`auth-step ${step >= 3 ? 'active' : ''}`}>3</div>
              </div>

              {step === 1 && (
                <div className="animate-slide-up">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Practitioner Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="dr.doe@hospital.co.za"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Create Password</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Minimum 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">HPCSA Number</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="MP1234567"
                        value={hpcsaNumber}
                        onChange={(e) => setHpcsaNumber(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Speciality</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Cardiology"
                        value={speciality}
                        onChange={(e) => setSpeciality(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ marginTop: '1rem' }}
                    onClick={() => {
                      if (validateStep1()) setStep(2);
                    }}
                  >
                    Continue <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="animate-slide-up">
                  <div className="form-group">
                    <label className="form-label">Clinical Practice Name</label>
                    <div style={{ position: 'relative' }}>
                      <Briefcase className="search-icon" size={18} style={{ left: '0.85rem' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.5rem' }}
                        placeholder="e.g. Johannesburg Medical Group"
                        value={practiceName}
                        onChange={(e) => setPracticeName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Practice Number (7 digits)</label>
                    <div style={{ position: 'relative' }}>
                      <Stethoscope className="search-icon" size={18} style={{ left: '0.85rem' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.5rem' }}
                        placeholder="e.g. 1234567"
                        value={practiceNumber}
                        onChange={(e) => setPracticeNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row" style={{ marginTop: '1.5rem' }}>
                    <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>
                      Back
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        if (validateStep2()) setStep(3);
                      }}
                    >
                      Next Step <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="animate-slide-up">
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', textAlign: 'center' }}>Select Practice Subscription</h3>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                    Choose a plan matching your scale. You can change this later.
                  </p>

                  <div className="plans-grid">
                    <div
                      className={`plan-card ${selectedPlan === 'starter' ? 'selected' : ''}`}
                      onClick={() => setSelectedPlan('starter')}
                    >
                      {selectedPlan === 'starter' && <span className="plan-badge"><Check size={12} /></span>}
                      <h4 className="plan-title">Starter Plan</h4>
                      <p className="plan-price">Free</p>
                      <ul className="plan-features">
                        <li>• Log up to 10 clinical cases</li>
                        <li>• Basic summary encryption</li>
                      </ul>
                    </div>

                    <div
                      className={`plan-card ${selectedPlan === 'professional' ? 'selected' : ''}`}
                      onClick={() => setSelectedPlan('professional')}
                    >
                      {selectedPlan === 'professional' && <span className="plan-badge"><Check size={12} /></span>}
                      <h4 className="plan-title">Professional</h4>
                      <p className="plan-price">R750 <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>/ mo</span></p>
                      <ul className="plan-features">
                        <li>• Unlimited case registries</li>
                        <li>• PDF, CSV, ZIP exports</li>
                        <li>• Full compliance audit trails</li>
                      </ul>
                    </div>

                    <div
                      className={`plan-card ${selectedPlan === 'enterprise' ? 'selected' : ''}`}
                      onClick={() => setSelectedPlan('enterprise')}
                    >
                      {selectedPlan === 'enterprise' && <span className="plan-badge"><Check size={12} /></span>}
                      <h4 className="plan-title">Enterprise</h4>
                      <p className="plan-price">R2,999 <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>/ mo</span></p>
                      <ul className="plan-features">
                        <li>• Multiple practitioner keys</li>
                        <li>• Rest API custom integrations</li>
                        <li>• Zero-Trust dedicated server</li>
                      </ul>
                    </div>
                  </div>

                  <div className="form-row" style={{ marginTop: '1.5rem' }}>
                    <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>
                      Back
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleRegisterSubmit} disabled={loading}>
                      {loading ? 'Registering...' : 'Submit Credentials'}
                    </button>
                  </div>
                </div>
              )}

              <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                Already registered?{' '}
                <button type="button" className="link-btn" onClick={() => { setIsLogin(true); setStep(1); }} style={{ color: 'var(--primary)', fontWeight: '600' }}>
                  Sign In Portal
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
