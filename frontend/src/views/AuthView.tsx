import React, { useState } from 'react';
import { apiRequest, setToken } from '../utils/api';
import { Shield, Mail, Lock } from 'lucide-react';

interface AuthViewProps {
  onAuthSuccess: (user: any) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  onNavigateSignup: (role: 'patient' | 'practitioner') => void;
}

export default function AuthView({ onAuthSuccess, showToast, onNavigateSignup }: AuthViewProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please provide an email and password.', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', 'POST', {
        email,
        password,
      });
      
      setToken(data.token);
      showToast('Authentication successful!', 'success');
      onAuthSuccess(data.user);
    } catch (err: any) {
      showToast(err.message || 'Login failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Shield size={32} />
            Isiqalo<span>Med</span>
          </div>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>

        <div className="auth-body">
          <form onSubmit={handleLogin} className="animate-fade-in">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} className="search-icon" style={{ left: '0.85rem' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} className="search-icon" style={{ left: '0.85rem' }} />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={loading}>
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
            
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Don't have an account?</p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ background: 'transparent', border: '1px solid var(--border)', fontSize: '0.85rem' }} 
                  onClick={() => onNavigateSignup('patient')}
                >
                  Sign up as Patient
                </button>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ background: 'transparent', border: '1px solid var(--border)', fontSize: '0.85rem' }} 
                  onClick={() => onNavigateSignup('practitioner')}
                >
                  Sign up as Practitioner
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
